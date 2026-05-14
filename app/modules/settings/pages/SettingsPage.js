import { getActiveRoleId, getRoleLabel, toCatalogRoleId } from '../../../shared/auth/permissionStore.js?v=settings-sidebar-20260511';

const settingGroups = [
    { title: 'Umum', items: [{ id: 'perusahaan', label: 'Profil SPPG', count: 4 }, { id: 'dashboard', label: 'Dashboard Role', count: 4 }, { id: 'pengguna', label: 'User & Role', count: 8 }] },
    { title: 'Operasional', items: [{ id: 'inventory', label: 'Produk & Inventory', count: 7 }, { id: 'approval', label: 'Aturan Approval', count: 5 }, { id: 'qc', label: 'QC & Food Safety', count: 4 }] },
    { title: 'Transaksi', items: [{ id: 'finance', label: 'Keuangan', count: 5 }, { id: 'dokumen', label: 'Template Dokumen', count: 4 }] },
    { title: 'Sistem', items: [{ id: 'notifikasi', label: 'Notifikasi', count: 3 }, { id: 'custom-fields', label: 'Custom Fields', count: 4 }, { id: 'audit', label: 'Audit Trail', count: 3 }] }
];

const roleOptions = [
    ['ahli_gizi', 'Ahli Gizi'],
    ['akuntan_pengadaan', 'Akuntan / Pengadaan'],
    ['asisten_distribusi', 'Asisten Lapangan / Distribusi'],
    ['produksi', 'Produksi'],
    ['pemorsian_packing', 'Pemorsian / Packing'],
    ['pencuci_kebersihan', 'Pencuci / Kebersihan'],
    ['sekolah', 'Sekolah'],
    ['supplier', 'Supplier']
];

