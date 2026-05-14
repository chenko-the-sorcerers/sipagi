import {
    activateInventoryItem,
    createInventoryItem,
    getInventoryState,
    rejectInventoryItem,
    recordAdjustment,
    recordStockMovement,
    recordWaste,
    reviewReceivingWorkflow,
    saveReceivingDraft,
    requestInventoryItemRevision,
    submitInventoryItem,
    submitStockOpname,
    updateInventoryItem
} from '../services/inventoryApi.js?v=inventory-polish-20260512';
import { InventoryToolbar } from '../components/InventoryToolbar.js';
import { InventoryTable } from '../components/InventoryTable.js?v=inventory-polish-20260512';
import { StockOpnameTable } from '../components/StockOpnameTable.js';
import { MovementHistoryTable } from '../components/MovementHistoryTable.js';
import { InventoryModal } from '../components/InventoryModal.js';
import { ErrorState, LoadingState } from '../../../shared/components/UiPrimitives.js';
import { getActiveRoleId } from '../../../shared/auth/permissionStore.js';

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

const viewState = {
    activeMode: 'stock',
    activeView: 'overview',
    masterStatus: 'semua',
    query: '',
    filterDate: '',
    category: 'Semua',
    location: 'Semua',
    supplier: 'Semua',
    status: 'Semua',
    stockPage: 1,
    stockPageSize: 10,
    loading: true,
    error: '',
    modalMode: '',
    selectedItemId: '',
    selectedBatchId: '',
    toast: null,
    state: {
        items: [],
        batches: [],
        movements: [],
        opnameRecords: [],
        wasteRecords: []
    }
};

function jakartaTimestampUi(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(date).reduce((map, part) => {
        map[part.type] = part.value;
        return map;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} GMT+7`;
}

const barcodeScanState = {
    detector: null,
    intervalId: null,
    stream: null
};

const barcodeLookupBaseUrl = 'https://world.openfoodfacts.org/api/v2/product';

const stockViews = [
    { id: 'overview', label: 'Ringkasan Stok' },
    { id: 'master-bahan-baku', label: 'Master Bahan Baku' },
    { id: 'stok-lokasi', label: 'Stok Lokasi' },
    { id: 'batch-label', label: 'Batch & Label' },
    { id: 'kartu-stok-bahan', label: 'Kartu Stok' },
    { id: 'stock-alert', label: 'Stock Alert' },
    { id: 'recall-batch', label: 'Recall Batch' }
];

const warehouseViews = [
    { id: 'kebutuhan-bahan-harian', label: 'Kebutuhan Bahan Harian' },
    { id: 'penerimaan-bahan-baku', label: 'Penerimaan Bahan Baku' },
    { id: 'qc-penerimaan', label: 'QC Penerimaan' },
    { id: 'penyimpanan-bahan', label: 'Penyimpanan Bahan' },
    { id: 'pengeluaran-produksi', label: 'Pengeluaran ke Produksi' },
    { id: 'stok-opname', label: 'Stok Opname' },
    { id: 'food-waste', label: 'Food Waste' },
    { id: 'barcode', label: 'Input Barcode' }
];

const viewAliases = {
    'master-bahan-baku': 'daily-stock',
    'stok-lokasi': 'daily-stock',
    'batch-label': 'daily-stock',
    'kebutuhan-bahan-harian': 'overview',
    'penerimaan-bahan-baku': 'transactions',
    'qc-penerimaan': 'transactions',
    'penyimpanan-bahan': 'daily-stock',
    'pengeluaran-produksi': 'transactions',
    'kartu-stok-bahan': 'daily-stock',
    'stock-alert': 'audit-control',
    'recall-batch': 'audit-control',
    'stok-opname': 'audit-control',
    'food-waste': 'audit-control'
};

function normalizeInventoryView(view) {
    return viewAliases[view] || view || 'overview';
}

function allInventoryViews() {
    return [...stockViews, ...warehouseViews];
}

function modeForView(view) {
    if (stockViews.some((item) => item.id === view)) return 'stock';
    if (warehouseViews.some((item) => item.id === view)) return 'warehouse';
    return viewState.activeMode || 'stock';
}

function activeNavViews() {
    return viewState.activeMode === 'warehouse' ? warehouseViews : stockViews;
}

function setInventoryView(view) {
    stopBarcodeScanner();
    viewState.activeView = allInventoryViews().some((item) => item.id === view) ? view : 'overview';
    viewState.activeMode = modeForView(viewState.activeView);
    viewState.modalMode = '';
    viewState.selectedItemId = '';
    viewState.selectedBatchId = '';
    resetStockPagination();
    if (window.location.hash !== `#inventory/${viewState.activeView}`) {
        window.history.replaceState(null, '', `#inventory/${viewState.activeView}`);
    }
    renderInventoryContent();
}

function setInventoryMode(mode) {
    stopBarcodeScanner();
    viewState.activeMode = mode === 'warehouse' ? 'warehouse' : 'stock';
    viewState.activeView = viewState.activeMode === 'warehouse' ? 'kebutuhan-bahan-harian' : 'overview';
    viewState.modalMode = '';
    viewState.selectedItemId = '';
    viewState.selectedBatchId = '';
    resetStockPagination();
    if (window.location.hash !== `#inventory/${viewState.activeView}`) {
        window.history.replaceState(null, '', `#inventory/${viewState.activeView}`);
    }
    renderInventoryContent();
}

function statusFor(item) {
    if (Number(item.currentStock || 0) <= 0) return 'Habis';
    if (item.expiredBatchCount > 0 || item.expiringSoonCount > 0) return 'Batch Perlu Cek';
    if (item.currentStock <= item.minStock * 0.5) return 'Kritis';
    if (item.currentStock <= item.minStock) return 'Perlu Restok';
    return 'Aman';
}

function isDateExpired(dateValue) {
    if (!dateValue) return false;
    return new Date(dateValue).getTime() < Date.now();
}

function isMaterialActive(item) {
    return ['aktif', 'active', 'approved'].includes(String(item.status || '').toLowerCase());
}

function statusLabel(status = '') {
    const key = String(status || 'draft').toLowerCase();
    const labels = {
        active: 'Aktif',
        aktif: 'Aktif',
        draft: 'Draft',
        'menunggu approval': 'Menunggu Approval',
        pending_approval: 'Menunggu Approval',
        revisi: 'Revisi',
        revision: 'Revisi',
        ditolak: 'Ditolak',
        rejected: 'Ditolak',
        approved: 'Disetujui'
    };
    return labels[key] || status || 'Draft';
}

function materialStatusBadge(status = '') {
    const key = String(status || 'draft').toLowerCase();
    if (['aktif', 'active', 'approved'].includes(key)) return 'safe';
    if (['menunggu approval', 'pending_approval'].includes(key)) return 'warning';
    if (['ditolak', 'rejected'].includes(key)) return 'danger';
    return 'neutral';
}

function materialCodePreview(name = '', count = 1) {
    const normalized = String(name || 'Bahan').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    const prefix = (words.length > 1 ? words.map((word) => word[0]).join('') : normalized.slice(0, 2)).replace(/[^A-Z0-9]/g, '').padEnd(2, 'X').slice(0, 4);
    return `${prefix}-${String(count).padStart(3, '0')}`;
}

function isKepalaSppg() {
    return ['kepala-sppg', 'kepala_sppg'].includes(getActiveRoleId());
}

function getInventoryExceptions(state) {
    const criticalItems = state.items.filter((item) => item.currentStock <= item.minStock * 0.5);
    const reorderItems = state.items.filter((item) => item.currentStock > item.minStock * 0.5 && item.currentStock <= item.minStock);
    const expiredBatches = state.items.reduce((sum, item) => sum + item.expiredBatchCount, 0);
    const expiringSoon = state.items.reduce((sum, item) => sum + item.expiringSoonCount, 0);
    const pendingOpname = state.opnameRecords.filter((record) => ['pending', 'submitted', 'menunggu'].includes(String(record.status || '').toLowerCase())).length;
    const wasteCount = state.wasteRecords.length;

    return { criticalItems, reorderItems, expiredBatches, expiringSoon, pendingOpname, wasteCount };
}

function renderExceptionPanel(state) {
    const exceptions = getInventoryExceptions(state);
    const exceptionRows = [
        {
            label: 'Stok kritis',
            value: exceptions.criticalItems.length,
            note: exceptions.criticalItems.length > 0 ? 'Di bawah batas aman.' : 'Stok aman hari ini.',
            badge: exceptions.criticalItems.length > 0 ? 'kt-badge-destructive' : 'kt-badge-success',
            icon: 'ki-information-2',
            tone: exceptions.criticalItems.length > 0 ? 'text-red-600 bg-red-100' : 'text-green-700 bg-green-100',
            view: 'daily-stock',
            actionLabel: 'Tinjau'
        },
        {
            label: 'Perlu restok',
            value: exceptions.reorderItems.length,
            note: exceptions.reorderItems.length > 0 ? 'Mendekati minimum.' : 'Tidak ada restok mendesak.',
            badge: exceptions.reorderItems.length > 0 ? 'kt-badge-warning' : 'kt-badge-success',
            icon: 'ki-handcart',
            tone: exceptions.reorderItems.length > 0 ? 'text-yellow-700 bg-yellow-100' : 'text-green-700 bg-green-100',
            action: 'open-stock-in',
            actionLabel: 'Jadwalkan'
        },
        {
            label: 'Batch perlu cek',
            value: exceptions.expiredBatches + exceptions.expiringSoon,
            note: exceptions.expiredBatches || exceptions.expiringSoon ? 'Cek FEFO sebelum pakai.' : 'Batch aman dipakai.',
            badge: exceptions.expiredBatches > 0 ? 'kt-badge-destructive' : exceptions.expiringSoon > 0 ? 'kt-badge-warning' : 'kt-badge-success',
            icon: 'ki-abstract-26',
            tone: exceptions.expiredBatches > 0 ? 'text-red-600 bg-red-100' : exceptions.expiringSoon > 0 ? 'text-yellow-700 bg-yellow-100' : 'text-green-700 bg-green-100',
            view: 'daily-stock',
            actionLabel: 'Cek Batch'
        },
        {
            label: 'Opname pending',
            value: exceptions.pendingOpname,
            note: exceptions.pendingOpname > 0 ? 'Selisih menunggu review.' : 'Belum ada selisih terbuka.',
            badge: exceptions.pendingOpname > 0 ? 'kt-badge-warning' : 'kt-badge-secondary',
            icon: 'ki-clipboard',
            tone: exceptions.pendingOpname > 0 ? 'text-yellow-700 bg-yellow-100' : 'text-muted-foreground bg-muted',
            view: 'audit-control',
            actionLabel: 'Buka Opname'
        }
    ];

    return `
        <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                ${exceptionRows.map((row) => `
                    <article class="kt-card kt-card-border shadow-none p-4 gap-3 ${row.value > 0 ? 'bg-background' : 'bg-muted/20'}">
                        <div class="flex items-center gap-3">
                            <span class="flex size-11 shrink-0 items-center justify-center rounded-full ${row.tone}">
                                <i class="ki-filled ${row.icon} text-lg"></i>
                            </span>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="truncate text-sm font-medium text-mono">${row.label}</div>
                                    <span class="kt-badge kt-badge-sm kt-badge-light ${row.badge}">${row.value > 0 ? 'Perlu cek' : 'Aman'}</span>
                                </div>
                                <div class="mt-1 text-3xl font-semibold leading-none text-mono">${row.value}</div>
                            </div>
                        </div>
                        <p class="truncate text-sm text-secondary-foreground">${row.note}</p>
                        ${row.view
                            ? `<button class="kt-btn kt-btn-sm ${row.value > 0 ? 'kt-btn-outline kt-btn-primary' : 'kt-btn-ghost'} w-full" data-inventory-view="${row.view}" type="button">${row.actionLabel}</button>`
                            : `<button class="kt-btn kt-btn-sm ${row.value > 0 ? 'kt-btn-outline kt-btn-primary' : 'kt-btn-ghost'} w-full" data-action="${row.action}" type="button">${row.actionLabel}</button>`}
                    </article>
                `).join('')}
        </section>
    `;
}

function getFilteredItems(items) {
    const query = viewState.query.toLowerCase();
    return items.filter((item) => {
        const matchesQuery = !query
            || item.name.toLowerCase().includes(query)
            || String(item.sku || '').toLowerCase().includes(query)
            || item.batchCode.toLowerCase().includes(query)
            || item.location.toLowerCase().includes(query)
            || (item.locationBreakdown || []).some((row) => String(row.location || '').toLowerCase().includes(query));
        const matchesCategory = viewState.category === 'Semua' || item.category === viewState.category;
        const matchesLocation = viewState.location === 'Semua' || item.location === viewState.location || (item.locationBreakdown || []).some((row) => row.location === viewState.location);
        const matchesStatus = viewState.status === 'Semua' || statusFor(item) === viewState.status;
        const matchesDate = !viewState.filterDate || item.inventoryDate === viewState.filterDate || item.expiryDate === viewState.filterDate;
        return matchesQuery && matchesCategory && matchesLocation && matchesStatus && matchesDate;
    });
}

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function barcodeFormats() {
    return ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar'];
}

