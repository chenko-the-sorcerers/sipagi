import { createSessionToken, setSessionCookie, verifyPassword } from '../../lib/server/auth.js';
import { prisma } from '../../lib/server/db.js';
import { findDemoAuthUser } from '../../lib/server/demoAuth.js';
import { findGasAuthUser } from '../../lib/server/gasAuth.js';
import { readJson, sendJson } from '../../lib/server/http.js';

function createAuthResponse(response, authUser, source) {
  const token = createSessionToken({
    provider: authUser.provider || source,
    userId: authUser.id,
    name: authUser.name,
    email: authUser.email,
    roleId: authUser.roleId,
    sppgId: authUser.sppgId
  });
  setSessionCookie(response, token);
  sendJson(response, 200, { ok: true, source, user: authUser });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms, null))
  ]);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
    return;
  }

  try {
    const { email, password } = await readJson(request);
    const demoUser = findDemoAuthUser(email, password);
    if (demoUser) {
      createAuthResponse(response, demoUser, 'demo');
      return;
    }

    let user = null;
    try {
      user = await withTimeout(prisma.user.findUnique({
        where: { email },
        include: { role: true, access: true }
      }), 1800);
    } catch {
      user = null;
    }

    if (user?.passwordHash && verifyPassword(password, user.passwordHash)) {
      const defaultAccess = user.access.find((row) => row.isDefault) || user.access[0];
      const token = createSessionToken({
        userId: user.id,
        roleId: defaultAccess?.roleId || user.roleId,
        sppgId: defaultAccess?.sppgId || user.sppgId
      });
      setSessionCookie(response, token);
      const sppg = defaultAccess?.sppgId || user.sppgId
        ? await prisma.sppgUnit.findUnique({ where: { id: defaultAccess?.sppgId || user.sppgId }, select: { id: true, code: true, name: true } })
        : null;

      sendJson(response, 200, {
        ok: true,
        source: 'neon',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: defaultAccess?.roleId || user.roleId,
          sppgId: defaultAccess?.sppgId || user.sppgId,
          sppgCode: sppg?.code || '',
          sppgName: sppg?.name || ''
        }
      });
      return;
    }

    const gasUser = await withTimeout(findGasAuthUser(email, password), 2500);
    if (gasUser) {
      createAuthResponse(response, gasUser, 'gas');
      return;
    }

    sendJson(response, 401, { ok: false, error: 'Email atau password tidak sesuai' });
  } catch (error) {
    sendJson(response, 401, { ok: false, error: 'Email atau password tidak sesuai' });
  }
}
