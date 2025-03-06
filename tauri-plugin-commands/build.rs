const COMMANDS: &[&str] = &["exit_app", "set_status_bar", "get_system_font_scale"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
