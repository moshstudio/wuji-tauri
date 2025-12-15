use m3u8_rs::{AlternativeMediaType, MediaPlaylist, Playlist};
use once_cell::sync::Lazy;
use reqwest;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::TcpListener;
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::Duration;
use unicase::Ascii;
use urlencoding::{decode, encode};
use warp::http::header::HeaderName as WarpHeaderName;
use warp::reply::Reply;
use warp::{self, Filter};

// Constants
const HOST: &str = "http://127.0.0.1";
const DEFAULT_START_PORT: u16 = 1430;
const PORT_SCAN_RANGE: u16 = 100;
const REQUEST_TIMEOUT_SECS: u64 = 60;
const CONNECT_TIMEOUT_SECS: u64 = 15;
const MAX_REDIRECT_COUNT: u8 = 10;

// Store actual port
static ACTUAL_PORT: AtomicU16 = AtomicU16::new(0);

// Helper function to parse headers from encoded string
fn parse_encoded_headers(headers_part: &str) -> reqwest::header::HeaderMap {
    let mut header_map = reqwest::header::HeaderMap::new();

    let decoded_headers = urlencoding::decode(headers_part).unwrap_or_default();
    if decoded_headers.is_empty() {
        return header_map;
    }

    for header_pair in decoded_headers.split(',') {
        if let Some((name_part, value_part)) = header_pair.split_once(':') {
            if let Ok(header_name) = name_part.parse::<http::header::HeaderName>() {
                if let Ok(header_value) = http::HeaderValue::from_str(value_part) {
                    header_map.insert(header_name, header_value);
                }
            }
        }
    }
    header_map
}

// Helper function to merge headers, excluding specific ones
fn merge_headers(
    target: &mut reqwest::header::HeaderMap,
    source: reqwest::header::HeaderMap,
    excluded: &[reqwest::header::HeaderName],
) {
    for (name, value) in source.iter() {
        if !excluded.contains(name) && !target.contains_key(name) {
            target.insert(name.clone(), value.clone());
        }
    }
}

async fn get_m3u8_content_async(
    headers_part: String,
    url: String,
    headers: warp::http::HeaderMap,
) -> Result<impl warp::Reply, Infallible> {
    get_m3u8_content_with_redirect(headers_part, url, headers, 0).await
}

