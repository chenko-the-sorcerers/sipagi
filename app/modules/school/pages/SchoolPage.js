import {
    confirmDeliveryReceipt,
    createBeneficiary,
    createIncident,
    createSchool,
    createSchoolFeedback,
    getSchoolState,
    getSchoolSummaryFromState
} from '../services/schoolApi.js';

const pageState = {
    activeView: 'schools',
    loading: true,
    error: '',
    state: { schools: [], beneficiaries: [], dispatchOrders: [], receipts: [], feedback: [], incidents: [] }
};

const views = [
    { id: 'schools', label: 'Data Sekolah', description: 'Master sekolah, PIC, rute, dan jumlah penerima.' },
    { id: 'beneficiaries', label: 'Penerima Manfaat', description: 'Data siswa, kelas, status gizi, dan alergi.' },
    { id: 'receipts', label: 'Konfirmasi Terima', description: 'Konfirmasi pengiriman, jumlah diterima, dan catatan.' },
    { id: 'feedback', label: 'Feedback', description: 'Rating, keluhan, dan masukan dari sekolah.' },
    { id: 'incidents', label: 'Insiden', description: 'Laporan risiko makanan, keterlambatan, atau distribusi.' }
];

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function optionRows(rows, idField, labelField, fallback = 'Belum ada data') {
    if (!rows.length) return `<option value="">${fallback}</option>`;
    return rows.map((row) => `<option value="${esc(row[idField])}">${esc(row[labelField] || row[idField])}</option>`).join('');
}

function schoolName(id) {
    return pageState.state.schools.find((row) => row.school_id === id)?.name || id || '-';
}

function renderStats() {
    const summary = getSchoolSummaryFromState(pageState.state);
    const cards = [
        ['Sekolah', summary.schools, 'Sekolah terdaftar'],
        ['Penerima', summary.totalStudents.toLocaleString('id-ID'), 'Target penerima manfaat'],
        ['Dispatch Terbuka', summary.openDispatch, 'Menunggu konfirmasi sekolah'],
        ['Konfirmasi', summary.confirmedReceipts, `${summary.openIncidents} insiden aktif`]
    ];
    return `<div class="erp-grid">${cards.map(([label, value, note]) => `<div class="erp-card"><div class="erp-stat-label">${label}</div><div class="erp-stat-value">${value}</div><div class="erp-stat-note">${note}</div></div>`).join('')}</div>`;
}

function renderViewNav() {
    return `<div class="inventory-view-grid">${views.map((view) => `<button class="inventory-view-card ${pageState.activeView === view.id ? 'active' : ''}" data-school-view="${view.id}" type="button"><strong>${view.label}</strong><span>${view.description}</span></button>`).join('')}</div>`;
}

function renderActionBar() {
    return `<div class="inventory-action-bar"><button class="erp-btn primary" data-action="refresh-school" type="button">Refresh GAS</button><button class="erp-btn" data-jump-view="schools" type="button">Tambah Sekolah</button><button class="erp-btn" data-jump-view="receipts" type="button">Konfirmasi Terima</button><button class="erp-btn danger" data-jump-view="incidents" type="button">Laporkan Insiden</button></div>`;
}

function renderSchoolForm() {
    return `<form class="erp-card" data-school-form="school"><h3>Tambah Sekolah</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Nama Sekolah</label><input class="erp-input" name="name" required></div>
        <div class="erp-field"><label>NPSN</label><input class="erp-input" name="npsn"></div>
        <div class="erp-field"><label>PIC</label><input class="erp-input" name="pic_name" required></div>
        <div class="erp-field"><label>No. HP PIC</label><input class="erp-input" name="pic_phone" required></div>
        <div class="erp-field"><label>Kode Rute</label><input class="erp-input" name="route_code" required></div>
        <div class="erp-field"><label>Jumlah Penerima</label><input class="erp-input" name="beneficiary_count" type="number" min="0" required></div>
        <div class="erp-field full"><label>Alamat</label><textarea class="erp-textarea" name="address"></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Sekolah</button></div></form>`;
}

