import { DataTable, ErrorCard, escapeHtml as esc, formatNumber, LoadingCard, optionRows, serializeForm, StatGrid } from '../../../shared/components/ModuleComponents.js';
import {
    addRecipeComponent,
    createNutritionCheck,
    createRecipe,
    getNutritionistState,
    getNutritionistSummaryFromState
} from '../services/nutritionistApi.js';

const pageState = {
    activeView: 'overview',
    loading: true,
    error: '',
    analysis: {
        target_group: 'SMP 13-15 tahun',
        target_mode: '35',
        target_portions: 3000,
        buffer_stock: 1,
        target_budget: 10000,
        energy_kcal: 779,
        protein_g: 24,
        fat_g: 26.5,
        carb_g: 114,
        vitamin_a_mcg: 210,
        folate_mcg: 140,
        vitamin_c_mg: 24.5,
        iron_mg: 4.5
    },
    selectedFoods: [],
    menuCycle: [
        { day: 1, pokok: 'Nasi', hewani: 'Ayam semur', nabati: 'Tempe goreng', sayur: 'Bening bayam', buah: 'Semangka' },
        { day: 2, pokok: 'Nasi', hewani: 'Telur dadar', nabati: 'Tahu kuning', sayur: 'Sop wortel kol', buah: 'Pisang' },
        { day: 3, pokok: 'Nasi', hewani: 'Ikan tongkol bumbu kuning', nabati: 'Tempe orek', sayur: 'Tumis buncis wortel', buah: 'Pepaya' },
        { day: 4, pokok: 'Nasi', hewani: 'Ayam teriyaki', nabati: 'Tahu goreng', sayur: 'Capcay sayur', buah: 'Melon' },
        { day: 5, pokok: 'Nasi', hewani: 'Lele goreng', nabati: 'Perkedel tempe', sayur: 'Sayur lodeh', buah: 'Jeruk' }
    ],
    qcChecks: ['PO dan faktur sesuai', 'Barang sesuai spesifikasi', 'Kuantitas sesuai timbang', 'Suhu sesuai kategori', 'Tidak rusak atau kadaluarsa', 'Organoleptik normal', 'Foto bukti tersedia'],
    state: {
        recipes: [],
        recipeComponents: [],
        nutritionChecks: [],
        items: [],
        productionBatches: [],
        stockBatches: [],
        receivingRecords: [],
        vendors: [],
        purchaseOrders: []
    }
};

const views = [
    { id: 'overview', label: 'Overview' },
    { id: 'food-analysis', label: 'Food Analysis' },
    { id: 'menu-cycle', label: 'Menu Cycle Builder' },
    { id: 'recipe-composer', label: 'Recipe Composer' },
    { id: 'akg-target', label: 'AKG Target Engine' },
    { id: 'requirement', label: 'Belanja & Stock' },
    { id: 'qc-receiving', label: 'QC Penerimaan' },
    { id: 'reports', label: 'Nutrition Report' }
];

const nutrientFields = [
    ['energy_kcal', 'Energi', 'kkal'],
    ['protein_g', 'Protein', 'g'],
    ['fat_g', 'Lemak', 'g'],
    ['carb_g', 'Karbohidrat', 'g'],
    ['fiber_g', 'Serat', 'g'],
    ['vitamin_a_mcg', 'Vitamin A', 'mcg'],
    ['folate_mcg', 'Asam Folat', 'mcg'],
    ['vitamin_c_mg', 'Vitamin C', 'mg'],
    ['iron_mg', 'Zat Besi', 'mg'],
    ['calcium_mg', 'Kalsium', 'mg'],
    ['sodium_mg', 'Natrium', 'mg'],
    ['potassium_mg', 'Kalium', 'mg']
];

const akgPresets = {
    'PAUD/TK 4-6 tahun': { energy_kcal: 490, protein_g: 8.75, fat_g: 15.5, carb_g: 77, vitamin_a_mcg: 157.5, folate_mcg: 70, vitamin_c_mg: 15.75, iron_mg: 3.5 },
    'SD 7-12 tahun': { energy_kcal: 647, protein_g: 17.5, fat_g: 21, carb_g: 96, vitamin_a_mcg: 175, folate_mcg: 105, vitamin_c_mg: 17.5, iron_mg: 3.5 },
    'SMP 13-15 tahun': { energy_kcal: 779, protein_g: 24, fat_g: 26.5, carb_g: 114, vitamin_a_mcg: 210, folate_mcg: 140, vitamin_c_mg: 24.5, iron_mg: 4.5 },
    'SMA 16-18 tahun': { energy_kcal: 875, protein_g: 26, fat_g: 30, carb_g: 130, vitamin_a_mcg: 210, folate_mcg: 140, vitamin_c_mg: 26, iron_mg: 5 },
    'Ibu Hamil': { energy_kcal: 840, protein_g: 26, fat_g: 27, carb_g: 126, vitamin_a_mcg: 280, folate_mcg: 210, vitamin_c_mg: 30, iron_mg: 9.5 },
    'Balita 24-59 bulan': { energy_kcal: 490, protein_g: 8, fat_g: 16, carb_g: 75, vitamin_a_mcg: 157, folate_mcg: 56, vitamin_c_mg: 14, iron_mg: 2.8 }
};

