import { getSession, refreshSessionCookie } from '../../lib/server/auth.js';
import { sendJson } from '../../lib/server/http.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
    return;
  }

  const session = await getSession(request);
  if (!session) {
    sendJson(response, 401, { ok: false, error: 'Sesi tidak valid atau sudah berakhir' });
    return;
  }

  refreshSessionCookie(response, session.token);
  sendJson(response, 200, { ok: true });
}
