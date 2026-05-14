import {
    createSheetRow,
    getSheetRows,
    updateSheetRow,
    upsertSheetRow
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

function jakartaTimestamp(date = new Date()) {
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

function prettyLabel(value, fallback = '-') {
    return String(value || fallback)
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeLocation(location = '', category = '') {
    const raw = String(location || '').trim();
    if (raw && raw !== '-') return prettyLabel(raw);
    const key = String(category || '').toLowerCase();
    if (key.includes('protein') || key.includes('sayur') || key.includes('buah') || key.includes('segar')) return 'Chiller 1';
    if (key.includes('beku') || key.includes('frozen')) return 'Freezer 1';
    if (key.includes('kemasan') || key.includes('packaging') || key.includes('alat makan')) return 'Packaging Storage';
    if (key.includes('chemical') || key.includes('sanitasi')) return 'Chemical Storage';
    return 'Gudang Kering A';
}

function isNakalaSession() {
    try {
        const user = JSON.parse(localStorage.getItem('sipagi.session.user') || 'null');
        return !user || user.provider === 'demo' || user.sppgId === 'sppg_nakala' || user.sppgCode === 'sppg_nakala';
    } catch {
        return true;
    }
}

function fallbackInventorySheets() {
    const now = '2026-05-12 16:45:00 GMT+7';
    const today = '2026-05-12';
    const categories = [
        ['Karbohidrat', 'KRB', 'kg', 'dry storage', 'Gudang Kering A', ['Beras Premium Medium', 'Beras IR64', 'Kentang Dieng', 'Makaroni Elbow', 'Tepung Terigu', 'Bihun Jagung']],
        ['Protein Hewani', 'PHW', 'kg', 'chiller', 'Chiller 1', ['Ayam Fillet Dada', 'Telur Ayam Negeri', 'Ikan Lele Fillet', 'Daging Ayam Katsu', 'Ikan Dori Beku', 'Hati Ayam']],
        ['Protein Nabati', 'PNB', 'kg', 'chiller', 'Chiller 2', ['Tahu Putih', 'Tempe Kedelai', 'Kacang Merah', 'Edamame Beku', 'Tahu Sutra', 'Nugget Tahu']],
        ['Sayur', 'SYR', 'kg', 'chiller', 'Chiller 3', ['Wortel Lokal', 'Buncis', 'Bayam Hijau', 'Sawi Putih', 'Brokoli', 'Tomat Merah']],
        ['Buah', 'BUH', 'kg', 'chiller', 'Chiller 1', ['Pisang Cavendish', 'Pepaya California', 'Semangka Merah', 'Apel Fuji', 'Jeruk Baby', 'Buah Naga']],
        ['Bumbu', 'BMB', 'kg', 'dry storage', 'Gudang Kering B', ['Bawang Merah', 'Bawang Putih', 'Garam Beryodium', 'Gula Pasir', 'Ketumbar Bubuk', 'Kaldu Jamur']],
        ['Saus dan Cairan', 'SCS', 'liter', 'dry storage', 'Gudang Kering C', ['Kecap Manis', 'Saus Tomat', 'Saus Barbeque', 'Minyak Goreng', 'Santan Cair', 'Susu UHT Plain']],
        ['Kemasan', 'KMS', 'pcs', 'packaging storage', 'Packaging Storage 1', ['Ompreng Stainless 5 Sekat', 'Tutup Ompreng', 'Cup Saus 30 ml', 'Label Menu Harian', 'Kardus Distribusi', 'Termobox Insulated']]
    ];
    const storageRules = {
        'dry storage': 'Dry storage: suhu ruang 20-30 C, area kering dan bersih',
        chiller: 'Chiller: suhu 0-4 C bahan segar',
        'packaging storage': 'Packaging storage: area kering, bersih, tertutup, dan bebas kontaminasi'
    };
    const items = [];
    const batches = [];
    const movements = [];
    let index = 0;
    categories.forEach(([category, prefix, unit, storage, location, names]) => {
        names.forEach((name) => {
            index += 1;
            const itemId = `item_${String(index).padStart(3, '0')}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
            const sku = `${prefix}-${String(index).padStart(4, '0')}`;
            const minStock = category === 'Kemasan' ? 900 : 40 + (index % 5) * 12;
            const qty = [minStock * 2.4, minStock * 0.8, minStock * 0.45, minStock * 1.35][index % 4];
            const status = index % 13 === 0 ? 'menunggu approval' : 'aktif';
            items.push({
                item_id: itemId,
                sku,
                material_code: `${prefix.slice(0, 2)}-${String(index).padStart(3, '0')}`,
                barcode_code: `8997${String(10000000 + index)}`,
                name,
                category,
                unit,
                usage_method: category === 'Kemasan' ? 'FIFO' : 'FEFO',
                storage_rule: storageRules[storage],
                min_stock: minStock,
                unit_cost: category === 'Kemasan' ? 850 + index * 20 : 12000 + index * 750,
                expiry_tracking: category === 'Kemasan' ? 'tidak' : 'ya',
                status,
                approval_status: status,
                created_by: 'user_inventory',
                created_at: today,
                updated_at: now
            });
            if (status === 'aktif') {
                const batchId = `batch_${String(index).padStart(3, '0')}`;
                batches.push({
                    batch_id: batchId,
                    sku,
                    item_id: itemId,
                    vendor_id: ['vendor_beras_merapi', 'vendor_tani_segar', 'vendor_protein_nusantara'][index % 3],
                    batch_code: `${prefix}-${String(index).padStart(4, '0')}-260512`,
                    qty_initial: Math.round(qty + minStock * 0.8),
                    qty_current: Math.round(qty),
                    unit,
                    inventory_date: today,
                    received_date: today,
                    expiry_date: category === 'Kemasan' ? '' : `2026-05-${String(18 + (index % 10)).padStart(2, '0')}`,
                    location,
                    status: index % 9 === 0 ? 'karantina' : 'released',
                    qc_status: index % 9 === 0 ? 'pending_qc' : 'accepted',
                    created_at: now,
                    updated_at: now
                });
                movements.push({
                    movement_id: `mov_in_${String(index).padStart(3, '0')}`,
                    sku,
                    item_id: itemId,
                    batch_id: batchId,
                    type: 'stok-masuk',
                    qty: Math.round(qty + minStock * 0.8),
                    unit,
                    movement_date: today,
                    reason: 'Penerimaan awal SPPG Nakala',
                    created_by: 'user_inventory',
                    created_at: now
                });
            }
        });
    });
    return { items, stock_batches: batches, stock_movements: movements, stock_opnames: [], waste_records: [], settings: [] };
}

async function safeSheetRows(sheet) {
    try {
        return await getSheetRows(sheet);
    } catch {
        if (!isNakalaSession()) throw new Error('Data belum tersedia untuk SPPG ini');
        const fallback = fallbackInventorySheets();
        return { ok: true, rows: fallback[sheet] || [] };
    }
}

function defaultStorageRule(category = '') {
    const key = String(category || '').toLowerCase();
    if (key.includes('protein') || key.includes('sayur') || key.includes('buah') || key.includes('segar')) return getStorageRulePreset('chiller');
    if (key.includes('beku') || key.includes('frozen')) return getStorageRulePreset('freezer');
    if (key.includes('kemasan') || key.includes('packaging') || key.includes('alat makan')) return getStorageRulePreset('packaging storage');
    if (key.includes('chemical') || key.includes('sanitasi')) return getStorageRulePreset('chemical storage');
    return getStorageRulePreset('dry storage');
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

function createMaterialCode({ name, sequence = 1 }) {
    const normalized = String(name || 'Bahan')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]+/g, ' ')
        .trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    const prefix = (words.length > 1
        ? words.map((word) => word[0]).join('')
        : normalized.slice(0, 2))
        .replace(/[^A-Z0-9]/g, '')
        .padEnd(2, 'X')
        .slice(0, 4);
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

export function getStorageRulePreset(storageRule = '') {
    const key = String(storageRule || '').toLowerCase();
    const presets = {
        'dry storage': 'Dry storage: suhu ruang 20-30 C, area kering dan bersih',
        chiller: 'Chiller: suhu 0-4 C bahan segar',
        freezer: 'Freezer: suhu -18 C bahan beku',
        'chemical storage': 'Chemical storage: terpisah dari bahan pangan, berlabel, dan terkunci',
        'packaging storage': 'Packaging storage: area kering, bersih, tertutup, dan bebas kontaminasi'
    };
    return presets[key] || storageRule || 'Dry storage: suhu ruang 20-30 C, area kering dan bersih';
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

function parseJson(value, fallback) {
    try {
        return JSON.parse(value || '');
    } catch {
        return fallback;
    }
}

function parseReceivingWorkflows(rows = []) {
    return rows
        .filter((row) => String(row.key || '').startsWith('inventory_receiving_'))
        .map((row) => ({
            ...parseJson(row.value, {}),
            setting_id: row.setting_id,
            setting_key: row.key
        }))
        .filter((row) => row.receiving_id)
        .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
}

function createQcEvidenceSvg({ receivingId, itemName, checklist, note, brokenQty, crackedQty }) {
    const yesCount = checklist.filter((row) => row.value === 'ya').length;
    const noCount = checklist.filter((row) => row.value === 'tidak').length;
    const naCount = checklist.filter((row) => row.value === 'na').length;
    return createEvidenceSvg({
        title: 'Bukti QC Penerimaan',
        subtitle: receivingId,
        itemName,
        qty: `Ya ${yesCount} / Tidak ${noCount} / N/A ${naCount}`,
        unit: 'check',
        reason: `${note || 'QC item'} | Pecah ${brokenQty || 0} | Retak ${crackedQty || 0}`,
        date: jakartaTimestamp(),
        source: 'QA Flow Penerimaan'
    });
}

function normalizeReceivingItem(item = {}, index = 0, state = { items: [] }) {
    const master = state.items?.find((row) => row.item_id === item.item_id || row.sku === item.item_id) || {};
    const receivedQty = numberValue(item.received_qty);
    const brokenQty = numberValue(item.broken_qty);
    const crackedQty = numberValue(item.cracked_qty);
    const rejectedQty = numberValue(item.rejected_qty);
    const checklist = ['label', 'fisik', 'expired', 'suhu', 'kemasan', 'jumlah'].map((key) => ({
        key,
        label: {
            label: 'Label sesuai',
            fisik: 'Kondisi fisik baik',
            expired: 'Tidak expired',
            suhu: 'Suhu sesuai',
            kemasan: 'Kemasan bersih',
            jumlah: 'Jumlah sesuai'
        }[key],
        value: item[`qc_${key}`] || 'na',
        note: item[`qc_${key}_note`] || ''
    }));
    const failed = checklist.some((row) => row.value === 'tidak') || brokenQty > 0 || crackedQty > 0 || rejectedQty > 0;
    const qcResult = failed ? 'perlu review' : 'lulus';
    const status = failed ? 'ditahan qc' : 'siap diterima';
    const acceptedQty = Math.max(receivedQty - brokenQty - crackedQty - rejectedQty, 0);

    return {
        line_id: item.line_id || `line_${Date.now()}_${index + 1}`,
        item_id: item.item_id || master.item_id || '',
        sku: master.sku || item.sku || '',
        ordered_name: item.ordered_name || master.name || item.name || '',
        received_qty: receivedQty,
        accepted_qty: acceptedQty,
        expiry_date: item.expiry_date || '',
        rejected_qty: rejectedQty,
        broken_qty: brokenQty,
        cracked_qty: crackedQty,
        unit: item.unit || master.unit || '',
        temperature: item.temperature || '',
        qc_checklist: checklist,
        qc_result: qcResult,
        item_status: status,
        qc_item_note: item.qc_item_note || '',
        photo_svg: item.photo_svg || createQcEvidenceSvg({
            receivingId: item.receiving_id || 'draft',
            itemName: item.ordered_name || master.name || item.name || '-',
            checklist,
            note: item.qc_item_note,
            brokenQty,
            crackedQty
        }),
        notes: item.notes || ''
    };
}

async function saveReceivingWorkflow(workflow) {
    const key = workflow.setting_key || `inventory_receiving_${workflow.receiving_id}`;
    const next = {
        ...workflow,
        setting_key: key,
        updated_at: jakartaTimestamp()
    };
    await upsertSheetRow('settings', key, {
        setting_id: key,
        key,
        value: JSON.stringify(next),
        description: 'Workflow penerimaan bahan baku SIPAGI',
        updated_at: jakartaTimestamp(),
        updated_by: USER_ID
    }, 'key', USER_ID);
    return next;
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

        const locationBreakdown = itemBatches.reduce((rows, batch) => {
            const location = normalizeLocation(batch.location, item.category);
            const existing = rows.find((row) => row.location === location);
            const qty = numberValue(batch.qty_current);
            if (existing) {
                existing.qty += qty;
                existing.batchCount += 1;
            } else {
                rows.push({ location, qty, batchCount: 1 });
            }
            return rows;
        }, []);
        const displayLocation = normalizeLocation(primaryBatch.location, item.category);

        return {
            id: item.item_id,
            item_id: item.item_id,
            sku: item.sku || item.item_id,
            name: prettyLabel(item.name),
            category: prettyLabel(item.category),
            unit: item.unit || '-',
            currentStock,
            minStock: numberValue(item.min_stock),
            unitCost: numberValue(item.unit_cost),
            expiryTracking: item.expiry_tracking || 'yes',
            status: item.status || 'active',
            usageMethod: item.usage_method || item.metode_pakai || 'FEFO',
            storageRule: item.storage_rule || item.aturan_simpan || defaultStorageRule(item.category),
            brandType: prettyLabel(item.brand_type || item.merek_tipe || ''),
            description: item.description || '',
            barcodeCode: item.barcode_code || '',
            createdBy: item.created_by || item.created_by_user || USER_ID,
            createdAt: item.created_at || '',
            submittedAt: item.submitted_at || '',
            approvedBy: item.approved_by || '',
            approvedAt: item.approved_at || '',
            reviewNote: item.review_note || '',
            qcNotes: item.qc_notes || '',
            safetyNotes: item.safety_notes || '',
            notes: item.notes || '',
            batchCode: primaryBatch.batch_code || '-',
            inventoryDate: primaryBatch.inventory_date || primaryBatch.received_date || '',
            expiryDate: primaryBatch.expiry_date || '',
            location: displayLocation,
            locationBreakdown,
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
    const [items, batches, movements, opnames, wasteRecords, settings] = await Promise.all([
        safeSheetRows('items'),
        safeSheetRows('stock_batches'),
        safeSheetRows('stock_movements'),
        safeSheetRows('stock_opnames'),
        safeSheetRows('waste_records'),
        safeSheetRows('settings')
    ]);
    const shouldUseNakalaFallback = isNakalaSession() && !(items.rows || []).length;
    const fallback = shouldUseNakalaFallback ? fallbackInventorySheets() : null;
    const itemRows = fallback?.items || items.rows || [];
    const batchRows = fallback?.stock_batches || batches.rows || [];
    const movementRows = fallback?.stock_movements || movements.rows || [];
    const opnameRows = fallback?.stock_opnames || opnames.rows || [];
    const wasteRows = fallback?.waste_records || wasteRecords.rows || [];
    const settingRows = fallback?.settings || settings.rows || [];
    const builtItems = buildInventoryItems({
        items: itemRows,
        batches: batchRows
    });

    return {
        items: builtItems,
        rawItems: activeRows(itemRows),
        batches: activeRows(batchRows),
        movements: movementRows,
        opnameRecords: opnameRows,
        wasteRecords: wasteRows,
        receivingWorkflows: parseReceivingWorkflows(settingRows)
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
    const sequence = activeRows(existingItems).length + 1;
    const sku = payload.sku || payload.material_code || createMaterialCode({
        name: payload.name,
        sequence
    });
    const status = payload.status || 'draft';

    const itemResult = await createSheetRow('items', {
        sku,
        material_code: sku,
        barcode_code: payload.barcode_code || '',
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        usage_method: payload.usage_method || payload.metode_pakai || '',
        storage_rule: getStorageRulePreset(payload.storage_rule || payload.aturan_simpan),
        brand_type: payload.brand_type || payload.merek_tipe || '',
        description: payload.description || '',
        qc_notes: payload.qc_notes || '',
        safety_notes: payload.safety_notes || '',
        notes: payload.notes || '',
        min_stock: payload.min_stock,
        unit_cost: payload.unit_cost || 0,
        expiry_tracking: payload.expiry_tracking || 'yes',
        status,
        approval_status: status,
        created_by: payload.created_by || USER_ID,
        created_at: jakartaTimestamp(),
        updated_at: jakartaTimestamp()
    }, USER_ID);

    const item = itemResult.row;
    const initialQty = numberValue(payload.initial_qty);

    if (status === 'aktif' || status === 'active') {
        await activateInventoryItem(item.item_id, { decision_note: 'Aktif saat pembuatan data' });
    }

    if (initialQty > 0 && (status === 'aktif' || status === 'active')) {
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
            created_at: jakartaTimestamp()
        }, USER_ID);
    }

    return item;
}

export async function updateInventoryItemStatus(itemId, status, payload = {}) {
    const statusMap = {
        draft: 'draft',
        submit: 'menunggu approval',
        pending: 'menunggu approval',
        revision: 'revisi',
        rejected: 'ditolak',
        approved: 'aktif',
        active: 'aktif'
    };
    const nextStatus = statusMap[status] || status;
    const row = {
        status: nextStatus,
        approval_status: nextStatus,
        review_note: payload.decision_note || payload.review_note || '',
        updated_at: jakartaTimestamp()
    };
    if (nextStatus === 'menunggu approval') row.submitted_at = jakartaTimestamp();
    if (nextStatus === 'aktif') {
        row.approved_by = payload.approved_by || 'kepala_sppg';
        row.approved_at = jakartaTimestamp();
    }
    return updateSheetRow('items', itemId, row, 'item_id', USER_ID);
}

export async function updateInventoryItem(itemId, payload = {}) {
    const row = {
        sku: payload.sku || payload.material_code,
        material_code: payload.sku || payload.material_code,
        barcode_code: payload.barcode_code || '',
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        usage_method: payload.usage_method || '',
        storage_rule: getStorageRulePreset(payload.storage_rule),
        brand_type: payload.brand_type || '',
        description: payload.description || '',
        qc_notes: payload.qc_notes || '',
        safety_notes: payload.safety_notes || '',
        notes: payload.notes || '',
        min_stock: payload.min_stock,
        unit_cost: payload.unit_cost || 0,
        expiry_tracking: payload.expiry_tracking || 'yes',
        updated_at: jakartaTimestamp()
    };
    return updateSheetRow('items', itemId, row, 'item_id', USER_ID);
}

export function submitInventoryItem(itemId) {
    return updateInventoryItemStatus(itemId, 'submit');
}

export function activateInventoryItem(itemId, payload = {}) {
    return updateInventoryItemStatus(itemId, 'approved', payload);
}

export function rejectInventoryItem(itemId, payload = {}) {
    return updateInventoryItemStatus(itemId, 'rejected', payload);
}

export function requestInventoryItemRevision(itemId, payload = {}) {
    return updateInventoryItemStatus(itemId, 'revision', payload);
}

export async function saveReceivingDraft(payload, state, submit = false) {
    const existing = state.receivingWorkflows?.find((row) => row.receiving_id === payload.receiving_id);
    const receivingId = payload.receiving_id || `RCV-${Date.now()}`;
    const items = parseJson(payload.items_json, [])
        .map((item, index) => normalizeReceivingItem({ ...item, receiving_id: receivingId }, index, state));
    if (!items.length) throw new Error('Minimal satu item penerimaan wajib diisi');
    const workflow = {
        ...existing,
        receiving_id: receivingId,
        receipt_number: payload.receipt_number || receivingId,
        received_at: payload.received_at || jakartaTimestamp(),
        supplier: payload.supplier || '',
        po_rab_number: payload.po_rab_number || '',
        warehouse_location: payload.warehouse_location || '',
        delivered_by: payload.delivered_by || '',
        received_by: payload.received_by || USER_ID,
        notes: payload.notes || '',
        items,
        status: submit ? 'menunggu approval' : 'draft',
        approval_status: submit ? 'menunggu approval' : 'draft',
        created_by: existing?.created_by || USER_ID,
        created_at: existing?.created_at || jakartaTimestamp(),
        submitted_at: submit ? jakartaTimestamp() : existing?.submitted_at || ''
    };
    return saveReceivingWorkflow(workflow);
}

export async function reviewReceivingWorkflow(receivingId, decision, payload = {}, state) {
    const workflow = state.receivingWorkflows?.find((row) => row.receiving_id === receivingId);
    if (!workflow) throw new Error('Dokumen penerimaan tidak ditemukan');
    const statusMap = {
        approved: 'approved',
        rejected: 'rejected',
        revision: 'revision'
    };
    const nextStatus = statusMap[decision] || decision;
    const next = {
        ...workflow,
        status: nextStatus,
        approval_status: nextStatus,
        review_note: payload.review_note || '',
        reviewed_by: payload.reviewed_by || 'kepala_sppg',
        reviewed_at: jakartaTimestamp()
    };

    if (nextStatus === 'approved') {
        for (const item of next.items || []) {
            if (!item.item_id || numberValue(item.accepted_qty) <= 0) continue;
            const master = state.items.find((row) => row.item_id === item.item_id) || {};
            const batchResult = await createSheetRow('stock_batches', {
                sku: master.sku || item.sku,
                item_id: item.item_id,
                vendor_id: next.supplier,
                batch_code: `${master.sku || item.sku || item.item_id}-${next.receiving_id}`,
                qty_initial: item.accepted_qty,
                qty_current: item.accepted_qty,
                unit: item.unit || master.unit,
                inventory_date: todayDate(),
                received_date: next.received_at,
                expiry_date: item.expiry_date || '',
                location: next.warehouse_location,
                status: 'released',
                source_receiving_id: next.receiving_id,
                qc_result: item.qc_result,
                photo_svg: item.photo_svg || ''
            }, USER_ID);
            await createSheetRow('stock_movements', {
                sku: master.sku || item.sku,
                item_id: item.item_id,
                batch_id: batchResult.row.batch_id,
                type: 'stok-masuk',
                qty: item.accepted_qty,
                unit: item.unit || master.unit,
                movement_date: todayDate(),
                reason: `Penerimaan approved ${next.receiving_id}`,
                reference_type: 'inventory_receiving',
                reference_id: next.receiving_id,
                created_by: USER_ID,
                created_at: jakartaTimestamp()
            }, USER_ID);
        }
    }

    return saveReceivingWorkflow(next);
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