function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
    return Math.round(num(value)).toLocaleString('id-ID');
}

function pct(value) {
    return `${Math.round(num(value))}%`;
}

function itemById(itemId) {
    return pageState.state.items.find((item) => item.item_id === itemId) || {};
}

function itemByName(name) {
    return pageState.state.items.find((item) => String(item.name || '').toLowerCase() === String(name || '').toLowerCase()) || {};
}

function recipeName(id) {
    return pageState.state.recipes.find((row) => row.recipe_id === id)?.name || id || '-';
}

function itemName(id) {
    return itemById(id).name || id || '-';
}

function selectedFoodRows() {
    const portions = Math.max(num(pageState.analysis.target_portions), 1);
    const buffer = num(pageState.analysis.buffer_stock) / 100;
    return pageState.selectedFoods.map((food) => {
        const item = itemById(food.item_id);
        const gram = num(food.gram);
        const pricePerKg = num(food.price_per_kg);
        const needKg = (gram / 1000) * portions * (1 + buffer);
        const stockQty = num(item.currentStock ?? item.current_stock);
        const shortageQty = Math.max(needKg - stockQty, 0);
        const foodCost = needKg * pricePerKg;
        return {
            ...food,
            item,
            needKg,
            stockQty,
            shortageQty,
            cost: foodCost,
            costPerPortion: foodCost / portions,
            status: shortageQty <= 0 ? 'Stok cukup' : stockQty > 0 ? 'Perlu belanja tambahan' : 'Belum ada stok'
        };
    });
}

function nutritionActual() {
    const rows = selectedFoodRows();
    return {
        energy_kcal: rows.reduce((sum, row) => sum + num(row.energy_kcal), 0),
        protein_g: rows.reduce((sum, row) => sum + num(row.protein_g), 0),
        fat_g: rows.reduce((sum, row) => sum + num(row.fat_g), 0),
        carb_g: rows.reduce((sum, row) => sum + num(row.carb_g), 0),
        vitamin_a_mcg: rows.reduce((sum, row) => sum + num(row.vitamin_a_mcg), 0),
        folate_mcg: rows.reduce((sum, row) => sum + num(row.folate_mcg), 0),
        vitamin_c_mg: rows.reduce((sum, row) => sum + num(row.vitamin_c_mg), 0),
        iron_mg: rows.reduce((sum, row) => sum + num(row.iron_mg), 0)
    };
}

function analysisSummary() {
    const rows = selectedFoodRows();
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const portions = Math.max(num(pageState.analysis.target_portions), 1);
    const actual = nutritionActual();
    const targetKeys = ['energy_kcal', 'protein_g', 'fat_g', 'carb_g', 'vitamin_a_mcg', 'folate_mcg', 'vitamin_c_mg', 'iron_mg'];
    const targetScore = targetKeys.length
        ? targetKeys.reduce((sum, key) => {
            const target = Math.max(num(pageState.analysis[key]), 1);
            return sum + Math.min((num(actual[key]) / target) * 100, 120);
        }, 0) / targetKeys.length
        : 0;
    return {
        rows,
        actual,
        totalCost,
        portions,
        costPerPortion: totalCost / portions,
        shortageCount: rows.filter((row) => row.shortageQty > 0).length,
        targetScore
    };
}

function statusBadge(value) {
    const normalized = String(value || '').toLowerCase();
    const tone = normalized.includes('reject') || normalized.includes('ditolak') || normalized.includes('failed')
        ? 'danger'
        : normalized.includes('pending') || normalized.includes('menunggu') || normalized.includes('hold')
            ? 'warning'
            : 'success';
    return `<span class="erp-status ${tone === 'danger' ? 'warning' : tone}">${esc(value || '-')}</span>`;
}

function renderLocalNav() {
    return `
        <div class="nutrition-feature-nav">
            ${views.map((view) => `
                <button class="${pageState.activeView === view.id ? 'active' : ''}" data-jump-view="${view.id}" type="button">${esc(view.label)}</button>
            `).join('')}
        </div>
    `;
}

function renderStats() {
    const summary = getNutritionistSummaryFromState(pageState.state);
    const analysis = analysisSummary();
    return StatGrid([
        { label: 'Siklus Menu', value: pageState.menuCycle.length, note: 'Hari menu aktif' },
        { label: 'Resep', value: summary.recipes, note: 'Menu aktif/draft' },
        { label: 'Food Cost/Porsi', value: `Rp ${money(analysis.costPerPortion)}`, note: `Target Rp ${money(pageState.analysis.target_budget)}` },
        { label: 'Skor Target Gizi', value: pct(analysis.targetScore), note: `${analysis.shortageCount} bahan shortage` }
    ]);
}