fn get_m3u8_content_with_redirect(
    headers_part: String,
    url: String,
    headers: warp::http::HeaderMap,
    redirect_count: u8,
) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = Result<warp::http::Response<String>, Infallible>> + Send>,
> {
    Box::pin(async move {
        // Prevent infinite redirects
        if redirect_count >= MAX_REDIRECT_COUNT {
            return Ok(warp::http::Response::builder()
                .status(508) // Loop Detected
                .body("Too many redirects".to_string())
                .unwrap());
        }

        // Parse headers from encoded part
        let mut header_map = parse_encoded_headers(&headers_part);

        // Merge request headers (excluding host, referer, origin)
        let excluded_headers: [reqwest::header::HeaderName; 3] = [
            reqwest::header::HeaderName::from_static("host"),
            reqwest::header::HeaderName::from_static("referer"),
            reqwest::header::HeaderName::from_static("origin"),
        ];
        let reqwest_headers = convert_to_reqwest_headers(headers);
        merge_headers(&mut header_map, reqwest_headers, &excluded_headers);

        // Create HTTP client
        let client = get_m3u8_http_client(&url, &header_map);

        #[cfg(debug_assertions)]
        println!("[M3U8] Request: url={}, headers={:?}", &url, &header_map);

        // Send request
        let response = match client.get(&url).send().await {
            Ok(resp) => resp,
            Err(e) => {
                eprintln!("[M3U8] Request failed: {}", e);
                return Ok(warp::http::Response::builder()
                    .status(500)
                    .body("".to_string())
                    .unwrap());
            }
        };

        let response_status = response.status();
        let response_headers = response.headers().clone();

        // Handle redirects
        if response_status.is_redirection() {
            if let Some(location) = response_headers.get("Location") {
                if let Ok(redirect_url) = location.to_str() {
                    return get_m3u8_content_with_redirect(
                        headers_part,
                        redirect_url.to_string(),
                        warp::http::HeaderMap::new(),
                        redirect_count + 1,
                    )
                    .await;
                }
            }
        }

        // Process normal response
        let m3u8_content = match response.text().await {
            Ok(content) => process_m3u8(&url, &content, &headers_part),
            Err(e) => {
                eprintln!("[M3U8] Failed to read response body: {}", e);
                "".to_string()
            }
        };

        #[cfg(debug_assertions)]
        println!(
            "[M3U8] Response: status={}, content_length={}",
            response_status.as_u16(),
            m3u8_content.len()
        );

        let content_type = response_headers
            .get("Content-Type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("application/vnd.apple.mpegurl");

        Ok(warp::http::Response::builder()
            .status(200)
            .header("Content-Type", content_type)
            .body(m3u8_content)
            .unwrap())
    })
}
fn smart_parse_m3u8(content: &str) -> Result<Playlist, Box<dyn std::error::Error>> {
    let cleaned_content = content.trim_start_matches('+').trim();
    let content_bytes = cleaned_content.as_bytes();

    // Try general parsing first
    if let Ok(playlist) = m3u8_rs::parse_playlist_res(content_bytes) {
        return Ok(playlist);
    }

    // Try as Master Playlist
    if let Ok(master_pl) = m3u8_rs::parse_master_playlist_res(content_bytes) {
        return Ok(Playlist::MasterPlaylist(master_pl));
    }

    // Try as Media Playlist
    if let Ok(media_pl) = m3u8_rs::parse_media_playlist_res(content_bytes) {
        return Ok(Playlist::MediaPlaylist(media_pl));
    }

    // All parsing attempts failed
    Err(if content.len() > 500 {
        format!(
            "Failed to parse M3U8: Invalid format. Content length: {} chars",
            content.len()
        )
    } else {
        format!(
            "Failed to parse M3U8: Invalid format. Content: '{}'",
            content
        )
    }
    .into())
}
/// Helper function to check if a URL is valid
fn is_valid_url(url: &str) -> bool {
    if url.is_empty() {
        return false;
    }
    // Check if it's an HTTP/HTTPS URL
    if url.starts_with("http://") || url.starts_with("https://") {
        return true;
    }
    // Check if it's a relative path (considered valid)
    if !url.contains("://") {
        return true;
    }
    false
}

/// Process m3u8 content and rewrite URLs to use proxy
fn process_m3u8(m3u8_path: &str, content: &str, headers_part: &str) -> String {
    if content.is_empty() {
        return String::new();
    }

    let mut modified_content = content.to_string();

    match smart_parse_m3u8(content) {
        Ok(Playlist::MediaPlaylist(mut pl)) => {
            #[cfg(debug_assertions)]
            println!("[M3U8] Processing MediaPlaylist {:?}", pl);

            // Remove invalid encryption keys from segments
            pl.segments.iter_mut().for_each(|segment| {
                // 检查并移除 segment.key 中的无效密钥
                if let Some(ref key) = segment.key {
                    if let Some(ref uri) = key.uri {
                        if !is_valid_url(uri) {
                            #[cfg(debug_assertions)]
                            println!("[M3U8] Removing invalid key URI from segment.key: {}", uri);
                            segment.key = None;
                        }
                    }
                }

                // 检查并移除 unknown_tags 中的 X-KEY 标签
                segment.unknown_tags.retain(|tag| {
                    if tag.tag == "X-KEY" {
                        #[cfg(debug_assertions)]
                        println!("[M3U8] Removing X-KEY from unknown_tags: {:?}", tag);
                        false // 移除这个标签
                    } else {
                        true // 保留其他标签
                    }
                });
            });

            // Rewrite segment URIs to use proxy
            pl.segments.iter_mut().for_each(|segment| {
                let port = ACTUAL_PORT.load(Ordering::SeqCst);
                let path_prefix = format!("{}:{}/ts/{}/", HOST, port, headers_part);

                if segment.uri.starts_with("http") {
                    segment.uri = format!("{}{}", path_prefix, encode(&segment.uri));
                } else {
                    if let Some(position) = m3u8_path.rfind("/") {
                        let url = &m3u8_path[..position + 1];
                        let real_url = format!("{}{}", url, &segment.uri);
                        segment.uri = format!("{}{}", path_prefix, encode(&real_url));
                    }
                }
            });
            let mut v: Vec<u8> = Vec::new();
            if pl.write_to(&mut v).is_ok() {
                if let Ok(s) = String::from_utf8(v) {
                    modified_content = s;
                }
            }
        }
        Ok(Playlist::MasterPlaylist(mut pl)) => {
            #[cfg(debug_assertions)]
            println!("[M3U8] Processing MasterPlaylist");
            // println!("{:?}", pl.alternatives);
            let port = ACTUAL_PORT.load(Ordering::SeqCst);

            let path_prefix = format!("{}:{}/m3u8/{}/", HOST, port, headers_part);

            // Process audio
            pl.alternatives.iter_mut().for_each(|media| {
                if media.media_type == AlternativeMediaType::Audio && media.uri.is_some() {
                    if media.uri.as_ref().unwrap().starts_with("http") {
                        media.uri = Some(format!(
                            "{}{}",
                            path_prefix,
                            encode(media.uri.as_ref().unwrap())
                        ));
                    } else {
                        if let Some(position) = m3u8_path.rfind("/") {
                            let url = &m3u8_path[..position + 1];
                            let real_url = format!("{}{}", url, media.uri.as_ref().unwrap());
                            media.uri = Some(format!("{}{}", &path_prefix, encode(&real_url)));
                        }
                    }
                }
            });

            // Process m3u8 variant list
            pl.variants.iter_mut().for_each(|variant| {
                if variant.uri.starts_with("http") {
                    variant.uri = format!("{}{}", path_prefix, encode(&variant.uri));
                } else {
                    if let Some(position) = m3u8_path.rfind("/") {
                        let url = &m3u8_path[..position + 1];
                        let real_url = format!("{}{}", url, &variant.uri);
                        variant.uri = format!("{}{}", &path_prefix, encode(&real_url));
                    }
                }
            });
            let mut v: Vec<u8> = Vec::new();
            if pl.write_to(&mut v).is_ok() {
                if let Ok(s) = String::from_utf8(v) {
                    modified_content = s;
                }
            }
        }
        Err(e) => {
            eprintln!("[M3U8] Failed to parse playlist: {}", e);
        }
    }

    modified_content
}

fn remove_m3u8_ad(content: &str) -> Result<String, Box<dyn std::error::Error>> {
    println!("remove_m3u8_ad {:?}", content);
    let mut new_playlist = String::new();
    new_playlist.push_str("#EXTM3U\n");
    new_playlist.push_str("#EXT-X-VERSION:3\n");

    if let Ok(Playlist::MediaPlaylist(MediaPlaylist {
        segments,
        target_duration,
        ..
    })) = m3u8_rs::parse_playlist_res(content.as_bytes())
    {
        let mut in_ad = false;
        let mut ad_ranges = Vec::new();
        let mut current_range_start = 0;

        // 首先识别广告段
        for (i, segment) in segments.iter().enumerate() {
            // 检测广告开始的条件
            if segment.discontinuity
                || (i > 0 && is_filename_jump(&segments[i - 1].uri, &segment.uri))
            {
                if !in_ad {
                    current_range_start = i;
                    in_ad = true;
                }
            } else if in_ad {
                println!("Ad range: {}-{} {:?}", current_range_start, i - 1, segment);
                ad_ranges.push((current_range_start, i - 1));
                in_ad = false;
            }
        }

        if in_ad {
            ad_ranges.push((current_range_start, segments.len() - 1));
        }

        // 生成新的播放列表，跳过广告段
        let mut last_was_discontinuity = false;
        for (i, segment) in segments.iter().enumerate() {
            if ad_ranges.iter().any(|&(start, end)| i >= start && i <= end) {
                continue;
            }

            // 跳过连续 discontinuity 标记
            if segment.discontinuity {
                if last_was_discontinuity {
                    continue;
                }
                last_was_discontinuity = true;
            } else {
                last_was_discontinuity = false;
            }

            // 写入 segment 信息
            if segment.discontinuity {
                new_playlist.push_str("#EXT-X-DISCONTINUITY\n");
            }

            new_playlist.push_str(&format!("#EXTINF:{},\n", segment.duration));
            new_playlist.push_str(&segment.uri);
            new_playlist.push('\n');
        }

        // 更新目标时长
        new_playlist.push_str(&format!("#EXT-X-TARGETDURATION:{}\n", target_duration));
        new_playlist.push_str("#EXT-X-ENDLIST\n");
        Ok(new_playlist)
    } else {
        Ok(content.to_string())
    }
}

// 检测文件名是否出现跳跃（广告特征）
fn is_filename_jump(prev: &str, current: &str) -> bool {
    let extract_number = |s: &str| {
        s.rsplit('.')
            .next()
            .and_then(|name| name.split('_').last())
            .and_then(|num| num.trim_end_matches(".ts").parse::<u64>().ok())
    };

    if let (Some(prev_num), Some(curr_num)) = (extract_number(prev), extract_number(current)) {
        // 如果序号跳跃超过1000，认为是广告
        println!("prev: {}, curr: {}", prev_num, curr_num);
        curr_num > prev_num + 1000
    } else {
        false
    }
}

/// Proxy TS segments
async fn get_ts_content_async(
    headers_part: String,
    url: String,
    headers: warp::http::HeaderMap,
) -> Result<impl warp::Reply, Infallible> {
    #[cfg(debug_assertions)]
    println!("[TS] Proxying: {} {}", headers_part, url);
    let mut header_map = parse_encoded_headers(&headers_part);

    // Merge request headers (excluding host, referer, origin)
    let excluded_headers: [reqwest::header::HeaderName; 3] = [
        reqwest::header::HeaderName::from_static("host"),
        reqwest::header::HeaderName::from_static("referer"),
        reqwest::header::HeaderName::from_static("origin"),
    ];
    let reqwest_headers = convert_to_reqwest_headers(headers);
    merge_headers(&mut header_map, reqwest_headers, &excluded_headers);
    let client = get_m3u8_http_client(&url, &header_map);
    let result = client.get(&url).send().await;
    if result.is_err() {
        return Ok(warp::http::Response::builder()
            .status(500)
            .header("Content-Type", "video/mp2t")
            .body(vec![])
            .unwrap());
    }
    let response = result.unwrap();
    let headers_map = response.headers().clone();

    let mut builder = warp::http::Response::builder();
    let headers = builder.headers_mut().unwrap();
    for (k, v) in headers_map.into_iter() {
        let h = k.unwrap();
        if h != "content-length" {
            headers.insert(
                warp::http::HeaderName::from_bytes(h.as_str().as_bytes()).unwrap(),
                warp::http::HeaderValue::from_str(v.to_str().unwrap()).unwrap(),
            );
        }
    }
    // let url = Url::parse(&ts).unwrap();
    // headers.insert("Host", HeaderValue::from_str(url.host().unwrap().to_string().as_str()).unwrap());

    let content = response.bytes().await;
    let ts = content.unwrap();

    let res = builder.status(200).body(ts.to_vec()).unwrap();
    Ok(res)
}

/// Headers are checked using unicase to avoid case misfunctions
fn is_hop_header(header_name: &str) -> bool {
    static HOP_HEADERS: Lazy<Vec<Ascii<&'static str>>> = Lazy::new(|| {
        vec![
            Ascii::new("Connection"),
            Ascii::new("Keep-Alive"),
            Ascii::new("Proxy-Authenticate"),
            Ascii::new("Proxy-Authorization"),
            Ascii::new("Te"),
            Ascii::new("Trailers"),
            Ascii::new("Transfer-Encoding"),
            Ascii::new("Upgrade"),
            Ascii::new("Content-Length"),
        ]
    });

    HOP_HEADERS.iter().any(|h| h == &header_name)
}

