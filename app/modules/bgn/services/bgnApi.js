import { createSheetRow, getSheetRows } from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'bgn';

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

export async function getBgnState() {
    const [bgnReports, complianceChecks, regionalKpis, schools, dispatchOrders, incidents, wasteRecords] = await Promise.all([
        getSheetRows('bgn_reports'),
        getSheetRows('compliance_checks'),
        getSheetRows('regional_kpis'),
        getSheetRows('schools'),
        getSheetRows('dispatch_orders'),
        getSheetRows('incidents'),
        getSheetRows('waste_records')
    ]);

    return {
        bgnReports: bgnReports.rows || [],
        complianceChecks: complianceChecks.rows || [],
        regionalKpis: regionalKpis.rows || [],
        schools: schools.rows || [],
        dispatchOrders: dispatchOrders.rows || [],
        incidents: incidents.rows || [],
        wasteRecords: wasteRecords.rows || []
    };
}

export function getBgnSummaryFromState(state) {
    const portions = state.dispatchOrders.reduce((sum, row) => sum + numberValue(row.portion_qty), 0);
    const wasteValue = state.wasteRecords.reduce((sum, row) => sum + numberValue(row.cost_estimate), 0);
    const complianceAverage = state.complianceChecks.length
        ? state.complianceChecks.reduce((sum, row) => sum + numberValue(row.score), 0) / state.complianceChecks.length
        : 0;

    return {
        schools: state.schools.length,
        portions,
        complianceAverage,
        incidentCount: state.incidents.length,
        wasteValue
    };
}

export async function createBgnReport(payload) {
    return createSheetRow('bgn_reports', {
        period: payload.period,
        region: payload.region,
        coverage_school: numberValue(payload.coverage_school),
        coverage_portion: numberValue(payload.coverage_portion),
        compliance_score: numberValue(payload.compliance_score),
        incident_count: numberValue(payload.incident_count),
        file_url: payload.file_url || '',
        created_at: todayIso()
    }, USER_ID);
}

export async function createComplianceCheck(payload) {
    return createSheetRow('compliance_checks', {
        sppg_id: payload.sppg_id || 'sppg-utama',
        check_date: payload.check_date || todayDate(),
        category: payload.category,
        score: numberValue(payload.score),
        finding: payload.finding,
        status: payload.status || 'open',
        checked_by: payload.checked_by || USER_ID
    }, USER_ID);
}

export async function createRegionalKpi(payload) {
    return createSheetRow('regional_kpis', {
        period: payload.period,
        region: payload.region,
        schools_total: numberValue(payload.schools_total),
        portions_total: numberValue(payload.portions_total),
        ontime_rate: numberValue(payload.ontime_rate),
        qc_pass_rate: numberValue(payload.qc_pass_rate),
        waste_value: numberValue(payload.waste_value)
    }, USER_ID);
}