function renderOverview() {
    const cards = [
        ['Food Analysis', 'Hitung target gizi, target harga, bahan, stok, dan shortage.', 'food-analysis', 'Mulai analisis'],
        ['Menu Cycle Builder', 'Susun siklus menu 5, 10, atau 20 hari sesuai pola SPPG.', 'menu-cycle', 'Atur siklus'],
        ['Recipe Composer', 'Bangun resep, bahan per porsi, URT, harga, dan substitusi.', 'recipe-composer', 'Kelola resep'],
        ['AKG Target Engine', 'Pilih sasaran, 35% atau 100%, lalu isi target gizi otomatis.', 'akg-target', 'Atur AKG'],
        ['Belanja & Stock', 'Konversi gram per porsi menjadi kg kebutuhan dan cek stok.', 'requirement', 'Cek belanja'],
        ['QC Penerimaan', 'Checklist SOP penerimaan bahan makanan dan keputusan accept/reject.', 'qc-receiving', 'Review QC'],
        ['Nutrition Report', 'Siapkan export ringkas untuk Kepala SPPG dan BGN.', 'reports', 'Buka laporan']
    ];
    return `
        <section class="nutrition-hero">
            <div>
                <span class="nutrition-kicker">Ahli Gizi SPPG</span>
                <h2>Planning engine untuk menu, gizi, harga, stok, dan QC bahan.</h2>
                <p>Alur dibuat dari SOP penerimaan bahan, perencanaan kebutuhan menu, contoh siklus menu, tabel harga bahan pangan, dan job description ahli gizi SPPG.</p>
            </div>
            <div class="nutrition-hero-panel">
                <span>Target aktif</span>
                <strong>${esc(pageState.analysis.target_group)}</strong>
                <small>${esc(pageState.analysis.target_mode)}% AKG, Rp ${money(pageState.analysis.target_budget)} per porsi</small>
            </div>
        </section>
        <div class="nutrition-feature-grid">
            ${cards.map(([title, description, view, action]) => `
                <article class="nutrition-feature-card">
                    <div>
                        <h3>${esc(title)}</h3>
                        <p>${esc(description)}</p>
                    </div>
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-jump-view="${view}" type="button">${esc(action)}</button>
                </article>
            `).join('')}
        </div>
    `;
}

function renderAkgTarget() {
    const presetOptions = Object.keys(akgPresets).map((label) => `<option value="${esc(label)}" ${pageState.analysis.target_group === label ? 'selected' : ''}>${esc(label)}</option>`).join('');
    return `
        <div class="nutrition-workspace two">
            <form class="nutrition-panel" data-nutritionist-form="akg-target">
                <div class="nutrition-panel-head">
                    <span class="nutrition-kicker">AKG Target Engine</span>
                    <h3>Target sasaran dan kebutuhan gizi</h3>
                    <p>Pilih kelompok penerima manfaat, lalu gunakan preset 35% atau ubah angka manual.</p>
                </div>
                <div class="erp-form-grid">
                    <div class="erp-field"><label>Kelompok Sasaran</label><select class="erp-select" name="target_group">${presetOptions}</select></div>
                    <div class="erp-field"><label>Mode Pemenuhan</label><select class="erp-select" name="target_mode"><option value="35" ${pageState.analysis.target_mode === '35' ? 'selected' : ''}>35% AKG</option><option value="100" ${pageState.analysis.target_mode === '100' ? 'selected' : ''}>100% AKG</option><option value="custom" ${pageState.analysis.target_mode === 'custom' ? 'selected' : ''}>Custom</option></select></div>
                    <div class="erp-field"><label>Target Harga/Porsi</label><input class="erp-input" name="target_budget" type="number" min="0" value="${esc(pageState.analysis.target_budget)}"></div>
                    <div class="erp-field"><label>Jumlah Sasaran</label><input class="erp-input" name="target_portions" type="number" min="1" value="${esc(pageState.analysis.target_portions)}"></div>
                </div>
                <div class="nutrition-target-grid">
                    ${nutrientFields.slice(0, 8).map(([name, label, unit]) => `
                        <label class="nutrition-target-field">
                            <span>${esc(label)} (${esc(unit)})</span>
                            <input class="erp-input" name="${esc(name)}" type="number" min="0" step="0.01" value="${esc(pageState.analysis[name] || 0)}">
                        </label>
                    `).join('')}
                </div>
                <div class="erp-inline-actions"><button class="erp-btn primary" type="submit">Terapkan Target</button></div>
            </form>
            <aside class="nutrition-panel">
                <div class="nutrition-panel-head">
                    <span class="nutrition-kicker">Referensi dokumen</span>
                    <h3>Logika yang dipakai</h3>
                </div>
                <div class="nutrition-rule-list">
                    <div><strong>Input sasaran</strong><span>PAUD/TK, SD, SMP, SMA, ibu hamil, ibu menyusui, bayi, balita, dan pelaksana.</span></div>
                    <div><strong>Target gizi</strong><span>Energi, protein, lemak, karbohidrat, vitamin A, asam folat, vitamin C, dan zat besi.</span></div>
                    <div><strong>Budget guardrail</strong><span>Target harga per porsi dipakai untuk membaca biaya menu dan kebutuhan belanja.</span></div>
                </div>
            </aside>
        </div>
    `;
}

