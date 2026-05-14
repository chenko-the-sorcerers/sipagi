import {
    createDailyReport,
    createExportRequest,
    createMonthlyReport,
    getReportsState,
    getReportsSummaryFromState
} from '../services/reportsApi.js';
import { LoadingCard } from '../../../shared/components/ModuleComponents.js';

const pageState = { activeView: 'overview', loading: true, error: '', state: { dailyReports: [], monthlyReports: [], exports: [], dispatchOrders: [], productionBatches: [], wasteRecords: [], incidents: [], nutritionChecks: [] } };
const views = [
    { id: 'overview', label: 'Overview', description: 'Ringkasan laporan harian, dua mingguan, bulanan, stok, biaya porsi, dan waste.' },
    { id: 'lpj', label: 'LPJ', description: 'Laporan pertanggungjawaban program dengan ringkasan biaya, bukti, dan realisasi.' },
    { id: 'laporan-harian-sppg', label: 'Laporan Harian SPPG', description: 'Target, porsi terkirim, QC, waste, dan isu harian.' },
    { id: 'laporan-2-mingguan', label: 'Laporan 2 Mingguan', description: 'Ringkasan dua mingguan untuk LPJ.' },
    { id: 'laporan-bulanan', label: 'Laporan Bulanan', description: 'Ringkasan bulanan untuk Kepala SPPG/BGN.' },
    { id: 'laporan-stok', label: 'Laporan Stok', description: 'Ringkasan stok dan kartu bahan.' },
    { id: 'laporan-biaya-per-porsi', label: 'Laporan Biaya per Porsi', description: 'Biaya produksi per porsi.' },
    { id: 'laporan-selisih-waste', label: 'Laporan Selisih / Waste', description: 'Waste, selisih porsi, dan insiden.' },
    { id: 'daily', label: 'Laporan Harian', description: 'Target, porsi terkirim, QC, waste, dan isu harian.' },
    { id: 'monthly', label: 'Laporan Bulanan', description: 'Ringkasan JSON bulanan untuk Kepala SPPG/BGN.' },
    { id: 'exports', label: 'Export', description: 'Permintaan export PDF, CSV, atau XLSX.' },
    { id: 'dashboard', label: 'Dashboard Report', description: 'Ringkasan operasional dari modul lain.' }
];

const viewAliases = {
    'laporan-harian-sppg': 'daily',
    lpj: 'dashboard',
    'laporan-2-mingguan': 'dashboard',
    'laporan-bulanan': 'monthly',
    'laporan-stok': 'dashboard',
    'laporan-biaya-per-porsi': 'dashboard',
    'laporan-selisih-waste': 'dashboard'
};

