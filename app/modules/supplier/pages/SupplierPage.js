import {
    createDeliverySchedule,
    createSupplierUser,
    getSupplierState,
    getSupplierSummaryFromState,
    updateDeliveryScheduleStatus
} from '../services/supplierApi.js';
import { LoadingCard, showDetailModal } from '../../../shared/components/ModuleComponents.js';

const pageState = { activeView: 'overview', loading: true, error: '', state: { vendors: [], users: [], purchaseOrders: [], schedules: [], receiving: [], invoices: [] } };
const views = [
    { id: 'overview', label: 'Overview', description: 'Ringkasan supplier, harga pasar, pembanding harga, dan riwayat pembelian.' },
    { id: 'daftar-supplier', label: 'Daftar Supplier', description: 'Master supplier lokal dan status aktif.' },
    { id: 'survei-harga-pasar', label: 'Survei Harga Pasar', description: 'Harga pasar dari PO, penerimaan, dan faktur.' },
    { id: 'perbandingan-harga', label: 'Perbandingan Harga', description: 'Pembanding vendor dan nilai pembelian.' },
    { id: 'riwayat-pembelian', label: 'Riwayat Pembelian', description: 'PO, jadwal kirim, receiving, dan faktur.' },
    { id: 'po', label: 'PO Aktif', description: 'Daftar PO, status, nilai, dan jadwal kebutuhan.' },
    { id: 'schedule', label: 'Jadwal Kirim', description: 'Rencana kirim supplier dan update aktual.' },
    { id: 'users', label: 'User Supplier', description: 'Kontak login supplier per vendor.' },
    { id: 'receiving', label: 'Penerimaan', description: 'QC penerimaan, selisih, dan barang ditolak.' },
    { id: 'invoice', label: 'Faktur', description: 'Status invoice dan pembayaran supplier.' }
];

const viewAliases = {
    'daftar-supplier': 'vendors',
    'survei-harga-pasar': 'prices',
    'perbandingan-harga': 'prices',
    'riwayat-pembelian': 'po'
};