function renderFoodAnalysis() {
    const summary = analysisSummary();
    const tableRows = summary.rows.map((row, index) => `
        <tr>
            <td><strong>${esc(row.name)}</strong><div class="text-xs text-secondary-foreground">${esc(row.item.category || 'Makanan')}</div></td>
            <td>${money(row.gram)} g</td>
            <td>${money(row.needKg)} kg</td>
            <td>${money(row.stockQty)} ${esc(row.item.unit || 'kg')}</td>
            <td>${money(row.shortageQty)} ${esc(row.item.unit || 'kg')}</td>
            <td>Rp ${money(row.price_per_kg)}</td>
            <td>Rp ${money(row.cost)}</td>
            <td>${statusBadge(row.status)}</td>
            <td><button class="kt-btn kt-btn-xs kt-btn-outline" data-remove-food-index="${index}" type="button">Hapus</button></td>
        </tr>
    `).join('');

    return `
        <div class="food-analysis-workspace">
            <section class="nutrition-lab-header">
                <div>
                    <span class="nutrition-kicker">Food Analysis Lab</span>
                    <h2>Rancang menu yang memenuhi gizi, harga, dan stok.</h2>
                    <p>Tambahkan bahan makanan, gram per porsi, harga standar/kg, dan sistem menghitung biaya, kebutuhan kg, shortage stok, serta pemenuhan target gizi.</p>
                </div>
                <div class="nutrition-lab-score">
                    <span>Skor target gizi</span>
                    <strong>${pct(summary.targetScore)}</strong>
                    <small>${summary.rows.length} bahan, ${summary.shortageCount} shortage</small>
                </div>
            </section>
            <div class="nutrition-workspace two">
                <form class="nutrition-panel" data-nutritionist-form="food-analysis">
                    <div class="nutrition-panel-head">
                        <span class="nutrition-kicker">Composer</span>
                        <h3>Parameter dan bahan</h3>
                    </div>
                    <div class="erp-form-grid">
                        <div class="erp-field"><label>Jumlah Sasaran</label><input class="erp-input" name="target_portions" type="number" min="1" value="${esc(pageState.analysis.target_portions)}"></div>
                        <div class="erp-field"><label>Buffer Stock (%)</label><input class="erp-input" name="buffer_stock" type="number" min="0" value="${esc(pageState.analysis.buffer_stock)}"></div>
                        <div class="erp-field"><label>Target Harga/Porsi</label><input class="erp-input" name="target_budget" type="number" min="0" value="${esc(pageState.analysis.target_budget)}"></div>
                    </div>
                    <div class="nutrition-add-food">
                        <label class="erp-field"><span>Pilih Makanan</span><input class="erp-input" name="food_name" list="food-analysis-options" placeholder="Ketik bahan dari inventory..."></label>
                        <datalist id="food-analysis-options">${pageState.state.items.slice(0, 300).map((item) => `<option value="${esc(item.name)}"></option>`).join('')}</datalist>
                        <label class="erp-field"><span>Gram/Porsi</span><input class="erp-input" name="gram" type="number" min="0" value="100"></label>
                        <label class="erp-field"><span>Harga/kg</span><input class="erp-input" name="price_per_kg" type="number" min="0" value="0"></label>
                        <button class="erp-btn primary" data-action="add-food-analysis-item" type="button">Tambah Bahan</button>
                    </div>
                    <div class="nutrition-target-grid compact">
                        ${nutrientFields.slice(0, 8).map(([name, label, unit]) => `
                            <label class="nutrition-target-field">
                                <span>${esc(label)} (${esc(unit)})</span>
                                <input class="erp-input" name="${esc(name)}" type="number" min="0" step="0.01" value="${esc(pageState.analysis[name] || 0)}">
                            </label>
                        `).join('')}
                    </div>
                    <div class="erp-inline-actions"><button class="erp-btn" type="submit">Refresh Analisis</button><button class="erp-btn" data-action="new-food-analysis-item" type="button">Tambah Master Bahan</button></div>
                </form>
                <aside class="nutrition-panel">
                    <div class="nutrition-panel-head">
                        <span class="nutrition-kicker">Hasil cepat</span>
                        <h3>Cost, stok, dan gizi</h3>
                    </div>
                    <div class="nutrition-result-stack">
                        <div><span>Total belanja</span><strong>Rp ${money(summary.totalCost)}</strong></div>
                        <div><span>Biaya per porsi</span><strong>Rp ${money(summary.costPerPortion)}</strong><small>${summary.costPerPortion <= num(pageState.analysis.target_budget) ? 'Sesuai target harga' : 'Melebihi target harga'}</small></div>
                        <div><span>Shortage stok</span><strong>${summary.shortageCount}</strong><small>Bahan perlu PR atau substitusi</small></div>
                    </div>
                    <div class="nutrition-mini-bars">
                        ${['energy_kcal', 'protein_g', 'fat_g', 'carb_g'].map((key) => {
                            const target = Math.max(num(pageState.analysis[key]), 1);
                            const value = num(summary.actual[key]);
                            const width = Math.min((value / target) * 100, 100);
                            const label = nutrientFields.find(([name]) => name === key)?.[1] || key;
                            return `<div><span>${esc(label)} ${Math.round(value)}/${Math.round(target)}</span><i style="width:${width}%"></i></div>`;
                        }).join('')}
                    </div>
                </aside>
            </div>
            <section class="nutrition-panel">
                <div class="nutrition-panel-head">
                    <span class="nutrition-kicker">Kebutuhan belanja</span>
                    <h3>Detail bahan dan stok</h3>
                </div>
                ${summary.rows.length ? DataTable({ headers: ['Bahan', 'Gram', 'Kebutuhan', 'Stok', 'Shortage', 'Harga/kg', 'Estimasi', 'Status', 'Aksi'], rows: tableRows, emptyText: 'Belum ada bahan.' }) : '<div class="food-analysis-empty">Belum ada bahan. Tambahkan bahan untuk mulai menghitung gizi, belanja, dan stok.</div>'}
            </section>
        </div>
    `;
}

