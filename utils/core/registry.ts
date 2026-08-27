import type { Converter, ConversionStep } from '~/utils/core/types';
import { FileFormat } from '~/utils/core/types';

export class ConverterRegistry {
  private converters = new Map<string, Converter>();
  private adjacency = new Map<FileFormat, FileFormat[]>();

  private makeKey(from: FileFormat, to: FileFormat): string {
    return `${from}->${to}`;
  }

  register(converter: Converter): void {
    const key = this.makeKey(converter.from, converter.to);
    this.converters.set(key, converter);
    const targets = this.adjacency.get(converter.from);
    if (targets) {
      targets.push(converter.to);
    } else {
      this.adjacency.set(converter.from, [converter.to]);
    }
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

    while (queue.length > 0) {
      const current = queue.shift()!;
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

    while (queue.length > 0) {
      const [current, path] = queue.shift()!;
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
}

/** Singleton converter registry instance */
export const converterRegistry = new ConverterRegistry();