function normalizeReportsView(view) {
    return viewAliases[view] || view || 'overview';
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function money(value) {
    return Number(value || 0).toLocaleString('id-ID');
}

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function renderStats() {
    const summary = getReportsSummaryFromState(pageState.state);
    const coverage = summary.target ? Math.round((summary.delivered / summary.target) * 100) : 0;
    const cards = [
        ['Laporan Harian', summary.dailyReports, 'Catatan operasional harian'],
        ['Porsi Terkirim', summary.delivered.toLocaleString('id-ID'), `${coverage}% dari target produksi`],
        ['Waste', `Rp ${money(summary.wasteValue)}`, `${summary.incidentCount} insiden tercatat`],
        ['Skor Gizi', Math.round(summary.avgNutritionScore), `${summary.monthlyReports} laporan bulanan`]
    ];
    return `<div class="erp-grid">${cards.map(([label, value, note]) => `<div class="erp-card"><div class="erp-stat-label">${label}</div><div class="erp-stat-value">${value}</div><div class="erp-stat-note">${note}</div></div>`).join('')}</div>`;
}

function renderViewNav() {
    return `<div class="inventory-view-grid">${views.map((view) => `<button class="inventory-view-card ${pageState.activeView === view.id ? 'active' : ''}" data-reports-view="${view.id}" type="button"><strong>${view.label}</strong><span>${view.description}</span></button>`).join('')}</div>`;
}

function renderActionBar() {
    return `<div class="inventory-action-bar"><button class="erp-btn primary" data-action="refresh-reports" type="button">Refresh Data</button><button class="erp-btn" data-jump-view="daily" type="button">Laporan Harian</button><button class="erp-btn" data-jump-view="monthly" type="button">Laporan Bulanan</button><button class="erp-btn" data-action="download-report-summary" type="button">Unduh Ringkasan CSV</button></div>`;
}

function renderDailyForm() {
    return `<form class="erp-card" data-reports-form="daily"><h3>Buat Laporan Harian</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Tanggal Laporan</label><input class="erp-input" name="report_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="erp-field"><label>Target Porsi</label><input class="erp-input" name="target_portion" type="number" min="0" required></div>
        <div class="erp-field"><label>Porsi Terkirim</label><input class="erp-input" name="delivered_portion" type="number" min="0" required></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="draft">Draft</option><option value="final">Final</option><option value="review">Review</option></select></div>
        <div class="erp-field full"><label>Ringkasan QC</label><textarea class="erp-textarea" name="qc_summary"></textarea></div>
        <div class="erp-field full"><label>Ringkasan Waste</label><textarea class="erp-textarea" name="waste_summary"></textarea></div>
        <div class="erp-field full"><label>Ringkasan Isu</label><textarea class="erp-textarea" name="issue_summary"></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Laporan Harian</button></div></form>`;
}

function renderMonthlyForm() {
    return `<form class="erp-card" data-reports-form="monthly"><h3>Buat Laporan Bulanan</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Periode</label><input class="erp-input" name="period" placeholder="2026-05" required></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="draft">Draft</option><option value="final">Final</option><option value="dikirim">Dikirim</option></select></div>
        <div class="erp-field full"><label>URL File</label><input class="erp-input" name="file_url" placeholder="Opsional"></div>
        <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Laporan Bulanan</button></div></form>`;
}

function renderExportForm() {
    return `<form class="erp-card" data-reports-form="export"><h3>Buat Permintaan Export</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Tipe Laporan</label><select class="erp-select" name="report_type"><option value="daily">Harian</option><option value="monthly">Bulanan</option><option value="finance">Finance</option><option value="inventory">Inventori</option></select></div>
        <div class="erp-field"><label>Format</label><select class="erp-select" name="format"><option value="csv">CSV</option><option value="xlsx">XLSX</option><option value="pdf">PDF</option></select></div>
        <div class="erp-field"><label>Diminta Oleh</label><input class="erp-input" name="requested_by" value="kepala_sppg"></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="diminta">Diminta</option><option value="diproses">Diproses</option><option value="selesai">Selesai</option></select></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Export</button></div></form>`;
}

function table(headers, rows, empty) {
    return `<div class="erp-table-wrap"><table class="erp-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
}

function renderActiveTable() {
    const activeView = normalizeReportsView(pageState.activeView);
    if (activeView === 'monthly') return table(['Periode', 'Status', 'File', 'Dibuat'], pageState.state.monthlyReports.slice(0, 12).map((row) => `<tr><td>${esc(row.period)}</td><td>${esc(row.status)}</td><td>${row.file_url ? `<a href="${esc(row.file_url)}" target="_blank">File</a>` : '-'}</td><td>${esc(row.created_at)}</td></tr>`).join(''), 'Belum ada laporan bulanan.');
    if (activeView === 'exports') return table(['Tipe', 'Format', 'Status', 'Peminta', 'Dibuat'], pageState.state.exports.slice(0, 12).map((row) => `<tr><td>${esc(row.report_type)}</td><td>${esc(row.format)}</td><td>${esc(row.status)}</td><td>${esc(row.requested_by)}</td><td>${esc(row.created_at)}</td></tr>`).join(''), 'Belum ada export.');
    if (activeView === 'dashboard') return table(['Sumber', 'Indikator', 'Nilai', 'Catatan'], [
        `<tr><td>Operasional</td><td>Dispatch</td><td>${pageState.state.dispatchOrders.length}</td><td>Total surat jalan</td></tr>`,
        `<tr><td>Produksi</td><td>Batch</td><td>${pageState.state.productionBatches.length}</td><td>Total batch produksi</td></tr>`,
        `<tr><td>Food Safety</td><td>Insiden</td><td>${pageState.state.incidents.length}</td><td>Semua status insiden</td></tr>`,
        `<tr><td>Gizi</td><td>Cek Gizi</td><td>${pageState.state.nutritionChecks.length}</td><td>Total cek gizi</td></tr>`
    ].join(''), 'Belum ada data dashboard.');
    return table(['Tanggal', 'Target', 'Terkirim', 'QC', 'Waste', 'Isu', 'Status'], pageState.state.dailyReports.slice(0, 12).map((row) => `<tr><td>${esc(row.report_date)}</td><td>${esc(row.target_portion)}</td><td>${esc(row.delivered_portion)}</td><td>${esc(row.qc_summary)}</td><td>${esc(row.waste_summary)}</td><td>${esc(row.issue_summary)}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada laporan harian.');
}

function renderActiveView() {
    const activeView = normalizeReportsView(pageState.activeView);
    if (activeView === 'overview') return `<div class="erp-card"><h3>Overview Laporan</h3><div class="erp-grid"><article class="erp-card"><div class="erp-stat-label">Laporan Harian SPPG</div><div class="erp-stat-value">${pageState.state.dailyReports.length}</div><div class="erp-stat-note">Draft/final harian</div></article><article class="erp-card"><div class="erp-stat-label">Laporan Bulanan</div><div class="erp-stat-value">${pageState.state.monthlyReports.length}</div><div class="erp-stat-note">Periode terkumpul</div></article><article class="erp-card"><div class="erp-stat-label">Laporan Stok</div><div class="erp-stat-value">${pageState.state.wasteRecords.length}</div><div class="erp-stat-note">Waste dan selisih</div></article><article class="erp-card"><div class="erp-stat-label">Biaya per Porsi</div><div class="erp-stat-value">${pageState.state.productionBatches.length}</div><div class="erp-stat-note">Basis batch produksi</div></article></div>${renderActiveTable()}</div>`;
    if (activeView === 'monthly') return `${renderMonthlyForm()}<div class="erp-card module-card-gap"><h3>Laporan Bulanan</h3>${renderActiveTable()}</div>`;
    if (activeView === 'exports') return `${renderExportForm()}<div class="erp-card module-card-gap"><h3>Export</h3>${renderActiveTable()}</div>`;
    if (activeView === 'dashboard') return `<div class="erp-card"><h3>Dashboard Report</h3>${renderActiveTable()}</div>`;
    return `${renderDailyForm()}<div class="erp-card module-card-gap"><h3>Laporan Harian</h3>${renderActiveTable()}</div>`;
}

function renderReportsContent() {
    const root = document.getElementById('reports-root');
    if (!root) return;
    if (pageState.loading) { root.innerHTML = LoadingCard({ title: 'Memuat Reports dari Data', text: 'Mengambil laporan, export, dan ringkasan modul...' }); return; }
    if (pageState.error) { root.innerHTML = `<div class="erp-card inventory-error"><h3>Reports tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-reports" type="button">Coba Lagi</button></div>`; return; }
    root.innerHTML = `${renderStats()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadReports() {
    pageState.loading = true; pageState.error = ''; renderReportsContent();
    try { pageState.state = await getReportsState(); } catch (error) { pageState.error = error.message; } finally { pageState.loading = false; renderReportsContent(); }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    if (form.dataset.reportsForm === 'daily') await createDailyReport(payload);
    if (form.dataset.reportsForm === 'monthly') await createMonthlyReport(payload, pageState.state);
    if (form.dataset.reportsForm === 'export') await createExportRequest(payload);
    await loadReports();
}

function downloadReportSummary() {
    const rows = [['indikator', 'nilai'], ['daily_reports', pageState.state.dailyReports.length], ['monthly_reports', pageState.state.monthlyReports.length], ['dispatch_orders', pageState.state.dispatchOrders.length], ['incidents', pageState.state.incidents.length]];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ringkasan-report-sipagi-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function bindReportsEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('reports-root')) return;
        const viewButton = event.target.closest('[data-reports-view], [data-jump-view]');
        if (viewButton) { pageState.activeView = viewButton.dataset.reportsView || viewButton.dataset.jumpView; renderReportsContent(); return; }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'refresh-reports') await loadReports();
        if (action === 'download-report-summary') downloadReportSummary();
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('reports-root') || !event.target.matches('[data-reports-form]')) return;
        event.preventDefault();
        try { await handleSubmit(event.target); } catch (error) { window.alert(error.message); await loadReports(); }
    });
}

let eventsBound = false;

export function ReportsPage() {
    return '<div id="reports-root"></div>';
}

export function initReportsPage(initialView = 'overview') {
    pageState.activeView = views.some((view) => view.id === initialView) ? initialView : 'overview';
    if (!eventsBound) { bindReportsEvents(); eventsBound = true; }
    loadReports();
}
