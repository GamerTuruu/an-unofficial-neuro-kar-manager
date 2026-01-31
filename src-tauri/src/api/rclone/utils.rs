use crate::utils::get_app_data_dir;
use std::path::PathBuf;
use tokio::sync::OnceCell;

static RCLONE_PATH: OnceCell<Option<PathBuf>> = OnceCell::const_new();

/// Helper to get the binary name based on OS
pub fn get_rclone_binary_name() -> &'static str {
    if cfg!(windows) {
        "rclone.exe"
    } else {
        "rclone"
    }
}

/// Get a writable directory for storing the rclone binary.
pub fn get_bin_dir() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("bin"))
}

/// Resolves the path to the rclone binary.
pub async fn resolve_rclone_path() -> Option<PathBuf> {
    let binary_name = get_rclone_binary_name();

    // 1. Priority: Check bin directory
    if let Ok(bin_dir) = get_bin_dir() {
        let bin_path = bin_dir.join(binary_name);
        if bin_path.exists() {
            return Some(bin_path);
        }
    }

    // 2. Secondary: System PATH
    let mut cmd = tokio::process::Command::new(binary_name);
    cmd.arg("--version");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let result = cmd.output().await;

    match result {
        Ok(output) if output.status.success() => Some(PathBuf::from(binary_name)),
        _ => None,
    }
}

/// Checks if rclone is installed (cached).
pub async fn is_rclone_installed() -> Option<PathBuf> {
    let path = RCLONE_PATH.get_or_init(resolve_rclone_path).await;
    path.clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_is_rclone_installed() {
        match is_rclone_installed().await {
            Some(path) => println!("Rclone found at: {:?}", path),
            None => println!("Rclone not found."),
        }
    }
}
