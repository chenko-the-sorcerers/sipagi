import {
    addRecipeComponent,
    createNutritionCheck,
    createRecipe,
    getOperationalState
} from '../../operational/services/operationalApi.js';
import { getSheetRows } from '../../../shared/services/googleSheetsApi.js';

export async function getNutritionistState() {
    const [operationalState, stockBatches, receivingRecords, vendors, purchaseOrders] = await Promise.all([
        getOperationalState(),
        getSheetRows('stock_batches').catch(() => ({ rows: [] })),
        getSheetRows('receiving_records').catch(() => ({ rows: [] })),
        getSheetRows('vendors').catch(() => ({ rows: [] })),
        getSheetRows('purchase_orders').catch(() => ({ rows: [] }))
    ]);
    const activeBatches = (stockBatches.rows || []).filter((row) => row.status !== 'deleted');
    const stockByItem = activeBatches.reduce((acc, batch) => {
        const itemId = batch.item_id;
        if (!itemId) return acc;
        acc[itemId] = (acc[itemId] || 0) + Number(batch.qty_current || 0);
        return acc;
    }, {});

    return {
        ...operationalState,
        stockBatches: activeBatches,
        items: operationalState.items.map((item) => ({
            ...item,
            currentStock: stockByItem[item.item_id] || Number(item.current_stock || item.currentStock || 0),
            minStock: Number(item.min_stock || item.minStock || 0),
            unitCost: Number(item.unit_cost || item.unitCost || 0)
        })),
        receivingRecords: (receivingRecords.rows || []).filter((row) => row.status !== 'deleted'),
        vendors: (vendors.rows || []).filter((row) => row.status !== 'deleted'),
        purchaseOrders: (purchaseOrders.rows || []).filter((row) => row.status !== 'deleted')
    };
}

export function getNutritionistSummaryFromState(state) {
    const avgScore = state.nutritionChecks.length
        ? state.nutritionChecks.reduce((sum, row) => sum + Number(row.score || 0), 0) / state.nutritionChecks.length
        : 0;
    const lowScore = state.nutritionChecks.filter((row) => Number(row.score || 0) < 80).length;
    return {
        recipes: state.recipes.length,
        components: state.recipeComponents.length,
        checks: state.nutritionChecks.length,
        avgScore,
        lowScore
    };
}

export { addRecipeComponent, createNutritionCheck, createRecipe };
