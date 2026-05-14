export function StockAdjustmentForm(items) {
    const options = items.map((item) => {
        return `<option value="${item.id}">${item.name} (${item.currentStock} ${item.unit})</option>`;
    }).join('');

    return `
        <form id="adjustment-form" class="erp-form-grid">
            <div class="erp-field full">
                <label>Item</label>
                <select class="erp-select" name="itemId" required>${options}</select>
            </div>
            <div class="erp-field full">
                <label>Stok Fisik Setelah Koreksi</label>
                <input class="erp-input" name="physicalStock" type="number" min="0" required>
            </div>
            <div class="erp-field full">
                <label>Alasan Adjustment</label>
                <textarea class="erp-textarea" name="reason" required placeholder="Contoh: koreksi hasil timbang ulang stock opname"></textarea>
            </div>
            <div class="erp-field full">
                <button class="erp-btn primary" type="submit">Submit Penyesuaian</button>
            </div>
        </form>
    `;
}
