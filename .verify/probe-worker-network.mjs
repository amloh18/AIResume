// Can a container on dokploy-network reach the host services, and at which address?
//
// The app and the worker use DIFFERENT host addresses for the same two targets:
//   app    -> 172.17.0.1  (default `bridge` gateway)
//   worker -> 172.19.0.1  (server-mgmt-network gateway)
// Both containers are on dokploy-network (10.0.1.0/24, gw 10.0.1.1).
//
// Both targets bind 0.0.0.0, so every host address *should* work. This proves which ones do,
// from a container that is where the new Dokploy worker will be.

const urls = [
  'http://172.19.0.1:4001/health', // what the worker uses today
  'http://172.17.0.1:4001/health', // what the app uses today
  'http://10.0.1.1:4001/health',   // dokploy-network gateway — the migration-safe choice
  'http://172.19.0.1:8790/health',
  'http://10.0.1.1:8790/health',
];

const results = [];

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = (await res.text()).replace(/\s+/g, ' ').slice(0, 100);
    results.push({ url, ok: true, status: res.status, body });
  } catch (error) {
    results.push({ url, ok: false, error: error.message });
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  await Promise.all(urls.map(probe));
  for (const r of results) {
    if (r.ok) {
      console.log(`  OK   ${String(r.status).padEnd(4)} ${r.url.padEnd(32)} ${r.body}`);
    } else {
      console.log(`  FAIL      ${r.url.padEnd(32)} ${r.error}`);
    }
  }
})();
