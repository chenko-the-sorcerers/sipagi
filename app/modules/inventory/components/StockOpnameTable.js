export function StockOpnameTable(items) {
    const rows = items.map((item) => {
        return `
            <tr>
                <td>
                    <strong>${item.name}</strong>
                    <div class="erp-muted">${item.sku || item.item_id} - ${item.batchCode}</div>
                </td>
                <td>${item.currentStock.toLocaleString('id-ID')} ${item.unit}</td>
                <td>
                    <input class="erp-input opname-input" type="number" min="0" value="${item.currentStock}" data-id="${item.item_id}">
                </td>
                <td>${item.unit}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="erp-form-grid" style="margin-bottom: 1rem;">
            <div class="erp-field">
                <label>Tanggal Stock Opname</label>
                <input class="erp-input" id="opname-date" type="date" value="${new Date().toISOString().slice(0, 10)}">
            </div>
        </div>
        <div class="erp-table-wrap">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th>SKU / Item</th>
                        <th>Stok Sistem</th>
                        <th>Stok Fisik</th>
                        <th>Satuan</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div style="margin-top: 1rem;">
            <button class="erp-btn primary" data-action="submit-opname">Submit Stock Opname</button>
        </div>
    `;
}
