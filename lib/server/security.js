import { requireSession } from './auth.js';

const publicApiPaths = new Set(['/api/auth/login', '/api/auth/me', '/api/auth/logout']);

export function isPublicApiPath(request) {
  const url = new URL(request.url || '/', 'http://sipagi.local');
  return publicApiPaths.has(url.pathname);
}

export function hasApiPassword(request) {
  const expected = process.env.SIPAGI_API_PASSWORD || process.env.SIPAGI_DEMO_PASSWORD || '';
  if (!expected) return false;
  const provided = request.headers['x-sipagi-api-key'] || request.headers.authorization?.replace(/^Bearer\s+/i, '');
  return provided === expected;
}

export async function requireApiAccess(request) {
  if (isPublicApiPath(request)) return null;
  if (hasApiPassword(request)) return { apiKey: true };
  return requireSession(request);
}
