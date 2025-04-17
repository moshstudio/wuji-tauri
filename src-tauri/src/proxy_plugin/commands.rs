use crate::proxy_plugin::ad_remove::AdRemover;
use m3u8_rs::AlternativeMediaType::Audio;
use m3u8_rs::{MediaPlaylist, Playlist};
use once_cell::sync::Lazy;
use reqwest;
use reqwest::header::HeaderMap as ReqwestHeaderMap;
use reqwest::Method as ReqwestMethod;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::TcpListener;
use std::str::FromStr;
use std::string::ToString;
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::Duration;
use unicase::Ascii;
use urlencoding::{decode, encode};
use warp::http::header::{HeaderMap as WarpHeaderMap, HeaderName};
use warp::http::Method as WarpMethod;
use warp::http::{HeaderMap, HeaderValue};
use warp::reply::Reply;
use warp::{self, Filter};

const HOST: &str = "http://127.0.0.1";
// Store actual port and request data
static ACTUAL_PORT: AtomicU16 = AtomicU16::new(0);

fn convert_headers(
    http_headers: http::HeaderMap,
) -> Result<warp::http::HeaderMap, Box<dyn std::error::Error>> {
    let mut new_headers = warp::http::HeaderMap::new();
    for (k, v) in http_headers.iter() {
        let key_str = k.as_str();
        let value_str = v.to_str()?; // 自动传播ToStrError

        let new_key = warp::http::header::HeaderName::from_str(key_str)?; // 自动传播FromStr错误
        let new_value = warp::http::header::HeaderValue::from_str(value_str)?;

        new_headers.insert(new_key, new_value);
    }
    Ok(new_headers)
}

async fn get_m3u8_content_async(url: String) -> Result<impl warp::Reply, Infallible> {
    let client = get_default_http_client();

    // First try with redirects disabled to check for 302
    let result = client.get(&url).send().await;
    if result.is_err() {
        return Ok(warp::http::Response::builder()
            .status(500)
            .body("".to_string())
            .unwrap());
    }
    let response = result.unwrap(); // 提前解包并存储
    if response.status().is_redirection() {
        if let Some(location) = response.headers().get("Location") {
            if let Ok(redirect_url) = location.to_str() {
                return Box::pin(get_m3u8_content_async(redirect_url.to_string())).await;
            }
        }
    }

    // Process normal response (non-redirect)
    let content = response.text().await;
    let m3u8 = match content {
        Ok(content) => process_m3u8(&url, content),
        Err(_) => "".to_string(),
    };

    let res = warp::http::Response::builder()
        .status(200)
        .header("Content-Type", "application/vnd.apple.mpegurl")
        .body(m3u8)
        .unwrap();
    Ok(res)
}

