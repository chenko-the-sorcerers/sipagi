export function InventoryToolbar({ categories, activeCategory, activeStatus, query }) {
    const categoryOptions = ['Semua', ...categories].map((category) => {
        const selected = category === activeCategory ? 'selected' : '';
        return `<option value="${category}" ${selected}>${category}</option>`;
    }).join('');

    return `
        <div class="grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px_220px]">
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-secondary-foreground" for="inventory-search">Cari stok</label>
                <label class="kt-input">
                    <i class="ki-filled ki-magnifier text-muted-foreground"></i>
                    <input id="inventory-search" type="search" value="${query}" placeholder="Cari SKU, bahan, batch, lokasi...">
                </label>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-secondary-foreground" for="inventory-category">Kategori</label>
                <select class="kt-input" id="inventory-category">${categoryOptions}</select>
            </div>
            <div class="grid gap-1.5">
                <label class="text-sm font-medium text-secondary-foreground" for="inventory-status">Risiko stok</label>
                <select class="kt-input" id="inventory-status">
                    <option value="Semua" ${activeStatus === 'Semua' ? 'selected' : ''}>Semua Risiko</option>
                    <option value="Aman" ${activeStatus === 'Aman' ? 'selected' : ''}>Aman</option>
                    <option value="Reorder" ${activeStatus === 'Reorder' ? 'selected' : ''}>Perlu Restok</option>
                    <option value="Kritis" ${activeStatus === 'Kritis' ? 'selected' : ''}>Kritis</option>
                </select>
            </div>
        </div>
    `;
}