function renderMenuCycle() {
    const rows = pageState.menuCycle.map((row, index) => `
        <tr>
            <td>Hari ${row.day}</td>
            <td>${esc(row.pokok)}</td>
            <td>${esc(row.hewani)}</td>
            <td>${esc(row.nabati)}</td>
            <td>${esc(row.sayur)}</td>
            <td>${esc(row.buah)}</td>
            <td><button class="kt-btn kt-btn-xs kt-btn-outline" data-cycle-remove="${index}" type="button">Hapus</button></td>
        </tr>
    `).join('');
    return `
        <div class="nutrition-workspace two">
            <form class="nutrition-panel" data-nutritionist-form="menu-cycle">
                <div class="nutrition-panel-head"><span class="nutrition-kicker">Menu Cycle Builder</span><h3>Tambah hari menu</h3><p>Format mengikuti pola menu SPPG: makanan pokok, lauk hewani, lauk nabati, sayur, dan buah.</p></div>
                <div class="erp-form-grid">
                    <div class="erp-field"><label>Hari Ke</label><input class="erp-input" name="day" type="number" min="1" value="${pageState.menuCycle.length + 1}"></div>
                    <div class="erp-field"><label>Makanan Pokok</label><input class="erp-input" name="pokok" placeholder="Nasi"></div>
                    <div class="erp-field"><label>Lauk Hewani</label><input class="erp-input" name="hewani" placeholder="Ayam semur"></div>
                    <div class="erp-field"><label>Lauk Nabati</label><input class="erp-input" name="nabati" placeholder="Tempe goreng"></div>
                    <div class="erp-field"><label>Sayur</label><input class="erp-input" name="sayur" placeholder="Bening bayam"></div>
                    <div class="erp-field"><label>Buah</label><input class="erp-input" name="buah" placeholder="Semangka"></div>
                </div>
                <div class="erp-inline-actions"><button class="erp-btn primary" type="submit">Tambah ke Siklus</button><button class="erp-btn" data-action="seed-20-day-cycle" type="button">Generate 20 Hari</button></div>
            </form>
            <section class="nutrition-panel">
                <div class="nutrition-panel-head"><span class="nutrition-kicker">Siklus aktif</span><h3>${pageState.menuCycle.length} hari menu</h3></div>
                ${DataTable({ headers: ['Hari', 'Pokok', 'Hewani', 'Nabati', 'Sayur', 'Buah', 'Aksi'], rows, emptyText: 'Belum ada siklus menu.' })}
            </section>
        </div>
    `;
}

function renderRecipeComposer() {
    const componentRows = pageState.state.recipeComponents.slice(0, 16).map((row) => `<tr><td>${esc(recipeName(row.recipe_id))}</td><td>${esc(itemName(row.item_id))}</td><td>${esc(row.qty_per_portion)} ${esc(row.unit)}</td><td>${esc(row.notes || '-')}</td></tr>`).join('');
    return `
        <div class="nutrition-workspace two">
            <div class="grid gap-5">
                ${renderRecipeForm()}
                ${renderComponentForm()}
            </div>
            <section class="nutrition-panel">
                <div class="nutrition-panel-head"><span class="nutrition-kicker">Komponen resep</span><h3>Bahan per porsi</h3></div>
                ${DataTable({ headers: ['Resep', 'Bahan', 'Qty/Porsi', 'Catatan'], rows: componentRows, emptyText: 'Belum ada komponen resep.' })}
            </section>
        </div>
    `;
}

function renderRequirement() {
    const rows = selectedFoodRows();
    const tableRows = rows.map((row) => {
        const finalQty = row.needKg + (row.needKg * 0.01);
        return `<tr><td>${esc(row.name)}</td><td>${money(row.gram)} g</td><td>${money(row.needKg)} kg</td><td>1%</td><td>${money(finalQty)} kg</td><td>${money(row.stockQty)} ${esc(row.item.unit || 'kg')}</td><td>${money(Math.max(finalQty - row.stockQty, 0))} kg</td><td>Rp ${money(row.cost)}</td></tr>`;
    }).join('');
    return `
        <section class="nutrition-panel">
            <div class="nutrition-panel-head">
                <span class="nutrition-kicker">Belanja & Stock Requirement</span>
                <h3>Kebutuhan bahan pangan final</h3>
                <p>Formula: gram per porsi x jumlah sasaran x buffer, dikonversi kg, lalu ditambah faktor kehilangan/kerusakan 1%.</p>
            </div>
            ${rows.length ? DataTable({ headers: ['Bahan', 'Gram/Porsi', 'Kebutuhan', 'Loss', 'Final', 'Stok', 'Shortage', 'Estimasi'], rows: tableRows, emptyText: 'Belum ada bahan.' }) : '<div class="food-analysis-empty">Tambahkan bahan dari Food Analysis agar kebutuhan belanja bisa dihitung.</div>'}
            <div class="erp-inline-actions module-card-gap"><button class="erp-btn primary" data-jump-view="food-analysis" type="button">Tambah dari Food Analysis</button><a class="erp-btn" href="#inventory/kebutuhan-bahan-harian">Buat Purchase Request</a><a class="erp-btn" href="#inventory/stock-alert">Cek Stock Alert</a></div>
        </section>
    `;
}

