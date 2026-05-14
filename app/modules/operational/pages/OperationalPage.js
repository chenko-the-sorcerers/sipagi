import {
    addRecipeComponent,
    createCleaningChecklist,
    createDispatchOrder,
    createNutritionCheck,
    createPortionAndPacking,
    createProductionBatch,
    createRecipe,
    getOperationalState,
    getOperationalSummaryFromState
} from '../services/operationalApi.js';
import { recipePlanningCatalog, recipePlanningSource } from '../data/recipePlanningCatalog.js';
import { LoadingCard } from '../../../shared/components/ModuleComponents.js';

const pageState = {
    activeView: 'overview',
    loading: true,
    error: '',
    state: {
        recipes: [],
        recipeComponents: [],
        nutritionChecks: [],
        productionBatches: [],
        portionBatches: [],
        packingBatches: [],
        dispatchOrders: [],
        cleaningChecklists: [],
        items: [],
        schools: []
    }
};

const views = [
    { id: 'overview', label: 'Overview', description: 'Rencana menu, produksi harian, distribusi, dan absensi penerima manfaat.' },
    { id: 'recipe', label: 'Resep', description: 'Master resep, target porsi, dan sasaran gizi.' },
    { id: 'component', label: 'Komponen', description: 'Builder komponen bahan per porsi.' },
    { id: 'nutrition', label: 'Cek Gizi', description: 'Skor gizi dan catatan risiko menu.' },
    { id: 'production', label: 'Produksi', description: 'Batch masak, suhu, porsi aktual, dan QC.' },
    { id: 'packing', label: 'Pemorsian & Packing', description: 'Porsi aktual, label packing, dan tujuan sekolah.' },
    { id: 'dispatch', label: 'Distribusi', description: 'Surat jalan, rute, driver, ETA, dan status kirim.' },
    { id: 'cleaning', label: 'Kebersihan', description: 'Checklist area, shift, foto, dan petugas.' }
];

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function optionRows(rows, idField, labelField, fallback = 'Belum ada data') {
    if (!rows.length) return `<option value="">${fallback}</option>`;
    return rows.map((row) => `<option value="${esc(row[idField])}">${esc(row[labelField] || row[idField])}</option>`).join('');
}

function recipeName(id) {
    return pageState.state.recipes.find((recipe) => recipe.recipe_id === id)?.name || id || '-';
}

function itemName(id) {
    return pageState.state.items.find((item) => item.item_id === id)?.name || id || '-';
}

function schoolName(id) {
    return pageState.state.schools.find((school) => school.school_id === id)?.name || id || '-';
}

