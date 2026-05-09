import {
    createDeliverySchedule,
    createSupplierUser,
    getSupplierState,
    getSupplierSummaryFromState,
    updateDeliveryScheduleStatus
} from '../services/supplierApi.js';

const pageState = { activeView: 'po', loading: true, error: '', state: { vendors: [], users: [], purchaseOrders: [], schedules: [], receiving: [], invoices: [] } };
const views = [
    { id: 'po', label: 'PO Aktif', description: 'Daftar PO, status, nilai, dan jadwal kebutuhan.' },
    { id: 'schedule', label: 'Jadwal Kirim', description: 'Rencana kirim supplier dan update aktual.' },
    { id: 'users', label: 'User Supplier', description: 'Kontak login supplier per vendor.' },
    { id: 'receiving', label: 'Penerimaan', description: 'QC penerimaan, selisih, dan barang ditolak.' },
    { id: 'invoice', label: 'Faktur', description: 'Status invoice dan pembayaran supplier.' }
];

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function money(value) {
    return Number(value || 0).toLocaleString('id-ID');
}

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function optionRows(rows, idField, labelField, fallback = 'Belum ada data') {
    if (!rows.length) return `<option value="">${fallback}</option>`;
    return rows.map((row) => `<option value="${esc(row[idField])}">${esc(row[labelField] || row[idField])}</option>`).join('');
}

function vendorName(id) {
    return pageState.state.vendors.find((row) => row.vendor_id === id)?.name || id || '-';
}

function renderStats() {
    const summary = getSupplierSummaryFromState(pageState.state);
    const cards = [
        ['Vendor', summary.vendors, 'Supplier terdaftar'],
        ['PO Aktif', summary.activePo, 'Belum selesai diterima'],
        ['Jadwal Kirim', summary.plannedSchedules, 'Belum terkirim'],
        ['Selisih QC', summary.rejectedReceiving, `${summary.unpaidInvoices} faktur belum lunas`]
    ];
    return `<div class="erp-grid">${cards.map(([label, value, note]) => `<div class="erp-card"><div class="erp-stat-label">${label}</div><div class="erp-stat-value">${value}</div><div class="erp-stat-note">${note}</div></div>`).join('')}</div>`;
}

function renderViewNav() {
    return `<div class="inventory-view-grid">${views.map((view) => `<button class="inventory-view-card ${pageState.activeView === view.id ? 'active' : ''}" data-supplier-view="${view.id}" type="button"><strong>${view.label}</strong><span>${view.description}</span></button>`).join('')}</div>`;
}

function renderActionBar() {
    return `<div class="inventory-action-bar"><button class="erp-btn primary" data-action="refresh-supplier" type="button">Refresh GAS</button><button class="erp-btn" data-jump-view="schedule" type="button">Tambah Jadwal</button><button class="erp-btn" data-jump-view="users" type="button">Tambah User Supplier</button><button class="erp-btn" data-jump-view="invoice" type="button">Cek Faktur</button></div>`;
}

function renderScheduleForm() {
    return `<form class="erp-card" data-supplier-form="schedule"><h3>Tambah Jadwal Kirim</h3><div class="erp-form-grid">
        <div class="erp-field"><label>PO</label><select class="erp-select" name="po_id" required>${optionRows(pageState.state.purchaseOrders, 'po_id', 'po_id', 'Belum ada PO')}</select></div>
        <div class="erp-field"><label>Vendor</label><select class="erp-select" name="vendor_id">${optionRows(pageState.state.vendors, 'vendor_id', 'name', 'Ikuti data PO')}</select></div>
        <div class="erp-field"><label>Rencana Kirim</label><input class="erp-input" name="planned_at" type="datetime-local" required></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="direncanakan">Direncanakan</option><option value="dalam-perjalanan">Dalam Perjalanan</option><option value="terkirim">Terkirim</option></select></div>
        <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Jadwal</button></div></form>`;
}

function renderScheduleUpdateForm() {
    return `<form class="erp-card module-card-gap" data-supplier-form="schedule-update"><h3>Update Status Jadwal</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Jadwal</label><select class="erp-select" name="schedule_id" required>${optionRows(pageState.state.schedules, 'schedule_id', 'schedule_id', 'Belum ada jadwal')}</select></div>
        <div class="erp-field"><label>Aktual Kirim</label><input class="erp-input" name="actual_at" type="datetime-local"></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="dalam-perjalanan">Dalam Perjalanan</option><option value="terkirim">Terkirim</option><option value="tertunda">Tertunda</option></select></div>
        <div class="erp-field"><label>Catatan</label><input class="erp-input" name="notes"></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Update Jadwal</button></div></form>`;
}

function renderUserForm() {
    return `<form class="erp-card" data-supplier-form="user"><h3>Tambah User Supplier</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Vendor</label><select class="erp-select" name="vendor_id" required>${optionRows(pageState.state.vendors, 'vendor_id', 'name', 'Tambah vendor dari Pengadaan')}</select></div>
        <div class="erp-field"><label>Nama</label><input class="erp-input" name="name" required></div>
        <div class="erp-field"><label>Email</label><input class="erp-input" name="email" type="email"></div>
        <div class="erp-field"><label>No. HP</label><input class="erp-input" name="phone"></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan User</button></div></form>`;
}