function renderBeneficiaryForm() {
    return `<form class="erp-card" data-school-form="beneficiary"><h3>Tambah Penerima Manfaat</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Sekolah</label><select class="erp-select" name="school_id" required>${optionRows(pageState.state.schools, 'school_id', 'name', 'Tambah sekolah dahulu')}</select></div>
        <div class="erp-field"><label>Nama</label><input class="erp-input" name="name" required></div>
        <div class="erp-field"><label>Tingkat</label><input class="erp-input" name="grade" placeholder="Kelas 1"></div>
        <div class="erp-field"><label>Kelas</label><input class="erp-input" name="class_name" placeholder="1A"></div>
        <div class="erp-field"><label>Status Gizi</label><select class="erp-select" name="nutrition_status"><option value="normal">Normal</option><option value="kurang">Kurang</option><option value="lebih">Lebih</option><option value="perhatian">Perhatian</option></select></div>
        <div class="erp-field"><label>Alergi</label><input class="erp-input" name="allergy_notes" placeholder="Opsional"></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Penerima</button></div></form>`;
}

function renderReceiptForm() {
    return `<form class="erp-card" data-school-form="receipt"><h3>Konfirmasi Penerimaan</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Dispatch</label><select class="erp-select" name="dispatch_id" required>${optionRows(pageState.state.dispatchOrders, 'dispatch_id', 'dispatch_id', 'Belum ada dispatch')}</select></div>
        <div class="erp-field"><label>Sekolah</label><select class="erp-select" name="school_id">${optionRows(pageState.state.schools, 'school_id', 'name', 'Ikuti data dispatch')}</select></div>
        <div class="erp-field"><label>Jumlah Diterima</label><input class="erp-input" name="received_qty" type="number" min="0" required></div>
        <div class="erp-field"><label>Diterima Oleh</label><input class="erp-input" name="received_by" required></div>
        <div class="erp-field"><label>Waktu Terima</label><input class="erp-input" name="received_at" type="datetime-local"></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="feedback_status"><option value="diterima">Diterima</option><option value="kurang">Kurang</option><option value="rusak">Rusak</option></select></div>
        <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Konfirmasi</button></div></form>`;
}

function renderFeedbackForm() {
    return `<form class="erp-card" data-school-form="feedback"><h3>Kirim Feedback</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Sekolah</label><select class="erp-select" name="school_id" required>${optionRows(pageState.state.schools, 'school_id', 'name', 'Tambah sekolah dahulu')}</select></div>
        <div class="erp-field"><label>Rating</label><input class="erp-input" name="rating" type="number" min="1" max="5" value="5"></div>
        <div class="erp-field"><label>Kategori</label><select class="erp-select" name="category"><option value="rasa">Rasa</option><option value="porsi">Porsi</option><option value="ketepatan">Ketepatan</option><option value="kemasan">Kemasan</option></select></div>
        <div class="erp-field full"><label>Pesan</label><textarea class="erp-textarea" name="message" required></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Feedback</button></div></form>`;
}

function renderIncidentForm() {
    return `<form class="erp-card" data-school-form="incident"><h3>Laporkan Insiden</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Sekolah</label><select class="erp-select" name="school_id" required>${optionRows(pageState.state.schools, 'school_id', 'name', 'Tambah sekolah dahulu')}</select></div>
        <div class="erp-field"><label>Tipe</label><select class="erp-select" name="type"><option value="food-safety">Food Safety</option><option value="keterlambatan">Keterlambatan</option><option value="kurang-porsi">Kurang Porsi</option><option value="kemasan-rusak">Kemasan Rusak</option></select></div>
        <div class="erp-field"><label>Severity</label><select class="erp-select" name="severity"><option value="rendah">Rendah</option><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option><option value="kritis">Kritis</option></select></div>
        <div class="erp-field full"><label>Deskripsi</label><textarea class="erp-textarea" name="description" required></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn danger" type="submit">Simpan Insiden</button></div></form>`;
}

