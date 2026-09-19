import type { Converter, ConversionStep } from '~/utils/core/types';
import { FileFormat } from '~/utils/core/types';
import { getBlockedReason } from '~/utils/core/conversion-policy';

export class ConverterRegistry {
  private converters = new Map<string, Converter>();
  private adjacency = new Map<FileFormat, FileFormat[]>();

  private makeKey(from: FileFormat, to: FileFormat): string {
    return `${from}->${to}`;
  }

  register(converter: Converter): void {
    const key = this.makeKey(converter.from, converter.to);
    const targets = this.adjacency.get(converter.from);
    if (targets) {
      if (!targets.includes(converter.to)) {
        // Insert by declared preference, keeping equal preferences in registration order. The BFS
        // in findConversionPath iterates this array and returns the first shortest path it meets,
        // so this position IS the route choice for tied lengths.
        const preference = converter.edgePreference ?? 0;
        let insertAt = targets.length;
        for (let i = 0; i < targets.length; i++) {
          const other = this.getConverter(converter.from, targets[i]);
          if ((other?.edgePreference ?? 0) > preference) {
            insertAt = i;
            break;
          }
        }
        targets.splice(insertAt, 0, converter.to);
      }
    } else {
      this.adjacency.set(converter.from, [converter.to]);
    }
    this.converters.set(key, converter);
  }

  /** Find a direct converter for from→to */
  getConverter(from: FileFormat, to: FileFormat): Converter | undefined {
    return this.converters.get(this.makeKey(from, to));
  }

  getDirectTargets(from: FileFormat): FileFormat[] {
    return this.adjacency.get(from) ?? [];
  }

  /** Get ALL formats reachable from `from` including multi-step paths (BFS) */
  getAllSupportedTargets(from: FileFormat): FileFormat[] {
    const visited = new Set<FileFormat>([from]);
    const queue: FileFormat[] = [from];
    const result: FileFormat[] = [];
    let head = 0;

    while (head < queue.length) {
      const current = queue[head++];
      const directTargets = this.getDirectTargets(current);

      for (const target of directTargets) {
        if (!visited.has(target)) {
          visited.add(target);
          result.push(target);
          queue.push(target);
        }
      }
    }

    return result;
  }

  getRegisteredFormats(): { from: FileFormat; to: FileFormat }[] {
    const pairs: { from: FileFormat; to: FileFormat }[] = [];
    for (const [from, targets] of this.adjacency) {
      for (const to of targets) {
        pairs.push({ from, to });
      }
    }
    return pairs;
  }

  /** Use BFS to find the shortest conversion path from `from` to `to`. Returns null if no path exists. */
  findConversionPath(from: FileFormat, to: FileFormat): ConversionStep[] | null {
    if (from === to) return [];

    const visited = new Set<FileFormat>([from]);
    // Queue stores: [currentFormat, pathToHere]
    const queue: [FileFormat, ConversionStep[]][] = [[from, []]];
    let head = 0;

    while (head < queue.length) {
      const [current, path] = queue[head++];
      const directTargets = this.getDirectTargets(current);

      for (const target of directTargets) {
        const converter = this.getConverter(current, target)!;
        const step: ConversionStep = { converter, from: current, to: target };
        const newPath = [...path, step];

        if (target === to) {
          return newPath;
        }

        if (!visited.has(target)) {
          visited.add(target);
          queue.push([target, newPath]);
        }
      }
    }

    return null;
  }

  /**
   * Resolve the steps a `from -> to` conversion will really take, or throw why it won't.
   *
   * This is the enforcement point for the semantic policy. `findConversionPath` only knows what the
   * graph can reach, and `getBlockedReason` used to be consulted exclusively by the UI
   * (`availableTargets` and `FormatSelector`), so `convert()` happily ran combinations the dropdown
   * had greyed out — any caller that supplies a target without going through the dropdown (a stale
   * selection, a reused history pair, a future preset or shortcut) could start a conversion that
   * always fails or produces a placeholder. Checking here means no entry point can skip it.
   *
   * Only the endpoints are policy-checked, matching what `availableTargets` filters on; the
   * intermediate steps of a shortest path are never blocked pairs today.
   *
   * @throws Error whose `message` is an i18n key — the blocked-reason key when the pair is
   *         semantically invalid, `errors.noPath` when the graph cannot reach `to`.
   */
  resolvePath(from: FileFormat, to: FileFormat): ConversionStep[] {
    const blocked = getBlockedReason(from, to);
    if (blocked) throw new Error(blocked);

    const steps = this.findConversionPath(from, to);
    if (!steps || steps.length === 0) throw new Error('errors.noPath');
    return steps;
  }
}

/** Singleton converter registry instance */
export const converterRegistry = new ConverterRegistry();
