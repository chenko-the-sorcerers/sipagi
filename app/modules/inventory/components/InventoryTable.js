const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
});

function statusFor(item) {
    if (item.currentStock <= item.minStock * 0.5) return { className: 'danger', label: 'Kritis' };
    if (item.currentStock <= item.minStock) return { className: 'warning', label: 'Perlu Restok' };
    return { className: 'safe', label: 'Aman' };
}

export function InventoryTable(items) {
    const rows = items.map((item) => {
        const status = statusFor(item);

        return `
            <tr>
                <td>
                    <strong>${item.name}</strong>
                    <div class="erp-muted">${item.sku || item.id} - ${item.category}</div>
                </td>
                <td>${item.currentStock.toLocaleString('id-ID')} ${item.unit}</td>
                <td>${item.minStock.toLocaleString('id-ID')} ${item.unit}</td>
                <td>
                    ${item.batchCode}
                    <div class="erp-muted">Tanggal inventori ${item.inventoryDate || '-'}</div>
                    <div class="erp-muted">Tanggal expired ${item.expiryDate || '-'}</div>
                </td>
                <td>${item.location}</td>
                <td>${currencyFormatter.format(item.unitCost)}</td>
                <td><span class="erp-status ${status.className}">${status.label}</span></td>
                <td>
                    <div class="erp-inline-actions">
                        <button class="erp-btn small" data-action="open-stock-in" data-id="${item.id}">Masuk</button>
                        <button class="erp-btn small" data-action="open-stock-out" data-id="${item.id}">Keluar</button>
                        <button class="erp-btn small danger" data-action="open-waste" data-id="${item.id}">Waste</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="erp-table-wrap">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th>SKU / Item</th>
                        <th>Stok</th>
                        <th>Minimum</th>
                        <th>Batch</th>
                        <th>Lokasi</th>
                        <th>Harga</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="8">Belum ada item.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}
