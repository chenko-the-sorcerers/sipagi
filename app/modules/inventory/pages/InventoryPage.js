import {
    createInventoryItem,
    getInventoryState,
    getInventorySummaryFromState,
    recordAdjustment,
    recordStockMovement,
    recordWaste,
    submitStockOpname
} from '../services/inventoryApi.js';
import { InventoryStats } from '../components/InventoryStats.js';
import { InventoryToolbar } from '../components/InventoryToolbar.js';
import { InventoryTable } from '../components/InventoryTable.js';
import { StockOpnameTable } from '../components/StockOpnameTable.js';
import { MovementHistoryTable } from '../components/MovementHistoryTable.js';
import { InventoryModal } from '../components/InventoryModal.js';

const viewState = {
    activeView: 'stock-card',
    query: '',
    category: 'Semua',
    status: 'Semua',
    loading: true,
    error: '',
    modalMode: '',
    selectedItemId: '',
    state: {
        items: [],
        batches: [],
        movements: [],
        opnameRecords: [],
        wasteRecords: []
    }
};

const views = [
    { id: 'stock-card', label: 'Kartu Stok', description: 'Kartu stok, SKU, batch, lokasi, FEFO, dan stok kritis.' },
    { id: 'receiving', label: 'Penerimaan Barang', description: 'Catat stok masuk setelah QC bahan.' },
    { id: 'stock-opname', label: 'Stock Opname', description: 'Hitung fisik stok dan kirim selisih untuk persetujuan.' },
    { id: 'stock-adjustment', label: 'Penyesuaian Stok', description: 'Koreksi stok dengan alasan dan status persetujuan.' },
    { id: 'waste-management', label: 'Manajemen Waste', description: 'Catat waste, expired, SVG bukti, dan nilai kerugian.' },
    { id: 'movement-history', label: 'Riwayat Mutasi', description: 'Audit mutasi inventori dari Google Spreadsheet.' }
];

function statusFor(item) {
    if (item.currentStock <= item.minStock * 0.5) return 'Kritis';
    if (item.currentStock <= item.minStock) return 'Reorder';
    return 'Aman';
}

function getFilteredItems(items) {
    const query = viewState.query.toLowerCase();
    return items.filter((item) => {
        const matchesQuery = !query
            || item.name.toLowerCase().includes(query)
            || item.batchCode.toLowerCase().includes(query)
            || item.location.toLowerCase().includes(query);
        const matchesCategory = viewState.category === 'Semua' || item.category === viewState.category;
        const matchesStatus = viewState.status === 'Semua' || statusFor(item) === viewState.status;
        return matchesQuery && matchesCategory && matchesStatus;
    });
}

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function renderViewNav() {
    return `
        <div class="inventory-view-grid">
            ${views.map((view) => `
                <button class="inventory-view-card ${viewState.activeView === view.id ? 'active' : ''}" data-inventory-view="${view.id}" type="button">
                    <strong>${view.label}</strong>
                    <span>${view.description}</span>
                </button>
            `).join('')}
        </div>
    `;
}

function renderToolbarActions() {
    return `
        <div class="inventory-action-bar">
            <button class="erp-btn primary" data-action="open-add-item" type="button">Tambah Item Bahan</button>
            <button class="erp-btn" data-action="open-stock-in" type="button">Penerimaan Barang</button>
            <button class="erp-btn" data-action="open-adjustment" type="button">Penyesuaian Stok</button>
            <button class="erp-btn danger" data-action="open-waste" type="button">Catat Waste</button>
            <button class="erp-btn" data-action="download-sku-report" type="button">Unduh Laporan SKU</button>
            <button class="erp-btn" data-action="refresh-inventory" type="button">Refresh GAS</button>
        </div>
    `;
}

