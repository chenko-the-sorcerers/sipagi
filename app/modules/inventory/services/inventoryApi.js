import {
    createSheetRow,
    getSheetRows,
    updateSheetRow
} from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'kepala_sppg';

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function todayIso() {
    return new Date().toISOString();
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function activeRows(rows) {
    return rows.filter((row) => row.status !== 'deleted');
}

function isExpired(dateValue) {
    if (!dateValue) return false;
    return new Date(dateValue).getTime() < Date.now();
}

function daysUntil(dateValue) {
    if (!dateValue) return null;
    const diff = new Date(dateValue).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function groupByItemId(rows) {
    return rows.reduce((map, row) => {
        const key = row.item_id;
        if (!map[key]) map[key] = [];
        map[key].push(row);
        return map;
    }, {});
}

function slugPart(value, fallback = 'SKU') {
    return String(value || fallback)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 4)
        .padEnd(3, 'X');
}

function createSku({ category, name, date = todayDate(), sequence = 1 }) {
    const cleanDate = String(date).replace(/-/g, '');
    return `SPG-${slugPart(category)}-${slugPart(name)}-${cleanDate}-${String(sequence).padStart(4, '0')}`;
}

function svgToDataUri(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createEvidenceSvg({ title, subtitle, itemName, qty, unit, reason, date, source }) {
    const safe = (value) => String(value || '-')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420">
  <rect width="720" height="420" fill="#F8FAFC"/>
  <rect x="32" y="32" width="656" height="356" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <rect x="32" y="32" width="656" height="86" rx="16" fill="#0056B3"/>
  <text x="62" y="82" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF">${safe(title)}</text>
  <text x="62" y="106" font-family="Arial, sans-serif" font-size="14" fill="#EBF5FF">${safe(subtitle)}</text>
  <circle cx="602" cy="75" r="34" fill="#EBF5FF"/>
  <text x="602" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#0056B3">S</text>
  <text x="62" y="164" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#64748B">ITEM</text>
  <text x="62" y="194" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1E293B">${safe(itemName)}</text>
  <text x="62" y="238" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#64748B">JUMLAH</text>
  <text x="62" y="268" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1E293B">${safe(qty)} ${safe(unit)}</text>
  <text x="300" y="238" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#64748B">SUMBER</text>
  <text x="300" y="268" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1E293B">${safe(source)}</text>
  <text x="62" y="318" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#64748B">CATATAN</text>
  <text x="62" y="346" font-family="Arial, sans-serif" font-size="18" fill="#1E293B">${safe(reason).slice(0, 72)}</text>
  <text x="62" y="374" font-family="Arial, sans-serif" font-size="13" fill="#64748B">Tanggal inventori: ${safe(date)} - Bukti SVG otomatis SIPAGI</text>
</svg>`;
}

function buildInventoryItems({ items, batches }) {
    const batchesByItem = groupByItemId(activeRows(batches));

    return activeRows(items).map((item) => {
        const itemBatches = batchesByItem[item.item_id] || [];
        const currentStock = itemBatches.reduce((sum, batch) => sum + numberValue(batch.qty_current), 0);
        const sortedBatches = [...itemBatches].sort((a, b) => {
            return new Date(a.expiry_date || '2999-12-31') - new Date(b.expiry_date || '2999-12-31');
        });
        const primaryBatch = sortedBatches[0] || {};

        return {
            id: item.item_id,
            item_id: item.item_id,
            sku: item.sku || item.item_id,
            name: item.name || '-',
            category: item.category || '-',
            unit: item.unit || '-',
            currentStock,
            minStock: numberValue(item.min_stock),
            unitCost: numberValue(item.unit_cost),
            expiryTracking: item.expiry_tracking || 'yes',
            status: item.status || 'active',
            batchCode: primaryBatch.batch_code || '-',
            inventoryDate: primaryBatch.inventory_date || primaryBatch.received_date || '',
            expiryDate: primaryBatch.expiry_date || '',
            location: primaryBatch.location || '-',
            batchCount: itemBatches.length,
            expiredBatchCount: itemBatches.filter((batch) => isExpired(batch.expiry_date)).length,
            expiringSoonCount: itemBatches.filter((batch) => {
                const remaining = daysUntil(batch.expiry_date);
                return remaining !== null && remaining >= 0 && remaining <= 3;
            }).length
        };
    });
}

export async function getInventoryState() {
    const [items, batches, movements, opnames, wasteRecords] = await Promise.all([
        getSheetRows('items'),
        getSheetRows('stock_batches'),
        getSheetRows('stock_movements'),
        getSheetRows('stock_opnames'),
        getSheetRows('waste_records')
    ]);

    return {
        items: buildInventoryItems({
            items: items.rows || [],
            batches: batches.rows || []
        }),
        rawItems: activeRows(items.rows || []),
        batches: activeRows(batches.rows || []),
        movements: movements.rows || [],
        opnameRecords: opnames.rows || [],
        wasteRecords: wasteRecords.rows || []
    };
}

export function getInventorySummaryFromState(state) {
    const inventoryValue = state.items.reduce((sum, item) => sum + item.currentStock * item.unitCost, 0);
    const criticalItems = state.items.filter((item) => item.currentStock <= item.minStock).length;
    const wasteValue = state.wasteRecords.reduce((sum, record) => sum + numberValue(record.cost_estimate), 0);
    const expiredBatchCount = state.items.reduce((sum, item) => sum + item.expiredBatchCount, 0);

    return {
        totalItems: state.items.length,
        criticalItems,
        inventoryValue,
        wasteValue,
        expiredBatchCount
    };
}

export async function createInventoryItem(payload) {
    const existingItems = (await getSheetRows('items')).rows || [];
    const inventoryDate = payload.inventory_date || payload.received_date || todayDate();
    const sku = payload.sku || createSku({
        category: payload.category,
        name: payload.name,
        date: inventoryDate,
        sequence: activeRows(existingItems).length + 1
    });

    const itemResult = await createSheetRow('items', {
        sku,
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        min_stock: payload.min_stock,
        unit_cost: payload.unit_cost,
        expiry_tracking: payload.expiry_tracking || 'yes',
        status: 'active'
    }, USER_ID);

    const item = itemResult.row;
    const initialQty = numberValue(payload.initial_qty);

    if (initialQty > 0) {
        const batchResult = await createSheetRow('stock_batches', {
            sku,
            item_id: item.item_id,
            vendor_id: payload.vendor_id || '',
            batch_code: payload.batch_code || `${sku}-B01`,
            qty_initial: initialQty,
            qty_current: initialQty,
            unit: payload.unit,
            inventory_date: inventoryDate,
            received_date: payload.received_date || inventoryDate,
            expiry_date: payload.expiry_date,
            location: payload.location,
            status: 'released'
        }, USER_ID);

        await createSheetRow('stock_movements', {
            sku,
            item_id: item.item_id,
            batch_id: batchResult.row.batch_id,
            type: 'stok-masuk',
            qty: initialQty,
            unit: payload.unit,
            movement_date: inventoryDate,
            reason: 'Stok awal dari pembuatan SKU',
            reference_type: 'items',
            reference_id: item.item_id,
            created_by: USER_ID,
            created_at: todayIso()
        }, USER_ID);
    }

    return item;
}

export async function recordStockMovement(payload, state) {
    const item = state.items.find((candidate) => candidate.item_id === payload.item_id);
    const qty = numberValue(payload.qty);
    if (!item) throw new Error('Item tidak ditemukan');
    if (qty <= 0) throw new Error('Jumlah harus lebih dari nol');

    const inventoryDate = payload.inventory_date || payload.received_date || todayDate();

    if (payload.type === 'stock-in') {
        const batchResult = await createSheetRow('stock_batches', {
            sku: item.sku,
            item_id: payload.item_id,
            vendor_id: payload.vendor_id || '',
            batch_code: payload.batch_code || `${item.sku}-${Date.now()}`,
            qty_initial: qty,
            qty_current: qty,
            unit: item.unit,
            inventory_date: inventoryDate,
            received_date: payload.received_date || inventoryDate,
            expiry_date: payload.expiry_date,
            location: payload.location,
            status: payload.qc_status || 'released'
        }, USER_ID);

        await createSheetRow('stock_movements', {
            sku: item.sku,
            item_id: payload.item_id,
            batch_id: batchResult.row.batch_id,
            type: 'stok-masuk',
            qty,
            unit: item.unit,
            movement_date: inventoryDate,
            reason: payload.reason,
            reference_type: 'penerimaan_manual',
            reference_id: batchResult.row.batch_id,
            created_by: USER_ID,
            created_at: todayIso()
        }, USER_ID);
        return;
    }

    const batch = selectFefoBatch(payload.item_id, qty, state.batches);
    const nextQty = numberValue(batch.qty_current) - qty;
    await updateSheetRow('stock_batches', batch.batch_id, { qty_current: nextQty }, 'batch_id');
    await createSheetRow('stock_movements', {
        sku: item.sku,
        item_id: payload.item_id,
        batch_id: batch.batch_id,
        type: 'stok-keluar',
        qty,
        unit: item.unit,
        movement_date: inventoryDate,
        reason: payload.reason,
        reference_type: payload.reference_type || 'issue_manual',
        reference_id: payload.reference_id || '',
        created_by: USER_ID,
        created_at: todayIso()
    }, USER_ID);
}

export async function recordAdjustment(payload, state) {
    const item = state.items.find((candidate) => candidate.item_id === payload.item_id);
    if (!item) throw new Error('Item tidak ditemukan');

    const inventoryDate = payload.inventory_date || payload.opname_date || todayDate();
    const physicalStock = numberValue(payload.physical_qty);
    const variance = physicalStock - item.currentStock;
    await applyVarianceToBatches(payload.item_id, variance, item.unit, state.batches, item.sku);

    await createSheetRow('stock_opnames', {
        sku: item.sku,
        item_id: payload.item_id,
        batch_id: payload.batch_id || '',
        opname_date: payload.opname_date || inventoryDate,
        system_qty: item.currentStock,
        physical_qty: physicalStock,
        variance_qty: variance,
        reason: payload.reason,
        approval_status: payload.approval_status || 'pending',
        created_by: USER_ID,
        created_at: todayIso()
    }, USER_ID);

    await createSheetRow('stock_movements', {
        sku: item.sku,
        item_id: payload.item_id,
        batch_id: payload.batch_id || '',
        type: 'penyesuaian',
        qty: variance,
        unit: item.unit,
        movement_date: inventoryDate,
        reason: payload.reason,
        reference_type: 'stock_opnames',
        reference_id: '',
        created_by: USER_ID,
        created_at: todayIso()
    }, USER_ID);
}

export async function submitStockOpname(records, state, opnameDate = todayDate()) {
    for (const record of records) {
        const item = state.items.find((candidate) => candidate.item_id === record.item_id);
        if (!item) continue;

        const physicalQty = numberValue(record.physical_qty);
        const variance = physicalQty - item.currentStock;
        if (variance !== 0) await applyVarianceToBatches(item.item_id, variance, item.unit, state.batches, item.sku);

        await createSheetRow('stock_opnames', {
            sku: item.sku,
            item_id: item.item_id,
            batch_id: '',
            opname_date: opnameDate,
            system_qty: item.currentStock,
            physical_qty: physicalQty,
            variance_qty: variance,
            reason: 'Pengajuan stock opname',
            approval_status: variance === 0 ? 'approved' : 'pending',
            created_by: USER_ID,
            created_at: todayIso()
        }, USER_ID);
    }
}

export async function recordWaste(payload, state) {
    const item = state.items.find((candidate) => candidate.item_id === payload.item_id);
    if (!item) throw new Error('Item tidak ditemukan');

    const qty = numberValue(payload.qty);
    const batch = selectFefoBatch(payload.item_id, qty, state.batches);
    const nextQty = numberValue(batch.qty_current) - qty;
    const costEstimate = qty * item.unitCost;
    const inventoryDate = payload.inventory_date || todayDate();
    const photoSvg = payload.photo_svg || createEvidenceSvg({
        title: 'Bukti Waste Inventori',
        subtitle: 'Dibuat otomatis oleh SIPAGI',
        itemName: item.name,
        qty,
        unit: item.unit,
        reason: payload.reason,
        date: inventoryDate,
        source: payload.source
    });

    await updateSheetRow('stock_batches', batch.batch_id, { qty_current: nextQty }, 'batch_id');
    const waste = await createSheetRow('waste_records', {
        sku: item.sku,
        source: payload.source,
        item_id: payload.item_id,
        batch_id: batch.batch_id,
        qty,
        unit: item.unit,
        inventory_date: inventoryDate,
        reason: payload.reason,
        cost_estimate: costEstimate,
        photo_svg: photoSvg,
        photo_url: payload.photo_url || svgToDataUri(photoSvg),
        created_by: USER_ID,
        created_at: todayIso()
    }, USER_ID);

    await createSheetRow('stock_movements', {
        sku: item.sku,
        item_id: payload.item_id,
        batch_id: batch.batch_id,
        type: 'waste',
        qty,
        unit: item.unit,
        movement_date: inventoryDate,
        reason: payload.reason,
        reference_type: 'waste_records',
        reference_id: waste.row.waste_id,
        created_by: USER_ID,
        created_at: todayIso()
    }, USER_ID);
}

function selectFefoBatch(itemId, qty, batches) {
    const availableBatches = batches
        .filter((batch) => batch.item_id === itemId && numberValue(batch.qty_current) > 0 && batch.status !== 'rejected')
        .sort((a, b) => new Date(a.expiry_date || '2999-12-31') - new Date(b.expiry_date || '2999-12-31'));

    const batch = availableBatches.find((candidate) => numberValue(candidate.qty_current) >= qty);
    if (!batch) throw new Error('Batch FEFO dengan stok cukup tidak tersedia');
    if (isExpired(batch.expiry_date)) throw new Error('Batch sudah expired dan tidak bisa dipakai');
    return batch;
}

async function applyVarianceToBatches(itemId, variance, unit, batches, sku) {
    if (variance === 0) return;

    if (variance > 0) {
        await createSheetRow('stock_batches', {
            sku,
            item_id: itemId,
            vendor_id: '',
            batch_code: `ADJ-${Date.now()}`,
            qty_initial: variance,
            qty_current: variance,
            unit,
            inventory_date: todayDate(),
            received_date: todayDate(),
            expiry_date: '',
            location: 'Adjustment',
            status: 'released'
        }, USER_ID);
        return;
    }

    let remainingReduction = Math.abs(variance);
    const availableBatches = batches
        .filter((batch) => batch.item_id === itemId && numberValue(batch.qty_current) > 0)
        .sort((a, b) => new Date(a.expiry_date || '2999-12-31') - new Date(b.expiry_date || '2999-12-31'));

    for (const batch of availableBatches) {
        if (remainingReduction <= 0) break;
        const currentQty = numberValue(batch.qty_current);
        const reduction = Math.min(currentQty, remainingReduction);
        await updateSheetRow('stock_batches', batch.batch_id, { qty_current: currentQty - reduction }, 'batch_id');
        remainingReduction -= reduction;
    }

    if (remainingReduction > 0) throw new Error('Penyesuaian melebihi stok tersedia');
}
