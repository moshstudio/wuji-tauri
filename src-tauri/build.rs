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
                ]),
            )
            .plugin(
                "proxy-plugin",
                tauri_build::InlinedPlugin::new().commands(&["get_m3u8_url", "get_proxy_url"]),
            ),
    )
    .expect("failed to run tauri-build");
}
