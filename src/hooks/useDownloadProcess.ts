import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import type { DownloadParams, DryRunResult } from "@/types/download";

export function useDownloadProcess() {
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [status, setStatus] = useState("");
  const [log, setLog] = useState("");

  const appendLog = (message: string) => {
    setLog((prev) => `${prev}${message}\n`);
  };

  const checkDryRun = async (
    params: Omit<DownloadParams, "createBackup">,
  ): Promise<DryRunResult> => {
    const result = await invoke<DryRunResult>("check_dry_run", {
      source: params.source,
      destination: params.destination,
      remoteConfig: params.remoteConfig,
      createSubfolder: params.createSubfolder,
      selectedFiles: params.selectedFiles,
      deleteExcluded: params.deleteExcluded,
    });
    return result;
  };

  const executeDownload = async (params: DownloadParams) => {
    setLoading(true);
    setStatus("Downloading...");
    appendLog(`Starting download...\n`);

    try {
      const output = await invoke<string>("download_gdrive", {
        source: params.source,
        destination: params.destination,
        remoteConfig: params.remoteConfig,
        createSubfolder: params.createSubfolder,
        selectedFiles: params.selectedFiles,
        createBackup: params.createBackup,
        deleteExcluded: params.deleteExcluded,
      });
      setStatus("Download completed successfully.");
      appendLog(`\n${output}`);
    } catch (error) {
      console.error(error);
      setStatus("Download failed.");
      appendLog(`\nError: ${error}`);
    } finally {
      setLoading(false);
      setCancelling(false);
    }
  };

  const startDownload = async (
    params: DownloadParams,
    onWarningNeeded: (dryRunResult: DryRunResult) => void,
  ) => {
    setLog(
      `Download Configuration:\nSource: ${params.source}\nDestination: ${params.destination}\nRemote: ${params.remoteConfig}\nBackup: ${params.createBackup ? "Yes" : "No"}\nDelete Excluded: ${params.deleteExcluded ? "Yes" : "No"}\n`,
    );

    appendLog("\nPerforming dry run to check for potential file deletions...");

    try {
      const result = await checkDryRun(params);
      appendLog(`Dry run complete: ${result.stats}`);

      // Only show warning if files would be deleted
      if (result.would_delete) {
        appendLog("Warning: Files will be deleted during this operation.");
        onWarningNeeded(result);
      } else {
        appendLog("No files will be deleted. Proceeding with download...");
        await executeDownload(params);
      }
    } catch (error) {
      appendLog(`\nDry run failed: ${error}`);
      appendLog("You can still proceed, but file deletion status is unknown.");
      // Show warning anyway since we couldn't verify
      onWarningNeeded({
        would_delete: false,
        deleted_files: [],
        stats: "Dry run check failed",
      });
    }
  };

  const cancelDownload = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      appendLog("\nRequesting cancellation...");
      await invoke("stop_rc_server");
    } catch (err) {
      console.error("Failed to stop rclone", err);
      appendLog(`\nFailed to stop rclone: ${err}`);
      setCancelling(false);
    }
  };

  return {
    loading,
    cancelling,
    status,
    log,
    appendLog,
    startDownload,
    executeDownload,
    cancelDownload,
  };
}
