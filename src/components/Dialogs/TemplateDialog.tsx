import { nanoid } from 'nanoid';
import { LayoutTemplate } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useStore } from '@/stores';
import { activeChart } from '@/stores/selectors';
import { CHART_TEMPLATES, instantiateTemplate } from '@/constants/templates';

type TemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TemplateDialog({ open, onOpenChange }: TemplateDialogProps) {
  const applyTemplate = useStore((s) => s.applyTemplate);
  const hasContent = useStore((s) => {
    const c = activeChart(s);
    return c.activities.length > 0 || c.rows.some((r) => r.name.trim() !== '');
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            {hasContent
              ? 'This replaces the rows and bars in the current chart. One Ctrl+Z undoes it.'
              : 'Pick a starting shape. You can rename and redraw everything afterwards.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {CHART_TEMPLATES.map((template) => (
            <button
              key={template.id}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent"
              onClick={() => {
                const { rows, activities } = instantiateTemplate(template, () => nanoid());
                applyTemplate(rows, activities);
                onOpenChange(false);
              }}
            >
              <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">
                <span className="block text-label font-medium">{template.name}</span>
                <span className="block text-micro text-muted-foreground">{template.description}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
