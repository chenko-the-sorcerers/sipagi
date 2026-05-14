import crypto from 'node:crypto';
import { prisma } from './db.js';

const COOKIE_NAME = 'sipagi_session';
const SESSION_IDLE_SECONDS = 60 * 60;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', process.env.AUTH_SECRET || 'sipagi-dev-secret').update(value).digest('base64url');
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

export function verifyPassword(password, stored = '') {
  const [method, iterations, salt, expected] = stored.split('$');
  if (method !== 'pbkdf2_sha256' || !salt || !expected) return false;
  const hash = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256').toString('hex');
  return timingSafeEqual(hash, expected);
}

export function createSessionToken(payload) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_IDLE_SECONDS
  };
  const encoded = base64url(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(request) {
  const cookieHeader = request.headers.cookie || '';
  return cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) || '';
}

export function verifySessionToken(token = '') {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature || !timingSafeEqual(signature, sign(encoded))) return null;
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function setSessionCookie(response, token) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_IDLE_SECONDS}`);
}

export function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function getSession(request) {
  const token = readSessionToken(request);
  const payload = verifySessionToken(token);
  if (!payload?.userId) return null;
  if (payload.provider === 'gas' || payload.provider === 'demo') {
    return {
      user: {
        id: payload.userId,
        name: payload.name || 'User SIPAGI',
        email: payload.email || '',
        roleId: payload.roleId,
        sppgId: payload.sppgId,
        status: 'active',
        access: [{ roleId: payload.roleId, sppgId: payload.sppgId, isDefault: true }],
        role: { id: payload.roleId, name: payload.roleId }
      },
      token: payload
    };
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true, access: true, sppg: true }
  });
  if (!user || user.status !== 'active') return null;
  return { user, token: payload };
}

export function refreshSessionCookie(response, payload) {
  const { exp, ...renewablePayload } = payload || {};
  setSessionCookie(response, createSessionToken(renewablePayload));
}

export async function requireSession(request) {
  const session = await getSession(request);
  if (!session) {
    const error = new Error('Sesi tidak valid atau sudah berakhir');
    error.statusCode = 401;
    throw error;
  }
  return session;
}