function renderStats() {
    const summary = getOperationalSummaryFromState(pageState.state);
    const cards = [
        ['Resep Aktif', summary.recipes, 'Menu yang siap dipakai produksi'],
        ['Batch Hari Ini', summary.productionToday, 'Produksi tercatat hari ini'],
        ['Packing Hari Ini', summary.packedToday, 'Paket siap kirim hari ini'],
        ['Dispatch Terbuka', summary.dispatchOpen, `${summary.cleaningDone} checklist kebersihan hari ini`]
    ];

    return `
        <div class="erp-grid">
            ${cards.map(([label, value, note]) => `
                <div class="erp-card">
                    <div class="erp-stat-label">${label}</div>
                    <div class="erp-stat-value">${value}</div>
                    <div class="erp-stat-note">${note}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderViewNav() {
    return `
        <div class="inventory-view-grid">
            ${views.map((view) => `
                <button class="inventory-view-card ${pageState.activeView === view.id ? 'active' : ''}" data-operational-view="${view.id}" type="button">
                    <strong>${view.label}</strong>
                    <span>${view.description}</span>
                </button>
            `).join('')}
        </div>
    `;
}

function renderActionBar() {
    return `
        <div class="inventory-action-bar">
            <button class="erp-btn primary" data-action="refresh-operational" type="button">Refresh Data</button>
            <button class="erp-btn" data-jump-view="production" type="button">Produksi</button>
            <button class="erp-btn" data-jump-view="packing" type="button">Pemorsian/Packing</button>
            <button class="erp-btn" data-jump-view="dispatch" type="button">Distribusi</button>
        </div>
    `;
}

function renderRecipeForm() {
    return `
        <form class="erp-card" data-operational-form="recipe">
            <h3>Tambah Resep</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Nama Resep</label><input class="erp-input" name="name" required></div>
                <div class="erp-field"><label>Ukuran Porsi</label><input class="erp-input" name="portion_size" placeholder="Contoh: 350 gram" required></div>
                <div class="erp-field"><label>Target Usia</label><input class="erp-input" name="target_age_group" placeholder="SD kelas 1-3" required></div>
                <div class="erp-field"><label>Target Energi</label><input class="erp-input" name="energy_target" placeholder="Contoh: 600 kkal"></div>
                <div class="erp-field"><label>Target Protein</label><input class="erp-input" name="protein_target" placeholder="Contoh: 18 gram"></div>
                <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="aktif">Aktif</option><option value="draft">Draft</option></select></div>
                <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Resep</button></div>
        </form>
    `;
}

function renderComponentForm() {
    return `
        <form class="erp-card" data-operational-form="component">
            <h3>Tambah Komponen Resep</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Resep</label><select class="erp-select" name="recipe_id" required>${optionRows(pageState.state.recipes, 'recipe_id', 'name', 'Tambah resep dahulu')}</select></div>
                <div class="erp-field"><label>Item Bahan</label><select class="erp-select" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventory dahulu')}</select></div>
                <div class="erp-field"><label>Qty per Porsi</label><input class="erp-input" name="qty_per_portion" type="number" min="0" step="0.01" required></div>
                <div class="erp-field"><label>Satuan</label><input class="erp-input" name="unit"></div>
                <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Komponen</button></div>
        </form>
    `;
}

function renderNutritionForm() {
    return `
        <form class="erp-card" data-operational-form="nutrition">
            <h3>Cek Gizi</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Resep</label><select class="erp-select" name="recipe_id" required>${optionRows(pageState.state.recipes, 'recipe_id', 'name', 'Tambah resep dahulu')}</select></div>
                <div class="erp-field"><label>Protein (g)</label><input class="erp-input" name="protein_g" type="number" min="0" step="0.01" required></div>
                <div class="erp-field"><label>Karbohidrat (g)</label><input class="erp-input" name="carb_g" type="number" min="0" step="0.01" required></div>
                <div class="erp-field"><label>Lemak (g)</label><input class="erp-input" name="fat_g" type="number" min="0" step="0.01" required></div>
                <div class="erp-field"><label>Serat (g)</label><input class="erp-input" name="fiber_g" type="number" min="0" step="0.01" required></div>
                <div class="erp-field"><label>Skor Manual</label><input class="erp-input" name="score" type="number" min="0" max="100" placeholder="Opsional"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Cek Gizi</button></div>
        </form>
    `;
}

function renderProductionForm() {
    return `
        <form class="erp-card" data-operational-form="production">
            <h3>Batch Produksi</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Resep</label><select class="erp-select" name="recipe_id" required>${optionRows(pageState.state.recipes, 'recipe_id', 'name', 'Tambah resep dahulu')}</select></div>
                <div class="erp-field"><label>Target Porsi</label><input class="erp-input" name="target_portion" type="number" min="0" required></div>
                <div class="erp-field"><label>Porsi Aktual</label><input class="erp-input" name="actual_portion" type="number" min="0" required></div>
                <div class="erp-field"><label>Mulai</label><input class="erp-input" name="start_time" type="datetime-local"></div>
                <div class="erp-field"><label>Selesai</label><input class="erp-input" name="end_time" type="datetime-local"></div>
                <div class="erp-field"><label>Suhu</label><input class="erp-input" name="temperature" placeholder="Contoh: 74 C"></div>
                <div class="erp-field"><label>Status QC</label><select class="erp-select" name="qc_status"><option value="lulus">Lulus</option><option value="menunggu">Menunggu</option><option value="ulang">Ulang</option></select></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Produksi</button></div>
        </form>
    `;
}

function renderPackingForm() {
    return `
        <form class="erp-card" data-operational-form="packing">
            <h3>Pemorsian & Packing</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Batch Produksi</label><select class="erp-select" name="production_batch_id" required>${optionRows(pageState.state.productionBatches, 'batch_id', 'batch_id', 'Buat produksi dahulu')}</select></div>
                <div class="erp-field"><label>Sekolah</label><select class="erp-select" name="school_id">${optionRows(pageState.state.schools, 'school_id', 'name', 'Sekolah opsional')}</select></div>
                <div class="erp-field"><label>Target Porsi</label><input class="erp-input" name="target_portion" type="number" min="0" required></div>
                <div class="erp-field"><label>Porsi Aktual</label><input class="erp-input" name="actual_portion" type="number" min="0" required></div>
                <div class="erp-field"><label>Jumlah Pack</label><input class="erp-input" name="pack_count" type="number" min="0" required></div>
                <div class="erp-field"><label>Kode Label</label><input class="erp-input" name="label_code"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Packing</button></div>
        </form>
    `;
}

function renderDispatchForm() {
    return `
        <form class="erp-card" data-operational-form="dispatch">
            <h3>Distribusi</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Batch Packing</label><select class="erp-select" name="packing_id" required>${optionRows(pageState.state.packingBatches, 'packing_id', 'packing_id', 'Buat packing dahulu')}</select></div>
                <div class="erp-field"><label>Sekolah</label><select class="erp-select" name="school_id">${optionRows(pageState.state.schools, 'school_id', 'name', 'Sekolah opsional')}</select></div>
                <div class="erp-field"><label>Driver</label><input class="erp-input" name="driver_user_id" value="driver-utama"></div>
                <div class="erp-field"><label>Kode Rute</label><input class="erp-input" name="route_code" required></div>
                <div class="erp-field"><label>Jumlah Porsi</label><input class="erp-input" name="portion_qty" type="number" min="0" required></div>
                <div class="erp-field"><label>ETA</label><input class="erp-input" name="eta" type="datetime-local"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Distribusi</button></div>
        </form>
    `;
}

function renderCleaningForm() {
    return `
        <form class="erp-card" data-operational-form="cleaning">
            <h3>Checklist Kebersihan</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Area</label><input class="erp-input" name="area" placeholder="Dapur panas, packing, gudang..." required></div>
                <div class="erp-field"><label>Shift</label><select class="erp-select" name="shift"><option value="pagi">Pagi</option><option value="siang">Siang</option><option value="malam">Malam</option></select></div>
                <label class="module-check"><input type="checkbox" name="meja"> Meja bersih</label>
                <label class="module-check"><input type="checkbox" name="lantai"> Lantai bersih</label>
                <label class="module-check"><input type="checkbox" name="alat"> Alat makan bersih</label>
                <label class="module-check"><input type="checkbox" name="sampah"> Sampah dibuang</label>
                <div class="erp-field"><label>Petugas</label><input class="erp-input" name="checked_by" value="petugas_kebersihan"></div>
                <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="selesai">Selesai</option><option value="perlu-tindak-lanjut">Perlu Tindak Lanjut</option></select></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Checklist</button></div>
        </form>
    `;
}

function renderTable(headers, rows, emptyText) {
    return `
        <div class="erp-table-wrap">
            <table class="erp-table">
                <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
                <tbody>${rows || `<tr><td colspan="${headers.length}">${emptyText}</td></tr>`}</tbody>
            </table>
        </div>
    `;
}

function renderRecipeTable() {
    const rows = pageState.state.recipes.slice(0, 12).map((recipe) => `
        <tr><td>${esc(recipe.name)}</td><td>${esc(recipe.portion_size)}</td><td>${esc(recipe.target_age_group)}</td><td><span class="erp-status safe">${esc(recipe.status || 'aktif')}</span></td></tr>
    `).join('');
    return renderTable(['Resep', 'Porsi', 'Target Usia', 'Status'], rows, 'Belum ada resep.');
}

function renderComponentTable() {
    const rows = pageState.state.recipeComponents.slice(0, 12).map((component) => `
        <tr><td>${esc(recipeName(component.recipe_id))}</td><td>${esc(itemName(component.item_id))}</td><td>${esc(component.qty_per_portion)} ${esc(component.unit || '')}</td><td>${esc(component.notes)}</td></tr>
    `).join('');
    return renderTable(['Resep', 'Item', 'Qty/Porsi', 'Catatan'], rows, 'Belum ada komponen.');
}

function renderNutritionTable() {
    const rows = pageState.state.nutritionChecks.slice(0, 12).map((check) => `
        <tr><td>${esc(recipeName(check.recipe_id))}</td><td>${esc(check.score)}</td><td>${esc(check.protein_g)}</td><td>${esc(check.carb_g)}</td><td>${esc(check.fat_g)}</td><td>${esc(check.fiber_g)}</td><td>${esc(check.checked_at)}</td></tr>
    `).join('');
    return renderTable(['Resep', 'Skor', 'Protein', 'Karbo', 'Lemak', 'Serat', 'Waktu'], rows, 'Belum ada cek gizi.');
}

function renderProductionTable() {
    const rows = pageState.state.productionBatches.slice(0, 12).map((batch) => `
        <tr><td>${esc(batch.batch_id)}</td><td>${esc(recipeName(batch.recipe_id))}</td><td>${esc(batch.target_portion)}</td><td>${esc(batch.actual_portion)}</td><td>${esc(batch.temperature)}</td><td><span class="erp-status ${batch.qc_status === 'lulus' ? 'safe' : 'warning'}">${esc(batch.qc_status)}</span></td></tr>
    `).join('');
    return renderTable(['Batch', 'Resep', 'Target', 'Aktual', 'Suhu', 'QC'], rows, 'Belum ada produksi.');
}

function renderPackingTable() {
    const rows = pageState.state.packingBatches.slice(0, 12).map((packing) => `
        <tr><td>${esc(packing.packing_id)}</td><td>${esc(packing.portion_id)}</td><td>${esc(schoolName(packing.school_id))}</td><td>${esc(packing.pack_count)}</td><td>${esc(packing.label_code)}</td><td><span class="erp-status safe">${esc(packing.status)}</span></td></tr>
    `).join('');
    return renderTable(['Packing', 'Portion', 'Sekolah', 'Pack', 'Label', 'Status'], rows, 'Belum ada packing.');
}

function renderDispatchTable() {
    const rows = pageState.state.dispatchOrders.slice(0, 12).map((dispatch) => `
        <tr><td>${esc(dispatch.dispatch_id)}</td><td>${esc(schoolName(dispatch.school_id))}</td><td>${esc(dispatch.route_code)}</td><td>${esc(dispatch.portion_qty)}</td><td>${esc(dispatch.eta)}</td><td><span class="erp-status warning">${esc(dispatch.status)}</span></td></tr>
    `).join('');
    return renderTable(['Dispatch', 'Sekolah', 'Rute', 'Porsi', 'ETA', 'Status'], rows, 'Belum ada distribusi.');
}

function renderCleaningTable() {
    const rows = pageState.state.cleaningChecklists.slice(0, 12).map((check) => `
        <tr><td>${esc(check.area)}</td><td>${esc(check.shift)}</td><td>${esc(check.status)}</td><td>${esc(check.checked_by)}</td><td>${esc(check.checked_at)}</td></tr>
    `).join('');
    return renderTable(['Area', 'Shift', 'Status', 'Petugas', 'Waktu'], rows, 'Belum ada checklist.');
}

function renderOperationalOverview() {
    const summary = getOperationalSummaryFromState(pageState.state);
    const qcPending = pageState.state.productionBatches.filter((row) => ['pending', 'menunggu', 'cek'].includes(String(row.qc_status || '').toLowerCase())).length;
    const openDispatch = pageState.state.dispatchOrders.filter((row) => !['delivered', 'selesai', 'terkirim'].includes(String(row.status || '').toLowerCase())).length;
    const cards = [
        ['Rencana Menu', pageState.state.recipes.length, 'Resep siap dipakai planning'],
        ['Produksi Harian', summary.productionToday, `${qcPending} batch perlu cek`],
        ['Distribusi MBG', openDispatch, 'Surat jalan belum selesai'],
        ['Absensi Penerima Manfaat', pageState.state.schools.length, 'Sekolah tujuan aktif'],
        ['Packing', summary.packedToday, 'Paket siap kirim hari ini']
    ];
    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Overview Operasional</h3>
                    <p class="kt-card-description">Alur rencana menu, produksi, packing, distribusi, dan penerimaan sekolah.</p>
                </div>
                <a class="kt-btn kt-btn-sm kt-btn-primary" href="#operational/recipe">Tambah Resep</a>
            </div>
            <div class="kt-card-content grid gap-4">
                <div class="erp-grid">${cards.map(([label, value, note]) => `<article class="erp-card"><div class="erp-stat-label">${label}</div><div class="erp-stat-value">${value}</div><div class="erp-stat-note">${note}</div></article>`).join('')}</div>
                <div class="erp-card">
                    <h3>Planning Makanan dari Referensi Resep Indonesia</h3>
                    <p class="erp-muted">Struktur kompatibel dengan dataset ${recipePlanningSource.name}: title, ingredients, steps.</p>
                    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        ${recipePlanningCatalog.map((recipe) => `
                            <article class="kt-card kt-card-border shadow-none p-4 gap-2">
                                <div class="text-sm font-semibold text-mono">${esc(recipe.title)}</div>
                                <p class="text-xs text-secondary-foreground">${esc(recipe.note)}</p>
                                <div class="text-xs text-muted-foreground">Protein: ${esc(recipe.protein)}</div>
                                <div class="text-xs text-secondary-foreground">${recipe.ingredients.slice(0, 5).map(esc).join(', ')}</div>
                            </article>
                        `).join('')}
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderActiveView() {
    if (pageState.activeView === 'overview') return renderOperationalOverview();
    if (pageState.activeView === 'component') return `${renderComponentForm()}<div class="erp-card module-card-gap"><h3>Komponen Resep</h3>${renderComponentTable()}</div>`;
    if (pageState.activeView === 'nutrition') return `${renderNutritionForm()}<div class="erp-card module-card-gap"><h3>Riwayat Cek Gizi</h3>${renderNutritionTable()}</div>`;
    if (pageState.activeView === 'production') return `${renderProductionForm()}<div class="erp-card module-card-gap"><h3>Batch Produksi</h3>${renderProductionTable()}</div>`;
    if (pageState.activeView === 'packing') return `${renderPackingForm()}<div class="erp-card module-card-gap"><h3>Batch Packing</h3>${renderPackingTable()}</div>`;
    if (pageState.activeView === 'dispatch') return `${renderDispatchForm()}<div class="erp-card module-card-gap"><h3>Distribusi</h3>${renderDispatchTable()}</div>`;
    if (pageState.activeView === 'cleaning') return `${renderCleaningForm()}<div class="erp-card module-card-gap"><h3>Checklist Kebersihan</h3>${renderCleaningTable()}</div>`;
    return `${renderRecipeForm()}<div class="erp-card module-card-gap"><h3>Daftar Resep</h3>${renderRecipeTable()}</div>`;
}

function renderOperationalContent() {
    const root = document.getElementById('operational-root');
    if (!root) return;

    if (pageState.loading) {
        root.innerHTML = LoadingCard({ title: 'Memuat Operasional dari Data', text: 'Mengambil resep, produksi, packing, distribusi, dan checklist...' });
        return;
    }

    if (pageState.error) {
        root.innerHTML = `<div class="erp-card inventory-error"><h3>Operasional tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-operational" type="button">Coba Lagi</button></div>`;
        return;
    }

    root.innerHTML = `${renderStats()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadOperational() {
    pageState.loading = true;
    pageState.error = '';
    renderOperationalContent();

    try {
        pageState.state = await getOperationalState();
    } catch (error) {
        pageState.error = error.message;
    } finally {
        pageState.loading = false;
        renderOperationalContent();
    }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Menyimpan...';

    if (form.dataset.operationalForm === 'recipe') await createRecipe(payload);
    if (form.dataset.operationalForm === 'component') await addRecipeComponent(payload, pageState.state);
    if (form.dataset.operationalForm === 'nutrition') await createNutritionCheck(payload, pageState.state);
    if (form.dataset.operationalForm === 'production') await createProductionBatch(payload, pageState.state);
    if (form.dataset.operationalForm === 'packing') await createPortionAndPacking(payload, pageState.state);
    if (form.dataset.operationalForm === 'dispatch') await createDispatchOrder(payload, pageState.state);
    if (form.dataset.operationalForm === 'cleaning') await createCleaningChecklist(payload);

    await loadOperational();
}

function bindOperationalEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('operational-root')) return;
        const viewButton = event.target.closest('[data-operational-view], [data-jump-view]');
        if (viewButton) {
            pageState.activeView = viewButton.dataset.operationalView || viewButton.dataset.jumpView;
            renderOperationalContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget?.dataset.action === 'refresh-operational') await loadOperational();
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('operational-root')) return;
        if (!event.target.matches('[data-operational-form]')) return;

        event.preventDefault();
        try {
            await handleSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            await loadOperational();
        }
    });
}

let eventsBound = false;

export function OperationalPage() {
    return '<div id="operational-root"></div>';
}

export function initOperationalPage(initialView = 'overview') {
    pageState.activeView = views.some((view) => view.id === initialView) ? initialView : 'overview';
    if (!eventsBound) {
        bindOperationalEvents();
        eventsBound = true;
    }
    loadOperational();
}
