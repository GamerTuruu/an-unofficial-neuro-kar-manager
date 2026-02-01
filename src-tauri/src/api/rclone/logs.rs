use regex::Regex;
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, AsyncSeekExt};

pub struct LogManager;

impl LogManager {
    /// Get the path to the rclone log file.
    pub fn get_log_path(app: &AppHandle) -> Result<PathBuf, String> {
        Ok(app
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?
            .join("rclone.log"))
    }

    /// Clear the log file (e.g., on server startup).
    pub async fn clear(app: &AppHandle) -> Result<(), String> {
        let path = Self::get_log_path(app)?;
        if path.exists() {
            let _ = tokio::fs::remove_file(&path).await;
        }
        Ok(())
    }

    /// Get the current size of the log file to use as an offset.
    pub async fn get_current_offset(app: &AppHandle) -> u64 {
        match Self::get_log_path(app) {
            Ok(path) if path.exists() => tokio::fs::metadata(&path)
                .await
                .map(|m| m.len())
                .unwrap_or(0),
            _ => 0,
        }
    }

    /// Parse the log file from a given offset for deleted files.
    pub async fn parse_deleted_files(
        app: &AppHandle,
        start_offset: u64,
    ) -> Result<Vec<String>, String> {
        let log_path = Self::get_log_path(app)?;
        if !log_path.exists() {
            return Ok(vec![]);
        }

        let mut file = tokio::fs::File::open(log_path)
            .await
            .map_err(|e| format!("Failed to open log file: {}", e))?;

        if start_offset > 0 {
            file.seek(std::io::SeekFrom::Start(start_offset))
                .await
                .map_err(|e| format!("Failed to seek log file: {}", e))?;
        }

        let reader = tokio::io::BufReader::new(file);
        let mut lines = reader.lines();
        let mut deleted_files = Vec::new();

        while let Some(line) = lines
            .next_line()
            .await
            .map_err(|e| format!("Failed to read log line: {}", e))?
        {
            if line.contains("Skipped delete as --dry-run is set") {
                if let Some(file_path) = Self::extract_deleted_file_path(&line) {
                    deleted_files.push(file_path);
                }
            }
        }

        Ok(deleted_files)
    }

    fn extract_deleted_file_path(line: &str) -> Option<String> {
        static RE: OnceLock<Regex> = OnceLock::new();
        let re = RE.get_or_init(|| {
            // Pattern: date time LEVEL: filename: message
            // Capture the filename part between LEVEL: and the next colon
            Regex::new(r"^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} (?:NOTICE|INFO|ERROR):\s+([^:]+):")
                .unwrap()
        });

        re.captures(line)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().trim().to_string())
    }
}
