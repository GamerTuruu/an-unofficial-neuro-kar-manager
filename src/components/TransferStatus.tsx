import { invoke } from "@tauri-apps/api/core";
import { Activity, FileIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface CoreStatsTransfer {
  name: string;
  size: number;
  bytes: number;
  percentage: number;
  speed: number;
  speedAvg: number;
  eta?: number;
}

interface CoreStatsResponse {
  bytes: number;
  totalBytes: number;
  speed: number;
  transfers: number;
  transferring: CoreStatsTransfer[];
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

function formatTime(seconds: number | undefined) {
  if (seconds === undefined || seconds === null) return "--";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function TransferStatus() {
  const [stats, setStats] = useState<CoreStatsResponse | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await invoke<CoreStatsResponse>("get_stats");
        setStats(res);
      } catch (_) {
        // Silent fail on stats fetch (maybe rclone not running yet)
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!stats || !stats.transferring || stats.transferring.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full">
      <div className="flex flex-col space-y-1.5 p-6 pb-2">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Active Transfers
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            Total Speed: {formatBytes(stats.speed)}/s
          </span>
        </h3>
      </div>
      <div className="p-6 pt-0 space-y-4">
        {stats.transferring.map((transfer) => (
          <div key={transfer.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate flex-1 font-medium flex items-center gap-1">
                <FileIcon className="h-3 w-3" />
                {transfer.name}
              </span>
              <span className="text-muted-foreground whitespace-nowrap ml-2">
                {formatBytes(transfer.speed)}/s • ETA:{" "}
                {formatTime(transfer.eta)}
              </span>
            </div>
            <Progress value={transfer.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatBytes(transfer.bytes)} / {formatBytes(transfer.size)}
              </span>
              <span>{transfer.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
