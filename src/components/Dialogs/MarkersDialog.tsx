import { useState } from 'react';
import { Flag, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useStore } from '@/stores';
import { activeChart } from '@/stores/selectors';
import { BASE_TONE_COLORS } from '@/constants/colors';

type MarkersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Today's date as `YYYY-MM-DD`, in LOCAL time - `toISOString` would shift it across UTC. */
function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** One swatch per hue, at the base tone. Was a hand-written `colors[2]`, which silently
 *  meant a different tone the moment the palette gained a column. */
const MARKER_COLORS = BASE_TONE_COLORS;

export function MarkersDialog({ open, onOpenChange }: MarkersDialogProps) {
  const markers = useStore((s) => activeChart(s).markers) ?? [];
  const addMarker = useStore((s) => s.addMarker);
  const updateMarker = useStore((s) => s.updateMarker);
  const removeMarker = useStore((s) => s.removeMarker);

  const [draftName, setDraftName] = useState('');
  const [draftDate, setDraftDate] = useState(todayISO());

  const add = () => {
    const name = draftName.trim();
    if (!name) return;
    addMarker({ name, date: draftDate });
    setDraftName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Markers</DialogTitle>
          <DialogDescription>
            Named vertical lines for deadlines, gates and reviews. They are dated, so they keep
            their place when the chart range changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <label className="flex-1 space-y-1">
            <span className="text-micro text-muted-foreground">Name</span>
            <Input
              dir="auto"
              value={draftName}
              placeholder="Design freeze"
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add();
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-micro text-muted-foreground">Date</span>
            <Input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
          </label>
          <Button onClick={add} disabled={!draftName.trim()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {markers.length === 0 ? (
            <p className="py-6 text-center text-label text-muted-foreground">No markers yet.</p>
          ) : (
            markers.map((marker) => (
              <div key={marker.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: marker.color ?? 'var(--color-primary)' }} />
                <Input
                  dir="auto"
                  aria-label="Marker name"
                  className="h-7 flex-1"
                  value={marker.name}
                  onChange={(e) => updateMarker(marker.id, { name: e.target.value })}
                />
                <Input
                  type="date"
                  aria-label="Marker date"
                  className="h-7 w-36"
                  value={marker.date}
                  onChange={(e) => updateMarker(marker.id, { date: e.target.value })}
                />
                <select
                  aria-label="Marker colour"
                  className="h-7 rounded border border-border/60 bg-surface px-1 text-micro"
                  value={marker.color ?? ''}
                  onChange={(e) => updateMarker(marker.id, { color: e.target.value || undefined })}
                >
                  <option value="">Default</option>
                  {MARKER_COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete marker ${marker.name}`}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMarker(marker.id)}
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
