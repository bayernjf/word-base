// =============================================
// Tauri src-tauri/src/lib.rs 补丁（CI 构建时复制到 src-tauri/src/lib.rs）
// =============================================
// tauri init 会生成一份基础 lib.rs。你需要把它替换为下面这段--
// 挂载所有 plugin，并注册 get_recent_logs command（意见反馈诊断日志）。
//
// #[cfg_attr(mobile, tauri::mobile_entry_point)] 保留原样。

use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

// =============================================
// 意见反馈系统：主进程诊断日志
// 设计参考 soft-desk：返回脱敏后的应用日志，供前端反馈系统附带
// 当前实现：返回系统基本诊断信息（平台/版本/时间）；未来可扩展读取日志文件
// 返回结构与前端 PlatformLogData 一致
// =============================================

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlatformLogData {
    content: String,
    line_count: i32,
    started_at: Option<String>,
    ended_at: Option<String>,
    truncated: bool,
}

#[tauri::command]
fn get_recent_logs(minutes: i32) -> Result<PlatformLogData, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let cutoff = now.saturating_sub((minutes as u64).saturating_mul(60));

    let started_at = format_iso(cutoff);
    let ended_at = format_iso(now);

    // 收集系统诊断信息（脱敏：不含用户数据/密码/文件路径）
    let mut lines: Vec<String> = Vec::new();
    lines.push(format!("[{}] [INFO] [tauri] diagnostic snapshot", started_at));
    lines.push(format!("[{}] [INFO] [tauri] requested minutes: {}", started_at, minutes));

    // 平台信息
    let os_name = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    lines.push(format!("[{}] [INFO] [tauri] os: {}", started_at, os_name));
    lines.push(format!("[{}] [INFO] [tauri] arch: {}", started_at, arch));

    // 进程 PID（基础诊断，不涉及敏感信息）
    let pid = std::process::id();
    lines.push(format!("[{}] [INFO] [tauri] pid: {}", started_at, pid));

    let content = lines.join("\n");
    let line_count = lines.len() as i32;

    Ok(PlatformLogData {
        content,
        line_count,
        started_at: Some(started_at),
        ended_at: Some(ended_at),
        truncated: false,
    })
}

fn format_iso(secs: u64) -> String {
    // 简单的 UNIX 时间戳转 ISO8601（避免引入 chrono 依赖）
    // 格式：YYYY-MM-DDTHH:MM:SSZ
    let days = secs / 86400;
    let remainder = secs % 86400;
    let hour = remainder / 3600;
    let minute = (remainder % 3600) / 60;
    let second = remainder % 60;

    // 从 1970-01-01 计算年月日（算法来自 chrono 简化版）
    let (year, month, day) = days_to_ymd(days as i64);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hour, minute, second
    )
}

fn days_to_ymd(days: i64) -> (i64, u32, u32) {
    // 简化算法：基于 Howard Hinnant 的 days_from_civil 逆运算
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; // [0, 399]
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let m = if mp < 10 { mp + 3 } else { mp - 9 }; // [1, 12]
    let year = if m <= 2 { y + 1 } else { y };
    (year, m as u32, d as u32)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(window) = _app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_recent_logs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
