import { createSheetRow, getSheetRows, updateSheetRow } from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'sekolah';

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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

export async function getSchoolState() {
    const [schools, beneficiaries, dispatchOrders, receipts, feedback, incidents] = await Promise.all([
        getSheetRows('schools'),
        getSheetRows('beneficiaries'),
        getSheetRows('dispatch_orders'),
        getSheetRows('delivery_receipts'),
        getSheetRows('school_feedback'),
        getSheetRows('incidents')
    ]);

    return {
        schools: activeRows(schools.rows || []),
        beneficiaries: activeRows(beneficiaries.rows || []),
        dispatchOrders: dispatchOrders.rows || [],
        receipts: receipts.rows || [],
        feedback: feedback.rows || [],
        incidents: incidents.rows || []
    };
}

export function getSchoolSummaryFromState(state) {
    return {
        schools: state.schools.length,
        totalStudents: state.schools.reduce((sum, row) => sum + numberValue(row.beneficiary_count), 0),
        openDispatch: state.dispatchOrders.filter((row) => row.status !== 'terkirim').length,
        confirmedReceipts: state.receipts.length,
        openIncidents: state.incidents.filter((row) => row.status !== 'selesai').length
    };
}

export async function createSchool(payload) {
    if (!payload.name) throw new Error('Nama sekolah wajib diisi');
    return createSheetRow('schools', {
        sppg_id: payload.sppg_id || 'sppg-utama',
        name: payload.name,
        npsn: payload.npsn,
        address: payload.address,
        pic_name: payload.pic_name,
        pic_phone: payload.pic_phone,
        route_code: payload.route_code,
        beneficiary_count: numberValue(payload.beneficiary_count),
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function createBeneficiary(payload, state) {
    if (!findById(state.schools, 'school_id', payload.school_id)) throw new Error('Sekolah wajib dipilih');
    return createSheetRow('beneficiaries', {
        school_id: payload.school_id,
        name: payload.name,
        grade: payload.grade,
        class_name: payload.class_name,
        nutrition_status: payload.nutrition_status || 'normal',
        allergy_notes: payload.allergy_notes || '',
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function confirmDeliveryReceipt(payload, state) {
    const dispatch = findById(state.dispatchOrders, 'dispatch_id', payload.dispatch_id);
    if (!dispatch) throw new Error('Dispatch wajib dipilih');
    const receivedAt = payload.received_at || todayIso();

    const receipt = await createSheetRow('delivery_receipts', {
        dispatch_id: payload.dispatch_id,
        school_id: payload.school_id || dispatch.school_id,
        received_qty: numberValue(payload.received_qty || dispatch.portion_qty),
        received_by: payload.received_by,
        received_at: receivedAt,
        photo_url: payload.photo_url || '',
        feedback_status: payload.feedback_status || 'diterima',
        notes: payload.notes || ''
    }, USER_ID);

    await updateSheetRow('dispatch_orders', payload.dispatch_id, {
        status: 'terkirim',
        delivered_at: receivedAt
    }, 'dispatch_id', USER_ID);

    return receipt;
}

export async function createSchoolFeedback(payload, state) {
    if (!findById(state.schools, 'school_id', payload.school_id)) throw new Error('Sekolah wajib dipilih');
    return createSheetRow('school_feedback', {
        school_id: payload.school_id,
        dispatch_id: payload.dispatch_id || '',
        rating: numberValue(payload.rating),
        category: payload.category,
        message: payload.message,
        created_by: payload.created_by || USER_ID,
        created_at: todayIso(),
        status: payload.status || 'baru'
    }, USER_ID);
}

export async function createIncident(payload, state) {
    if (!findById(state.schools, 'school_id', payload.school_id)) throw new Error('Sekolah wajib dipilih');
    return createSheetRow('incidents', {
        school_id: payload.school_id,
        dispatch_id: payload.dispatch_id || '',
        type: payload.type,
        severity: payload.severity,
        description: payload.description,
        photo_url: payload.photo_url || '',
        status: payload.status || 'baru',
        created_at: todayIso()
    }, USER_ID);
}
