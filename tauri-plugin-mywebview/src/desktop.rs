// https://github.com/sopaco/saga-reader/blob/main/crates/scrap/src/simulator.rs
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::plugin::PluginApi;
use tauri::webview::{Cookie, PageLoadEvent};
use tauri::{
    AppHandle, Listener, Manager, Runtime, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_store::{Store, StoreExt};
use tokio::{
    sync::{oneshot, Mutex, Semaphore},
    time::{sleep, Duration},
};

use crate::models::*;

// 使用HashMap来管理多个窗口，key是窗口ID
type WindowMap = Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>;

// 全局窗口管理器
static WINDOW_MANAGER: once_cell::sync::Lazy<WindowMap> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

// 并发控制信号量，限制最多5个并发窗口
static CONCURRENT_SEMAPHORE: once_cell::sync::Lazy<Arc<Semaphore>> =
    once_cell::sync::Lazy::new(|| Arc::new(Semaphore::new(5)));

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Mywebview<R>> {
    Ok(Mywebview(app.clone()))
}

/// Access to the mywebview APIs.
pub struct Mywebview<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Mywebview<R> {
    pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
        Ok(PingResponse {
            value: payload.value,
        })
    }

    pub async fn fetch(&self, payload: FetchRequest) -> crate::Result<FetchResponse> {
        let app_handle = self.0.clone();
        let response = match scrap_text_by_url(app_handle, payload).await {
            Ok(content) => content,
            Err(e) => {
                eprintln!("Scraping failed: {}", e);
                FetchResponse {
                    content: String::new(),
                    url: String::new(),
                    cookie: String::new(),
                    title: String::new(),
                    resources: vec![],
                }
            }
        };
        Ok(response)
    }
}

/// 获取可用的窗口ID
async fn get_available_window_id() -> Option<String> {
    let manager = WINDOW_MANAGER.lock().await;

    // 检查1,2,3,4,5哪个ID可用
    for id in 1..=5 {
        let window_name = format!("SCRAP_WINDOW_{}", id);
        if !manager.contains_key(&window_name) {
            return Some(window_name);
        }
    }
    dbg!(manager.keys().cloned().collect::<Vec<String>>());
    None
}

async fn scrap_text_by_url<R: Runtime>(
    app_handle: AppHandle<R>,
    payload: FetchRequest,
) -> Result<FetchResponse, String> {
    let url = payload.url;
    let use_saved_cookie = payload.use_saved_cookie;
    let timeout = payload.timeout.unwrap_or(20) * 1000; // 默认 20s
    let wait_for_resources = payload.wait_for_resources; // Option<String>

    // 1. 获取信号量许可（带超时）
    let semaphore = CONCURRENT_SEMAPHORE.clone();
    let permit = acquire_semaphore_with_timeout(&semaphore).await?;

    // 2. 获取可用窗口ID
    let window_name = get_available_window_id()
        .await
        .ok_or("No available window ID found".to_string())?;

    // 3. 解析URL
    let parsed_url = Url::parse(&url).map_err(|e| format!("URL parse error: {}", e))?;

    // 4. 创建结果通道
    let (tx, rx) = oneshot::channel::<String>();
    WINDOW_MANAGER.lock().await.insert(window_name.clone(), tx);
    let store: Arc<Store<R>> = app_handle
        .store("scrap_cookies.json")
        .map_err(|e| format!("Failed to access store: {}", e))?;
    let domain = parsed_url.domain().map(|d| d.to_string());
    let domain_str = domain.clone();
    let cookie: Option<String> = if !use_saved_cookie {
        None
    } else {
        domain
            .as_ref()
            .and_then(|domain| store.get(domain))
            .and_then(|cookie_value| cookie_value.as_str().map(|s| s.to_string()))
    };

    // 5. 创建窗口并设置事件处理（同时注入嗅探脚本）
    let window = create_scraping_window(
        &app_handle,
        &window_name,
        parsed_url,
        cookie,
        timeout,
        wait_for_resources,
    )
    .await?;
    let window_ref = Arc::new(window);

    window_ref.on_window_event({
        // 手动关闭窗口
        let window_name = window_name.clone();
        move |event| {
            let window_name_clone = window_name.clone(); // 再次 clone 用于 async move
            if let tauri::WindowEvent::Destroyed = event {
                tauri::async_runtime::spawn(async move {
                    if let Some(tx) = WINDOW_MANAGER.lock().await.remove(&window_name_clone) {
                        let _ = tx.send("".to_string());
                    }
                });
            }
        }
    });

    // 6. 等待结果（带超时）
    let window_clone = window_ref.clone();
    let result = tokio::select! {
        // 正常结果
        res = rx => {
            match res {
                Ok(content_json) => {
                    let cookie_string = window_clone.cookies().unwrap()
                        .iter()
                        .map(|cookie| format!("{}={}", cookie.name(), cookie.value()))
                        .collect::<Vec<_>>()
                        .join("; ");

                    let (content, title, resources) = if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content_json) {
                        (
                            v["content"].as_str().unwrap_or("").to_string(),
                            v["title"].as_str().unwrap_or("").to_string(),
                            parse_sniffed_resources(&v["resources"]),
                        )
                    } else {
                        (content_json, window_clone.title().unwrap_or_default(), vec![])
                    };
                    let url = window_clone.url().map(|u| u.to_string()).unwrap_or_default();

                    if use_saved_cookie && domain_str.is_some() {
                        if let Some(domain)  = domain_str {
                            let _ = store.set(domain, serde_json::Value::String(cookie_string.clone()));
                            let _ = store.save();
                        }
                    }

                    Ok(FetchResponse { content, url, cookie: cookie_string, title, resources })
                },
                Err(_) => Err("Channel receive error".to_string())
            }
        }
        // 超时情况：需要结合 JavaScript 的超时来防止悬挂。
        // 这里设置为比 JS 超时稍微长一点。
        _ = tokio::time::sleep(Duration::from_millis(timeout + 5000)) => {
            Err("Operation timed out at Rust level".to_string())
        }
    };

    // 7. 清理资源
    cleanup_scrap_session(&window_name, window_ref, permit).await;

    result
}

