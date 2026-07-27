// https://github.com/sopaco/saga-reader/blob/main/crates/scrap/src/simulator.rs
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::plugin::PluginApi;
use tauri::webview::{Cookie, NewWindowResponse, PageLoadEvent};
use tauri::{
    AppHandle, Listener, Manager, Runtime, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_store::{Store, StoreExt};
use tokio::{
    sync::{oneshot, Mutex, Semaphore},
    time::{sleep, Duration},
};

use crate::models::*;

/// JS 资源稳定等待上限（毫秒），与前端 fetchWebview 默认 20s 一致
const DEFAULT_SCRAPE_TIMEOUT_MS: u64 = 20_000;
/// 在 JS 超时之外留给导航/抢救的 Rust 层宽限（与 Android SCRAPING_GRACE_MS 对齐）
const SCRAPING_GRACE_MS: u64 = 10_000;
/// 超时后抢救脚本等待回调的上限
const RESCUE_WAIT_MS: u64 = 3_000;
const PAGE_STARTED_INJECT_DELAY_MS: u64 = 1_400;
const PAGE_FINISHED_INJECT_DELAY_MS: u64 = 500;
const REDIRECT_EXTRA_DELAY_MS: u64 = 1_500;

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
        scrap_text_by_url(app_handle, payload).await.map_err(|e| {
            eprintln!("Scraping failed: {}", e);
            crate::Error::Scraping(e)
        })
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
    eprintln!(
        "[mywebview] No available scrap window slot. Active: {:?}",
        manager.keys().collect::<Vec<_>>()
    );
    None
}

fn hard_timeout_ms(js_timeout_ms: u64) -> u64 {
    js_timeout_ms.saturating_add(SCRAPING_GRACE_MS)
}

fn build_scraping_script(window_name: &str, timeout_ms: u64, target_type: Option<&str>) -> String {
    SCRAPING_SCRIPT
        .replace("{{window_id}}", window_name)
        .replace("{{timeout}}", &timeout_ms.to_string())
        .replace("{{target_type}}", target_type.unwrap_or(""))
}

fn scrape_event_name(window_name: &str) -> String {
    format!("wuji_event_scrap_{}", window_name)
}

async fn scrap_text_by_url<R: Runtime>(
    app_handle: AppHandle<R>,
    payload: FetchRequest,
) -> Result<FetchResponse, String> {
    let url = payload.url;
    let use_saved_cookie = payload.use_saved_cookie;
    let timeout = payload
        .timeout
        .map(|s| s.saturating_mul(1000))
        .unwrap_or(DEFAULT_SCRAPE_TIMEOUT_MS);
    let wait_for_resources = payload.wait_for_resources;
    let hard_timeout = hard_timeout_ms(timeout);

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
        use_saved_cookie,
        cookie,
        timeout,
        wait_for_resources,
    )
    .await?;
    let window_ref = Arc::new(window);

    // 每个抓取会话只注册一次结果监听，避免 Started/Finished 重复注入时重复注册
    let listener_window_name = window_name.clone();
    window_ref.once(scrape_event_name(&window_name), move |event| {
        let payload = process_payload(event.payload());
        let window_name_inner = listener_window_name;
        tauri::async_runtime::spawn(async move {
            if let Some(tx) = WINDOW_MANAGER.lock().await.remove(&window_name_inner) {
                let _ = tx.send(payload);
            }
        });
    });

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
        // Rust 兜底超时：JS 完全挂死从未 emit 时触发。
        // 此时窗口仍然存活，尝试通过 eval 主动抢救已收集的资源。
        _ = tokio::time::sleep(Duration::from_millis(hard_timeout)) => {
            eprintln!(
                "[mywebview] Rust-level timeout after {}ms for {}, attempting data rescue...",
                hard_timeout, window_name
            );
            rescue_partial_data(window_clone.as_ref(), &window_name).await
        }
    };

    // 7. 清理资源
    cleanup_scrap_session(&window_name, window_ref, permit).await;

    result
}

