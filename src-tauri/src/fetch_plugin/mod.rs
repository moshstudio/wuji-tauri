// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

//! Access the HTTP client written in Rust.

pub use reqwest;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use error::{Error, Result};

mod commands;
mod error;
mod scope;

pub(crate) struct Http {
    cookies_jar: std::sync::Arc<reqwest::cookie::Jar>,
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    //  定义在同一文件夹中的叫做 inlined plugin，同导入的plugin用法不一样
    //   1. lib.rs中
    //   .setup(move |app| {
    //         let handle = app.handle();
    //         handle.plugin(fetch_plugin::init())?;
    //         Ok(())
    //     })
    //   2. build.rs中
    //   tauri_build::try_build(tauri_build::Attributes::new().plugin(
    //     "fetch-plugin",
    //     tauri_build::InlinedPlugin::new().commands(&[
    //         "fetch",
    //         "fetch_cancel",
    //         "fetch_send",
    //         "fetch_read_body",
    //     ]),
    // ))
    // 3. 定义permissions并在capabilities中添加权限

    Builder::<R>::new("fetch-plugin")
        .setup(|app, _| {
            let state = Http {
                cookies_jar: std::sync::Arc::new(reqwest::cookie::Jar::default()),
            };
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::fetch,
            commands::fetch_cancel,
            commands::fetch_send,
            commands::fetch_read_body,
        ])
        .build()
}