/// process m3u8
fn process_m3u8(m3u8_path: &String, mut content: String) -> String {
    if content.is_empty() {
        return "".to_string();
    }
    if let Ok(Playlist::MediaPlaylist(mut pl)) = m3u8_rs::parse_playlist_res(content.as_bytes()) {
        pl.segments.iter_mut().for_each(|segment| {
            // http://39.135.138.58:18890/PLTV/88888888/224/3221225918/index.m3u8
            // http%3A%2F%2F113.207.84.197%3A8090%2F__cl%2Fcg%3Alive%2F__c%2Fcctv17HD%2F__op%2Fdefault%2F__f%2Findex.m3u8
            // No process with BANDWIDTH
            let port = ACTUAL_PORT.load(Ordering::SeqCst);

            let path_prefix = format!("{}:{}/ts/", HOST, port);

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
        // dbg!(&pl);
        let mut v: Vec<u8> = Vec::new();
        if let Ok(_) = pl.write_to(&mut v) {
            content = String::from_utf8(v).unwrap();
        }
    } else if let Ok(Playlist::MasterPlaylist(mut pl)) =
        m3u8_rs::parse_playlist_res(content.as_bytes())
    {
        // println!("{:?}", pl.alternatives);
        let port = ACTUAL_PORT.load(Ordering::SeqCst);

        let path_prefix = format!("{}:{}/m3u8/", HOST, port);

        // process audio
        pl.alternatives.iter_mut().for_each(|mut media| {
            if media.media_type == Audio && media.uri.is_some() {
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

        // process m3u8 list
        pl.variants.iter_mut().for_each(|mut variant| {
            // let path_prefix = format!("{}:{}/m3u8/", HOST, PORT);
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
        if let Ok(_) = pl.write_to(&mut v) {
            content = String::from_utf8(v).unwrap();
        }
    }
    return content;
    // return AdRemover::new().run(content);
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

/// proxy ts
async fn get_ts_content_async(ts: String) -> Result<impl warp::Reply, Infallible> {
    // let url = "https://live.v1.mk/api/bestv.php?id=cctv1hd8m/8000000";
    // let url = "http://39.135.138.58:18890/PLTV/88888888/224/3221225918/index.m3u8";
    // let url = "http://test.8ne5i.10.vs.rxip.sc96655.com/live/8ne5i_sccn,CCTV-6H265_hls_pull_4000K/280/085/429.ts";
    let client = get_default_http_client();
    let result = client.get(&ts).send().await;
    // dbg!(&result);
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

fn convert_to_reqwest_method(warp_method: WarpMethod) -> ReqwestMethod {
    match warp_method {
        WarpMethod::GET => ReqwestMethod::GET,
        WarpMethod::POST => ReqwestMethod::POST,
        WarpMethod::PUT => ReqwestMethod::PUT,
        WarpMethod::DELETE => ReqwestMethod::DELETE,
        // 其他方法...
        _ => ReqwestMethod::from_bytes(warp_method.as_str().as_bytes()).unwrap(),
    }
}
fn convert_to_reqwest_headers(warp_headers: &WarpHeaderMap) -> ReqwestHeaderMap {
    let cloned_headers = warp_headers.clone();
    let mut reqwest_headers = ReqwestHeaderMap::new();
    for (name, value) in cloned_headers.iter() {
        // 使用 reqwest::HeaderValue::from_bytes 显式创建值
        let header_value = reqwest::header::HeaderValue::from_bytes(value.as_bytes())
            .expect("Failed to convert header value");
        reqwest_headers.insert(
            reqwest::header::HeaderName::from_bytes(name.as_str().as_bytes())
                .expect("Failed to convert header name"),
            header_value,
        );
    }
    reqwest_headers
}
fn convert_to_wrap_headers(reqwest_headers: ReqwestHeaderMap) -> WarpHeaderMap {
    let mut warp_headers = WarpHeaderMap::new();
    for (name, value) in reqwest_headers.iter() {
        let name = HeaderName::from_bytes(name.as_str().as_bytes()).unwrap();
        let value = HeaderValue::from_bytes(value.as_bytes()).unwrap();
        warp_headers.insert(name, value);
    }
    warp_headers
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
        ]
    });

    HOP_HEADERS.iter().any(|h| h == &header_name)
}

fn remove_hop_headers(headers: &HeaderMap<HeaderValue>) -> HeaderMap<HeaderValue> {
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
    // 解码URL
    let url = match urlencoding::decode(encoded_url) {
        Ok(decoded) => decoded,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Invalid URL encoding".to_string(),
                warp::http::StatusCode::BAD_REQUEST,
            );
            return Ok(reply.into_response());
        }
    };
    // 解析目标URI
    let uri: warp::http::Uri = match url.parse() {
        Ok(u) => u,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Invalid target URL".to_string(),
                warp::http::StatusCode::BAD_REQUEST,
            );
            return Ok(reply.into_response());
        }
    };
    let uri = if let Some(params) = params {
        format!("{}?{}", uri.to_string(), params)
    } else {
        uri.to_string()
    };
    // 解码headers
    let decoded_headers = urlencoding::decode(headers_part).unwrap_or_default();
    let mut header_map = reqwest::header::HeaderMap::new();
    if !decoded_headers.is_empty() {
        for header_pair in decoded_headers.split(',') {
            if let Some((name_part, value_part)) = header_pair.split_once(':') {
                if let Ok(header_name) = name_part.parse::<http::header::HeaderName>() {
                    if let Ok(header_value) = http::HeaderValue::from_str(value_part) {
                        header_map.insert(header_name, header_value);
                    }
                }
            }
        }
    }
    let reqwest_headers = convert_to_reqwest_headers(&headers);
    let excluded_headers: [reqwest::header::HeaderName; 3] = [
        reqwest::header::HeaderName::from_static("host"),
        reqwest::header::HeaderName::from_static("referer"),
        reqwest::header::HeaderName::from_static("origin"),
    ];
    // 遍历源 headers
    for (name, value) in reqwest_headers.iter() {
        // 检查头部是否不在排除列表中且不在目标 header_map 中
        if !excluded_headers.contains(&name) && !header_map.contains_key(name) {
            // 由于 HeaderValue 是不可变的，我们可以直接克隆它
            header_map.insert(name.clone(), value.clone());
        }
    }

    // 创建HTTP客户端
    let client = get_default_http_client();
    dbg!(
        "send request",
        uri.clone(),
        convert_to_reqwest_method(method.clone()),
        header_map.clone(),
        body.clone()
    );

    // 构建请求
    let reqwest_request = match client
        .request(convert_to_reqwest_method(method), uri)
        .headers(header_map)
        .body(body)
        .build()
    {
        Ok(req) => req,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Failed to build request".to_string(),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            );
            return Ok(reply.into_response());
        }
    };

    let response = match client.execute(reqwest_request).await {
        Ok(res) => res,
        Err(e) => {
            let reply = warp::reply::with_status(
                format!("Request failed: {}", e),
                warp::http::StatusCode::BAD_GATEWAY,
            );
            return Ok(reply.into_response());
        }
    };
    // 转换响应状态码
    let status = warp::http::StatusCode::from_u16(response.status().as_u16())
        .unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR);

    // 转换响应头（过滤掉非法头）
    let mut headers = warp::http::HeaderMap::new();
    for (key, value) in response.headers() {
        if let Ok(name) = warp::http::HeaderName::from_bytes(key.as_ref()) {
            if let Ok(val) = warp::http::HeaderValue::from_bytes(value.as_bytes()) {
                headers.insert(name, val);
            }
        }
    }

    // 移除可能冲突的头部
    headers.remove(warp::http::header::CONNECTION);

    // 转换响应体为流
    let stream = response.bytes_stream();

    // 构建响应
    let mut reply = warp::http::Response::new(warp::hyper::Body::wrap_stream(stream));
    *reply.status_mut() = status;
    *reply.headers_mut() = headers;

    Ok(reply)
}

