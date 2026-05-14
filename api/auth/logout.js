import { clearSessionCookie } from '../../lib/server/auth.js';
import { sendJson } from '../../lib/server/http.js';

export default async function handler(request, response) {
  clearSessionCookie(response);
  sendJson(response, 200, { ok: true });
}
