fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .plugin(
                "fetch-plugin",
                tauri_build::InlinedPlugin::new().commands(&[
                    "fetch",
                    "fetch_cancel",
                    "fetch_send",
                    "fetch_read_body",
                    "fetch_and_save",
                ]),
            )
            .plugin(
                "proxy-plugin",
                tauri_build::InlinedPlugin::new().commands(&["get_m3u8_url", "get_proxy_url"]),
            )
            .plugin(
                "websocket-plugin",
                tauri_build::InlinedPlugin::new().commands(&["connect", "send"]),
            ),
    )
    .expect("failed to run tauri-build");
}