fn remove_hop_headers(
    headers: &warp::http::HeaderMap<warp::http::HeaderValue>,
) -> warp::http::HeaderMap<warp::http::HeaderValue> {
    headers
        .iter()
        .filter_map(|(k, v)| {
            if !is_hop_header(k.as_str()) {
                Some((k.clone(), v.clone()))
            } else {
                None
            }
        })
        .collect()
}

async fn handle_proxy_request(
    headers_part: &str,
    encoded_url: &str,
    params: Option<String>,
    method: warp::http::Method,
    headers: warp::http::HeaderMap,
    body: warp::hyper::body::Bytes,
) -> Result<impl warp::Reply, warp::Rejection> {
    handle_proxy_request_with_redirect(
        headers_part.to_string(),
        encoded_url.to_string(),
        params,
        method,
        headers,
        body,
        0,
    )
    .await
}

fn handle_proxy_request_with_redirect(
    headers_part: String,
    encoded_url: String,
    params: Option<String>,
    method: warp::http::Method,
    headers: warp::http::HeaderMap,
    body: warp::hyper::body::Bytes,
    redirect_count: u8,
) -> std::pin::Pin<
    Box<
        dyn std::future::Future<
                Output = Result<warp::http::Response<warp::hyper::Body>, warp::Rejection>,
            > + Send,
    >,
