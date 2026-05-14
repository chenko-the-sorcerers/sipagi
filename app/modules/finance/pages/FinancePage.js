import {
    createAccount,
    createAsset,
    createAssetMaintenance,
    createBudget,
    createFinanceTransaction,
    createPayment,
    deleteAsset,
    getFinanceState,
    getFinanceSummaryFromState
} from '../services/financeApi.js';
import { LoadingCard, showDetailModal } from '../../../shared/components/ModuleComponents.js';

const pageState = {
    activeView: 'overview',
    loading: true,
    error: '',
    state: {
        accounts: [],
        transactions: [],
        assets: [],
        budgets: [],
        payments: [],
        invoices: [],
        purchaseOrders: [],
        assetMaintenance: []
    }
};

const views = [
    { id: 'overview', label: 'Overview', description: 'Ringkasan RAB, pengajuan dana, kas kecil, pembayaran, dan rekonsiliasi.' },
    { id: 'rab-harian', label: 'RAB Harian', description: 'Anggaran operasional harian dan realisasinya.' },
    { id: 'pengajuan-dana', label: 'Pengajuan Dana', description: 'Kontrol status pengajuan dan approval.' },
    { id: 'petty-cash', label: 'Kas Kecil / Petty Cash', description: 'Jurnal kas kecil dan bukti pengeluaran.' },
    { id: 'pembayaran-supplier', label: 'Pembayaran Supplier', description: 'Pembayaran faktur supplier.' },
    { id: 'bukti-pengeluaran', label: 'Bukti Pengeluaran', description: 'Transaksi biaya dan lampiran bukti.' },
    { id: 'rekonsiliasi-va', label: 'Rekonsiliasi VA', description: 'Cek selisih VA, pembayaran, dan jurnal.' },
    { id: 'laporan-keuangan', label: 'Laporan Keuangan', description: 'Ringkasan kas, aset, budget, dan export.' },
    { id: 'transactions', label: 'Debit Kredit', description: 'Jurnal kas masuk, kas keluar, dan referensi transaksi.' },
    { id: 'accounts', label: 'Bagan Akun', description: 'Master akun biaya, kas, aset, utang, dan pendapatan.' },
    { id: 'assets', label: 'Register Aset', description: 'Inventaris aset dapur, kendaraan, alat produksi, kode barang, dan kondisinya.' },
    { id: 'asset-maintenance', label: 'Maintenance Aset', description: 'Riwayat servis, biaya, temuan, dan jadwal maintenance berikutnya.' },
    { id: 'budgets', label: 'Budget', description: 'Anggaran per modul, realisasi, dan selisih.' },
    { id: 'payments', label: 'Pembayaran', description: 'Pembayaran faktur supplier dan bukti transfer.' },
    { id: 'report', label: 'Report', description: 'Ringkasan kas, aset, budget, pembayaran, dan export CSV.' }
];

const viewAliases = {
    'rab-harian': 'budgets',
    'pengajuan-dana': 'budgets',
    'petty-cash': 'transactions',
    'pembayaran-supplier': 'payments',
    'bukti-pengeluaran': 'transactions',
    'rekonsiliasi-va': 'report',
    'laporan-keuangan': 'report'
};

function normalizeFinanceView(view) {
    return viewAliases[view] || view || 'overview';
}

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

function accountLabel(id) {
    const account = pageState.state.accounts.find((row) => row.account_id === id);
    return account ? `${account.account_code} - ${account.account_name}` : id || '-';
}

function invoiceLabel(invoice) {
    const number = invoice.invoice_number || invoice.invoice_id;
    return `${number} - Rp ${money(invoice.amount)} - ${invoice.payment_status || 'belum-lunas'}`;
}

function assetLabel(asset) {
    return `${asset.name || asset.asset_id} - ${asset.location || '-'}`;
}

function assetName(id) {
    return pageState.state.assets.find((row) => row.asset_id === id)?.name || id || '-';
}

