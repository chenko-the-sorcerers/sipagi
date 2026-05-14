import { upsertSheetRow } from '../app/shared/services/googleSheetsApi.js';

const USER_ID = 'nutrition_data_seed';
const today = '2026-05-11';

const foods = [
    ['food_beras_putih', 'FOOD-CARB-0001', 'Beras putih', 'karbohidrat', 'kg', 300, 13800, 360, 7.1, 0.7, 78.9, 'TKPI/USDA reference, raw rice'],
    ['food_nasi_putih', 'FOOD-COOK-0001', 'Nasi putih matang', 'komponen matang', 'kg', 120, 0, 129, 2.66, 0.28, 27.9, 'FatSecret Indonesia 100g nasi putih'],
    ['food_dada_ayam', 'FOOD-PROT-0001', 'Dada ayam fillet tanpa kulit', 'protein hewani', 'kg', 80, 42000, 120, 22.5, 2.6, 0, 'USDA FoodData Central/FatSecret reference'],
    ['food_telur_ayam', 'FOOD-PROT-0002', 'Telur ayam', 'protein hewani', 'kg', 60, 29200, 143, 12.6, 9.5, 0.7, 'TKPI/USDA reference'],
    ['food_tahu_putih', 'FOOD-PROT-0003', 'Tahu putih', 'protein nabati', 'kg', 70, 12000, 80, 10.9, 4.7, 0.8, 'TKPI reference'],
    ['food_tempe', 'FOOD-PROT-0004', 'Tempe kedelai', 'protein nabati', 'kg', 70, 18000, 201, 20.8, 8.8, 13.5, 'TKPI reference'],
    ['food_wortel', 'FOOD-VEG-0001', 'Wortel', 'sayur', 'kg', 50, 9000, 41, 0.93, 0.24, 9.58, 'USDA FoodData Central carrots raw'],
    ['food_buncis', 'FOOD-VEG-0002', 'Buncis', 'sayur', 'kg', 40, 14000, 31, 1.8, 0.2, 7.0, 'USDA/TKPI reference'],
    ['food_kol', 'FOOD-VEG-0003', 'Kol putih', 'sayur', 'kg', 45, 8000, 25, 1.3, 0.1, 5.8, 'USDA/TKPI reference'],
    ['food_bayam', 'FOOD-VEG-0004', 'Bayam', 'sayur', 'kg', 35, 11000, 23, 2.9, 0.4, 3.6, 'USDA/TKPI reference'],
    ['food_brokoli', 'FOOD-VEG-0005', 'Brokoli', 'sayur', 'kg', 30, 26000, 34, 2.8, 0.4, 6.6, 'USDA reference'],
    ['food_kentang', 'FOOD-CARB-0002', 'Kentang', 'karbohidrat', 'kg', 60, 16000, 77, 2.0, 0.1, 17.5, 'USDA/TKPI reference'],
    ['food_minyak', 'FOOD-FAT-0001', 'Minyak goreng', 'lemak', 'liter', 40, 16500, 884, 0, 100, 0, 'USDA/TKPI vegetable oil reference'],
    ['food_tepung_terigu', 'FOOD-DRY-0001', 'Tepung terigu', 'bahan kering', 'kg', 50, 12500, 364, 10.3, 1.0, 76.3, 'USDA flour reference'],
    ['food_tepung_roti_panko', 'FOOD-DRY-0002', 'Tepung roti panko', 'bahan kering', 'kg', 35, 28000, 376, 10.9, 1.5, 76.8, 'FatSecret Tesco Panko Breadcrumbs 100g'],
    ['food_telur_kocok', 'FOOD-PREP-0001', 'Telur kocok breading', 'komponen prep', 'kg', 20, 29200, 143, 12.6, 9.5, 0.7, 'USDA/TKPI egg reference'],
    ['food_bawang_putih', 'FOOD-SPICE-0001', 'Bawang putih', 'bumbu', 'kg', 10, 34000, 149, 6.4, 0.5, 33.1, 'USDA reference'],
    ['food_bawang_bombay', 'FOOD-SPICE-0002', 'Bawang bombay', 'bumbu', 'kg', 12, 22000, 40, 1.1, 0.1, 9.3, 'USDA reference'],
    ['food_garam', 'FOOD-SPICE-0003', 'Garam', 'bumbu', 'kg', 15, 6000, 0, 0, 0, 0, 'USDA salt reference'],
    ['food_merica', 'FOOD-SPICE-0004', 'Merica bubuk', 'bumbu', 'kg', 4, 98000, 251, 10.4, 3.3, 64, 'USDA spice reference'],
    ['food_gula_pasir', 'FOOD-SPICE-0005', 'Gula pasir', 'bumbu', 'kg', 30, 17000, 387, 0, 0, 100, 'USDA sugar reference'],
    ['food_kecap_manis', 'FOOD-SAUC-0001', 'Kecap manis', 'saus', 'liter', 25, 21000, 275, 6, 0, 60, 'Label/TKPI estimate'],
    ['food_saus_tomat', 'FOOD-SAUC-0002', 'Saus tomat', 'saus', 'kg', 20, 18000, 112, 1.7, 0.2, 26, 'USDA ketchup reference'],
    ['food_saus_bbq', 'FOOD-SAUC-0003', 'Saus barbeque matang', 'komponen saus', 'kg', 15, 0, 172, 1.2, 0.5, 41, 'USDA/FatSecret barbecue sauce estimate'],
    ['food_cuka', 'FOOD-SAUC-0004', 'Cuka makan', 'bumbu', 'liter', 8, 11000, 18, 0, 0, 0.04, 'USDA vinegar reference'],
    ['food_susu_uht', 'FOOD-DAIRY-0001', 'Susu UHT plain', 'susu', 'liter', 30, 17500, 61, 3.2, 3.3, 4.8, 'USDA milk whole reference'],
    ['food_pisang', 'FOOD-FRUIT-0001', 'Pisang ambon', 'buah', 'kg', 45, 15000, 89, 1.1, 0.3, 22.8, 'USDA/TKPI banana reference'],
    ['food_semangka', 'FOOD-FRUIT-0002', 'Semangka', 'buah', 'kg', 50, 9000, 30, 0.6, 0.2, 7.6, 'USDA watermelon reference'],
    ['food_apel', 'FOOD-FRUIT-0003', 'Apel', 'buah', 'kg', 35, 28000, 52, 0.3, 0.2, 13.8, 'USDA apple reference'],
    ['food_air', 'FOOD-BASIC-0001', 'Air matang', 'cairan', 'liter', 200, 0, 0, 0, 0, 0, 'Water']
];

