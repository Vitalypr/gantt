import type { GanttRow, Activity } from '@/types/gantt';

/**
 * Starter charts.
 *
 * Structure only - real phase names, no lorem ipsum and no invented dates. Offsets are in
 * chart units, so the same template is sensible in months or weeks. `migrateChart` already
 * handles schema evolution and the store already does whole-chart replacement, so a template
 * is just a row/activity shape rather than a new persistence path.
 */
export type ChartTemplate = {
  id: string;
  name: string;
  description: string;
  rows: { name: string; activities: Omit<Activity, 'id' | 'order'>[] }[];
};

const TEAL = '#14b8a6';
const INDIGO = '#6366f1';
const AMBER = '#f59e0b';
const ROSE = '#f43f5e';
const SLATE = '#64748b';

export const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: 'product',
    name: 'Product delivery',
    description: 'Discovery through launch, with a gate at each hand-off.',
    rows: [
      { name: 'Discovery', activities: [
        { name: 'Research', color: SLATE, startMonth: 0, durationMonths: 2 },
        { name: 'Concept', color: SLATE, startMonth: 2, durationMonths: 1 },
      ] },
      { name: 'Design', activities: [
        { name: 'Detailed design', color: INDIGO, startMonth: 3, durationMonths: 3 },
      ] },
      { name: 'Build', activities: [
        { name: 'Implementation', color: TEAL, startMonth: 5, durationMonths: 6 },
      ] },
      { name: 'Validation', activities: [
        { name: 'Test', color: AMBER, startMonth: 10, durationMonths: 3 },
        { name: 'Pilot', color: AMBER, startMonth: 13, durationMonths: 2 },
      ] },
      { name: 'Launch', activities: [
        { name: 'GA', color: ROSE, startMonth: 15, durationMonths: 1, isMilestone: true },
      ] },
    ],
  },
  {
    id: 'construction',
    name: 'Construction phases',
    description: 'Permitting through handover.',
    rows: [
      { name: 'Permitting', activities: [
        { name: 'Approvals', color: SLATE, startMonth: 0, durationMonths: 4 },
      ] },
      { name: 'Design', activities: [
        { name: 'Detailed design', color: INDIGO, startMonth: 2, durationMonths: 4 },
      ] },
      { name: 'Procurement', activities: [
        { name: 'Long-lead items', color: AMBER, startMonth: 4, durationMonths: 6 },
      ] },
      { name: 'Site', activities: [
        { name: 'Earthworks', color: TEAL, startMonth: 6, durationMonths: 3 },
        { name: 'Structure', color: TEAL, startMonth: 9, durationMonths: 6 },
        { name: 'Fit-out', color: TEAL, startMonth: 15, durationMonths: 4 },
      ] },
      { name: 'Handover', activities: [
        { name: 'Commissioning', color: ROSE, startMonth: 19, durationMonths: 2 },
      ] },
    ],
  },
  {
    id: 'blank-phases',
    name: 'Empty phase rows',
    description: 'Named rows, no bars - for drawing from scratch.',
    rows: [
      { name: 'Phase 1', activities: [] },
      { name: 'Phase 2', activities: [] },
      { name: 'Phase 3', activities: [] },
      { name: 'Phase 4', activities: [] },
      { name: 'Milestones', activities: [] },
    ],
  },
];

/** Expand a template into rows + activities with fresh ids. */
export function instantiateTemplate(
  template: ChartTemplate,
  makeId: () => string,
): { rows: GanttRow[]; activities: Activity[] } {
  const rows: GanttRow[] = [];
  const activities: Activity[] = [];
  let order = 0;

  template.rows.forEach((row, index) => {
    const activityIds: string[] = [];
    for (const a of row.activities) {
      const id = makeId();
      activities.push({ ...a, id, order: order++ });
      activityIds.push(id);
    }
    rows.push({ id: makeId(), name: row.name, order: index, activityIds });
  });

  return { rows, activities };
}
