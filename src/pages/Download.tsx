import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { DownloadCloud, Folder, Save, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TransferStatus } from "@/components/TransferStatus";

const DEFAULT_GDRIVE_SOURCE = "1B1VaWp-mCKk15_7XpFnImsTdBJPOGx7a";

export default function DownloadPage() {
  const [source, setSource] = useState(DEFAULT_GDRIVE_SOURCE);
  const [destination, setDestination] = useState("");
  const [remotes, setRemotes] = useState<string[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [log, setLog] = useState("");

  const fetchRemotes = useCallback(async () => {
    try {
      const availableRemotes = await invoke<string[]>("get_gdrive_remotes");
      setRemotes(availableRemotes);
      if (availableRemotes.length > 0) {
        setSelectedRemote(availableRemotes[0]);
      }
    } catch (err) {
      console.error("Failed to fetch remotes", err);
      setLog((prev) => `${prev}Error fetching remotes: ${err}\n`);
    }
  }, []);

  useEffect(() => {
    fetchRemotes();
  }, [fetchRemotes]);

  const handleSelectDestination = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        setDestination(selected);
      }
    } catch (err) {
      console.error("Failed to select destination", err);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination) {
      setStatus("Please provide both source and destination.");
      return;
    }

    setLoading(true);
    setStatus("Downloading...");
    setLog(
      `Starting download...\nSource: ${source}\nDestination: ${destination}\nRemote: ${selectedRemote || "(Auto-auth)"}\n`,
    );

    try {
      const output = await invoke<string>("download_gdrive", {
        source,
        destination,
        remoteConfig: selectedRemote || null,
      });
      setStatus("Download completed successfully.");
      setLog((prev) => `${prev}\n${output}`);
    } catch (error) {
      console.error(error);
      setStatus("Download failed.");
      setLog((prev) => `${prev}\nError: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DownloadCloud className="h-8 w-8" />
          GDrive Download
        </h1>
        <p className="text-muted-foreground mt-2">
          Download content directly from Google Drive using rclone.
        </p>
      </div>

      <form
        onSubmit={handleDownload}
        className="space-y-6 bg-card p-6 rounded-lg border border-border"
      >
        {/* Source Input */}
        <div className="space-y-2">
          <label
            htmlFor="source"
            className="text-sm font-medium flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            GDrive Source (Link or ID)
          </label>
          <input
            id="source"
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. 1AbCdEfGhIjK..."
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Destination Input */}
        <div className="space-y-2">
          <label
            htmlFor="destination"
            className="text-sm font-medium flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Destination (Local Folder Path)
          </label>
          <div className="flex gap-2">
            <input
              id="destination"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="/home/user/Downloads/..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSelectDestination}
              className="px-3 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground"
              disabled={loading}
              title="Select Folder"
            >
              <Folder className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Remote Selection */}
        <div className="space-y-2">
          <label
            htmlFor="remote-config"
            className="text-sm font-medium flex items-center gap-2"
          >
            <Folder className="h-4 w-4" />
            Rclone Remote Config
          </label>
          <div className="flex gap-2">
            <select
              id="remote-config"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedRemote || ""}
              onChange={(e) => setSelectedRemote(e.target.value || null)}
              disabled={loading}
            >
              <option value="">No Config (Auto-Authorize)</option>
              {remotes.map((remote) => (
                <option key={remote} value={remote}>
                  {remote}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={fetchRemotes}
              className="px-3 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground"
              disabled={loading}
              title="Refresh Remotes"
            >
              ↻
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            If "No Config" is selected, a one-time authorization window will
            open in your browser.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          {loading ? "Downloading..." : "Start Download"}
        </button>
      </form>

      {/* Progress & Logs */}
      {loading && (
        <div className="space-y-4">
          <TransferStatus />
          <p className="text-center text-sm text-muted-foreground animate-pulse">
            Starting download process...
          </p>
        </div>
      )}

      {/* Status Output */}
      <div className="bg-muted p-4 rounded-lg overflow-x-auto">
        <h3 className="text-sm font-bold mb-2">Logs</h3>
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {log || "Ready to download."}
        </pre>
        {status && <p className="mt-2 text-sm font-semibold">{status}</p>}
      </div>
    </div>
  );
}