/// Rust 超时后主动抢救：eval 一段 JS 立即读取窗口现有数据并 emit 回来
async fn rescue_partial_data<R: Runtime>(
    window: &WebviewWindow<R>,
    window_name: &str,
) -> Result<FetchResponse, String> {
    let rescue_event = format!("wuji_event_scrap_{}_rescue", window_name);

    // 建立临时 oneshot 通道
    let (rescue_tx, rescue_rx) = oneshot::channel::<String>();
    let rescue_tx_holder = Arc::new(tokio::sync::Mutex::new(Some(rescue_tx)));

    // 注册一次性事件监听，等待 eval 结果回调
    window.once(rescue_event.clone(), {
        let holder = rescue_tx_holder.clone();
        move |event| {
            let payload = process_payload(event.payload());
            let holder = holder.clone();
            tauri::async_runtime::spawn(async move {
                if let Some(tx) = holder.lock().await.take() {
                    let _ = tx.send(payload);
                }
            });
        }
    });

    // 注入抢救脚本：立即收集现有数据并 emit
    let rescue_script = format!(
        r#"(function(){{
            try{{
                var r=(window.__wuji_sniffed__||[]).map(function(x){{
                    return{{url:x.url,type:x.type||'other',resourceType:x.type||'other',method:x.method||'GET',contentType:x.contentType||null,size:x.size||null}};
                }});
                var d=JSON.stringify({{
                    content:document.documentElement?document.documentElement.innerHTML:'',
                    title:document.title||'',
                    resources:r
                }});
                window.__TAURI__.event.emit('{}',d);
            }}catch(e){{
                window.__TAURI__.event.emit('{}',JSON.stringify({{content:'',title:'',resources:[]}}));
            }}
        }})()"#,
        rescue_event, rescue_event
    );

    if window.eval(&rescue_script).is_err() {
        return Err("Rust timeout: eval rescue script failed".to_string());
    }

    // 最多等 3 秒
    match tokio::time::timeout(Duration::from_millis(RESCUE_WAIT_MS), rescue_rx).await {
        Ok(Ok(data)) if !data.is_empty() => {
            eprintln!("[mywebview] Rescued partial data successfully.");
            let cookie_string = window
                .cookies()
                .map(|c| {
                    c.iter()
                        .map(|ck| format!("{}={}", ck.name(), ck.value()))
                        .collect::<Vec<_>>()
                        .join("; ")
                })
                .unwrap_or_default();
            let (content, title, resources) =
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&data) {
                    (
                        v["content"].as_str().unwrap_or("").to_string(),
                        v["title"].as_str().unwrap_or("").to_string(),
                        parse_sniffed_resources(&v["resources"]),
                    )
                } else {
                    (String::new(), String::new(), vec![])
                };
            let url = window.url().map(|u| u.to_string()).unwrap_or_default();
            Ok(FetchResponse {
                content,
                url,
                cookie: cookie_string,
                title,
                resources,
            })
        }
        _ => Err("Operation timed out at Rust level".to_string()),
    }
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
            // 优先从 resourceType 获取，兼容 type
            let r_type = item["resourceType"]
                .as_str()
                .or_else(|| item["type"].as_str())
                .unwrap_or("other")
                .to_string();

            resources.push(SniffedResource {
                url,
                r#type: r_type.clone(),
                resource_type: r_type,
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

fn clear_cookies_for_url<R: Runtime>(window: &WebviewWindow<R>, url: &Url) -> Result<(), String> {
    let cookies = window
        .cookies_for_url(url.clone())
        .map_err(|e| format!("Failed to read cookies: {}", e))?;
    for cookie in cookies {
        let _ = window.delete_cookie(cookie);
    }
    Ok(())
}

fn inject_saved_cookies<R: Runtime>(window: &WebviewWindow<R>, cookie_str: &str) {
    for part in cookie_str.split(';') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Ok(cookie) = Cookie::parse(part) {
            let _ = window.set_cookie(cookie);
        } else {
            eprintln!("[mywebview] Invalid cookie segment, skipping: {}", part);
        }
    }
}

// 创建爬取窗口（同时注入嗅探脚本）
async fn create_scraping_window<R: Runtime>(
    app_handle: &AppHandle<R>,
    window_name: &str,
    url: Url,
    use_saved_cookie: bool,
    saved_cookie: Option<String>,
    timeout: u64,
    wait_for_resources: Option<String>,
) -> Result<WebviewWindow<R>, String> {
    let redirect_times = Arc::new(AtomicUsize::new(0));
    // 采集脚本是否已成功注入（注入后忽略 iframe/广告触发的后续加载事件）
    let scraping_script_injected = Arc::new(AtomicBool::new(false));
    let target_host = url.host_str().map(|host| host.to_string());
    let blank_url = Url::parse("about:blank").map_err(|e| format!("URL parse error: {}", e))?;

    let builder =
        WebviewWindowBuilder::new(app_handle, window_name, WebviewUrl::External(blank_url))
            // 注入嗅探初始化脚本（拦截 XHR/Fetch、扫描媒体标签）
            .initialization_script(SNIFF_INIT_SCRIPT)
            // 阻止 window.open 弹出的广告页，避免抢走 WebView 焦点或干扰采集
            .on_new_window(|_url, _features| NewWindowResponse::Deny)
            .on_navigation({
                let counter = redirect_times.clone();
                let target_host = target_host.clone();
                move |nav_url| {
                    // WebView2 会对 iframe 导航也回调；仅统计目标站内的主文档跳转，避免广告 iframe 拉长等待
                    let is_same_site = target_host
                        .as_deref()
                        .zip(nav_url.host_str())
                        .map(|(a, b)| a == b)
                        .unwrap_or(false);
                    if is_same_site {
                        counter.fetch_add(1, Ordering::Relaxed);
                    }
                    true
                }
            })
            .on_page_load({
                let window_name = window_name.to_string();
                let redirect_times = redirect_times.clone();
                let scraping_script_injected = scraping_script_injected.clone();
                let timeout = timeout;
                let target_type = wait_for_resources.clone();

                move |window, payload| match payload.event() {
                    PageLoadEvent::Started => {
                        #[cfg(debug_assertions)]
                        eprintln!("[mywebview] Page load started: {}", payload.url());
                        handle_page_load_event(
                            window,
                            &window_name,
                            &redirect_times,
                            &scraping_script_injected,
                            timeout,
                            target_type.clone(),
                            true,
                        );
                    }
                    PageLoadEvent::Finished => {
                        #[cfg(debug_assertions)]
                        eprintln!("[mywebview] Page finished loading: {}", payload.url());
                        handle_page_load_event(
                            window,
                            &window_name,
                            &redirect_times,
                            &scraping_script_injected,
                            timeout,
                            target_type.clone(),
                            false,
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

    if use_saved_cookie {
        if let Some(cookie_str) = &saved_cookie {
            inject_saved_cookies(&window, cookie_str);
        }
    } else {
        clear_cookies_for_url(&window, &url)?;
    }

    window
        .navigate(url)
        .map_err(|e| format!("Failed to navigate scrap window: {}", e))?;

    Ok(window)
}

// 处理页面加载事件（Started/Finished）
fn handle_page_load_event<R: Runtime>(
    window: WebviewWindow<R>,
    window_name: &str,
    redirect_times: &Arc<AtomicUsize>,
    scraping_script_injected: &Arc<AtomicBool>,
    timeout: u64,
    target_type: Option<String>,
    from_started_event: bool,
) {
    if scraping_script_injected.load(Ordering::Relaxed) {
        return;
    }

    tauri::async_runtime::spawn({
        let window = Arc::new(window);
        let window_name = window_name.to_string();
        let redirect_count = redirect_times.load(Ordering::Relaxed);
        let scraping_script_injected = scraping_script_injected.clone();

        async move {
            // 在注入前等待基础稳定期
            let redirect_delay = if redirect_count > 0 {
                Duration::from_millis(REDIRECT_EXTRA_DELAY_MS)
            } else {
                Duration::ZERO
            };
            // Started 作为兜底（部分页面 onPageFinished 迟迟不回调）；Finished 尽快启动采集。
            let base_delay = if from_started_event {
                Duration::from_millis(PAGE_STARTED_INJECT_DELAY_MS)
            } else {
                Duration::from_millis(PAGE_FINISHED_INJECT_DELAY_MS)
            };
            sleep(base_delay + redirect_delay).await;

            if scraping_script_injected.load(Ordering::Relaxed) {
                return;
            }

            let script = build_scraping_script(&window_name, timeout, target_type.as_deref());

            if window.eval(&script).is_ok() {
                scraping_script_injected.store(true, Ordering::Relaxed);
            } else {
                eprintln!(
                    "[mywebview] Failed to eval scraping script for {}",
                    window_name
                );
                send_empty_result(&window_name).await;
            }
        }
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
const SNIFF_INIT_SCRIPT: &str = include_str!("../scripts/sniff_init.js");

// ============================================================
// 桌面端爬取脚本（Tauri 事件回传，与 Android assets/scraping.js 轮询版分离）
// ============================================================
const SCRAPING_SCRIPT: &str = concat!(
    include_str!("../scripts/play_trigger.js"),
    "\n",
    include_str!("../scripts/scraping.js"),
);

/// 清理 scrap session：停止页面、卸载 WebView 并释放并发槽位
async fn cleanup_scrap_session<R: Runtime>(
    window_name: &str,
    window: Arc<tauri::WebviewWindow<R>>,
    permit: tokio::sync::SemaphorePermit<'_>,
) {
    WINDOW_MANAGER.lock().await.remove(window_name);

    let _ = window.eval(r#"(function(){try{if(window.stop)window.stop();}catch(e){}})();"#);

    if let Err(e) = window.destroy() {
        eprintln!(
            "[mywebview] Failed to destroy scrap window {}: {}",
            window_name, e
        );
    }

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
            let _ = window.eval(r#"(function(){try{if(window.stop)window.stop();}catch(e){}})();"#);
            if let Err(e) = window.destroy() {
                eprintln!(
                    "[mywebview] Failed to destroy window {} during cleanup: {}",
                    window_name, e
                );
            }
        }
        // 从管理器中移除
        WINDOW_MANAGER.lock().await.remove(&window_name);
    }

    Ok(())
}