> {
    Box::pin(async move {
        // Prevent infinite redirects
        if redirect_count >= MAX_REDIRECT_COUNT {
            let reply = warp::reply::with_status(
                "Too many redirects".to_string(),
                warp::http::StatusCode::LOOP_DETECTED,
            );
            return Ok(reply.into_response());
        }

        // Decode URL
        let url_cow = match urlencoding::decode(&encoded_url) {
            Ok(decoded) => decoded,
            Err(e) => {
                let reply = warp::reply::with_status(
                    format!("Invalid URL encoding: {}", e),
                    warp::http::StatusCode::BAD_REQUEST,
                );
                return Ok(reply.into_response());
            }
        };

        let uri: warp::http::Uri = match url_cow.parse() {
            Ok(u) => u,
            Err(e) => {
                let reply = warp::reply::with_status(
                    format!("Invalid target URL: {}", e),
                    warp::http::StatusCode::BAD_REQUEST,
                );
                return Ok(reply.into_response());
            }
        };

        let mut url = if let Some(ref p) = params {
            format!("{}?{}", uri, p)
        } else {
            uri.to_string()
        };

        if url.starts_with("//") {
            url = format!("http:{}", url);
        }

        // Parse headers from encoded part
        let mut header_map = parse_encoded_headers(&headers_part);

        // Merge request headers
        let excluded_headers: [reqwest::header::HeaderName; 3] = [
            reqwest::header::HeaderName::from_static("host"),
            reqwest::header::HeaderName::from_static("referer"),
            reqwest::header::HeaderName::from_static("origin"),
        ];
        let reqwest_headers = convert_to_reqwest_headers(headers);
        merge_headers(&mut header_map, reqwest_headers, &excluded_headers);

        #[cfg(debug_assertions)]
        println!(
            "[Proxy] Request: method={}, url={}, headers={:?}, body_len={}",
            method,
            &url,
            &header_map,
            body.len()
        );

        // Create HTTP client (with certificate verification disabled)
        let client = get_proxy_http_client(&url, &header_map, true);

        // Build request
        let reqwest_request = match client
            .request(convert_to_reqwest_method(&method), &url)
            .headers(header_map)
            .body(body.to_vec())
            .build()
        {
            Ok(req) => req,
            Err(e) => {
                eprintln!("[Proxy] Failed to build request: {}", e);
                let reply = warp::reply::with_status(
                    format!("Failed to build request: {}", e),
                    warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                );
                return Ok(reply.into_response());
            }
        };

        // Execute request with timeout
        let response = match execute_request_with_timeout(client, reqwest_request).await {
            Ok(Some(res)) => res,
            Ok(None) => {
                eprintln!("[Proxy] Request timeout");
                let reply = warp::reply::with_status(
                    "Request timeout".to_string(),
                    warp::http::StatusCode::REQUEST_TIMEOUT,
                );
                return Ok(reply.into_response());
            }
            Err(e) => {
                eprintln!("[Proxy] Request failed: {}", e);
                let reply = warp::reply::with_status(
                    format!("Request failed: {}", e),
                    warp::http::StatusCode::BAD_GATEWAY,
                );
                return Ok(reply.into_response());
            }
        };

        let response_headers = response.headers().clone();
        let response_status = warp::http::StatusCode::from_u16(response.status().as_u16())
            .unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR);

        // Handle redirects
        if response_status.is_redirection() {
            if let Some(location) = response_headers.get(reqwest::header::LOCATION) {
                if let Ok(redirect_url) = location.to_str() {
                    return handle_proxy_request_with_redirect(
                        headers_part,
                        redirect_url.to_string(),
                        params,
                        method,
                        warp::http::HeaderMap::new(),
                        warp::hyper::body::Bytes::new(),
                        redirect_count + 1,
                    )
                    .await;
                }
            }
        }

        #[cfg(debug_assertions)]
        println!(
            "[Proxy] Response: status={}, streaming body",
            response_status
        );

        // Stream response body
        let response_body = response.bytes_stream();

        // Create streaming response
        let body = warp::hyper::Body::wrap_stream(response_body);
        let mut reply = warp::http::Response::new(body);
        *reply.status_mut() = response_status;
        *reply.headers_mut() = remove_hop_headers(&convert_to_wrap_headers(response_headers));

        Ok(reply)
    })
}