const recipes = [
    ['recipe_nasi_putih_component', 'Komponen Nasi Putih', '180 g nasi matang', 'SD kelas 1-6'],
    ['recipe_ayam_katsu_component', 'Komponen Ayam Katsu', '90 g ayam katsu matang', 'SD kelas 1-6'],
    ['recipe_saus_bbq_component', 'Komponen Saus Barbeque', '25 g saus matang', 'SD kelas 1-6'],
    ['recipe_nasi_ayam_katsu_bbq', 'Nasi Ayam Katsu Saus Barbeque', '1 paket makan siang', 'SD kelas 1-6']
];

const components = [
    ['rc_nasi_beras', 'recipe_nasi_putih_component', 'food_beras_putih', 0.07, 'kg', 'konversi beras ke nasi matang'],
    ['rc_nasi_air', 'recipe_nasi_putih_component', 'food_air', 0.14, 'liter', 'air masak nasi'],
    ['rc_katsu_ayam', 'recipe_ayam_katsu_component', 'food_dada_ayam', 0.09, 'kg', 'protein utama'],
    ['rc_katsu_terigu', 'recipe_ayam_katsu_component', 'food_tepung_terigu', 0.012, 'kg', 'coating pertama'],
    ['rc_katsu_telur', 'recipe_ayam_katsu_component', 'food_telur_kocok', 0.018, 'kg', 'perekat breading'],
    ['rc_katsu_panko', 'recipe_ayam_katsu_component', 'food_tepung_roti_panko', 0.025, 'kg', 'coating renyah'],
    ['rc_katsu_minyak', 'recipe_ayam_katsu_component', 'food_minyak', 0.008, 'liter', 'serapan minyak estimasi'],
    ['rc_bbq_tomat', 'recipe_saus_bbq_component', 'food_saus_tomat', 0.018, 'kg', 'base saus'],
    ['rc_bbq_kecap', 'recipe_saus_bbq_component', 'food_kecap_manis', 0.008, 'liter', 'rasa manis gurih'],
    ['rc_bbq_bawang', 'recipe_saus_bbq_component', 'food_bawang_bombay', 0.006, 'kg', 'aroma'],
    ['rc_menu_nasi', 'recipe_nasi_ayam_katsu_bbq', 'food_nasi_putih', 0.18, 'kg', 'komponen nasi matang'],
    ['rc_menu_katsu', 'recipe_nasi_ayam_katsu_bbq', 'food_dada_ayam', 0.09, 'kg', 'komponen ayam katsu'],
    ['rc_menu_saus', 'recipe_nasi_ayam_katsu_bbq', 'food_saus_bbq', 0.025, 'kg', 'komponen saus barbeque'],
    ['rc_menu_wortel', 'recipe_nasi_ayam_katsu_bbq', 'food_wortel', 0.035, 'kg', 'sayur pendamping'],
    ['rc_menu_buncis', 'recipe_nasi_ayam_katsu_bbq', 'food_buncis', 0.025, 'kg', 'sayur pendamping'],
    ['rc_menu_pisang', 'recipe_nasi_ayam_katsu_bbq', 'food_pisang', 0.08, 'kg', 'buah']
];

async function write(sheet, id, row, idField) {
    await upsertSheetRow(sheet, id, row, idField, USER_ID);
    process.stdout.write('.');
}

for (const [item_id, sku, name, category, unit, min_stock, unit_cost, kcal, protein, fat, carb, source_ref] of foods) {
    await write('items', item_id, {
        item_id, sku, barcode_code: '', name, category, unit, min_stock, unit_cost,
        expiry_tracking: category.includes('kering') || category === 'bumbu' ? 'tidak' : 'ya',
        status: 'aktif', created_at: today, updated_at: today
    }, 'item_id');
    await write('settings', `nutrition_${item_id}`, {
        setting_id: `nutrition_${item_id}`,
        key: `nutrition_${item_id}`,
        value: JSON.stringify({ item_id, name, serving_g: 100, kcal, protein_g: protein, fat_g: fat, carb_g: carb, source_ref }),
        description: 'Metadata gizi bahan makanan per 100g untuk component builder',
        updated_at: `${today}T09:00:00+07:00`,
        updated_by: USER_ID
    }, 'setting_id');
}

for (const [recipe_id, name, portion_size, target_age_group] of recipes) {
    await write('recipes', recipe_id, {
        recipe_id, name, portion_size, target_age_group,
        nutrition_target_json: '{}', status: 'aktif', created_by: USER_ID
    }, 'recipe_id');
}

for (const [component_id, recipe_id, item_id, qty_per_portion, unit, notes] of components) {
    await write('recipe_components', component_id, { component_id, recipe_id, item_id, qty_per_portion, unit, notes }, 'component_id');
}

process.stdout.write('\n');
