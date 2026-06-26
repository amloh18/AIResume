import { validateEvent } from '@polar-sh/sdk/webhooks';

// We can convert Headers to Record<string, string> if needed:
function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

console.log('Helpers and types compiled successfully');
