const COMMANDS: &[&str] = &[
    "exit_app",
    "return_to_home",
    "set_status_bar",
    "hide_status_bar",
    "get_system_font_scale",
    "get_screen_orientation",
    "set_screen_orientation",
    "get_brightness",
    "get_system_brightness",
    "set_brightness",
    "get_volume",
    "set_volume",
    "get_device_id",
    "save_file",
    "vibrate",
    "vibrate_pattern",
    "vibrate_predefined",
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
