// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

use std::{future::Future, path::PathBuf, pin::Pin, str::FromStr, sync::Arc, time::Duration};

use http::{header, HeaderMap, HeaderName, HeaderValue, Method, StatusCode};
use rand::{seq::SliceRandom, thread_rng};
use reqwest::{redirect::Policy, NoProxy};
use serde::{Deserialize, Serialize};
use tauri::{
    async_runtime::Mutex,
    ipc::{Channel, CommandScope, GlobalScope},
    path::BaseDirectory,
    Manager, ResourceId, ResourceTable, Runtime, State, Webview,
};
use tokio::sync::oneshot::{channel, Receiver, Sender};

use crate::fetch_plugin::{
    scope::{Entry, Scope},
    Error, Http, Result,
};

const HTTP_USER_AGENT: &str = concat!(env!("CARGO_PKG_NAME"), "/", env!("CARGO_PKG_VERSION"),);
pub const STATIC_CHROME_AGENTS: &'static [&'static str; 20] = &[
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
];

struct ReqwestResponse(reqwest::Response);
impl tauri::Resource for ReqwestResponse {}

type CancelableResponseResult = Result<reqwest::Response>;
type CancelableResponseFuture =
    Pin<Box<dyn Future<Output = CancelableResponseResult> + Send + Sync>>;

struct FetchRequest {
    fut: Mutex<CancelableResponseFuture>,
    abort_tx_rid: ResourceId,
    abort_rx_rid: ResourceId,
}
impl tauri::Resource for FetchRequest {}

struct AbortSender(Sender<()>);
impl tauri::Resource for AbortRecveiver {}

impl AbortSender {
    fn abort(self) {
        let _ = self.0.send(());
    }
}

struct AbortRecveiver(Receiver<()>);
impl tauri::Resource for AbortSender {}

trait AddRequest {
    fn add_request(&mut self, fut: CancelableResponseFuture) -> ResourceId;
}

