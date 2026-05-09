import {
    createSheetRow,
    getSheetRows,
    updateSheetRow
} from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'akuntan_pengadaan';

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function activeRows(rows) {
    return rows.filter((row) => row.status !== 'deleted');
}

function findById(rows, idField, id) {
    return rows.find((row) => row[idField] === id);
}

export async function getFinanceState() {
    const [
        accounts,
        transactions,
        assets,
        budgets,
        payments,
        invoices,
        purchaseOrders
    ] = await Promise.all([
        getSheetRows('accounts'),
        getSheetRows('finance_transactions'),
        getSheetRows('assets'),
        getSheetRows('budgets'),
        getSheetRows('payments'),
        getSheetRows('supplier_invoices'),
        getSheetRows('purchase_orders')
    ]);

    return {
        accounts: activeRows(accounts.rows || []),
        transactions: transactions.rows || [],
        assets: activeRows(assets.rows || []),
        budgets: budgets.rows || [],
        payments: payments.rows || [],
        invoices: invoices.rows || [],
        purchaseOrders: purchaseOrders.rows || []
    };
}

export function getFinanceSummaryFromState(state) {
    const debit = state.transactions
        .filter((row) => row.type === 'debit')
        .reduce((sum, row) => sum + numberValue(row.amount), 0);
    const credit = state.transactions
        .filter((row) => row.type === 'credit')
        .reduce((sum, row) => sum + numberValue(row.amount), 0);
    const assetValue = state.assets.reduce((sum, row) => sum + numberValue(row.purchase_value), 0);
    const budgetAmount = state.budgets.reduce((sum, row) => sum + numberValue(row.budget_amount), 0);
    const budgetActual = state.budgets.reduce((sum, row) => sum + numberValue(row.actual_amount), 0);
    const unpaidInvoices = state.invoices.filter((row) => row.payment_status !== 'lunas').length;

    return {
        debit,
        credit,
        balance: debit - credit,
        assetValue,
        budgetVariance: budgetAmount - budgetActual,
        unpaidInvoices
    };
}

export async function createAccount(payload) {
    if (!payload.account_code) throw new Error('Kode akun wajib diisi');
    if (!payload.account_name) throw new Error('Nama akun wajib diisi');
    return createSheetRow('accounts', {
        account_code: payload.account_code,
        account_name: payload.account_name,
        type: payload.type,
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function createFinanceTransaction(payload, state) {
    const account = findById(state.accounts, 'account_id', payload.account_id);
    const amount = numberValue(payload.amount);
    if (!account) throw new Error('Akun wajib dipilih');
    if (amount <= 0) throw new Error('Nominal harus lebih dari nol');

    return createSheetRow('finance_transactions', {
        date: payload.date || todayDate(),
        account_id: payload.account_id,
        type: payload.type,
        amount,
        description: payload.description,
        reference_type: payload.reference_type || 'manual',
        reference_id: payload.reference_id || '',
        created_by: USER_ID
    }, USER_ID);
}

export async function createAsset(payload) {
    const purchaseValue = numberValue(payload.purchase_value);
    if (!payload.name) throw new Error('Nama aset wajib diisi');
    if (purchaseValue <= 0) throw new Error('Nilai beli aset harus lebih dari nol');

    return createSheetRow('assets', {
        name: payload.name,
        category: payload.category,
        purchase_date: payload.purchase_date || todayDate(),
        purchase_value: purchaseValue,
        condition: payload.condition || 'baik',
        location: payload.location,
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function createBudget(payload) {
    const budgetAmount = numberValue(payload.budget_amount);
    const actualAmount = numberValue(payload.actual_amount);
    if (!payload.period) throw new Error('Periode budget wajib diisi');
    if (!payload.module) throw new Error('Modul budget wajib diisi');

    return createSheetRow('budgets', {
        period: payload.period,
        module: payload.module,
        budget_amount: budgetAmount,
        actual_amount: actualAmount,
        variance_amount: budgetAmount - actualAmount,
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function createPayment(payload, state) {
    const invoice = findById(state.invoices, 'invoice_id', payload.invoice_id);
    const amount = numberValue(payload.amount);
    if (!invoice) throw new Error('Faktur supplier wajib dipilih');
    if (amount <= 0) throw new Error('Nominal pembayaran harus lebih dari nol');

    const paymentResult = await createSheetRow('payments', {
        invoice_id: payload.invoice_id,
        payment_date: payload.payment_date || todayDate(),
        amount,
        method: payload.method || 'transfer',
        status: payload.status || 'dibayar',
        proof_url: payload.proof_url || ''
    }, USER_ID);

    if (payload.mark_invoice_paid === 'on') {
        await updateSheetRow('supplier_invoices', payload.invoice_id, {
            payment_status: 'lunas'
        }, 'invoice_id', USER_ID);
    }

    return paymentResult;
}
