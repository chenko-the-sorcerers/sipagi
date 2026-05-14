import { sendJson, readJson } from '../../lib/server/http.js';

const contract = {
  name: 'SIPAGI Open API for BGN',
  version: '2026-05-14',
  authentication: {
    header: 'x-sipagi-api-key',
    note: 'Gunakan API key dari profil organisasi SIPAGI. Untuk local preview dapat memakai SIPAGI_OPEN_API_KEY.'
  },
  endpoints: [
    {
      method: 'POST',
      path: '/api/open/bgn',
      purpose: 'Menerima data agregat BGN atau mengirim snapshot SPPG ke BGN gateway.',
      body: {
        sppgCode: 'sppg_nakala',
        period: '2026-05',
        metrics: {
          targetPortion: 78000,
          deliveredPortion: 77340,
          qcPassRate: 98.2,
          wasteValue: 4850000
        },
        reports: [{ type: 'monthly', fileUrl: 'https://...' }]
      }
    }
  ]
};

function isAuthorized(request) {
  const expected = process.env.SIPAGI_OPEN_API_KEY || '@Sipagi2026';
  return request.headers['x-sipagi-api-key'] === expected;
}

export default async function handler(request, response) {
  if (request.method === 'GET') {
    sendJson(response, 200, { ok: true, contract });
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { ok: false, error: 'API key tidak valid' });
    return;
  }

  const payload = await readJson(request);
  sendJson(response, 202, {
    ok: true,
    status: 'accepted',
    receivedAt: new Date().toISOString(),
    bgnReference: `BGN-SIPAGI-${Date.now()}`,
    payload
  });
}
