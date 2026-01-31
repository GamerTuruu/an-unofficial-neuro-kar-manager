use super::server::get_sdk_client;

#[tauri::command]
pub async fn get_stats() -> Result<rclone_sdk::types::CoreStatsResponse, String> {
    let client = get_sdk_client().await?;
    let response = client
        .core_stats(None, None, None, None)
        .await
        .map_err(|e| format!("Failed to fetch stats: {}", e))?;

    Ok(response.into_inner())
}
