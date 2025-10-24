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
use warp::http::header::{
    HeaderMap as WarpHeaderMap, HeaderName as WarpHeaderName, HeaderValue as WarpHeaderValue,
};
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

async fn get_m3u8_content_async(
    headers_part: String,
    url: String,
    headers: warp::http::HeaderMap,
) -> Result<impl warp::Reply, Infallible> {
    // 解码headers
    let decoded_headers = urlencoding::decode(&headers_part).unwrap_or_default();
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
    // let reqwest_headers = convert_to_reqwest_headers(&headers);
    // let excluded_headers: [reqwest::header::HeaderName; 3] = [
    //     reqwest::header::HeaderName::from_static("host"),
    //     reqwest::header::HeaderName::from_static("referer"),
    //     reqwest::header::HeaderName::from_static("origin"),
    // ];
    // // 遍历源 headers
    // for (name, value) in reqwest_headers.iter() {
    //     // 检查头部是否不在排除列表中且不在目标 header_map 中
    //     if !excluded_headers.contains(&name) && !header_map.contains_key(name) {
    //         // 由于 HeaderValue 是不可变的，我们可以直接克隆它
    //         header_map.insert(name.clone(), value.clone());
    //     }
    // }

    // 创建HTTP客户端
    let client = get_m3u8_http_client(Some(url.clone()), Some(header_map.clone()), None);

    let dbg_info = format!(
        "get_m3u8_content_async send request: url={}, headers={:?}",
        &url.clone(),
        header_map.clone(),
    );
    dbg!(dbg_info);
    // First try with redirects disabled to check for 302
    let result = client.get(&url).send().await;
    if result.is_err() {
        return Ok(warp::http::Response::builder()
            .status(500)
            .body("".to_string())
            .unwrap());
    }
    let response = result.unwrap(); // 提前解包并存储
    let status = response.status();
    if status.is_redirection() {
        if let Some(location) = response.headers().get("Location") {
            if let Ok(redirect_url) = location.to_str() {
                return Box::pin(get_m3u8_content_async(
                    headers_part.to_string(),
                    redirect_url.to_string(),
                    headers.clone(),
                ))
                .await;
            }
        }
    }
    // Process normal response (non-redirect)
    // 提前获取 headers 和 status，避免 response 被提前 move
    let headers = response.headers().clone();
    let status = response.status();

    // Process normal response (non-redirect)
    let content = response.text().await;
    let m3u8 = match &content {
        Ok(c) => process_m3u8(&url, c.clone(), headers_part),
        Err(_) => "".to_string(),
    };
    let dbg_info = format!(
        "get_m3u8_content_async response: status={}, headers={:?}, content(or length)={}",
        status.as_u16(),
        headers.clone(),
        if m3u8.len() > 300 {
            m3u8.len().to_string()
        } else {
            m3u8.clone()
        }
    );
    dbg!(dbg_info);

    let content_type = headers
        .get("Content-Type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/vnd.apple.mpegurl");

    let res = warp::http::Response::builder()
        .status(200)
        .header("Content-Type", content_type)
        .body(m3u8)
        .unwrap();
    Ok(res)
}
fn smart_parse_m3u8(content: &str) -> Result<Playlist, Box<dyn std::error::Error>> {
    let cleaned_content = content.trim_start_matches('+').trim();
    let content_bytes = cleaned_content.as_bytes();

    // 首先尝试通用解析
    match m3u8_rs::parse_playlist_res(content_bytes) {
        Ok(playlist) => {
            // 如果通用解析成功，直接返回
            return Ok(playlist);
        }
        Err(_) => {
            // 通用解析失败，继续尝试特定解析
        }
    }

    // 尝试作为Master Playlist解析
    if let Ok(master_pl) = m3u8_rs::parse_master_playlist_res(content_bytes) {
        return Ok(Playlist::MasterPlaylist(master_pl));
    }

    // 尝试作为Media Playlist解析（包括直播流）
    if let Ok(media_pl) = m3u8_rs::parse_media_playlist_res(content_bytes) {
        return Ok(Playlist::MediaPlaylist(media_pl));
    }

    // 所有尝试都失败，根据内容长度输出不同的错误信息
    if content.len() > 500 {
        Err(format!(
            "无法解析M3U8内容：既不是有效的Master Playlist也不是Media Playlist。内容长度：{}字符",
            content.len()
        )
        .into())
    } else {
        Err(format!(
            "无法解析M3U8内容：既不是有效的Master Playlist也不是Media Playlist。内容：'{}'",
            content
        )
        .into())
    }
}
/// process m3u8
fn process_m3u8(m3u8_path: &String, mut content: String, headers_part: String) -> String {
    if content.is_empty() {
        return "".to_string();
    }

    match smart_parse_m3u8(&content) {
        Ok(Playlist::MediaPlaylist(mut pl)) => {
            dbg!("process_m3u8 media type");
            pl.segments.iter_mut().for_each(|segment| {
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
            let mut v: Vec<u8> = Vec::new();
            if let Ok(_) = pl.write_to(&mut v) {
                content = String::from_utf8(v).unwrap();
            }
        }
        Ok(Playlist::MasterPlaylist(mut pl)) => {
            dbg!("process_m3u8 master type");
            // println!("{:?}", pl.alternatives);
            let port = ACTUAL_PORT.load(Ordering::SeqCst);

            let path_prefix = format!("{}:{}/m3u8/{}/", HOST, port, headers_part);

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
        Err(e) => {
            dbg!("process_m3u8 unknown type", &e);
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

    let client = get_m3u8_http_client(None, None, None);
    let result = client.get(&ts).send().await;
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
        let name = WarpHeaderName::from_bytes(name.as_str().as_bytes()).unwrap();
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
            Ascii::new("Content-Length"),
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
    let params_clone = params.clone();
    let method_clone = method.clone();
    // 解码URL
    let url_cow = match urlencoding::decode(encoded_url) {
        Ok(decoded) => decoded,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Invalid URL encoding".to_string(),
                warp::http::StatusCode::BAD_REQUEST,
            );
            return Ok(reply.into_response());
        }
    };
    let uri: warp::http::Uri = match url_cow.parse() {
        Ok(u) => u,
        Err(_) => {
            let reply = warp::reply::with_status(
                "Invalid target URL".to_string(),
                warp::http::StatusCode::BAD_REQUEST,
            );
            return Ok(reply.into_response());
        }
    };

    let mut url = if let Some(params) = params {
        format!("{}?{}", uri.to_string(), params)
    } else {
        uri.to_string()
    };
    if url.starts_with(r"//") {
        url = format!("http:{}", url);
    }
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
    dbg!(
        "handle_proxy_request send request:",
        url.clone(),
        header_map.clone(),
        body.clone(),
    );

    // 创建HTTP客户端
    let client = get_proxy_http_client(Some(url.clone()), Some(header_map.clone()), None);

    // 构建请求
    let reqwest_request = match client
        .request(convert_to_reqwest_method(method), url.clone())
        // .headers(header_map)
        .body(body.clone())
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
    let response_headers = response.headers().clone();
    let response_status = warp::http::StatusCode::from_u16(response.status().as_u16())
        .unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR);
    let response_bytes = match response.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            let reply = warp::reply::with_status(
                format!("Failed to read response: {}", e),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            );
            return Ok(reply.into_response());
        }
    };
    if response_status.is_redirection() {
        if let Some(location) = response_headers.get(reqwest::header::LOCATION) {
            if let Ok(redirect_url) = location.to_str() {
                return Box::pin(handle_proxy_request(
                    &headers_part,
                    &redirect_url,
                    params_clone,
                    method_clone,
                    headers.clone(),
                    body.clone(),
                ))
                .await;
            }
        }
    }
    dbg!(
        "handle_proxy_request response:",
        response_status,
        response_headers.clone(),
        response_bytes.len()
    );

    // 构造原始响应返回
    let mut reply = warp::http::Response::new(warp::hyper::Body::from(response_bytes));
    *reply.status_mut() = response_status;
    *reply.headers_mut() = convert_to_wrap_headers(response_headers.clone());
    Ok(reply)
}

