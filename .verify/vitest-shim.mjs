/**
 * Minimal vitest shim — lets the real `*.test.ts` file run under plain Node when
 * the sandbox blocks vitest's config resolution (`loadEnv` reads `.env`).
 *
 * Deliberately small: only the matchers the repair-pass test uses. It is not a
 * vitest replacement, it is a way to execute the real assertions.
 */

const ASYM = Symbol('asymmetric');

function arrayContaining(sample) {
  return { [ASYM]: 'arrayContaining', sample };
}

function isAsymmetric(value) {
  return value && typeof value === 'object' && value[ASYM];
}

function deepEqual(a, b) {
  if (isAsymmetric(b)) {
    if (b[ASYM] === 'arrayContaining') {
      if (!Array.isArray(a)) return false;
      return b.sample.every((item) => a.some((candidate) => deepEqual(candidate, item)));
    }
    return false;
  }
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
}

function show(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * State lives on `globalThis`, not in module scope.
 *
 * esbuild inlines this shim into the bundle, so the runner and the test code
 * would otherwise hold two different module instances and the runner would
 * always read zero. A global is shared across that boundary.
 */
const GLOBAL_KEY = '__vitestShimState__';
if (!globalThis[GLOBAL_KEY]) {
  globalThis[GLOBAL_KEY] = { passed: 0, failed: 0, failures: [], pending: [] };
}
export const state = globalThis[GLOBAL_KEY];
if (!state.pending) state.pending = [];

function recordFailure(message) {
  state.failed += 1;
  state.failures.push(message);
  console.error(`  ✗ ${message}`);
}

/**
 * Each matcher is a predicate returning `{ ok, message }`. `expect(x)` and
 * `expect(x).not` share them; the negated form inverts `ok` and reports the
 * positive message, which is enough to diagnose a failure either way.
 */
function buildMatchers(actual, negated) {
  const run = (ok, describe) => {
    const finalOk = negated ? !ok : ok;
    if (finalOk) {
      state.passed += 1;
      return;
    }
    recordFailure(negated ? `not.${describe}` : describe);
  };

  return {
    toBe(expected) {
      run(actual === expected, `toBe: expected ${show(expected)}, got ${show(actual)}`);
    },
    toEqual(expected) {
      run(
        deepEqual(actual, expected),
        `toEqual:\n    expected ${show(expected)}\n    actual   ${show(actual)}`
      );
    },
    toHaveLength(expected) {
      run(
        actual?.length === expected,
        `toHaveLength: expected ${expected}, got ${actual?.length} (${show(actual)})`
      );
    },
    toContain(expected) {
      const ok = Array.isArray(actual)
        ? actual.some((item) => deepEqual(item, expected))
        : String(actual).includes(String(expected));
      run(ok, `toContain: ${show(expected)} not found in ${show(actual)}`);
    },
    toBeTruthy() {
      run(Boolean(actual), `toBeTruthy: got ${show(actual)}`);
    },
    toBeFalsy() {
      run(!actual, `toBeFalsy: got ${show(actual)}`);
    },
    toBeNull() {
      run(actual === null, `toBeNull: got ${show(actual)}`);
    },
    toBeDefined() {
      run(actual !== undefined, `toBeDefined: got ${show(actual)}`);
    },
    toBeUndefined() {
      run(actual === undefined, `toBeUndefined: got ${show(actual)}`);
    },
    toBeGreaterThan(expected) {
      run(
        typeof actual === 'number' && actual > expected,
        `toBeGreaterThan: ${show(actual)} is not > ${expected}`
      );
    },
    toBeCloseTo(expected, precision = 2) {
      const ok =
        typeof actual === 'number' &&
        Math.abs(actual - expected) < Math.pow(10, -precision) / 2;
      run(ok, `toBeCloseTo: ${show(actual)} is not close to ${show(expected)}`);
    },
    toBeLessThan(expected) {
      run(
        typeof actual === 'number' && actual < expected,
        `toBeLessThan: ${show(actual)} is not < ${expected}`
      );
    },
    toMatch(pattern) {
      const text = String(actual);
      const ok =
        pattern instanceof RegExp ? pattern.test(text) : text.includes(String(pattern));
      run(ok, `toMatch: ${show(pattern)} did not match ${show(text)}`);
    },
    toMatchObject(expected) {
      const subset = (target, source) => {
        if (source === null || typeof source !== 'object') return deepEqual(target, source);
        if (target === null || typeof target !== 'object') return false;
        return Object.keys(source).every((key) => subset(target[key], source[key]));
      };
      run(subset(actual, expected), `toMatchObject: ${show(actual)} vs ${show(expected)}`);
    },
    toStrictEqual(expected) {
      run(
        deepEqual(actual, expected),
        `toStrictEqual:\n    expected ${show(expected)}\n    actual   ${show(actual)}`
      );
    },
  };
}

export function expect(actual) {
  const matchers = buildMatchers(actual, false);
  return {
    ...matchers,
    not: buildMatchers(actual, true),
  };
}

expect.arrayContaining = arrayContaining;

export function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

export function it(name, fn) {
  const pass = () => console.log(`  ✓ ${name}`);
  const fail = (err) => recordFailure(`${name} — threw: ${err?.message || err}`);

  let result;
  try {
    result = fn();
  } catch (err) {
    fail(err);
    return;
  }

  // An `async` body resolves after `it` has returned, so its assertions would land *after*
  // the runner printed its tally. Hand the promise to the runner instead of dropping it.
  if (result && typeof result.then === 'function') {
    state.pending.push(result.then(pass, fail));
    return;
  }

  pass();
}
