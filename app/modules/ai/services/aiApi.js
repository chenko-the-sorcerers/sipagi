import { createSheetRow, getSheetRows } from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'ai_assistant';

function todayIso() {
    return new Date().toISOString();
}

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildMockResult(payload, context) {
    const useCase = payload.use_case;
    if (useCase === 'cek-gizi') {
        const avg = context.nutritionChecks.length
            ? context.nutritionChecks.reduce((sum, row) => sum + numberValue(row.score), 0) / context.nutritionChecks.length
            : 0;
        return { ringkasan: `Rata-rata skor gizi ${Math.round(avg)}. Prioritaskan menu protein dan serat.`, prioritas: 'tinggi' };
    }
    if (useCase === 'forecast-bahan') {
        return { ringkasan: `Analisis ${context.items.length} item inventori. Prioritaskan bahan cepat habis dan batch dekat expired.`, prioritas: 'sedang' };
    }
    if (useCase === 'fraud-waste') {
        return { ringkasan: `Terdapat ${context.wasteRecords.length} catatan waste untuk dipantau. Cek pola berulang per SKU.`, prioritas: 'tinggi' };
    }
    return { ringkasan: 'AI membuat ringkasan operasional awal dari data spreadsheet.', prioritas: 'normal' };
}

export async function getAiState() {
    const [runs, recommendations, anomalyFlags, items, nutritionChecks, wasteRecords, dispatchOrders] = await Promise.all([
        getSheetRows('ai_runs'),
        getSheetRows('ai_recommendations'),
        getSheetRows('anomaly_flags'),
        getSheetRows('items'),
        getSheetRows('nutrition_checks'),
        getSheetRows('waste_records'),
        getSheetRows('dispatch_orders')
    ]);

    return {
        runs: runs.rows || [],
        recommendations: recommendations.rows || [],
        anomalyFlags: anomalyFlags.rows || [],
        items: items.rows || [],
        nutritionChecks: nutritionChecks.rows || [],
        wasteRecords: wasteRecords.rows || [],
        dispatchOrders: dispatchOrders.rows || []
    };
}

export function getAiSummaryFromState(state) {
    return {
        runs: state.runs.length,
        recommendations: state.recommendations.length,
        highPriority: state.recommendations.filter((row) => row.priority === 'tinggi').length,
        openFlags: state.anomalyFlags.filter((row) => row.status !== 'selesai').length
    };
}

export async function createAiRun(payload, state) {
    const result = buildMockResult(payload, state);
    const run = await createSheetRow('ai_runs', {
        use_case: payload.use_case,
        input_ref_type: payload.input_ref_type || 'manual',
        input_ref_id: payload.input_ref_id || '',
        model_name: payload.model_name || 'sipagi-rule-ai',
        status: 'selesai',
        result_json: JSON.stringify(result),
        created_by: payload.created_by || USER_ID,
        created_at: todayIso()
    }, USER_ID);

    await createSheetRow('ai_recommendations', {
        ai_run_id: run.row.ai_run_id,
        module: payload.module || 'operational',
        priority: result.prioritas,
        title: payload.title || `Rekomendasi ${payload.use_case}`,
        recommendation: result.ringkasan,
        status: 'baru',
        created_at: todayIso()
    }, USER_ID);

    return run;
}

export async function createAiRecommendation(payload) {
    return createSheetRow('ai_recommendations', {
        ai_run_id: payload.ai_run_id || '',
        module: payload.module,
        priority: payload.priority,
        title: payload.title,
        recommendation: payload.recommendation,
        status: payload.status || 'baru',
        created_at: todayIso()
    }, USER_ID);
}

export async function createAnomalyFlag(payload) {
    return createSheetRow('anomaly_flags', {
        module: payload.module,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        severity: payload.severity,
        reason: payload.reason,
        status: payload.status || 'open',
        created_at: todayIso()
    }, USER_ID);
}
