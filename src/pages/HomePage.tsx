import { Trans } from "@lingui/react/macro";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISCORD_SERVER_LINK = "https://discord.gg/MZPyedT";
const DISCORD_PROJECT_LINK =
  "https://discord.com/channels/574720535888396288/1337588612845539349";
const GOOGLE_DRIVE_LINK =
  "https://drive.google.com/drive/folders/1B1VaWp-mCKk15_7XpFnImsTdBJPOGx7a";

export default function HomePage() {
  const handleOpenLink = async (url: string) => {
    await openUrl(url);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4">
        <Trans>Welcome to An Unofficial Neuro Karaoke Archive Manager</Trans>
      </h1>
      <p className="text-xl text-muted-foreground mb-8">
        <Trans>This page is under construction</Trans>
      </p>

      <div className="flex gap-4 mt-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleOpenLink(DISCORD_SERVER_LINK)}
          className="flex items-center gap-2"
        >
          <img src="/discord_icon.svg" alt="Discord" className="w-5 h-5" />
          <Trans>Neuro Discord Server</Trans>
          <ExternalLink className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => handleOpenLink(DISCORD_PROJECT_LINK)}
          className="flex items-center gap-2"
        >
          <img src="/discord_icon.svg" alt="Discord" className="w-5 h-5" />
          <Trans>Discord Project Chat</Trans>
          <ExternalLink className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => handleOpenLink(GOOGLE_DRIVE_LINK)}
          className="flex items-center gap-2"
        >
          <img
            src="/google_drive_icon.png"
            alt="Google Drive"
            className="w-5 h-5"
          />
          <Trans>An Unofficial Neuro Karaoke Archive Google Drive</Trans>
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
