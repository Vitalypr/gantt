import {
  Rows3,
  MousePointerClick,
  Waypoints,
  Calendar,
  Save,
  Keyboard,
  Move,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { HELP_SECTIONS, HELP_SHORTCUTS } from '@/constants/help';

type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Manifest icon names resolved to components, so the manifest stays plain data. */
const ICONS: Record<string, LucideIcon> = {
  Rows3,
  MousePointerClick,
  Waypoints,
  Calendar,
  Save,
  Move,
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-micro font-semibold text-muted-foreground">
      {children}
    </kbd>
  );
}

/**
 * Rendered from `constants/help.ts`.
 *
 * The content used to be 300 lines of JSX prose, which is why it drifted out of step with the
 * app without anyone noticing. Adding a feature now means adding one entry to the manifest.
 */
export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How this works</DialogTitle>
          <DialogDescription>
            A drawing tool for program plans. Nothing reschedules itself - you draw what you
            mean, and the deliverable is an image, a PDF or a JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {HELP_SECTIONS.map((section) => {
            const Icon = ICONS[section.icon] ?? Rows3;
            return (
              <section key={section.id}>
                <div className="mb-2 flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: section.color }}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-body font-bold tracking-tight text-foreground">
                    {section.title}
                  </h3>
                </div>
                <dl className="space-y-1.5">
                  {section.items.map((item) => (
                    <div key={item.label}>
                      <dt className="inline text-label font-semibold text-foreground">
                        {item.label}
                      </dt>
                      <dd className="inline text-label text-muted-foreground">
                        {' — '}
                        {item.body}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}

          <section>
            <div className="mb-2 flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: '#64748b' }}
              >
                <Keyboard className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-body font-bold tracking-tight text-foreground">Keyboard</h3>
            </div>
            <div className="space-y-1">
              {HELP_SHORTCUTS.map((shortcut) => (
                <div key={shortcut.description} className="flex items-center justify-between gap-3">
                  <span className="text-label text-muted-foreground">{shortcut.description}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
