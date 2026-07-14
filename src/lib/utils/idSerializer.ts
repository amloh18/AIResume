import mongoose from 'mongoose';

export function serializeId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toHexString();
  if (value.toString && typeof value.toString === 'function' && !(value instanceof Date)) return value.toString();
  if (value._id) return serializeId(value._id);
  if (value.id) return serializeId(value.id);
  return undefined;
}
