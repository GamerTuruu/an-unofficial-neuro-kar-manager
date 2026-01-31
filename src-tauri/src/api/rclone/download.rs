use super::utils::{get_bin_dir, get_rclone_binary_name};
use std::env;
use std::fs;
use std::io;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

const DOWNLOAD_RCLONE_VER: &str = "1.72.1";

/// Downloads rclone from the official website.
///
/// It determines the correct version for the current OS and architecture.
pub async fn download_rclone() -> Result<PathBuf, String> {
    let (os, arch) = match (env::consts::OS, env::consts::ARCH) {
        ("windows", "x86_64") => ("windows", "amd64"),
        ("windows", "x86") => ("windows", "386"),
        ("linux", "x86_64") => ("linux", "amd64"),
        ("linux", "aarch64") => ("linux", "arm64"),
        ("macos", "x86_64") => ("osx", "amd64"),
        ("macos", "aarch64") => ("osx", "arm64"),
        (o, a) => return Err(format!("Unsupported system: {} {}", o, a)),
    };

    let url = format!(
        "https://downloads.rclone.org/v{}/rclone-v{}-{}-{}.zip",
        DOWNLOAD_RCLONE_VER, DOWNLOAD_RCLONE_VER, os, arch
    );

    let binary_name = get_rclone_binary_name();

    let target_dir = get_bin_dir()?;
    tokio::fs::create_dir_all(&target_dir)
        .await
        .map_err(|e| format!("Failed to create bin directory: {}", e))?;

    let target_path = target_dir.join(binary_name);

    // Download to temp
    let temp_dir = env::temp_dir();
    let zip_path = temp_dir.join(format!("rclone_temp_{}.zip", DOWNLOAD_RCLONE_VER));

    {
        let response = reqwest::get(&url)
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Download failed: {}", response.status()));
        }

        let content = response.bytes().await.map_err(|e| e.to_string())?;
        let mut file = File::create(&zip_path).await.map_err(|e| e.to_string())?;
        file.write_all(&content).await.map_err(|e| e.to_string())?;
        file.flush().await.map_err(|e| e.to_string())?;
    }

    // Unzip
    let target_path_clone = target_path.clone();
    let zip_path_clone = zip_path.clone();

    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let file = fs::File::open(&zip_path_clone).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            // rclone zips usually have structure: rclone-vX.X.X-os-arch/rclone
            // We match against the binary name
            if file.name().ends_with(binary_name) {
                let mut outfile =
                    fs::File::create(&target_path_clone).map_err(|e| e.to_string())?;
                io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;

                #[cfg(unix)]
                {
                    if let Ok(metadata) = outfile.metadata() {
                        let mut perms = metadata.permissions();
                        perms.set_mode(0o755);
                        let _ = outfile.set_permissions(perms);
                    }
                }
                return Ok(());
            }
        }
        Err("Binary not found in zip".to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    // Cleanup
    let _ = tokio::fs::remove_file(zip_path).await;

    Ok(target_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_download_rclone() {
        let result = download_rclone().await;
        match result {
            Ok(path) => println!("Rclone downloaded successfully to: {:?}", path),
            Err(e) => panic!("Failed to download rclone: {}", e),
        }
    }
}
