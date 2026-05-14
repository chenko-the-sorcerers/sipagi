const sessionStorageKey = 'sipagi.session.user';
const activityStorageKey = 'sipagi.session.lastActivityAt';
const idleLimitMs = 60 * 60 * 1000;
const heartbeatIntervalMs = 5 * 60 * 1000;
const activityWriteIntervalMs = 30 * 1000;
let lastHeartbeatAt = 0;
let lastActivityWriteAt = 0;

async function request(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error('API auth belum aktif. Jalankan npm run dev:local atau Vercel dev, bukan static server.');
    }
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Permintaan auth gagal');
    return payload;
}

export function getCachedSessionUser() {
    try {
        return JSON.parse(localStorage.getItem(sessionStorageKey) || 'null');
    } catch {
        return null;
    }
}

export function cacheSessionUser(user) {
    try {
        if (user) {
            localStorage.setItem(sessionStorageKey, JSON.stringify(user));
            markSessionActivity();
        } else {
            localStorage.removeItem(sessionStorageKey);
            localStorage.removeItem(activityStorageKey);
        }
    } catch {
        // UI can continue without local cache.
    }
}

export function markSessionActivity({ sync = false } = {}) {
    const now = Date.now();
    try {
        if (!lastActivityWriteAt || now - lastActivityWriteAt > activityWriteIntervalMs) {
            localStorage.setItem(activityStorageKey, String(now));
            lastActivityWriteAt = now;
        }
    } catch {
        // Idle tracking is best-effort when browser storage is blocked.
    }

    if (!sync || now - lastHeartbeatAt < heartbeatIntervalMs) return;
    lastHeartbeatAt = now;
    request('/api/auth/heartbeat', { method: 'POST' }).catch(() => {});
}

export function isSessionIdleExpired() {
    try {
        const lastActivityAt = Number(localStorage.getItem(activityStorageKey) || 0);
        return Boolean(lastActivityAt && Date.now() - lastActivityAt > idleLimitMs);
    } catch {
        return false;
    }
}

export async function getCurrentSession() {
    if (isSessionIdleExpired()) {
        cacheSessionUser(null);
        await request('/api/auth/logout', { method: 'POST' }).catch(() => null);
        return { ok: true, authenticated: false, reason: 'idle_timeout' };
    }

    const payload = await request('/api/auth/me');
    cacheSessionUser(payload.authenticated ? payload.user : null);
    return payload;
}

export async function login(email, password) {
    const payload = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    cacheSessionUser(payload.user);
    return payload.user;
}

export async function signup(payload) {
    const responsePayload = await request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    cacheSessionUser(responsePayload.user);
    return responsePayload.user;
}

export async function logout() {
    cacheSessionUser(null);
    request('/api/auth/logout', { method: 'POST' }).catch(() => {});
}
