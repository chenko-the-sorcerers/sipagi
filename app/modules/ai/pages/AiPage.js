import { DataTable, ErrorCard, escapeHtml as esc, LoadingCard, serializeForm, StatGrid, ViewTabs } from '../../../shared/components/ModuleComponents.js';
import { createAiRecommendation, createAiRun, createAnomalyFlag, getAiState, getAiSummaryFromState } from '../services/aiApi.js';

const pageState = { activeView: 'runs', loading: true, error: '', state: { runs: [], recommendations: [], anomalyFlags: [], items: [], nutritionChecks: [], wasteRecords: [], dispatchOrders: [] } };
const views = [
    { id: 'runs', label: 'AI Run', description: 'Jalankan use case AI prioritas SIPAGI.' },
    { id: 'recommendations', label: 'Rekomendasi', description: 'Daftar rekomendasi AI lintas modul.' },
    { id: 'anomaly', label: 'Anomali', description: 'Flag risiko fraud, waste, keterlambatan, food safety.' },
    { id: 'context', label: 'Konteks Data', description: 'Data operasional yang dibaca AI.' }
];

function renderStats() {
    const summary = getAiSummaryFromState(pageState.state);
    return StatGrid([
        { label: 'AI Run', value: summary.runs, note: 'Eksekusi use case' },
        { label: 'Rekomendasi', value: summary.recommendations, note: 'Saran tersimpan' },
        { label: 'Prioritas Tinggi', value: summary.highPriority, note: 'Butuh tindak lanjut' },
        { label: 'Anomali Open', value: summary.openFlags, note: 'Flag belum selesai' }
    ]);
}

function renderActionBar() {
    return `<div class="inventory-action-bar"><button class="erp-btn primary" data-action="refresh-ai" type="button">Refresh GAS</button><button class="erp-btn" data-jump-view="runs" type="button">Jalankan AI</button><button class="erp-btn" data-jump-view="recommendations" type="button">Tambah Rekomendasi</button><button class="erp-btn danger" data-jump-view="anomaly" type="button">Flag Anomali</button></div>`;
}

function renderRunForm() {
    return `<form class="erp-card" data-ai-form="run"><h3>Jalankan AI Assistant</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Use Case</label><select class="erp-select" name="use_case"><option value="cek-gizi">Cek Gizi</option><option value="forecast-bahan">Forecast Bahan</option><option value="fraud-waste">Fraud/Waste</option><option value="ringkasan-laporan">Ringkasan Laporan</option></select></div>
        <div class="erp-field"><label>Modul Target</label><select class="erp-select" name="module"><option value="operational">Operasional</option><option value="inventory">Inventori</option><option value="purchasing">Pengadaan</option><option value="reports">Reports</option></select></div>
        <div class="erp-field"><label>Model</label><input class="erp-input" name="model_name" value="sipagi-rule-ai"></div>
        <div class="erp-field"><label>Input Ref</label><input class="erp-input" name="input_ref_id" placeholder="Opsional"></div>
        <div class="erp-field full"><label>Judul Rekomendasi</label><input class="erp-input" name="title" placeholder="Opsional"></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Jalankan AI</button></div></form>`;
}

function renderRecommendationForm() {
    return `<form class="erp-card" data-ai-form="recommendation"><h3>Tambah Rekomendasi Manual</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Modul</label><select class="erp-select" name="module"><option value="operational">Operasional</option><option value="inventory">Inventori</option><option value="finance">Finance</option><option value="hr">HR</option></select></div>
        <div class="erp-field"><label>Prioritas</label><select class="erp-select" name="priority"><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select></div>
        <div class="erp-field full"><label>Judul</label><input class="erp-input" name="title" required></div>
        <div class="erp-field full"><label>Rekomendasi</label><textarea class="erp-textarea" name="recommendation" required></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Rekomendasi</button></div></form>`;
}

function renderAnomalyForm() {
    return `<form class="erp-card" data-ai-form="anomaly"><h3>Flag Anomali</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Modul</label><select class="erp-select" name="module"><option value="inventory">Inventori</option><option value="purchasing">Pengadaan</option><option value="operational">Operasional</option><option value="school">Sekolah</option></select></div>
        <div class="erp-field"><label>Entity Type</label><input class="erp-input" name="entity_type" placeholder="sku, po, dispatch, invoice" required></div>
        <div class="erp-field"><label>Entity ID</label><input class="erp-input" name="entity_id" required></div>
        <div class="erp-field"><label>Severity</label><select class="erp-select" name="severity"><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select></div>
        <div class="erp-field full"><label>Alasan</label><textarea class="erp-textarea" name="reason" required></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn danger" type="submit">Simpan Flag</button></div></form>`;
}