/// 从 JSON 中解析嗅探到的资源列表
fn parse_sniffed_resources(v: &serde_json::Value) -> Vec<SniffedResource> {
    let mut resources = Vec::new();
    if let Some(arr) = v.as_array() {
        for item in arr {
            let url = item["url"].as_str().unwrap_or("").to_string();
            if url.is_empty() {
                continue;
            }
            resources.push(SniffedResource {
                url,
                resource_type: item["type"].as_str().unwrap_or("other").to_string(),
                method: item["method"].as_str().map(|s| s.to_string()),
                content_type: item["contentType"].as_str().map(|s| s.to_string()),
                size: item["size"].as_u64(),
                request_data: item["requestData"].as_str().map(|s| s.to_string()),
                response_body: item["responseBody"].as_str().map(|s| s.to_string()),
            });
        }
    }
    resources
}

async fn acquire_semaphore_with_timeout(
    semaphore: &Arc<Semaphore>,
) -> Result<tokio::sync::SemaphorePermit<'_>, String> {
    let acquire_future = semaphore.acquire();

    tokio::time::timeout(Duration::from_secs(10), acquire_future)
        .await
        .map_err(|_| "Timeout waiting for available window slot".to_string())?
        .map_err(|_| "Failed to acquire semaphore".to_string())
}

// 创建爬取窗口（同时注入嗅探脚本）
async fn create_scraping_window<R: Runtime>(
    app_handle: &AppHandle<R>,
    window_name: &str,
    url: Url,
    cookie: Option<String>,
    timeout: u64,
    wait_for_resources: Option<String>,
) -> Result<WebviewWindow<R>, String> {
    let redirect_times = Arc::new(AtomicUsize::new(0));
    let load_finish_times = Arc::new(AtomicUsize::new(0));

    let builder = WebviewWindowBuilder::new(app_handle, window_name, WebviewUrl::External(url))
        // 注入嗅探初始化脚本（拦截 XHR/Fetch、扫描媒体标签）
        .initialization_script(SNIFF_INIT_SCRIPT)
        .on_navigation({
            println!("on_navigation");
            let counter = redirect_times.clone();
            move |_url| {
                counter.fetch_add(1, Ordering::Relaxed);
                true
            }
        })
        .on_page_load({
            let window_name = window_name.to_string();
            let app_handle = app_handle.clone();
            let redirect_times = redirect_times.clone();
            let load_finish_times = load_finish_times.clone();
            let timeout = timeout;
            let target_type = wait_for_resources.clone();

            move |window, payload| {
                if let PageLoadEvent::Finished = payload.event() {
                    println!("Page finished loading: {}", payload.url());
                    handle_page_load_finished(
                        window,
                        &window_name,
                        &app_handle,
                        &redirect_times,
                        &load_finish_times,
                        timeout,
                        target_type.clone(),
                    );
                }
            }
        })
        .disable_drag_drop_handler()
        .title(window_name)
        .inner_size(1920.0, 1080.0)
        .visible(false);

    let window = builder
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;
    if let Some(cookie_str) = &cookie {
        let cookie = Cookie::parse(cookie_str).unwrap();
        let _ = window.set_cookie(cookie);
    }

    Ok(window)
}

