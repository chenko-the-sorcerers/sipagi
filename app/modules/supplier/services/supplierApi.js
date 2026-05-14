import { createSheetRow, getSheetRows, updateSheetRow } from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'supplier';

function activeRows(rows) {
    return rows.filter((row) => row.status !== 'deleted');
}

function findById(rows, idField, id) {
    return rows.find((row) => row[idField] === id);
}

export async function getSupplierState() {
    const [vendors, users, purchaseOrders, poItems, schedules, receiving, invoices] = await Promise.all([
        getSheetRows('vendors'),
        getSheetRows('supplier_users'),
        getSheetRows('purchase_orders'),
        getSheetRows('purchase_order_items'),
        getSheetRows('supplier_delivery_schedules'),
        getSheetRows('receiving_records'),
        getSheetRows('supplier_invoices')
    ]);

    return {
        vendors: activeRows(vendors.rows || []),
        users: activeRows(users.rows || []),
        purchaseOrders: purchaseOrders.rows || [],
        poItems: poItems.rows || [],
        schedules: schedules.rows || [],
        receiving: receiving.rows || [],
        invoices: invoices.rows || []
    };
}

export function getSupplierSummaryFromState(state) {
    return {
        vendors: state.vendors.length,
        activePo: state.purchaseOrders.filter((row) => !['diterima', 'selesai', 'dibatalkan'].includes(row.status)).length,
        plannedSchedules: state.schedules.filter((row) => row.status !== 'terkirim').length,
        rejectedReceiving: state.receiving.filter((row) => Number(row.rejected_qty || 0) > 0).length,
        unpaidInvoices: state.invoices.filter((row) => row.payment_status !== 'lunas').length
    };
}

export async function createSupplierUser(payload, state) {
    if (!findById(state.vendors, 'vendor_id', payload.vendor_id)) throw new Error('Vendor wajib dipilih');
    return createSheetRow('supplier_users', {
        vendor_id: payload.vendor_id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function createDeliverySchedule(payload, state) {
    const purchaseOrder = findById(state.purchaseOrders, 'po_id', payload.po_id);
    if (!purchaseOrder) throw new Error('PO wajib dipilih');
    return createSheetRow('supplier_delivery_schedules', {
        vendor_id: payload.vendor_id || purchaseOrder.vendor_id,
        po_id: payload.po_id,
        planned_at: payload.planned_at,
        actual_at: payload.actual_at || '',
        status: payload.status || 'direncanakan',
        notes: payload.notes || ''
    }, USER_ID);
}

export async function updateDeliveryScheduleStatus(payload, state) {
    const schedule = findById(state.schedules, 'schedule_id', payload.schedule_id);
    if (!schedule) throw new Error('Jadwal kirim wajib dipilih');
    return updateSheetRow('supplier_delivery_schedules', payload.schedule_id, {
        actual_at: payload.actual_at,
        status: payload.status,
        notes: payload.notes || schedule.notes
    }, 'schedule_id', USER_ID);
}
