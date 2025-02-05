// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::AppHandle;
use tauri::Manager;
mod fetch_plugin;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .setup(move |app| {
            let handle = app.handle();
            handle.plugin(fetch_plugin::init())?;
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init());

    // 仅在桌面端添加
    #[cfg(desktop)]
    {
        println!("Only Desktop");
        fn show_window(app: &AppHandle) {
            let windows = app.webview_windows();
            windows
                .values()
                .next()
                .expect("Sorry, no window found")
                .set_focus()
                .expect("Can't Bring Window to Focus");
        }
        fn constraint_window_size(app: &AppHandle) {
            // 未生效？
            let windows = app.webview_windows();
            windows
                .values()
                .next()
                .expect("Sorry, no window found")
                .set_min_size(Some(tauri::PhysicalSize::new(600, 300)))
                .expect("Can't Set Min Size");
        }
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = show_window(app);
            let _ = constraint_window_size(app);
        }));
    }

    builder
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
