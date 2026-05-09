import { DataTable, ErrorCard, escapeHtml as esc, formatMoney, formatNumber, LoadingCard, serializeForm, StatGrid, ViewTabs } from '../../../shared/components/ModuleComponents.js';
import { createBgnReport, createComplianceCheck, createRegionalKpi, getBgnState, getBgnSummaryFromState } from '../services/bgnApi.js';

const pageState = { activeView: 'monitoring', loading: true, error: '', state: { bgnReports: [], complianceChecks: [], regionalKpis: [], schools: [], dispatchOrders: [], incidents: [], wasteRecords: [] } };
const views = [
    { id: 'monitoring', label: 'Monitoring Agregat', description: 'Cakupan sekolah, porsi, insiden, dan waste.' },
    { id: 'compliance', label: 'Compliance', description: 'Pemeriksaan kepatuhan dan tindak lanjut.' },
    { id: 'regional', label: 'KPI Regional', description: 'KPI wilayah, on-time rate, QC pass rate.' },
    { id: 'reports', label: 'Laporan BGN', description: 'Laporan periodik untuk BGN.' }
];

function renderStats() {
    const summary = getBgnSummaryFromState(pageState.state);
    return StatGrid([
        { label: 'Sekolah', value: formatNumber(summary.schools), note: 'Sekolah tercakup' },
        { label: 'Porsi', value: formatNumber(summary.portions), note: 'Porsi tercatat dispatch' },
        { label: 'Compliance', value: Math.round(summary.complianceAverage), note: 'Rata-rata skor kepatuhan' },
        { label: 'Waste', value: formatMoney(summary.wasteValue), note: `${summary.incidentCount} insiden terlapor` }
    ]);
}

function renderActionBar() {
    return `<div class="inventory-action-bar"><button class="erp-btn primary" data-action="refresh-bgn" type="button">Refresh GAS</button><button class="erp-btn" data-jump-view="compliance" type="button">Input Compliance</button><button class="erp-btn" data-jump-view="regional" type="button">Input KPI</button><button class="erp-btn" data-jump-view="reports" type="button">Laporan BGN</button></div>`;
}

function renderComplianceForm() {
    return `<form class="erp-card" data-bgn-form="compliance"><h3>Pemeriksaan Compliance</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Tanggal Cek</label><input class="erp-input" name="check_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="erp-field"><label>Kategori</label><select class="erp-select" name="category"><option value="food-safety">Food Safety</option><option value="dokumen">Dokumen</option><option value="distribusi">Distribusi</option><option value="gizi">Gizi</option></select></div>
        <div class="erp-field"><label>Skor</label><input class="erp-input" name="score" type="number" min="0" max="100" required></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="open">Open</option><option value="perbaikan">Perbaikan</option><option value="selesai">Selesai</option></select></div>
        <div class="erp-field full"><label>Temuan</label><textarea class="erp-textarea" name="finding" required></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Compliance</button></div></form>`;
}

function renderRegionalForm() {
    return `<form class="erp-card" data-bgn-form="regional"><h3>KPI Regional</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Periode</label><input class="erp-input" name="period" placeholder="2026-05" required></div>
        <div class="erp-field"><label>Region</label><input class="erp-input" name="region" required></div>
        <div class="erp-field"><label>Total Sekolah</label><input class="erp-input" name="schools_total" type="number" min="0"></div>
        <div class="erp-field"><label>Total Porsi</label><input class="erp-input" name="portions_total" type="number" min="0"></div>
        <div class="erp-field"><label>On-time Rate</label><input class="erp-input" name="ontime_rate" type="number" min="0" max="100"></div>
        <div class="erp-field"><label>QC Pass Rate</label><input class="erp-input" name="qc_pass_rate" type="number" min="0" max="100"></div>
        <div class="erp-field"><label>Nilai Waste</label><input class="erp-input" name="waste_value" type="number" min="0"></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan KPI</button></div></form>`;
}

function renderReportForm() {
    return `<form class="erp-card" data-bgn-form="report"><h3>Laporan BGN</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Periode</label><input class="erp-input" name="period" placeholder="2026-05" required></div>
        <div class="erp-field"><label>Region</label><input class="erp-input" name="region" required></div>
        <div class="erp-field"><label>Cakupan Sekolah</label><input class="erp-input" name="coverage_school" type="number" min="0"></div>
        <div class="erp-field"><label>Cakupan Porsi</label><input class="erp-input" name="coverage_portion" type="number" min="0"></div>
        <div class="erp-field"><label>Skor Compliance</label><input class="erp-input" name="compliance_score" type="number" min="0" max="100"></div>
        <div class="erp-field"><label>Jumlah Insiden</label><input class="erp-input" name="incident_count" type="number" min="0"></div>
        <div class="erp-field full"><label>URL File</label><input class="erp-input" name="file_url"></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Laporan</button></div></form>`;
}

