use std::collections::HashMap;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, USER_AGENT};
use std::str::FromStr;

pub fn map_to_header_map(headers: &HashMap<String, String>) -> HeaderMap {
    let mut map = HeaderMap::new();
    for (k, v) in headers {
        if let Ok(name) = HeaderName::from_str(k) {
            if let Ok(val) = HeaderValue::from_str(v) {
                map.insert(name, val);
            }
        }
    }
    
    if !map.contains_key(USER_AGENT) {
        map.insert(
            USER_AGENT,
            HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        );
    }
    
    map
}

pub fn normalize_url(url: &str) -> String {
    if url.starts_with("//") {
        format!("https:{}", url)
    } else {
        url.to_string()
    }
}
