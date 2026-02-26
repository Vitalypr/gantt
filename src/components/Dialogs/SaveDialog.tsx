import { Trash2, FileText } from 'lucide-react';
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
    onOpenChange(open);
  };

  const handleLoad = (id: string) => {
    loadSavedChart(id);
    onOpenChange(false);
  };

  const handleDelete = (id: string) => {
    deleteSavedChart(id);
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
                  className="flex-1 text-left text-sm hover:underline"
                  onClick={() => handleLoad(entry.id)}
                >
                  {entry.name}
                </button>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