const settingPanels = {
    perusahaan: { title: 'Profil SPPG', description: 'Pengaturan informasi unit SPPG, lokasi, kontak, dan penanggung jawab.', rows: [['Nama SPPG', 'Aktif', 'Nama unit yang tampil di semua laporan dan dashboard.', 'Ubah'], ['Alamat operasional', 'Perlu dilengkapi', 'Alamat dapur, kecamatan, kota, dan kode pos.', 'Lengkapi'], ['PIC Kepala SPPG', 'Aktif', 'Nama, kontak, dan tanda tangan digital approval.', 'Atur'], ['Zona waktu', 'GMT+7 Asia/Jakarta', 'Semua waktu transaksi disimpan mengikuti waktu Jakarta.', 'Ubah']] },
    dashboard: { title: 'Dashboard Role', description: 'Atur dashboard yang muncul untuk Kepala SPPG dan role operasional.', rows: [['Advance Dashboard', 'Aktif', 'KPI lintas modul, approval, risiko, dan exception.', 'Atur'], ['Ahli Gizi Dashboard', 'Aktif', 'Menu, resep, komponen, QC produksi, dan cek gizi.', 'Atur'], ['Inventory Dashboard', 'Aktif', 'Stok, batch, penerimaan, opname, FEFO, dan waste.', 'Atur'], ['Accounting Dashboard', 'Aktif', 'RAB, kas kecil, pembayaran supplier, dan laporan keuangan.', 'Atur']] },
    pengguna: { title: 'User & Role', description: 'Tambah akun role, kontrol akses halaman, dan izin CRUD per modul.', rows: [['Kepala SPPG', 'Full access', 'Buka, tambah, ubah, hapus, approve, reject, export.', 'Atur Permission'], ['Ahli Gizi', 'Operasional gizi', 'Dashboard gizi, resep, QC produksi, dan cek nutrisi.', 'Atur Permission'], ['Akuntan / Pengadaan', 'Finance & inventory', 'Inventory, supplier, RAB, petty cash, dan pembayaran.', 'Atur Permission'], ['Sekolah', 'Portal terbatas', 'Tanda terima, penerima manfaat, feedback, dan insiden.', 'Atur Permission']] },
    inventory: { title: 'Produk & Inventory', description: 'Barcode, batch, gudang, satuan, FEFO, dan fitur stok diatur dari sini.', rows: [['Barcode scanning', 'Aktif', 'Input bahan kemasan dapat memakai kamera untuk scan barcode.', 'Atur'], ['Metode stok default', 'FEFO', 'Pengeluaran produksi otomatis mengutamakan expired terdekat.', 'Ubah'], ['Expired wajib', 'Aktif', 'Penerimaan bahan dan batch stok wajib memiliki tanggal expired.', 'Atur'], ['Kode bahan otomatis', 'Aktif', 'Kode dibuat dari singkatan nama bahan dan nomor urut, contoh AY-001.', 'Atur Format'], ['Aturan simpan otomatis', 'Aktif', 'Dry storage, chiller, freezer, chemical, dan packaging storage.', 'Atur'], ['Multi lokasi gudang', 'Aktif', 'Gudang kering, chiller, freezer, produksi, dan karantina QC.', 'Kelola'], ['Stock adjustment approval', 'Aktif', 'Penyesuaian stok besar wajib review Kepala SPPG.', 'Atur Approval']] },
    approval: { title: 'Aturan Approval', description: 'Atur draft, submit, review, revisi, reject, dan approve per modul.', rows: [['Master bahan baru', 'Wajib approval', 'Draft admin inventory aktif setelah diterima Kepala SPPG.', 'Atur Flow'], ['Penerimaan bahan baku', 'Wajib approval', 'Batch stok terbentuk setelah penerimaan disetujui.', 'Atur Flow'], ['Pengajuan dana', 'Wajib approval', 'RAB dan petty cash melewati review sebelum pembayaran.', 'Atur Flow'], ['Stock adjustment', 'Bersyarat', 'Approval wajib jika nilai selisih melewati batas toleransi.', 'Atur Limit'], ['Notifikasi review', 'Aktif', 'Inbox tetap muncul sampai Kepala SPPG mengambil keputusan.', 'Atur']] },
    qc: { title: 'QC & Food Safety', description: 'Checklist QA dipisah dari master bahan dan dikontrol per jenis bahan.', rows: [['Checklist penerimaan', 'Aktif', 'Warna, bau, tekstur, kemasan, suhu, expired, dan catatan.', 'Kelola'], ['QC telur', 'Aktif', 'Pecah, retak, kotor, jumlah ditolak, dan jumlah diterima.', 'Atur'], ['Foto bukti SVG', 'Aktif', 'Foto bukti disimpan dan ditampilkan ulang sebagai SVG.', 'Atur'], ['Bank sampel', 'Siap', 'Jumlah sampel, masa simpan, dan lokasi penyimpanan.', 'Kelola']] },
    finance: { title: 'Keuangan', description: 'RAB, kas kecil, pembayaran supplier, bukti pengeluaran, dan rekonsiliasi.', rows: [['RAB harian', 'Aktif', 'Template anggaran harian berdasarkan porsi dan menu.', 'Atur'], ['Kas kecil', 'Limit Rp 2.000.000', 'Batas petty cash dan role yang boleh mengajukan.', 'Ubah Limit'], ['Pembayaran supplier', 'Approval aktif', 'Pembayaran hanya setelah invoice dan penerimaan cocok.', 'Atur Flow'], ['Rekonsiliasi VA', 'Aktif', 'Pencocokan mutasi VA dengan pembayaran supplier.', 'Atur'], ['Bukti pengeluaran', 'Wajib lampiran', 'Setiap transaksi keluar wajib bukti dan kategori biaya.', 'Atur']] },
    dokumen: { title: 'Template Dokumen', description: 'Format cetak, export, dan PDF untuk laporan operasional.', rows: [['Laporan Harian SPPG', 'Template aktif', 'Header, produksi, distribusi, stok, dan biaya.', 'Customize'], ['Laporan 2 Mingguan / LPJ', 'Template aktif', 'Format LPJ berkala dengan lampiran bukti transaksi.', 'Customize'], ['Laporan Stok', 'Template aktif', 'Kartu stok, opname, adjustment, batch, dan waste.', 'Customize'], ['Tanda Terima Sekolah', 'Template aktif', 'Nama penerima, jumlah porsi, waktu terima, dan catatan.', 'Customize']] },
    notifikasi: { title: 'Notifikasi', description: 'Alert approval, risiko stok, batch, QC, dan jadwal operasional.', rows: [['Approval inbox', 'Aktif', 'Alert untuk Kepala SPPG saat ada data perlu review.', 'Atur'], ['Inventory alert', 'Aktif', 'Perlu restok, batch perlu cek, opname pending, dan food waste.', 'Atur'], ['Distribusi alert', 'Aktif', 'Terlambat, sekolah belum terima, dan insiden lapangan.', 'Atur']] },
    'custom-fields': { title: 'Custom Fields', description: 'Field fleksibel untuk bahan, supplier, sekolah, transaksi, dan laporan.', rows: [['Field Master Bahan', '3 field', 'Merek/tipe, barcode kemasan, dan catatan allergen.', 'Kelola'], ['Field Penerimaan', '4 field', 'Nomor kendaraan, segel, suhu datang, dan kondisi kemasan.', 'Kelola'], ['Field Supplier', '3 field', 'Area layanan, rating QC, dan lead time pengiriman.', 'Kelola'], ['Tampil di laporan', 'Aktif', 'Custom fields bisa ditampilkan di export dan detail transaksi.', 'Atur']] },
    audit: { title: 'Audit Trail', description: 'Catat aktivitas penting untuk keamanan data, approval, dan investigasi selisih.', rows: [['Log CRUD', 'Aktif', 'User, role, modul, entity, waktu GMT+7, nilai sebelum dan sesudah.', 'Atur'], ['Log approval', 'Aktif', 'Decision, catatan reviewer, waktu review, dan status akhir.', 'Atur'], ['Log export', 'Aktif', 'Jenis laporan, filter, periode, role, dan waktu download.', 'Atur']] }
};

