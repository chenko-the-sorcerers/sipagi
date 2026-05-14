const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
});

export function InventoryStats(summary) {
    const stats = [
        {
            label: 'Total SKU',
            value: summary.totalItems,
            note: 'Item bahan pangan aktif',
            badge: 'Master',
            badgeClass: 'kt-badge-primary'
        },
        {
            label: 'Stok Kritis',
            value: summary.criticalItems,
            note: 'Butuh review pengadaan',
            badge: summary.criticalItems > 0 ? 'Action' : 'Aman',
            badgeClass: summary.criticalItems > 0 ? 'kt-badge-warning' : 'kt-badge-success'
        },
        {
            label: 'Nilai Stok',
            value: currencyFormatter.format(summary.inventoryValue),
            note: 'Estimasi dari unit cost',
            badge: 'Audit',
            badgeClass: 'kt-badge-secondary'
        },
        {
            label: 'Waste Value',
            value: currencyFormatter.format(summary.wasteValue),
            note: 'Akumulasi waste tercatat',
            badge: summary.wasteValue > 0 ? 'Review' : 'Nihil',
            badgeClass: summary.wasteValue > 0 ? 'kt-badge-destructive' : 'kt-badge-success'
        },
        {
            label: 'Expired Batch',
            value: summary.expiredBatchCount,
            note: 'Batch perlu hold/review',
            badge: summary.expiredBatchCount > 0 ? 'Hold' : 'Clear',
            badgeClass: summary.expiredBatchCount > 0 ? 'kt-badge-destructive' : 'kt-badge-success'
        }
    ];

    return `
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            ${stats.map((stat) => `
                <article class="kt-card kt-card-border shadow-none p-4 gap-3">
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-xs font-medium uppercase text-secondary-foreground">${stat.label}</span>
                        <span class="kt-badge kt-badge-sm kt-badge-light ${stat.badgeClass}">${stat.badge}</span>
                    </div>
                    <div class="text-2xl font-semibold text-mono">${stat.value}</div>
                    <div class="text-sm text-secondary-foreground">${stat.note}</div>
                </article>
            `).join('')}
        </div>
    `;
}
