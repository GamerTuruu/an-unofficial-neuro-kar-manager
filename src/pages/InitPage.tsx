import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function InitPage() {
  const [initMessage, setInitMessage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      try {
        setInitMessage("Finding Rclone...");
        setProgress(10);

        // Artificial delay for UX
        await new Promise((r) => setTimeout(r, 600));

        const installed = await invoke<boolean>("check_rclone");

        if (installed) {
          setInitMessage("Found Rclone.");
          setProgress(100);
          await new Promise((r) => setTimeout(r, 500));
          navigate("/home");
          return;
        }

        setInitMessage("Rclone not found.");
        setProgress(30);
        await new Promise((r) => setTimeout(r, 800));

        setInitMessage("Installing local copy of Rclone...");
        setProgress(50);

        await invoke("download_rclone");

        setInitMessage("Installed Rclone.");
        setProgress(100);
        await new Promise((r) => setTimeout(r, 800));
        navigate("/home");
      } catch (e) {
        setInitMessage(`Error: ${e}`);
        setProgress(0);
      }
    }

    init();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 space-y-6 bg-background text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">Setup</h1>
      <div className="w-full max-w-md space-y-2">
        <p className="text-sm text-muted-foreground text-center">
          {initMessage}
        </p>
        <Progress value={progress} className="w-full" />
      </div>
    </div>
  );
}
