import { useState } from 'react';
import { Trash2, FileText, Check, X, CalendarRange, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useStore } from '@/stores';

type SaveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SaveDialog({ open, onOpenChange }: SaveDialogProps) {
  const savedCharts = useStore((s) => s.savedCharts);
  const loadSavedChart = useStore((s) => s.loadSavedChart);
  const deleteSavedChart = useStore((s) => s.deleteSavedChart);
  const refreshSavedCharts = useStore((s) => s.refreshSavedCharts);

  const handleOpen = (open: boolean) => {
    if (open) refreshSavedCharts();
    setConfirmingId(null);
    onOpenChange(open);
  };

  const handleLoad = (id: string) => {
    loadSavedChart(id);
    onOpenChange(false);
  };

  // Two-step, because deleting a named save is permanent, outside undo history, and its
  // button sits 24px from the row's own click-to-load target.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteSavedChart(id);
    setConfirmingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Saved Charts</DialogTitle>
          <DialogDescription>Load or manage your saved Gantt charts.</DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {savedCharts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No saved charts yet.</p>
          ) : (
            savedCharts.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button
                  dir="auto"
                  className="flex-1 truncate text-left text-label hover:underline"
                  title={entry.name}
                  onClick={() => handleLoad(entry.id)}
                >
                  {entry.name}
                </button>
                {/* Which chart this save came from — the two are indistinguishable by name. */}
                <span
                  className="shrink-0 text-muted-foreground"
                  title={entry.mode === 'weeks' ? 'Weeks chart' : 'Months chart'}
                >
                  {entry.mode === 'weeks'
                    ? <CalendarDays className="h-3.5 w-3.5" />
                    : <CalendarRange className="h-3.5 w-3.5" />}
                </span>
                <span className="shrink-0 text-micro text-muted-foreground">
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </span>
                {confirmingId === entry.id ? (
                  <span className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Confirm delete ${entry.name}`}
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Cancel delete"
                      className="h-7 w-7"
                      onClick={() => setConfirmingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${entry.name}`}
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmingId(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
