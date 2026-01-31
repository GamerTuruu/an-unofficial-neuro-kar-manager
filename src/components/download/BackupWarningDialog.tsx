import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DryRunResult } from "@/types/download";

interface BackupWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  dryRunResult?: DryRunResult;
  hasBackup: boolean;
}

export function BackupWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  dryRunResult,
  hasBackup,
}: BackupWarningDialogProps) {
  const wouldDelete = dryRunResult?.would_delete ?? false;
  const deletedCount = dryRunResult?.deleted_files?.length ?? 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {wouldDelete
              ? "Warning: Files Will Be Deleted"
              : "Warning: Potentially Destructive Operation"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {wouldDelete ? (
              <>
                <p>
                  The dry run detected that{" "}
                  <strong>{deletedCount > 0 ? deletedCount : "some"}</strong>{" "}
                  file(s) in the destination will be deleted during this sync
                  operation.
                </p>
                {deletedCount > 0 && (
                  <div className="border rounded-md bg-muted/50">
                    <ScrollArea className="h-40 rounded-md p-2">
                      <ul className="text-xs font-mono space-y-1">
                        {dryRunResult?.deleted_files?.map((file) => (
                          <li
                            key={file}
                            className="break-all text-red-600 dark:text-red-400"
                          >
                            - {file}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
                {dryRunResult?.stats && (
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {dryRunResult.stats}
                  </p>
                )}
                {!hasBackup && (
                  <p className="text-red-600 dark:text-red-400 font-semibold">
                    ⚠️ You have backups disabled! Deleted files will be
                    permanently lost.
                  </p>
                )}
                {hasBackup && (
                  <p className="text-green-600 dark:text-green-400">
                    ✓ A backup will be created before syncing.
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  This sync operation may overwrite or delete files in the
                  destination folder that don't exist in the source.
                </p>
                {!hasBackup && (
                  <p className="text-red-600 dark:text-red-400 font-semibold">
                    ⚠️ You have backups disabled! Any deleted files will be
                    permanently lost.
                  </p>
                )}
              </>
            )}
            <p className="pt-2">Are you sure you want to continue?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Yes, Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