/// Execute request with timeout support
async fn execute_request_with_timeout(
    client: reqwest::Client,
    request: reqwest::Request,
) -> Result<Option<reqwest::Response>, reqwest::Error> {
    tokio::select! {
        result = client.execute(request) => result.map(Some),
        _ = tokio::time::sleep(Duration::from_secs(REQUEST_TIMEOUT_SECS)) => Ok(None),
    }
}

// Helper: Convert reqwest headers to warp headers
fn convert_to_wrap_headers(headers: reqwest::header::HeaderMap) -> warp::http::HeaderMap {
    let mut warp_headers = warp::http::HeaderMap::new();
    for (name, value) in headers.iter() {
        if let (Ok(warp_name), Ok(warp_value)) = (
            WarpHeaderName::from_bytes(name.as_str().as_bytes()),
            warp::http::HeaderValue::from_bytes(value.as_bytes()),
        ) {
            warp_headers.insert(warp_name, warp_value);
        }
    }
    warp_headers
}

// Helper: Convert warp headers to reqwest headers
fn convert_to_reqwest_headers(headers: warp::http::HeaderMap) -> reqwest::header::HeaderMap {
    let mut reqwest_headers = reqwest::header::HeaderMap::new();
    for (name, value) in headers.iter() {
        if let (Ok(req_name), Ok(req_value)) = (
            reqwest::header::HeaderName::from_bytes(name.as_str().as_bytes()),
            reqwest::header::HeaderValue::from_bytes(value.as_bytes()),
        ) {
            reqwest_headers.insert(req_name, req_value);
        }
    }
    reqwest_headers
}

