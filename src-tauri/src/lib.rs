#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .level(log::LevelFilter::Debug)
            .build())
        .setup(|app| {
            // Temporarily open devtools in release too — remove after debugging
            {
                use tauri::Manager;
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            #[cfg(target_os = "linux")]
            {
                use tauri::Manager;
                let window = app.get_webview_window("main").unwrap();
                window.with_webview(|webview| {
                    use webkit2gtk::WebViewExt;
                    use webkit2gtk::PermissionRequestExt;
                    webview.inner().connect_permission_request(|_, request| {
                        request.allow();
                        true
                    });
                })?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}