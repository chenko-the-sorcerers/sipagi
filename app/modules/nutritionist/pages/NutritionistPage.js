import { DataTable, ErrorCard, escapeHtml as esc, formatNumber, LoadingCard, optionRows, serializeForm, StatGrid, ViewTabs } from '../../../shared/components/ModuleComponents.js';
import {
    addRecipeComponent,
    createNutritionCheck,
    createRecipe,
    getNutritionistState,
    getNutritionistSummaryFromState
} from '../services/nutritionistApi.js';

const pageState = { activeView: 'nutrition', loading: true, error: '', state: { recipes: [], recipeComponents: [], nutritionChecks: [], items: [], productionBatches: [] } };
const views = [
    { id: 'nutrition', label: 'Cek Gizi', description: 'Validasi protein, karbohidrat, lemak, serat, dan skor.' },
    { id: 'recipes', label: 'Resep Gizi', description: 'Kelola resep khusus ahli gizi.' },
    { id: 'components', label: 'Komponen Bahan', description: 'Builder bahan per porsi dan catatan substitusi.' },
    { id: 'qc', label: 'QC Produksi', description: 'Pantau batch produksi dan status QC.' }
];

function recipeName(id) {
    return pageState.state.recipes.find((row) => row.recipe_id === id)?.name || id || '-';
}

function itemName(id) {
    return pageState.state.items.find((row) => row.item_id === id)?.name || id || '-';
}

function renderStats() {
    const summary = getNutritionistSummaryFromState(pageState.state);
    return StatGrid([
        { label: 'Resep', value: summary.recipes, note: 'Menu aktif/draft' },
        { label: 'Komponen', value: summary.components, note: 'Bahan per porsi' },
        { label: 'Cek Gizi', value: summary.checks, note: 'Validasi tersimpan' },
        { label: 'Skor Rata-rata', value: Math.round(summary.avgScore), note: `${summary.lowScore} cek di bawah 80` }
    ]);
}

function renderActionBar() {
    return `<div class="inventory-action-bar"><button class="erp-btn primary" data-action="refresh-nutritionist" type="button">Refresh GAS</button><button class="erp-btn" data-jump-view="nutrition" type="button">Cek Gizi</button><button class="erp-btn" data-jump-view="recipes" type="button">Tambah Resep</button><button class="erp-btn" data-jump-view="components" type="button">Tambah Komponen</button><a class="erp-btn" href="#operational">Operasional</a></div>`;
}

function renderNutritionForm() {
    return `<form class="erp-card" data-nutritionist-form="nutrition"><h3>Cek Gizi Menu</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Resep</label><select class="erp-select" name="recipe_id" required>${optionRows(pageState.state.recipes, 'recipe_id', 'name', 'Tambah resep dahulu')}</select></div>
        <div class="erp-field"><label>Protein (g)</label><input class="erp-input" name="protein_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Karbohidrat (g)</label><input class="erp-input" name="carb_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Lemak (g)</label><input class="erp-input" name="fat_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Serat (g)</label><input class="erp-input" name="fiber_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Skor Manual</label><input class="erp-input" name="score" type="number" min="0" max="100" placeholder="Opsional"></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Cek Gizi</button></div></form>`;
}

function renderRecipeForm() {
    return `<form class="erp-card" data-nutritionist-form="recipe"><h3>Tambah Resep Gizi</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Nama Resep</label><input class="erp-input" name="name" required></div>
        <div class="erp-field"><label>Ukuran Porsi</label><input class="erp-input" name="portion_size" placeholder="350 gram" required></div>
        <div class="erp-field"><label>Target Usia</label><input class="erp-input" name="target_age_group" placeholder="SD kelas 1-3"></div>
        <div class="erp-field"><label>Target Energi</label><input class="erp-input" name="energy_target" placeholder="600 kkal"></div>
        <div class="erp-field"><label>Target Protein</label><input class="erp-input" name="protein_target" placeholder="18 gram"></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="aktif">Aktif</option><option value="draft">Draft</option><option value="revisi">Revisi</option></select></div>
        <div class="erp-field full"><label>Catatan Ahli Gizi</label><textarea class="erp-textarea" name="notes"></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Resep</button></div></form>`;
}

function renderComponentForm() {
    return `<form class="erp-card" data-nutritionist-form="component"><h3>Tambah Komponen Bahan</h3><div class="erp-form-grid">
        <div class="erp-field"><label>Resep</label><select class="erp-select" name="recipe_id" required>${optionRows(pageState.state.recipes, 'recipe_id', 'name', 'Tambah resep dahulu')}</select></div>
        <div class="erp-field"><label>Item Bahan</label><select class="erp-select" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventori dahulu')}</select></div>
        <div class="erp-field"><label>Qty/Porsi</label><input class="erp-input" name="qty_per_portion" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Satuan</label><input class="erp-input" name="unit"></div>
        <div class="erp-field full"><label>Catatan Substitusi</label><textarea class="erp-textarea" name="notes"></textarea></div>
    </div><div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Komponen</button></div></form>`;
}

