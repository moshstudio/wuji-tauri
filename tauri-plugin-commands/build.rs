const COMMANDS: &[&str] = &["exit_app", "set_status_bar"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
