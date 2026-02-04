import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TransferStatus } from "@/components/TransferStatus";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTransferStats } from "@/hooks/useTransferStats";

export function DownloadsButton() {
  const stats = useTransferStats();
  const activeCount = stats?.transferring?.length || 0;
  const isTransferring = activeCount > 0;

  const [isOpen, setIsOpen] = useState(false);
  const wasTransferringRef = useRef(isTransferring);

  useEffect(() => {
    if (!wasTransferringRef.current && isTransferring) {
      setIsOpen(true);
    }
    wasTransferringRef.current = isTransferring;
  }, [isTransferring]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={`relative inline-flex h-9 w-9 overflow-hidden rounded-md ${
          isTransferring ? "p-0.5" : ""
        }`}
      >
        {isTransferring && (
          <span className="absolute -inset-full animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,var(--color-pink-500)_0%,var(--color-violet-500)_50%,var(--color-pink-500)_100%)]" />
        )}
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`relative h-full w-full ${
              isTransferring ? "bg-background hover:bg-background/90" : ""
            }`}
            title={t`Downloads`}
          >
            <Download className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex flex-col space-y-1.5 p-4 text-center sm:text-left border-b">
          <h4 className="font-semibold leading-none tracking-tight">
            <Trans>Downloads</Trans>
          </h4>
          {isTransferring ? (
            <p className="text-xs text-muted-foreground">
              <Plural
                value={activeCount}
                one="# active transfer"
                other="# active transfers"
              />
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              <Trans>No active transfers</Trans>
            </p>
          )}
        </div>
        <ScrollArea className="h-[min(60vh,300px)]">
          <TransferStatus stats={stats} compact={true} />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
