const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
});

export function InventoryStats(summary) {
    return `
        <div class="erp-grid">
            <div class="erp-card">
                <div class="erp-stat-label">Total SKU</div>
                <div class="erp-stat-value">${summary.totalItems}</div>
                <div class="erp-stat-note">Item bahan pangan aktif</div>
            </div>
            <div class="erp-card">
                <div class="erp-stat-label">Stok Kritis</div>
                <div class="erp-stat-value">${summary.criticalItems}</div>
                <div class="erp-stat-note">Butuh review pengadaan</div>
            </div>
            <div class="erp-card">
                <div class="erp-stat-label">Nilai Stok</div>
                <div class="erp-stat-value">${currencyFormatter.format(summary.inventoryValue)}</div>
                <div class="erp-stat-note">Estimasi dari unit cost</div>
            </div>
            <div class="erp-card">
                <div class="erp-stat-label">Waste Value</div>
                <div class="erp-stat-value">${currencyFormatter.format(summary.wasteValue)}</div>
                <div class="erp-stat-note">Akumulasi waste tercatat</div>
            </div>
            <div class="erp-card">
                <div class="erp-stat-label">Expired Batch</div>
                <div class="erp-stat-value">${summary.expiredBatchCount}</div>
                <div class="erp-stat-note">Batch perlu hold/review</div>
            </div>
        </div>
    `;
}