// Helper: Convert warp HTTP method to reqwest method
fn convert_to_reqwest_method(method: &warp::http::Method) -> reqwest::Method {
    match *method {
        warp::http::Method::GET => reqwest::Method::GET,
        warp::http::Method::POST => reqwest::Method::POST,
        warp::http::Method::PUT => reqwest::Method::PUT,
        warp::http::Method::DELETE => reqwest::Method::DELETE,
        warp::http::Method::PATCH => reqwest::Method::PATCH,
        warp::http::Method::HEAD => reqwest::Method::HEAD,
        warp::http::Method::OPTIONS => reqwest::Method::OPTIONS,
        _ => reqwest::Method::GET,
    }
}

fn get_m3u8_http_client(_url: &str, headers: &reqwest::header::HeaderMap) -> reqwest::Client {
    let mut headers = headers.clone();

    // Set default User-Agent for M3U8 requests (PotPlayer compatible)
    if !headers.contains_key(reqwest::header::USER_AGENT) {
        headers.insert(
            reqwest::header::USER_AGENT,
            reqwest::header::HeaderValue::from_static(
                "(Windows NT 10.0; WOW64) PotPlayer/25.06.25",
            ),
        );
    }

    if !headers.contains_key(reqwest::header::ACCEPT) {
        headers.insert(
            reqwest::header::ACCEPT,
            reqwest::header::HeaderValue::from_static("*/*"),
        );
    }

    reqwest::Client::builder()
        .default_headers(headers)
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECS))
        .http1_title_case_headers()
        .build()
        .expect("Failed to build M3U8 HTTP client")
}

fn get_proxy_http_client(
    _url: &str,
    headers: &reqwest::header::HeaderMap,
    danger_accept_invalid_certs: bool,
) -> reqwest::Client {
    let mut headers = headers.clone();

    // Set default headers for proxy requests (Chrome compatible)
    if !headers.contains_key(reqwest::header::USER_AGENT) {
        headers.insert(
            reqwest::header::USER_AGENT,
            reqwest::header::HeaderValue::from_static(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
            ),
        );
    }

    if !headers.contains_key(reqwest::header::ACCEPT) {
        headers.insert(
            reqwest::header::ACCEPT,
            reqwest::header::HeaderValue::from_static("*/*"),
        );
    }

    if !headers.contains_key(reqwest::header::ACCEPT_ENCODING) {
        headers.insert(
            reqwest::header::ACCEPT_ENCODING,
            reqwest::header::HeaderValue::from_static("gzip, deflate, br, zstd"),
        );
    }

    if !headers.contains_key(reqwest::header::ACCEPT_LANGUAGE) {
        headers.insert(
            reqwest::header::ACCEPT_LANGUAGE,
            reqwest::header::HeaderValue::from_static("zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7"),
        );
    }

    headers.insert(
        reqwest::header::UPGRADE_INSECURE_REQUESTS,
        reqwest::header::HeaderValue::from_static("1"),
    );

    reqwest::Client::builder()
        .default_headers(headers)
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECS))
        .danger_accept_invalid_certs(danger_accept_invalid_certs)
        .danger_accept_invalid_hostnames(danger_accept_invalid_certs)
        .build()
        .expect("Failed to build proxy HTTP client")
}

