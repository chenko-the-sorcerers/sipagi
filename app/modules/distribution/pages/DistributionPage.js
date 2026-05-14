import { LoadingCard } from '../../../shared/components/ModuleComponents.js';
import { Icon } from '../../../shared/components/Icon.js';
import { createDispatchOrder, getDistributionState, getDistributionSummary, updateDispatchStatus } from '../services/distributionApi.js';

const pageState = { activeView: 'overview', loading: true, error: '', query: '', modal: null, toast: '', state: { dispatchOrders: [], deliveryReceipts: [], schools: [], incidents: [] } };
const views = [['overview', 'Overview'], ['route-board', 'Route Board'], ['driver', 'Driver / Kurir'], ['manifest', 'Manifest Sekolah'], ['receipt', 'Tanda Terima'], ['exception', 'Insiden']];
const demoDrivers = [
    { id: 'DRV-01', name: 'Budi Santoso', vehicle: 'Motor Box 01', status: 'siap', sla: 98, progress: '8/10' },
    { id: 'DRV-02', name: 'Siti Aminah', vehicle: 'Blind Van 02', status: 'berjalan', sla: 96, progress: '6/9' },
    { id: 'DRV-03', name: 'Andi Wijaya', vehicle: 'Motor Box 03', status: 'menunggu', sla: 94, progress: '0/7' }
];

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function tone(status = '') { const value = String(status).toLowerCase(); if (['terkirim', 'selesai', 'delivered'].includes(value)) return 'success'; if (['terlambat', 'late', 'insiden'].includes(value)) return 'danger'; if (['menunggu', 'pending'].includes(value)) return 'warning'; return 'primary'; }
function schoolName(schoolId) { const school = pageState.state.schools.find((row) => String(row.school_id || row.id) === String(schoolId)); return school?.name || school?.school_name || schoolId || '-'; }
function dispatches() { const q = pageState.query.trim().toLowerCase(); return (pageState.state.dispatchOrders || []).filter((row) => !q || [row.dispatch_id, row.route_code, row.driver_user_id, row.status, schoolName(row.school_id)].join(' ').toLowerCase().includes(q)); }

function renderStats() {
    const summary = getDistributionSummary(pageState.state);
    const cards = [['Manifest Hari Ini', summary.total, 'Surat jalan aktif', 'truck'], ['Berjalan', summary.berjalan, 'Dalam perjalanan', 'sync'], ['Terkirim', summary.terkirim, 'Sudah diterima sekolah', 'shield'], ['Terlambat / Insiden', summary.terlambat + summary.insiden, 'Butuh tindak lanjut', 'bell']];
    return `<div class="erp-grid distribution-stat-grid">${cards.map(([label, value, note, icon]) => `<article class="erp-card distribution-stat-card"><span>${Icon(icon, 'sipagi-icon-svg')}</span><div><div class="erp-stat-label">${esc(label)}</div><div class="erp-stat-value">${esc(value)}</div><div class="erp-stat-note">${esc(note)}</div></div></article>`).join('')}</div>`;
}

function renderNav() { return `<div class="inventory-view-tabs distribution-tabs">${views.map(([id, label]) => `<button class="inventory-tab ${pageState.activeView === id ? 'active' : ''}" data-distribution-view="${id}" type="button">${esc(label)}</button>`).join('')}</div>`; }
function renderToolbar() { return `<section class="kt-card kt-card-border shadow-none distribution-toolbar"><div class="erp-field"><label>Cari rute / driver / sekolah</label><input class="erp-input" data-distribution-search value="${esc(pageState.query)}" placeholder="Cari manifest..."></div><div class="distribution-toolbar-actions"><button class="kt-btn kt-btn-outline kt-btn-sm" data-action="refresh-distribution" type="button">${Icon('sync', 'size-4')} Refresh</button><button class="kt-btn kt-btn-primary kt-btn-sm" data-action="new-dispatch" type="button">${Icon('truck', 'size-4')} Buat Manifest</button></div></section>`; }

function renderDispatchTable(rows = dispatches()) {
    return `<div class="erp-table-wrap module-card-gap"><table class="erp-table"><thead><tr><th>Manifest</th><th>Sekolah</th><th>Driver</th><th>Rute</th><th>Porsi</th><th>ETA</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map((row) => `<tr><td><button class="link-button" data-distribution-detail="${esc(row.dispatch_id)}" type="button">${esc(row.dispatch_id || '-')}</button></td><td>${esc(schoolName(row.school_id))}</td><td>${esc(row.driver_user_id || '-')}</td><td>${esc(row.route_code || '-')}</td><td>${esc(row.portion_qty || 0)}</td><td>${esc(row.eta || '-')}</td><td><span class="kt-badge kt-badge-sm kt-badge-light kt-badge-${tone(row.status)}">${esc(row.status || 'berjalan')}</span></td><td><button class="kt-btn kt-btn-sm kt-btn-outline" data-distribution-status="${esc(row.dispatch_id)}" data-next-status="terkirim" type="button">Terkirim</button></td></tr>`).join('') || '<tr><td colspan="8">Belum ada manifest distribusi.</td></tr>'}</tbody></table></div>`;
}

