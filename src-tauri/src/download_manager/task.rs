use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;
use strum_macros::{Display, EnumString};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum TaskStatus {
    Pending,     // 等待中
    Downloading, // 下载中
    Paused,      // 已暂停
    Error(String), // 错误
    Completed,   // 已完成
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Display, EnumString)]
#[serde(rename_all = "PascalCase")]
pub enum Category {
    Image,
    Music,
    Book,
    Comic,
    Video,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadTask {
    pub id: String,
    pub source_id: String,
    pub title: String,
    pub url: String,
    pub save_path: PathBuf,
    pub category: Category,
    pub status: TaskStatus,
    pub total_size: u64,
    pub downloaded_size: u64,
    pub total_chunks: u32,
    pub completed_chunks: HashSet<u32>,
    pub created_at: u128,
    pub headers: std::collections::HashMap<String, String>,
}

impl DownloadTask {
    pub fn new(
        id: String,
        source_id: String,
        title: String,
        url: String,
        save_path: PathBuf,
        category: Category,
        headers: std::collections::HashMap<String, String>,
    ) -> Self {
        Self {
            id,
            source_id,
            title,
            url,
            save_path,
            category,
            status: TaskStatus::Pending,
            total_size: 0,
            downloaded_size: 0,
            total_chunks: 0,
            completed_chunks: HashSet::new(),
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis(),
            headers,
        }
    }
}
