import { getSession } from '../../lib/server/auth.js';
import { sendJson } from '../../lib/server/http.js';

export default async function handler(request, response) {
  const session = await getSession(request);
  if (!session) {
    sendJson(response, 200, { ok: true, authenticated: false });
    return;
  }

  const { user } = session;
  sendJson(response, 200, {
    ok: true,
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: session.token.roleId || user.roleId,
      sppgId: session.token.sppgId || user.sppgId,
      sppgCode: user.sppg?.code || session.token.sppgCode || '',
      sppgName: user.sppg?.name || session.token.sppgName || ''
    }
  });
}