fn get_m3u8_http_client(
    url: Option<String>,
    headers: Option<reqwest::header::HeaderMap>,
    redirect: Option<reqwest::redirect::Policy>,
) -> reqwest::Client {
    let mut headers = headers.unwrap_or_else(|| reqwest::header::HeaderMap::new());
    if !headers.contains_key(reqwest::header::USER_AGENT) {
        let ua = if let Some(url_str) = url {
            "(Windows NT 10.0; WOW64) PotPlayer/25.06.25"
        } else {
            "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko"
        };
        headers.insert(
            reqwest::header::USER_AGENT,
            reqwest::header::HeaderValue::from_static(ua),
        );
    }
    if !headers.contains_key(reqwest::header::ACCEPT) {
        headers.insert(
            reqwest::header::ACCEPT,
            reqwest::header::HeaderValue::from_static("*/*"),
        );
    }

    return reqwest::Client::builder()
        .default_headers(headers)
        .redirect(redirect.unwrap_or(reqwest::redirect::Policy::none()))
        .connect_timeout(Duration::from_secs(15))
        .http1_title_case_headers()
        .build()
        .unwrap();
}

fn get_proxy_http_client(
    url: Option<String>,
    headers: Option<reqwest::header::HeaderMap>,
    redirect: Option<reqwest::redirect::Policy>,
) -> reqwest::Client {
    let mut headers = headers.unwrap_or_else(|| reqwest::header::HeaderMap::new());
    if !headers.contains_key(reqwest::header::USER_AGENT) {
        headers.insert(
            reqwest::header::USER_AGENT,
            reqwest::header::HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"),
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
    return reqwest::Client::builder()
        .default_headers(headers)
        .redirect(redirect.unwrap_or(reqwest::redirect::Policy::none()))
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

    let encoded_url = encode(original_url.as_str());
    dbg!("get_m3u8_url", &original_url, &encoded_url);

    let mut headers_part = if !headers.is_empty() {
        let mut headers_str = String::new();
        for (name, value) in headers.iter() {
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
        "{}:{}/m3u8/{}/{}",
        HOST, port, headers_part, encoded_url
    ))

    // Return proxy URL with the original URL as path
    // Ok(format!(
    //     "{}:{}/m3u8/{}",
    //     HOST,
    //     port,
    //     encode(original_url.as_str())
    // ))
}

#[tauri::command]
pub(crate) fn get_proxy_url(
    original_url: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    let encoded_url = encode(original_url.as_str());
    dbg!("get_proxy_url", &original_url, &encoded_url);

    let mut headers_part = if !headers.is_empty() {
        let mut headers_str = String::new();
        for (name, value) in headers.iter() {
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
    let port = find_available_port(1430).ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::AddrInUse, "No available port found")
    })?;

    ACTUAL_PORT.store(port, Ordering::SeqCst);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);
    let m3u8_proxy_router = warp::path!("m3u8" / String / String)
        .and(warp::header::headers_cloned())
        .and_then(
            |headers_part: String, url: String, headers: warp::http::HeaderMap| async move {
                let decoded = decode(url.as_str()).expect("UTF-8");
                get_m3u8_content_async(headers_part.to_string(), decoded.to_string(), headers).await
            },
        );
    // proxy ts
    let ts_proxy_router = warp::path!("ts" / String).and_then(move |url: String| {
        let decoded = decode(url.as_str()).expect("UTF-8");
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
