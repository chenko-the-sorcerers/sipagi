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
        <div class="kt-modal-backdrop" data-modal-backdrop="true"></div>
        <div class="kt-modal open" data-kt-modal="true" role="dialog" aria-modal="true" aria-label="${titleMap[mode]}">
            <div class="kt-modal-content max-w-[760px] top-5 lg:top-[8%]">
                <div class="kt-modal-header">
                    <div>
                        <div class="text-xs font-medium uppercase text-secondary-foreground">Tugas Inventori</div>
                        <h3 class="kt-modal-title">${titleMap[mode]}</h3>
                    </div>
                    <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost shrink-0" data-action="close-modal" type="button" aria-label="Tutup modal">
                        <i class="ki-filled ki-cross"></i>
                    </button>
                </div>
                <div class="kt-modal-body">
                    ${renderModalForm(mode, items, selectedItemId)}
                </div>
            </div>
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
        <form id="inventory-modal-form" data-form="add-item" class="grid gap-4 md:grid-cols-2">
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Nama Bahan</label>
                <input class="kt-input" name="name" required placeholder="Beras Premium">
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Kategori</label>
                <select class="kt-input" name="category" required>
                    <option value="Kering">Kering</option>
                    <option value="Basah">Basah</option>
                    <option value="Beku">Beku</option>
                    <option value="Dingin">Dingin</option>
                    <option value="Sayur">Sayur</option>
                    <option value="Buah">Buah</option>
                    <option value="Kemasan">Kemasan</option>
                </select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Satuan</label>
                <input class="kt-input" name="unit" required placeholder="kg, gram, liter, pcs">
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Stok Minimum</label>
                <input class="kt-input" name="min_stock" type="number" min="0" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Harga Satuan</label>
                <input class="kt-input" name="unit_cost" type="number" min="0" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Pelacakan Expired</label>
                <select class="kt-input" name="expiry_tracking">
                    <option value="yes">Ya</option>
                    <option value="no">Tidak</option>
                </select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Jumlah Awal</label>
                <input class="kt-input" name="initial_qty" type="number" min="0" value="0">
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Kode Batch</label>
                <input class="kt-input" name="batch_code" placeholder="Otomatis jika kosong">
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Lokasi</label>
                <select class="kt-input" name="location">
                    <option value="Gudang Kering">Gudang Kering</option>
                    <option value="Chiller">Chiller</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Area Produksi">Area Produksi</option>
                </select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal Inventori</label>
                <input class="kt-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal Terima</label>
                <input class="kt-input" name="received_date" type="date" value="${todayDate()}">
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal Expired</label>
                <input class="kt-input" name="expiry_date" type="date" required>
            </div>
            <div class="flex items-center justify-end gap-2.5 border-t border-border pt-4 md:col-span-2">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button">Batal</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan Item</button>
            </div>
        </form>
    `;
}

function stockInForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="stock-in" class="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="type" value="stock-in">
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Item / SKU</label>
                <select class="kt-input" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Qty diterima</label>
                <input class="kt-input" name="qty" type="number" min="0" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Supplier</label>
                <input class="kt-input" name="vendor_id" placeholder="ID / nama supplier">
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Batch</label>
                <input class="kt-input" name="batch_code" placeholder="Otomatis jika kosong">
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal terima</label>
                <input class="kt-input" name="received_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal expired</label>
                <input class="kt-input" name="expiry_date" type="date" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Lokasi</label>
                <select class="kt-input" name="location">
                    <option value="Gudang Kering">Gudang Kering</option>
                    <option value="Chiller">Chiller</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Area Produksi">Area Produksi</option>
                </select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Status penerimaan</label>
                <select class="kt-input" name="qc_status">
                    <option value="released">Diterima</option>
                    <option value="hold">Ditahan QC</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal inventori</label>
                <input class="kt-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="grid gap-1.5 md:col-span-2">
                <div class="kt-card kt-card-border shadow-none bg-muted/40 p-3 gap-2">
                    <div class="text-sm font-medium text-mono">QC ringkas</div>
                    <div class="grid gap-2 md:grid-cols-4">
                        <label class="flex items-center gap-2 text-sm text-secondary-foreground"><input type="checkbox" checked> Kondisi baik</label>
                        <label class="flex items-center gap-2 text-sm text-secondary-foreground"><input type="checkbox" checked> Label valid</label>
                        <label class="flex items-center gap-2 text-sm text-secondary-foreground"><input type="checkbox" checked> Belum expired</label>
                        <label class="flex items-center gap-2 text-sm text-secondary-foreground"><input type="checkbox" checked> Suhu sesuai</label>
                    </div>
                </div>
            </div>
            <div class="grid gap-1.5 md:col-span-2">
                <details class="kt-card kt-card-border shadow-none p-3">
                    <summary class="cursor-pointer list-none text-sm font-medium text-mono">Ada masalah? Tambahkan catatan</summary>
                    <div class="mt-3 grid gap-2">
                        <label class="text-sm font-medium text-mono">Catatan penerimaan</label>
                        <textarea class="kt-input min-h-24" name="reason" placeholder="Contoh: label kurang jelas, suhu tidak sesuai, atau perlu cek QC."></textarea>
                    </div>
                </details>
            </div>
            <div class="flex items-center justify-end gap-2.5 border-t border-border pt-4 md:col-span-2">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button">Batal</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan Penerimaan</button>
            </div>
        </form>
    `;
}

function stockOutForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="stock-out" class="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="type" value="stock-out">
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Item / SKU</label>
                <select class="kt-input" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Jumlah Keluar</label>
                <input class="kt-input" name="qty" type="number" min="0" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal Inventori</label>
                <input class="kt-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Referensi</label>
                <input class="kt-input" name="reference_id" placeholder="Batch produksi / menu">
            </div>
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Alasan Pengeluaran</label>
                <textarea class="kt-input min-h-24" name="reason" required placeholder="Pengeluaran bahan untuk produksi harian"></textarea>
            </div>
            <div class="flex items-center justify-end gap-2.5 border-t border-border pt-4 md:col-span-2">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button">Batal</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Keluarkan dengan FEFO</button>
            </div>
        </form>
    `;
}

function adjustmentForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="adjustment" class="grid gap-4 md:grid-cols-2">
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Item / SKU</label>
                <select class="kt-input" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal Stock Opname</label>
                <input class="kt-input" name="opname_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Stok Fisik</label>
                <input class="kt-input" name="physical_qty" type="number" min="0" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Status Persetujuan</label>
                <select class="kt-input" name="approval_status">
                    <option value="pending">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                </select>
            </div>
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Alasan Penyesuaian</label>
                <textarea class="kt-input min-h-24" name="reason" required></textarea>
            </div>
            <div class="flex items-center justify-end gap-2.5 border-t border-border pt-4 md:col-span-2">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button">Batal</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Ajukan Penyesuaian</button>
            </div>
        </form>
    `;
}

function wasteForm(items, selectedItemId) {
    return `
        <form id="inventory-modal-form" data-form="waste" class="grid gap-4 md:grid-cols-2">
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Item / SKU</label>
                <select class="kt-input" name="item_id" required>${itemOptions(items, selectedItemId)}</select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Jumlah Waste</label>
                <input class="kt-input" name="qty" type="number" min="0" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal Inventori</label>
                <input class="kt-input" name="inventory_date" type="date" value="${todayDate()}" required>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Sumber Waste</label>
                <select class="kt-input" name="source">
                    <option value="Penerimaan">Penerimaan</option>
                    <option value="Gudang">Gudang</option>
                    <option value="Persiapan">Persiapan</option>
                    <option value="Produksi">Produksi</option>
                    <option value="Distribusi">Distribusi</option>
                </select>
            </div>
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">Alasan Waste</label>
                <textarea class="kt-input min-h-24" name="reason" required placeholder="Bahan rusak, expired, susut, atau retur"></textarea>
            </div>
            <div class="grid gap-1.5 md:col-span-2">
                <label class="text-sm font-medium text-mono">SVG Bukti Foto</label>
                <textarea class="kt-input min-h-24" name="photo_svg" placeholder="Opsional. Jika kosong, SIPAGI membuat SVG otomatis."></textarea>
            </div>
            <div class="flex items-center justify-end gap-2.5 border-t border-border pt-4 md:col-span-2">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button">Batal</button>
                <button class="kt-btn kt-btn-sm kt-btn-destructive" type="submit">Catat Waste</button>
            </div>
        </form>
    `;
}