function renderRouteBoard() {
    const rows = dispatches();
    return `<section class="kt-card kt-card-border shadow-none"><div class="kt-card-header"><div><h3 class="kt-card-title">Route Board Distribusi MBG</h3><p class="kt-card-description">Pantau pengiriman dari dapur SPPG ke sekolah.</p></div></div><div class="kt-card-content"><div class="distribution-route-map"><div class="distribution-hub"><strong>Dapur SPPG</strong><span>Loading area</span></div><div class="distribution-route-line"></div>${rows.slice(0, 4).map((row, index) => `<button class="distribution-school-node" style="--i:${index}" data-distribution-detail="${esc(row.dispatch_id)}" type="button"><strong>${esc(schoolName(row.school_id))}</strong><span>${esc(row.route_code || '-')} · ${esc(row.status || 'berjalan')}</span></button>`).join('')}</div>${renderDispatchTable(rows)}</div></section>`;
}

function renderDrivers() {
    return `<div class="courier-grid distribution-driver-grid">${demoDrivers.map((driver) => `<button class="courier-card distribution-driver-card" type="button"><div class="courier-profile"><div class="courier-avatar">${esc(driver.name.split(' ').map((part) => part[0]).join('').slice(0, 2))}</div><div class="courier-info"><h3>${esc(driver.name)}</h3><div class="courier-id">${esc(driver.id)}</div><div class="vehicle-tag">${Icon('truck', 'size-4')} ${esc(driver.vehicle)}</div></div></div><div class="performance-stats"><div class="stat-item"><label>SLA</label><div>${driver.sla}%</div></div><div class="stat-item"><label>Progress</label><div>${esc(driver.progress)}</div></div></div><span class="kt-badge kt-badge-light kt-badge-${driver.status === 'berjalan' ? 'primary' : 'success'}">${esc(driver.status)}</span></button>`).join('')}</div>`;
}

function renderReceipts() {
    const rows = pageState.state.deliveryReceipts || [];
    return `<section class="kt-card kt-card-border shadow-none"><div class="kt-card-header"><h3 class="kt-card-title">Tanda Terima Sekolah</h3></div><div class="kt-card-content"><div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>Receipt</th><th>Sekolah</th><th>Qty</th><th>Diterima Oleh</th><th>Waktu</th><th>Feedback</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(row.receipt_id)}</td><td>${esc(schoolName(row.school_id))}</td><td>${esc(row.received_qty)}</td><td>${esc(row.received_by || '-')}</td><td>${esc(row.received_at || '-')}</td><td>${esc(row.feedback_status || '-')}</td></tr>`).join('') || '<tr><td colspan="6">Belum ada tanda terima.</td></tr>'}</tbody></table></div></div></section>`;
}

function renderExceptions() {
    const rows = pageState.state.incidents || [];
    return `<section class="kt-card kt-card-border shadow-none"><div class="kt-card-header"><h3 class="kt-card-title">Insiden Distribusi</h3></div><div class="kt-card-content"><div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>Insiden</th><th>Sekolah</th><th>Tipe</th><th>Severity</th><th>Status</th><th>Catatan</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(row.incident_id)}</td><td>${esc(schoolName(row.school_id))}</td><td>${esc(row.type)}</td><td>${esc(row.severity)}</td><td>${esc(row.status)}</td><td>${esc(row.description)}</td></tr>`).join('') || '<tr><td colspan="6">Belum ada insiden.</td></tr>'}</tbody></table></div></div></section>`;
}

function renderActiveView() {
    if (pageState.activeView === 'driver') return renderDrivers();
    if (pageState.activeView === 'manifest') return `<section class="kt-card kt-card-border shadow-none"><div class="kt-card-header"><h3 class="kt-card-title">Manifest Sekolah</h3></div><div class="kt-card-content">${renderDispatchTable()}</div></section>`;
    if (pageState.activeView === 'receipt') return renderReceipts();
    if (pageState.activeView === 'exception') return renderExceptions();
    return renderRouteBoard();
}

