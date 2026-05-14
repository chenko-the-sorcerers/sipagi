import { upsertSheetRow } from '../app/shared/services/googleSheetsApi.js';

const USER_ID = 'kepala_sppg';
const now = new Date().toISOString();

const lpj = {
    title: 'Laporan Kegiatan Periode 1 MBG',
    document_number: '01/LPA-YIRS/XI/2025',
    period: '20 Oktober - 01 November 2025',
    period_start: '2025-10-20',
    period_end: '2025-11-01',
    current_beneficiaries: 2081,
    raw_material_budget: 181392000,
    raw_material_realized: 181078500,
    operational_budget: 59436000,
    operational_realized: 59423500,
    rent_budget: 72000000,
    rent_realized: 72000000,
    total_requested: 312828000,
    total_realized: 312502000,
    remaining_fund: 326000,
    next_period: '03 November - 10 November 2025',
    attachments: ['Foto Menu', 'Kwitansi', 'Rekapan Absen dan Gaji', 'SPM', 'Foto Distribusi Harian Dapur']
};

const daily = [
    ['2025-10-20', 1222, 1222, 11134000, 15968000],
    ['2025-10-21', 1222, 1222, 11134000, 11651000],
    ['2025-10-22', 1222, 1222, 11134000, 9788000],
    ['2025-10-23', 1222, 1222, 11134000, 15289000],
    ['2025-10-24', 1222, 1222, 11134000, 9734000],
    ['2025-10-25', 1222, 1222, 11134000, 11134000],
    ['2025-10-27', 2079, 2079, 19090000, 15466000],
    ['2025-10-28', 2079, 2079, 19090000, 25390000],
    ['2025-10-29', 2079, 2079, 19090000, 15940000],
    ['2025-10-30', 2081, 2081, 19106000, 15956000],
    ['2025-10-31', 2081, 2081, 19106000, 15691500],
    ['2025-11-01', 2081, 2081, 19106000, 19071000]
];

const budgets = [
    ['mbg budget bahan baku periode 1', 'Bahan Baku', lpj.raw_material_budget, lpj.raw_material_realized],
    ['mbg budget operasional periode 1', 'Operasional', lpj.operational_budget, lpj.operational_realized],
    ['mbg budget sewa fasilitas periode 1', 'Sewa Fasilitas', lpj.rent_budget, lpj.rent_realized]
];

const marketPrices = [
    ['Beras', 'kg', 13600, 'Rata-rata pembelian LPJ'],
    ['Ayam Fillet', 'kg', 55000, 'Menu chicken katsu'],
    ['Telur Ayam', 'kg', 33000, 'Menu telur rolade / dadar'],
    ['Tahu', 'pcs', 400, 'Supplier lokal'],
    ['Tempe', 'pcs', 4500, 'Supplier lokal'],
    ['Wortel', 'kg', 20000, 'Sayuran'],
    ['Minyak Sayur', 'karton', 245000, 'Bahan masak utama'],
    ['Saus BBQ Delmonte', 'kg', 34000, 'Menu saus barbeque']
];

async function seed() {
    await upsertSheetRow('settings', 'mbg lpj periode 1 2025', {
        setting_id: 'mbg lpj periode 1 2025',
        key: 'mbg lpj periode 1 2025',
        value: JSON.stringify(lpj),
        description: 'Ringkasan LPJ MBG periode 20 Oktober sampai 01 November 2025',
        updated_at: now,
        updated_by: USER_ID
    }, 'setting_id', USER_ID);

    for (const [date, target, delivered, budget, actual] of daily) {
        await upsertSheetRow('daily_reports', `mbg harian ${date}`, {
            report_id: `mbg harian ${date}`,
            sppg_id: 'sppg-utama',
            report_date: date,
            target_portion: target,
            delivered_portion: delivered,
            qc_summary: 'Produksi berjalan sesuai jadwal operasional dapur',
            waste_summary: `RAB bahan baku Rp ${budget.toLocaleString('id-ID')}, realisasi Rp ${actual.toLocaleString('id-ID')}`,
            issue_summary: actual > budget ? 'Realisasi melebihi pagu bahan baku harian' : 'Realisasi dalam pagu bahan baku harian',
            status: 'final',
            created_at: now
        }, 'report_id', USER_ID);
    }

    for (const [budget_id, module, budget_amount, actual_amount] of budgets) {
        await upsertSheetRow('budgets', budget_id, {
            budget_id,
            period: '2025-10-20 sampai 2025-11-01',
            module,
            budget_amount,
            actual_amount,
            variance_amount: budget_amount - actual_amount,
            status: 'final'
        }, 'budget_id', USER_ID);
    }

    for (const [name, unit, price, note] of marketPrices) {
        const id = `mbg survei harga ${name.toLowerCase()}`;
        await upsertSheetRow('settings', id, {
            setting_id: id,
            key: id,
            value: JSON.stringify({ name, unit, price, note, period: lpj.period }),
            description: 'Survei harga pasar supplier lokal MBG',
            updated_at: now,
            updated_by: USER_ID
        }, 'setting_id', USER_ID);
    }
}

await seed();
console.log('Seed Dashboard MBG selesai');