// 处理页面加载完成事件
fn handle_page_load_finished<R: Runtime>(
    window: WebviewWindow<R>,
    window_name: &str,
    _app_handle: &AppHandle<R>,
    redirect_times: &Arc<AtomicUsize>,
    load_finish_times: &Arc<AtomicUsize>,
    timeout: u64,
    target_type: Option<String>,
) {
    load_finish_times.fetch_add(1, Ordering::Relaxed);

    tauri::async_runtime::spawn({
        let window = Arc::new(window);
        let window_name = window_name.to_string();
        let redirect_count = redirect_times.load(Ordering::Relaxed);
        async move {
            // 计算延迟时间
            let additional_delay = if redirect_count > 0 {
                Duration::from_millis(1000)
            } else {
                Duration::ZERO
            };
            let total_delay = Duration::from_millis(300) + additional_delay;
            sleep(total_delay).await;

            // 监听结果事件
            listen_for_scraping_result(window.clone(), window_name.clone()).await;

            // 注入脚本并替换动态配置
            let script = SCRAPING_SCRIPT
                .replace("{{window_id}}", &window_name)
                .replace("{{timeout}}", &timeout.to_string())
                .replace("{{target_type}}", &target_type.unwrap_or_default());

            if window.eval(&script).is_err() {
                send_empty_result(&window_name).await;
                return;
            }
        }
    });
}

// 监听爬取结果
async fn listen_for_scraping_result<R: Runtime>(
    window: Arc<WebviewWindow<R>>,
    window_name: String,
) {
    window.once(format!("wuji_event_scrap_{}", window_name), move |event| {
        let payload = event.payload();
        let scraped_str = process_payload(payload);

        tauri::async_runtime::spawn(async move {
            if let Some(tx) = WINDOW_MANAGER.lock().await.remove(&window_name) {
                let _ = tx.send(scraped_str);
            }
        });
    });
}

// 处理payload
fn process_payload(payload: &str) -> String {
    serde_json::from_str(payload).unwrap_or_else(|_| payload.to_string())
}

// 发送空结果（错误处理）
async fn send_empty_result(window_name: &str) {
    if let Some(tx) = WINDOW_MANAGER.lock().await.remove(window_name) {
        let _ = tx.send(String::new());
    }
}