function table(headers, rows, empty) {
    return `<div class="erp-table-wrap"><table class="erp-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
}

function renderActiveTable() {
    if (pageState.activeView === 'schedule') return table(['Jadwal', 'Vendor', 'PO', 'Rencana', 'Aktual', 'Status'], pageState.state.schedules.slice(0, 12).map((row) => `<tr><td>${esc(row.schedule_id)}</td><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.po_id)}</td><td>${esc(row.planned_at)}</td><td>${esc(row.actual_at || '-')}</td><td><span class="erp-status warning">${esc(row.status)}</span></td></tr>`).join(''), 'Belum ada jadwal kirim.');
    if (pageState.activeView === 'users') return table(['Vendor', 'Nama', 'Email', 'HP', 'Status'], pageState.state.users.slice(0, 12).map((row) => `<tr><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.name)}</td><td>${esc(row.email)}</td><td>${esc(row.phone)}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada user supplier.');
    if (pageState.activeView === 'receiving') return table(['Receiving', 'PO', 'Item', 'Diterima', 'Ditolak', 'QC'], pageState.state.receiving.slice(0, 12).map((row) => `<tr><td>${esc(row.receiving_id)}</td><td>${esc(row.po_id)}</td><td>${esc(row.item_id)}</td><td>${esc(row.received_qty)}</td><td>${esc(row.rejected_qty)}</td><td>${esc(row.qc_status)}</td></tr>`).join(''), 'Belum ada receiving.');
    if (pageState.activeView === 'invoice') return table(['Faktur', 'Vendor', 'PO', 'Nilai', 'Status'], pageState.state.invoices.slice(0, 12).map((row) => `<tr><td>${esc(row.invoice_number)}</td><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.po_id)}</td><td>Rp ${money(row.amount)}</td><td>${esc(row.payment_status)}</td></tr>`).join(''), 'Belum ada faktur.');
    return table(['PO', 'Vendor', 'Tanggal', 'Kebutuhan', 'Total', 'Status'], pageState.state.purchaseOrders.slice(0, 12).map((row) => `<tr><td>${esc(row.po_id)}</td><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.po_date)}</td><td>${esc(row.delivery_date)}</td><td>Rp ${money(row.total)}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada PO.');
}

function renderActiveView() {
    if (pageState.activeView === 'schedule') return `${renderScheduleForm()}${renderScheduleUpdateForm()}<div class="erp-card module-card-gap"><h3>Jadwal Kirim</h3>${renderActiveTable()}</div>`;
    if (pageState.activeView === 'users') return `${renderUserForm()}<div class="erp-card module-card-gap"><h3>User Supplier</h3>${renderActiveTable()}</div>`;
    return `<div class="erp-card"><h3>${views.find((view) => view.id === pageState.activeView)?.label}</h3>${renderActiveTable()}</div>`;
}

function renderSupplierContent() {
    const root = document.getElementById('supplier-root');
    if (!root) return;
    if (pageState.loading) { root.innerHTML = '<div class="erp-card inventory-loading"><h3>Memuat Supplier dari GAS</h3><p class="erp-muted">Mengambil PO, jadwal kirim, receiving, dan faktur...</p></div>'; return; }
    if (pageState.error) { root.innerHTML = `<div class="erp-card inventory-error"><h3>Supplier tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-supplier" type="button">Coba Lagi</button></div>`; return; }
    root.innerHTML = `${renderStats()}${renderActionBar()}${renderViewNav()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadSupplier() {
    pageState.loading = true; pageState.error = ''; renderSupplierContent();
    try { pageState.state = await getSupplierState(); } catch (error) { pageState.error = error.message; } finally { pageState.loading = false; renderSupplierContent(); }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    if (form.dataset.supplierForm === 'user') await createSupplierUser(payload, pageState.state);
    if (form.dataset.supplierForm === 'schedule') await createDeliverySchedule(payload, pageState.state);
    if (form.dataset.supplierForm === 'schedule-update') await updateDeliveryScheduleStatus(payload, pageState.state);
    await loadSupplier();
}

function bindSupplierEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('supplier-root')) return;
        const viewButton = event.target.closest('[data-supplier-view], [data-jump-view]');
        if (viewButton) { pageState.activeView = viewButton.dataset.supplierView || viewButton.dataset.jumpView; renderSupplierContent(); return; }
        if (event.target.closest('[data-action]')?.dataset.action === 'refresh-supplier') await loadSupplier();
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('supplier-root') || !event.target.matches('[data-supplier-form]')) return;
        event.preventDefault();
        try { await handleSubmit(event.target); } catch (error) { window.alert(error.message); await loadSupplier(); }
    });
}

let eventsBound = false;

export function SupplierPage() {
    return '<div id="supplier-root"></div>';
}

export function initSupplierPage() {
    if (!eventsBound) { bindSupplierEvents(); eventsBound = true; }
    loadSupplier();
}