// Helper: Encode headers to URL-safe string
fn encode_headers_to_string(headers: &HashMap<String, String>) -> String {
    if headers.is_empty() {
        return encode("_").into_owned();
    }

    let headers_str = headers
        .iter()
        .map(|(name, value)| format!("{}:{}", name, value))
        .collect::<Vec<_>>()
        .join(",");

    encode(&headers_str).into_owned()
}

#[tauri::command]
pub(crate) async fn get_m3u8_url(
    original_url: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);
    let encoded_url = encode(&original_url);
    let headers_part = encode_headers_to_string(&headers);

    #[cfg(debug_assertions)]
    println!(
        "[M3U8 URL] original={}, encoded={}",
        &original_url, &encoded_url
    );

    Ok(format!(
        "{}:{}/m3u8/{}/{}",
        HOST, port, headers_part, encoded_url
    ))
}

#[tauri::command]
pub(crate) fn get_proxy_url(
    original_url: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);
    let encoded_url = encode(&original_url);
    let headers_part = encode_headers_to_string(&headers);

    #[cfg(debug_assertions)]
    println!(
        "[Proxy URL] original={}, encoded={}",
        &original_url, &encoded_url
    );

    Ok(format!(
        "{}:{}/proxy/{}/{}",
        HOST, port, headers_part, encoded_url
    ))
}

fn find_available_port(start_port: u16) -> Option<u16> {
    (start_port..=start_port + PORT_SCAN_RANGE)
        .find(|port| TcpListener::bind(("127.0.0.1", *port)).is_ok())
}

pub(crate) fn start_proxy_server() -> std::io::Result<()> {
    let port = find_available_port(DEFAULT_START_PORT).ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::AddrInUse,
            format!(
                "No available port found in range {}-{}",
                DEFAULT_START_PORT,
                DEFAULT_START_PORT + PORT_SCAN_RANGE
            ),
        )
    })?;

    ACTUAL_PORT.store(port, Ordering::SeqCst);

    println!("[Proxy Server] Starting on port {}", port);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);

    // M3U8 proxy route
    let m3u8_proxy_router = warp::path!("m3u8" / String / String)
        .and(warp::header::headers_cloned())
        .and_then(
            |headers_part: String, url: String, headers: warp::http::HeaderMap| async move {
                let decoded = decode(&url).expect("UTF-8");
                get_m3u8_content_async(headers_part, decoded.to_string(), headers).await
            },
        );

    // TS proxy route
    let ts_proxy_router = warp::path!("ts" / String / String)
        .and(warp::header::headers_cloned())
        .and_then(
            |headers_part: String, url: String, headers: warp::http::HeaderMap| async move {
                let decoded = decode(&url).expect("UTF-8");
                get_ts_content_async(headers_part, decoded.to_string(), headers).await
            },
        );

    // General proxy route
    let proxy = warp::path!("proxy" / String / String)
        .and(
            warp::query::raw()
                .map(Some)
                .or(warp::any().map(|| None))
                .unify(),
        ) // 获取可选的查询参数
        .and(warp::method()) // 获取 HTTP 方法
        .and(warp::header::headers_cloned()) // 获取请求头
        .and(warp::body::bytes()) // 获取请求体
        .and_then(
            |headers_part: String,
             encoded_url: String,
             params: Option<String>,
             method: warp::http::Method,
             headers: warp::http::HeaderMap,
             body: warp::hyper::body::Bytes| async move {
                handle_proxy_request(&headers_part, &encoded_url, params, method, headers, body)
                    .await
            },
        );

    let routers = m3u8_proxy_router.or(ts_proxy_router).or(proxy).with(cors);

    tauri::async_runtime::spawn(warp::serve(routers).run(([127, 0, 0, 1], port)));

    Ok(())
}
