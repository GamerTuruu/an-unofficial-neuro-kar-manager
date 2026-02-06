use super::LogManager;
use rclone_sdk::Client;
use std::sync::LazyLock;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;

pub const RC_PORT: u16 = 5572;
pub const RC_URL: &str = "http://localhost:5572";

static SHUTDOWN_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

/// Helper to check if the RC server is listening
pub async fn is_server_running() -> bool {
    let client = Client::new(RC_URL);
    // core/pid is a lightweight check
    client.core_pid(None, None).await.is_ok()
}

/// Starts the rclone RC server in the background
pub async fn start_rc_server(app: &AppHandle) -> Result<(), String> {
    // Clear log file on startup
    LogManager::clear(app).await?;
    let log_file = LogManager::get_log_path(app)?;

    let sidecar_command = super::get_rclone_command(app)?;

    let (mut _rx, child) = sidecar_command
        .args(&[
            "rcd",
            "--rc-no-auth",
            &format!("--rc-addr=localhost:{}", RC_PORT),
            "--log-file",
            &log_file.to_string_lossy().to_string(),
            "--log-level",
            "INFO",
        ])
        .spawn()
        .map_err(|e| format!("Failed to spawn rclone rcd: {}", e))?;

    let manager = app.state::<crate::SidecarManager>();
    manager.add(child);

    Ok(())
}

/// Waits for the RC server to become available
pub async fn wait_for_server() -> Result<(), String> {
    for _ in 0..20 {
        // 10 seconds total
        if is_server_running().await {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    Err("Timed out waiting for rclone rc server".to_string())
}

/// Waits for the RC server to stop
pub async fn wait_for_server_shutdown() -> Result<(), String> {
    for _ in 0..20 {
        // 10 seconds total
        if !is_server_running().await {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    Err("Timed out waiting for rclone rc server to stop".to_string())
}

/// Returns an authenticated SDK Client, ensuring the server is running.
pub async fn get_sdk_client(app: &AppHandle) -> Result<Client, String> {
    if !is_server_running().await {
        start_rc_server(app).await?;
        wait_for_server().await?;
    }
    Ok(Client::new(RC_URL))
}

#[tauri::command]
pub async fn stop_rc_server() -> Result<(), String> {
    // Lock to prevent concurrent shutdowns
    let _guard = SHUTDOWN_LOCK.lock().await;

    if is_server_running().await {
        let client = Client::new(RC_URL);
        client
            .core_quit(None, None, None)
            .await
            .map_err(|e| format!("Failed to stop rclone: {}", e))?;

        wait_for_server_shutdown().await?;
    }
    Ok(())
}