function renderActiveTable() {
    if (pageState.activeView === 'recommendations') {
        const rows = pageState.state.recommendations.slice(0, 12).map((row) => `<tr><td>${esc(row.module)}</td><td>${esc(row.priority)}</td><td>${esc(row.title)}</td><td>${esc(row.recommendation)}</td><td>${esc(row.status)}</td></tr>`).join('');
        return DataTable({ headers: ['Modul', 'Prioritas', 'Judul', 'Rekomendasi', 'Status'], rows, emptyText: 'Belum ada rekomendasi.' });
    }
    if (pageState.activeView === 'anomaly') {
        const rows = pageState.state.anomalyFlags.slice(0, 12).map((row) => `<tr><td>${esc(row.module)}</td><td>${esc(row.entity_type)}</td><td>${esc(row.entity_id)}</td><td>${esc(row.severity)}</td><td>${esc(row.reason)}</td><td>${esc(row.status)}</td></tr>`).join('');
        return DataTable({ headers: ['Modul', 'Entity', 'ID', 'Severity', 'Alasan', 'Status'], rows, emptyText: 'Belum ada anomali.' });
    }
    if (pageState.activeView === 'context') {
        const rows = [
            `<tr><td>Inventori</td><td>${pageState.state.items.length}</td><td>Master item</td></tr>`,
            `<tr><td>Cek Gizi</td><td>${pageState.state.nutritionChecks.length}</td><td>Skor dan warning</td></tr>`,
            `<tr><td>Waste</td><td>${pageState.state.wasteRecords.length}</td><td>Risiko susut/expired</td></tr>`,
            `<tr><td>Dispatch</td><td>${pageState.state.dispatchOrders.length}</td><td>Keterlambatan distribusi</td></tr>`
        ].join('');
        return DataTable({ headers: ['Sumber', 'Jumlah', 'Dipakai Untuk'], rows, emptyText: 'Belum ada konteks.' });
    }
    const rows = pageState.state.runs.slice(0, 12).map((row) => `<tr><td>${esc(row.use_case)}</td><td>${esc(row.model_name)}</td><td>${esc(row.status)}</td><td>${esc(row.result_json)}</td><td>${esc(row.created_at)}</td></tr>`).join('');
    return DataTable({ headers: ['Use Case', 'Model', 'Status', 'Hasil', 'Waktu'], rows, emptyText: 'Belum ada AI run.' });
}

function renderActiveView() {
    const forms = { runs: renderRunForm, recommendations: renderRecommendationForm, anomaly: renderAnomalyForm };
    const form = forms[pageState.activeView] ? forms[pageState.activeView]() : '';
    const title = views.find((view) => view.id === pageState.activeView)?.label || 'AI';
    return `${form}<div class="erp-card module-card-gap"><h3>${title}</h3>${renderActiveTable()}</div>`;
}

function renderAiContent() {
    const root = document.getElementById('ai-root');
    if (!root) return;
    if (pageState.loading) { root.innerHTML = LoadingCard({ title: 'Memuat AI Assistant dari GAS', text: 'Mengambil run, rekomendasi, anomali, dan konteks data...' }); return; }
    if (pageState.error) { root.innerHTML = ErrorCard({ title: 'AI Assistant tidak bisa dimuat', error: pageState.error, action: 'refresh-ai' }); return; }
    root.innerHTML = `${renderStats()}${renderActionBar()}${ViewTabs({ views, activeView: pageState.activeView, dataAttr: 'data-ai-view' })}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadAi() {
    pageState.loading = true; pageState.error = ''; renderAiContent();
    try { pageState.state = await getAiState(); } catch (error) { pageState.error = error.message; } finally { pageState.loading = false; renderAiContent(); }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    if (form.dataset.aiForm === 'run') await createAiRun(payload, pageState.state);
    if (form.dataset.aiForm === 'recommendation') await createAiRecommendation(payload);
    if (form.dataset.aiForm === 'anomaly') await createAnomalyFlag(payload);
    await loadAi();
}

function bindAiEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('ai-root')) return;
        const viewButton = event.target.closest('[data-ai-view], [data-jump-view]');
        if (viewButton) { pageState.activeView = viewButton.dataset.aiView || viewButton.dataset.jumpView; renderAiContent(); return; }
        if (event.target.closest('[data-action]')?.dataset.action === 'refresh-ai') await loadAi();
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('ai-root') || !event.target.matches('[data-ai-form]')) return;
        event.preventDefault();
        try { await handleSubmit(event.target); } catch (error) { window.alert(error.message); await loadAi(); }
    });
}

let eventsBound = false;

export function AiPage() {
    return '<div id="ai-root"></div>';
}

export function initAiPage() {
    if (!eventsBound) { bindAiEvents(); eventsBound = true; }
    loadAi();
}
