import { getSheetRows } from '../../../shared/services/googleSheetsApi.js';
import { getCachedSessionUser } from '../../../shared/auth/sessionClient.js';

function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function rows(sheet) {
    try {
        const result = await getSheetRows(sheet);
        return result.rows || [];
    } catch {
        return [];
    }
}

function money(value) {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export async function getDashboardRealConfig(roleId) {
    const [
        production,
        dispatch,
        receipts,
        batches,
        items,
        nutrition,
        cleaning,
        feedback,
        incidents,
        budgets,
        transactions,
        invoices,
        po,
        waste,
        reports
    ] = await Promise.all([
        rows('production_batches'),
        rows('dispatch_orders'),
        rows('delivery_receipts'),
        rows('stock_batches'),
        rows('items'),
        rows('nutrition_checks'),
        rows('cleaning_checklists'),
        rows('school_feedback'),
        rows('incidents'),
        rows('budgets'),
        rows('finance_transactions'),
        rows('supplier_invoices'),
        rows('purchase_orders'),
        rows('waste_records'),
        rows('daily_reports')
    ]);

    const totalRows = [
        production,
        dispatch,
        receipts,
        batches,
        items,
        nutrition,
        cleaning,
        feedback,
        incidents,
        budgets,
        transactions,
        invoices,
        po,
        waste,
        reports
    ].reduce((sum, list) => sum + list.length, 0);
    const sessionUser = getCachedSessionUser();
    if (!totalRows && (!sessionUser || sessionUser.provider === 'demo' || sessionUser.sppgCode === 'sppg_nakala' || sessionUser.sppgId === 'sppg_nakala')) {
        return null;
    }

    const targetPortion = production.reduce((sum, row) => sum + num(row.target_portion), 0);
    const actualPortion = production.reduce((sum, row) => sum + num(row.actual_portion), 0);
    const dispatched = dispatch.reduce((sum, row) => sum + num(row.portion_qty), 0);
    const received = receipts.reduce((sum, row) => sum + num(row.received_qty), 0);
    const inventoryValue = batches.reduce((sum, row) => {
        const item = items.find((candidate) => candidate.item_id === row.item_id);
        return sum + num(row.qty_current) * num(item?.unit_cost);
    }, 0);
    const lowStock = items.filter((item) => {
        const qty = batches.filter((batch) => batch.item_id === item.item_id).reduce((sum, batch) => sum + num(batch.qty_current), 0);
        return qty <= num(item.min_stock);
    }).length;
    const qcPass = nutrition.filter((row) => num(row.score) >= 85).length;
    const qcRate = nutrition.length ? (qcPass / nutrition.length) * 100 : 0;
    const cleaningDone = cleaning.filter((row) => ['selesai', 'done', 'pass'].includes(String(row.status).toLowerCase())).length;
    const cleaningRate = cleaning.length ? (cleaningDone / cleaning.length) * 100 : 0;
    const avgRating = feedback.length ? feedback.reduce((sum, row) => sum + num(row.rating), 0) / feedback.length : 0;
    const budgetTotal = budgets.reduce((sum, row) => sum + num(row.budget_amount), 0);
    const budgetActual = budgets.reduce((sum, row) => sum + num(row.actual_amount), 0);
    const debit = transactions.filter((row) => row.type === 'debit').reduce((sum, row) => sum + num(row.amount), 0);
    const credit = transactions.filter((row) => row.type === 'credit').reduce((sum, row) => sum + num(row.amount), 0);
    const unpaidInvoices = invoices.filter((row) => row.payment_status !== 'lunas').length;
    const poPending = po.filter((row) => !['received', 'closed', 'selesai'].includes(String(row.status).toLowerCase())).length;
    const wasteValue = waste.reduce((sum, row) => sum + num(row.cost_estimate), 0);
    const latestReport = reports.at(-1);
    const isSeededNakalaSession = !sessionUser || sessionUser.provider === 'demo' || sessionUser.sppgCode === 'sppg_nakala' || sessionUser.sppgId === 'sppg_nakala';
    const hasMeaningfulDashboardData = [
        targetPortion,
        actualPortion,
        dispatched,
        received,
        inventoryValue,
        budgetTotal,
        budgetActual,
        debit,
        credit,
        wasteValue,
        nutrition.length,
        cleaning.length,
        feedback.length,
        incidents.length,
        invoices.length,
        po.length
    ].some((value) => num(value) > 0);

    if (isSeededNakalaSession && !hasMeaningfulDashboardData) {
        return null;
    }

    return {
        lastSync: 'Data terbaru',
        isEmptyTenant: totalRows === 0,
        metrics: [
            { label: 'Produksi Hari Ini', value: actualPortion.toLocaleString('id-ID'), unit: 'porsi', note: `${targetPortion ? ((actualPortion / targetPortion) * 100).toFixed(1) : 0}% dari target`, tone: actualPortion >= targetPortion * 0.95 ? 'success' : 'warning' },
            { label: 'Distribusi Hari Ini', value: dispatched.toLocaleString('id-ID'), unit: 'porsi', note: `${received.toLocaleString('id-ID')} diterima sekolah`, tone: dispatched === received ? 'success' : 'warning' },
            { label: 'Nilai Stok', value: money(inventoryValue), unit: '', note: `${lowStock} bahan di bawah minimum`, tone: lowStock ? 'warning' : 'success' },
            { label: 'Tingkat QC Lolos', value: `${qcRate.toFixed(1)}%`, unit: '', note: `${qcPass}/${nutrition.length || 0} cek gizi lolos`, tone: qcRate >= 90 ? 'success' : 'warning' },
            { label: 'Kepatuhan Sanitasi', value: `${cleaningRate.toFixed(1)}%`, unit: '', note: `${cleaningDone}/${cleaning.length || 0} checklist selesai`, tone: cleaningRate >= 95 ? 'success' : 'warning' },
            { label: 'Kepuasan Penerima', value: avgRating ? avgRating.toFixed(1) : '-', unit: '/ 5', note: `${feedback.length} feedback sekolah`, tone: avgRating >= 4 ? 'success' : 'warning' }
        ],
        budget: [
            ['Anggaran', money(budgetTotal), `${budgets.length} pos budget`],
            ['Realisasi', money(budgetActual), `${budgetTotal ? ((budgetActual / budgetTotal) * 100).toFixed(1) : 0}% dari anggaran`],
            ['Saldo Transaksi', money(debit - credit), `${transactions.length} jurnal`],
            ['Faktur Terbuka', String(unpaidInvoices), `${invoices.length} faktur supplier`]
        ],
        chart: {
            title: 'Produksi, Distribusi, dan Penerimaan',
            subtitle: 'Berdasarkan data operasional terakhir',
            labels: ['Target', 'Produksi', 'Distribusi', 'Diterima'],
            series: [
                { label: 'Porsi', color: 'primary', values: [targetPortion, actualPortion, dispatched, received].map((value) => Math.max(value, 0)) }
            ]
        },
        sections: [
            { type: 'queue', title: 'Prioritas & Perhatian', badge: String(incidents.length + lowStock + unpaidInvoices), items: [
                [`${unpaidInvoices} faktur belum lunas`, 'Perlu follow-up pembayaran', unpaidInvoices ? 'warning' : 'success'],
                [`${lowStock} bahan mendekati minimum`, 'Cek rencana pengadaan', lowStock ? 'warning' : 'success'],
                [`${incidents.length} insiden aktif`, latestReport?.issue_summary || 'Tidak ada catatan', incidents.length ? 'danger' : 'success'],
                [`${poPending} PO belum selesai`, 'Pantau receiving dan invoice', poPending ? 'warning' : 'success']
            ] },
            { type: 'snapshot', title: 'Snapshot Data Hari Ini', rows: [
                ['Produksi aktual', `${actualPortion.toLocaleString('id-ID')} porsi`, actualPortion >= targetPortion * 0.95 ? 'Sesuai' : 'Perhatian'],
                ['Distribusi', `${dispatched.toLocaleString('id-ID')} porsi`, dispatched === received ? 'Sesuai' : 'Selisih'],
                ['Waste tercatat', money(wasteValue), wasteValue ? 'Perhatian' : 'Aman'],
                ['QC summary', latestReport?.qc_summary || 'Belum ada laporan', qcRate >= 90 ? 'Aman' : 'Perhatian']
            ] }
        ]
    };
}
