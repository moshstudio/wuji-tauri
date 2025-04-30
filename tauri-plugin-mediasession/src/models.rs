use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BooleanResponse {
    pub value: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PlayMusicItemRequest {
    title: String,
    artist: Option<String>,
    album: Option<String>,
    cover: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PlaybackStateRequest {
    state: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PositionStateRequest {
    duration: Option<f32>,
    position: Option<f32>,
    playback_rate: Option<f32>,
}