function renderActiveView() {
    const state = viewState.state;
    const categories = [...new Set(state.items.map((item) => item.category))];
    const filteredItems = getFilteredItems(state.items);

    if (viewState.activeView === 'stock-card') {
        return `
            <div class="erp-card">
                <h3>Kartu Stok</h3>
                ${InventoryToolbar({
                    categories,
                    activeCategory: viewState.category,
                    activeStatus: viewState.status,
                    query: viewState.query
                })}
                ${InventoryTable(filteredItems)}
            </div>
        `;
    }

    if (viewState.activeView === 'receiving') {
        return `
            <div class="erp-card inventory-empty-action">
                <h3>Penerimaan Barang</h3>
                <p class="erp-muted">Penerimaan akan membuat batch baru di ` + '`stock_batches`' + ` dan mutasi di ` + '`stock_movements`' + `. Bahan baru boleh dipakai setelah status QC dirilis.</p>
                <button class="erp-btn primary" data-action="open-stock-in" type="button">Catat Penerimaan Barang</button>
            </div>
        `;
    }

    if (viewState.activeView === 'stock-opname') {
        return `
            <div class="erp-card">
                <h3>Stock Opname</h3>
                <p class="erp-muted" style="margin-bottom: 1rem;">Submit opname akan mencatat selisih ke sheet ` + '`stock_opnames`' + ` di GAS.</p>
                ${StockOpnameTable(state.items)}
            </div>
        `;
    }

    if (viewState.activeView === 'stock-adjustment') {
        return `
            <div class="erp-card inventory-empty-action">
                <h3>Penyesuaian Stok</h3>
                <p class="erp-muted">Gunakan penyesuaian untuk koreksi stok dengan alasan jelas. Selisih masuk sebagai menunggu persetujuan jika belum disetujui Kepala SPPG.</p>
                <button class="erp-btn primary" data-action="open-adjustment" type="button">Buat Penyesuaian Stok</button>
            </div>
        `;
    }

    if (viewState.activeView === 'waste-management') {
        return `
            <div class="erp-card inventory-empty-action">
                <h3>Manajemen Waste</h3>
                <p class="erp-muted">Catat bahan rusak, expired, retur, atau susut. Sistem memilih batch FEFO, membuat bukti SVG, dan mencatat nilai kerugian.</p>
                <button class="erp-btn danger" data-action="open-waste" type="button">Catat Waste</button>
            </div>
            <div class="erp-card" style="margin-top: 1rem;">
                <h3>Catatan Waste</h3>
                ${renderWasteTable()}
            </div>
        `;
    }

    return `
        <div class="erp-card">
            <h3>Riwayat Mutasi</h3>
            ${MovementHistoryTable({ movements: state.movements, items: state.items })}
        </div>
    `;
}

