use base64::prelude::BASE64_STANDARD;
use base64::Engine;
// https://github.com/sopaco/saga-reader/blob/main/crates/scrap/src/simulator.rs
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::plugin::PluginApi;
use tauri::webview::PageLoadEvent;
use tauri::{
    async_runtime, AppHandle, Listener, Manager, Runtime, Url, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
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
        let value = match scrap_text_by_url(app_handle, payload.url, payload.use_saved_cookie).await
        {
            Ok(content) => Some(content),
            Err(e) => {
                eprintln!("Scraping failed: {}", e);
                None
            }
        };
        Ok(FetchResponse { value })
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

fn get_cookie(content: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(
        &urlencoding::decode(&String::from_utf8(BASE64_STANDARD.decode(content).ok()?).ok()?)
            .ok()?,
    )
    .ok()?["cookie"]
        .as_str()
        .map(|s| s.to_string())
}

async fn scrap_text_by_url<R: Runtime>(
    app_handle: AppHandle<R>,
    url: String,
    use_saved_cookie: bool,
) -> Result<String, String> {
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

    // 5. 创建窗口并设置事件处理
    let window = create_scraping_window(&app_handle, &window_name, parsed_url, cookie).await?;
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
    let result = tokio::select! {
        // 正常结果
        res = rx => {
            match res {
                Ok(content) => {
                    // 保存cookie
                    if use_saved_cookie {
                        if let Some(domain) = domain_str {
                            if let Some(cookie_str) = get_cookie(&content) {
                                let _ = store.set(domain, serde_json::Value::String(cookie_str));
                                let _ = store.save();
                            }
                        }
                    }

                    Ok(content)
                },
                Err(_) => Err("Channel receive error".to_string())
            }
        }
        // 超时情况
        _ = tokio::time::sleep(Duration::from_secs(20)) => {
            Err("Operation timed out".to_string())
        }
    };

    // 7. 清理资源
    cleanup_scrap_session(&window_name, window_ref, permit).await;

    result
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

// 创建爬取窗口
async fn create_scraping_window<R: Runtime>(
    app_handle: &AppHandle<R>,
    window_name: &str,
    url: Url,
    cookie: Option<String>,
) -> Result<WebviewWindow<R>, String> {
    let redirect_times = Arc::new(AtomicUsize::new(0));
    let load_finish_times = Arc::new(AtomicUsize::new(0));

    let mut builder = WebviewWindowBuilder::new(app_handle, window_name, WebviewUrl::External(url))
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

            move |window, payload| {
                if let PageLoadEvent::Finished = payload.event() {
                    println!("Page finished loading: {}", payload.url());
                    handle_page_load_finished(
                        window,
                        &window_name,
                        &app_handle,
                        &redirect_times,
                        &load_finish_times,
                    );
                }
            }
        })
        .disable_drag_drop_handler()
        .title(window_name)
        .inner_size(1920.0, 1080.0)
        .visible(true);
    if let Some(cookie_str) = &cookie {
        builder = builder.initialization_script(&get_saved_cookie_script(cookie_str));
    }

    let window = builder
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    Ok(window)
}

// 处理页面加载完成事件
fn handle_page_load_finished<R: Runtime>(
    window: WebviewWindow<R>,
    window_name: &str,
    _app_handle: &AppHandle<R>,
    redirect_times: &Arc<AtomicUsize>,
    load_finish_times: &Arc<AtomicUsize>,
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

            // 执行 JavaScript 获取内容
            if window
                .eval(SCRAPING_SCRIPT.replace("{{window_id}}", &window_name))
                .is_err()
            {
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
    let result = payload
        .chars()
        .skip(1)
        .take(payload.len().saturating_sub(2))
        .collect::<String>();
    result.replace(r#"\""#, r#"""#)
}

// 发送空结果（错误处理）
async fn send_empty_result(window_name: &str) {
    if let Some(tx) = WINDOW_MANAGER.lock().await.remove(window_name) {
        let _ = tx.send(String::new());
    }
}

fn get_saved_cookie_script(cookie: &str) -> String {
    format!(r#"document.cookie = "{}";"#, cookie.replace(';', "\\;"))
}

// 常量定义
// document.querySelector('#root').shadowRoot.querySelector('.chakra-portal')
const SCRAPING_SCRIPT: &str = r#"
function waitForLoad() {
    return new Promise((resolve) => {
        const maxWait = 18000;
        const startTime = Date.now();
        
        function check() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            if (document.readyState === 'complete') {
                resolve(true);
            } else if (elapsed >= maxWait) {
                resolve(false);
            } else {
                setTimeout(check, 100);
            }
        }
        check();
    });
}

function scrapePage() {
    const scrapData = {
        content: document.documentElement.innerHTML,
        title: document.title,
        url: window.location.href,
        cookie: document.cookie,
        userAgent: navigator.userAgent
    };
    
    return btoa(encodeURIComponent(JSON.stringify(scrapData)));
}

waitForLoad().then(() => {
    const scrapedData = scrapePage();
    window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", scrapedData);
});
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

/// 获取当前活跃的窗口数量（用于监控）
async fn get_active_scrap_window_count() -> usize {
    WINDOW_MANAGER.lock().await.len()
}

/// 获取可用窗口槽位数量（用于监控）
async fn get_available_window_slots() -> usize {
    CONCURRENT_SEMAPHORE.available_permits()
}
