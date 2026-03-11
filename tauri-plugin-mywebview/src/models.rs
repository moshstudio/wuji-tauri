use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingRequest {
    pub value: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResponse {
    pub value: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchRequest {
    pub url: String,
    pub use_saved_cookie: bool,
    pub timeout: Option<u64>,
    pub wait_for_resources: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchResponse {
    pub content: String,
    pub cookie: String,
    pub title: String,
    pub url: String,
    /// 嗅探到的媒体/网络请求资源列表
    pub resources: Vec<SniffedResource>,
}

/// 嗅探到的单条资源信息
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SniffedResource {
    /// 资源 URL
    pub url: String,
    /// 资源类型: "video" | "audio" | "image" | "xhr" | "fetch" | "other"
    #[serde(rename = "type")]
    pub r#type: String,
    /// 资源类型（冗余字段，兼容 camelCase）
    pub resource_type: String,
    /// 请求方法（仅 XHR/Fetch 有意义）
    pub method: Option<String>,
    /// Content-Type 响应头（若能获取）
    pub content_type: Option<String>,
    /// 资源大小（字节，若能获取）
    pub size: Option<u64>,
    /// 请求发送的数据（针对 xhr/fetch）
    pub request_data: Option<String>,
    /// 响应内容（针对 xhr/fetch 且包含文本或可序列化类型，截断处理）
    pub response_body: Option<String>,
}