function renderModal() {
    if (!pageState.modal) return '';
    if (pageState.modal === 'new') {
        return `<div class="sipagi-modal-backdrop" data-distribution-close><div class="sipagi-detail-modal settings-config-modal" role="dialog" aria-modal="true"><form data-distribution-form><div class="sipagi-detail-modal-header"><div><h3>Buat Manifest Distribusi</h3><p>Jadwalkan pengiriman makanan MBG dari dapur ke sekolah.</p></div><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-distribution-close>Tutup</button></div><div class="settings-config-body"><label class="erp-field"><span>Sekolah</span><select class="erp-select" name="school_id">${(pageState.state.schools || []).map((school) => `<option value="${esc(school.school_id || school.id)}">${esc(school.name || school.school_name)}</option>`).join('') || '<option value="">Sekolah tujuan</option>'}</select></label><label class="erp-field"><span>Driver</span><input class="erp-input" name="driver_name" placeholder="Nama driver"></label><label class="erp-field"><span>Kode Rute</span><input class="erp-input" name="route_code" placeholder="RUTE-A"></label><label class="erp-field"><span>Jumlah Porsi</span><input class="erp-input" name="portion_qty" type="number" min="0"></label><label class="erp-field full"><span>ETA</span><input class="erp-input" name="eta" type="datetime-local"></label></div><div class="sipagi-detail-actions"><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-distribution-close>Batal</button><button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan Manifest</button></div></form></div></div>`;
    }
    const row = dispatches().find((item) => String(item.dispatch_id) === String(pageState.modal));
    if (!row) return '';
    return `<div class="sipagi-modal-backdrop" data-distribution-close><div class="sipagi-detail-modal settings-config-modal" role="dialog" aria-modal="true"><div class="sipagi-detail-modal-header"><div><h3>Detail Manifest ${esc(row.dispatch_id)}</h3><p>${esc(schoolName(row.school_id))}</p></div><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-distribution-close>Tutup</button></div><div class="distribution-detail-grid"><div><span>Rute</span><strong>${esc(row.route_code || '-')}</strong></div><div><span>Driver</span><strong>${esc(row.driver_user_id || '-')}</strong></div><div><span>Porsi</span><strong>${esc(row.portion_qty || 0)}</strong></div><div><span>Status</span><strong>${esc(row.status || 'berjalan')}</strong></div><div><span>ETA</span><strong>${esc(row.eta || '-')}</strong></div><div><span>Delivered At</span><strong>${esc(row.delivered_at || '-')}</strong></div></div><div class="sipagi-detail-actions"><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-distribution-close>Tutup</button><button class="kt-btn kt-btn-sm kt-btn-primary" data-distribution-status="${esc(row.dispatch_id)}" data-next-status="terkirim" type="button">Tandai Terkirim</button></div></div></div>`;
}

function renderContent() {
    const root = document.getElementById('distribution-root');
    if (!root) return;
    if (pageState.loading) { root.innerHTML = LoadingCard({ title: 'Memuat Distribusi', text: 'Mengambil rute, manifest sekolah, tanda terima, dan insiden...' }); return; }
    if (pageState.error) { root.innerHTML = `<div class="erp-card inventory-error"><h3>Distribusi tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-distribution" type="button">Coba Lagi</button></div>`; return; }
    root.innerHTML = `${renderStats()}${renderNav()}${renderToolbar()}<div class="module-view-panel">${renderActiveView()}</div><div class="sipagi-toast safe ${pageState.toast ? '' : 'hidden'}">${esc(pageState.toast)}</div>${renderModal()}`;
}

async function loadDistribution() {
    pageState.loading = true; pageState.error = ''; renderContent();
    try { pageState.state = await getDistributionState(); } catch (error) { pageState.error = error.message || 'Data distribusi gagal dimuat.'; } finally { pageState.loading = false; renderContent(); }
}

function showToast(message) {
    pageState.toast = message; renderContent();
    window.setTimeout(() => { pageState.toast = ''; renderContent(); }, 1400);
}

function bindDistributionEvents() {
    document.addEventListener('input', (event) => {
        if (!document.getElementById('distribution-root')) return;
        if (event.target.matches('[data-distribution-search]')) { pageState.query = event.target.value; renderContent(); }
    });
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('distribution-root')) return;
        const view = event.target.closest('[data-distribution-view]');
        if (view) { pageState.activeView = view.dataset.distributionView; renderContent(); return; }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'refresh-distribution') { await loadDistribution(); return; }
        if (action === 'new-dispatch') { pageState.modal = 'new'; renderContent(); return; }
        const detail = event.target.closest('[data-distribution-detail]');
        if (detail) { pageState.modal = detail.dataset.distributionDetail; renderContent(); return; }
        if (event.target.closest('[data-distribution-close]')) { pageState.modal = null; renderContent(); return; }
        const status = event.target.closest('[data-distribution-status]');
        if (status) { await updateDispatchStatus(status.dataset.distributionStatus, status.dataset.nextStatus || 'terkirim'); pageState.modal = null; await loadDistribution(); showToast('Status distribusi diperbarui.'); }
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('distribution-root') || !event.target.matches('[data-distribution-form]')) return;
        event.preventDefault();
        await createDispatchOrder(Object.fromEntries(new FormData(event.target).entries()));
        pageState.modal = null; await loadDistribution(); showToast('Manifest distribusi berhasil dibuat.');
    });
}

let eventsBound = false;
export function DistributionPage() { return '<div id="distribution-root"></div>'; }
export function initDistributionPage(initialView = 'overview') {
    pageState.activeView = views.some(([id]) => id === initialView) ? initialView : 'overview';
    if (!eventsBound) { bindDistributionEvents(); eventsBound = true; }
    loadDistribution();
}