// ============================================================
// 嗅探初始化脚本（页面加载前注入）：
//   - 静音所有媒体元素
//   - 拦截 XHR（XMLHttpRequest.open/send）
//   - 拦截 Fetch API
//   - 用 MutationObserver 扫描动态插入的 video/audio/img/source 元素
//   所有捕获的 URL 存入 window.__wuji_sniffed__
// ============================================================
const SNIFF_INIT_SCRIPT: &str = r#"
(function () {
    'use strict';
    if (window._mediaSnifferInjected) return;
    window._mediaSnifferInjected = true;

    // 初始化存储
    if (!window.__wuji_sniffed__) window.__wuji_sniffed__ = [];
    const sniffed = window.__wuji_sniffed__;
    const seenUrls = new Set();

    // 强制静音逻辑：锁定属性防止 JS 修改
    try {
        Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
            get: function() { return true; },
            set: function() { /* 忽略网站尝试取消静音的操作 */ },
            configurable: true
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: function() { return 0; },
            set: function() { /* 忽略网站尝试调节音量的操作 */ },
            configurable: true
        });
    } catch (e) {
        console.error('Failed to lock mute properties');
    }

    // 辅助静音函数 (用于处理 HTML 属性)
    function forceMute(elem) {
        try {
            elem.setAttribute('muted', 'muted');
            elem.setAttribute('autoplay', 'autoplay'); // 顺便辅助开启自动播放
        } catch (e) {}
    }

    // 工具函数：根据 URL 或 Content-Type 判断类型
    function guessType(url, ct) {
        if (ct) {
            ct = ct.toLowerCase();
            if (ct.includes('video') || ct.includes('mpegurl') || ct.includes('application/vnd.apple.mpegurl')) return 'video';
            if (ct.includes('audio')) return 'audio';
            if (ct.includes('image')) return 'image';
        }
        if (url) {
            const u = url.toLowerCase().split('?')[0];
            if (/\.(mp4|m3u8|m4v|mkv|webm|avi|mov|flv|ts|mpeg|mpg|wmv|rmvb|3gp|mpd)$/.test(u)) return 'video';
            if (/\.(mp3|aac|ogg|flac|wav|m4a|opus|wma)$/.test(u)) return 'audio';
            if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/.test(u)) return 'image';
        }
        return 'other';
    }

    // 核心添加逻辑
    function addResource(url, source, details = {}) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) return;
        
        try {
            const absoluteUrl = new URL(url, window.location.href).href;
            const type = details.type || guessType(absoluteUrl, details.contentType);
            
            // 准入规则
            const isMedia = type === 'video' || type === 'audio' || /m3u8|mpd/i.test(absoluteUrl);
            if (!isMedia) return;

            if (!seenUrls.has(absoluteUrl)) {
                seenUrls.add(absoluteUrl);
                const item = {
                    url: absoluteUrl,
                    type: type,
                    source: source,
                    method: details.method || 'GET',
                    contentType: details.contentType || null,
                    size: details.size || null,
                    requestData: details.requestData || null,
                    responseBody: details.responseBody || null
                };
                sniffed.push(item);
            }
        } catch (e) {}
    }

    // --- 1. 拦截 XHR ---
    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OrigXHR();
        let _method = 'GET', _url = '', _reqData = null;
        const origOpen = xhr.open.bind(xhr);
        xhr.open = function(method, url, ...args) {
            _method = method;
            _url = url;
            return origOpen(method, url, ...args);
        };
        const origSend = xhr.send.bind(xhr);
        xhr.send = function(...args) {
            _reqData = (args[0] && typeof args[0] === 'string') ? args[0].substring(0, 1000) : null;
            return origSend(...args);
        };
        xhr.addEventListener('load', function() {
            const ct = xhr.getResponseHeader('Content-Type');
            const cl = xhr.getResponseHeader('Content-Length');
            addResource(_url, 'XHR', {
                method: _method,
                contentType: ct,
                size: cl ? parseInt(cl, 10) : null,
                requestData: _reqData
            });
        });
        return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    // --- 2. 拦截 Fetch ---
    const origFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const method = (init && init.method) || (input && input.method) || 'GET';
        return origFetch.apply(this, arguments).then(response => {
            const ct = response.headers.get('Content-Type');
            const cl = response.headers.get('Content-Length');
            addResource(url, 'Fetch', {
                method: method,
                contentType: ct,
                size: cl ? parseInt(cl, 10) : null
            });
            return response;
        });
    };

    // --- 3. 监听 Performance API ---
    if (window.PerformanceObserver) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (['video', 'audio', 'resource', 'fetch', 'xmlhttprequest'].includes(entry.initiatorType)) {
                    addResource(entry.name, `Network (${entry.initiatorType})`, {
                        size: entry.transferSize || entry.encodedBodySize
                    });
                }
            });
        });
        observer.observe({ entryTypes: ['resource'] });
    }

    // --- 4. 定期扫描 ---
    function scanAndMute() {
        document.querySelectorAll('video, audio').forEach(el => {
            forceMute(el);
            if (el.src) addResource(el.src, 'DOM');
            el.querySelectorAll('source').forEach(s => {
                if (s.src) addResource(s.src, 'DOM');
            });
        });
    }

    new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.tagName && (node.tagName === 'VIDEO' || node.tagName === 'AUDIO')) {
                    forceMute(node);
                    if (node.src) addResource(node.src, 'DOM');
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('video, audio').forEach(el => {
                        forceMute(el);
                        if (el.src) addResource(el.src, 'DOM');
                    });
                }
            });
        });
    }).observe(document.documentElement, { childList: true, subtree: true });

    setInterval(scanAndMute, 2000);
})();
"#;