fn get_default_http_client() -> reqwest::Client {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::HeaderName::from_static("user-agent"),
        reqwest::header::HeaderValue::from_static(
            "(Windows NT 10.0; Win64; x64) PotPlayer/25.02.26",
        ),
    );
    return reqwest::Client::builder()
        .default_headers(headers)
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .build()
        .unwrap();
}

#[tauri::command]
pub(crate) async fn get_m3u8_url(
    original_url: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    // Return proxy URL with the original URL as path
    Ok(format!(
        "{}:{}/m3u8/{}",
        HOST,
        port,
        encode(original_url.as_str())
    ))
}

#[tauri::command]
pub(crate) fn get_proxy_url(
    url: &str,
    headers: Option<Vec<(String, String)>>,
) -> Result<String, String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    let encoded_url = encode(url);

    let mut headers_part = if let Some(h) = headers {
        let mut headers_str = String::new();
        for (name, value) in h.iter() {
            headers_str.push_str(&format!("{}:{},", name.as_str(), value));
        }
        // 移除最后的逗号
        if !headers_str.is_empty() {
            headers_str.pop();
        }
        encode(&headers_str).into_owned()
    } else {
        encode("").into_owned()
    };
    if headers_part.is_empty() {
        headers_part = encode("_").into_owned();
    }

    Ok(format!(
        "{}:{}/proxy/{}/{}",
        HOST, port, headers_part, encoded_url
    ))
}

fn find_available_port(start_port: u16) -> Option<u16> {
    (start_port..=start_port + 100).find(|port| TcpListener::bind(("127.0.0.1", *port)).is_ok())
}

pub(crate) fn start_proxy_server() -> std::io::Result<()> {
    let port = find_available_port(9998).ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::AddrInUse, "No available port found")
    })?;

    ACTUAL_PORT.store(port, Ordering::SeqCst);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);
    let m3u8_proxy_router = warp::path!("m3u8" / String).and_then(move |url: String| {
        let decoded = decode(url.as_str()).expect("UTF-8");
        // dbg!(&decoded);
        get_m3u8_content_async(decoded.to_string())
    });
    // proxy ts
    let ts_proxy_router = warp::path!("ts" / String).and_then(move |url: String| {
        let decoded = decode(url.as_str()).expect("UTF-8");
        // dbg!(&decoded);
        get_ts_content_async(decoded.to_string())
    });

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

    // let route = warp::any().map(|| warp::redirect(Uri::from_static("https://120.77.38.213:9443/flv/2008180000000304/ZjE4ejhGVUU0QzJ0Y3M4QixhNDMzNmQyOWQwMTBlOTk2.ts?edge=on")));

    let routers = m3u8_proxy_router.or(ts_proxy_router).or(proxy).with(cors);

    tauri::async_runtime::spawn(warp::serve(routers).run(([127, 0, 0, 1], port)));

    Ok(())
}
