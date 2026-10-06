import fs from 'node:fs';
import path from 'node:path';

/**
 * Walk up from `startDir` looking for `relativePath`, returning the first directory that contains it.
 *
 * Why this exists: the app no longer runs with the repository root as its working directory. The app
 * lives in `apps/airesume_app/` while repository-level directories — `docs/`, `scripts/` — stay at the root.
 * A lookup written as `path.join(process.cwd(), 'docs', 'x.md')` silently stops finding its file when
 * the working directory moves, and nothing fails: no type error, no lint error, no test failure. The
 * caller just quietly falls through to a fallback path.
 *
 * In the production image the app is flattened back to `/app` with no `docs/` or `scripts/` beside it,
 * so callers must still handle `null`.
 *
 * @returns the absolute path of the containing directory, or `null` when nothing matches.
 */
export function findUpDir(
  relativePath: string,
  startDir: string = process.cwd(),
  maxLevels: number = 4
): string | null {
  let dir = path.resolve(startDir);

  for (let level = 0; level <= maxLevels; level += 1) {
    if (fs.existsSync(path.join(dir, relativePath))) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached the filesystem root
    dir = parent;
  }

  return null;
}
