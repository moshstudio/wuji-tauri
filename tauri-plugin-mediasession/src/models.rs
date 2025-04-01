use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BooleanResponse {
    pub value: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PlayMusicItem {
    id: String,
    title: String,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<i32>,
    uri: String,
    forbidSeek: Option<bool>,
    iconUri: Option<String>,
    extra: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct SetPlaylistRequest {
    name: String,
    musics: Vec<PlayMusicItem>,
    position: Option<usize>,
    extra: Option<String>,
    playImmediately: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct UpdatePlaylistOrderRequest {
    name: String,
    musics: Vec<PlayMusicItem>,
    position: Option<usize>,
    extra: Option<HashMap<String, String>>,
    playImmediately: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct UpdateMusicItemRequest {
    oldItem: PlayMusicItem,
    newItem: PlayMusicItem,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PlayRequest {}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PauseRequest {}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct StopRequest {}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct SetVolumeRequest {
    volume: f64,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct SeekToRequest {
    milliseconds: i32,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PlayModeRequest {
    mode: i32,
}