function setBarcodeStatus(message, tone = 'secondary') {
    const status = document.querySelector('[data-barcode-status]');
    if (!status) return;
    status.textContent = message;
    status.className = `kt-badge kt-badge-sm kt-badge-light kt-badge-${tone}`;
}

function setBarcodeLookupResult({ title, message, tone = 'secondary', product = null }) {
    const result = document.querySelector('[data-barcode-lookup-result]');
    if (!result) return;

    const image = product?.image
        ? `<img src="${product.image}" alt="${product.name || 'Produk barcode'}">`
        : '<div class="barcode-product-placeholder">S</div>';
    result.className = `barcode-lookup-result ${tone}`;
    result.innerHTML = `
        ${image}
        <div>
            <strong>${title}</strong>
            <p>${message}</p>
            ${product?.sourceUrl ? `<a href="${product.sourceUrl}" target="_blank" rel="noopener">Lihat sumber data</a>` : ''}
        </div>
    `;
}

function humanizeCategory(product) {
    const category = product.categories_tags?.find((tag) => tag.startsWith('en:')) || product.categories_tags?.[0] || product.categories || '';
    return String(category)
        .replace(/^en:/, '')
        .split(',')
        .at(0)
        .replaceAll('-', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        || 'Kemasan';
}

function inferUnit(product) {
    const quantity = String(product.quantity || '').toLowerCase();
    if (quantity.includes('kg') || quantity.includes('g')) return 'kg';
    if (quantity.includes('ml') || quantity.includes('l')) return 'liter';
    return 'pcs';
}

function fillIfEmpty(form, name, value) {
    const field = form.elements[name];
    if (field && value && !field.value) field.value = value;
}

async function lookupBarcodeProduct(barcodeValue = '') {
    const barcode = String(barcodeValue || document.querySelector('[name="barcode_code"]')?.value || '').trim();
    const form = document.querySelector('[data-barcode-item-form]');
    if (!barcode || barcode.length < 6) {
        setBarcodeLookupResult({
            title: 'Barcode belum lengkap',
            message: 'Scan ulang atau ketik minimal 6 digit barcode produk.',
            tone: 'warning'
        });
        return null;
    }

    setBarcodeStatus('Mencari produk di internet...', 'primary');
    setBarcodeLookupResult({
        title: 'Mencari produk',
        message: 'SIPAGI sedang mengecek barcode ke database produk publik.',
        tone: 'primary'
    });

    const fields = 'code,product_name,brands,categories,categories_tags,quantity,image_front_small_url,url';
    const response = await fetch(`${barcodeLookupBaseUrl}/${encodeURIComponent(barcode)}.json?fields=${fields}`);
    const payload = await response.json();

    if (!response.ok || payload.status !== 1 || !payload.product) {
        setBarcodeStatus('Produk tidak ditemukan. Isi manual tetap bisa.', 'warning');
        setBarcodeLookupResult({
            title: 'Produk belum ditemukan',
            message: 'Barcode valid, tapi belum ada di database publik. Kamu tetap bisa simpan data manual.',
            tone: 'warning'
        });
        return null;
    }

    const product = payload.product;
    const normalized = {
        name: product.product_name || product.brands || barcode,
        category: humanizeCategory(product),
        unit: inferUnit(product),
        image: product.image_front_small_url,
        sourceUrl: product.url
    };

    if (form) {
        fillIfEmpty(form, 'name', normalized.name);
        fillIfEmpty(form, 'category', normalized.category);
        fillIfEmpty(form, 'unit', normalized.unit);
    }

    setBarcodeStatus('Produk ditemukan dan form diisi otomatis.', 'success');
    setBarcodeLookupResult({
        title: normalized.name,
        message: `${product.brands ? `${product.brands} · ` : ''}${product.quantity || 'Detail produk ditemukan'}`,
        tone: 'success',
        product: normalized
    });
    return normalized;
}

function stopBarcodeScanner() {
    if (barcodeScanState.intervalId) window.clearInterval(barcodeScanState.intervalId);
    barcodeScanState.intervalId = null;
    barcodeScanState.stream?.getTracks?.().forEach((track) => track.stop());
    barcodeScanState.stream = null;
    const video = document.querySelector('[data-barcode-video]');
    if (video) video.srcObject = null;
}

async function startBarcodeScanner() {
    if (!('BarcodeDetector' in window)) {
        setBarcodeStatus('Browser belum support scan barcode kamera. Input manual tetap bisa dipakai.', 'warning');
        return;
    }

    const video = document.querySelector('[data-barcode-video]');
    const input = document.querySelector('[name="barcode_code"]');
    if (!video || !input) return;

    try {
        stopBarcodeScanner();
        barcodeScanState.detector = new window.BarcodeDetector({ formats: barcodeFormats() });
        barcodeScanState.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        video.srcObject = barcodeScanState.stream;
        await video.play();
        setBarcodeStatus('Kamera aktif. Arahkan ke barcode kemasan.', 'primary');

        barcodeScanState.intervalId = window.setInterval(async () => {
            if (!barcodeScanState.detector || video.readyState < 2) return;
            try {
                const codes = await barcodeScanState.detector.detect(video);
                const barcode = codes.find((code) => code.rawValue && code.format !== 'qr_code');
                if (!barcode) return;
                input.value = barcode.rawValue;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                setBarcodeStatus(`Barcode terbaca: ${barcode.rawValue}`, 'success');
                stopBarcodeScanner();
                await lookupBarcodeProduct(barcode.rawValue);
            } catch {
                setBarcodeStatus('Scan belum berhasil. Coba dekatkan kamera ke barcode.', 'warning');
            }
        }, 450);
    } catch (error) {
        stopBarcodeScanner();
        setBarcodeStatus(error?.name === 'NotAllowedError'
            ? 'Permission kamera ditolak. Izinkan kamera browser atau input manual.'
            : 'Kamera tidak bisa dibuka di device ini. Input manual tetap tersedia.', 'warning');
    }
}

function renderViewNav() {
    return `
        <div class="inventory-page-nav">
            ${activeNavViews().map((view) => `
                <button class="${viewState.activeView === view.id ? 'active' : ''}" data-inventory-view="${view.id}" type="button">
                    ${view.label}
                </button>
            `).join('')}
        </div>
    `;
}

function pct(value, total) {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
}

function renderInventoryQuickButtons() {
    return `
        <section class="inventory-quick-actions">
            <button class="inventory-workspace-button ${viewState.activeMode === 'stock' ? 'active' : ''}" data-inventory-mode="stock" type="button">
                <i class="ki-filled ki-parcel"></i>
                <span>
                    <strong>Stock Bahan</strong>
                    <small>Master, lokasi, batch, alert, recall</small>
                </span>
            </button>
            <button class="inventory-workspace-button ${viewState.activeMode === 'warehouse' ? 'active' : ''}" data-inventory-mode="warehouse" type="button">
                <i class="ki-filled ki-shop"></i>
                <span>
                    <strong>Kerja Gudang</strong>
                    <small>Kebutuhan, penerimaan, QC, opname, waste</small>
                </span>
            </button>
        </section>
    `;
}

function renderStockSummaryCards(items, state) {
    const activeItems = items.filter((item) => isMaterialActive(item));
    const total = activeItems.length;
    const safe = activeItems.filter((item) => statusFor(item) === 'Aman').length;
    const low = activeItems.filter((item) => ['Perlu Restok', 'Kritis', 'Habis'].includes(statusFor(item))).length;
    const expiredSoon = activeItems.filter((item) => item.expiringSoonCount > 0 || item.expiredBatchCount > 0).length;
    const pendingOpname = state.opnameRecords.filter((record) => ['pending', 'submitted', 'menunggu'].includes(String(record.status || '').toLowerCase())).length;
    const cards = [
        ['Total Bahan Aktif', total, '100% dari master aktif', 'primary'],
        ['Stok Aman', safe, `${pct(safe, total)} dari total bahan`, 'success'],
        ['Stok Menipis', low, `${pct(low, total)} dari total bahan`, 'warning'],
        ['Expired Soon', expiredSoon, `${pct(expiredSoon, total)} dari total bahan`, expiredSoon ? 'danger' : 'success'],
        ['Opname', pendingOpname, `${pct(pendingOpname, Math.max(total, 1))} dari total bahan`, pendingOpname ? 'warning' : 'secondary']
    ];

    return `
        <section class="inventory-summary-grid">
            ${cards.map(([label, value, note, tone]) => `
                <article class="erp-card inventory-summary-card ${tone}">
                    <div class="erp-stat-label">${label}</div>
                    <div class="erp-stat-value">${value}</div>
                    <div class="erp-stat-note">${note}</div>
                </article>
            `).join('')}
        </section>
    `;
}

function renderInventoryFilters({ categories, locations }) {
    return `
        <section class="kt-card kt-card-border shadow-none">
            <div class="kt-card-content inventory-filter-bar">
                <label class="erp-field">
                    <span>Tanggal</span>
                    <input class="erp-input" id="inventory-date-filter" type="date" value="${viewState.filterDate}">
                </label>
                <label class="erp-field">
                    <span>Kategori Bahan</span>
                    <select class="erp-select" id="inventory-category">
                        <option>Semua</option>
                        ${categories.map((category) => `<option ${viewState.category === category ? 'selected' : ''}>${category}</option>`).join('')}
                    </select>
                </label>
                <label class="erp-field">
                    <span>Lokasi</span>
                    <select class="erp-select" id="inventory-location">
                        <option>Semua</option>
                        ${locations.map((location) => `<option ${viewState.location === location ? 'selected' : ''}>${location}</option>`).join('')}
                    </select>
                </label>
                <label class="erp-field">
                    <span>Status Stok</span>
                    <select class="erp-select" id="inventory-status">
                        ${['Semua', 'Aman', 'Perlu Restok', 'Kritis', 'Habis', 'Batch Perlu Cek'].map((status) => `<option ${viewState.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                    </select>
                </label>
                <label class="erp-field inventory-search-field">
                    <span>Search</span>
                    <input class="erp-input" id="inventory-search" value="${viewState.query}" placeholder="Cari bahan, SKU, batch, lokasi">
                </label>
                <div class="inventory-filter-actions">
                    <button class="kt-btn kt-btn-sm kt-btn-outline inventory-refresh-button" data-action="refresh-inventory" type="button"><i class="ki-filled ki-arrows-circle"></i>Refresh</button>
                    <details class="inventory-download-menu">
                        <summary class="kt-btn kt-btn-sm kt-btn-outline"><i class="ki-filled ki-file-down"></i>Unduh<i class="ki-filled ki-down"></i></summary>
                        <div class="inventory-download-list">
                            <button data-action="export-inventory" data-format="pdf" type="button"><i class="ki-filled ki-file"></i>PDF</button>
                            <button data-action="export-inventory" data-format="excel" type="button"><i class="ki-filled ki-file-sheet"></i>Excel</button>
                            <button data-action="export-inventory" data-format="csv" type="button"><i class="ki-filled ki-file-up"></i>CSV</button>
                        </div>
                    </details>
                </div>
            </div>
        </section>
    `;
}

function renderTransactionTile({ title, description, when, action, actionLabel, tone = 'primary' }) {
    const buttonClass = tone === 'danger'
        ? 'kt-btn kt-btn-sm kt-btn-destructive'
        : 'kt-btn kt-btn-sm kt-btn-primary';
    const icon = tone === 'danger'
        ? 'ki-trash'
        : action === 'open-adjustment' ? 'ki-setting-4' : 'ki-delivery';
    const iconTone = tone === 'danger'
        ? 'text-red-600 bg-red-100'
        : 'text-blue-600 bg-blue-100';

    return `
        <article class="kt-card kt-card-border shadow-none p-5 gap-4">
            <div class="flex items-start gap-4">
                <span class="flex size-12 shrink-0 items-center justify-center rounded-full ${iconTone}">
                    <i class="ki-filled ${icon} text-xl"></i>
                </span>
                <div class="grid gap-1">
                    <h3 class="text-base font-semibold text-mono">${title}</h3>
                    <p class="text-sm text-secondary-foreground">${description}</p>
                </div>
            </div>
            <div class="rounded-md bg-muted/40 px-3 py-2 text-sm text-secondary-foreground">
                ${when}
            </div>
            <div>
                <button class="${buttonClass}" data-action="${action}" type="button">
                    <i class="ki-filled ${icon}"></i>
                    ${actionLabel}
                </button>
            </div>
        </article>
    `;
}

function renderReceivingChecklist() {
    const sections = [
        {
            title: '1. Data inti',
            tone: 'border-blue-100 bg-blue-50',
            icon: 'ki-document',
            rows: ['Item', 'Qty diterima', 'Supplier', 'Batch', 'Tanggal terima']
        },
        {
            title: '2. QC ringkas',
            tone: 'border-green-100 bg-green-50',
            icon: 'ki-shield-tick',
            rows: ['Kondisi baik', 'Label valid', 'Belum expired', 'Suhu sesuai']
        },
        {
            title: '3. Jika bermasalah',
            tone: 'border-red-100 bg-red-50',
            icon: 'ki-information-2',
            rows: ['Ditahan QC', 'Ditolak', 'Catatan masalah']
        }
    ];

    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Checklist Penerimaan Ringkas</h3>
                    <p class="kt-card-description">Cukup cek hal penting. Detail masalah dicatat hanya jika diperlukan.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-3 md:grid-cols-3">
                ${sections.map((section) => `
                    <article class="kt-card kt-card-border shadow-none ${section.tone}">
                        <div class="kt-card-header border-b border-border/70 px-4 py-3">
                            <div class="flex items-center gap-2 text-sm font-semibold text-mono">
                                <i class="ki-filled ${section.icon}"></i>
                                ${section.title}
                            </div>
                        </div>
                        <div class="grid gap-2 p-4">
                            ${section.rows.map((row) => `
                                <div class="flex items-center justify-between gap-3 text-sm">
                                    <span class="text-secondary-foreground">${row}</span>
                                    <span class="text-muted-foreground">-</span>
                                </div>
                            `).join('')}
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

function renderAuditSummary(state) {
    const exceptions = getInventoryExceptions(state);
    const latestMovement = state.movements[0];
    const latestWaste = state.wasteRecords[0];
    const cards = [
        {
            label: 'Opname pending',
            value: exceptions.pendingOpname,
            note: exceptions.pendingOpname > 0 ? 'Butuh review selisih.' : 'Tidak ada selisih terbuka.',
            badge: exceptions.pendingOpname > 0 ? 'kt-badge-warning' : 'kt-badge-success'
        },
        {
            label: 'Mutasi terakhir',
            value: latestMovement ? latestMovement.sku || latestMovement.item_id || '-' : '-',
            note: latestMovement ? latestMovement.reason || latestMovement.type || 'Tercatat di riwayat.' : 'Belum ada mutasi.',
            badge: 'kt-badge-secondary'
        },
        {
            label: 'Waste terakhir',
            value: latestWaste ? latestWaste.sku || latestWaste.item_id || '-' : '-',
            note: latestWaste ? latestWaste.reason || 'Perlu bukti dan alasan.' : 'Belum ada waste.',
            badge: latestWaste ? 'kt-badge-destructive' : 'kt-badge-success'
        }
    ];

    return `
        <section class="grid gap-3 md:grid-cols-3">
            ${cards.map((card) => `
                <article class="kt-card kt-card-border shadow-none bg-muted/20 p-4 gap-2">
                    <div class="flex items-start justify-between gap-3">
                        <div class="text-sm font-medium text-mono">${card.label}</div>
                        <span class="kt-badge kt-badge-sm kt-badge-light ${card.badge}">${card.value === '-' || card.value === 0 ? 'Aman' : 'Review'}</span>
                    </div>
                    <div class="truncate text-xl font-semibold text-mono">${card.value}</div>
                    <p class="truncate text-sm text-secondary-foreground">${card.note}</p>
                </article>
            `).join('')}
        </section>
    `;
}

function resetStockPagination() {
    viewState.stockPage = 1;
}

function getStockPagination(items) {
    const pageSize = [10, 50, 100].includes(Number(viewState.stockPageSize)) ? Number(viewState.stockPageSize) : 10;
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(Number(viewState.stockPage) || 1, 1), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    viewState.stockPage = currentPage;
    viewState.stockPageSize = pageSize;

    return {
        pageSize,
        totalItems,
        totalPages,
        currentPage,
        startIndex,
        endIndex,
        items: items.slice(startIndex, endIndex)
    };
}

function renderStockPaginationControls(pagination) {
    const from = pagination.totalItems ? pagination.startIndex + 1 : 0;
    const to = pagination.endIndex;

    return `
        <div class="inventory-pagination-bar">
            <div class="inventory-pagination-meta">
                <span>Menampilkan <strong>${from}-${to}</strong> dari <strong>${pagination.totalItems}</strong> bahan</span>
                <label>
                    <span>Baris</span>
                    <select class="erp-select" data-stock-page-size aria-label="Jumlah baris Ringkasan Stok">
                        ${[10, 50, 100].map((size) => `<option value="${size}" ${pagination.pageSize === size ? 'selected' : ''}>${size}</option>`).join('')}
                    </select>
                </label>
            </div>
            <div class="inventory-pagination-actions">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="stock-page-prev" type="button" ${pagination.currentPage <= 1 ? 'disabled' : ''}>
                    <i class="ki-filled ki-left"></i>
                    Sebelumnya
                </button>
                <span class="inventory-page-indicator">Halaman ${pagination.currentPage} / ${pagination.totalPages}</span>
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="stock-page-next" type="button" ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''}>
                    Berikutnya
                    <i class="ki-filled ki-right"></i>
                </button>
            </div>
        </div>
    `;
}

function renderInventoryOverview(state) {
    const categories = [...new Set(state.items.map((item) => item.category).filter(Boolean))];
    const locations = [...new Set(state.items.flatMap((item) => [item.location, ...(item.locationBreakdown || []).map((row) => row.location)]).filter(Boolean))];
    const filteredItems = getFilteredItems(state.items.filter((item) => isMaterialActive(item)));
    const pagination = getStockPagination(filteredItems);

    return `
        <section class="grid gap-4">
            ${renderStockSummaryCards(state.items, state)}
            ${renderInventoryFilters({ categories, locations })}
            <section class="kt-card">
                <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Ringkasan Stok Bahan</h3>
                    <p class="kt-card-description">Klik baris stok bahan untuk membuka detail dari kanan. Aksi CRUD tersedia di kolom aksi.</p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="open-material-create" type="button">Tambah Bahan</button>
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-stock-in" type="button">Stock Masuk</button>
                </div>
                </div>
                <div class="kt-card-content">
                    ${renderStockPaginationControls(pagination)}
                    ${InventoryTable(pagination.items)}
                    ${renderStockPaginationControls(pagination)}
                </div>
            </section>
        </section>
    `;
}

function renderStockLocationView(state) {
    const locationMap = state.items.filter((item) => isMaterialActive(item)).reduce((map, item) => {
        const breakdown = item.locationBreakdown?.length ? item.locationBreakdown : [{ location: item.location || 'Belum ada lokasi', qty: item.currentStock || 0, batchCount: item.batchCount || 0 }];
        breakdown.forEach((row) => {
            const key = row.location || 'Belum ada lokasi';
            if (!map[key]) map[key] = { location: key, qty: 0, batchCount: 0, items: [] };
            map[key].qty += Number(row.qty || 0);
            map[key].batchCount += Number(row.batchCount || 0);
            if (!map[key].items.some((candidate) => candidate.item_id === item.item_id)) map[key].items.push(item);
        });
        return map;
    }, {});
    const rows = Object.values(locationMap).map(({ location, qty, batchCount, items }) => {
        const statusCounts = items.reduce((map, item) => {
            const status = statusFor(item);
            map[status] = (map[status] || 0) + 1;
            return map;
        }, {});
        const low = (statusCounts['Perlu Restok'] || 0) + (statusCounts.Kritis || 0) + (statusCounts.Habis || 0);
        return `
            <tr>
                <td><strong>${location}</strong></td>
                <td>${items.length} bahan</td>
                <td>${qty.toLocaleString('id-ID')} unit gabungan<div class="erp-muted">${batchCount} batch</div></td>
                <td><span class="erp-status ${low ? 'warning' : 'safe'}">${low ? `${low} perlu cek` : 'Aman'}</span></td>
                <td>
                    <div class="inventory-location-statuses">
                        ${['Aman', 'Perlu Restok', 'Kritis', 'Habis', 'Batch Perlu Cek'].map((status) => statusCounts[status] ? `<span>${status}: ${statusCounts[status]}</span>` : '').join('')}
                    </div>
                </td>
                <td><button class="kt-btn kt-btn-sm kt-btn-outline" data-inventory-view="overview" type="button">Lihat Stok</button></td>
            </tr>
        `;
    }).join('');
    return `
        <section class="kt-card">
            <div class="kt-card-header"><div><h3 class="kt-card-title">Stok Lokasi</h3><p class="kt-card-description">Ringkasan stok bahan per lokasi penyimpanan.</p></div></div>
            <div class="kt-card-content">
                <div class="erp-table-wrap">
                    <table class="erp-table"><thead><tr><th>Lokasi</th><th>Jumlah Bahan</th><th>Total Qty</th><th>Status</th><th>Rincian Status</th><th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Belum ada data lokasi.</td></tr>'}</tbody></table>
                </div>
            </div>
        </section>
    `;
}

function batchSupplier(batch = {}) {
    return batch.supplier || batch.vendor_name || batch.vendor_id || batch.received_from || batch.source || '-';
}

function batchStatus(batch = {}) {
    const raw = String(batch.status || '').toLowerCase();
    if (raw.includes('karantina') || raw.includes('quarantine')) return 'Karantina';
    if (isDateExpired(batch.expiry_date)) return 'Expired';
    if (Number(batch.qty_current || 0) <= 0) return 'Habis';
    return 'Aktif';
}

function batchStatusTone(status) {
    if (status === 'Aktif') return 'safe';
    if (status === 'Karantina') return 'warning';
    if (status === 'Expired') return 'danger';
    return 'neutral';
}

function getBatchItem(batch = {}) {
    return viewState.state.items.find((candidate) => candidate.item_id === batch.item_id) || {};
}

function getSelectedBatch() {
    const selected = viewState.state.batches.find((batch) => (batch.batch_id || batch.batch_code) === viewState.selectedBatchId || batch.batch_code === viewState.selectedBatchId);
    return selected || getFilteredBatchRows(viewState.state)[0] || viewState.state.batches[0] || null;
}

function getFilteredBatchRows(state) {
    const query = viewState.query.toLowerCase().trim();
    return state.batches.filter((batch) => {
        const item = state.items.find((candidate) => candidate.item_id === batch.item_id) || {};
        const supplier = batchSupplier(batch);
        const status = batchStatus(batch);
        const receivedDate = batch.received_date || batch.inventory_date || batch.created_at || '';
        const matchesQuery = !query
            || String(batch.batch_code || batch.batch_id || '').toLowerCase().includes(query)
            || String(item.name || batch.item_id || '').toLowerCase().includes(query);
        const matchesDate = !viewState.filterDate || String(receivedDate).slice(0, 10) === viewState.filterDate;
        const matchesSupplier = viewState.supplier === 'Semua' || supplier === viewState.supplier;
        const matchesLocation = viewState.location === 'Semua' || (batch.location || '-') === viewState.location;
        const matchesStatus = viewState.status === 'Semua' || status === viewState.status;
        return matchesQuery && matchesDate && matchesSupplier && matchesLocation && matchesStatus;
    });
}

function renderBatchLabelView(state) {
    const filteredBatches = getFilteredBatchRows(state);
    const suppliers = [...new Set(state.batches.map(batchSupplier).filter(Boolean))];
    const locations = [...new Set(state.batches.map((batch) => batch.location || '-').filter(Boolean))];
    const rows = filteredBatches.slice(0, 30).map((batch) => {
        const item = getBatchItem(batch);
        const batchId = batch.batch_id || batch.batch_code || '-';
        const status = batchStatus(batch);
        const receivedDate = batch.received_date || batch.inventory_date || batch.created_at || '-';
        return `
            <tr class="sipagi-clickable" data-action="open-batch-detail" data-batch-id="${esc(batchId)}">
                <td><strong>${batchId}</strong></td>
                <td>${item.name || batch.item_id || '-'}</td>
                <td>${batchSupplier(batch)}</td>
                <td>${batch.qty_initial || batch.qty_received || batch.qty_current || 0}</td>
                <td>${batch.unit || item.unit || '-'}</td>
                <td>${batch.location || '-'}</td>
                <td>${receivedDate}</td>
                <td><span class="erp-status ${batchStatusTone(status)}">${status}</span></td>
                <td>
                    <div class="flex flex-wrap gap-1.5">
                        <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-batch-label-preview" data-batch-id="${esc(batchId)}" type="button"><i class="ki-filled ki-printer"></i>Cetak</button>
                        <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-batch-detail" data-batch-id="${esc(batchId)}" type="button"><i class="ki-filled ki-eye"></i>Detail</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    return `
        <section class="grid gap-4">
            <section class="kt-card kt-card-border shadow-none">
                <div class="kt-card-content batch-label-filter">
                    <label class="erp-field batch-search-field"><span>Cari bahan/batch</span><input class="erp-input" id="inventory-search" value="${viewState.query}" placeholder="Cari nama bahan atau batch id"></label>
                    <label class="erp-field"><span>Tanggal Terima</span><input class="erp-input" id="inventory-date-filter" type="date" value="${viewState.filterDate}"></label>
                    <label class="erp-field"><span>Supplier</span><select class="erp-select" id="inventory-supplier"><option>Semua</option>${suppliers.map((supplier) => `<option ${viewState.supplier === supplier ? 'selected' : ''}>${supplier}</option>`).join('')}</select></label>
                    <label class="erp-field"><span>Lokasi</span><select class="erp-select" id="inventory-location"><option>Semua</option>${locations.map((location) => `<option ${viewState.location === location ? 'selected' : ''}>${location}</option>`).join('')}</select></label>
                    <label class="erp-field"><span>Status</span><select class="erp-select" id="inventory-status">${['Semua', 'Aktif', 'Karantina', 'Expired', 'Habis'].map((status) => `<option ${viewState.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
                    <div class="batch-label-filter-actions"><button class="kt-btn kt-btn-outline batch-reset-button" data-action="reset-batch-filter" type="button"><i class="ki-filled ki-arrows-circle"></i>Reset Filter</button></div>
                </div>
            </section>
            <section class="batch-label-actions">
                <button class="kt-btn kt-btn-primary" data-action="open-batch-label-preview" type="button"><i class="ki-filled ki-printer"></i>Cetak Label</button>
                <button class="kt-btn kt-btn-outline" data-action="open-batch-label-preview" type="button"><i class="ki-filled ki-copy"></i>Reprint Label</button>
                <button class="kt-btn kt-btn-outline kt-btn-warning" data-action="quarantine-batch" type="button"><i class="ki-filled ki-shield-cross"></i>Karantina Batch</button>
                <button class="kt-btn kt-btn-outline" data-action="open-batch-detail" type="button"><i class="ki-filled ki-eye"></i>Detail Batch</button>
            </section>
            <section class="kt-card">
                <div class="kt-card-header"><div><h3 class="kt-card-title">Batch & Label</h3><p class="kt-card-description">Kelola batch, label cetak, status karantina, dan detail batch.</p></div></div>
                <div class="kt-card-content">
                <div class="erp-table-wrap">
                    <table class="erp-table min-w-[1180px]"><thead><tr><th>Batch ID</th><th>Nama Bahan</th><th>Supplier</th><th>Qty Awal</th><th>Satuan</th><th>Lokasi</th><th>Tanggal Terima</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="9">Belum ada batch sesuai filter.</td></tr>'}</tbody></table>
                </div>
                </div>
            </section>
        </section>
    `;
}

function renderStockAlertView(state) {
    return `
        ${renderExceptionPanel(state)}
        <section class="kt-card">
            <div class="kt-card-header"><div><h3 class="kt-card-title">Stock Alert</h3><p class="kt-card-description">Alert untuk stok menipis, batch perlu cek, expired soon, dan opname pending.</p></div></div>
            <div class="kt-card-content">${InventoryTable(getFilteredItems(state.items.filter((item) => isMaterialActive(item) && (statusFor(item) !== 'Aman' || item.expiringSoonCount > 0 || item.expiredBatchCount > 0))))}</div>
        </section>
    `;
}

function renderRecallBatchView(state) {
    const risky = state.items.filter((item) => isMaterialActive(item) && (item.expiredBatchCount > 0 || item.expiringSoonCount > 0));
    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div><h3 class="kt-card-title">Recall Batch</h3><p class="kt-card-description">Daftar bahan dengan batch expired atau mendekati expired untuk ditahan, ditarik, atau diprioritaskan FEFO.</p></div>
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="export-inventory" data-format="csv" type="button">Export Recall</button>
            </div>
            <div class="kt-card-content">${InventoryTable(risky)}</div>
        </section>
    `;
}

function renderDailyNeedsView(state) {
    const items = state.items.filter((item) => isMaterialActive(item)).slice(0, 12);
    const rows = items.map((item) => {
        const suggested = Math.max(Number(item.minStock || 0) - Number(item.currentStock || 0), 0);
        return `
            <tr>
                <td><strong>${item.name}</strong><div class="erp-muted">${item.sku}</div></td>
                <td>${item.category}</td>
                <td>${Number(item.currentStock || 0).toLocaleString('id-ID')} ${item.unit}</td>
                <td>${Number(item.minStock || 0).toLocaleString('id-ID')} ${item.unit}</td>
                <td>${suggested.toLocaleString('id-ID')} ${item.unit}</td>
                <td><span class="erp-status ${suggested > 0 ? 'warning' : 'safe'}">${suggested > 0 ? 'Perlu disiapkan' : 'Cukup'}</span></td>
            </tr>
        `;
    }).join('');
    return `
        <section class="kt-card">
            <div class="kt-card-header"><div><h3 class="kt-card-title">Kebutuhan Bahan Harian</h3><p class="kt-card-description">Estimasi kebutuhan bahan yang perlu disiapkan gudang hari ini berdasarkan batas minimum stok.</p></div></div>
            <div class="kt-card-content">
                <div class="erp-table-wrap">
                    <table class="erp-table min-w-[920px]"><thead><tr><th>Bahan</th><th>Kategori</th><th>Stok</th><th>Minimum</th><th>Saran Siap</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Belum ada kebutuhan bahan.</td></tr>'}</tbody></table>
                </div>
            </div>
        </section>
    `;
}

function getMasterMaterials() {
    const items = viewState.state.items;
    const sortNewest = (rows) => [...rows].sort((a, b) => String(b.submittedAt || b.createdAt || '').localeCompare(String(a.submittedAt || a.createdAt || '')));
    if (viewState.masterStatus === 'aktif') return sortNewest(items.filter((item) => isMaterialActive(item)));
    if (viewState.masterStatus === 'menunggu approval') return sortNewest(items.filter((item) => statusLabel(item.status) === 'Menunggu Approval'));
    if (viewState.masterStatus === 'ditolak') return sortNewest(items.filter((item) => statusLabel(item.status) === 'Ditolak'));
    return sortNewest(items);
}

function renderKepalaReviewInbox() {
    if (!isKepalaSppg()) return '';
    const pendingMaterials = viewState.state.items.filter((item) => statusLabel(item.status) === 'Menunggu Approval');
    const pendingReceivings = (viewState.state.receivingWorkflows || []).filter((row) => row.status === 'menunggu approval');
    const total = pendingMaterials.length + pendingReceivings.length;
    if (!total) return '';
    return `
        <section class="erp-card sipagi-review-inbox">
            <div>
                <strong>Notifikasi Review Kepala SPPG</strong>
                <p class="erp-muted">${total} pengajuan perlu dicek. Notifikasi tetap muncul sampai direview.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                ${pendingMaterials.length ? `<a class="kt-btn kt-btn-sm kt-btn-primary" href="#inventory/master-bahan-baku">Review bahan (${pendingMaterials.length})</a>` : ''}
                ${pendingReceivings.length ? `<a class="kt-btn kt-btn-sm kt-btn-primary" href="#inventory/penerimaan-bahan-baku">Review penerimaan (${pendingReceivings.length})</a>` : ''}
            </div>
        </section>
    `;
}

function renderMasterStatusNav() {
    const tabs = [
        ['semua', 'Semua'],
        ['aktif', 'Aktif'],
        ['menunggu approval', 'Menunggu Approval'],
        ['ditolak', 'Ditolak']
    ];
    return `
        <div class="flex flex-wrap items-center gap-2">
            ${tabs.map(([id, label]) => `<button class="kt-btn kt-btn-sm ${viewState.masterStatus === id ? 'kt-btn-primary' : 'kt-btn-outline'}" data-master-status="${id}" type="button">${label}</button>`).join('')}
        </div>
    `;
}

function renderMaterialMasterTable() {
    const rows = getMasterMaterials().map((item) => `
        <tr class="sipagi-clickable" data-action="open-material-detail" data-id="${item.item_id}">
            <td><strong>${item.sku}</strong></td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.unit}</td>
            <td>${item.usageMethod}</td>
            <td>${item.storageRule}</td>
            <td><span class="erp-status ${materialStatusBadge(item.status)}">${statusLabel(item.status)}</span></td>
            <td>${item.createdBy || '-'}</td>
            <td>${item.createdAt || '-'}</td>
            <td>
                <div class="flex flex-wrap gap-1.5">
                    ${statusLabel(item.status) === 'Draft' || statusLabel(item.status) === 'Revisi' ? `<button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-material-edit" data-id="${item.item_id}" type="button">Ubah</button><button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-primary" data-action="submit-material" data-id="${item.item_id}" type="button">Submit</button>` : ''}
                    ${statusLabel(item.status) === 'Menunggu Approval' && isKepalaSppg() ? `<button class="kt-btn kt-btn-sm kt-btn-primary" data-action="open-material-review" data-id="${item.item_id}" type="button">Review</button>` : ''}
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-material-detail" data-id="${item.item_id}" type="button">Detail</button>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <div class="erp-table-wrap">
            <table class="erp-table min-w-[1280px]">
                <thead>
                    <tr>
                        <th>Kode Bahan</th>
                        <th>Nama Bahan</th>
                        <th>Kategori</th>
                        <th>Satuan</th>
                        <th>Metode Pakai</th>
                        <th>Aturan Simpan</th>
                        <th>Status</th>
                        <th>Dibuat Oleh</th>
                        <th>Tanggal Dibuat</th>
                        <th>Aksi CRUD</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="10">Belum ada bahan pada status ini.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderMasterBahanView() {
    const counts = {
        semua: viewState.state.items.length,
        aktif: viewState.state.items.filter((item) => isMaterialActive(item)).length,
        approval: viewState.state.items.filter((item) => statusLabel(item.status) === 'Menunggu Approval').length,
        ditolak: viewState.state.items.filter((item) => statusLabel(item.status) === 'Ditolak').length
    };
    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Master Bahan</h3>
                    <p class="kt-card-description">Bahan baru disimpan sebagai draft, disubmit ke Kepala SPPG, lalu aktif setelah approval.</p>
                </div>
                <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="open-material-create" type="button">Tambah Bahan</button>
            </div>
            <div class="kt-card-content grid gap-4">
                <div class="erp-grid">
                    <article class="erp-card"><div class="erp-stat-label">Semua</div><div class="erp-stat-value">${counts.semua}</div><div class="erp-stat-note">Total master bahan</div></article>
                    <article class="erp-card"><div class="erp-stat-label">Aktif</div><div class="erp-stat-value">${counts.aktif}</div><div class="erp-stat-note">Bisa dipakai transaksi</div></article>
                    <article class="erp-card"><div class="erp-stat-label">Menunggu Approval</div><div class="erp-stat-value">${counts.approval}</div><div class="erp-stat-note">Perlu review Kepala SPPG</div></article>
                    <article class="erp-card"><div class="erp-stat-label">Ditolak</div><div class="erp-stat-value">${counts.ditolak}</div><div class="erp-stat-note">Tidak dapat dipakai</div></article>
                </div>
                ${renderMasterStatusNav()}
                ${renderMaterialMasterTable()}
            </div>
        </section>
    `;
}

function renderItemOptions(selected = '') {
    return viewState.state.items
        .filter((item) => isMaterialActive(item))
        .map((item) => `<option value="${item.item_id}" ${item.item_id === selected ? 'selected' : ''}>${item.sku} - ${item.name}</option>`)
        .join('');
}

function renderReceivingLine(index, item = {}) {
    return `
        <tr class="receiving-line" data-line-index="${index}">
            <td>${index + 1}</td>
            <td><select class="erp-select" data-line-field="item_id" required>${renderItemOptions(item.item_id)}</select></td>
            <td><input class="erp-input" data-line-field="received_qty" type="number" min="0" step="0.01" value="${item.received_qty || ''}" required></td>
            <td><input class="erp-input" data-line-field="unit" value="${item.unit || ''}" placeholder="kg/pcs"></td>
            <td><input class="erp-input" data-line-field="temperature" placeholder="Opsional"></td>
            <td><input class="erp-input" data-line-field="expiry_date" type="date" required></td>
            <td><div class="flex flex-wrap gap-1.5"><button class="kt-btn kt-btn-sm kt-btn-outline" type="button">Edit</button><button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-destructive" data-action="remove-receiving-line" type="button">Delete</button></div></td>
        </tr>
    `;
}

function qcChecklistRows() {
    return [
        ['label', 'Label sesuai dengan PO/RAB'],
        ['fisik', 'Kondisi fisik bahan baik'],
        ['expired', 'Expired date valid'],
        ['suhu', 'Suhu penerimaan sesuai'],
        ['kemasan', 'Kemasan bersih dan tidak bocor'],
        ['jumlah', 'Jumlah sesuai penerimaan'],
        ['kontaminasi', 'Tidak ada indikasi kontaminasi'],
        ['warna-aroma', 'Warna dan aroma normal']
    ];
}

function renderQcChecklistCompact() {
    const rows = qcChecklistRows().map(([key, label]) => `
        <tr>
            <td>${label}</td>
            <td><select class="erp-select" data-qc-template="${key}"><option>Ya</option><option>Tidak</option><option>N/A</option></select></td>
            <td><input class="erp-input" placeholder="Catatan singkat"></td>
        </tr>
    `).join('');
    return `
        <section class="kt-card">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">QC Penerimaan - Checklist Compact</h3>
                    <p class="kt-card-description">QC dipisah dari form tambah bahan. Gunakan checklist ini saat memeriksa item penerimaan.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4">
                <div class="erp-table-wrap">
                    <table class="erp-table">
                        <thead><tr><th>Checklist QC</th><th>Hasil</th><th>Catatan</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="erp-form-grid">
                    <div class="erp-field"><label>Telur pecah</label><input class="erp-input" type="number" min="0" placeholder="0"></div>
                    <div class="erp-field"><label>Telur retak</label><input class="erp-input" type="number" min="0" placeholder="0"></div>
                    <div class="erp-field"><label>Foto Bukti SVG</label><input class="erp-input" readonly value="Otomatis dibuat saat draft/submit penerimaan"></div>
                    <div class="erp-field full"><label>Catatan QC Item</label><textarea class="erp-textarea" placeholder="Ringkas temuan QC"></textarea></div>
                </div>
                ${renderReceivingWorkflowTable()}
            </div>
        </section>
    `;
}

function receivingStatusBadge(status = '') {
    const key = String(status || 'draft').toLowerCase();
    if (key === 'approved') return 'safe';
    if (key === 'rejected') return 'danger';
    if (key === 'menunggu approval') return 'warning';
    return 'neutral';
}

function renderReceivingWorkflowTable() {
    const rows = (viewState.state.receivingWorkflows || []).slice(0, 10).map((workflow) => `
        <tr>
            <td>${workflow.receipt_number || workflow.receiving_id}</td>
            <td>${workflow.received_at || '-'}</td>
            <td>${workflow.supplier || '-'}</td>
            <td>${workflow.po_rab_number || '-'}</td>
            <td>${workflow.warehouse_location || '-'}</td>
            <td>${(workflow.items || []).length}</td>
            <td><span class="erp-status ${receivingStatusBadge(workflow.status)}">${statusLabel(workflow.status)}</span></td>
            <td>
                ${workflow.status === 'menunggu approval' && isKepalaSppg() ? `
                    <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="review-receiving" data-id="${workflow.receiving_id}" data-decision="approved" type="button">Approve</button>
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="review-receiving" data-id="${workflow.receiving_id}" data-decision="revision" type="button">Revisi</button>
                    <button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-destructive" data-action="review-receiving" data-id="${workflow.receiving_id}" data-decision="rejected" type="button">Reject</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
    return `
        <div class="erp-table-wrap">
            <table class="erp-table min-w-[1080px]">
                <thead><tr><th>Nomor</th><th>Tanggal/Jam</th><th>Supplier</th><th>No. PO/RAB</th><th>Gudang</th><th>Item</th><th>Status</th><th>Review</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="8">Belum ada penerimaan bahan.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderReceivingQaView() {
    const defaultReceipt = `RCV-${Date.now()}`;
    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Penerimaan Bahan Baku - QA Flow</h3>
                    <p class="kt-card-description">Draft penerimaan, QC per item, submit ke Kepala SPPG, lalu batch stock terbentuk setelah approved.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-5">
                <form class="grid gap-5" data-receiving-form>
                    <section class="erp-card">
                        <h3>1. Form Penerimaan Bahan</h3>
                        <div class="erp-form-grid">
                            <div class="erp-field"><label>Nomor Penerimaan</label><input class="erp-input" name="receipt_number" value="${defaultReceipt}" required></div>
                            <div class="erp-field"><label>Tanggal dan Jam GMT+7</label><input class="erp-input" name="received_at" value="${jakartaTimestampUi()}" required></div>
                            <div class="erp-field"><label>Supplier</label><input class="erp-input" name="supplier" required></div>
                            <div class="erp-field"><label>No. PO/RAB</label><input class="erp-input" name="po_rab_number"></div>
                            <div class="erp-field"><label>Gudang/Lokasi</label><select class="erp-select" name="warehouse_location"><option>Dry storage</option><option>Chiller</option><option>Freezer</option><option>Packaging storage</option></select></div>
                            <div class="erp-field"><label>Dikirim Oleh</label><input class="erp-input" name="delivered_by"></div>
                            <div class="erp-field"><label>Diterima Oleh</label><input class="erp-input" name="received_by" value="kepala_sppg"></div>
                            <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
                        </div>
                    </section>
                    <section class="erp-card">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <h3>2. Input Item & Qty Diterima</h3>
                            <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="add-receiving-line" type="button">Tambah Item</button>
                        </div>
                        <div class="erp-table-wrap mt-3">
                            <table class="erp-table min-w-[980px]">
                                <thead><tr><th>No</th><th>Bahan Dipesan (PO)</th><th>Diterima</th><th>Satuan</th><th>Suhu</th><th>Expired Date</th><th>Aksi</th></tr></thead>
                                <tbody data-receiving-lines>${renderReceivingLine(0)}${renderReceivingLine(1)}</tbody>
                            </table>
                        </div>
                    </section>
                    <section class="erp-card">
                        <h3>3. Ringkasan Submit</h3>
                        <p class="erp-muted">Periksa nomor penerimaan, supplier, item, kuantitas, expired date wajib, dan catatan sebelum submit ke Kepala SPPG. QC dilakukan di halaman QC Penerimaan.</p>
                        <div class="flex flex-wrap justify-end gap-2 mt-3">
                            <button class="kt-btn kt-btn-sm kt-btn-outline" name="save_action" value="draft" type="submit">Simpan Draft</button>
                            <button class="kt-btn kt-btn-sm kt-btn-primary" name="save_action" value="submit" type="submit">Submit ke Kepala SPPG</button>
                        </div>
                    </section>
                </form>
                <section class="erp-card">
                    <h3>4. Review Modul Kepala SPPG</h3>
                    ${renderReceivingWorkflowTable()}
                </section>
            </div>
        </section>
    `;
}

function materialCategoryFromName(name = '') {
    const text = String(name).toLowerCase();
    if (/ayam|ikan|telur|daging|sapi|tahu|tempe/.test(text)) return 'Protein';
    if (/beras|nasi|mie|roti|tepung|kentang/.test(text)) return 'Karbohidrat';
    if (/wortel|buncis|bayam|sawi|kol|tomat|timun/.test(text)) return 'Sayur';
    if (/saus|minyak|garam|gula|bumbu|kecap/.test(text)) return 'Bumbu';
    if (/box|ompreng|plastik|sendok|kemasan/.test(text)) return 'Kemasan';
    return 'Bahan Baku';
}

function materialUnitFromName(name = '') {
    const text = String(name).toLowerCase();
    if (/telur|box|ompreng|sendok|kemasan/.test(text)) return 'pcs';
    if (/minyak|saus|kecap/.test(text)) return 'liter';
    return 'kg';
}

function materialStorageFromName(name = '', category = '') {
    const text = `${name} ${category}`.toLowerCase();
    if (/ayam|ikan|daging|telur|susu|segar|sayur|buah/.test(text)) return 'Chiller';
    if (/beku|frozen|nugget|dori/.test(text)) return 'Freezer';
    if (/sabun|chemical|sanitizer|detergen|klorin/.test(text)) return 'Chemical storage';
    if (/box|plastik|ompreng|kemasan|sendok/.test(text)) return 'Packaging storage';
    return 'Dry storage';
}

function getSelectedMaterial() {
    return viewState.state.items.find((item) => item.item_id === viewState.selectedItemId) || null;
}

function renderMaterialModal() {
    if (!['material-create', 'material-edit', 'material-review', 'material-detail'].includes(viewState.modalMode)) return '';
    const material = getSelectedMaterial();
    const isReview = viewState.modalMode === 'material-review';
    const isDetail = viewState.modalMode === 'material-detail';
    const isEdit = viewState.modalMode === 'material-edit';
    const title = isReview ? 'Review Bahan oleh Kepala SPPG' : isDetail ? 'Detail Bahan Aktif' : isEdit ? 'Ubah Draft Bahan' : 'Tambah Bahan Baru';
    const previewCode = material?.sku || materialCodePreview('', viewState.state.items.length + 1);
    return `
        <div class="kt-modal-backdrop" data-modal-backdrop="true"></div>
        <div class="kt-modal open" data-kt-modal="true" role="dialog" aria-modal="true" aria-label="${title}">
            <div class="kt-modal-content max-w-[920px] top-5 lg:top-[5%]">
                <div class="kt-modal-header">
                    <div>
                        <div class="text-xs font-medium uppercase text-secondary-foreground">Master Bahan</div>
                        <h3 class="kt-modal-title">${title}</h3>
                    </div>
                    <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" data-action="close-modal" type="button" aria-label="Tutup modal"><i class="ki-filled ki-cross"></i></button>
                </div>
                <div class="kt-modal-body">
                    <form id="inventory-material-form" data-form="${isReview ? 'material-review' : isEdit ? 'material-edit' : 'material-create'}" class="grid gap-5">
                        ${material ? `<input type="hidden" name="item_id" value="${material.item_id}">` : ''}
                        <div class="flex flex-wrap gap-2 border-b border-border pb-3 text-sm font-medium">
                            <span class="kt-badge kt-badge-light kt-badge-primary">Informasi Umum</span>
                            <span class="kt-badge kt-badge-light kt-badge-secondary">Aturan Simpan & Pakai</span>
                            <span class="kt-badge kt-badge-light kt-badge-secondary">Catatan</span>
                        </div>
                        <section class="grid gap-3">
                            <h4 class="text-sm font-semibold text-mono">Informasi Umum</h4>
                            <div class="erp-form-grid">
                                <div class="erp-field"><label>Kode Bahan</label><input class="erp-input" name="sku" data-material-code readonly value="${previewCode}" placeholder="Otomatis dari nama bahan"></div>
                                <div class="erp-field"><label>Nama Bahan</label><input class="erp-input" name="name" data-material-name required ${isDetail ? 'readonly' : ''} value="${material?.name || ''}" placeholder="Contoh: Ayam fillet"></div>
                                <div class="erp-field"><label>Kategori</label><select class="erp-select" name="category" data-material-category ${isDetail ? 'disabled' : ''}>${['Protein', 'Karbohidrat', 'Sayur', 'Buah', 'Bumbu', 'Kemasan', 'Chemical', 'Bahan Baku'].map((value) => `<option value="${value}" ${value === (material?.category || '') ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
                                <div class="erp-field"><label>Satuan</label><select class="erp-select" name="unit" data-material-unit ${isDetail ? 'disabled' : ''}>${['kg', 'gram', 'liter', 'ml', 'pcs', 'pack', 'dus'].map((value) => `<option value="${value}" ${value === (material?.unit || '') ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
                                <div class="erp-field"><label>Merek / Tipe</label><input class="erp-input" name="brand_type" ${isDetail ? 'readonly' : ''} value="${material?.brandType || ''}" placeholder="Opsional"></div>
                                <div class="erp-field"><label>Barcode Bahan</label><input class="erp-input" name="barcode_code" ${isDetail ? 'readonly' : ''} value="${material?.barcodeCode || ''}" placeholder="Jika bahan kemasan"></div>
                                <div class="erp-field full"><label>Deskripsi</label><textarea class="erp-textarea" name="description" ${isDetail ? 'readonly' : ''}>${material?.description || ''}</textarea></div>
                            </div>
                        </section>
                        <section class="grid gap-3">
                            <h4 class="text-sm font-semibold text-mono">Aturan Simpan & Pakai</h4>
                            <div class="erp-form-grid">
                                <div class="erp-field"><label>Metode Pakai</label><select class="erp-select" name="usage_method" ${isDetail ? 'disabled' : ''}>${['FEFO', 'FIFO', 'Sekali pakai', 'Reusable', 'Sesuai instruksi QC'].map((value) => `<option value="${value}" ${value === (material?.usageMethod || 'FEFO') ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
                                <div class="erp-field"><label>Aturan Simpan</label><select class="erp-select" name="storage_rule" data-material-storage ${isDetail ? 'disabled' : ''}>${['Dry storage', 'Chiller', 'Freezer', 'Chemical storage', 'Packaging storage'].map((value) => `<option value="${value}" ${(material?.storageRule || '').toLowerCase().includes(value.toLowerCase()) ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
                                <div class="erp-field"><label>Stok Minimum</label><input class="erp-input" name="min_stock" type="number" min="0" step="0.01" ${isDetail ? 'readonly' : ''} value="${material?.minStock || 0}"></div>
                                <div class="erp-field"><label>Harga Satuan</label><input class="erp-input" name="unit_cost" type="number" min="0" step="100" ${isDetail ? 'readonly' : ''} value="${material?.unitCost || 0}"></div>
                            </div>
                        </section>
                        <input type="hidden" name="expiry_tracking" value="yes">
                        <section class="grid gap-3">
                            <h4 class="text-sm font-semibold text-mono">Catatan</h4>
                            <textarea class="erp-textarea" name="notes" ${isDetail ? 'readonly' : ''}>${material?.notes || ''}</textarea>
                            ${isReview ? '<textarea class="erp-textarea" name="decision_note" placeholder="Catatan keputusan Kepala SPPG"></textarea>' : ''}
                            ${material?.reviewNote ? `<div class="erp-card"><strong>Catatan review:</strong><br>${material.reviewNote}</div>` : ''}
                        </section>
                        <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                            <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button">Tutup</button>
                            ${!isReview && !isDetail ? '<button class="kt-btn kt-btn-sm kt-btn-outline" name="save_action" value="draft" type="submit">Simpan Draft</button><button class="kt-btn kt-btn-sm kt-btn-primary" name="save_action" value="submit" type="submit">Submit ke Kepala SPPG</button>' : ''}
                            ${isReview ? '<button class="kt-btn kt-btn-sm kt-btn-outline" data-review-decision="revision" type="submit">Kembalikan Revisi</button><button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-destructive" data-review-decision="rejected" type="submit">Tolak</button><button class="kt-btn kt-btn-sm kt-btn-primary" data-review-decision="approved" type="submit">Terima</button>' : ''}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderActiveView() {
    const state = viewState.state;
    const activeView = normalizeInventoryView(viewState.activeView);
    const categories = [...new Set(state.items.map((item) => item.category))];
    const filteredItems = getFilteredItems(state.items.filter((item) => isMaterialActive(item)));

    if (viewState.activeView === 'kebutuhan-bahan-harian') return renderDailyNeedsView(state);
    if (activeView === 'overview') return renderInventoryOverview(state);

    if (viewState.activeView === 'master-bahan-baku') return renderMasterBahanView();
    if (viewState.activeView === 'stok-lokasi') return renderStockLocationView(state);
    if (viewState.activeView === 'batch-label') return renderBatchLabelView(state);
    if (viewState.activeView === 'stock-alert') return renderStockAlertView(state);
    if (viewState.activeView === 'recall-batch') return renderRecallBatchView(state);
    if (viewState.activeView === 'penerimaan-bahan-baku') return renderReceivingQaView();
    if (viewState.activeView === 'qc-penerimaan') return renderQcChecklistCompact();

    if (activeView === 'daily-stock') {
        return `
            <section class="kt-card">
                <div class="kt-card-header flex-wrap gap-3">
                    <div>
                        <h3 class="kt-card-title">Stok Harian</h3>
                        <p class="kt-card-description">Cari item, cek risiko, dan tindak lanjuti stok yang perlu perhatian dulu.</p>
                    </div>
                </div>
                <div class="kt-card-content grid gap-4">
                    ${InventoryToolbar({
                        categories,
                        activeCategory: viewState.category,
                        activeStatus: viewState.status,
                        query: viewState.query
                    })}
                    ${InventoryTable(filteredItems)}
                </div>
            </section>
        `;
    }

    if (activeView === 'transactions') {
        return `
            <section class="grid gap-4 md:grid-cols-3">
                ${renderTransactionTile({
                    title: 'Penerimaan Barang',
                    description: 'Catat stok masuk setelah pemeriksaan singkat.',
                    when: 'Dipakai saat bahan datang dari supplier.',
                    action: 'open-stock-in',
                    actionLabel: 'Catat Penerimaan'
                })}
                ${renderTransactionTile({
                    title: 'Penyesuaian Stok',
                    description: 'Koreksi selisih setelah hitung fisik atau timbang ulang.',
                    when: 'Gunakan hanya dengan alasan yang jelas.',
                    action: 'open-adjustment',
                    actionLabel: 'Buat Penyesuaian'
                })}
                ${renderTransactionTile({
                    title: 'Catat Waste',
                    description: 'Catat bahan rusak, expired, susut, atau retur.',
                    when: 'Gunakan saat ada kerugian stok yang perlu bukti.',
                    action: 'open-waste',
                    actionLabel: 'Catat Waste',
                    tone: 'danger'
                })}
            </section>
            ${renderReceivingChecklist()}
        `;
    }

    if (activeView === 'barcode') {
        return `
            <section class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
                <form class="kt-card kt-card-border shadow-none" data-barcode-item-form>
                    <div class="kt-card-header">
                        <div>
                            <h3 class="kt-card-title">Scan Barcode Barang</h3>
                            <p class="kt-card-description">Gunakan kamera untuk barcode kemasan EAN/UPC/Code128. QR code sengaja tidak dipakai.</p>
                        </div>
                    </div>
                    <div class="kt-card-content grid gap-4">
                        <div class="barcode-camera-panel">
                            <video class="barcode-camera-video" data-barcode-video playsinline muted></video>
                            <div class="barcode-camera-overlay">
                                <span></span>
                            </div>
                            <div class="barcode-camera-actions">
                                <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="start-barcode-camera" type="button">
                                    <i class="ki-filled ki-scan-barcode"></i>
                                    Buka Kamera
                                </button>
                                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="stop-barcode-camera" type="button">Tutup Kamera</button>
                                <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-secondary" data-barcode-status>Siap scan barcode</span>
                            </div>
                        </div>
                        <label class="erp-field">
                            <span>Barcode</span>
                            <input class="erp-input barcode-scan-input" name="barcode_code" inputmode="numeric" autocomplete="off" placeholder="Hasil scan akan masuk di sini" required autofocus>
                        </label>
                        <div class="flex flex-wrap gap-2">
                            <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="lookup-barcode-product" type="button">
                                <i class="ki-filled ki-magnifier"></i>
                                Cek Produk Internet
                            </button>
                            <span class="text-xs text-secondary-foreground">Lookup memakai database produk publik. Jika kosong, isi manual.</span>
                        </div>
                        <div class="barcode-lookup-result" data-barcode-lookup-result>
                            <div class="barcode-product-placeholder">?</div>
                            <div>
                                <strong>Belum ada lookup</strong>
                                <p>Scan barcode atau klik cek produk untuk mengisi data barang otomatis.</p>
                            </div>
                        </div>
                        <div class="erp-form-grid">
                            <div class="erp-field"><label>Nama Barang</label><input class="erp-input" name="name" placeholder="Beras premium, ayam fillet..." required></div>
                            <div class="erp-field"><label>Kategori</label><input class="erp-input" name="category" placeholder="Protein, karbohidrat, sayur" required></div>
                            <div class="erp-field"><label>Satuan</label><input class="erp-input" name="unit" placeholder="kg, pcs, liter" required></div>
                            <div class="erp-field"><label>Stok Minimum</label><input class="erp-input" name="min_stock" type="number" min="0" step="0.01" required></div>
                            <div class="erp-field"><label>Harga Satuan</label><input class="erp-input" name="unit_cost" type="number" min="0" step="100" required></div>
                            <div class="erp-field"><label>Stok Awal</label><input class="erp-input" name="initial_qty" type="number" min="0" step="0.01" value="0"></div>
                            <div class="erp-field"><label>Tanggal Inventori</label><input class="erp-input" name="inventory_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                            <div class="erp-field"><label>Expired</label><input class="erp-input" name="expiry_date" type="date"></div>
                            <div class="erp-field full"><label>Lokasi</label><input class="erp-input" name="location" placeholder="Gudang kering, chiller, freezer"></div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button class="kt-btn kt-btn-primary" type="submit"><i class="ki-filled ki-barcode"></i>Simpan Barang</button>
                            <button class="kt-btn kt-btn-outline" data-action="open-add-item" type="button">Input Manual</button>
                        </div>
                    </div>
                </form>
                <section class="kt-card kt-card-border shadow-none">
                    <div class="kt-card-header">
                        <div>
                            <h3 class="kt-card-title">Barang Terakhir</h3>
                            <p class="kt-card-description">Validasi cepat setelah scan barcode dan simpan barang.</p>
                        </div>
                    </div>
                    <div class="kt-card-content">
                        ${InventoryTable(viewState.state.items.slice(0, 6))}
                    </div>
                </section>
            </section>
        `;
    }

    if (activeView === 'audit-control') {
        return `
            ${renderAuditSummary(state)}
            <section class="kt-card">
                <div class="kt-card-header">
                    <div>
                        <h3 class="kt-card-title">Stock Opname</h3>
                        <p class="kt-card-description">Catat selisih fisik yang perlu ditindaklanjuti.</p>
                    </div>
                </div>
                <div class="kt-card-content grid gap-4">
                ${StockOpnameTable(state.items.filter((item) => isMaterialActive(item)))}
                </div>
            </section>
            <section class="kt-card">
                <div class="kt-card-header">
                    <div>
                        <h3 class="kt-card-title">Riwayat Mutasi</h3>
                        <p class="kt-card-description">Telusuri pergerakan stok, alasan, dan role pencatat.</p>
                    </div>
                </div>
                <div class="kt-card-content">
                    ${MovementHistoryTable({ movements: state.movements, items: state.items.filter((item) => isMaterialActive(item)) })}
                </div>
            </section>
            <section class="kt-card">
                <div class="kt-card-header">
                    <div>
                        <h3 class="kt-card-title">Catatan Waste</h3>
                        <p class="kt-card-description">Riwayat waste terakhir untuk pemeriksaan.</p>
                    </div>
                </div>
                <div class="kt-card-content">
                    ${renderWasteTable()}
                </div>
            </section>
        `;
    }

    return '';
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
        <div class="kt-table-wrapper overflow-x-auto">
            <table class="kt-table kt-table-border min-w-[920px]">
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
                <tbody>${rows || '<tr><td colspan="8" class="text-center text-secondary-foreground">Belum ada catatan waste.</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderSvgPreview(record) {
    if (!record.photo_svg) return '<span class="erp-muted">Belum ada</span>';
    const encoded = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(record.photo_svg)}`;
    return `<img class="inventory-svg-proof" src="${encoded}" alt="Bukti SVG waste ${record.sku || ''}">`;
}

function getSelectedStockItem() {
    return viewState.state.items.find((item) => item.item_id === viewState.selectedItemId || item.id === viewState.selectedItemId) || null;
}

function renderStockDetailDrawer() {
    if (viewState.modalMode !== 'stock-detail') return '';
    const item = getSelectedStockItem();
    if (!item) return '';
    const batches = viewState.state.batches
        .filter((batch) => batch.item_id === item.item_id)
        .slice(0, 6);
    const movements = viewState.state.movements
        .filter((movement) => movement.item_id === item.item_id || movement.sku === item.sku)
        .slice(0, 6);
    const stockValue = Number(item.currentStock || 0) * Number(item.unitCost || 0);

    return `
        <div class="inventory-drawer-backdrop" data-action="close-modal"></div>
        <aside class="inventory-detail-drawer" role="dialog" aria-modal="true" aria-label="Detail stok ${item.name}">
            <div class="inventory-detail-hero">
                <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost inventory-drawer-close" data-action="close-modal" type="button" aria-label="Tutup detail"><i class="ki-filled ki-cross"></i></button>
                <div class="inventory-product-visual">${String(item.name || 'S').slice(0, 2).toUpperCase()}</div>
                <div>
                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">${item.sku}</span>
                    <h3>${item.name}</h3>
                    <p>${item.category} · ${item.location}</p>
                </div>
            </div>
            <div class="inventory-detail-body">
                <div class="inventory-detail-stats">
                    <div><span>Stok Saat Ini</span><strong>${Number(item.currentStock || 0).toLocaleString('id-ID')} ${item.unit}</strong></div>
                    <div><span>Minimum</span><strong>${Number(item.minStock || 0).toLocaleString('id-ID')} ${item.unit}</strong></div>
                    <div><span>Nilai Stok</span><strong>Rp ${stockValue.toLocaleString('id-ID')}</strong></div>
                    <div><span>Status</span><strong>${statusFor(item)}</strong></div>
                </div>
                <section class="inventory-detail-section">
                    <h4>Informasi Bahan</h4>
                    <div class="sipagi-detail-grid">
                        <div class="sipagi-detail-row"><span>Metode Pakai</span><strong>${item.usageMethod || '-'}</strong></div>
                        <div class="sipagi-detail-row"><span>Aturan Simpan</span><strong>${item.storageRule || '-'}</strong></div>
                        <div class="sipagi-detail-row"><span>Expired Terdekat</span><strong>${item.expiryDate || '-'}</strong></div>
                        <div class="sipagi-detail-row"><span>Batch Utama</span><strong>${item.batchCode || '-'}</strong></div>
                    </div>
                </section>
                <section class="inventory-detail-section">
                    <div class="flex items-center justify-between gap-3">
                        <h4>Batch Aktif</h4>
                        <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-secondary">${batches.length} batch</span>
                    </div>
                    <div class="inventory-mini-list">
                        ${batches.map((batch) => `
                            <div>
                                <strong>${batch.batch_code || '-'}</strong>
                                <span>${batch.qty_current || 0} ${item.unit} · Exp ${batch.expiry_date || '-'}</span>
                            </div>
                        `).join('') || '<p class="erp-muted">Belum ada batch aktif.</p>'}
                    </div>
                </section>
                <section class="inventory-detail-section">
                    <h4>Movement History</h4>
                    <div class="inventory-mini-list">
                        ${movements.map((movement) => `
                            <div>
                                <strong>${movement.type || movement.movement_type || '-'}</strong>
                                <span>${movement.qty || movement.quantity || 0} ${item.unit} · ${movement.created_at || movement.date || '-'}</span>
                            </div>
                        `).join('') || '<p class="erp-muted">Belum ada movement.</p>'}
                    </div>
                </section>
            </div>
            <div class="inventory-detail-actions">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-material-edit" data-id="${item.item_id}" type="button">Ubah</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="open-stock-in" data-id="${item.item_id}" type="button">Stock Masuk</button>
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-stock-out" data-id="${item.item_id}" type="button">Pakai / Keluar</button>
                <button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-destructive" data-action="open-waste" data-id="${item.item_id}" type="button">Waste</button>
            </div>
        </aside>
    `;
}

function batchLabelBarcode(batchId = '') {
    const chars = String(batchId || 'SIPAGI').split('');
    return `<div class="batch-barcode" aria-label="Barcode ${esc(batchId)}">${chars.map((char, index) => `<span style="width:${(char.charCodeAt(0) + index) % 4 + 1}px"></span>`).join('')}</div>`;
}

function renderBatchLabelPreviewModal() {
    if (viewState.modalMode !== 'batch-label-preview') return '';
    const batch = getSelectedBatch() || viewState.state.batches[0] || {};
    const item = getBatchItem(batch);
    const batchId = batch.batch_id || batch.batch_code || '-';
    const status = batchStatus(batch);
    const details = [
        ['Batch ID', batchId],
        ['Nama Bahan', item.name || batch.item_id || '-'],
        ['Supplier', batchSupplier(batch)],
        ['Qty Awal', batch.qty_initial || batch.qty_received || batch.qty_current || 0],
        ['Satuan', batch.unit || item.unit || '-'],
        ['Lokasi', batch.location || '-'],
        ['Tanggal Terima', batch.received_date || batch.inventory_date || batch.created_at || '-'],
        ['Status', status],
        ['Expired', batch.expiry_date || '-']
    ];
    return `
        <div class="sipagi-modal-backdrop">
            <div class="sipagi-detail-modal batch-label-modal" role="dialog" aria-modal="true" aria-label="Preview label batch">
                <div class="sipagi-detail-modal-header">
                    <div>
                        <h3>Preview Label Batch</h3>
                        <p>Pastikan detail batch sudah benar sebelum download atau print label.</p>
                    </div>
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button">Tutup</button>
                </div>
                <div class="batch-label-preview">
                    <div class="batch-label-paper" data-batch-label-paper>
                        <div class="batch-label-watermark">Label ini dicetak SIPAGI ERP Suite</div>
                        <div class="batch-label-head">
                            <strong>SIPAGI</strong>
                            ${batchLabelBarcode(batchId)}
                        </div>
                        <div class="batch-label-title">${esc(item.name || 'Bahan')}</div>
                        <div class="batch-label-grid">
                            ${details.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="sipagi-detail-actions">
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button"><i class="ki-filled ki-cross"></i>Batal</button>
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="download-batch-label-pdf" type="button"><i class="ki-filled ki-file-down"></i>Download PDF</button>
                    <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="print-batch-label" type="button"><i class="ki-filled ki-printer"></i>Print Label</button>
                </div>
            </div>
        </div>
    `;
}

function renderBatchDetailDrawer() {
    if (viewState.modalMode !== 'batch-detail') return '';
    const batch = getSelectedBatch() || viewState.state.batches[0] || {};
    const item = getBatchItem(batch);
    const batchId = batch.batch_id || batch.batch_code || '-';
    const relatedMovements = viewState.state.movements.filter((movement) => movement.item_id === batch.item_id || movement.batch_id === batchId || movement.batch_code === batchId).slice(0, 8);
    const status = batchStatus(batch);
    const sections = [
        ['Informasi Batch', [
            ['Batch ID', batchId],
            ['Qty Awal', batch.qty_initial || batch.qty_received || batch.qty_current || 0],
            ['Qty Saat Ini', batch.qty_current || 0],
            ['Satuan', batch.unit || item.unit || '-'],
            ['Tanggal Terima', batch.received_date || batch.inventory_date || batch.created_at || '-'],
            ['Expired', batch.expiry_date || '-'],
            ['Status', status]
        ]],
        ['QC Penerimaan', [
            ['Status QC', batch.qc_status || batch.qc_result || 'Pending QC'],
            ['Catatan QC', batch.qc_note || batch.note || '-'],
            ['Suhu Terima', batch.temperature || '-'],
            ['Diterima Oleh', batch.received_by || '-']
        ]],
        ['Lokasi Simpan', [
            ['Lokasi', batch.location || '-'],
            ['Aturan Simpan', item.storageRule || '-'],
            ['Metode Pakai', item.usageMethod || 'FEFO'],
            ['Supplier', batchSupplier(batch)]
        ]],
        ['Riwayat Mutasi', relatedMovements.length
            ? relatedMovements.map((movement) => [movement.type || movement.movement_type || 'Mutasi', `${movement.qty || movement.quantity || 0} ${item.unit || ''} · ${movement.created_at || movement.date || '-'}`])
            : [['Riwayat', 'Belum ada mutasi batch.']]],
        ['Foto & Dokumen', [
            ['Foto Bukti', batch.photo_svg ? 'Tersedia' : 'Belum ada'],
            ['Dokumen Penerimaan', batch.receiving_id || '-'],
            ['Label Terakhir', batch.label_printed_at || 'Belum pernah print']
        ]],
        ['Audit Trail', [
            ['Dibuat', batch.created_at || '-'],
            ['Diperbarui', batch.updated_at || '-'],
            ['User', batch.updated_by || batch.created_by || 'SIPAGI']
        ]]
    ];
    return `
        <div class="inventory-drawer-backdrop" data-action="close-modal"></div>
        <aside class="inventory-detail-drawer batch-detail-drawer" role="dialog" aria-modal="true" aria-label="Detail batch ${esc(batchId)}">
            <div class="inventory-detail-hero batch-detail-hero">
                <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost inventory-drawer-close" data-action="close-modal" type="button" aria-label="Tutup detail"><i class="ki-filled ki-cross"></i></button>
                <div class="inventory-product-visual batch-product-visual">${String(item.name || 'BA').slice(0, 2).toUpperCase()}</div>
                <div class="min-w-0">
                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">${esc(batchId)}</span>
                    <h3>${esc(item.name || 'Nama bahan')}</h3>
                    <p>${esc(batchSupplier(batch))} · ${esc(batch.location || '-')}</p>
                </div>
            </div>
            <div class="batch-detail-summary-grid">
                <div><span>Qty Saat Ini</span><strong>${esc(batch.qty_current || 0)} ${esc(batch.unit || item.unit || '')}</strong></div>
                <div><span>Expired</span><strong>${esc(batch.expiry_date || '-')}</strong></div>
                <div><span>Status</span><strong>${esc(status)}</strong></div>
            </div>
            <div class="inventory-detail-body">
                ${sections.map(([title, rows], index) => `
                    <details class="batch-detail-accordion" ${index < 2 ? 'open' : ''}>
                        <summary>${esc(title)}<i class="ki-filled ki-down"></i></summary>
                        <div class="batch-detail-grid">
                            ${rows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
                        </div>
                    </details>
                `).join('')}
            </div>
            <div class="inventory-detail-actions">
                <button class="kt-btn kt-btn-sm kt-btn-primary" data-action="open-batch-label-preview" data-batch-id="${esc(batchId)}" type="button"><i class="ki-filled ki-printer"></i>Cetak Label</button>
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="open-batch-label-preview" data-batch-id="${esc(batchId)}" type="button"><i class="ki-filled ki-copy"></i>Reprint Label</button>
                <button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-warning" data-action="quarantine-batch" data-batch-id="${esc(batchId)}" type="button"><i class="ki-filled ki-shield-cross"></i>Karantina Batch</button>
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="close-modal" type="button"><i class="ki-filled ki-cross"></i>Tutup</button>
            </div>
        </aside>
    `;
}

function renderInventoryContent() {
    const root = document.getElementById('inventory-root');
    if (!root) return;

    if (viewState.loading) {
        root.innerHTML = LoadingState({
            title: 'Memuat Inventori dari Data',
            message: 'Mengambil item, batch, movement, opname, dan waste records.'
        });
        return;
    }

    if (viewState.error) {
        root.innerHTML = ErrorState({
            title: 'Inventori tidak bisa dimuat',
            message: viewState.error,
            action: '<button class="kt-btn kt-btn-sm" data-action="refresh-inventory" type="button">Coba Lagi</button>'
        });
        return;
    }

    root.innerHTML = `
        <div class="grid gap-5">
            ${renderToast()}
            ${renderKepalaReviewInbox()}
            ${renderInventoryQuickButtons()}
            ${renderViewNav()}
            <div class="grid gap-5">
                ${renderActiveView()}
            </div>
        </div>
        <div id="inventory-modal-root">
            ${['material-create', 'material-edit', 'material-review', 'material-detail'].includes(viewState.modalMode) ? renderMaterialModal() : viewState.modalMode && !['stock-detail', 'batch-detail', 'batch-label-preview'].includes(viewState.modalMode) ? InventoryModal({
                mode: viewState.modalMode,
                items: viewState.state.items.filter((item) => isMaterialActive(item)),
                selectedItemId: viewState.selectedItemId
            }) : ''}
            ${renderStockDetailDrawer()}
            ${renderBatchDetailDrawer()}
            ${renderBatchLabelPreviewModal()}
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

async function refreshInventorySilently() {
    try {
        viewState.state = await getInventoryState();
        viewState.error = '';
        viewState.loading = false;
        renderInventoryContent();
    } catch (error) {
        viewState.error = error.message;
        viewState.loading = false;
        renderInventoryContent();
    }
}

function openModal(mode, itemId = '') {
    viewState.modalMode = mode;
    viewState.selectedItemId = itemId;
    renderInventoryContent();
}

function openBatchModal(mode, batchId = '') {
    const fallback = viewState.state.batches[0]?.batch_id || viewState.state.batches[0]?.batch_code || '';
    viewState.modalMode = mode;
    viewState.selectedBatchId = batchId || fallback;
    const batch = getSelectedBatch();
    viewState.selectedItemId = batch?.item_id || '';
    renderInventoryContent();
}

function closeModal() {
    viewState.modalMode = '';
    viewState.selectedItemId = '';
    viewState.selectedBatchId = '';
    renderInventoryContent();
}

function showToast(message, tone = 'safe') {
    viewState.toast = { message, tone };
    renderInventoryContent();
    window.setTimeout(() => {
        viewState.toast = null;
        renderInventoryContent();
    }, 2800);
}

function renderToast() {
    if (!viewState.toast) return '';
    return `<div class="sipagi-toast ${viewState.toast.tone}">${viewState.toast.message}</div>`;
}

function collectReceivingItems(form) {
    return [...form.querySelectorAll('.receiving-line')].map((row) => {
        const payload = {};
        row.querySelectorAll('[data-line-field]').forEach((field) => {
            payload[field.dataset.lineField] = field.value;
        });
        const item = viewState.state.items.find((candidate) => candidate.item_id === payload.item_id);
        return {
            ...payload,
            ordered_name: item?.name || payload.item_id,
            unit: payload.unit || item?.unit || ''
        };
    }).filter((item) => item.item_id && Number(item.received_qty || 0) > 0);
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
    showToast('Data inventori berhasil disimpan.');
    refreshInventorySilently();
}

async function handleBarcodeSubmit(form) {
    const payload = serializeForm(form);
    await createInventoryItem({
        ...payload,
        source: 'barcode',
        status: 'draft',
        expiry_tracking: payload.expiry_date ? 'yes' : 'no'
    });
    viewState.activeView = 'barcode';
    showToast('Bahan barcode tersimpan sebagai draft.');
    refreshInventorySilently();
}

function bindInventoryEvents() {
    document.addEventListener('input', (event) => {
        if (!document.getElementById('inventory-root')) return;

        if (event.target.id === 'inventory-search' || event.target.id === 'global-search') {
            viewState.query = event.target.value;
            resetStockPagination();
            renderInventoryContent();
        }

        if (event.target.matches('[data-material-name]')) {
            const form = event.target.closest('form');
            const name = event.target.value;
            const code = form?.querySelector('[data-material-code]');
            const category = form?.querySelector('[data-material-category]');
            const unit = form?.querySelector('[data-material-unit]');
            const storage = form?.querySelector('[data-material-storage]');
            if (code && !code.dataset.locked) code.value = materialCodePreview(name, viewState.state.items.length + 1);
            if (category && !category.dataset.touched) category.value = materialCategoryFromName(name);
            if (unit && !unit.dataset.touched) unit.value = materialUnitFromName(name);
            if (storage && !storage.dataset.touched) storage.value = materialStorageFromName(name, category?.value || '');
        }
    });

    document.addEventListener('change', (event) => {
        if (!document.getElementById('inventory-root')) return;

        if (event.target.id === 'inventory-category') {
            viewState.category = event.target.value;
            resetStockPagination();
            renderInventoryContent();
        }

        if (event.target.id === 'inventory-date-filter') {
            viewState.filterDate = event.target.value;
            resetStockPagination();
            renderInventoryContent();
        }

        if (event.target.id === 'inventory-location') {
            viewState.location = event.target.value;
            resetStockPagination();
            renderInventoryContent();
        }

        if (event.target.id === 'inventory-supplier') {
            viewState.supplier = event.target.value;
            resetStockPagination();
            renderInventoryContent();
        }

        if (event.target.id === 'inventory-status') {
            viewState.status = event.target.value;
            resetStockPagination();
            renderInventoryContent();
        }

        if (event.target.matches('[data-stock-page-size]')) {
            viewState.stockPageSize = Number(event.target.value) || 10;
            resetStockPagination();
            renderInventoryContent();
        }

        if (event.target.matches('[data-material-category], [data-material-unit], [data-material-storage]')) {
            event.target.dataset.touched = 'true';
            if (event.target.matches('[data-material-category]')) {
                const form = event.target.closest('form');
                const storage = form?.querySelector('[data-material-storage]');
                const name = form?.querySelector('[data-material-name]')?.value || '';
                if (storage && !storage.dataset.touched) storage.value = materialStorageFromName(name, event.target.value);
            }
        }
    });

    document.addEventListener('click', async (event) => {
        if (!document.getElementById('inventory-root')) return;

        if (event.target.matches('[data-modal-backdrop="true"]')) {
            closeModal();
            return;
        }

        const modeButton = event.target.closest('[data-inventory-mode]');
        if (modeButton) {
            event.preventDefault();
            event.stopPropagation();
            setInventoryMode(modeButton.dataset.inventoryMode);
            return;
        }

        const viewButton = event.target.closest('[data-inventory-view]');
        if (viewButton) {
            event.preventDefault();
            event.stopPropagation();
            setInventoryView(viewButton.dataset.inventoryView);
            return;
        }

        const masterStatusButton = event.target.closest('[data-master-status]');
        if (masterStatusButton) {
            viewState.masterStatus = masterStatusButton.dataset.masterStatus;
            renderInventoryContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        if (action === 'toggle-row-actions') return;
        if (action === 'stock-page-prev') {
            viewState.stockPage = Math.max(1, Number(viewState.stockPage || 1) - 1);
            renderInventoryContent();
            return;
        }
        if (action === 'stock-page-next') {
            viewState.stockPage = Number(viewState.stockPage || 1) + 1;
            renderInventoryContent();
            return;
        }
        if (action === 'open-material-create') { openModal('material-create'); return; }
        if (action === 'open-material-edit') { openModal('material-edit', actionTarget.dataset.id || ''); return; }
        if (action === 'open-material-review') {
            if (!isKepalaSppg()) return;
            openModal('material-review', actionTarget.dataset.id || '');
            return;
        }
        if (action === 'open-material-detail') { openModal('material-detail', actionTarget.dataset.id || ''); return; }
        if (action === 'submit-material') {
            await submitInventoryItem(actionTarget.dataset.id);
            showToast('Bahan berhasil disubmit ke Kepala SPPG.', 'warning');
            refreshInventorySilently();
            return;
        }
        if (action === 'refresh-inventory') { await loadInventory(); return; }
        if (action === 'export-inventory') { exportInventoryReport(actionTarget.dataset.format || 'csv'); return; }
        if (action === 'open-stock-detail') { openModal('stock-detail', actionTarget.dataset.id || ''); return; }
        if (action === 'open-batch-label-preview') { openBatchModal('batch-label-preview', actionTarget.dataset.batchId || ''); return; }
        if (action === 'open-batch-detail') { openBatchModal('batch-detail', actionTarget.dataset.batchId || ''); return; }
        if (action === 'quarantine-batch') {
            openBatchModal('batch-detail', actionTarget.dataset.batchId || viewState.selectedBatchId || '');
            showToast('Batch ditandai untuk karantina review.', 'warning');
            return;
        }
        if (action === 'reset-batch-filter') {
            viewState.query = '';
            viewState.filterDate = '';
            viewState.supplier = 'Semua';
            viewState.location = 'Semua';
            viewState.status = 'Semua';
            resetStockPagination();
            renderInventoryContent();
            return;
        }
        if (action === 'print-batch-label') { printBatchLabel(); return; }
        if (action === 'download-batch-label-pdf') { downloadBatchLabelPdf(); return; }
        if (action === 'start-barcode-camera') { await startBarcodeScanner(); return; }
        if (action === 'stop-barcode-camera') { stopBarcodeScanner(); return; }
        if (action === 'lookup-barcode-product') { await lookupBarcodeProduct(); return; }
        if (action === 'download-sku-report') { downloadSkuReport(); return; }
        if (action === 'open-add-item' || action === 'focus-add-item') { openModal('material-create'); return; }
        if (action === 'open-stock-in') { openModal('stock-in', actionTarget.dataset.id || ''); return; }
        if (action === 'open-stock-out') { openModal('stock-out', actionTarget.dataset.id || ''); return; }
        if (action === 'open-adjustment') { openModal('adjustment', actionTarget.dataset.id || ''); return; }
        if (action === 'open-waste') { openModal('waste', actionTarget.dataset.id || ''); return; }
        if (action === 'close-modal') { closeModal(); return; }
        if (action === 'submit-opname') {
            const opnameDate = document.getElementById('opname-date')?.value || new Date().toISOString().slice(0, 10);
            const records = [...document.querySelectorAll('.opname-input')].map((input) => ({
                item_id: input.dataset.id,
                physical_qty: input.value
            }));
            await submitStockOpname(records, viewState.state, opnameDate);
            showToast('Stock opname berhasil diajukan.', 'warning');
            refreshInventorySilently();
            return;
        }

        if (action === 'add-receiving-line') {
            const tbody = document.querySelector('[data-receiving-lines]');
            if (tbody) tbody.insertAdjacentHTML('beforeend', renderReceivingLine(tbody.querySelectorAll('.receiving-line').length));
            return;
        }

        if (action === 'remove-receiving-line') {
            actionTarget.closest('.receiving-line')?.remove();
            return;
        }

        if (action === 'review-receiving') {
            const note = window.prompt('Catatan review Kepala SPPG') || '';
            await reviewReceivingWorkflow(actionTarget.dataset.id, actionTarget.dataset.decision, { review_note: note }, viewState.state);
            showToast(actionTarget.dataset.decision === 'approved' ? 'Penerimaan disetujui dan batch stock terbentuk.' : 'Keputusan review penerimaan tersimpan.', actionTarget.dataset.decision === 'approved' ? 'safe' : 'warning');
            refreshInventorySilently();
            return;
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

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('inventory-root')) return;
        if (!event.target.matches('[data-barcode-item-form]')) return;

        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Menyimpan...';
        }
        try {
            await handleBarcodeSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Coba Lagi';
            }
        }
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('inventory-root')) return;
        if (event.target.id !== 'inventory-material-form') return;
        event.preventDefault();

        const form = event.target;
        const payload = serializeForm(form);
        const submitter = event.submitter;
        const decision = submitter?.dataset.reviewDecision;
        const saveAction = submitter?.value || 'draft';
        if (submitter) {
            submitter.disabled = true;
            submitter.textContent = 'Memproses...';
        }
        try {
            if (form.dataset.form === 'material-create') {
                const item = await createInventoryItem({
                    ...payload,
                    material_code: payload.sku,
                    status: saveAction === 'submit' ? 'menunggu approval' : 'draft'
                });
                if (saveAction === 'submit') await submitInventoryItem(item.item_id);
            }
            if (form.dataset.form === 'material-edit') {
                await updateInventoryItem(payload.item_id, payload);
                if (saveAction === 'submit') await submitInventoryItem(payload.item_id);
            }
            if (form.dataset.form === 'material-review') {
                if (decision === 'approved') await activateInventoryItem(payload.item_id, payload);
                if (decision === 'rejected') await rejectInventoryItem(payload.item_id, payload);
                if (decision === 'revision') await requestInventoryItemRevision(payload.item_id, payload);
            }
            closeModal();
            showToast(form.dataset.form === 'material-review' ? 'Keputusan persetujuan bahan berhasil disimpan.' : 'Bahan berhasil disimpan.');
            refreshInventorySilently();
        } catch (error) {
            window.alert(error.message);
            if (submitter) {
                submitter.disabled = false;
                submitter.textContent = 'Coba Lagi';
            }
        }
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('inventory-root')) return;
        if (!event.target.matches('[data-receiving-form]')) return;
        event.preventDefault();
        const form = event.target;
        const action = event.submitter?.value || 'draft';
        if (action === 'submit' && !window.confirm('Pastikan data penerimaan, item, qty, QC checklist, foto bukti SVG, dan catatan sudah benar sebelum submit ke Kepala SPPG. Lanjut submit?')) return;
        const payload = {
            ...serializeForm(form),
            items_json: JSON.stringify(collectReceivingItems(form))
        };
        try {
            await saveReceivingDraft(payload, viewState.state, action === 'submit');
            showToast(action === 'submit' ? 'Penerimaan berhasil disubmit ke Kepala SPPG.' : 'Draft penerimaan berhasil disimpan.', action === 'submit' ? 'warning' : 'safe');
            viewState.activeView = 'penerimaan-bahan-baku';
            refreshInventorySilently();
        } catch (error) {
            window.alert(error.message);
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

function currentBatchLabelHtml() {
    const label = document.querySelector('[data-batch-label-paper]');
    return label?.outerHTML || '';
}

function printBatchLabel() {
    const labelHtml = currentBatchLabelHtml();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
        <html><head><title>Print Label Batch SIPAGI</title>
        <style>
            body{font-family:Arial,sans-serif;padding:24px;background:#f8fafc}
            .batch-label-paper{position:relative;width:420px;border:1px solid #111827;border-radius:10px;background:#fff;padding:18px;overflow:hidden}
            .batch-label-watermark{position:absolute;inset:auto 10px 10px auto;color:#cbd5e1;font-size:11px;font-weight:700}
            .batch-label-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:12px}
            .batch-label-head strong{font-size:22px}
            .batch-barcode{display:flex;align-items:stretch;height:42px;gap:2px}
            .batch-barcode span{display:block;background:#111827}
            .batch-label-title{font-size:18px;font-weight:800;margin-bottom:10px}
            .batch-label-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
            .batch-label-grid div{border:1px solid #e5e7eb;border-radius:6px;padding:7px}
            .batch-label-grid span{display:block;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700}
            .batch-label-grid strong{font-size:12px}
        </style></head><body>${labelHtml}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function downloadBatchLabelPdf() {
    printBatchLabel();
}

function exportInventoryReport(format = 'csv') {
    const items = getFilteredItems(viewState.state.items.filter((item) => isMaterialActive(item)));
    const headers = ['SKU', 'Nama Bahan', 'Kategori', 'Satuan', 'Stok', 'Minimum', 'Status Stok', 'Batch Utama', 'Expired', 'Lokasi', 'Nilai Stok'];
    const rows = items.map((item) => [
        item.sku,
        item.name,
        item.category,
        item.unit,
        item.currentStock,
        item.minStock,
        statusFor(item),
        item.batchCode,
        item.expiryDate,
        item.location,
        Number(item.currentStock || 0) * Number(item.unitCost || 0)
    ]);

    if (format === 'pdf') {
        const htmlRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}</tr>`).join('');
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title>Laporan Stok Bahan SIPAGI</title>
            <style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f1f5f9;text-align:left}</style>
            </head><body><h2>Laporan Stok Bahan SIPAGI</h2><p>Diekspor ${jakartaTimestampUi()}</p><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table></body></html>
        `);
        printWindow.document.close();
        printWindow.print();
        return;
    }

    if (format === 'excel') {
        const table = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        downloadBlob(table, 'application/vnd.ms-excel;charset=utf-8', `laporan-stok-sipagi-${new Date().toISOString().slice(0, 10)}.xls`);
        return;
    }

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8', `laporan-stok-sipagi-${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadBlob(content, type, filename) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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

export function initInventoryPage(initialView = 'overview') {
    stopBarcodeScanner();
    viewState.activeView = allInventoryViews().some((view) => view.id === initialView) ? initialView : 'overview';
    viewState.activeMode = modeForView(viewState.activeView);
    if (!eventsBound) {
        bindInventoryEvents();
        eventsBound = true;
    }
    loadInventory();
}
