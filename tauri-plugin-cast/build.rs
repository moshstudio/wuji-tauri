const COMMANDS: &[&str] = &[
    "discover_devices",
    "cast_media",
    "cast_control",
    "get_cast_state",
    "stop_cast",
    "get_lan_ip",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}
