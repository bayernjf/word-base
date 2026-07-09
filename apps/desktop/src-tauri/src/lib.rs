// =============================================
// Tauri src-tauri/src/lib.rs 补丁
// =============================================
// tauri init 会生成一份基础 lib.rs。你需要把它替换为下面这段——
// 唯一改动是在 tauri::Builder::default() 上链式挂三个 plugin。
//
// #[cfg_attr(mobile, tauri::mobile_entry_point)] 保留原样。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            // Tray icon click handler: toggle window visibility
            use tauri::tray::TrayIconEvent;
            if let Some(tray) = app.tray_by_id("main") {
                let app_handle = app.handle().clone();
                tray.on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