function renderActiveTable() {
    if (pageState.activeView === 'recipes') {
        const rows = pageState.state.recipes.slice(0, 12).map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.portion_size)}</td><td>${esc(row.target_age_group)}</td><td>${esc(row.status)}</td></tr>`).join('');
        return DataTable({ headers: ['Resep', 'Porsi', 'Target Usia', 'Status'], rows, emptyText: 'Belum ada resep.' });
    }
    if (pageState.activeView === 'components') {
        const rows = pageState.state.recipeComponents.slice(0, 12).map((row) => `<tr><td>${esc(recipeName(row.recipe_id))}</td><td>${esc(itemName(row.item_id))}</td><td>${esc(row.qty_per_portion)} ${esc(row.unit)}</td><td>${esc(row.notes)}</td></tr>`).join('');
        return DataTable({ headers: ['Resep', 'Item', 'Qty/Porsi', 'Catatan'], rows, emptyText: 'Belum ada komponen.' });
    }
    if (pageState.activeView === 'qc') {
        const rows = pageState.state.productionBatches.slice(0, 12).map((row) => `<tr><td>${esc(row.batch_id)}</td><td>${esc(recipeName(row.recipe_id))}</td><td>${formatNumber(row.target_portion)}</td><td>${formatNumber(row.actual_portion)}</td><td>${esc(row.temperature)}</td><td>${esc(row.qc_status)}</td></tr>`).join('');
        return DataTable({ headers: ['Batch', 'Resep', 'Target', 'Aktual', 'Suhu', 'QC'], rows, emptyText: 'Belum ada batch produksi.' });
    }
    const rows = pageState.state.nutritionChecks.slice(0, 12).map((row) => `<tr><td>${esc(recipeName(row.recipe_id))}</td><td>${esc(row.score)}</td><td>${esc(row.protein_g)}</td><td>${esc(row.carb_g)}</td><td>${esc(row.fat_g)}</td><td>${esc(row.fiber_g)}</td><td>${esc(row.warning_json)}</td></tr>`).join('');
    return DataTable({ headers: ['Resep', 'Skor', 'Protein', 'Karbo', 'Lemak', 'Serat', 'Warning'], rows, emptyText: 'Belum ada cek gizi.' });
}

function renderActiveView() {
    const forms = { nutrition: renderNutritionForm, recipes: renderRecipeForm, components: renderComponentForm };
    const form = forms[pageState.activeView] ? forms[pageState.activeView]() : '';
    const title = views.find((view) => view.id === pageState.activeView)?.label || 'Ahli Gizi';
    return `${form}<div class="erp-card module-card-gap"><h3>${title}</h3>${renderActiveTable()}</div>`;
}

function renderNutritionistContent() {
    const root = document.getElementById('nutritionist-root');
    if (!root) return;
    if (pageState.loading) { root.innerHTML = LoadingCard({ title: 'Memuat Ahli Gizi dari GAS', text: 'Mengambil resep, komponen, cek gizi, dan batch produksi...' }); return; }
    if (pageState.error) { root.innerHTML = ErrorCard({ title: 'Ahli Gizi tidak bisa dimuat', error: pageState.error, action: 'refresh-nutritionist' }); return; }
    root.innerHTML = `${renderStats()}${renderActionBar()}${ViewTabs({ views, activeView: pageState.activeView, dataAttr: 'data-nutritionist-view' })}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadNutritionist() {
    pageState.loading = true; pageState.error = ''; renderNutritionistContent();
    try { pageState.state = await getNutritionistState(); } catch (error) { pageState.error = error.message; } finally { pageState.loading = false; renderNutritionistContent(); }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    if (form.dataset.nutritionistForm === 'recipe') await createRecipe(payload);
    if (form.dataset.nutritionistForm === 'component') await addRecipeComponent(payload, pageState.state);
    if (form.dataset.nutritionistForm === 'nutrition') await createNutritionCheck(payload, pageState.state);
    await loadNutritionist();
}

function bindNutritionistEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('nutritionist-root')) return;
        const viewButton = event.target.closest('[data-nutritionist-view], [data-jump-view]');
        if (viewButton) { pageState.activeView = viewButton.dataset.nutritionistView || viewButton.dataset.jumpView; renderNutritionistContent(); return; }
        if (event.target.closest('[data-action]')?.dataset.action === 'refresh-nutritionist') await loadNutritionist();
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('nutritionist-root') || !event.target.matches('[data-nutritionist-form]')) return;
        event.preventDefault();
        try { await handleSubmit(event.target); } catch (error) { window.alert(error.message); await loadNutritionist(); }
    });
}

let eventsBound = false;

export function NutritionistPage() {
    return '<div id="nutritionist-root"></div>';
}

export function initNutritionistPage() {
    if (!eventsBound) { bindNutritionistEvents(); eventsBound = true; }
    loadNutritionist();
}
