// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod api;

#[tauri::command]
async fn download_rclone() -> Result<String, String> {
    api::rclone::download_rclone()
        .await
        .map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn check_rclone() -> bool {
    api::rclone::is_rclone_installed().await.is_some()
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            download_rclone,
            check_rclone,
            api::gdrive::get_gdrive_remotes,
            api::gdrive::download_gdrive,
            api::rclone::get_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