function renderQcReceiving() {
    const receivingRows = pageState.state.receivingRecords.slice(0, 20).map((row) => `
        <tr>
            <td>${esc(row.receiving_id)}</td>
            <td>${esc(row.po_id)}</td>
            <td>${esc(itemName(row.item_id))}</td>
            <td>${esc(row.received_qty || '-')}</td>
            <td>${esc(row.temperature || '-')}</td>
            <td>${statusBadge(row.qc_status || 'pending')}</td>
            <td><button class="kt-btn kt-btn-xs kt-btn-outline" data-qc-review="${esc(row.receiving_id)}" type="button">Review</button></td>
        </tr>
    `).join('');
    return `
        <div class="nutrition-workspace two">
            <section class="nutrition-panel">
                <div class="nutrition-panel-head"><span class="nutrition-kicker">SOP Penerimaan</span><h3>Checklist QC bahan masuk</h3><p>Alur: cek dokumen, fisik, timbang, suhu, organoleptik, accept/reject, lalu simpan.</p></div>
                <div class="nutrition-checklist">
                    ${pageState.qcChecks.map((item, index) => `<label><input type="checkbox" data-qc-check="${index}" checked><span>${esc(item)}</span></label>`).join('')}
                </div>
                <div class="erp-inline-actions"><button class="erp-btn primary" data-action="approve-qc-demo" type="button">Simulasikan Accept</button><button class="erp-btn danger" data-action="reject-qc-demo" type="button">Simulasikan Reject</button></div>
            </section>
            <section class="nutrition-panel">
                <div class="nutrition-panel-head"><span class="nutrition-kicker">Receiving Records</span><h3>Item penerimaan terakhir</h3></div>
                ${DataTable({ headers: ['Receiving', 'PO', 'Bahan', 'Qty', 'Suhu', 'QC', 'Aksi'], rows: receivingRows, emptyText: 'Belum ada receiving records.' })}
            </section>
        </div>
    `;
}

