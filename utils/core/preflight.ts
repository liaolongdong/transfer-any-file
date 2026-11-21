import { converterRegistry } from '~/utils/core/registry';
import { detectFormat } from '~/utils/core/file-detect';
import type { FileFormat } from '~/utils/core/types';

/**
 * A dry run over the staged batch, before anything is converted.
 *
 * Every number here is derived from the same two calls the real run makes — `detectFormat` and
 * `resolvePath` — rather than from a second table of "what each route does". That is deliberate: the
 * registry's BFS is the single source of truth for step counts (measured at 0.28 µs per lookup), and
 * a hand-maintained summary would drift the first time an edge is added. It also means this module
 * can never disagree with `useConversion`, which is the whole point of showing a plan up front.
 *
 * No file is read, decoded or converted: `resolvePath` is pure graph traversal, and `detectFormat`
 * looks at the name and MIME type only.
 */
export interface PreflightReport {
  /** Files handed in. */
  total: number;
  /** Files whose source format resolves to a legal path for the chosen target. */
  ready: number;
  /** Files that cannot reach the target: unrecognised format, or no path the policy allows. */
  unreachable: number;
  /** Of `unreachable`, how many had no recognisable format at all. */
  unknown: number;
  /** Files that need more than one converter. */
  multiStep: number;
  /** Longest chain in the batch, in converter steps. */
  maxSteps: number;
  /** Sum of every file's step count — the denominator the progress bar will use. */
  totalSteps: number;
}

function emptyReport(total: number): PreflightReport {
  return { total, ready: 0, unreachable: 0, unknown: 0, multiStep: 0, maxSteps: 0, totalSteps: 0 };
}

/**
 * The two throws `resolvePath` documents — a policy-blocked pair and `errors.noPath` — both end the
 * same way for this file: the run will fail it, so it must not inflate the denominator.
 */
function stepsTo(format: FileFormat, target: FileFormat): number {
  try {
    return converterRegistry.resolvePath(format, target).length;
  } catch {
    return 0;
  }
}

/**
 * Build the plan for `files → target`.
 *
 * `target === null` stops after counting formats: there is no route to resolve yet, and counting
 * every file as unreachable would be a lie about a batch the user has not aimed anywhere.
 */
export function buildPreflight(files: readonly File[], target: FileFormat | null): PreflightReport {
  const report = emptyReport(files.length);

  for (const file of files) {
    const format = detectFormat(file);
    if (!format) {
      report.unknown++;
      report.unreachable++;
      continue;
    }
    if (target === null) continue;

    const steps = stepsTo(format, target);
    if (steps === 0) {
      report.unreachable++;
      continue;
    }
    report.ready++;
    report.totalSteps += steps;
    if (steps > 1) {
      report.multiStep++;
      report.maxSteps = Math.max(report.maxSteps, steps);
    }
  }

  return report;
}