function renderWasteTable() {
    const rows = viewState.state.wasteRecords.slice(0, 10).map((record) => {
        const item = viewState.state.items.find((candidate) => candidate.item_id === record.item_id);
        return `
            <tr>
                <td>${record.inventory_date || record.created_at || '-'}</td>
                <td>${record.sku || '-'}</td>
                <td>${item ? item.name : record.item_id}</td>
                <td>${record.qty} ${record.unit || ''}</td>
                <td>${record.source || '-'}</td>
                <td>${record.reason || '-'}</td>
                <td>${Number(record.cost_estimate || 0).toLocaleString('id-ID')}</td>
                <td>${renderSvgPreview(record)}</td>
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
                        <th>Qty</th>
                        <th>Sumber</th>
                        <th>Alasan</th>
                        <th>Nilai</th>
                        <th>Bukti SVG</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="8">Belum ada catatan waste.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderSvgPreview(record) {
    if (!record.photo_svg) return '<span class="erp-muted">Belum ada</span>';
    const encoded = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(record.photo_svg)}`;
    return `<img class="inventory-svg-proof" src="${encoded}" alt="Bukti SVG waste ${record.sku || ''}">`;
}

function renderInventoryContent() {
    const root = document.getElementById('inventory-root');
    if (!root) return;

    if (viewState.loading) {
        root.innerHTML = `
            <div class="erp-card inventory-loading">
                <h3>Memuat Inventori dari GAS</h3>
                <p class="erp-muted">Mengambil data dari Google Spreadsheet...</p>
            </div>
        `;
        return;
    }

    if (viewState.error) {
        root.innerHTML = `
            <div class="erp-card inventory-error">
                <h3>Inventori tidak bisa dimuat</h3>
                <p>${viewState.error}</p>
                <button class="erp-btn primary" data-action="refresh-inventory" type="button">Coba Lagi</button>
            </div>
        `;
        return;
    }

    const summary = getInventorySummaryFromState(viewState.state);
    root.innerHTML = `
        ${InventoryStats(summary)}
        ${renderToolbarActions()}
        ${renderViewNav()}
        <div class="inventory-view-panel">
            ${renderActiveView()}
        </div>
        <div id="inventory-modal-root">
            ${viewState.modalMode ? InventoryModal({
                mode: viewState.modalMode,
                items: viewState.state.items,
                selectedItemId: viewState.selectedItemId
            }) : ''}
        </div>
    `;
}

async function loadInventory() {
    viewState.loading = true;
    viewState.error = '';
    renderInventoryContent();

    try {
        viewState.state = await getInventoryState();
    } catch (error) {
        viewState.error = error.message;
    } finally {
        viewState.loading = false;
        renderInventoryContent();
    }
}

function openModal(mode, itemId = '') {
    viewState.modalMode = mode;
    viewState.selectedItemId = itemId;
    renderInventoryContent();
}

function closeModal() {
    viewState.modalMode = '';
    viewState.selectedItemId = '';
    renderInventoryContent();
}

async function handleModalSubmit(form) {
    const formType = form.dataset.form;
    const payload = serializeForm(form);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Menyimpan...';

    if (formType === 'add-item') await createInventoryItem(payload);
    if (formType === 'stock-in' || formType === 'stock-out') await recordStockMovement(payload, viewState.state);
    if (formType === 'adjustment') await recordAdjustment(payload, viewState.state);
    if (formType === 'waste') await recordWaste(payload, viewState.state);

    closeModal();
    await loadInventory();
}

function bindInventoryEvents() {
    document.addEventListener('input', (event) => {
        if (!document.getElementById('inventory-root')) return;

        if (event.target.id === 'inventory-search' || event.target.id === 'global-search') {
            viewState.query = event.target.value;
            renderInventoryContent();
        }
    });

    document.addEventListener('change', (event) => {
        if (!document.getElementById('inventory-root')) return;

        if (event.target.id === 'inventory-category') {
            viewState.category = event.target.value;
            renderInventoryContent();
        }

        if (event.target.id === 'inventory-status') {
            viewState.status = event.target.value;
            renderInventoryContent();
        }
    });

    document.addEventListener('click', async (event) => {
        if (!document.getElementById('inventory-root')) return;

        if (event.target.matches('[data-modal-backdrop="true"]')) {
            closeModal();
            return;
        }

        const viewButton = event.target.closest('[data-inventory-view]');
        if (viewButton) {
            viewState.activeView = viewButton.dataset.inventoryView;
            renderInventoryContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        if (action === 'refresh-inventory') await loadInventory();
        if (action === 'download-sku-report') downloadSkuReport();
        if (action === 'open-add-item' || action === 'focus-add-item') openModal('add-item');
        if (action === 'open-stock-in') openModal('stock-in', actionTarget.dataset.id || '');
        if (action === 'open-stock-out') openModal('stock-out', actionTarget.dataset.id || '');
        if (action === 'open-adjustment') openModal('adjustment', actionTarget.dataset.id || '');
        if (action === 'open-waste') openModal('waste', actionTarget.dataset.id || '');
        if (action === 'close-modal') closeModal();
        if (action === 'submit-opname') {
            const opnameDate = document.getElementById('opname-date')?.value || new Date().toISOString().slice(0, 10);
            const records = [...document.querySelectorAll('.opname-input')].map((input) => ({
                item_id: input.dataset.id,
                physical_qty: input.value
            }));
            await submitStockOpname(records, viewState.state, opnameDate);
            await loadInventory();
        }
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('inventory-root')) return;
        if (event.target.id !== 'inventory-modal-form') return;

        event.preventDefault();
        try {
            await handleModalSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            const submitButton = event.target.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Coba Lagi';
            }
        }
    });
}

function downloadSkuReport() {
    const headers = ['sku', 'item_id', 'nama', 'kategori', 'satuan', 'stok_saat_ini', 'stok_minimum', 'harga_satuan', 'nilai_stok', 'tanggal_inventori', 'batch_utama', 'tanggal_expired', 'lokasi', 'jumlah_batch'];
    const rows = viewState.state.items.map((item) => [
        item.sku,
        item.item_id,
        item.name,
        item.category,
        item.unit,
        item.currentStock,
        item.minStock,
        item.unitCost,
        item.currentStock * item.unitCost,
        item.inventoryDate,
        item.batchCode,
        item.expiryDate,
        item.location,
        item.batchCount
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-sku-sipagi-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
}

let eventsBound = false;

export function InventoryPage() {
    return '<div id="inventory-root"></div>';
}

export function initInventoryPage() {
    if (!eventsBound) {
        bindInventoryEvents();
        eventsBound = true;
    }
    loadInventory();
}
