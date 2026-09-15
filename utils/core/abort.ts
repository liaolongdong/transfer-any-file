/**
 * Cooperative cancellation for converter-internal loops.
 *
 * The batch orchestrator can only test the signal *between* steps, which leaves any single
 * long-running step (a tall HTML→PDF, a 100-page PDF→PNG) unstoppable. Converters that own a loop
 * therefore check the signal inside it, at a point where abandoning the work leaves nothing to
 * clean up.
 */

/**
 * @throws Error with the `errors.cancelled` i18n key when `signal` has been aborted.
 *   A no-op for an absent signal, so converters called without a context still compile and run.
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('errors.cancelled');
}
