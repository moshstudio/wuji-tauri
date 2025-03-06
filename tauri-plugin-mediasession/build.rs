const COMMANDS: &[&str] = &[
    "set_playlist",
    "update_playlist_order",
    "play_target_music",
    "update_music_item",
    "play",
    "pause",
    "stop",
    "set_volume",
    "seek_to",
    "register_listener",
    "remove_listener",
    "check_permissions",
    "request_permissions",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
