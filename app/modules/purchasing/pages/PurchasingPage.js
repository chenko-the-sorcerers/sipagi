import {
    createPurchaseOrder,
    createPurchaseRequest,
    createSupplierInvoice,
    createVendor,
    getPurchasingState,
    getPurchasingSummaryFromState,
    recordReceiving
} from '../services/purchasingApi.js';

const pageState = {
    activeView: 'po',
    loading: true,
    error: '',
    state: {
        vendors: [],
        items: [],
        purchaseRequests: [],
        purchaseOrders: [],
        purchaseOrderItems: [],
        receivingRecords: [],
        supplierInvoices: []
    }
};

const views = [
    { id: 'po', label: 'Pesanan Pembelian', description: 'Buat PO bahan pangan dan pantau status penerimaan.' },
    { id: 'vendor', label: 'Vendor', description: 'Master supplier, kontak, rating, dan termin pembayaran.' },
    { id: 'receiving', label: 'Penerimaan', description: 'QC penerimaan, batch stok otomatis, dan mutasi inventory.' },
    { id: 'invoice', label: 'Faktur', description: 'Catat faktur supplier dan status pembayaran.' }
];

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
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
    return pageState.state.vendors.find((vendor) => vendor.vendor_id === id)?.name || id || '-';
}

function itemName(id) {
    return pageState.state.items.find((item) => item.item_id === id)?.name || id || '-';
}

