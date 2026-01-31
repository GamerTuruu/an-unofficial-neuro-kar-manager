use std::env;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::oneshot;

/// Run a command with cancellation support and stderr streaming
pub async fn run_cancellable_command<F>(
    mut cmd: Command,
    cancel_rx: oneshot::Receiver<()>,
    on_stderr_line: Option<F>,
) -> Result<String, String>
where
    F: Fn(String) + Send + 'static,
{
    #[cfg(target_os = "linux")]
    unsafe {
        cmd.pre_exec(|| {
            // When the parent dies, send SIGTERM to the child
            let r = libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM);
            if r != 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
    let mut stdout = child.stdout.take().ok_or("Failed to capture stdout")?;

    // Read stderr line-by-line
    let stderr_handle = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        let mut full_stderr = String::new();
        while let Ok(Some(line)) = reader.next_line().await {
            if let Some(ref cb) = on_stderr_line {
                cb(line.clone());
            }
            full_stderr.push_str(&line);
            full_stderr.push('\n');
        }
        full_stderr
    });

    // Read all stdout manually
    let stdout_handle = tokio::spawn(async move {
        let mut buf = Vec::new();
        stdout
            .read_to_end(&mut buf)
            .await
            .map(|_| buf)
            .map_err(|e| format!("Failed to read stdout: {}", e))
    });

    // Wait for process to finish OR cancel signal
    let status_result = tokio::select! {
        res = child.wait() => {
             // Process finished naturally
             res.map_err(|e| format!("Failed to run command: {}", e))
        }
        _ = cancel_rx => {
            // Cancel signal received - kill the process
            let _ = child.kill().await;
            let _ = child.wait().await; // Clean up zombie process
            Err("Command cancelled by user".to_string())
        }
    };

    let status = status_result?;

    // Collect results from the background reading tasks
    let stdout_bytes = stdout_handle
        .await
        .map_err(|e| format!("Join error: {}", e))??;

    let stderr_output = stderr_handle.await.map_err(|e| e.to_string())?;

    if !status.success() {
        return Err(format!(
            "Command failed: {}\nStderr: {}",
            String::from_utf8_lossy(&stdout_bytes),
            stderr_output
        ));
    }

    Ok(String::from_utf8_lossy(&stdout_bytes).to_string())
}

/// Extract JSON content from text, finding the first '{' and last '}'
pub fn extract_json(text: &str) -> Option<String> {
    let start = text.find('{')?;
    let end = text.rfind('}')?;
    if start <= end {
        Some(text[start..=end].to_string())
    } else {
        None
    }
}

/// Get the application data directory.
/// Uses OS-specific locations to ensure write access.
pub fn get_app_data_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "linux")]
    {
        // Linux: Always use XDG data directory (handles AppImage and regular installations)
        let data_dir = if let Ok(xdg_data) = env::var("XDG_DATA_HOME") {
            PathBuf::from(xdg_data)
        } else if let Ok(home) = env::var("HOME") {
            PathBuf::from(home).join(".local").join("share")
        } else {
            return Err("Cannot determine user data directory".to_string());
        };
        Ok(data_dir.join("unofficial-neuro-kar-manager"))
    }

    #[cfg(target_os = "windows")]
    {
        // Windows: Use AppData\Local
        if let Ok(appdata) = env::var("LOCALAPPDATA") {
            Ok(PathBuf::from(appdata).join("unofficial-neuro-kar-manager"))
        } else if let Ok(userprofile) = env::var("USERPROFILE") {
            Ok(PathBuf::from(userprofile)
                .join("AppData")
                .join("Local")
                .join("unofficial-neuro-kar-manager"))
        } else {
            Err("Cannot determine AppData directory".to_string())
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: Use Application Support
        if let Ok(home) = env::var("HOME") {
            Ok(PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("unofficial-neuro-kar-manager"))
        } else {
            Err("Cannot determine home directory".to_string())
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        // Default: Try to use directory adjacent to executable
        if let Ok(current_exe) = env::current_exe() {
            if let Some(parent) = current_exe.parent() {
                Ok(parent.to_path_buf())
            } else {
                Err("Cannot determine executable parent directory".to_string())
            }
        } else {
            Err("Cannot determine executable path".to_string())
        }
    }
}