function renderStats() {
    const summary = getFinanceSummaryFromState(pageState.state);
    const cards = [
        ['Total Debit', `Rp ${money(summary.debit)}`, 'Kas masuk dan penambahan saldo'],
        ['Total Kredit', `Rp ${money(summary.credit)}`, 'Kas keluar dan pembayaran'],
        ['Saldo Bersih', `Rp ${money(summary.balance)}`, 'Debit dikurangi kredit'],
        ['Nilai Aset', `Rp ${money(summary.assetValue)}`, `${summary.unpaidInvoices} faktur belum lunas`],
        ['Sisa Budget', `Rp ${money(summary.budgetVariance)}`, 'Anggaran dikurangi realisasi']
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
                <button class="inventory-view-card ${pageState.activeView === view.id ? 'active' : ''}" data-finance-view="${view.id}" type="button">
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
            <button class="erp-btn primary" data-action="refresh-finance" type="button">Refresh Data</button>
            <button class="erp-btn" data-jump-view="transactions" type="button">Tambah Jurnal</button>
            <button class="erp-btn" data-jump-view="assets" type="button">Tambah Aset</button>
            <button class="erp-btn" data-jump-view="asset-maintenance" type="button">Maintenance Aset</button>
            <button class="erp-btn" data-jump-view="payments" type="button">Bayar Faktur</button>
            <button class="erp-btn" data-jump-view="report" type="button">Report</button>
            <button class="erp-btn" data-action="download-finance-report" type="button">Unduh Laporan</button>
        </div>
    `;
}

function renderAccountForm() {
    return `
        <form class="erp-card" data-finance-form="account">
            <h3>Tambah Akun</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Kode Akun</label><input class="erp-input" name="account_code" placeholder="1101" required></div>
                <div class="erp-field"><label>Nama Akun</label><input class="erp-input" name="account_name" placeholder="Kas Operasional" required></div>
                <div class="erp-field"><label>Tipe</label><select class="erp-select" name="type"><option value="aset">Aset</option><option value="kas">Kas</option><option value="biaya">Biaya</option><option value="utang">Utang</option><option value="pendapatan">Pendapatan</option></select></div>
                <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Akun</button></div>
        </form>
    `;
}

function renderTransactionForm() {
    return `
        <form class="erp-card" data-finance-form="transaction">
            <h3>Tambah Jurnal Debit Kredit</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Akun</label><select class="erp-select" name="account_id" required>${optionRows(pageState.state.accounts, 'account_id', 'account_name', 'Tambah akun dahulu')}</select></div>
                <div class="erp-field"><label>Tanggal</label><input class="erp-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Tipe</label><select class="erp-select" name="type"><option value="debit">Debit</option><option value="credit">Kredit</option></select></div>
                <div class="erp-field"><label>Nominal</label><input class="erp-input" name="amount" type="number" min="0" step="100" required></div>
                <div class="erp-field"><label>Kategori</label><select class="erp-select" name="category"><option value="bahan pangan">Bahan Pangan</option><option value="operasional dapur">Operasional Dapur</option><option value="transportasi">Transportasi</option><option value="payroll">Payroll</option><option value="aset">Aset</option><option value="lainnya">Lainnya</option></select></div>
                <div class="erp-field"><label>Cost Center</label><select class="erp-select" name="cost_center"><option value="planning">Planning</option><option value="purchasing">Purchasing</option><option value="inventory">Inventory</option><option value="production">Production</option><option value="distribution">Distribution</option><option value="hr">HR</option><option value="umum">Umum</option></select></div>
                <div class="erp-field"><label>Metode Bayar</label><select class="erp-select" name="payment_method"><option value="transfer">Transfer</option><option value="tunai">Tunai</option><option value="qris">QRIS</option><option value="bank">Bank</option><option value="manual">Manual</option></select></div>
                <div class="erp-field"><label>Approval</label><select class="erp-select" name="approval_status"><option value="draft">Draft</option><option value="menunggu">Menunggu</option><option value="disetujui">Disetujui</option><option value="ditolak">Ditolak</option></select></div>
                <div class="erp-field"><label>Referensi</label><select class="erp-select" name="reference_type"><option value="manual">Manual</option><option value="purchase_order">Purchase Order</option><option value="supplier_invoice">Faktur Supplier</option><option value="payroll">Payroll</option></select></div>
                <div class="erp-field"><label>ID Referensi</label><input class="erp-input" name="reference_id" placeholder="Opsional"></div>
                <div class="erp-field full"><label>Deskripsi</label><textarea class="erp-textarea" name="description" required></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Jurnal</button></div>
        </form>
    `;
}

function renderAssetForm() {
    return `
        <form class="erp-card" data-finance-form="asset">
            <h3>Tambah Aset</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Kode Barang</label><input class="erp-input" name="asset_code" placeholder="AST-KCH-001"></div>
                <div class="erp-field"><label>Nama Aset</label><input class="erp-input" name="name" placeholder="Freezer, mobil box, kompor..." required></div>
                <div class="erp-field"><label>Kategori</label><input class="erp-input" name="category" required></div>
                <div class="erp-field"><label>Serial Number</label><input class="erp-input" name="serial_number" placeholder="Opsional"></div>
                <div class="erp-field"><label>Tanggal Beli</label><input class="erp-input" name="purchase_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Nilai Beli</label><input class="erp-input" name="purchase_value" type="number" min="0" step="1000" required></div>
                <div class="erp-field"><label>Kondisi</label><select class="erp-select" name="condition"><option value="baik">Baik</option><option value="perlu-servis">Perlu Servis</option><option value="rusak">Rusak</option></select></div>
                <div class="erp-field"><label>Lokasi</label><input class="erp-input" name="location" required></div>
                <div class="erp-field"><label>PIC Aset</label><input class="erp-input" name="responsible_person" placeholder="Penanggung jawab"></div>
                <div class="erp-field"><label>Umur Manfaat</label><input class="erp-input" name="useful_life_months" type="number" min="1" placeholder="Bulan"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Aset</button></div>
        </form>
    `;
}

function renderBudgetForm() {
    return `
        <form class="erp-card" data-finance-form="budget">
            <h3>Tambah Budget</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Periode</label><input class="erp-input" name="period" placeholder="2026-05" required></div>
                <div class="erp-field"><label>Modul</label><select class="erp-select" name="module"><option value="inventory">Inventori</option><option value="purchasing">Pengadaan</option><option value="operational">Operasional</option><option value="hr">HR</option><option value="general">Umum</option></select></div>
                <div class="erp-field"><label>Anggaran</label><input class="erp-input" name="budget_amount" type="number" min="0" step="1000" required></div>
                <div class="erp-field"><label>Realisasi</label><input class="erp-input" name="actual_amount" type="number" min="0" step="1000" value="0"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Budget</button></div>
        </form>
    `;
}

function renderAssetMaintenanceForm() {
    return `
        <form class="erp-card" data-finance-form="asset-maintenance">
            <h3>Catat Maintenance Aset</h3>
            <div class="erp-form-grid">
                <div class="erp-field full"><label>Aset</label><select class="erp-select" name="asset_id" required>${pageState.state.assets.length ? pageState.state.assets.map((asset) => `<option value="${esc(asset.asset_id)}">${esc(assetLabel(asset))}</option>`).join('') : '<option value="">Belum ada aset</option>'}</select></div>
                <div class="erp-field"><label>Tanggal</label><input class="erp-input" name="maintenance_date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div>
                <div class="erp-field"><label>Jenis</label><select class="erp-select" name="type"><option value="servis">Servis</option><option value="kalibrasi">Kalibrasi</option><option value="perbaikan">Perbaikan</option><option value="inspeksi">Inspeksi</option></select></div>
                <div class="erp-field"><label>Vendor / Teknisi</label><input class="erp-input" name="vendor" placeholder="Internal / vendor"></div>
                <div class="erp-field"><label>Biaya</label><input class="erp-input" name="cost" type="number" min="0" step="1000" value="0"></div>
                <div class="erp-field"><label>Jadwal Berikutnya</label><input class="erp-input" name="next_schedule" type="date"></div>
                <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="selesai">Selesai</option><option value="proses">Proses</option><option value="butuh tindak lanjut">Butuh Tindak Lanjut</option></select></div>
                <div class="erp-field full"><label>Temuan</label><textarea class="erp-textarea" name="finding" placeholder="Catatan kondisi, sparepart, risiko downtime..."></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Maintenance</button></div>
        </form>
    `;
}

function renderPaymentForm() {
    return `
        <form class="erp-card" data-finance-form="payment">
            <h3>Bayar Faktur Supplier</h3>
            <div class="erp-form-grid">
                <div class="erp-field full"><label>Faktur</label><select class="erp-select" name="invoice_id" required>${pageState.state.invoices.length ? pageState.state.invoices.map((invoice) => `<option value="${esc(invoice.invoice_id)}">${esc(invoiceLabel(invoice))}</option>`).join('') : '<option value="">Belum ada faktur supplier</option>'}</select></div>
                <div class="erp-field"><label>Tanggal Bayar</label><input class="erp-input" name="payment_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Nominal</label><input class="erp-input" name="amount" type="number" min="0" step="100" required></div>
                <div class="erp-field"><label>Metode</label><select class="erp-select" name="method"><option value="transfer">Transfer</option><option value="tunai">Tunai</option><option value="qris">QRIS</option></select></div>
                <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="dibayar">Dibayar</option><option value="proses">Proses</option></select></div>
                <label class="module-check"><input type="checkbox" name="mark_invoice_paid"> Tandai faktur lunas</label>
                <div class="erp-field full"><label>URL Bukti</label><input class="erp-input" name="proof_url" placeholder="Opsional"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Pembayaran</button></div>
        </form>
    `;
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

function renderAccountTable() {
    const rows = pageState.state.accounts.slice(0, 12).map((row) => `
        <tr><td>${esc(row.account_code)}</td><td>${esc(row.account_name)}</td><td>${esc(row.type)}</td><td><span class="erp-status safe">${esc(row.status || 'aktif')}</span></td></tr>
    `).join('');
    return renderTable(['Kode', 'Nama Akun', 'Tipe', 'Status'], rows, 'Belum ada akun.');
}

function renderTransactionTable() {
    const rows = pageState.state.transactions.slice(0, 12).map((row) => `
        <tr class="sipagi-clickable" data-finance-detail="transaction" data-transaction-id="${esc(row.transaction_id)}"><td>${esc(row.date)}</td><td>${esc(accountLabel(row.account_id))}</td><td><span class="erp-status ${row.type === 'debit' ? 'safe' : 'warning'}">${esc(row.type)}</span></td><td>Rp ${money(row.amount)}</td><td>${esc(row.reference_type || '-')}</td><td>${esc(row.description || '-')}</td></tr>
    `).join('');
    return renderTable(['Tanggal', 'Akun', 'Tipe', 'Nominal', 'Referensi', 'Deskripsi'], rows, 'Belum ada jurnal.');
}

function renderAssetTable() {
    const rows = pageState.state.assets.slice(0, 12).map((row) => `
        <tr class="sipagi-clickable" data-finance-detail="asset" data-asset-id="${esc(row.asset_id)}"><td>${esc(row.name)}</td><td>${esc(row.category)}</td><td>${esc(row.purchase_date)}</td><td>Rp ${money(row.purchase_value)}</td><td>${esc(row.condition)}</td><td>${esc(row.location)}</td></tr>
    `).join('');
    return renderTable(['Aset', 'Kategori', 'Tanggal Beli', 'Nilai', 'Kondisi', 'Lokasi'], rows, 'Belum ada aset.');
}

function renderAssetCards() {
    const cards = pageState.state.assets.slice(0, 12).map((row) => `
        <article class="finance-asset-card sipagi-clickable" data-finance-detail="asset" data-asset-id="${esc(row.asset_id)}">
            <div><strong>${esc(row.name)}</strong><span>${esc(row.category || '-')}</span></div>
            <small>Nilai: Rp ${money(row.purchase_value)}</small>
            <small>Kondisi: ${esc(row.condition || '-')}</small>
            <small>Lokasi: ${esc(row.location || '-')}</small>
        </article>
    `).join('');
    return `<div class="finance-asset-grid">${cards || '<p class="erp-muted">Belum ada aset.</p>'}</div>`;
}

function renderAssetMaintenanceTable() {
    const rows = pageState.state.assetMaintenance.slice(0, 14).map((row) => `
        <tr><td>${esc(row.maintenance_date)}</td><td>${esc(assetName(row.asset_id))}</td><td>${esc(row.type)}</td><td>${esc(row.vendor || '-')}</td><td>Rp ${money(row.cost)}</td><td>${esc(row.next_schedule || '-')}</td><td><span class="erp-status warning">${esc(row.status || 'selesai')}</span></td></tr>
    `).join('');
    return renderTable(['Tanggal', 'Aset', 'Jenis', 'Vendor', 'Biaya', 'Jadwal Berikutnya', 'Status'], rows, 'Belum ada maintenance aset.');
}

function renderBudgetTable() {
    const rows = pageState.state.budgets.slice(0, 12).map((row) => `
        <tr><td>${esc(row.period)}</td><td>${esc(row.module)}</td><td>Rp ${money(row.budget_amount)}</td><td>Rp ${money(row.actual_amount)}</td><td>Rp ${money(row.variance_amount)}</td><td><span class="erp-status safe">${esc(row.status || 'aktif')}</span></td></tr>
    `).join('');
    return renderTable(['Periode', 'Modul', 'Anggaran', 'Realisasi', 'Selisih', 'Status'], rows, 'Belum ada budget.');
}

function renderPaymentTable() {
    const rows = pageState.state.payments.slice(0, 12).map((row) => `
        <tr class="sipagi-clickable" data-finance-detail="payment" data-payment-id="${esc(row.payment_id)}"><td>${esc(row.payment_date)}</td><td><button class="erp-btn" data-finance-detail="invoice" data-invoice-id="${esc(row.invoice_id)}" type="button">${esc(row.invoice_id)}</button></td><td>Rp ${money(row.amount)}</td><td>${esc(row.method)}</td><td><span class="erp-status safe">${esc(row.status)}</span></td><td>${row.proof_url ? `<a href="${esc(row.proof_url)}" target="_blank">Bukti</a>` : '-'}</td></tr>
    `).join('');
    return renderTable(['Tanggal', 'Faktur', 'Nominal', 'Metode', 'Status', 'Bukti'], rows, 'Belum ada pembayaran.');
}

function renderReportPanel() {
    const summary = getFinanceSummaryFromState(pageState.state);
    return `
        <div class="erp-card">
            <h3>Report Finance</h3>
            <div class="sipagi-access-summary" style="margin-top: 1rem;">
                <span>Saldo Bersih</span><strong>Rp ${money(summary.balance)}</strong>
                <span>Nilai Aset</span><strong>Rp ${money(summary.assetValue)}</strong>
                <span>Sisa Budget</span><strong>Rp ${money(summary.budgetVariance)}</strong>
                <span>Faktur Belum Lunas</span><strong>${summary.unpaidInvoices}</strong>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" data-action="download-finance-report" type="button">Unduh CSV Jurnal</button></div>
        </div>
        <div class="erp-card module-card-gap"><h3>Ringkasan Aset</h3>${renderAssetCards()}</div>
    `;
}

function renderFinanceOverview() {
    const summary = getFinanceSummaryFromState(pageState.state);
    const pendingPayments = pageState.state.payments.filter((row) => !['lunas', 'paid', 'selesai'].includes(String(row.status || '').toLowerCase())).length;
    const pendingInvoices = pageState.state.invoices.filter((row) => !['lunas', 'paid', 'posted'].includes(String(row.payment_status || '').toLowerCase())).length;
    const openBudgets = pageState.state.budgets.filter((row) => !['closed', 'selesai'].includes(String(row.status || '').toLowerCase())).length;
    const cards = [
        ['RAB Harian', openBudgets, `Sisa budget Rp ${money(summary.budgetVariance)}`],
        ['Pengajuan Dana', pageState.state.budgets.filter((row) => ['draft', 'submitted', 'pending'].includes(String(row.status || '').toLowerCase())).length, 'Menunggu approval/realisasi'],
        ['Kas Kecil', `Rp ${money(summary.balance)}`, 'Saldo kas bersih'],
        ['Pembayaran Supplier', pendingPayments + pendingInvoices, 'Tagihan belum final'],
        ['Bukti Pengeluaran', pageState.state.transactions.length, 'Jurnal dan lampiran biaya'],
        ['Rekonsiliasi VA', Math.max(pendingInvoices - pendingPayments, 0), 'Potensi selisih perlu cek']
    ];
    const rows = pageState.state.transactions.slice(0, 8).map((row) => `
        <tr class="sipagi-clickable" data-finance-detail="transaction" data-transaction-id="${esc(row.transaction_id)}">
            <td>${esc(row.date)}</td>
            <td>${esc(accountLabel(row.account_id))}</td>
            <td>${esc(row.type)}</td>
            <td>Rp ${money(row.amount)}</td>
            <td>${esc(row.description)}</td>
        </tr>
    `).join('');

    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Overview Finance</h3>
                    <p class="kt-card-description">Pencatatan RAB, pengajuan dana, kas kecil, pembayaran supplier, bukti pengeluaran, dan rekonsiliasi.</p>
                </div>
                <a class="kt-btn kt-btn-sm kt-btn-primary" href="#finance/petty-cash">Tambah Jurnal</a>
            </div>
            <div class="kt-card-content grid gap-4">
                <div class="erp-grid">${cards.map(([label, value, note]) => `<article class="erp-card"><div class="erp-stat-label">${label}</div><div class="erp-stat-value">${value}</div><div class="erp-stat-note">${note}</div></article>`).join('')}</div>
                <div class="erp-table-wrap">
                    <table class="erp-table">
                        <thead><tr><th>Tanggal</th><th>Akun</th><th>Tipe</th><th>Nilai</th><th>Keterangan</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="5">Belum ada transaksi.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </section>
    `;
}

function renderActiveView() {
    const activeView = normalizeFinanceView(pageState.activeView);
    if (activeView === 'overview') return renderFinanceOverview();
    if (activeView === 'accounts') return `${renderAccountForm()}<div class="erp-card module-card-gap"><h3>Bagan Akun</h3>${renderAccountTable()}</div>`;
    if (activeView === 'assets') return `${renderAssetForm()}<div class="erp-card module-card-gap"><h3>Kartu Aset</h3>${renderAssetCards()}</div><div class="erp-card module-card-gap"><h3>Daftar Aset</h3>${renderAssetTable()}</div>`;
    if (activeView === 'asset-maintenance') return `${renderAssetMaintenanceForm()}<div class="erp-card module-card-gap"><h3>Riwayat Maintenance Aset</h3>${renderAssetMaintenanceTable()}</div>`;
    if (activeView === 'budgets') return `${renderBudgetForm()}<div class="erp-card module-card-gap"><h3>Budget Modul</h3>${renderBudgetTable()}</div>`;
    if (activeView === 'payments') return `${renderPaymentForm()}<div class="erp-card module-card-gap"><h3>Pembayaran Faktur</h3>${renderPaymentTable()}</div>`;
    if (activeView === 'report') return renderReportPanel();
    return `${renderTransactionForm()}<div class="erp-card module-card-gap"><h3>Jurnal Debit Kredit</h3>${renderTransactionTable()}</div>`;
}

function renderFinanceContent() {
    const root = document.getElementById('finance-root');
    if (!root) return;

    if (pageState.loading) {
        root.innerHTML = LoadingCard({ title: 'Memuat Finance dari Data', text: 'Mengambil akun, transaksi, aset, budget, pembayaran, dan faktur...' });
        return;
    }

    if (pageState.error) {
        root.innerHTML = `<div class="erp-card inventory-error"><h3>Finance tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-finance" type="button">Coba Lagi</button></div>`;
        return;
    }

    root.innerHTML = `${renderStats()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadFinance() {
    pageState.loading = true;
    pageState.error = '';
    renderFinanceContent();

    try {
        pageState.state = await getFinanceState();
    } catch (error) {
        pageState.error = error.message;
    } finally {
        pageState.loading = false;
        renderFinanceContent();
    }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Menyimpan...';

    if (form.dataset.financeForm === 'account') await createAccount(payload);
    if (form.dataset.financeForm === 'transaction') await createFinanceTransaction(payload, pageState.state);
    if (form.dataset.financeForm === 'asset') await createAsset(payload);
    if (form.dataset.financeForm === 'asset-maintenance') await createAssetMaintenance(payload, pageState.state);
    if (form.dataset.financeForm === 'budget') await createBudget(payload);
    if (form.dataset.financeForm === 'payment') await createPayment(payload, pageState.state);

    await loadFinance();
}

function downloadFinanceReport() {
    const headers = ['tanggal', 'akun', 'tipe', 'nominal', 'referensi', 'deskripsi'];
    const rows = pageState.state.transactions.map((row) => [
        row.date,
        accountLabel(row.account_id),
        row.type,
        row.amount,
        row.reference_type,
        row.description
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-finance-sipagi-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function openFinanceDetail(type, id) {
    const maps = {
        transaction: pageState.state.transactions.find((row) => row.transaction_id === id),
        asset: pageState.state.assets.find((row) => row.asset_id === id),
        payment: pageState.state.payments.find((row) => row.payment_id === id),
        invoice: pageState.state.invoices.find((row) => row.invoice_id === id)
    };
    const row = maps[type];
    if (!row) return;
    if (type === 'asset') {
        showDetailModal({
            title: row.name,
            subtitle: row.category,
            rows: [['ID Aset', esc(row.asset_id)], ['Tanggal Beli', esc(row.purchase_date)], ['Nilai', `Rp ${money(row.purchase_value)}`], ['Kondisi', esc(row.condition)], ['Lokasi / PIC', esc(row.location)], ['Status', esc(row.status || 'aktif')]],
            actions: [{ label: 'Hapus Aset', className: 'danger', attr: `data-finance-delete-asset="${esc(row.asset_id)}"` }]
        });
        return;
    }
    if (type === 'invoice') {
        showDetailModal({
            title: row.invoice_number || row.invoice_id,
            subtitle: `PO ${row.po_id || '-'} · ${row.payment_status || '-'}`,
            rows: [['ID Faktur', esc(row.invoice_id)], ['Vendor', esc(row.vendor_id)], ['Tanggal', esc(row.invoice_date)], ['Nilai', `Rp ${money(row.amount)}`], ['Status Bayar', esc(row.payment_status)], ['File', row.file_url ? `<a href="${esc(row.file_url)}" target="_blank">Buka file faktur</a>` : '-']]
        });
        return;
    }
    if (type === 'payment') {
        showDetailModal({ title: `Pembayaran ${row.payment_id}`, subtitle: row.invoice_id, rows: [['Tanggal', esc(row.payment_date)], ['Nominal', `Rp ${money(row.amount)}`], ['Metode', esc(row.method)], ['Status', esc(row.status)], ['Bukti', row.proof_url ? `<a href="${esc(row.proof_url)}" target="_blank">Buka bukti</a>` : '-']] });
        return;
    }
    showDetailModal({ title: `Jurnal ${row.transaction_id}`, subtitle: accountLabel(row.account_id), rows: [['Tanggal', esc(row.date)], ['Tipe', esc(row.type)], ['Nominal', `Rp ${money(row.amount)}`], ['Referensi', `${esc(row.reference_type)} ${esc(row.reference_id)}`], ['Deskripsi', esc(row.description)]] });
}

function bindFinanceEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('finance-root')) return;
        const viewButton = event.target.closest('[data-finance-view], [data-jump-view]');
        if (viewButton) {
            pageState.activeView = viewButton.dataset.financeView || viewButton.dataset.jumpView;
            renderFinanceContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget?.dataset.action === 'refresh-finance') await loadFinance();
        if (actionTarget?.dataset.action === 'download-finance-report') downloadFinanceReport();

        const detailTarget = event.target.closest('[data-finance-detail]');
        if (detailTarget) {
            openFinanceDetail(detailTarget.dataset.financeDetail, detailTarget.dataset.transactionId || detailTarget.dataset.assetId || detailTarget.dataset.paymentId || detailTarget.dataset.invoiceId);
            return;
        }

        const deleteAssetTarget = event.target.closest('[data-finance-delete-asset]');
        if (deleteAssetTarget && window.confirm('Hapus aset ini?')) {
            await deleteAsset(deleteAssetTarget.dataset.financeDeleteAsset);
            document.querySelector('.sipagi-modal-backdrop')?.remove();
            await loadFinance();
        }
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('finance-root')) return;
        if (!event.target.matches('[data-finance-form]')) return;

        event.preventDefault();
        try {
            await handleSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            await loadFinance();
        }
    });
}

let eventsBound = false;

export function FinancePage() {
    return '<div id="finance-root"></div>';
}

export function initFinancePage(initialView = 'overview') {
    pageState.activeView = views.some((view) => view.id === initialView) ? initialView : 'overview';
    if (!eventsBound) {
        bindFinanceEvents();
        eventsBound = true;
    }
    loadFinance();
}