function renderActiveTable() {
    if (pageState.activeView === 'compliance') {
        const rows = pageState.state.complianceChecks.slice(0, 12).map((row) => `<tr><td>${esc(row.check_date)}</td><td>${esc(row.category)}</td><td>${esc(row.score)}</td><td>${esc(row.finding)}</td><td>${esc(row.status)}</td></tr>`).join('');
        return DataTable({ headers: ['Tanggal', 'Kategori', 'Skor', 'Temuan', 'Status'], rows, emptyText: 'Belum ada compliance.' });
    }
    if (pageState.activeView === 'regional') {
        const rows = pageState.state.regionalKpis.slice(0, 12).map((row) => `<tr><td>${esc(row.period)}</td><td>${esc(row.region)}</td><td>${esc(row.schools_total)}</td><td>${esc(row.portions_total)}</td><td>${esc(row.ontime_rate)}%</td><td>${esc(row.qc_pass_rate)}%</td></tr>`).join('');
        return DataTable({ headers: ['Periode', 'Region', 'Sekolah', 'Porsi', 'On-time', 'QC'], rows, emptyText: 'Belum ada KPI regional.' });
    }
    if (pageState.activeView === 'reports') {
        const rows = pageState.state.bgnReports.slice(0, 12).map((row) => `<tr><td>${esc(row.period)}</td><td>${esc(row.region)}</td><td>${esc(row.coverage_school)}</td><td>${esc(row.coverage_portion)}</td><td>${esc(row.compliance_score)}</td><td>${esc(row.incident_count)}</td></tr>`).join('');
        return DataTable({ headers: ['Periode', 'Region', 'Sekolah', 'Porsi', 'Skor', 'Insiden'], rows, emptyText: 'Belum ada laporan BGN.' });
    }
    const rows = [
        `<tr><td>Sekolah</td><td>${pageState.state.schools.length}</td><td>Cakupan master sekolah</td></tr>`,
        `<tr><td>Dispatch</td><td>${pageState.state.dispatchOrders.length}</td><td>Surat jalan operasional</td></tr>`,
        `<tr><td>Insiden</td><td>${pageState.state.incidents.length}</td><td>Laporan sekolah/field</td></tr>`,
        `<tr><td>Waste</td><td>${pageState.state.wasteRecords.length}</td><td>Catatan waste inventori</td></tr>`
    ].join('');
    return DataTable({ headers: ['Area', 'Jumlah', 'Catatan'], rows, emptyText: 'Belum ada monitoring.' });
}

function renderActiveView() {
    const forms = { compliance: renderComplianceForm, regional: renderRegionalForm, reports: renderReportForm };
    const form = forms[pageState.activeView] ? forms[pageState.activeView]() : '';
    const title = views.find((view) => view.id === pageState.activeView)?.label || 'Monitoring';
    return `${form}<div class="erp-card module-card-gap"><h3>${title}</h3>${renderActiveTable()}</div>`;
}

function renderBgnContent() {
    const root = document.getElementById('bgn-root');
    if (!root) return;
    if (pageState.loading) { root.innerHTML = LoadingCard({ title: 'Memuat BGN dari GAS', text: 'Mengambil laporan, compliance, KPI regional, dan agregat operasional...' }); return; }
    if (pageState.error) { root.innerHTML = ErrorCard({ title: 'BGN tidak bisa dimuat', error: pageState.error, action: 'refresh-bgn' }); return; }
    root.innerHTML = `${renderStats()}${renderActionBar()}${ViewTabs({ views, activeView: pageState.activeView, dataAttr: 'data-bgn-view' })}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadBgn() {
    pageState.loading = true; pageState.error = ''; renderBgnContent();
    try { pageState.state = await getBgnState(); } catch (error) { pageState.error = error.message; } finally { pageState.loading = false; renderBgnContent(); }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    if (form.dataset.bgnForm === 'compliance') await createComplianceCheck(payload);
    if (form.dataset.bgnForm === 'regional') await createRegionalKpi(payload);
    if (form.dataset.bgnForm === 'report') await createBgnReport(payload);
    await loadBgn();
}

function bindBgnEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('bgn-root')) return;
        const viewButton = event.target.closest('[data-bgn-view], [data-jump-view]');
        if (viewButton) { pageState.activeView = viewButton.dataset.bgnView || viewButton.dataset.jumpView; renderBgnContent(); return; }
        if (event.target.closest('[data-action]')?.dataset.action === 'refresh-bgn') await loadBgn();
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('bgn-root') || !event.target.matches('[data-bgn-form]')) return;
        event.preventDefault();
        try { await handleSubmit(event.target); } catch (error) { window.alert(error.message); await loadBgn(); }
    });
}

let eventsBound = false;

export function BgnPage() {
    return '<div id="bgn-root"></div>';
}

export function initBgnPage() {
    if (!eventsBound) { bindBgnEvents(); eventsBound = true; }
    loadBgn();
}
