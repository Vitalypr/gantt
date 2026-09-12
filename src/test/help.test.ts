import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HELP_SECTIONS, HELP_SHORTCUTS } from '@/constants/help';

/**
 * Help text drifts silently. These assertions do not check prose quality - they check the
 * things that actually went wrong before: content describing features that no longer exist,
 * and shortcuts documented but not implemented.
 */
describe('help manifest', () => {
  it('has unique section ids and non-empty sections', () => {
    expect(new Set(HELP_SECTIONS.map((s) => s.id)).size).toBe(HELP_SECTIONS.length);
    for (const section of HELP_SECTIONS) {
      expect(section.items.length, `${section.id} is empty`).toBeGreaterThan(0);
      expect(section.title.trim()).not.toBe('');
    }
  });

  it('has a unique label and a real sentence for every item', () => {
    for (const section of HELP_SECTIONS) {
      const labels = section.items.map((i) => i.label);
      expect(new Set(labels).size, `${section.id} repeats a label`).toBe(labels.length);
      for (const item of section.items) {
        expect(item.body.length, `${section.id}/${item.label} is too short to be useful`).toBeGreaterThan(20);
      }
    }
  });

  it('documents no duplicate shortcut', () => {
    const combos = HELP_SHORTCUTS.map((s) => s.keys.join('+'));
    expect(new Set(combos).size).toBe(combos.length);
  });

  /**
   * Every documented modifier shortcut must actually be handled. This is what stops the help
   * from promising a key the app does not implement.
   */
  it('every documented Ctrl shortcut is handled in useKeyboardShortcuts', () => {
    const source = readFileSync('src/hooks/useKeyboardShortcuts.ts', 'utf8');
    const ctrlShortcuts = HELP_SHORTCUTS.filter(
      (s) => s.keys[0] === 'Ctrl' && s.keys[1] && s.keys[1].length === 1,
    );
    expect(ctrlShortcuts.length).toBeGreaterThan(4);
    for (const shortcut of ctrlShortcuts) {
      const letter = shortcut.keys[1]!.toLowerCase();
      expect(
        source.includes(`key === '${letter}'`),
        `Ctrl+${letter.toUpperCase()} is documented but not handled`,
      ).toBe(true);
    }
  });

  it('documents Delete, Enter, Escape and the arrow keys, which are all handled', () => {
    const source = readFileSync('src/hooks/useKeyboardShortcuts.ts', 'utf8');
    const described = HELP_SHORTCUTS.map((s) => s.keys.join('+'));
    expect(described).toContain('Delete');
    expect(described).toContain('Enter');
    expect(described).toContain('Escape');
    expect(source).toContain("'Delete'");
    expect(source).toContain("e.key === 'Enter'");
    expect(source).toContain("e.key === 'Escape'");
    expect(source).toContain("startsWith('Arrow')");
  });

  it('mentions the features that exist now, not the ones that were removed', () => {
    const all = HELP_SECTIONS.flatMap((s) => s.items.map((i) => `${i.label} ${i.body}`)).join(' ').toLowerCase();
    for (const topic of ['right-to-left', 'holiday', 'marker', 'legend', 'template', 'milestone', 'progress', 'svg']) {
      expect(all, `help never mentions ${topic}`).toContain(topic);
    }
  });
});