function normalizeSupplierView(view) {
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
    return `<div class="inventory-action-bar"><button class="erp-btn primary" data-action="refresh-supplier" type="button">Refresh Data</button><button class="erp-btn" data-jump-view="schedule" type="button">Tambah Jadwal</button><button class="erp-btn" data-jump-view="users" type="button">Tambah User Supplier</button><button class="erp-btn" data-jump-view="invoice" type="button">Cek Faktur</button></div>`;
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
    const activeView = normalizeSupplierView(pageState.activeView);
    if (activeView === 'vendors') return table(['Supplier', 'Kategori', 'Kontak', 'HP', 'Rating', 'Status'], pageState.state.vendors.slice(0, 12).map((row) => `<tr class="sipagi-clickable" data-supplier-detail="vendor" data-vendor-id="${esc(row.vendor_id)}"><td>${esc(row.name)}</td><td>${esc(row.category)}</td><td>${esc(row.contact_name)}</td><td>${esc(row.phone)}</td><td>${esc(row.rating || '-')}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada supplier.');
    if (activeView === 'prices') return table(['Supplier', 'PO', 'Tanggal', 'Nilai', 'Status'], pageState.state.purchaseOrders.slice(0, 12).map((row) => `<tr class="sipagi-clickable" data-supplier-detail="po" data-po-id="${esc(row.po_id)}"><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.po_id)}</td><td>${esc(row.po_date)}</td><td>Rp ${money(row.total)}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada pembanding harga.');
    if (activeView === 'schedule') return table(['Jadwal', 'Vendor', 'PO', 'Rencana', 'Aktual', 'Status'], pageState.state.schedules.slice(0, 12).map((row) => `<tr class="sipagi-clickable" data-supplier-detail="schedule" data-schedule-id="${esc(row.schedule_id)}"><td>${esc(row.schedule_id)}</td><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.po_id)}</td><td>${esc(row.planned_at)}</td><td>${esc(row.actual_at || '-')}</td><td><span class="erp-status warning">${esc(row.status)}</span></td></tr>`).join(''), 'Belum ada jadwal kirim.');
    if (activeView === 'users') return table(['Vendor', 'Nama', 'Email', 'HP', 'Status'], pageState.state.users.slice(0, 12).map((row) => `<tr class="sipagi-clickable" data-supplier-detail="user" data-user-id="${esc(row.user_id)}"><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.name)}</td><td>${esc(row.email)}</td><td>${esc(row.phone)}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada user supplier.');
    if (activeView === 'receiving') return table(['Receiving', 'PO', 'Item', 'Diterima', 'Ditolak', 'QC'], pageState.state.receiving.slice(0, 12).map((row) => `<tr class="sipagi-clickable" data-supplier-detail="receiving" data-receiving-id="${esc(row.receiving_id)}"><td>${esc(row.receiving_id)}</td><td>${esc(row.po_id)}</td><td>${esc(row.item_id)}</td><td>${esc(row.received_qty)}</td><td>${esc(row.rejected_qty)}</td><td>${esc(row.qc_status)}</td></tr>`).join(''), 'Belum ada receiving.');
    if (activeView === 'invoice') return table(['Faktur', 'Vendor', 'PO', 'Nilai', 'Status'], pageState.state.invoices.slice(0, 12).map((row) => `<tr class="sipagi-clickable" data-supplier-detail="invoice" data-invoice-id="${esc(row.invoice_id)}"><td>${esc(row.invoice_number)}</td><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.po_id)}</td><td>Rp ${money(row.amount)}</td><td>${esc(row.payment_status)}</td></tr>`).join(''), 'Belum ada faktur.');
    return table(['PO', 'Vendor', 'Tanggal', 'Kebutuhan', 'Total', 'Status'], pageState.state.purchaseOrders.slice(0, 12).map((row) => `<tr class="sipagi-clickable" data-supplier-detail="po" data-po-id="${esc(row.po_id)}"><td>${esc(row.po_id)}</td><td>${esc(vendorName(row.vendor_id))}</td><td>${esc(row.po_date)}</td><td>${esc(row.delivery_date)}</td><td>Rp ${money(row.total)}</td><td>${esc(row.status)}</td></tr>`).join(''), 'Belum ada PO.');
}

function renderActiveView() {
    const activeView = normalizeSupplierView(pageState.activeView);
    if (activeView === 'overview') return `<div class="erp-card"><h3>Overview Supplier</h3><div class="erp-grid"><article class="erp-card"><div class="erp-stat-label">Daftar Supplier</div><div class="erp-stat-value">${pageState.state.vendors.length}</div><div class="erp-stat-note">Supplier lokal aktif</div></article><article class="erp-card"><div class="erp-stat-label">Survei Harga Pasar</div><div class="erp-stat-value">${pageState.state.purchaseOrders.length}</div><div class="erp-stat-note">Basis PO dan faktur</div></article><article class="erp-card"><div class="erp-stat-label">Perbandingan Harga</div><div class="erp-stat-value">${pageState.state.vendors.length}</div><div class="erp-stat-note">Vendor pembanding</div></article><article class="erp-card"><div class="erp-stat-label">Riwayat Pembelian</div><div class="erp-stat-value">${pageState.state.invoices.length}</div><div class="erp-stat-note">Faktur supplier</div></article></div>${renderActiveTable()}</div>`;
    if (activeView === 'schedule') return `${renderScheduleForm()}${renderScheduleUpdateForm()}<div class="erp-card module-card-gap"><h3>Jadwal Kirim</h3>${renderActiveTable()}</div>`;
    if (activeView === 'users') return `${renderUserForm()}<div class="erp-card module-card-gap"><h3>User Supplier</h3>${renderActiveTable()}</div>`;
    return `<div class="erp-card"><h3>${views.find((view) => view.id === pageState.activeView)?.label || 'Supplier'}</h3>${renderActiveTable()}</div>`;
}

function renderSupplierContent() {
    const root = document.getElementById('supplier-root');
    if (!root) return;
    if (pageState.loading) { root.innerHTML = LoadingCard({ title: 'Memuat Supplier dari Data', text: 'Mengambil PO, jadwal kirim, receiving, dan faktur...' }); return; }
    if (pageState.error) { root.innerHTML = `<div class="erp-card inventory-error"><h3>Supplier tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-supplier" type="button">Coba Lagi</button></div>`; return; }
    root.innerHTML = `${renderStats()}<div class="module-view-panel">${renderActiveView()}</div>`;
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

function openSupplierDetail(type, id) {
    const row = {
        schedule: pageState.state.schedules.find((item) => item.schedule_id === id),
        user: pageState.state.users.find((item) => item.user_id === id),
        receiving: pageState.state.receiving.find((item) => item.receiving_id === id),
        invoice: pageState.state.invoices.find((item) => item.invoice_id === id),
        po: pageState.state.purchaseOrders.find((item) => item.po_id === id),
        vendor: pageState.state.vendors.find((item) => item.vendor_id === id)
    }[type];
    if (!row) return;
    if (type === 'invoice') {
        showDetailModal({ title: row.invoice_number || row.invoice_id, subtitle: `${vendorName(row.vendor_id)} · PO ${row.po_id || '-'}`, rows: [['ID Faktur', esc(row.invoice_id)], ['Tanggal', esc(row.invoice_date)], ['Nilai', `Rp ${money(row.amount)}`], ['Status', esc(row.payment_status)], ['File', row.file_url ? `<a href="${esc(row.file_url)}" target="_blank">Buka file faktur</a>` : '-']] });
        return;
    }
    showDetailModal({
        title: row.name || row.schedule_id || row.receiving_id || row.po_id || id,
        subtitle: type,
        rows: Object.entries(row).slice(0, 14).map(([key, value]) => [key.replace(/_/g, ' '), esc(value)])
    });
}

function bindSupplierEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('supplier-root')) return;
        const viewButton = event.target.closest('[data-supplier-view], [data-jump-view]');
        if (viewButton) { pageState.activeView = viewButton.dataset.supplierView || viewButton.dataset.jumpView; renderSupplierContent(); return; }
        if (event.target.closest('[data-action]')?.dataset.action === 'refresh-supplier') await loadSupplier();
        const detailTarget = event.target.closest('[data-supplier-detail]');
        if (detailTarget) {
            openSupplierDetail(detailTarget.dataset.supplierDetail, detailTarget.dataset.scheduleId || detailTarget.dataset.userId || detailTarget.dataset.receivingId || detailTarget.dataset.invoiceId || detailTarget.dataset.poId || detailTarget.dataset.vendorId);
        }
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

export function initSupplierPage(initialView = 'overview') {
    pageState.activeView = views.some((view) => view.id === initialView) ? initialView : 'overview';
    if (!eventsBound) { bindSupplierEvents(); eventsBound = true; }
    loadSupplier();
}