function renderStats() {
    const summary = getPurchasingSummaryFromState(pageState.state);
    const cards = [
        ['Vendor Aktif', summary.vendors, 'Supplier bahan pangan terdaftar'],
        ['PO Berjalan', summary.openOrders, 'Pesanan yang belum selesai'],
        ['PO Diterima', summary.receivedOrders, 'PO sudah tercatat receiving'],
        ['Nilai Faktur', `Rp ${money(summary.invoiceTotal)}`, `${summary.pendingInvoices} faktur belum lunas`]
    ];

    return `
        <div class="erp-grid">
            ${cards.map(([label, value, note]) => `
                <div class="erp-card">
                    <div class="erp-stat-label">${label}</div>
                    <div class="erp-stat-value">${value}</div>
                    <div class="erp-stat-note">${note}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderViewNav() {
    return `
        <div class="inventory-view-grid">
            ${views.map((view) => `
                <button class="inventory-view-card ${pageState.activeView === view.id ? 'active' : ''}" data-purchasing-view="${view.id}" type="button">
                    <strong>${view.label}</strong>
                    <span>${view.description}</span>
                </button>
            `).join('')}
        </div>
    `;
}

function renderActionBar() {
    return `
        <div class="inventory-action-bar">
            <button class="erp-btn primary" data-action="refresh-purchasing" type="button">Refresh GAS</button>
            <button class="erp-btn" data-jump-view="vendor" type="button">Tambah Vendor</button>
            <button class="erp-btn" data-jump-view="receiving" type="button">Catat Penerimaan</button>
            <button class="erp-btn" data-jump-view="invoice" type="button">Catat Faktur</button>
        </div>
    `;
}

function renderVendorForm() {
    return `
        <form class="erp-card" data-purchasing-form="vendor">
            <h3>Tambah Vendor</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Nama Vendor</label><input class="erp-input" name="name" required></div>
                <div class="erp-field"><label>Kategori</label><input class="erp-input" name="category" placeholder="Sayur, beras, protein..." required></div>
                <div class="erp-field"><label>PIC</label><input class="erp-input" name="contact_name" required></div>
                <div class="erp-field"><label>No. HP</label><input class="erp-input" name="phone" required></div>
                <div class="erp-field"><label>Rating</label><select class="erp-select" name="rating"><option value="baru">Baru</option><option value="baik">Baik</option><option value="prioritas">Prioritas</option><option value="evaluasi">Evaluasi</option></select></div>
                <div class="erp-field"><label>Termin Bayar</label><input class="erp-input" name="payment_term" value="tempo 7 hari"></div>
                <div class="erp-field full"><label>Alamat</label><textarea class="erp-textarea" name="address"></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;">
                <button class="erp-btn primary" type="submit">Simpan Vendor</button>
            </div>
        </form>
    `;
}

function renderPoForm() {
    return `
        <form class="erp-card" data-purchasing-form="purchase-order">
            <h3>Buat Pesanan Pembelian</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Vendor</label><select class="erp-select" name="vendor_id" required>${optionRows(pageState.state.vendors, 'vendor_id', 'name', 'Tambah vendor dahulu')}</select></div>
                <div class="erp-field"><label>Item Bahan</label><select class="erp-select" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventory dahulu')}</select></div>
                <div class="erp-field"><label>Tanggal PO</label><input class="erp-input" name="po_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Tanggal Kebutuhan</label><input class="erp-input" name="delivery_date" type="date" required></div>
                <div class="erp-field"><label>Qty</label><input class="erp-input" name="qty" type="number" min="0" step="0.01" required></div>
                <div class="erp-field"><label>Harga Satuan</label><input class="erp-input" name="unit_price" type="number" min="0" step="100" required></div>
                <div class="erp-field"><label>Pajak</label><input class="erp-input" name="tax" type="number" min="0" step="100" value="0"></div>
                <div class="erp-field"><label>Status Persetujuan</label><select class="erp-select" name="approval_status"><option value="disetujui">Disetujui</option><option value="menunggu">Menunggu</option></select></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;">
                <button class="erp-btn primary" type="submit">Simpan PO</button>
            </div>
        </form>
    `;
}

function renderRequestForm() {
    return `
        <form class="erp-card" data-purchasing-form="purchase-request">
            <h3>Permintaan Pembelian</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Tanggal Request</label><input class="erp-input" name="request_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Tanggal Dibutuhkan</label><input class="erp-input" name="needed_date" type="date" required></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;">
                <button class="erp-btn" type="submit">Simpan Request</button>
            </div>
        </form>
    `;
}

function renderReceivingForm() {
    return `
        <form class="erp-card" data-purchasing-form="receiving">
            <h3>Catat Penerimaan Barang</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>PO</label><select class="erp-select" name="po_id" required>${optionRows(pageState.state.purchaseOrders, 'po_id', 'po_id', 'Buat PO dahulu')}</select></div>
                <div class="erp-field"><label>Item Bahan</label><select class="erp-select" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventory dahulu')}</select></div>
                <div class="erp-field"><label>Qty Diterima</label><input class="erp-input" name="received_qty" type="number" min="0" step="0.01" required></div>
                <div class="erp-field"><label>Qty Ditolak</label><input class="erp-input" name="rejected_qty" type="number" min="0" step="0.01" value="0"></div>
                <div class="erp-field"><label>Status QC</label><select class="erp-select" name="qc_status"><option value="lulus">Lulus</option><option value="karantina">Karantina</option><option value="ditolak">Ditolak</option></select></div>
                <div class="erp-field"><label>Suhu</label><input class="erp-input" name="temperature" placeholder="Contoh: 5 C"></div>
                <div class="erp-field"><label>Kode Batch</label><input class="erp-input" name="batch_code"></div>
                <div class="erp-field"><label>Tanggal Expired</label><input class="erp-input" name="expiry_date" type="date"></div>
                <div class="erp-field"><label>Lokasi</label><input class="erp-input" name="location" value="Gudang Utama"></div>
                <div class="erp-field"><label>Diterima Pada</label><input class="erp-input" name="received_at" type="datetime-local"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;">
                <button class="erp-btn primary" type="submit">Simpan Penerimaan</button>
            </div>
        </form>
    `;
}

function renderInvoiceForm() {
    return `
        <form class="erp-card" data-purchasing-form="invoice">
            <h3>Catat Faktur Supplier</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Vendor</label><select class="erp-select" name="vendor_id" required>${optionRows(pageState.state.vendors, 'vendor_id', 'name', 'Tambah vendor dahulu')}</select></div>
                <div class="erp-field"><label>PO</label><select class="erp-select" name="po_id" required>${optionRows(pageState.state.purchaseOrders, 'po_id', 'po_id', 'Buat PO dahulu')}</select></div>
                <div class="erp-field"><label>Nomor Faktur</label><input class="erp-input" name="invoice_number" required></div>
                <div class="erp-field"><label>Tanggal Faktur</label><input class="erp-input" name="invoice_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Nilai</label><input class="erp-input" name="amount" type="number" min="0" step="100" required></div>
                <div class="erp-field"><label>Status Pembayaran</label><select class="erp-select" name="payment_status"><option value="belum-lunas">Belum Lunas</option><option value="proses">Proses</option><option value="lunas">Lunas</option></select></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;">
                <button class="erp-btn primary" type="submit">Simpan Faktur</button>
            </div>
        </form>
    `;
}

function renderPoTable() {
    const rows = pageState.state.purchaseOrders.slice(0, 12).map((po) => `
        <tr>
            <td>${esc(po.po_id)}</td>
            <td>${esc(vendorName(po.vendor_id))}</td>
            <td>${esc(po.po_date || '-')}</td>
            <td>${esc(po.delivery_date || '-')}</td>
            <td>Rp ${money(po.total)}</td>
            <td><span class="erp-status ${po.status === 'diterima' ? 'safe' : 'warning'}">${esc(po.status || 'dipesan')}</span></td>
        </tr>
    `).join('');

    return renderTable(['PO', 'Vendor', 'Tanggal PO', 'Kebutuhan', 'Total', 'Status'], rows, 'Belum ada pesanan pembelian.');
}

function renderVendorTable() {
    const rows = pageState.state.vendors.slice(0, 12).map((vendor) => `
        <tr>
            <td>${esc(vendor.name)}</td>
            <td>${esc(vendor.category)}</td>
            <td>${esc(vendor.contact_name)}</td>
            <td>${esc(vendor.phone)}</td>
            <td>${esc(vendor.payment_term)}</td>
            <td><span class="erp-status safe">${esc(vendor.status || 'aktif')}</span></td>
        </tr>
    `).join('');

    return renderTable(['Vendor', 'Kategori', 'PIC', 'HP', 'Termin', 'Status'], rows, 'Belum ada vendor.');
}

function renderReceivingTable() {
    const rows = pageState.state.receivingRecords.slice(0, 12).map((record) => `
        <tr>
            <td>${esc(record.receiving_id)}</td>
            <td>${esc(record.po_id)}</td>
            <td>${esc(itemName(record.item_id))}</td>
            <td>${esc(record.received_qty)}</td>
            <td>${esc(record.rejected_qty || 0)}</td>
            <td><span class="erp-status ${record.qc_status === 'lulus' ? 'safe' : 'warning'}">${esc(record.qc_status || '-')}</span></td>
            <td>${esc(record.received_at || '-')}</td>
        </tr>
    `).join('');

    return renderTable(['Penerimaan', 'PO', 'Item', 'Diterima', 'Ditolak', 'QC', 'Waktu'], rows, 'Belum ada penerimaan.');
}

function renderInvoiceTable() {
    const rows = pageState.state.supplierInvoices.slice(0, 12).map((invoice) => `
        <tr>
            <td>${esc(invoice.invoice_number)}</td>
            <td>${esc(vendorName(invoice.vendor_id))}</td>
            <td>${esc(invoice.po_id)}</td>
            <td>${esc(invoice.invoice_date)}</td>
            <td>Rp ${money(invoice.amount)}</td>
            <td><span class="erp-status ${invoice.payment_status === 'lunas' ? 'safe' : 'warning'}">${esc(invoice.payment_status || 'belum-lunas')}</span></td>
        </tr>
    `).join('');

    return renderTable(['Faktur', 'Vendor', 'PO', 'Tanggal', 'Nilai', 'Status'], rows, 'Belum ada faktur.');
}

function renderTable(headers, rows, emptyText) {
    return `
        <div class="erp-table-wrap">
            <table class="erp-table">
                <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
                <tbody>${rows || `<tr><td colspan="${headers.length}">${emptyText}</td></tr>`}</tbody>
            </table>
        </div>
    `;
}

function renderActiveView() {
    if (pageState.activeView === 'vendor') {
        return `${renderVendorForm()}<div class="erp-card module-card-gap"><h3>Daftar Vendor</h3>${renderVendorTable()}</div>`;
    }
    if (pageState.activeView === 'receiving') {
        return `${renderReceivingForm()}<div class="erp-card module-card-gap"><h3>Riwayat Penerimaan</h3>${renderReceivingTable()}</div>`;
    }
    if (pageState.activeView === 'invoice') {
        return `${renderInvoiceForm()}<div class="erp-card module-card-gap"><h3>Faktur Supplier</h3>${renderInvoiceTable()}</div>`;
    }

    return `
        <div class="module-two-col">
            ${renderPoForm()}
            ${renderRequestForm()}
        </div>
        <div class="erp-card module-card-gap">
            <h3>Pesanan Pembelian</h3>
            ${renderPoTable()}
        </div>
    `;
}

function renderPurchasingContent() {
    const root = document.getElementById('purchasing-root');
    if (!root) return;

    if (pageState.loading) {
        root.innerHTML = '<div class="erp-card inventory-loading"><h3>Memuat Pengadaan dari GAS</h3><p class="erp-muted">Mengambil vendor, PO, penerimaan, dan faktur...</p></div>';
        return;
    }

    if (pageState.error) {
        root.innerHTML = `<div class="erp-card inventory-error"><h3>Pengadaan tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-purchasing" type="button">Coba Lagi</button></div>`;
        return;
    }

    root.innerHTML = `${renderStats()}${renderActionBar()}${renderViewNav()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadPurchasing() {
    pageState.loading = true;
    pageState.error = '';
    renderPurchasingContent();

    try {
        pageState.state = await getPurchasingState();
    } catch (error) {
        pageState.error = error.message;
    } finally {
        pageState.loading = false;
        renderPurchasingContent();
    }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Menyimpan...';

    if (form.dataset.purchasingForm === 'vendor') await createVendor(payload);
    if (form.dataset.purchasingForm === 'purchase-request') await createPurchaseRequest(payload);
    if (form.dataset.purchasingForm === 'purchase-order') await createPurchaseOrder(payload, pageState.state);
    if (form.dataset.purchasingForm === 'receiving') await recordReceiving(payload, pageState.state);
    if (form.dataset.purchasingForm === 'invoice') await createSupplierInvoice(payload);

    await loadPurchasing();
}

function bindPurchasingEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('purchasing-root')) return;
        const viewButton = event.target.closest('[data-purchasing-view], [data-jump-view]');
        if (viewButton) {
            pageState.activeView = viewButton.dataset.purchasingView || viewButton.dataset.jumpView;
            renderPurchasingContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget?.dataset.action === 'refresh-purchasing') await loadPurchasing();
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('purchasing-root')) return;
        if (!event.target.matches('[data-purchasing-form]')) return;

        event.preventDefault();
        try {
            await handleSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            await loadPurchasing();
        }
    });
}

let eventsBound = false;

export function PurchasingPage() {
    return '<div id="purchasing-root"></div>';
}

export function initPurchasingPage() {
    if (!eventsBound) {
        bindPurchasingEvents();
        eventsBound = true;
    }
    loadPurchasing();
}
