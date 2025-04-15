use m3u8_rs::AlternativeMediaType::Audio;
use m3u8_rs::Playlist;
use reqwest::header::HeaderMap;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::TcpListener;
use std::string::ToString;
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::Duration;
use urlencoding::{decode, encode};
use warp::http::{HeaderName, HeaderValue, Response, Uri};
use warp::Filter;

const HOST: &str = "http://127.0.0.1";
// Store actual port and request data
static ACTUAL_PORT: AtomicU16 = AtomicU16::new(0);

/// proxy m3u8
// async fn get_m3u8_content_async(url: String) -> Result<impl warp::Reply, Infallible> {
//     // let url = "https://live.v1.mk/api/bestv.php?id=cctv1hd8m/8000000";
//     // let url = "http://39.135.138.58:18890/PLTV/88888888/224/3221225918/index.m3u8";
//     // let url = "https://live.v1.mk/api/sxg.php?id=CCTV-6H265_4000";
//     let client = get_default_http_client();
//     let result = client.get(&url).send().await;
//     if result.is_err() {
//         return Ok(Response::builder()
//             .status(500)
//             .body("".to_string())
//             .unwrap());
//     }
//     if result.status().is_redirection() {

//     }
//     let content = result.unwrap().text().await;
//     let m3u8;
//     if content.is_err() {
//         m3u8 = "".to_string();
//     } else {
//         // m3u8 = content.unwrap();
//         m3u8 = process_m3u8(&url, content.unwrap());
//     }

//     // dbg!(&m3u8);
//     let res = Response::builder()
//         .status(200)
//         // Are you sure about this one? More like "text/plain"?
//         .header("Content-Type", "application/vnd.apple.mpegurl")
//         .body(m3u8)
//         .unwrap();
//     return Ok(res);
// }

async fn get_m3u8_content_async(url: String) -> Result<impl warp::Reply, Infallible> {
    let client = get_default_http_client();

    // First try with redirects disabled to check for 302
    let result = client.get(&url).send().await;
    if result.is_err() {
        return Ok(Response::builder()
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

    let res = Response::builder()
        .status(200)
        .header("Content-Type", "application/vnd.apple.mpegurl")
        .body(m3u8)
        .unwrap();
    Ok(res)
}

/// process m3u8
fn process_m3u8(m3u8_path: &String, content: String) -> String {
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
            return String::from_utf8(v).unwrap();
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
            return String::from_utf8(v).unwrap();
        }
    }

    return content;
}

/// proxy ts
async fn get_ts_content_async(ts: String) -> Result<impl warp::Reply, Infallible> {
    // let url = "https://live.v1.mk/api/bestv.php?id=cctv1hd8m/8000000";
    // let url = "http://39.135.138.58:18890/PLTV/88888888/224/3221225918/index.m3u8";
    // let url = "http://test.8ne5i.10.vs.rxip.sc96655.com/live/8ne5i_sccn,CCTV-6H265_hls_pull_4000K/280/085/429.ts";
    let client = get_default_http_client();
    let result = client.get(&ts).send().await;
    dbg!(&result);
    if result.is_err() {
        return Ok(Response::builder()
            .status(500)
            .header("Content-Type", "video/mp2t")
            .body(vec![])
            .unwrap());
    }
    let response = result.unwrap();
    let headers_map = response.headers().clone();

    let mut builder = Response::builder();
    let headers = builder.headers_mut().unwrap();
    for (k, v) in headers_map.into_iter() {
        let h = k.unwrap();
        if h != "content-length" {
            headers.insert(
                HeaderName::from_bytes(h.as_str().as_bytes()).unwrap(),
                HeaderValue::from_str(v.to_str().unwrap()).unwrap(),
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

fn get_default_http_client() -> reqwest::Client {
    let mut headers = HeaderMap::new();
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

fn find_available_port(start_port: u16) -> Option<u16> {
    (start_port..=start_port + 100).find(|port| TcpListener::bind(("127.0.0.1", *port)).is_ok())
}

pub(crate) fn start_proxy_server() -> std::io::Result<()> {
    let port = find_available_port(9998).ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::AddrInUse, "No available port found")
    })?;

    ACTUAL_PORT.store(port, Ordering::SeqCst);

    let cors = warp::cors().allow_any_origin();
    let m3u8_proxy_router = warp::path!("m3u8" / String)
        .and_then(move |url: String| {
            let decoded = decode(url.as_str()).expect("UTF-8");
            // dbg!(&decoded);
            get_m3u8_content_async(decoded.to_string())
        })
        .with(&cors);
    // proxy ts
    let ts_proxy_router = warp::path!("ts" / String)
        .and_then(move |url: String| {
            let decoded = decode(url.as_str()).expect("UTF-8");
            // dbg!(&decoded);
            get_ts_content_async(decoded.to_string())
        })
        .with(&cors);

    // let route = warp::any().map(|| warp::redirect(Uri::from_static("https://120.77.38.213:9443/flv/2008180000000304/ZjE4ejhGVUU0QzJ0Y3M4QixhNDMzNmQyOWQwMTBlOTk2.ts?edge=on")));

    let routers = m3u8_proxy_router.or(ts_proxy_router);

    tauri::async_runtime::spawn(warp::serve(routers).run(([127, 0, 0, 1], port)));

    Ok(())
}