const pageState = {
    activeView: 'perusahaan',
    modal: null,
    toast: '',
    users: [],
    usersLoading: false,
    usersLoaded: false,
    userError: '',
    createUser: { name: '', email: '', phone: '', roleId: 'ahli_gizi', password: '', showPassword: false }
};

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function allSettingItems() {
    return settingGroups.flatMap((group) => group.items);
}

function normalizeView(view) {
    return settingPanels[view] ? view : 'perusahaan';
}

function currentPanel() {
    return settingPanels[pageState.activeView] || settingPanels.perusahaan;
}

function isKepalaSppg() {
    return toCatalogRoleId(getActiveRoleId()) === 'kepala_sppg';
}

function settingBadge(text, tone = 'primary') {
    const normalizedTone = { Aktif: 'success', 'Full access': 'success', Siap: 'success', Auto: 'primary', Bersyarat: 'warning', 'Perlu dilengkapi': 'warning' }[text] || tone;
    return `<span class="kt-badge kt-badge-sm kt-badge-light kt-badge-${normalizedTone}">${esc(text)}</span>`;
}

function renderSettingsDirectory() {
    const activeRoleLabel = getRoleLabel(getActiveRoleId());
    return `
        <section class="kt-card kt-card-border shadow-none settings-directory-panel">
            <div class="settings-profile">
                <span class="settings-profile-mark">${esc(activeRoleLabel.split(/[ /]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'SP')}</span>
                <div>
                    <div class="text-sm font-semibold text-mono">${esc(activeRoleLabel)}</div>
                    <div class="text-xs text-secondary-foreground">Pengaturan SIPAGI</div>
                </div>
                <div class="settings-sidebar-summary">
                    <div><span>Menu</span><strong>${allSettingItems().length}</strong></div>
                    <div><span>Status</span><strong>Live</strong></div>
                    <div><span>Akses</span><strong>${isKepalaSppg() ? 'Full' : 'Role'}</strong></div>
                </div>
            </div>
            <div class="settings-directory-groups">
                ${settingGroups.map((group) => `
                    <div class="settings-menu-group">
                        <div class="settings-menu-heading">${esc(group.title)}</div>
                        ${group.items.map((item) => `
                            <button class="settings-menu-link ${pageState.activeView === item.id ? 'active' : ''}" type="button" data-settings-view="${esc(item.id)}">
                                <span>${esc(item.label)}</span>
                                <span>${esc(item.count)}</span>
                            </button>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function renderSettingsOverview() {
    return `
        <section class="kt-card kt-card-border shadow-none settings-overview-strip">
            <div>
                <span>ERP Settings</span>
                <strong>Semua konfigurasi SIPAGI dipusatkan di halaman ini.</strong>
                <p>Sub-direktori berada di dalam page dengan pola seperti menu ERP. Setiap tombol membuka konfigurasi atau menjalankan aksi simpan.</p>
            </div>
            <div class="settings-overview-actions">
                <button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-view="inventory">Produk & Inventory</button>
                <button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-view="approval">Aturan Approval</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="button" data-settings-save>Simpan Semua</button>
            </div>
        </section>
    `;
}

function renderSettingRows(panel) {
    return panel.rows.map(([name, status, description, action]) => `
        <div class="settings-action-row">
            <div class="settings-action-main"><strong>${esc(name)}</strong><p>${esc(description)}</p></div>
            <div class="settings-action-meta">${settingBadge(status)}<button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-action="${esc(name)}" data-settings-status="${esc(status)}" data-settings-description="${esc(description)}">${esc(action)}</button></div>
        </div>
    `).join('');
}

function renderUsersPanel() {
    const extraCount = pageState.users.filter((user) => user.roleId !== 'kepala_sppg').length;
    const canAdd = isKepalaSppg() && extraCount < 3;
    const rows = pageState.users.map((user) => `
        <tr>
            <td><strong>${esc(user.name)}</strong><br><small>${esc(user.email)}</small></td>
            <td>${esc(user.roleName || user.roleId)}</td>
            <td>${esc(user.phone || '-')}</td>
            <td>${settingBadge(user.status === 'active' ? 'Aktif' : user.status, user.status === 'active' ? 'success' : 'warning')}</td>
            <td><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-action="Akun ${esc(user.name)}" data-settings-status="${esc(user.status)}" data-settings-description="Detail akun role ${esc(user.email)}">Detail</button></td>
        </tr>
    `).join('');

    return `
        <section class="kt-card kt-card-border shadow-none module-card-gap">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Akun Role SPPG</h3>
                    <p class="kt-card-description">Kepala SPPG dapat menambahkan maksimal 3 akun role tambahan untuk fase ini.</p>
                </div>
                <button class="kt-btn kt-btn-sm kt-btn-primary" data-settings-user-modal type="button" ${canAdd ? '' : 'disabled'}>Tambah Akun Role</button>
            </div>
            <div class="kt-card-content">
                ${pageState.usersLoading ? '<div class="sipagi-dot-loader"><i></i><i></i><i></i></div>' : ''}
                ${pageState.userError ? `<div class="sipagi-login-error">${esc(pageState.userError)}</div>` : ''}
                <div class="erp-table-wrap">
                    <table class="erp-table">
                        <thead><tr><th>Akun</th><th>Role</th><th>Kontak</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="5">Belum ada akun role tambahan.</td></tr>'}</tbody>
                    </table>
                </div>
                <p class="text-xs text-secondary-foreground mt-3">${extraCount}/3 akun role tambahan terpakai.</p>
            </div>
        </section>
    `;
}

function renderActivePanel() {
    const panel = currentPanel();
    return `
        <section class="kt-card kt-card-border shadow-none">
            <div class="kt-card-header">
                <div><h3 class="kt-card-title">${esc(panel.title)}</h3><p class="kt-card-description">${esc(panel.description)}</p></div>
                ${settingBadge(`${panel.rows.length} pengaturan`, 'primary')}
            </div>
            <div class="kt-card-content settings-action-list">${renderSettingRows(panel)}</div>
        </section>
        ${pageState.activeView === 'pengguna' ? renderUsersPanel() : ''}
    `;
}

function renderSettingsModal() {
    if (pageState.modal === 'create-user') return renderCreateUserModal();
    if (!pageState.modal) return '';
    const { name, status, description } = pageState.modal;
    return `
        <div class="sipagi-modal-backdrop" data-settings-close-modal>
            <div class="sipagi-detail-modal settings-config-modal" role="dialog" aria-modal="true" aria-label="Atur ${esc(name)}">
                <div class="sipagi-detail-modal-header">
                    <div><h3>Atur ${esc(name)}</h3><p>${esc(description)}</p></div>
                    <button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-close-modal>Tutup</button>
                </div>
                <div class="settings-config-body">
                    <label class="erp-field"><span>Nama pengaturan</span><input class="erp-input" value="${esc(name)}"></label>
                    <label class="erp-field"><span>Status</span><select class="erp-select"><option selected>${esc(status)}</option><option>Aktif</option><option>Nonaktif</option><option>Bersyarat</option><option>Wajib approval</option></select></label>
                    <label class="erp-field full"><span>Catatan aturan</span><textarea class="erp-textarea">${esc(description)}</textarea></label>
                    <div class="settings-config-grid">
                        <label class="settings-check-row"><input type="checkbox" checked> Tampilkan di dashboard</label>
                        <label class="settings-check-row"><input type="checkbox" checked> Catat ke audit trail</label>
                        <label class="settings-check-row"><input type="checkbox"> Wajib approval Kepala SPPG</label>
                        <label class="settings-check-row"><input type="checkbox"> Kirim notifikasi</label>
                    </div>
                </div>
                <div class="sipagi-detail-actions"><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-close-modal>Batal</button><button class="kt-btn kt-btn-sm kt-btn-primary" type="button" data-settings-save-modal>Simpan Perubahan</button></div>
            </div>
        </div>
    `;
}

function renderCreateUserModal() {
    const account = pageState.createUser;
    return `
        <div class="sipagi-modal-backdrop" data-settings-close-modal>
            <div class="sipagi-detail-modal settings-config-modal" role="dialog" aria-modal="true" aria-label="Tambah akun role">
                <form data-settings-create-user>
                    <div class="sipagi-detail-modal-header"><div><h3>Tambah Akun Role</h3><p>Maksimal 3 akun role tambahan untuk SPPG ini.</p></div><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-close-modal>Tutup</button></div>
                    <div class="settings-config-body">
                        <label class="erp-field"><span>Nama</span><input class="erp-input" name="name" value="${esc(account.name)}" required></label>
                        <label class="erp-field"><span>Email</span><input class="erp-input" type="email" name="email" value="${esc(account.email)}" required></label>
                        <label class="erp-field"><span>Role</span><select class="erp-select" name="roleId">${roleOptions.map(([id, label]) => `<option value="${id}" ${account.roleId === id ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
                        <label class="erp-field"><span>No. HP</span><input class="erp-input" name="phone" value="${esc(account.phone)}"></label>
                        <label class="erp-field full"><span>Password</span><div class="sipagi-password-field"><input name="password" type="${account.showPassword ? 'text' : 'password'}" value="${esc(account.password)}" placeholder="Contoh: @Sipagi2026" required><button type="button" data-settings-toggle-user-password>${account.showPassword ? 'Sembunyikan' : 'Lihat'}</button></div></label>
                    </div>
                    <div class="sipagi-detail-actions"><button class="kt-btn kt-btn-sm kt-btn-outline" type="button" data-settings-close-modal>Batal</button><button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Buat Akun</button></div>
                </form>
            </div>
        </div>
    `;
}

function renderSettingsContent() {
    const root = document.getElementById('settings-root');
    if (!root) return;
    const panel = currentPanel();
    root.innerHTML = `
        <div class="settings-layout settings-layout-page">
            ${renderSettingsDirectory()}
            <main class="settings-content-panel">
                <div class="settings-content-heading kt-card kt-card-border shadow-none">
                    <div><span>Pengaturan SIPAGI</span><h2>${esc(panel.title)}</h2><p>${esc(panel.description)}</p></div>
                    <button class="kt-btn kt-btn-primary kt-btn-sm" type="button" data-settings-save>Simpan Setting</button>
                </div>
                ${renderSettingsOverview()}
                ${renderActivePanel()}
            </main>
            <div class="sipagi-toast safe ${pageState.toast ? '' : 'hidden'}" data-settings-toast>${esc(pageState.toast || 'Pengaturan tersimpan.')}</div>
            ${renderSettingsModal()}
        </div>
    `;
}

async function loadUsers() {
    if (pageState.usersLoading) return;
    pageState.usersLoading = true;
    pageState.userError = '';
    renderSettingsContent();
    try {
        const response = await fetch('/api/auth/users', { credentials: 'same-origin' });
        const payload = await response.json();
        if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Akun role tidak bisa dimuat.');
        pageState.users = payload.rows || [];
        pageState.usersLoaded = true;
    } catch (error) {
        pageState.userError = error.message || 'Akun role tidak bisa dimuat.';
    } finally {
        pageState.usersLoading = false;
        renderSettingsContent();
    }
}

function setView(view) {
    pageState.activeView = normalizeView(view);
    pageState.modal = null;
    renderSettingsContent();
    if (pageState.activeView === 'pengguna' && !pageState.usersLoaded) loadUsers();
    if (window.location.hash !== `#settings/${pageState.activeView}`) window.history.replaceState(null, '', `#settings/${pageState.activeView}`);
}

function showToast(message) {
    pageState.toast = message;
    renderSettingsContent();
    window.setTimeout(() => { pageState.toast = ''; renderSettingsContent(); }, 1600);
}

function bindSettingsEvents() {
    document.addEventListener('click', (event) => {
        const root = document.getElementById('settings-root');
        if (!root) return;
        const viewButton = event.target.closest('[data-settings-view]');
        if (viewButton) { event.preventDefault(); setView(viewButton.dataset.settingsView); return; }
        const addUserButton = event.target.closest('[data-settings-user-modal]');
        if (addUserButton) { event.preventDefault(); pageState.modal = 'create-user'; renderSettingsContent(); return; }
        const toggleUserPassword = event.target.closest('[data-settings-toggle-user-password]');
        if (toggleUserPassword) {
            const form = document.querySelector('[data-settings-create-user]');
            if (form) pageState.createUser = { ...pageState.createUser, ...Object.fromEntries(new FormData(form).entries()) };
            pageState.createUser.showPassword = !pageState.createUser.showPassword;
            renderSettingsContent();
            return;
        }
        const actionButton = event.target.closest('[data-settings-action]');
        if (actionButton) {
            event.preventDefault();
            pageState.modal = { name: actionButton.dataset.settingsAction, status: actionButton.dataset.settingsStatus, description: actionButton.dataset.settingsDescription };
            renderSettingsContent();
            return;
        }
        if (event.target.closest('[data-settings-close-modal]')) { pageState.modal = null; renderSettingsContent(); return; }
        if (event.target.closest('[data-settings-save-modal]')) { pageState.modal = null; showToast('Perubahan pengaturan berhasil disimpan.'); return; }
        if (event.target.closest('[data-settings-save]')) showToast('Pengaturan berhasil disimpan.');
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('settings-root') || !event.target.matches('[data-settings-create-user]')) return;
        event.preventDefault();
        pageState.createUser = { ...pageState.createUser, ...Object.fromEntries(new FormData(event.target).entries()) };
        try {
            const response = await fetch('/api/auth/users', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pageState.createUser)
            });
            const payload = await response.json();
            if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Akun belum bisa dibuat.');
            pageState.modal = null;
            pageState.createUser = { name: '', email: '', phone: '', roleId: 'ahli_gizi', password: '', showPassword: false };
            pageState.usersLoaded = false;
            await loadUsers();
            showToast('Akun role berhasil dibuat.');
        } catch (error) {
            pageState.userError = error.message || 'Akun belum bisa dibuat.';
            pageState.modal = null;
            renderSettingsContent();
        }
    });
}

let eventsBound = false;

export function SettingsPage() {
    return '<div id="settings-root"></div>';
}

export function initSettingsPage(initialView = 'perusahaan') {
    if (!eventsBound) { bindSettingsEvents(); eventsBound = true; }
    pageState.activeView = normalizeView(initialView);
    renderSettingsContent();
    if (pageState.activeView === 'pengguna' && !pageState.usersLoaded) loadUsers();
}
