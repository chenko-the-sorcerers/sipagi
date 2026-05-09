import {
    addRecipeComponent,
    createNutritionCheck,
    createRecipe,
    getOperationalState
} from '../../operational/services/operationalApi.js';

export async function getNutritionistState() {
    return getOperationalState();
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
