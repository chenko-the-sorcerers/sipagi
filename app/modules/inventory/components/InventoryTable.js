const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
});

function statusFor(item) {
    if (Number(item.currentStock || 0) <= 0) return { className: 'kt-badge-destructive', label: 'Habis' };
    if (item.expiredBatchCount > 0 || item.expiringSoonCount > 0) return { className: 'kt-badge-warning', label: 'Batch Perlu Cek' };
    if (item.currentStock <= item.minStock * 0.5) return { className: 'kt-badge-destructive', label: 'Kritis' };
    if (item.currentStock <= item.minStock) return { className: 'kt-badge-warning', label: 'Perlu Restok' };
    return { className: 'kt-badge-success', label: 'Aman' };
}

function fefoSignal(item) {
    if (item.expiredBatchCount > 0) return { className: 'kt-badge-destructive', label: `${item.expiredBatchCount} expired` };
    if (item.expiringSoonCount > 0) return { className: 'kt-badge-warning', label: `${item.expiringSoonCount} cek FEFO` };
    return { className: 'kt-badge-success', label: 'FEFO OK' };
}

export function InventoryTable(items) {
    const rows = items.map((item) => {
        const status = statusFor(item);
        const fefo = fefoSignal(item);
        const stockValue = item.currentStock * item.unitCost;

        return `
            <tr class="sipagi-clickable inventory-stock-row" data-action="open-stock-detail" data-id="${item.item_id || item.id}">
                <td>
                    <strong class="text-sm font-semibold text-mono">${item.name}</strong>
                    <div class="text-xs text-secondary-foreground">${item.sku || item.id} - ${item.category}</div>
                </td>
                <td>
                    <div class="text-sm font-semibold text-mono">${item.currentStock.toLocaleString('id-ID')} ${item.unit}</div>
                    <div class="text-xs text-secondary-foreground">Min ${item.minStock.toLocaleString('id-ID')} ${item.unit}</div>
                </td>
                <td>
                    <span class="text-sm font-medium text-mono">${item.batchCode}</span>
                    <div class="text-xs text-secondary-foreground">${item.batchCount} batch aktif</div>
                </td>
                <td>
                    <div class="text-sm">${item.location}</div>
                    <div class="text-xs text-secondary-foreground">Inv ${item.inventoryDate || '-'}</div>
                </td>
                <td>
                    <span class="kt-badge kt-badge-sm kt-badge-light ${fefo.className}">${fefo.label}</span>
                    <div class="mt-1 text-xs text-secondary-foreground">Exp ${item.expiryDate || '-'}</div>
                </td>
                <td>
                    <div class="text-sm">${currencyFormatter.format(stockValue)}</div>
                    <div class="text-xs text-secondary-foreground">${currencyFormatter.format(item.unitCost)}/unit</div>
                </td>
                <td><span class="kt-badge kt-badge-sm kt-badge-light ${status.className}">${status.label}</span></td>
                <td>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-primary" data-action="open-stock-in" data-id="${item.item_id || item.id}">
                            <i class="ki-filled ki-plus"></i>
                            Catat Masuk
                        </button>
                        <details>
                            <summary class="kt-btn kt-btn-sm kt-btn-outline cursor-pointer list-none" data-action="toggle-row-actions">
                                Tindakan
                                <i class="ki-filled ki-down"></i>
                            </summary>
                            <div class="mt-2 grid gap-1.5">
                                <button class="kt-btn kt-btn-sm kt-btn-outline justify-start" data-action="open-material-edit" data-id="${item.item_id || item.id}">Ubah</button>
                                <button class="kt-btn kt-btn-sm kt-btn-outline justify-start" data-action="open-stock-out" data-id="${item.item_id || item.id}">Pakai / Keluar</button>
                                <button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-destructive justify-start" data-action="open-waste" data-id="${item.item_id || item.id}">Catat Waste</button>
                            </div>
                        </details>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="kt-table-wrapper overflow-x-auto">
            <table class="kt-table kt-table-border min-w-[1120px]">
                <thead>
                    <tr>
                        <th>SKU / Item</th>
                        <th>Stok / Min</th>
                        <th>Batch Utama</th>
                        <th>Lokasi</th>
                        <th>FEFO / Expired</th>
                        <th>Nilai Stok</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="8" class="text-center text-secondary-foreground">Belum ada item.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}
