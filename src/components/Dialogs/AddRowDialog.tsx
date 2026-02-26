import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useStore } from '@/stores';

type AddRowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRowId?: string;
  initialName?: string;
};

export function AddRowDialog({ open, onOpenChange, editRowId, initialName = '' }: AddRowDialogProps) {
  const [name, setName] = useState(initialName);
  const addRow = useStore((s) => s.addRow);
  const renameRow = useStore((s) => s.renameRow);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(initialName);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (editRowId) {
      renameRow(editRowId, trimmed);
    } else {
      addRow(trimmed);
    }
    onOpenChange(false);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editRowId ? 'Rename Row' : 'Add Row'}</DialogTitle>
          <DialogDescription>
            {editRowId ? 'Enter a new name for the row.' : 'Enter a name for the new row (optional).'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Row name (optional)"
            autoFocus
            className="mb-4"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editRowId ? 'Rename' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
