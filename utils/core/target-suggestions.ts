import { FileFormat } from './types';

/**
 * The first target a newcomer is most likely to want, per source format.
 *
 * These are preferences, not reachability claims: every candidate is filtered through the live
 * `availableTargets` first, so a policy change or a removed converter cannot turn a suggestion into
 * a dead click. Suggestions are only rendered while no target is selected, and clicking one is an
 * ordinary `setTargetFormat` — nothing is preselected on the user's behalf.
 */
const PREFERENCES: Readonly<Partial<Record<FileFormat, readonly FileFormat[]>>> = {
  [FileFormat.MD]: [FileFormat.PDF, FileFormat.DOCX, FileFormat.HTML],
  [FileFormat.HTML]: [FileFormat.PDF, FileFormat.DOCX, FileFormat.MD],
  [FileFormat.DOCX]: [FileFormat.PDF, FileFormat.MD, FileFormat.HTML],
  [FileFormat.PDF]: [FileFormat.TXT, FileFormat.DOCX, FileFormat.PNG],
  [FileFormat.TXT]: [FileFormat.MD, FileFormat.HTML, FileFormat.PDF],
  [FileFormat.XLSX]: [FileFormat.CSV, FileFormat.JSON, FileFormat.PDF],
  [FileFormat.CSV]: [FileFormat.XLSX, FileFormat.JSON, FileFormat.PDF],
  [FileFormat.JSON]: [FileFormat.CSV, FileFormat.XLSX, FileFormat.HTML],
  [FileFormat.PNG]: [FileFormat.WEBP, FileFormat.PDF, FileFormat.JPG],
  [FileFormat.JPG]: [FileFormat.WEBP, FileFormat.PDF, FileFormat.PNG],
  [FileFormat.WEBP]: [FileFormat.PNG, FileFormat.PDF, FileFormat.JPG],
  [FileFormat.BMP]: [FileFormat.PNG, FileFormat.PDF, FileFormat.JPG],
  [FileFormat.GIF]: [FileFormat.PNG, FileFormat.PDF, FileFormat.WEBP],
  [FileFormat.SVG]: [FileFormat.PNG, FileFormat.PDF, FileFormat.WEBP],
};

/** A last resort when no source's preference list has a target the whole batch can reach. */
const FALLBACK_ORDER: readonly FileFormat[] = [
  FileFormat.PDF,
  FileFormat.DOCX,
  FileFormat.HTML,
  FileFormat.TXT,
  FileFormat.JSON,
  FileFormat.CSV,
  FileFormat.XLSX,
  FileFormat.PNG,
  FileFormat.JPG,
  FileFormat.WEBP,
  FileFormat.MD,
];

/**
 * Up to `limit` targets worth offering for a batch that has no target yet.
 *
 * A mixed batch ranks the union of its members' preferences, then filters that list through the live
 * `availableTargets` — the same intersection the picker itself uses. A strict intersection of the
 * preference lists would go empty for most mixed batches (PDF + PNG share no preferred target even
 * though both can reach JPG), which is a row of nothing rather than a useful suggestion. The source
 * formats themselves are always excluded; an empty result means "show nothing".
 */
export function suggestTargets(
  sourceFormats: readonly FileFormat[],
  availableTargets: readonly FileFormat[],
  limit = 3,
): FileFormat[] {
  if (sourceFormats.length === 0 || availableTargets.length === 0) return [];

  const available = new Set(availableTargets);
  const sources = new Set(sourceFormats);
  let candidates: FileFormat[];

  if (sourceFormats.length === 1) {
    candidates = [...(PREFERENCES[sourceFormats[0]] ?? [])];
  } else {
    const union: FileFormat[] = [];
    for (const format of sourceFormats) {
      for (const target of PREFERENCES[format] ?? []) {
        if (!union.includes(target)) union.push(target);
      }
    }
    candidates = union.length > 0 ? union : [...FALLBACK_ORDER];
  }

  return candidates.filter(format => !sources.has(format) && available.has(format)).slice(0, limit);
}
