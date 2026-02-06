use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::Command;

pub mod logs;
pub mod server;
pub mod stats;

pub fn get_rclone_command(app: &AppHandle) -> Result<Command, String> {
    #[cfg(target_os = "android")]
    {
        use std::fs;
        use tauri::Manager;
        let app_dir = "/data/data/com.inforno.unofficial_neuro_kar_manager/files";
        let path_file = format!("{}/native_lib_path.txt", app_dir);

        let lib_dir = fs::read_to_string(&path_file)
            .map_err(|e| format!("Failed to read native lib path from {}: {}", path_file, e))?;

        let app_data_dir = app
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        let config_path = app_data_dir.join("rclone.conf");

        Ok(app
            .shell()
            .command(format!(
                "{}/librclone-aarch64-linux-android.so",
                lib_dir.trim()
            ))
            .env("RCLONE_CONFIG", config_path))
    }
    #[cfg(not(target_os = "android"))]
    {
        app.shell().sidecar("rclone").map_err(|e| e.to_string())
    }
}

// Command functions
pub use server::__cmd__stop_rc_server;
pub use stats::__cmd__get_stats;

// Functions
pub use logs::LogManager;
pub use server::{get_sdk_client, is_server_running, stop_rc_server};
pub use stats::get_stats;
