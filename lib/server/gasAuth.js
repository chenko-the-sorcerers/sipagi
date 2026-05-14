import { getSheetRows } from '../../app/shared/services/googleSheetsApi.js';
import { verifyPassword } from './auth.js';

function parseAuthUsers(rows = []) {
  const row = rows.find((entry) => entry.key === 'auth_demo_users');
  if (!row?.value) return [];
  try {
    return JSON.parse(row.value);
  } catch {
    return [];
  }
}

export async function findGasAuthUser(email, password) {
  const result = await getSheetRows('settings');
  const users = parseAuthUsers(result.rows || []);
  const user = users.find((entry) => String(entry.email || '').toLowerCase() === String(email || '').toLowerCase());
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) return null;
  return {
    id: user.id || `gas:${user.email}`,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    sppgId: user.sppgId,
    provider: 'gas'
  };
}
