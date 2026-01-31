use crate::api::rclone;
use crate::utils::extract_json;
use tokio::process::Command;

const DEFAULT_RCLONE_CONFIG_NAME: &str = "gdrive_unofficial_neuro_kar";

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
pub async fn create_gdrive_remote() -> Result<String, String> {
    // Authorize with CLI (interactive)
    let rclone_path = rclone::is_rclone_installed()
        .await
        .ok_or("Rclone not found")?;

    let mut cmd = Command::new(rclone_path);
    cmd.args(&["authorize", "drive"]);
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run authorize: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Authorization failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let auth_output = String::from_utf8_lossy(&output.stdout);
    let token = extract_json(&auth_output).ok_or("Failed to extract token from auth output")?;

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
