import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthDialogProps {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ url, open, onOpenChange }: AuthDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setCopied(false);
    }
  }, [open]);

  if (!url) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleOpen = async () => {
    try {
      if (url) {
        await openUrl(url);
      }
    } catch (err) {
      console.error("Failed to open URL", err);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Authorization Required</AlertDialogTitle>
          <AlertDialogDescription>
            Please authorize the application to access Google Drive by visiting
            the link below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2 my-4">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="auth-link" className="sr-only">
              Link
            </Label>
            <div className="relative">
              <Input
                id="auth-link"
                value={url}
                readOnly
                className="w-full pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <Button onClick={handleOpen}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Link
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
