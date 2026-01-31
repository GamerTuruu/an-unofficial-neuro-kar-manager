mod download;
mod logs;
mod server;
mod stats;
mod utils;

// Command functions
pub use server::__cmd__stop_rc_server;
pub use stats::__cmd__get_stats;

// Functions
pub use download::download_rclone;
pub use logs::LogManager;
pub use server::{get_sdk_client, is_server_running, stop_rc_server};
pub use stats::get_stats;
pub use utils::is_rclone_installed;
