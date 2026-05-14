export function WasteRecordForm(items) {
    const options = items.map((item) => {
        return `<option value="${item.id}">${item.name} (${item.currentStock} ${item.unit})</option>`;
    }).join('');

    return `
        <form id="waste-form" class="erp-form-grid">
            <div class="erp-field full">
                <label>Item</label>
                <select class="erp-select" name="itemId" required>${options}</select>
            </div>
            <div class="erp-field">
                <label>Jumlah Waste</label>
                <input class="erp-input" name="quantity" type="number" min="0" required>
            </div>
            <div class="erp-field">
                <label>Sumber</label>
                <select class="erp-select" name="source" required>
                    <option value="Penerimaan">Penerimaan</option>
                    <option value="Gudang">Gudang</option>
                    <option value="Persiapan">Persiapan</option>
                    <option value="Produksi">Produksi</option>
                    <option value="Distribusi">Distribusi</option>
                </select>
            </div>
            <div class="erp-field full">
                <label>Alasan Waste</label>
                <textarea class="erp-textarea" name="reason" required placeholder="Contoh: bahan rusak, expired, tumpah, retur sekolah"></textarea>
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Catat Waste</button>
            </div>
        </form>
    `;
}
