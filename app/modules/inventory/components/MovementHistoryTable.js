const movementLabels = {
    'stock-in': 'Stok Masuk',
    'stock-out': 'Stok Keluar',
    'stok-masuk': 'Stok Masuk',
    'stok-keluar': 'Stok Keluar',
    adjustment: 'Penyesuaian',
    penyesuaian: 'Penyesuaian',
    waste: 'Waste',
    opname: 'Opname'
};

export function MovementHistoryTable({ movements, items }) {
    const rows = movements.slice(0, 8).map((movement) => {
        const item = items.find((candidate) => candidate.item_id === movement.item_id);
        const date = movement.movement_date || movement.created_at || '-';

        return `
            <tr>
                <td>${date}</td>
                <td>${movement.sku || '-'}</td>
                <td>${item ? item.name : movement.item_id}</td>
                <td>${movementLabels[movement.type] || movement.type}</td>
                <td>${Number(movement.qty || 0).toLocaleString('id-ID')} ${movement.unit || ''}</td>
                <td>${movement.reason || '-'}</td>
                <td>${movement.created_by || '-'}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="erp-table-wrap">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>SKU</th>
                        <th>Item</th>
                        <th>Jenis</th>
                        <th>Jumlah</th>
                        <th>Catatan</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="7">Belum ada riwayat mutasi.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}
