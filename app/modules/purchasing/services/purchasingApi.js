import {
    createSheetRow,
    getSheetRows,
    updateSheetRow
} from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'pengadaan';

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function todayIso() {
    return new Date().toISOString();
}

function activeRows(rows) {
    return rows.filter((row) => row.status !== 'deleted');
}

function findById(rows, idField, id) {
    return rows.find((row) => row[idField] === id);
}

export async function getPurchasingState() {
    const [
        vendors,
        items,
        purchaseRequests,
        purchaseOrders,
        purchaseOrderItems,
        receivingRecords,
        supplierInvoices
    ] = await Promise.all([
        getSheetRows('vendors'),
        getSheetRows('items'),
        getSheetRows('purchase_requests'),
        getSheetRows('purchase_orders'),
        getSheetRows('purchase_order_items'),
        getSheetRows('receiving_records'),
        getSheetRows('supplier_invoices')
    ]);

    return {
        vendors: activeRows(vendors.rows || []),
        items: activeRows(items.rows || []),
        purchaseRequests: purchaseRequests.rows || [],
        purchaseOrders: purchaseOrders.rows || [],
        purchaseOrderItems: purchaseOrderItems.rows || [],
        receivingRecords: receivingRecords.rows || [],
        supplierInvoices: supplierInvoices.rows || []
    };
}

export function getPurchasingSummaryFromState(state) {
    const openOrders = state.purchaseOrders.filter((row) => {
        return !['diterima', 'selesai', 'dibatalkan'].includes(String(row.status || '').toLowerCase());
    }).length;
    const receivedOrders = new Set(state.receivingRecords.map((row) => row.po_id).filter(Boolean)).size;
    const invoiceTotal = state.supplierInvoices.reduce((sum, row) => sum + numberValue(row.amount), 0);
    const pendingInvoices = state.supplierInvoices.filter((row) => row.payment_status !== 'lunas').length;

    return {
        vendors: state.vendors.length,
        openOrders,
        receivedOrders,
        invoiceTotal,
        pendingInvoices
    };
}

export async function createVendor(payload) {
    return createSheetRow('vendors', {
        name: payload.name,
        category: payload.category,
        contact_name: payload.contact_name,
        phone: payload.phone,
        address: payload.address,
        rating: payload.rating || 'baru',
        payment_term: payload.payment_term || 'tempo 7 hari',
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function createPurchaseRequest(payload) {
    return createSheetRow('purchase_requests', {
        sppg_id: payload.sppg_id || 'sppg-utama',
        request_date: payload.request_date || todayDate(),
        needed_date: payload.needed_date,
        status: 'menunggu',
        requested_by: USER_ID,
        approved_by: ''
    }, USER_ID);
}

export async function createPurchaseOrder(payload, state) {
    const item = findById(state.items, 'item_id', payload.item_id);
    const qty = numberValue(payload.qty);
    const unitPrice = numberValue(payload.unit_price);
    const subtotal = qty * unitPrice;
    if (!payload.vendor_id) throw new Error('Vendor wajib dipilih');
    if (!item) throw new Error('Item bahan wajib dipilih');
    if (qty <= 0) throw new Error('Qty PO harus lebih dari nol');

    const poResult = await createSheetRow('purchase_orders', {
        vendor_id: payload.vendor_id,
        po_date: payload.po_date || todayDate(),
        delivery_date: payload.delivery_date,
        status: 'dipesan',
        subtotal,
        tax: payload.tax || 0,
        total: subtotal + numberValue(payload.tax),
        approval_status: payload.approval_status || 'disetujui',
        created_by: USER_ID
    }, USER_ID);

    await createSheetRow('purchase_order_items', {
        po_id: poResult.row.po_id,
        item_id: payload.item_id,
        qty,
        unit: payload.unit || item.unit,
        unit_price: unitPrice,
        total_price: subtotal
    }, USER_ID);

    return poResult;
}

export async function recordReceiving(payload, state) {
    const item = findById(state.items, 'item_id', payload.item_id);
    const purchaseOrder = findById(state.purchaseOrders, 'po_id', payload.po_id);
    const receivedQty = numberValue(payload.received_qty);
    const rejectedQty = numberValue(payload.rejected_qty);
    if (!purchaseOrder) throw new Error('PO tidak ditemukan');
    if (!item) throw new Error('Item bahan tidak ditemukan');
    if (receivedQty <= 0) throw new Error('Jumlah diterima harus lebih dari nol');

    const receivedAt = payload.received_at || todayIso();
    const receivingResult = await createSheetRow('receiving_records', {
        po_id: payload.po_id,
        item_id: payload.item_id,
        received_qty: receivedQty,
        rejected_qty: rejectedQty,
        qc_status: payload.qc_status || 'lulus',
        temperature: payload.temperature,
        photo_url: payload.photo_url || '',
        received_by: payload.received_by || USER_ID,
        received_at: receivedAt
    }, USER_ID);

    const batchResult = await createSheetRow('stock_batches', {
        sku: item.sku || item.item_id,
        item_id: item.item_id,
        vendor_id: purchaseOrder.vendor_id,
        batch_code: payload.batch_code || `${item.sku || item.item_id}-${Date.now()}`,
        qty_initial: receivedQty,
        qty_current: receivedQty,
        unit: item.unit,
        inventory_date: receivedAt.slice(0, 10),
        received_date: receivedAt.slice(0, 10),
        expiry_date: payload.expiry_date,
        location: payload.location || 'Gudang Utama',
        status: payload.qc_status === 'ditolak' ? 'karantina' : 'released'
    }, USER_ID);

    await createSheetRow('stock_movements', {
        sku: item.sku || item.item_id,
        item_id: item.item_id,
        batch_id: batchResult.row.batch_id,
        type: 'stok-masuk',
        qty: receivedQty,
        unit: item.unit,
        movement_date: receivedAt.slice(0, 10),
        reason: `Penerimaan PO ${payload.po_id}`,
        reference_type: 'receiving_records',
        reference_id: receivingResult.row.receiving_id,
        created_by: USER_ID,
        created_at: todayIso()
    }, USER_ID);

    await updateSheetRow('purchase_orders', payload.po_id, {
        status: rejectedQty > 0 ? 'diterima-sebagian' : 'diterima'
    }, 'po_id', USER_ID);

    return receivingResult;
}

export async function createSupplierInvoice(payload) {
    if (!payload.vendor_id) throw new Error('Vendor wajib dipilih');
    if (!payload.po_id) throw new Error('PO wajib dipilih');
    return createSheetRow('supplier_invoices', {
        vendor_id: payload.vendor_id,
        po_id: payload.po_id,
        invoice_number: payload.invoice_number,
        invoice_date: payload.invoice_date || todayDate(),
        amount: numberValue(payload.amount),
        payment_status: payload.payment_status || 'belum-lunas',
        file_url: payload.file_url || ''
    }, USER_ID);
}
