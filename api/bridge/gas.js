import { requireApiAccess } from '../../lib/server/security.js';
import { readJson, sendJson } from '../../lib/server/http.js';

function gasEndpoint() {
  const endpoint = process.env.GAS_ENDPOINT;
  if (!endpoint) throw new Error('GAS bridge belum dikonfigurasi');
  return endpoint;
}

export default async function handler(request, response) {
  try {
    await requireApiAccess(request);

    if (request.method === 'GET') {
      const url = new URL(gasEndpoint());
      Object.entries(request.query || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.set(key, value);
      });
      const upstream = await fetch(url.toString());
      const payload = await upstream.json();
      sendJson(response, upstream.ok ? 200 : upstream.status, payload);
      return;
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const upstream = await fetch(gasEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      const payload = await upstream.json();
      sendJson(response, upstream.ok ? 200 : upstream.status, payload);
      return;
    }

    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
  } catch (error) {
    sendJson(response, error.statusCode || 401, { ok: false, error: error.message });
  }
}
