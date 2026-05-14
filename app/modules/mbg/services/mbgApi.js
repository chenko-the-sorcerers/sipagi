import { getSheetRows } from '../../../shared/services/googleSheetsApi.js';

function numberValue(value) {
    const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

async function safeRows(sheet) {
    try {
        const result = await getSheetRows(sheet);
        return Array.isArray(result.rows) ? result.rows : [];
    } catch {
        return [];
    }
}

function parseSettings(rows, prefix) {
    return rows
        .filter((row) => String(row.key || '').startsWith(prefix))
        .map((row) => {
            try {
                return JSON.parse(row.value || '{}');
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

function latest(rows, field) {
    return [...rows].sort((a, b) => String(b[field] || '').localeCompare(String(a[field] || '')))[0] || {};
}

export function humanLabel(value) {
    return String(value ?? '-').replaceAll('_', ' ').replaceAll('-', ' ');
}

export async function getMbgState() {
    const [settings, schools, beneficiaries, dailyReports, budgets, transactions, dispatchOrders, receipts, wasteRecords, stockBatches, items, vendors, invoices, complianceChecks, cleaning, incidents, productionBatches] = await Promise.all([
        safeRows('settings'),
        safeRows('schools'),
        safeRows('beneficiaries'),
        safeRows('daily_reports'),
        safeRows('budgets'),
        safeRows('finance_transactions'),
        safeRows('dispatch_orders'),
        safeRows('delivery_receipts'),
        safeRows('waste_records'),
        safeRows('stock_batches'),
        safeRows('items'),
        safeRows('vendors'),
        safeRows('supplier_invoices'),
        safeRows('compliance_checks'),
        safeRows('cleaning_checklists'),
        safeRows('incidents'),
        safeRows('production_batches')
    ]);

    return {
        lpj: latest(parseSettings(settings, 'mbg lpj periode '), 'period_end') || {},
        marketPrices: parseSettings(settings, 'mbg survei harga '),
        schools,
        beneficiaries,
        dailyReports,
        budgets,
        transactions,
        dispatchOrders,
        receipts,
        wasteRecords,
        stockBatches,
        items,
        vendors,
        invoices,
        complianceChecks,
        cleaning,
        incidents,
        productionBatches
    };
}

export function getMbgSummary(state) {
    const target = state.dailyReports.reduce((sum, row) => sum + numberValue(row.target_portion), 0);
    const delivered = state.dailyReports.reduce((sum, row) => sum + numberValue(row.delivered_portion), 0);
    const budget = state.budgets.reduce((sum, row) => sum + numberValue(row.budget_amount), 0) || numberValue(state.lpj.total_requested);
    const actual = state.budgets.reduce((sum, row) => sum + numberValue(row.actual_amount), 0) || numberValue(state.lpj.total_realized);
    const waste = state.wasteRecords.reduce((sum, row) => sum + numberValue(row.cost_estimate), 0);
    const receipts = state.receipts.reduce((sum, row) => sum + numberValue(row.received_qty), 0);

    return {
        target,
        delivered,
        receipts,
        schools: state.schools.length,
        beneficiaries: state.beneficiaries.length || numberValue(state.lpj.current_beneficiaries),
        budget,
        actual,
        remaining: budget - actual || numberValue(state.lpj.remaining_fund),
        waste,
        vendors: state.vendors.length,
        invoicesOpen: state.invoices.filter((row) => row.payment_status !== 'lunas').length,
        incidentsOpen: state.incidents.filter((row) => !['selesai', 'closed'].includes(String(row.status || '').toLowerCase())).length
    };
}

