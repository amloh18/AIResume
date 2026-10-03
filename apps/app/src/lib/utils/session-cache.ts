/**
 * A cache whose lifetime is exactly one page load.
 *
 * The dashboard tabs (`applications`, `comms`, `settings`) are rendered
 * conditionally, so switching away unmounts them and switching back remounts
 * them — and every remount re-ran their fetch-on-mount effect. The visible
 * symptom was a spinner and a full data reload on each visit, even when nothing
 * had changed on the server.
 *
 * The contract these panels actually want is: *fetch once per page load, and
 * again only when something really changed*. Module state has precisely that
 * lifetime — it is created once per JS context and discarded on reload — so a
 * tab switch reuses it while a browser refresh starts empty.
 *
 * Callers therefore:
 *   1. read on mount and, on a hit, hydrate state without touching the network;
 *   2. write after a successful fetch;
 *   3. clear (or simply overwrite by refetching) on an explicit update — a
 *      `jobUpdated` event, a sync, a save — which is the "data update" half of
 *      the contract.
 *
 * NOT React Query, deliberately. These panels own their collections with
 * `useState` and mutate them optimistically in several places, so routing them
 * through a query cache would mean rewriting those paths — a much larger change
 * than the behaviour actually requires. The shared `QueryClient` stays the tool
 * for components that are already query-shaped.
 *
 * ⚠️ Keys MUST be namespaced per user (e.g. `tracker:${userId}`). This store is
 * process-wide, so a constant key would leak one account's data into another's
 * session if the user signed out and back in without a full reload.
 */

const store = new Map<string, unknown>();

/** The value written for `key`, or undefined if absent (or cleared). */
export function readSessionCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

/** Store `value` under `key`, replacing any previous value. */
export function writeSessionCache<T>(key: string, value: T): void {
  store.set(key, value);
}

/** Drop one entry, or every entry when called with no key. */
export function clearSessionCache(key?: string): void {
  if (key === undefined) store.clear();
  else store.delete(key);
}
