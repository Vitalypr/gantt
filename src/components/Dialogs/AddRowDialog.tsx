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
};

export function AddRowDialog({ open, onOpenChange }: AddRowDialogProps) {
  const [name, setName] = useState('');
  const addRow = useStore((s) => s.addRow);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName('');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRow(name.trim());
    onOpenChange(false);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Row</DialogTitle>
          <DialogDescription>
            Enter a name for the new row (optional).
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
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
