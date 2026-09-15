import { FileFormat } from '~/utils/core/types';
import type { ConversionPreset, ImageOutputOptions } from '~/utils/core/types';
import { sanitizeImageOutputOptions } from '~/utils/core/output-options';
import { getFormatLabel } from '~/utils/core/format-labels';

/**
 * Pure rules behind conversion presets: how many may exist, what a legal stored entry looks like,
 * and how a preset is described in words.
 *
 * Kept free of reactive state so `usePresets` (storage + singleton) and `PresetBar` (rendering)
 * read the same limits instead of each inventing their own.
 */

/** Enough for a real workflow set, low enough that the bar never becomes a scroll region. */
export const MAX_PRESETS = 12;

/** Chips are one line, so a longer name is truncated rather than wrapping the bar. */
export const PRESET_NAME_MAX = 40;

/** Enum lookup without casting: anything not returned from here is not a format we know. */
const FORMATS_BY_NAME: ReadonlyMap<string, FileFormat> = new Map<string, FileFormat>(
  Object.values(FileFormat).map(format => [format, format]),
);

function toFormat(value: unknown): FileFormat | undefined {
  return typeof value === 'string' ? FORMATS_BY_NAME.get(value) : undefined;
}

/**
 * Stable id for a preset.
 *
 * `crypto.randomUUID` is available in every context that can open the workbench (extension pages
 * and localhost, both secure contexts), and the ids only ever have to be unique within one profile.
 */
export function newPresetId(): string {
  return crypto.randomUUID();
}

/**
 * Build a preset from what the user just did.
 *
 * An empty name falls back to the auto-description rather than a placeholder, so a chip is always
 * readable even when saved in a hurry; the fallback itself is clamped, because the parameter list
 * grows with the number of tuned options.
 */
export function createPreset(
  name: string,
  target: FileFormat,
  options: ImageOutputOptions,
  t: (key: string, params?: Record<string, string | number>) => string,
): ConversionPreset {
  const trimmed = name.trim();
  const finalName = (trimmed || describePreset(target, options, t)).slice(0, PRESET_NAME_MAX);
  return { id: newPresetId(), name: finalName, target, options: sanitizeImageOutputOptions(options) };
}

/**
 * Reduce an untrusted value (a storage payload, typically) to a legal preset list.
 *
 * An entry with an unknown target or a missing id is repaired rather than dropped where the repair
 * is unambiguous, and skipped where it is not: a preset pointing at a format this build no longer
 * has can only be discarded, because applying it would set a target the converter registry cannot
 * resolve. Ids are deduplicated so a hand-edited payload cannot make two chips behave identically
 * while being indistinguishable to delete.
 */
export function sanitizePresets(value: unknown): ConversionPreset[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const presets: ConversionPreset[] = [];

  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as Record<string, unknown>;

    const target = toFormat(entry.target);
    if (target === undefined) continue;

    const id = typeof entry.id === 'string' && entry.id !== '' ? entry.id : newPresetId();
    if (seen.has(id)) continue;
    seen.add(id);

    const rawName = typeof entry.name === 'string' ? entry.name.trim() : '';
    presets.push({
      id,
      name: rawName.slice(0, PRESET_NAME_MAX) || target.toUpperCase(),
      target,
      options: sanitizeImageOutputOptions(entry.options),
    });
    if (presets.length >= MAX_PRESETS) break;
  }

  return presets;
}

/**
 * Human-readable summary of what a preset does, used both as the tooltip and as the name assigned
 * when the user saves one without typing a label.
 *
 * Built from the existing format labels and `output.*` unit templates so the wording matches the
 * format dropdown and the output panel, and so nothing here needs its own translations.
 */
export function describePreset(
  target: FileFormat,
  options: ImageOutputOptions,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const parts: string[] = [getFormatLabel(target)];
  if (options.maxEdge !== undefined) parts.push(t('output.pixels', { value: options.maxEdge }));
  if (options.quality !== undefined) parts.push(t('output.percent', { value: Math.round(options.quality * 100) }));
  if (options.targetSizeKB !== undefined) parts.push(t('output.kilobytes', { value: options.targetSizeKB }));
  if (options.dpi !== undefined) parts.push(t('output.dpiValue', { value: options.dpi }));
  return parts.join(' · ');
}
