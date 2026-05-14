import { login, signup } from '../../../shared/auth/sessionClient.js';
import { setActiveRoleId, toDashboardRoleId } from '../../../shared/auth/permissionStore.js?v=settings-sidebar-20260511';

const landingPageUrl = 'file:///Users/marchelandrianshevchenko/Documents/New%20project/sipagi-landing/index.html';

const state = {
    mode: 'login',
    loading: false,
    error: '',
    email: 'kepala@sipagi.local',
    password: '',
    showPassword: false,
    showSignupPassword: false,
    showSignupConfirm: false,
    signup: { registrationToken: '', sppgName: '', region: '', address: '', headName: '', email: '', phone: '', password: '', confirmPassword: '' }
};

const demoAccounts = [
    ['Kepala SPPG', 'kepala@sipagi.local'],
    ['Ahli Gizi', 'ahli.gizi@sipagi.local'],
    ['Distribusi', 'distribusi@sipagi.local'],
    ['Developer', 'developer@sipagi.local']
];

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function normalizeToken(value) {
    return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseRegisterTokenFromHash() {
    const raw = decodeURIComponent(String(window.location.hash || '').replace('#', ''));
    const [, token = ''] = raw.split('/');
    if (/^SIPAGI-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(token)) state.signup.registrationToken = token;
}

function syncModeFromHash() {
    const route = String(window.location.hash || '').replace('#', '');
    if (route.startsWith('register-sppg')) {
        state.mode = 'register-sppg';
        parseRegisterTokenFromHash();
        return;
    }
    state.mode = 'login';
}

function passwordReport(password, context = state.signup) {
    const value = String(password || '');
    if (!value && !context.confirmPassword) return null;
    const checks = [
        { ok: value.length >= 8, label: '8+ karakter' },
        { ok: /[A-Z]/.test(value), label: 'Huruf kapital' },
        { ok: /[0-9]/.test(value), label: 'Angka' },
        { ok: /[^A-Za-z0-9]/.test(value), label: 'Simbol' }
    ];
    const normalizedPassword = normalizeToken(value).replace(/\s+/g, '');
    const protectedTokens = [context.sppgName, context.region, context.address, context.headName, context.email?.split('@')[0]]
        .flatMap((item) => normalizeToken(item).split(/\s+/))
        .filter((token) => token.length >= 4);
    checks.push({ ok: !protectedTokens.some((token) => normalizedPassword.includes(token)), label: 'Tidak pakai identitas SPPG' });
    const passed = checks.filter((check) => check.ok).length;
    return { checks, strength: passed === checks.length ? 'secure' : passed >= 3 ? 'normal' : 'weak', passed };
}

function tokenIsValid(token) {
    return /^SIPAGI-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(String(token || '').trim());
}

function logo() {
    return '<img class="sipagi-logo" src="./assets/images/sipagi-logo.png" alt="SIPAGI ERP Suite">';
}

export function LoginPage() {
    syncModeFromHash();
    return authShell(
        state.mode === 'register-sppg' ? renderSppgRegistrationForm() : renderLoginForm(),
        state.mode === 'register-sppg' ? 'Daftarkan SPPG dengan token' : 'Masuk ke ERP SIPAGI',
        state.mode === 'register-sppg'
            ? 'Token dibuat dari portal berlangganan. Setelah token valid, workspace ERP SPPG baru akan dibuat.'
            : 'Gunakan akun role yang sudah aktif untuk masuk ke dashboard operasional.'
    );
}

function authShell(form, title, subtitle) {
    const loginActive = state.mode === 'login' ? 'active' : '';
    const registerActive = state.mode === 'register-sppg' ? 'active' : '';
    return `
        <main class="sipagi-login-screen">
            <section class="sipagi-login-panel">
                <div class="sipagi-login-card">
                    <div class="sipagi-auth-logo">
                        <div class="sipagi-auth-brand">${logo()}<span><strong>SIPAGI</strong><small>ERP Suite</small></span></div>
                        <span>ERP Workspace</span>
                    </div>
                    <div class="sipagi-login-copy"><span>SIPAGI ERP</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>
                    ${form}
                    <div class="sipagi-auth-switch">
                        <button class="${loginActive}" type="button" data-auth-mode="login">Login ERP</button>
                        <button class="${registerActive}" type="button" data-auth-mode="register-sppg">Daftar SPPG</button>
                        <a href="${landingPageUrl}">Portal Berlangganan</a>
                    </div>
                </div>
            </section>
        </main>
    `;
}

function renderLoginForm() {
    return `
        <form class="sipagi-login-form" data-login-form>
            <label><span>Email</span><input name="email" type="email" autocomplete="username" value="${esc(state.email)}" placeholder="nama@sipagi.local" required></label>
            <label><span>Password</span><div class="sipagi-password-field"><input name="password" type="${state.showPassword ? 'text' : 'password'}" autocomplete="current-password" value="${esc(state.password)}" placeholder="Password SIPAGI" required><button type="button" data-toggle-password>${state.showPassword ? 'Sembunyikan' : 'Lihat'}</button></div></label>
            <div class="sipagi-login-error ${state.error ? '' : 'hidden'}">${esc(state.error)}</div>
            <button class="kt-btn kt-btn-primary sipagi-login-submit" type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? '<span class="sipagi-dot-loader"><i></i><i></i><i></i></span>' : 'Masuk ke ERP'}</button>
            <div class="sipagi-demo-accounts"><span>Akun uji cepat</span><div>${demoAccounts.map(([label, email]) => `<button type="button" data-demo-email="${esc(email)}"><strong>${esc(label)}</strong><small>${esc(email)}</small></button>`).join('')}</div><p>Password demo: <strong>@Sipagi2026</strong></p></div>
        </form>
    `;
}

function renderPasswordMeter() {
    const report = passwordReport(state.signup.password);
    if (!report) return '';
    const matchVisible = Boolean(state.signup.confirmPassword);
    const match = matchVisible && state.signup.password === state.signup.confirmPassword;
    return `<div class="sipagi-password-meter ${report.strength}"><div class="sipagi-password-meter-head"><span>Kekuatan password</span><strong>${report.strength === 'secure' ? 'Secure' : report.strength === 'normal' ? 'Normal' : 'Weak'}</strong></div><div class="sipagi-password-track"><span style="width:${Math.max(20, Math.round((report.passed / report.checks.length) * 100))}%"></span></div><div class="sipagi-password-checks">${report.checks.map((check) => `<span class="${check.ok ? 'ok' : ''}">${check.ok ? '✓' : '•'} ${check.label}</span>`).join('')}${matchVisible ? `<span class="${match ? 'ok' : ''}">${match ? '✓' : '•'} Konfirmasi cocok</span>` : ''}</div></div>`;
}

function renderSppgRegistrationForm() {
    return `
        <form class="sipagi-login-form sipagi-signup-form" data-signup-form>
            <label><span>Token Pendaftaran</span><input name="registrationToken" value="${esc(state.signup.registrationToken)}" placeholder="SIPAGI-XXXX-XXXX" required></label>
            <label><span>Nama SPPG</span><input name="sppgName" value="${esc(state.signup.sppgName)}" placeholder="Contoh: SPPG Mertoyudan 1" required></label>
            <div class="sipagi-signup-grid"><label><span>Wilayah</span><input name="region" value="${esc(state.signup.region)}"></label><label><span>No. HP</span><input name="phone" value="${esc(state.signup.phone)}"></label></div>
            <label><span>Alamat</span><input name="address" value="${esc(state.signup.address)}" placeholder="Alamat dapur/unit SPPG"></label>
            <label><span>Nama Kepala SPPG</span><input name="headName" value="${esc(state.signup.headName)}" required></label>
            <label><span>Email Login Kepala SPPG</span><input name="email" type="email" value="${esc(state.signup.email)}" required></label>
            <div class="sipagi-signup-grid">
                <label><span>Password</span><div class="sipagi-password-field"><input name="password" type="${state.showSignupPassword ? 'text' : 'password'}" value="${esc(state.signup.password)}" placeholder="Contoh: @Sipagi2026" required><button type="button" data-toggle-signup-password="password">${state.showSignupPassword ? 'Sembunyikan' : 'Lihat'}</button></div></label>
                <label><span>Konfirmasi Password</span><div class="sipagi-password-field"><input name="confirmPassword" type="${state.showSignupConfirm ? 'text' : 'password'}" value="${esc(state.signup.confirmPassword)}" required><button type="button" data-toggle-signup-password="confirm">${state.showSignupConfirm ? 'Sembunyikan' : 'Lihat'}</button></div></label>
            </div>
            ${renderPasswordMeter()}
            <div class="sipagi-login-error ${state.error ? '' : 'hidden'}">${esc(state.error)}</div>
            <button class="kt-btn kt-btn-primary sipagi-login-submit" type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? '<span class="sipagi-dot-loader"><i></i><i></i><i></i></span>' : 'Buat Workspace ERP'}</button>
        </form>
    `;
}

function captureSignupForm() {
    const form = document.querySelector('[data-signup-form]');
    if (form) state.signup = { ...state.signup, ...Object.fromEntries(new FormData(form).entries()) };
}

function rerender(onSuccess) {
    document.getElementById('app').innerHTML = LoginPage();
    bindLoginPage(onSuccess);
}

export function bindLoginPage(onSuccess) {
    const form = document.querySelector('[data-login-form]');
    const signupForm = document.querySelector('[data-signup-form]');

    document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => {
        state.mode = button.dataset.authMode;
        state.error = '';
        window.location.hash = state.mode;
        rerender(onSuccess);
    }));

    document.querySelector('[data-toggle-password]')?.addEventListener('click', () => {
        const current = document.querySelector('[data-login-form]');
        if (current) { const data = new FormData(current); state.email = String(data.get('email') || ''); state.password = String(data.get('password') || ''); }
        state.showPassword = !state.showPassword;
        rerender(onSuccess);
    });

    document.querySelectorAll('[data-toggle-signup-password]').forEach((button) => button.addEventListener('click', () => {
        captureSignupForm();
        if (button.dataset.toggleSignupPassword === 'confirm') state.showSignupConfirm = !state.showSignupConfirm;
        else state.showSignupPassword = !state.showSignupPassword;
        rerender(onSuccess);
    }));

    document.querySelectorAll('[data-demo-email]').forEach((button) => button.addEventListener('click', () => { state.email = button.dataset.demoEmail; state.error = ''; rerender(onSuccess); }));

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        state.email = String(data.get('email') || ''); state.password = String(data.get('password') || ''); state.loading = true; state.error = ''; rerender(onSuccess);
        try { const user = await login(data.get('email'), data.get('password')); sessionStorage.removeItem('sipagi.dashboard.sessionView'); state.loading = false; setActiveRoleId(toDashboardRoleId(user.roleId)); onSuccess?.(user); }
        catch { state.error = 'Email atau password tidak sesuai.'; state.loading = false; rerender(onSuccess); }
    });

    signupForm?.addEventListener('input', (event) => {
        if (!event.target.name) return;
        state.signup[event.target.name] = event.target.value;
        if (['password', 'confirmPassword', 'sppgName', 'region', 'address', 'headName', 'email'].includes(event.target.name)) {
            const meter = document.querySelector('.sipagi-password-meter');
            const html = renderPasswordMeter();
            if (meter && html) meter.outerHTML = html;
            if (!meter && html) event.target.closest('form')?.querySelector('.sipagi-login-error')?.insertAdjacentHTML('beforebegin', html);
        }
    });

    signupForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(signupForm).entries());
        state.signup = { ...state.signup, ...payload };
        const report = passwordReport(payload.password, payload);
        if (!tokenIsValid(payload.registrationToken)) { state.error = 'Token pendaftaran belum valid. Buat profil berlangganan di portal landing terlebih dahulu.'; rerender(onSuccess); return; }
        if (payload.password !== payload.confirmPassword) { state.error = 'Konfirmasi password belum sama.'; rerender(onSuccess); return; }
        if (report?.strength !== 'secure') { state.error = 'Password belum aman. Gunakan simbol, angka, huruf kapital, minimal 8 karakter, dan jangan mengandung identitas SPPG.'; rerender(onSuccess); return; }
        state.loading = true; state.error = ''; rerender(onSuccess);
        try { const user = await signup(payload); sessionStorage.removeItem('sipagi.dashboard.sessionView'); state.loading = false; setActiveRoleId(toDashboardRoleId(user.roleId)); onSuccess?.(user); }
        catch (error) { state.error = error.message || 'Pendaftaran belum bisa diproses.'; state.loading = false; rerender(onSuccess); }
    });
}
