export function InventoryToolbar({ categories, activeCategory, activeStatus, query }) {
    const categoryOptions = ['Semua', ...categories].map((category) => {
        const selected = category === activeCategory ? 'selected' : '';
        return `<option value="${category}" ${selected}>${category}</option>`;
    }).join('');

    return `
        <div class="erp-toolbar">
            <input class="erp-input" id="inventory-search" type="search" value="${query}" placeholder="Cari item, batch, lokasi...">
            <select class="erp-select" id="inventory-category">${categoryOptions}</select>
            <select class="erp-select" id="inventory-status">
                <option value="Semua" ${activeStatus === 'Semua' ? 'selected' : ''}>Semua Status</option>
                <option value="Aman" ${activeStatus === 'Aman' ? 'selected' : ''}>Aman</option>
                <option value="Reorder" ${activeStatus === 'Reorder' ? 'selected' : ''}>Perlu Restok</option>
                <option value="Kritis" ${activeStatus === 'Kritis' ? 'selected' : ''}>Kritis</option>
            </select>
        </div>
    `;
}