impl AddRequest for ResourceTable {
    fn add_request(&mut self, fut: CancelableResponseFuture) -> ResourceId {
        let (tx, rx) = channel::<()>();
        let (tx, rx) = (AbortSender(tx), AbortRecveiver(rx));
        let req = FetchRequest {
            fut: Mutex::new(fut),
            abort_tx_rid: self.add(tx),
            abort_rx_rid: self.add(rx),
        };
        self.add(req)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchResponse {
    status: u16,
    status_text: String,
    headers: Vec<(String, String)>,
    url: String,
    rid: ResourceId,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientConfig {
    method: String,
    url: url::Url,
    headers: Vec<(String, String)>,
    data: Option<Vec<u8>>,
    connect_timeout: Option<u64>,
    max_redirections: Option<usize>,
    proxy: Option<Proxy>,
    verify: Option<bool>,
    no_proxy: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientConfigWithSave {
    method: String,
    url: url::Url,
    headers: Vec<(String, String)>,
    data: Option<Vec<u8>>,
    connect_timeout: Option<u64>,
    max_redirections: Option<usize>,
    proxy: Option<Proxy>,
    verify: Option<bool>,
    no_proxy: Option<bool>,
    base_dir: Option<BaseDirectory>,
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Proxy {
    all: Option<UrlOrConfig>,
    http: Option<UrlOrConfig>,
    https: Option<UrlOrConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum UrlOrConfig {
    Url(String),
    Config(ProxyConfig),
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyConfig {
    url: String,
    basic_auth: Option<BasicAuth>,
    no_proxy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BasicAuth {
    username: String,
    password: String,
}

#[inline]
fn proxy_creator(
    url_or_config: UrlOrConfig,
    proxy_fn: fn(String) -> reqwest::Result<reqwest::Proxy>,
) -> reqwest::Result<reqwest::Proxy> {
    match url_or_config {
        UrlOrConfig::Url(url) => Ok(proxy_fn(url)?),
        UrlOrConfig::Config(ProxyConfig {
            url,
            basic_auth,
            no_proxy,
        }) => {
            let mut proxy = proxy_fn(url)?;
            if let Some(basic_auth) = basic_auth {
                proxy = proxy.basic_auth(&basic_auth.username, &basic_auth.password);
            }
            if let Some(no_proxy) = no_proxy {
                proxy = proxy.no_proxy(NoProxy::from_string(&no_proxy));
            }
            Ok(proxy)
        }
    }
}

fn attach_proxy(
    proxy: Proxy,
    mut builder: reqwest::ClientBuilder,
) -> crate::fetch_plugin::Result<reqwest::ClientBuilder> {
    let Proxy { all, http, https } = proxy;

    if let Some(all) = all {
        let proxy = proxy_creator(all, reqwest::Proxy::all)?;
        builder = builder.proxy(proxy);
    }

    if let Some(http) = http {
        let proxy = proxy_creator(http, reqwest::Proxy::http)?;
        builder = builder.proxy(proxy);
    }

    if let Some(https) = https {
        let proxy = proxy_creator(https, reqwest::Proxy::https)?;
        builder = builder.proxy(proxy);
    }

    Ok(builder)
}

fn build_request(
    mut builder: reqwest::ClientBuilder,
    client_config: ClientConfig,
) -> crate::fetch_plugin::Result<reqwest::RequestBuilder> {
    let ClientConfig {
        method,
        url,
        headers: headers_raw,
        data,
        connect_timeout,
        max_redirections,
        proxy,
        verify,
        no_proxy,
    } = client_config;

    let url_clone = url.clone();
    let scheme = url_clone.scheme();
    match scheme {
        "http" | "https" => {
            let method = Method::from_bytes(method.as_bytes())?;

            let mut headers = HeaderMap::new();
            for (h, v) in headers_raw {
                let name = HeaderName::from_str(&h)?;
                headers.append(name, HeaderValue::from_str(&v)?);
            }
            builder = builder.use_rustls_tls();

            if !verify.unwrap_or(true) {
                builder = builder.danger_accept_invalid_certs(true);
                builder = builder.danger_accept_invalid_hostnames(true);
            } else {
            }

            if let Some(timeout) = connect_timeout {
                builder = builder.connect_timeout(Duration::from_millis(timeout));
            }
            if let Some(max_redirections) = max_redirections {
                builder = builder.redirect(if max_redirections == 0 {
                    Policy::none()
                } else {
                    Policy::limited(max_redirections)
                });
            } else {
                builder = builder.redirect(Policy::limited(10));
            }

            if no_proxy.unwrap_or(false) {
                builder = builder.no_proxy();
            } else {
                if let Some(proxy_config) = proxy {
                    builder = attach_proxy(proxy_config, builder)?;
                }
            }

            // #[cfg(feature = "cookies")]
            // {
            //     builder = builder.cookie_provider(state.cookies_jar.clone());
            // }
            // builder = builder.cookie_provider(state.cookies_jar.clone());
            // 暂不使用cookie保存

            let mut request = builder.build()?.request(method.clone(), url_clone);

            // POST and PUT requests should always have a 0 length content-length,
            // if there is no body. https://fetch.spec.whatwg.org/#http-network-or-cache-fetch
            if data.is_none() && matches!(method, Method::POST | Method::PUT) {
                headers.append(header::CONTENT_LENGTH, HeaderValue::from_str("0")?);
            }

            if headers.contains_key(header::RANGE) {
                // https://fetch.spec.whatwg.org/#http-network-or-cache-fetch step 18
                // If httpRequest’s header list contains `Range`, then append (`Accept-Encoding`, `identity`)
                headers.append(header::ACCEPT_ENCODING, HeaderValue::from_str("identity")?);
            }

            if !headers.contains_key(header::USER_AGENT) {
                let mut rng = thread_rng(); // 创建一个随机数生成器
                if let Some(random_ua) = STATIC_CHROME_AGENTS.choose(&mut rng) {
                    headers.append(header::USER_AGENT, HeaderValue::from_str(random_ua)?);
                }
            }

            // ensure we have an Origin header set
            // if !headers.contains_key(header::ORIGIN) {
            //     headers.append(
            //         header::ORIGIN,
            //         HeaderValue::from_str(&url_for_origin.origin().ascii_serialization())?,
            //     );
            // }

            // In case empty origin is passed, remove it. Some services do not like Origin header
            // so this way we can remove it in explicit way. The default behaviour is still to set it
            // if headers.get(header::ORIGIN) == Some(&HeaderValue::from_static("")) {
            //     headers.remove(header::ORIGIN);
            // };

            if let Some(data) = data {
                request = request.body(data);
            }

            request = request.headers(headers);
            Ok(request)
        }
        "data" => {
            // let data_url =
            //     data_url::DataUrl::process(url.as_str()).map_err(|_| Error::DataUrlError)?;
            // let (body, _) = data_url
            //     .decode_to_vec()
            //     .map_err(|_| Error::DataUrlDecodeError)?;

            // let response = http::Response::builder()
            //     .status(StatusCode::OK)
            //     .header(header::CONTENT_TYPE, data_url.mime_type().to_string())
            //     .body(reqwest::Body::from(body))?;

            // let fut = async move { Ok(reqwest::Response::from(response)) };
            // let mut resources_table = webview.resources_table();
            // let rid = resources_table.add_request(Box::pin(fut));
            // Ok(rid)
            Err(Error::SchemeNotSupport(scheme.to_string()))
        }
        _ => Err(Error::SchemeNotSupport(scheme.to_string())),
    }
}

#[tauri::command]
pub async fn fetch<R: Runtime>(
    webview: Webview<R>,
    state: State<'_, Http>,
    client_config: ClientConfig,
    _command_scope: CommandScope<Entry>,
    _global_scope: GlobalScope<Entry>,
) -> crate::fetch_plugin::Result<ResourceId> {
    let url_clone = client_config.url.clone();
    let scheme = url_clone.scheme();
    match scheme {
        "http" | "https" => {
            let builder = reqwest::ClientBuilder::new();
            let request = build_request(builder, client_config)?;

            // let fut = async move {
            //     let mut redirect_history = Vec::new();
            //     let response = request.send().await.map_err(Into::into)?;
            //     if let Some(redirect_url) = response.url().to_string() {
            //         redirect_history.push(redirect_url);
            //     }
            //     Ok((response, redirect_history))
            // };
            let fut = async move { request.send().await.map_err(Into::into) };

            // let fut = async move { request.send().await.map_err(Into::into) };
            let mut resources_table = webview.resources_table();
            let rid = resources_table.add_request(Box::pin(fut));

            Ok(rid)
        }
        "data" => {
            // let data_url =
            //     data_url::DataUrl::process(url.as_str()).map_err(|_| Error::DataUrlError)?;
            // let (body, _) = data_url
            //     .decode_to_vec()
            //     .map_err(|_| Error::DataUrlDecodeError)?;

            // let response = http::Response::builder()
            //     .status(StatusCode::OK)
            //     .header(header::CONTENT_TYPE, data_url.mime_type().to_string())
            //     .body(reqwest::Body::from(body))?;

            // let fut = async move { Ok(reqwest::Response::from(response)) };
            // let mut resources_table = webview.resources_table();
            // let rid = resources_table.add_request(Box::pin(fut));
            // Ok(rid)
            Ok(1)
        }
        _ => Err(Error::SchemeNotSupport(scheme.to_string())),
    }
}

#[tauri::command]
pub fn fetch_cancel<R: Runtime>(
    webview: Webview<R>,
    rid: ResourceId,
) -> crate::fetch_plugin::Result<()> {
    let mut resources_table = webview.resources_table();
    let req = resources_table.get::<FetchRequest>(rid)?;
    let abort_tx = resources_table.take::<AbortSender>(req.abort_tx_rid)?;
    if let Some(abort_tx) = Arc::into_inner(abort_tx) {
        abort_tx.abort();
    }
    Ok(())
}

#[tauri::command]
pub async fn fetch_send<R: Runtime>(
    webview: Webview<R>,
    rid: ResourceId,
) -> crate::fetch_plugin::Result<FetchResponse> {
    let (req, abort_rx) = {
        let mut resources_table = webview.resources_table();
        let req = resources_table.get::<FetchRequest>(rid)?;
        let abort_rx = resources_table.take::<AbortRecveiver>(req.abort_rx_rid)?;
        (req, abort_rx)
    };

    let Some(abort_rx) = Arc::into_inner(abort_rx) else {
        return Err(Error::RequestCanceled);
    };

    let mut fut = req.fut.lock().await;

    let res = tokio::select! {
        res = fut.as_mut() => {
            match res {
                Ok(res) => res,
                Err(e) => {
                    eprintln!("Request failed: {:?}", e);
                    return Err(e.into());
                }
            }
        },
        _ = abort_rx.0 => {
            let mut resources_table = webview.resources_table();
            resources_table.close(rid)?;
            return Err(Error::RequestCanceled);
        }
    };

    let status = res.status();
    let url = res.url().to_string();
    let mut headers = Vec::new();
    for (key, val) in res.headers().iter() {
        headers.push((
            key.as_str().into(),
            String::from_utf8(val.as_bytes().to_vec())?,
        ));
    }

    let mut resources_table = webview.resources_table();
    let rid = resources_table.add(ReqwestResponse(res));

    Ok(FetchResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_string(),
        headers,
        url,
        rid,
    })
}

#[tauri::command]
pub async fn fetch_read_body<R: Runtime>(
    webview: Webview<R>,
    rid: ResourceId,
    stream_channel: Channel<tauri::ipc::InvokeResponseBody>,
) -> crate::fetch_plugin::Result<()> {
    let res = {
        let mut resources_table = webview.resources_table();
        resources_table.take::<ReqwestResponse>(rid)?
    };

    let mut res = Arc::into_inner(res).unwrap().0;

    // send response through IPC channel
    while let Some(chunk) = res.chunk().await? {
        let mut chunk = chunk.to_vec();
        // append 0 to indicate we are not done yet
        chunk.push(0);
        stream_channel.send(tauri::ipc::InvokeResponseBody::Raw(chunk))?;
    }

    // send 1 to indicate we are done
    stream_channel.send(tauri::ipc::InvokeResponseBody::Raw(vec![1]))?;

    Ok(())
}

fn _is_unsafe_header(header: &HeaderName) -> bool {
    matches!(
        *header,
        header::ACCEPT_CHARSET
            | header::ACCEPT_ENCODING
            | header::ACCESS_CONTROL_REQUEST_HEADERS
            | header::ACCESS_CONTROL_REQUEST_METHOD
            | header::CONNECTION
            | header::CONTENT_LENGTH
            | header::COOKIE
            | header::DATE
            | header::DNT
            | header::EXPECT
            | header::HOST
            | header::ORIGIN
            | header::REFERER
            | header::SET_COOKIE
            | header::TE
            | header::TRAILER
            | header::TRANSFER_ENCODING
            | header::UPGRADE
            | header::VIA
    ) || {
        let lower = header.as_str().to_lowercase();
        lower.starts_with("proxy-") || lower.starts_with("sec-")
    }
}

#[tauri::command]
pub async fn fetch_and_save<R: Runtime>(
    webview: Webview<R>,
    _state: State<'_, Http>,
    client_config_with_save: ClientConfigWithSave,
    _command_scope: CommandScope<Entry>,
    _global_scope: GlobalScope<Entry>,
) -> crate::fetch_plugin::Result<bool> {
    // Create client config and build request
    let client_config = ClientConfig {
        method: client_config_with_save.method,
        url: client_config_with_save.url,
        headers: client_config_with_save.headers,
        data: client_config_with_save.data,
        connect_timeout: client_config_with_save.connect_timeout,
        max_redirections: client_config_with_save.max_redirections,
        proxy: client_config_with_save.proxy,
        verify: client_config_with_save.verify,
        no_proxy: client_config_with_save.no_proxy,
    };

    let builder = reqwest::ClientBuilder::new();
    let request = build_request(builder, client_config)?;
    let response = request.send().await?;

    if !response.status().is_success() {
        return Ok(false);
    }

    let bytes = response.bytes().await?;

    // Resolve path
    let full_path = if let Some(base_dir) = client_config_with_save.base_dir {
        webview
            .path()
            .resolve(&client_config_with_save.path, base_dir)?
    } else {
        // Security check for direct paths
        let path = PathBuf::from(&client_config_with_save.path);
        if path.is_absolute() {
            return Err(Error::PathError);
        }
        path
    };

    // Create parent directories if needed (async)
    if let Some(parent) = full_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    // Write file asynchronously
    tokio::fs::write(&full_path, &bytes).await?;

    Ok(true)
}
