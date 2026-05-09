function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function itemOptions(items, selectedId = '') {
    return items.map((item) => {
        const selected = item.item_id === selectedId ? 'selected' : '';
        return `<option value="${item.item_id}" ${selected}>${item.sku || item.item_id} - ${item.name} - ${item.currentStock} ${item.unit}</option>`;
    }).join('');
}

export function InventoryModal({ mode, items, selectedItemId }) {
    const titleMap = {
        'add-item': 'Tambah Item Bahan',
        'stock-in': 'Penerimaan Barang',
        'stock-out': 'Pengeluaran Bahan ke Produksi',
        adjustment: 'Penyesuaian Stok',
        waste: 'Catat Waste'
    };

    return `
        <div class="erp-modal-backdrop active" data-modal-backdrop="true">
            <section class="erp-modal" role="dialog" aria-modal="true" aria-label="${titleMap[mode]}">
                <div class="erp-modal-header">
                    <div>
                        <div class="erp-stat-label">Tugas Inventori</div>
                        <h3>${titleMap[mode]}</h3>
                    </div>
                    <button class="erp-icon-btn" data-action="close-modal" type="button">x</button>
                </div>
                <div class="erp-modal-body">
                    ${renderModalForm(mode, items, selectedItemId)}
                </div>
            </section>
        </div>
    `;
}

function renderModalForm(mode, items, selectedItemId) {
    if (mode === 'add-item') return addItemForm();
    if (mode === 'stock-in') return stockInForm(items, selectedItemId);
    if (mode === 'stock-out') return stockOutForm(items, selectedItemId);
    if (mode === 'adjustment') return adjustmentForm(items, selectedItemId);
    if (mode === 'waste') return wasteForm(items, selectedItemId);
    return '';
}

function addItemForm() {
    return `
        <form id="inventory-modal-form" data-form="add-item" class="erp-form-grid">
            <div class="erp-field full">
                <label>Nama Bahan</label>
                <input class="erp-input" name="name" required placeholder="Beras Premium">
            </div>
            <div class="erp-field">
                <label>Kategori</label>
                <select class="erp-select" name="category" required>
                    <option value="Kering">Kering</option>
                    <option value="Basah">Basah</option>
                    <option value="Beku">Beku</option>
                    <option value="Dingin">Dingin</option>
                    <option value="Sayur">Sayur</option>
                    <option value="Buah">Buah</option>
                    <option value="Kemasan">Kemasan</option>
                </select>
            </div>
            <div class="erp-field">
                <label>Satuan</label>
                <input class="erp-input" name="unit" required placeholder="kg, gram, liter, pcs">
            </div>
            <div class="erp-field">
                <label>Stok Minimum</label>
                <input class="erp-input" name="min_stock" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Harga Satuan</label>
                <input class="erp-input" name="unit_cost" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Pelacakan Expired</label>
                <select class="erp-select" name="expiry_tracking">
                    <option value="yes">Ya</option>
                    <option value="no">Tidak</option>
                </select>
            </div>
            <div class="erp-field">
                <label>Jumlah Awal</label>
                <input class="erp-input" name="initial_qty" type="number" min="0" value="0">
            </div>
            <div class="erp-field">
                <label>Kode Batch</label>
                <input class="erp-input" name="batch_code" placeholder="Otomatis jika kosong">
            </div>
            <div class="erp-field">
                <label>Lokasi</label>
                <select class="erp-select" name="location">
                    <option value="Gudang Kering">Gudang Kering</option>
                    <option value="Chiller">Chiller</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Area Produksi">Area Produksi</option>
                </select>
            </div>
            <div class="erp-field">
                <label>Tanggal Inventori</label>
                <input class="erp-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="erp-field">
                <label>Tanggal Terima</label>
                <input class="erp-input" name="received_date" type="date" value="${todayDate()}">
            </div>
            <div class="erp-field">
                <label>Tanggal Expired</label>
                <input class="erp-input" name="expiry_date" type="date">
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Simpan ke Google Sheet</button>
            </div>
        </form>
    `;
}

function stockInForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="stock-in" class="erp-form-grid">
            <input type="hidden" name="type" value="stock-in">
            <div class="erp-field full">
                <label>Item / SKU</label>
                <select class="erp-select" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="erp-field">
                <label>Jumlah Diterima</label>
                <input class="erp-input" name="qty" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Status QC</label>
                <select class="erp-select" name="qc_status">
                    <option value="released">Dirilis</option>
                    <option value="hold">Ditahan QC</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>
            <div class="erp-field">
                <label>Kode Batch</label>
                <input class="erp-input" name="batch_code" placeholder="Otomatis jika kosong">
            </div>
            <div class="erp-field">
                <label>Lokasi</label>
                <select class="erp-select" name="location">
                    <option value="Gudang Kering">Gudang Kering</option>
                    <option value="Chiller">Chiller</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Area Produksi">Area Produksi</option>
                </select>
            </div>
            <div class="erp-field">
                <label>Tanggal Inventori</label>
                <input class="erp-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="erp-field">
                <label>Tanggal Terima</label>
                <input class="erp-input" name="received_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="erp-field">
                <label>Tanggal Expired</label>
                <input class="erp-input" name="expiry_date" type="date">
            </div>
            <div class="erp-field full">
                <label>Catatan QC / Penerimaan</label>
                <textarea class="erp-textarea" name="reason" required></textarea>
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Catat Penerimaan</button>
            </div>
        </form>
    `;
}

function stockOutForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="stock-out" class="erp-form-grid">
            <input type="hidden" name="type" value="stock-out">
            <div class="erp-field full">
                <label>Item / SKU</label>
                <select class="erp-select" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="erp-field">
                <label>Jumlah Keluar</label>
                <input class="erp-input" name="qty" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Tanggal Inventori</label>
                <input class="erp-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="erp-field">
                <label>Referensi</label>
                <input class="erp-input" name="reference_id" placeholder="Batch produksi / menu">
            </div>
            <div class="erp-field full">
                <label>Alasan Pengeluaran</label>
                <textarea class="erp-textarea" name="reason" required placeholder="Pengeluaran bahan untuk produksi harian"></textarea>
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Keluarkan dengan FEFO</button>
            </div>
        </form>
    `;
}

function adjustmentForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="adjustment" class="erp-form-grid">
            <div class="erp-field full">
                <label>Item / SKU</label>
                <select class="erp-select" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="erp-field">
                <label>Tanggal Stock Opname</label>
                <input class="erp-input" name="opname_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="erp-field">
                <label>Stok Fisik</label>
                <input class="erp-input" name="physical_qty" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Status Persetujuan</label>
                <select class="erp-select" name="approval_status">
                    <option value="pending">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                </select>
            </div>
            <div class="erp-field full">
                <label>Alasan Penyesuaian</label>
                <textarea class="erp-textarea" name="reason" required></textarea>
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Submit Penyesuaian</button>
            </div>
        </form>
    `;
}

function wasteForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="waste" class="erp-form-grid">
            <div class="erp-field full">
                <label>Item / SKU</label>
                <select class="erp-select" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="erp-field">
                <label>Jumlah Waste</label>
                <input class="erp-input" name="qty" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Tanggal Inventori</label>
                <input class="erp-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="erp-field">
                <label>Sumber Waste</label>
                <select class="erp-select" name="source">
                    <option value="Penerimaan">Penerimaan</option>
                    <option value="Gudang">Gudang</option>
                    <option value="Persiapan">Persiapan</option>
                    <option value="Produksi">Produksi</option>
                    <option value="Distribusi">Distribusi</option>
                </select>
            </div>
            <div class="erp-field full">
                <label>Alasan Waste</label>
                <textarea class="erp-textarea" name="reason" required placeholder="Bahan rusak, expired, susut, atau retur"></textarea>
            </div>
            <div class="erp-field full">
                <label>SVG Bukti Foto</label>
                <textarea class="erp-textarea" name="photo_svg" placeholder="Opsional. Jika kosong, SIPAGI membuat SVG otomatis."></textarea>
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Catat Waste</button>
            </div>
        </form>
    `;
}