// ============================================================
// 爬取脚本（页面加载完成后执行）：
//   获取页面 HTML 内容 + 收集嗅探到的资源列表，一并通过事件返回
// ============================================================
const SCRAPING_SCRIPT: &str = r#"
(function() {
    async function startScraping() {
        const MAX_WAIT_MS = parseInt('{{timeout}}') || 20000;
        const TARGET_TYPE = '{{target_type}}'; // 如 'video'
        const SETTLE_MS = 2500; // 稳定期 2.5s
        
        const startTime = Date.now();
        let lastResourceCount = 0;
        let lastChangeTime = Date.now();

        // 观察逻辑
        while (Date.now() - startTime < MAX_WAIT_MS) {
            const sniffed = window.sniffedMediaUrls || [];
            let matchedResources = [];
            if (TARGET_TYPE) {
                const targetTypes = TARGET_TYPE.split(',').map(t => t.trim());
                matchedResources = sniffed.filter(r => targetTypes.includes(r.resourceType));
            } else {
                if (document.readyState === 'complete' && Date.now() - startTime > 2000) break;
            }

            if (TARGET_TYPE && matchedResources.length > 0) {
                // 如果发现了目标类型资源：
                if (matchedResources.length > lastResourceCount) {
                    lastResourceCount = matchedResources.length;
                    lastChangeTime = Date.now();
                } else if (Date.now() - lastChangeTime > SETTLE_MS) {
                    // 已稳定，可以返回
                    console.log(`[Scraping] Target type "${TARGET_TYPE}" found and settled.`);
                    break;
                }
            } else if (!TARGET_TYPE && document.readyState === 'complete') {
                 if (Date.now() - startTime > 2000) break;
            }

            // 心跳检查
            await new Promise(r => setTimeout(r, 400));
        }

        try {
            if (window.stop) window.stop();

            const sniffed = (window.__wuji_sniffed__ || []).map(r => ({
                ...r,
                resourceType: r.type || 'other'
            }));
            const seenUrls = new Set(sniffed.map(r => r.url));

            // 最后 DOM 补扫
            document.querySelectorAll('video, audio, img').forEach(el => {
                const src = el.currentSrc || el.src;
                if (src && src.startsWith('http') && !seenUrls.has(src)) {
                    sniffed.push({ 
                        url: src, 
                        resourceType: el.tagName.toLowerCase(), 
                        source: 'FinalScan' 
                    });
                }
            });

            // 构造返回
            const content = btoa(encodeURIComponent(document.documentElement.innerHTML));
            const title = document.title;
            const data = JSON.stringify({ content, title, resources: sniffed });

            window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", data);
        } catch (e) {
            console.error('[Scraping Error]', e);
            const errorData = JSON.stringify({ content: "", title: "Error", resources: [] });
            window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", errorData);
        }
    }

    startScraping();
})();
"#;

/// 清理scrap session：关闭窗口并从管理器中移除
async fn cleanup_scrap_session<R: Runtime>(
    window_name: &str,
    window: Arc<tauri::WebviewWindow<R>>,
    permit: tokio::sync::SemaphorePermit<'_>,
) {
    // 从管理器中移除（如果还存在）
    WINDOW_MANAGER.lock().await.remove(window_name);

    // 关闭窗口
    if let Err(e) = window.destroy() {
        dbg!("Failed to close scrap window {}: {}", window_name, e);
    } else {
        dbg!("Successfully closed scrap window: {}", window_name);
    }

    // permit 在这里自动释放，信号量计数增加
    drop(permit);
}

/// 清理所有scrap session（在应用关闭时调用）
pub async fn cleanup_all_scrap_sessions<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<(), String> {
    let manager = WINDOW_MANAGER.lock().await;
    let window_names: Vec<String> = manager.keys().cloned().collect();
    drop(manager); // 释放锁，避免死锁

    for window_name in window_names {
        if let Some(window) = app_handle.get_webview_window(&window_name) {
            if let Err(e) = window.close() {
                dbg!(
                    "Failed to close window {} during cleanup: {}",
                    window_name.clone(),
                    e
                );
            }
        }
        // 从管理器中移除
        WINDOW_MANAGER.lock().await.remove(&window_name);
    }

    Ok(())
}