function renderTable(headers, rows, emptyText) {
    return `<div class="erp-table-wrap"><table class="erp-table"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">${emptyText}</td></tr>`}</tbody></table></div>`;
}

function renderActiveTable() {
    if (pageState.activeView === 'beneficiaries') return renderTable(['Sekolah', 'Nama', 'Kelas', 'Status Gizi', 'Alergi'], pageState.state.beneficiaries.slice(0, 12).map((row) => `<tr><td>${esc(schoolName(row.school_id))}</td><td>${esc(row.name)}</td><td>${esc(row.grade)} ${esc(row.class_name)}</td><td>${esc(row.nutrition_status)}</td><td>${esc(row.allergy_notes || '-')}</td></tr>`).join(''), 'Belum ada penerima.');
    if (pageState.activeView === 'receipts') return renderTable(['Dispatch', 'Sekolah', 'Diterima', 'Oleh', 'Waktu', 'Status'], pageState.state.receipts.slice(0, 12).map((row) => `<tr><td>${esc(row.dispatch_id)}</td><td>${esc(schoolName(row.school_id))}</td><td>${esc(row.received_qty)}</td><td>${esc(row.received_by)}</td><td>${esc(row.received_at)}</td><td>${esc(row.feedback_status)}</td></tr>`).join(''), 'Belum ada konfirmasi.');
    if (pageState.activeView === 'feedback') return renderTable(['Sekolah', 'Rating', 'Kategori', 'Pesan', 'Status'], pageState.state.feedback.slice(0, 12).map((row) => `<tr><td>${esc(schoolName(row.school_id))}</td><td>${esc(row.rating)}</td><td>${esc(row.category)}</td><td>${esc(row.message)}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada feedback.');
    if (pageState.activeView === 'incidents') return renderTable(['Sekolah', 'Tipe', 'Severity', 'Deskripsi', 'Status'], pageState.state.incidents.slice(0, 12).map((row) => `<tr><td>${esc(schoolName(row.school_id))}</td><td>${esc(row.type)}</td><td>${esc(row.severity)}</td><td>${esc(row.description)}</td><td><span class="erp-status warning">${esc(row.status)}</span></td></tr>`).join(''), 'Belum ada insiden.');
    return renderTable(['Nama', 'NPSN', 'PIC', 'HP', 'Rute', 'Penerima'], pageState.state.schools.slice(0, 12).map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.npsn)}</td><td>${esc(row.pic_name)}</td><td>${esc(row.pic_phone)}</td><td>${esc(row.route_code)}</td><td>${esc(row.beneficiary_count)}</td></tr>`).join(''), 'Belum ada sekolah.');
}

function renderActiveView() {
    const forms = { schools: renderSchoolForm, beneficiaries: renderBeneficiaryForm, receipts: renderReceiptForm, feedback: renderFeedbackForm, incidents: renderIncidentForm };
    const title = views.find((view) => view.id === pageState.activeView)?.label || 'Sekolah';
    return `${forms[pageState.activeView]()}<div class="erp-card module-card-gap"><h3>${title}</h3>${renderActiveTable()}</div>`;
}

function renderSchoolContent() {
    const root = document.getElementById('school-root');
    if (!root) return;
    if (pageState.loading) {
        root.innerHTML = '<div class="erp-card inventory-loading"><h3>Memuat Sekolah dari GAS</h3><p class="erp-muted">Mengambil sekolah, penerima, konfirmasi, feedback, dan insiden...</p></div>';
        return;
    }
    if (pageState.error) {
        root.innerHTML = `<div class="erp-card inventory-error"><h3>Sekolah tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-school" type="button">Coba Lagi</button></div>`;
        return;
    }
    root.innerHTML = `${renderStats()}${renderActionBar()}${renderViewNav()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadSchool() {
    pageState.loading = true;
    pageState.error = '';
    renderSchoolContent();
    try { pageState.state = await getSchoolState(); } catch (error) { pageState.error = error.message; } finally { pageState.loading = false; renderSchoolContent(); }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    if (form.dataset.schoolForm === 'school') await createSchool(payload);
    if (form.dataset.schoolForm === 'beneficiary') await createBeneficiary(payload, pageState.state);
    if (form.dataset.schoolForm === 'receipt') await confirmDeliveryReceipt(payload, pageState.state);
    if (form.dataset.schoolForm === 'feedback') await createSchoolFeedback(payload, pageState.state);
    if (form.dataset.schoolForm === 'incident') await createIncident(payload, pageState.state);
    await loadSchool();
}

function bindSchoolEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('school-root')) return;
        const viewButton = event.target.closest('[data-school-view], [data-jump-view]');
        if (viewButton) { pageState.activeView = viewButton.dataset.schoolView || viewButton.dataset.jumpView; renderSchoolContent(); return; }
        if (event.target.closest('[data-action]')?.dataset.action === 'refresh-school') await loadSchool();
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('school-root') || !event.target.matches('[data-school-form]')) return;
        event.preventDefault();
        try { await handleSubmit(event.target); } catch (error) { window.alert(error.message); await loadSchool(); }
    });
}

let eventsBound = false;

export function SchoolPage() {
    return '<div id="school-root"></div>';
}

export function initSchoolPage() {
    if (!eventsBound) { bindSchoolEvents(); eventsBound = true; }
    loadSchool();
}
