export function ItemForm() {
    return `
        <form id="item-form" class="erp-form-grid">
            <div class="erp-field full">
                <label>Nama Item</label>
                <input class="erp-input" name="name" required placeholder="Contoh: Beras Premium">
            </div>
            <div class="erp-field">
                <label>Kategori</label>
                <select class="erp-select" name="category" required>
                    <option value="Karbohidrat">Karbohidrat</option>
                    <option value="Protein">Protein</option>
                    <option value="Sayur">Sayur</option>
                    <option value="Buah">Buah</option>
                    <option value="Bumbu">Bumbu</option>
                    <option value="Kemasan">Kemasan</option>
                </select>
            </div>
            <div class="erp-field">
                <label>Satuan</label>
                <input class="erp-input" name="unit" required placeholder="kg, butir, pack">
            </div>
            <div class="erp-field">
                <label>Stok Awal</label>
                <input class="erp-input" name="currentStock" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Minimum Stok</label>
                <input class="erp-input" name="minStock" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Harga Satuan</label>
                <input class="erp-input" name="unitCost" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Kode Batch</label>
                <input class="erp-input" name="batchCode" required placeholder="BR-20260509-A">
            </div>
            <div class="erp-field">
                <label>Tanggal Expired</label>
                <input class="erp-input" name="expiryDate" type="date" required>
            </div>
            <div class="erp-field">
                <label>Lokasi</label>
                <input class="erp-input" name="location" required placeholder="Gudang Kering">
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Simpan Item</button>
            </div>
        </form>
    `;
}
