const COMMANDS: &[&str] = &[
    "set_metadata",
    "set_playback_state",
    "set_position_state",
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
