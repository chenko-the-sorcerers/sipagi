export function StockOpnameTable(items) {
    const rows = items.map((item) => {
        return `
            <tr>
                <td>
                    <strong class="text-sm font-medium text-mono">${item.name}</strong>
                    <div class="text-sm text-secondary-foreground">${item.sku || item.item_id} - ${item.batchCode}</div>
                </td>
                <td>${item.currentStock.toLocaleString('id-ID')} ${item.unit}</td>
                <td>
                    <input class="kt-input opname-input" type="number" min="0" value="${item.currentStock}" data-id="${item.item_id}">
                </td>
                <td>${item.unit}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="grid gap-3 md:grid-cols-[minmax(240px,400px)_auto] md:items-end">
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-mono">Tanggal Stock Opname</label>
                <input class="kt-input" id="opname-date" type="date" value="${new Date().toISOString().slice(0, 10)}">
            </div>
            <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-warning w-fit">Butuh approval</span>
        </div>
        <div class="kt-table-wrapper overflow-x-auto">
            <table class="kt-table kt-table-border min-w-[760px]">
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
        <div>
            <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="submit-opname">
                <i class="ki-filled ki-send"></i>
                Submit Stock Opname
            </button>
        </div>
    `;
}
