use crate::api::rclone;
use crate::utils::{extract_json, run_cancellable_command};
use tauri::{AppHandle, Emitter, State};
use tokio::process::Command;
use tokio::sync::{Mutex, oneshot};

const DEFAULT_RCLONE_CONFIG_NAME: &str = "gdrive_unofficial_neuro_kar";

pub struct GdriveAuthState {
    pub auth_cancel_tx: Mutex<Option<oneshot::Sender<()>>>,
}

impl Default for GdriveAuthState {
    fn default() -> Self {
        Self {
            auth_cancel_tx: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn get_gdrive_remotes() -> Result<Vec<String>, String> {
    let client = rclone::get_sdk_client().await?;

    // config/dump
    let response = client
        .config_dump(None, None)
        .await
        .map_err(|e| format!("Failed to fetch remotes: {}", e))?;

    let val = serde_json::to_value(response.into_inner()).map_err(|e| e.to_string())?;

    let mut remotes = Vec::new();
    if let Some(obj) = val.as_object() {
        for (key, val) in obj {
            if let Some(type_str) = val.get("type").and_then(|v| v.as_str()) {
                if type_str == "drive" {
                    remotes.push(key.clone());
                }
            }
        }
    }
    // Sort for consistency
    remotes.sort();
    Ok(remotes)
}

#[tauri::command]
pub async fn create_gdrive_remote(
    app: AppHandle,
    state: State<'_, GdriveAuthState>,
) -> Result<String, String> {
    // Authorize with CLI (interactive)
    let rclone_path = rclone::is_rclone_installed()
        .await
        .ok_or("Rclone not found")?;

    let mut cmd = Command::new(rclone_path);
    cmd.args(&["authorize", "drive", "--auth-no-open-browser"]);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    // Create cancel channel
    let (tx, rx) = oneshot::channel();
    {
        let mut lock = state.auth_cancel_tx.lock().await;
        *lock = Some(tx);
    }

    let app_handle = app.clone();
    let on_stderr = move |line: String| {
        if let Some(idx) = line.find("Please go to the following link: ") {
            let url = line[idx + "Please go to the following link: ".len()..].trim();
            let _ = app_handle.emit("gdrive-auth-url", url);
        }
    };

    let result = run_cancellable_command(cmd, rx, Some(on_stderr)).await;

    // Clear the cancellation token
    {
        let mut lock = state.auth_cancel_tx.lock().await;
        *lock = None;
    }

    match result {
        Ok(auth_output) => {
            let token =
                extract_json(&auth_output).ok_or("Failed to extract token from auth output")?;

            let params = serde_json::json!({
                "token": token
            });

            let client = rclone::get_sdk_client().await?;
            client
                .config_create(
                    Some(true),
                    None,
                    DEFAULT_RCLONE_CONFIG_NAME,
                    None,
                    &params.to_string(),
                    "drive",
                )
                .await
                .map_err(|e| format!("Failed to create config context: {}", e))?;

            Ok(DEFAULT_RCLONE_CONFIG_NAME.to_string())
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn cancel_gdrive_auth(state: State<'_, GdriveAuthState>) -> Result<(), String> {
    let mut lock = state.auth_cancel_tx.lock().await;
    if let Some(tx) = lock.take() {
        let _ = tx.send(());
    }
    Ok(())
}
