import mongoose from 'mongoose';

/**
 * Dual-shape id filters for `Schema.Types.Mixed` paths (SB-06).
 *
 * ## The trap
 *
 * `Schema.Types.Mixed` **disables Mongoose casting**. On a normal `ObjectId` path, querying with a
 * 24-hex *string* still matches, because Mongoose casts the query value for you. On a `Mixed` path it
 * does not: the value is compared as-is, so a string query never matches a stored `ObjectId` and vice
 * versa. Nothing throws and nothing logs — the query just returns fewer rows.
 *
 * That silent under-match is the dangerous part. `JobApplication.findOne({ _id, userId })` returning
 * `null` reads as "not found" (a 404, or a freshly created duplicate) rather than "wrong type".
 *
 * ## Measured on production, 2026-09-27
 *
 * | Path | Stored shapes | Consequence of a single-shape query |
 * | --- | --- | --- |
 * | `jobapplications.userId` | objectId **84**, string **15** | either shape misses rows |
 * | `applicationjourneys.userId` | string **194**, objectId **1** | an ObjectId query misses 194 |
 * | `applicationqueues.userId` | string **52**, objectId **1** | an ObjectId query misses 52 |
 * | `applicationqueues.applicationId` | objectId 53 | currently uniform, still uncast |
 * | `applicationqueues.jobId` | string 53 | currently uniform, still uncast |
 * | `applicationevents.applicationId` / `.userId` | objectId 201 | currently uniform |
 * | `usersettings.userId` | string 41 | currently uniform |
 *
 * Every stored string was a valid 24-hex ObjectId, so the split is pure type drift — not a semantic
 * difference between "user" ids. Which is exactly why it is invisible: both shapes mean the same thing
 * and only one of them is found.
 *
 * ## Usage
 *
 *     JobApplication.find({ userId: mixedIdFilter(userId) })
 *     JobApplication.findOne({ _id: applicationId, userId: mixedIdFilter(userId) })
 *
 * Always use this on a `Mixed` id path rather than a bare equality value. `{ $in: [x] }` matches
 * exactly what `{ $eq: x }` would, so the filter is a drop-in that only ever *adds* matches — it
 * cannot make a previously-correct query wrong.
 *
 * Paths to check before adding a new one: `grep -rn "Schema.Types.Mixed" src/models`.
 */

/** The two shapes a `Mixed` id path can hold. */
export type MixedIdShape = string | mongoose.Types.ObjectId;

/**
 * Every shape `id` could have been stored as.
 *
 * - `null` / `undefined` / `''` → `[]` (matches nothing, which is the correct answer for a missing id)
 * - a valid ObjectId (as `ObjectId` or 24-hex string) → **both** `ObjectId` and its string form
 * - anything else (a legacy non-ObjectId id) → the string alone, unchanged
 */
export function idShapes(id: unknown): MixedIdShape[] {
  if (id === null || id === undefined) return [];

  if (id instanceof mongoose.Types.ObjectId) {
    return [id, id.toString()];
  }

  const raw = String(id);
  if (!raw) return [];
  if (!mongoose.Types.ObjectId.isValid(raw)) return [raw];

  const objectId = new mongoose.Types.ObjectId(raw);
  // Round-tripping matters: `ObjectId.isValid` accepts 12-char strings too, and `new ObjectId(x)
  // .toString()` can differ from `x` in that case. Querying both forms covers either storage.
  return raw === objectId.toString() ? [raw, objectId] : [raw, objectId.toString(), objectId];
}

/**
 * A filter matching `id` in **every** shape it may have been stored as.
 *
 * Drop-in for a bare equality value on a `Mixed` path.
 */
export function mixedIdFilter(id: unknown): { $in: MixedIdShape[] } {
  return { $in: idShapes(id) };
}

/** True when `id` is something worth querying with — guards against `$in: []` surprises. */
export function hasUsableId(id: unknown): boolean {
  return idShapes(id).length > 0;
}
