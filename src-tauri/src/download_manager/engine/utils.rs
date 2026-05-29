use crate::download_manager::task::TaskStatus;
use crate::download_manager::DownloadManager;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, ORIGIN, REFERER, USER_AGENT};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::{Duration, SystemTime};
use url::Url;

/// 任务仍存在且处于下载中（已删除/暂停则返回 false，供 M3U8 分片协程及时退出）
pub async fn is_task_downloading(manager: &DownloadManager, task_id: &str) -> bool {
    let inner = manager.lock().await;
    inner
        .tasks
        .get(task_id)
        .map(|t| matches!(t.status, TaskStatus::Downloading))
        .unwrap_or(false)
}

pub fn map_to_header_map(headers: &HashMap<String, String>, url_hint: Option<&str>) -> HeaderMap {
    let mut map = HeaderMap::new();
    for (k, v) in headers {
        if let Ok(name) = HeaderName::from_str(k) {
            if let Ok(val) = HeaderValue::from_str(v) {
                map.insert(name, val);
            }
        }
    }

    // 默认 User-Agent
    if !map.contains_key(USER_AGENT) {
        map.insert(
            USER_AGENT,
            HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        );
    }

    // 自动补全 Referer 和 Origin (许多视频源由于防盗链需要这个)
    if let Some(url) = url_hint {
        if let Ok(parsed_url) = Url::parse(url) {
            let origin_str = format!(
                "{}://{}/",
                parsed_url.scheme(),
                parsed_url.host_str().unwrap_or("")
            );
            if let Ok(origin_val) = HeaderValue::from_str(&origin_str) {
                if !map.contains_key(REFERER) {
                    map.insert(REFERER, origin_val.clone());
                }
                if !map.contains_key(ORIGIN) {
                    // Origin 通常不包含最后的斜杠
                    let origin_no_slash = origin_str.trim_end_matches('/');
                    if let Ok(ov) = HeaderValue::from_str(origin_no_slash) {
                        map.insert(ORIGIN, ov);
                    }
                }
            }
        }
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

pub fn set_collection_item_mtime(path: &std::path::Path, index: u32) {
    if let Ok(file) = std::fs::File::options().write(true).open(path) {
        // 以 2025-01-01 为基准，每个索引增加 1 秒以确保“修改日期”排序正确
        let base_time = SystemTime::UNIX_EPOCH + Duration::from_secs(1735689600);
        let target_time = base_time + Duration::from_secs(index as u64);
        let _ = file.set_times(
            std::fs::FileTimes::new()
                .set_modified(target_time)
                .set_accessed(target_time),
        );
    }
}
