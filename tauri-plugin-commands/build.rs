const COMMANDS: &[&str] = &[
    "exit_app",
    "set_status_bar",
    "hide_status_bar",
    "get_system_font_scale",
    "set_screen_orientation",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