function renderReports() {
    const summary = analysisSummary();
    const rows = [
        ['Kelompok sasaran', pageState.analysis.target_group],
        ['Mode AKG', `${pageState.analysis.target_mode}%`],
        ['Jumlah sasaran', money(pageState.analysis.target_portions)],
        ['Siklus menu', `${pageState.menuCycle.length} hari`],
        ['Food cost per porsi', `Rp ${money(summary.costPerPortion)}`],
        ['Total belanja', `Rp ${money(summary.totalCost)}`],
        ['Shortage bahan', summary.shortageCount],
        ['Skor target gizi', pct(summary.targetScore)]
    ].map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`).join('');
    return `
        <section class="nutrition-panel">
            <div class="nutrition-panel-head"><span class="nutrition-kicker">Nutrition Report</span><h3>Ringkasan untuk Kepala SPPG dan BGN</h3><p>Report menggabungkan target gizi, siklus menu, biaya porsi, kebutuhan bahan, dan risiko shortage.</p></div>
            ${DataTable({ headers: ['Indikator', 'Nilai'], rows, emptyText: 'Belum ada report.' })}
            <div class="erp-inline-actions module-card-gap"><button class="erp-btn primary" data-action="download-nutrition-report" type="button">Unduh CSV</button><button class="erp-btn" data-jump-view="food-analysis" type="button">Update Analisis</button></div>
        </section>
    `;
}

function renderNutritionForm() {
    return `<form class="nutrition-panel" data-nutritionist-form="nutrition"><div class="nutrition-panel-head"><span class="nutrition-kicker">Cek Gizi</span><h3>Validasi menu</h3></div><div class="erp-form-grid">
        <div class="erp-field"><label>Resep</label><select class="erp-select" name="recipe_id" required>${optionRows(pageState.state.recipes, 'recipe_id', 'name', 'Tambah resep dahulu')}</select></div>
        <div class="erp-field"><label>Protein (g)</label><input class="erp-input" name="protein_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Karbohidrat (g)</label><input class="erp-input" name="carb_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Lemak (g)</label><input class="erp-input" name="fat_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Serat (g)</label><input class="erp-input" name="fiber_g" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Skor Manual</label><input class="erp-input" name="score" type="number" min="0" max="100" placeholder="Opsional"></div>
    </div><div class="erp-inline-actions"><button class="erp-btn primary" type="submit">Simpan Cek Gizi</button></div></form>`;
}

function renderRecipeForm() {
    return `<form class="nutrition-panel" data-nutritionist-form="recipe"><div class="nutrition-panel-head"><span class="nutrition-kicker">Resep</span><h3>Tambah resep gizi</h3></div><div class="erp-form-grid">
        <div class="erp-field"><label>Nama Resep</label><input class="erp-input" name="name" required></div>
        <div class="erp-field"><label>Ukuran Porsi</label><input class="erp-input" name="portion_size" placeholder="350 gram" required></div>
        <div class="erp-field"><label>Target Usia</label><input class="erp-input" name="target_age_group" placeholder="SD kelas 1-3"></div>
        <div class="erp-field"><label>Target Energi</label><input class="erp-input" name="energy_target" placeholder="600 kkal"></div>
        <div class="erp-field"><label>Target Protein</label><input class="erp-input" name="protein_target" placeholder="18 gram"></div>
        <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="aktif">Aktif</option><option value="draft">Draft</option><option value="revisi">Revisi</option></select></div>
        <div class="erp-field full"><label>Catatan Ahli Gizi</label><textarea class="erp-textarea" name="notes"></textarea></div>
    </div><div class="erp-inline-actions"><button class="erp-btn primary" type="submit">Simpan Resep</button></div></form>`;
}

function renderComponentForm() {
    return `<form class="nutrition-panel" data-nutritionist-form="component"><div class="nutrition-panel-head"><span class="nutrition-kicker">Komponen</span><h3>Tambah bahan per porsi</h3></div><div class="erp-form-grid">
        <div class="erp-field"><label>Resep</label><select class="erp-select" name="recipe_id" required>${optionRows(pageState.state.recipes, 'recipe_id', 'name', 'Tambah resep dahulu')}</select></div>
        <div class="erp-field"><label>Item Bahan</label><select class="erp-select" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventory dahulu')}</select></div>
        <div class="erp-field"><label>Qty/Porsi</label><input class="erp-input" name="qty_per_portion" type="number" min="0" step="0.01" required></div>
        <div class="erp-field"><label>Satuan</label><input class="erp-input" name="unit"></div>
        <div class="erp-field full"><label>Catatan Substitusi</label><textarea class="erp-textarea" name="notes"></textarea></div>
    </div><div class="erp-inline-actions"><button class="erp-btn primary" type="submit">Simpan Komponen</button></div></form>`;
}

function renderActiveView() {
    const content = {
        overview: renderOverview,
        'food-analysis': renderFoodAnalysis,
        'menu-cycle': renderMenuCycle,
        'recipe-composer': renderRecipeComposer,
        'akg-target': renderAkgTarget,
        requirement: renderRequirement,
        'qc-receiving': renderQcReceiving,
        reports: renderReports
    }[pageState.activeView];
    return content ? content() : renderOverview();
}

function renderNutritionistContent() {
    const root = document.getElementById('nutritionist-root');
    if (!root) return;
    if (pageState.loading) {
        root.innerHTML = LoadingCard({ title: 'Memuat Ahli Gizi', text: 'Mengambil resep, komponen, stok, penerimaan bahan, dan data gizi...' });
        return;
    }
    if (pageState.error) {
        root.innerHTML = ErrorCard({ title: 'Ahli Gizi tidak bisa dimuat', error: pageState.error, action: 'refresh-nutritionist' });
        return;
    }
    root.innerHTML = `${renderLocalNav()}${renderStats()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadNutritionist() {
    pageState.loading = true;
    pageState.error = '';
    renderNutritionistContent();
    try {
        pageState.state = await getNutritionistState();
        if (!pageState.selectedFoods.length) seedSelectedFoodsFromInventory();
    } catch (error) {
        pageState.error = error.message;
    } finally {
        pageState.loading = false;
        renderNutritionistContent();
    }
}

function seedSelectedFoodsFromInventory() {
    const seeds = ['Beras', 'Ayam', 'Telur', 'Tempe', 'Bayam', 'Wortel', 'Semangka'];
    pageState.selectedFoods = seeds.map((name, index) => {
        const item = pageState.state.items.find((row) => String(row.name || '').toLowerCase().includes(name.toLowerCase())) || {};
        return {
            item_id: item.item_id || `manual_${index}`,
            name: item.name || name,
            gram: [100, 50, 55, 50, 35, 20, 80][index] || 50,
            price_per_kg: num(item.unitCost || item.unit_cost) || [14000, 40000, 28000, 18000, 12000, 10000, 9000][index] || 10000,
            energy_kcal: [175, 82, 85, 95, 8, 7, 24][index] || 0,
            protein_g: [3, 11, 6, 9, 1, 0.3, 0.5][index] || 0,
            fat_g: [0.2, 5, 6, 4, 0.1, 0.1, 0.1][index] || 0,
            carb_g: [39, 0, 1, 8, 1, 2, 6][index] || 0,
            vitamin_a_mcg: [0, 15, 70, 0, 140, 167, 28][index] || 0,
            folate_mcg: [8, 4, 24, 45, 58, 5, 3][index] || 0,
            vitamin_c_mg: [0, 0, 0, 0, 20, 3, 8][index] || 0,
            iron_mg: [0.4, 0.6, 1.2, 2, 1.4, 0.3, 0.2][index] || 0
        };
    });
}

function addFoodAnalysisItem(button) {
    const row = button.closest('.nutrition-add-food');
    const foodName = row?.querySelector('[name="food_name"]')?.value?.trim();
    if (!foodName) return;
    const item = itemByName(foodName);
    pageState.selectedFoods.push({
        item_id: item.item_id || `manual_${Date.now()}`,
        name: item.name || foodName,
        gram: num(row.querySelector('[name="gram"]')?.value || 100),
        price_per_kg: num(row.querySelector('[name="price_per_kg"]')?.value || item.unitCost || item.unit_cost || 0),
        energy_kcal: 0,
        protein_g: 0,
        fat_g: 0,
        carb_g: 0,
        vitamin_a_mcg: 0,
        folate_mcg: 0,
        vitamin_c_mg: 0,
        iron_mg: 0
    });
    renderNutritionistContent();
}

function applyAkgPreset(payload) {
    const preset = akgPresets[payload.target_group] || akgPresets['SMP 13-15 tahun'];
    const multiplier = payload.target_mode === '100' ? 100 / 35 : 1;
    pageState.analysis = {
        ...pageState.analysis,
        ...payload,
        ...Object.fromEntries(Object.entries(preset).map(([key, value]) => [key, Number((value * multiplier).toFixed(2))]))
    };
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    if (form.dataset.nutritionistForm === 'food-analysis') {
        pageState.analysis = { ...pageState.analysis, ...payload };
        renderNutritionistContent();
        return;
    }
    if (form.dataset.nutritionistForm === 'akg-target') {
        applyAkgPreset(payload);
        renderNutritionistContent();
        return;
    }
    if (form.dataset.nutritionistForm === 'menu-cycle') {
        pageState.menuCycle.push({
            day: num(payload.day) || pageState.menuCycle.length + 1,
            pokok: payload.pokok || '-',
            hewani: payload.hewani || '-',
            nabati: payload.nabati || '-',
            sayur: payload.sayur || '-',
            buah: payload.buah || '-'
        });
        renderNutritionistContent();
        return;
    }
    if (form.dataset.nutritionistForm === 'recipe') await createRecipe(payload);
    if (form.dataset.nutritionistForm === 'component') await addRecipeComponent(payload, pageState.state);
    if (form.dataset.nutritionistForm === 'nutrition') await createNutritionCheck(payload, pageState.state);
    await loadNutritionist();
}

function seedTwentyDayCycle() {
    const base = [...pageState.menuCycle];
    while (pageState.menuCycle.length < 20) {
        const source = base[pageState.menuCycle.length % base.length];
        pageState.menuCycle.push({ ...source, day: pageState.menuCycle.length + 1 });
    }
    renderNutritionistContent();
}

function downloadNutritionReport() {
    const summary = analysisSummary();
    const lines = [
        ['Indikator', 'Nilai'],
        ['Kelompok sasaran', pageState.analysis.target_group],
        ['Mode AKG', pageState.analysis.target_mode],
        ['Jumlah sasaran', pageState.analysis.target_portions],
        ['Siklus menu', pageState.menuCycle.length],
        ['Food cost per porsi', Math.round(summary.costPerPortion)],
        ['Total belanja', Math.round(summary.totalCost)],
        ['Shortage bahan', summary.shortageCount],
        ['Skor target gizi', Math.round(summary.targetScore)]
    ];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nutrition-report-sipagi-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function bindNutritionistEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('nutritionist-root')) return;
        const viewButton = event.target.closest('[data-nutritionist-view], [data-jump-view]');
        if (viewButton) {
            pageState.activeView = viewButton.dataset.nutritionistView || viewButton.dataset.jumpView;
            renderNutritionistContent();
            return;
        }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'refresh-nutritionist') await loadNutritionist();
        if (action === 'add-food-analysis-item') addFoodAnalysisItem(event.target.closest('[data-action]'));
        if (action === 'new-food-analysis-item') window.location.hash = 'inventory/master-bahan-baku';
        if (action === 'seed-20-day-cycle') seedTwentyDayCycle();
        if (action === 'download-nutrition-report') downloadNutritionReport();
        if (action === 'approve-qc-demo') window.alert('QC disimulasikan diterima. Nanti ini disambungkan ke approval penerimaan bahan.');
        if (action === 'reject-qc-demo') window.alert('QC disimulasikan ditolak. Nanti ini akan membuat reject reason dan notifikasi supplier.');
        const removeFood = event.target.closest('[data-remove-food-index]');
        if (removeFood) {
            pageState.selectedFoods.splice(Number(removeFood.dataset.removeFoodIndex), 1);
            renderNutritionistContent();
        }
        const removeCycle = event.target.closest('[data-cycle-remove]');
        if (removeCycle) {
            pageState.menuCycle.splice(Number(removeCycle.dataset.cycleRemove), 1);
            pageState.menuCycle = pageState.menuCycle.map((row, index) => ({ ...row, day: index + 1 }));
            renderNutritionistContent();
        }
    });
    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('nutritionist-root') || !event.target.matches('[data-nutritionist-form]')) return;
        event.preventDefault();
        try {
            await handleSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            await loadNutritionist();
        }
    });
    document.addEventListener('input', (event) => {
        const form = event.target.closest('[data-nutritionist-form="food-analysis"]');
        if (!document.getElementById('nutritionist-root') || !form) return;
        pageState.analysis = { ...pageState.analysis, ...serializeForm(form) };
    });
}

let eventsBound = false;

export function NutritionistPage() {
    return '<div id="nutritionist-root"></div>';
}

export function initNutritionistPage(initialView = 'overview') {
    pageState.activeView = views.some((view) => view.id === initialView) ? initialView : 'overview';
    if (!eventsBound) {
        bindNutritionistEvents();
        eventsBound = true;
    }
    loadNutritionist();
}
