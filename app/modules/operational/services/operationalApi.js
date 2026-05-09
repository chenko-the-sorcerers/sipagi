import {
    createSheetRow,
    getSheetRows
} from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'ahli_gizi';

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

function nutritionScore(payload) {
    const protein = numberValue(payload.protein_g);
    const carb = numberValue(payload.carb_g);
    const fat = numberValue(payload.fat_g);
    const fiber = numberValue(payload.fiber_g);
    let score = 70;
    if (protein >= 12) score += 10;
    if (carb >= 35 && carb <= 85) score += 8;
    if (fat >= 8 && fat <= 28) score += 7;
    if (fiber >= 4) score += 5;
    return Math.min(score, 100);
}

function nutritionWarnings(payload) {
    const warnings = [];
    if (numberValue(payload.protein_g) < 12) warnings.push('Protein kurang dari target minimum');
    if (numberValue(payload.fiber_g) < 4) warnings.push('Serat perlu ditingkatkan');
    if (numberValue(payload.fat_g) > 28) warnings.push('Lemak melewati batas aman');
    return warnings;
}

export async function getOperationalState() {
    const [
        recipes,
        recipeComponents,
        nutritionChecks,
        productionBatches,
        portionBatches,
        packingBatches,
        dispatchOrders,
        cleaningChecklists,
        items,
        schools
    ] = await Promise.all([
        getSheetRows('recipes'),
        getSheetRows('recipe_components'),
        getSheetRows('nutrition_checks'),
        getSheetRows('production_batches'),
        getSheetRows('portion_batches'),
        getSheetRows('packing_batches'),
        getSheetRows('dispatch_orders'),
        getSheetRows('cleaning_checklists'),
        getSheetRows('items'),
        getSheetRows('schools')
    ]);

    return {
        recipes: activeRows(recipes.rows || []),
        recipeComponents: recipeComponents.rows || [],
        nutritionChecks: nutritionChecks.rows || [],
        productionBatches: productionBatches.rows || [],
        portionBatches: portionBatches.rows || [],
        packingBatches: packingBatches.rows || [],
        dispatchOrders: dispatchOrders.rows || [],
        cleaningChecklists: cleaningChecklists.rows || [],
        items: activeRows(items.rows || []),
        schools: activeRows(schools.rows || [])
    };
}

export function getOperationalSummaryFromState(state) {
    const today = new Date().toISOString().slice(0, 10);
    const productionToday = state.productionBatches.filter((row) => String(row.start_time || '').startsWith(today)).length;
    const packedToday = state.packingBatches
        .filter((row) => String(row.created_at || '').startsWith(today))
        .reduce((sum, row) => sum + numberValue(row.pack_count), 0);
    const dispatchOpen = state.dispatchOrders.filter((row) => row.status !== 'terkirim').length;
    const cleaningDone = state.cleaningChecklists.filter((row) => String(row.checked_at || '').startsWith(today)).length;

    return {
        recipes: state.recipes.length,
        productionToday,
        packedToday,
        dispatchOpen,
        cleaningDone
    };
}

export async function createRecipe(payload) {
    return createSheetRow('recipes', {
        name: payload.name,
        portion_size: payload.portion_size,
        target_age_group: payload.target_age_group,
        nutrition_target_json: JSON.stringify({
            energi: payload.energy_target,
            protein: payload.protein_target,
            catatan: payload.notes || ''
        }),
        status: payload.status || 'aktif',
        created_by: USER_ID
    }, USER_ID);
}

export async function addRecipeComponent(payload, state) {
    const recipe = findById(state.recipes, 'recipe_id', payload.recipe_id);
    const item = findById(state.items, 'item_id', payload.item_id);
    if (!recipe) throw new Error('Resep wajib dipilih');
    if (!item) throw new Error('Item bahan wajib dipilih');
    return createSheetRow('recipe_components', {
        recipe_id: payload.recipe_id,
        item_id: payload.item_id,
        qty_per_portion: numberValue(payload.qty_per_portion),
        unit: payload.unit || item.unit,
        notes: payload.notes || ''
    }, USER_ID);
}

export async function createNutritionCheck(payload, state) {
    const recipe = findById(state.recipes, 'recipe_id', payload.recipe_id);
    if (!recipe) throw new Error('Resep wajib dipilih');
    const warnings = nutritionWarnings(payload);
    return createSheetRow('nutrition_checks', {
        recipe_id: payload.recipe_id,
        score: payload.score || nutritionScore(payload),
        protein_g: numberValue(payload.protein_g),
        carb_g: numberValue(payload.carb_g),
        fat_g: numberValue(payload.fat_g),
        fiber_g: numberValue(payload.fiber_g),
        warning_json: JSON.stringify(warnings),
        checked_by: USER_ID,
        checked_at: todayIso()
    }, USER_ID);
}

export async function createProductionBatch(payload, state) {
    const recipe = findById(state.recipes, 'recipe_id', payload.recipe_id);
    if (!recipe) throw new Error('Resep wajib dipilih');
    return createSheetRow('production_batches', {
        recipe_id: payload.recipe_id,
        target_portion: numberValue(payload.target_portion),
        actual_portion: numberValue(payload.actual_portion),
        start_time: payload.start_time || todayIso(),
        end_time: payload.end_time || '',
        temperature: payload.temperature,
        qc_status: payload.qc_status || 'menunggu',
        created_by: USER_ID
    }, USER_ID);
}

export async function createPortionAndPacking(payload, state) {
    const productionBatch = findById(state.productionBatches, 'batch_id', payload.production_batch_id);
    if (!productionBatch) throw new Error('Batch produksi wajib dipilih');
    const targetPortion = numberValue(payload.target_portion);
    const actualPortion = numberValue(payload.actual_portion);

    const portionResult = await createSheetRow('portion_batches', {
        production_batch_id: payload.production_batch_id,
        target_portion: targetPortion,
        actual_portion: actualPortion,
        variance: actualPortion - targetPortion,
        created_by: USER_ID,
        created_at: todayIso()
    }, USER_ID);

    await createSheetRow('packing_batches', {
        portion_id: portionResult.row.portion_id,
        school_id: payload.school_id || '',
        pack_count: numberValue(payload.pack_count || actualPortion),
        label_code: payload.label_code || `PK-${Date.now()}`,
        status: payload.status || 'siap-kirim',
        created_at: todayIso()
    }, USER_ID);

    return portionResult;
}

export async function createDispatchOrder(payload, state) {
    const packing = findById(state.packingBatches, 'packing_id', payload.packing_id);
    if (!packing) throw new Error('Batch packing wajib dipilih');
    return createSheetRow('dispatch_orders', {
        school_id: payload.school_id || packing.school_id,
        packing_id: payload.packing_id,
        driver_user_id: payload.driver_user_id || 'driver-utama',
        route_code: payload.route_code,
        portion_qty: numberValue(payload.portion_qty || packing.pack_count),
        status: payload.status || 'siap-kirim',
        eta: payload.eta,
        delivered_at: ''
    }, USER_ID);
}

export async function createCleaningChecklist(payload) {
    return createSheetRow('cleaning_checklists', {
        area: payload.area,
        shift: payload.shift,
        checklist_json: JSON.stringify({
            meja: payload.meja === 'on',
            lantai: payload.lantai === 'on',
            alat: payload.alat === 'on',
            sampah: payload.sampah === 'on'
        }),
        status: payload.status || 'selesai',
        photo_url: payload.photo_url || '',
        checked_by: payload.checked_by || USER_ID,
        checked_at: todayIso()
    }, USER_ID);
}
