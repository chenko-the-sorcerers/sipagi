import { createSheetRow, getSheetRows, updateSheetRow } from '../../../shared/services/googleSheetsApi.js';

function nowIso() {
    return new Date().toISOString();
}

function rows(payload) {
    return Array.isArray(payload?.rows) ? payload.rows : [];
}

export async function getDistributionState() {
    const [dispatchOrders, deliveryReceipts, schools, incidents] = await Promise.all([
        getSheetRows('dispatch_orders').then(rows),
        getSheetRows('delivery_receipts').then(rows),
        getSheetRows('schools').then(rows),
        getSheetRows('incidents').then(rows)
    ]);

    return { dispatchOrders, deliveryReceipts, schools, incidents };
}

export function getDistributionSummary(state = {}) {
    const dispatches = state.dispatchOrders || [];
    const receipts = state.deliveryReceipts || [];
    const incidents = state.incidents || [];
    return {
        total: dispatches.length,
        berjalan: dispatches.filter((row) => ['berjalan', 'dikirim', 'on_route'].includes(String(row.status || '').toLowerCase())).length,
        terkirim: dispatches.filter((row) => ['terkirim', 'delivered', 'selesai'].includes(String(row.status || '').toLowerCase())).length + receipts.length,
        terlambat: dispatches.filter((row) => ['terlambat', 'late'].includes(String(row.status || '').toLowerCase())).length,
        insiden: incidents.length,
        sekolah: state.schools?.length || 0
    };
}

export async function createDispatchOrder(payload = {}) {
    const id = `dispatch_${Date.now()}`;
    return createSheetRow('dispatch_orders', {
        dispatch_id: id,
        school_id: payload.school_id || '',
        packing_id: payload.packing_id || '',
        driver_user_id: payload.driver_user_id || payload.driver_name || '',
        route_code: payload.route_code || `RUTE-${String(Date.now()).slice(-4)}`,
        portion_qty: payload.portion_qty || 0,
        status: payload.status || 'berjalan',
        eta: payload.eta || '',
        delivered_at: payload.delivered_at || ''
    }, 'kepala_sppg');
}

export async function updateDispatchStatus(dispatchId, status) {
    return updateSheetRow('dispatch_orders', dispatchId, {
        status,
        delivered_at: status === 'terkirim' ? nowIso() : ''
    }, 'dispatch_id', 'kepala_sppg');
}
