import { createSheetRow, getSheetRows } from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'kepala_sppg';

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

export async function getReportsState() {
    const [dailyReports, monthlyReports, exports, dispatchOrders, productionBatches, wasteRecords, incidents, nutritionChecks] = await Promise.all([
        getSheetRows('daily_reports'),
        getSheetRows('monthly_reports'),
        getSheetRows('exports'),
        getSheetRows('dispatch_orders'),
        getSheetRows('production_batches'),
        getSheetRows('waste_records'),
        getSheetRows('incidents'),
        getSheetRows('nutrition_checks')
    ]);

    return {
        dailyReports: dailyReports.rows || [],
        monthlyReports: monthlyReports.rows || [],
        exports: exports.rows || [],
        dispatchOrders: dispatchOrders.rows || [],
        productionBatches: productionBatches.rows || [],
        wasteRecords: wasteRecords.rows || [],
        incidents: incidents.rows || [],
        nutritionChecks: nutritionChecks.rows || []
    };
}

export function getReportsSummaryFromState(state) {
    const delivered = state.dispatchOrders
        .filter((row) => row.status === 'terkirim')
        .reduce((sum, row) => sum + numberValue(row.portion_qty), 0);
    const target = state.productionBatches.reduce((sum, row) => sum + numberValue(row.target_portion), 0);
    const wasteValue = state.wasteRecords.reduce((sum, row) => sum + numberValue(row.cost_estimate), 0);
    const avgNutritionScore = state.nutritionChecks.length
        ? state.nutritionChecks.reduce((sum, row) => sum + numberValue(row.score), 0) / state.nutritionChecks.length
        : 0;

    return {
        dailyReports: state.dailyReports.length,
        monthlyReports: state.monthlyReports.length,
        delivered,
        target,
        wasteValue,
        incidentCount: state.incidents.length,
        avgNutritionScore
    };
}

export async function createDailyReport(payload) {
    return createSheetRow('daily_reports', {
        sppg_id: payload.sppg_id || 'sppg-utama',
        report_date: payload.report_date || todayDate(),
        target_portion: numberValue(payload.target_portion),
        delivered_portion: numberValue(payload.delivered_portion),
        qc_summary: payload.qc_summary,
        waste_summary: payload.waste_summary,
        issue_summary: payload.issue_summary,
        status: payload.status || 'draft',
        created_at: todayIso()
    }, USER_ID);
}

export async function createMonthlyReport(payload, state) {
    const summary = {
        periode: payload.period,
        porsi_terkirim: state.dispatchOrders.reduce((sum, row) => sum + numberValue(row.portion_qty), 0),
        nilai_waste: state.wasteRecords.reduce((sum, row) => sum + numberValue(row.cost_estimate), 0),
        jumlah_insiden: state.incidents.length,
        catatan: payload.notes || ''
    };

    return createSheetRow('monthly_reports', {
        sppg_id: payload.sppg_id || 'sppg-utama',
        period: payload.period,
        summary_json: JSON.stringify(summary),
        file_url: payload.file_url || '',
        status: payload.status || 'draft',
        created_at: todayIso()
    }, USER_ID);
}

export async function createExportRequest(payload) {
    return createSheetRow('exports', {
        report_type: payload.report_type,
        format: payload.format,
        file_url: payload.file_url || '',
        requested_by: payload.requested_by || USER_ID,
        created_at: todayIso(),
        status: payload.status || 'diminta'
    }, USER_ID);
}
