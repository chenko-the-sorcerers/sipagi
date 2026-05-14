export const PROCUREMENT_STATES = {
    pr: ['draft', 'submitted', 'budget_checked', 'approved', 'rejected', 'converted_to_po', 'cancelled'],
    rfq: ['draft', 'sent', 'quoted', 'compared', 'selected', 'expired', 'cancelled'],
    po: ['draft', 'pending_approval', 'approved', 'partially_received', 'fully_received', 'closed', 'cancelled'],
    receiving: ['pending', 'partial', 'completed', 'discrepancy', 'rejected'],
    qc: ['pending', 'accepted', 'partially_rejected', 'rejected'],
    invoice: ['pending', 'matched', 'discrepancy', 'approved', 'posted'],
    lpj: ['incomplete', 'ready', 'submitted']
};

export const PROCUREMENT_ROLES = [
    'requester',
    'purchasing',
    'kepala_sppg',
    'finance',
    'yayasan/admin',
    'warehouse',
    'qc',
    'auditor/read-only'
];

export const EXCEPTION_TYPES = [
    'emergency_purchase',
    'supplier_change',
    'partial_delivery',
    'over_delivery',
    'under_delivery',
    'damaged_item',
    'rejected_qc',
    'invoice_mismatch',
    'budget_overrun',
    'po_cancellation_after_approval'
];

const PO_APPROVAL_THRESHOLD = 5000000;
const YAYASAN_THRESHOLD = 25000000;
const BUDGET_OVERRUN_THRESHOLD = 0;

export function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function canonicalStatus(value, fallback) {
    const normalized = String(value || '').toLowerCase();
    const aliases = {
        menunggu: 'submitted',
        dipesan: 'approved',
        diterima: 'fully_received',
        'diterima-sebagian': 'partially_received',
        selesai: 'closed',
        dibatalkan: 'cancelled',
        disetujui: 'approved',
        lulus: 'accepted',
        karantina: 'pending',
        ditolak: 'rejected',
        'belum-lunas': 'pending',
        proses: 'approved',
        lunas: 'posted'
    };
    return aliases[normalized] || normalized || fallback;
}

export function poTotal(po, items = []) {
    if (numberValue(po.total) > 0) return numberValue(po.total);
    return items
        .filter((item) => item.po_id === po.po_id)
        .reduce((sum, item) => sum + numberValue(item.total_price), 0);
}

export function poOrderedQty(po, items = []) {
    return items
        .filter((item) => item.po_id === po.po_id)
        .reduce((sum, item) => sum + numberValue(item.qty), 0);
}

export function poReceivedQty(po, receivingRecords = []) {
    return receivingRecords
        .filter((record) => record.po_id === po.po_id)
        .reduce((sum, record) => sum + numberValue(record.received_qty), 0);
}

export function poRejectedQty(po, receivingRecords = []) {
    return receivingRecords
        .filter((record) => record.po_id === po.po_id)
        .reduce((sum, record) => sum + numberValue(record.rejected_qty), 0);
}

export function getBudgetSnapshot(state, amount = 0) {
    const purchasingBudgets = (state.budgets || []).filter((budget) => {
        const module = String(budget.module || '').toLowerCase();
        return ['purchasing', 'pengadaan', 'procurement'].includes(module);
    });
    const budgetAmount = purchasingBudgets.reduce((sum, budget) => sum + numberValue(budget.budget_amount), 0);
    const actualAmount = purchasingBudgets.reduce((sum, budget) => sum + numberValue(budget.actual_amount), 0);
    const available = budgetAmount - actualAmount;
    const hasBudget = budgetAmount > 0;
    const overrun = hasBudget && amount > available + BUDGET_OVERRUN_THRESHOLD;
    return { budgetAmount, actualAmount, available, hasBudget, overrun };
}

export function getApprovalRequirement({ role, amount = 0, emergency = false, budgetOverrun = false, amendmentAfterApproval = false }) {
    const approvers = [];
    if (role === 'auditor/read-only') {
        return { allowed: false, approvers, reason: 'Auditor hanya bisa membaca dokumen.' };
    }
    if (budgetOverrun) approvers.push('finance');
    if (emergency || amount >= PO_APPROVAL_THRESHOLD || amendmentAfterApproval) approvers.push('kepala_sppg');
    if (amount >= YAYASAN_THRESHOLD) approvers.push('yayasan/admin');
    return { allowed: true, approvers: [...new Set(approvers)] };
}

export function validateExceptionPayload(exception) {
    if (!exception?.type) return { valid: true, errors: [] };
    const errors = [];
    if (!EXCEPTION_TYPES.includes(exception.type)) errors.push('Jenis exception tidak dikenal.');
    if (!exception.reason_code) errors.push('Reason code wajib diisi untuk exception.');
    if (!exception.note) errors.push('Catatan exception wajib diisi.');
    if (['damaged_item', 'rejected_qc', 'invoice_mismatch'].includes(exception.type) && !exception.attachment_ref) {
        errors.push('Attachment wajib untuk exception ini.');
    }
    if (['budget_overrun', 'po_cancellation_after_approval', 'supplier_change'].includes(exception.type) && !exception.approver) {
        errors.push('Approver wajib untuk exception ini.');
    }
    return { valid: errors.length === 0, errors };
}

export function validatePurchaseRequestGate(payload, state) {
    const errors = [];
    if (!payload.needed_date) errors.push('Tanggal dibutuhkan wajib diisi.');
    if (!payload.item_id) errors.push('Item wajib dipilih.');
    if (numberValue(payload.qty) <= 0) errors.push('Qty request harus lebih dari nol.');
    const estimate = numberValue(payload.qty) * numberValue(payload.estimated_unit_price || payload.unit_price);
    const budget = getBudgetSnapshot(state, estimate);
    if (budget.overrun && !payload.budget_override_reason) errors.push('Budget tidak cukup. Isi alasan budget overrun.');
    return { valid: errors.length === 0, errors, budget };
}

export function validatePurchaseOrderGate(payload, state) {
    const errors = [];
    const item = (state.items || []).find((candidate) => candidate.item_id === payload.item_id);
    const vendor = (state.vendors || []).find((candidate) => candidate.vendor_id === payload.vendor_id);
    const qty = numberValue(payload.qty);
    const unitPrice = numberValue(payload.unit_price);
    const total = qty * unitPrice + numberValue(payload.tax);
    const budget = getBudgetSnapshot(state, total);
    const pr = payload.request_id ? (state.purchaseRequests || []).find((candidate) => candidate.request_id === payload.request_id) : null;
    const prStatus = pr ? canonicalStatus(pr.status, 'draft') : '';

    if (!payload.vendor_id || !vendor) errors.push('Supplier aktif wajib dipilih.');
    if (vendor && !['aktif', 'active'].includes(String(vendor.status || 'aktif').toLowerCase())) errors.push('Supplier tidak aktif.');
    if (!payload.delivery_date) errors.push('Tanggal kirim wajib diisi.');
    if (!item) errors.push('Line item wajib dipilih.');
    if (qty <= 0) errors.push('Qty PO harus lebih dari nol.');
    if (unitPrice <= 0) errors.push('Harga satuan wajib lebih dari nol.');
    if (payload.request_id && !['approved', 'converted_to_po'].includes(prStatus)) {
        errors.push('PR harus budget_checked dan approved sebelum menjadi PO.');
    }
    if (budget.overrun && !payload.budget_override_reason) errors.push('Budget commitment melebihi sisa budget.');

    const approval = getApprovalRequirement({
        role: payload.actor_role || 'purchasing',
        amount: total,
        emergency: payload.emergency_flag === 'on',
        budgetOverrun: budget.overrun,
        amendmentAfterApproval: payload.amendment_after_approval === 'on'
    });
    if (!approval.allowed) errors.push(approval.reason);
    if (approval.approvers.length && !payload.approver) {
        errors.push(`Butuh approval: ${approval.approvers.join(', ')}.`);
    }

    return { valid: errors.length === 0, errors, item, vendor, total, budget, approval };
}

export function validateReceivingGate(payload, state) {
    const errors = [];
    const po = (state.purchaseOrders || []).find((candidate) => candidate.po_id === payload.po_id);
    const poStatus = po ? canonicalStatus(po.status, 'draft') : '';
    const orderedQty = po ? poOrderedQty(po, state.purchaseOrderItems) : 0;
    const alreadyReceivedQty = po ? poReceivedQty(po, state.receivingRecords) : 0;
    const receivedQty = numberValue(payload.received_qty);
    const rejectedQty = numberValue(payload.rejected_qty);
    const remainingQty = Math.max(orderedQty - alreadyReceivedQty, 0);
    const overDelivery = orderedQty > 0 && receivedQty > remainingQty;
    const underDelivery = orderedQty > 0 && receivedQty < remainingQty;

    if (!po) errors.push('Receiving harus mereferensikan PO yang valid.');
    if (po && poStatus !== 'approved' && poStatus !== 'partially_received') errors.push('Receiving hanya bisa untuk PO approved.');
    if (receivedQty <= 0) errors.push('Qty diterima harus lebih dari nol.');
    if (rejectedQty > receivedQty) errors.push('Qty ditolak tidak boleh lebih besar dari qty diterima.');
    if ((overDelivery || underDelivery) && !payload.exception_reason_code) errors.push('Partial/over delivery perlu reason code.');
    if ((overDelivery || underDelivery) && !payload.exception_note && !payload.qc_note) errors.push('Partial/over delivery perlu catatan.');
    if (rejectedQty > 0 && !payload.qc_note) errors.push('QC reject/partial reject wajib memiliki catatan.');
    if (rejectedQty > 0 && !payload.attachment_ref && !payload.photo_url) errors.push('Bukti wajib untuk barang rusak/ditolak.');

    return {
        valid: errors.length === 0,
        errors,
        po,
        orderedQty,
        alreadyReceivedQty,
        remainingQty,
        receivedQty,
        rejectedQty,
        acceptedQty: Math.max(receivedQty - rejectedQty, 0),
        overDelivery,
        underDelivery
    };
}

export function qcDispositionFromPayload(payload) {
    const receivedQty = numberValue(payload.received_qty);
    const rejectedQty = numberValue(payload.rejected_qty);
    if (payload.qc_status === 'ditolak' || payload.qc_status === 'rejected') return 'rejected';
    if (payload.qc_status === 'hold' || payload.qc_status === 'karantina') return 'pending';
    if (rejectedQty > 0 && rejectedQty < receivedQty) return 'partially_rejected';
    if (rejectedQty >= receivedQty) return 'rejected';
    return 'accepted';
}

export function receivingStateFromQuantities({ orderedQty, alreadyReceivedQty, receivedQty, rejectedQty, overDelivery }) {
    if (rejectedQty >= receivedQty) return 'rejected';
    if (overDelivery) return 'discrepancy';
    if (orderedQty > 0 && alreadyReceivedQty + receivedQty < orderedQty) return 'partial';
    return 'completed';
}

export function validateInvoiceGate(payload, state) {
    const errors = [];
    const po = (state.purchaseOrders || []).find((candidate) => candidate.po_id === payload.po_id);
    const receivedQty = po ? poReceivedQty(po, state.receivingRecords) : 0;
    const rejectedQty = po ? poRejectedQty(po, state.receivingRecords) : 0;
    const acceptedQty = Math.max(receivedQty - rejectedQty, 0);
    const invoiceAmount = numberValue(payload.amount);
    const poAmount = po ? poTotal(po, state.purchaseOrderItems) : 0;
    const amountMismatch = poAmount > 0 && Math.abs(invoiceAmount - poAmount) > Math.max(1000, poAmount * 0.02);
    const noAcceptedReceiving = acceptedQty <= 0;

    if (!po) errors.push('Invoice wajib mereferensikan PO.');
    if (po && canonicalStatus(po.status, 'draft') !== 'fully_received' && canonicalStatus(po.status, 'draft') !== 'closed') {
        errors.push('Invoice hanya bisa disetujui setelah receiving dan QC selesai.');
    }
    if (!payload.invoice_number) errors.push('Nomor faktur wajib diisi.');
    if (invoiceAmount <= 0) errors.push('Nilai invoice harus lebih dari nol.');
    if (noAcceptedReceiving) errors.push('Belum ada GRN/QC accepted untuk PO ini.');
    if (amountMismatch && !payload.mismatch_reason) errors.push('Invoice mismatch perlu alasan.');

    return {
        valid: errors.length === 0,
        errors,
        po,
        invoiceAmount,
        poAmount,
        receivedQty,
        rejectedQty,
        acceptedQty,
        amountMismatch,
        invoiceState: amountMismatch || noAcceptedReceiving ? 'discrepancy' : 'matched'
    };
}

export function deriveLpjStatus({ po, invoice, financeTransactions = [], auditLogs = [] }) {
    const poId = po?.po_id;
    const invoicePosted = invoice && canonicalStatus(invoice.payment_status, 'pending') === 'posted';
    const financePosted = financeTransactions.some((transaction) => {
        return transaction.reference_type === 'supplier_invoice' && transaction.reference_id === invoice?.invoice_id;
    });
    const hasPacketEvidence = auditLogs.some((log) => {
        return log.entity === 'procurement_lpj' && log.entity_id === poId && ['lpj_packet_ready', 'lpj_submitted'].includes(log.action);
    });

    if (hasPacketEvidence && invoicePosted && financePosted) return 'submitted';
    if (invoice && (invoicePosted || financePosted)) return 'ready';
    return 'incomplete';
}

export function enrichProcurementState(state) {
    const purchaseOrders = (state.purchaseOrders || []).map((po) => {
        const orderedQty = poOrderedQty(po, state.purchaseOrderItems);
        const receivedQty = poReceivedQty(po, state.receivingRecords);
        const rejectedQty = poRejectedQty(po, state.receivingRecords);
        const remainingQty = Math.max(orderedQty - receivedQty, 0);
        const status = canonicalStatus(po.status, 'draft');
        const invoice = (state.supplierInvoices || []).find((candidate) => candidate.po_id === po.po_id);
        return {
            ...po,
            workflow_state: status,
            ordered_qty: orderedQty,
            received_qty: receivedQty,
            rejected_qty: rejectedQty,
            outstanding_qty: remainingQty,
            invoice_state: invoice ? canonicalStatus(invoice.payment_status, 'pending') : 'pending',
            lpj_state: deriveLpjStatus({ po, invoice, financeTransactions: state.financeTransactions || [], auditLogs: state.auditLogs || [] })
        };
    });

    return { ...state, purchaseOrders };
}

export function getProcurementDashboard(state) {
    const enriched = enrichProcurementState(state);
    const today = new Date();
    const approvals = enriched.purchaseOrders.filter((po) => ['pending_approval', 'draft'].includes(po.workflow_state)).length;
    const poOverdue = enriched.purchaseOrders.filter((po) => {
        if (!po.delivery_date || ['closed', 'cancelled', 'fully_received'].includes(po.workflow_state)) return false;
        return new Date(po.delivery_date) < today;
    }).length;
    const partialDeliveries = enriched.purchaseOrders.filter((po) => po.workflow_state === 'partially_received' || po.outstanding_qty > 0 && po.received_qty > 0).length;
    const invoiceMismatch = (state.supplierInvoices || []).filter((invoice) => canonicalStatus(invoice.payment_status, 'pending') === 'discrepancy').length;
    const lpjReady = enriched.purchaseOrders.filter((po) => po.lpj_state === 'ready').length;
    const lpjIncomplete = enriched.purchaseOrders.filter((po) => po.lpj_state === 'incomplete').length;
    const emergencyPurchases = (state.auditLogs || []).filter((log) => log.entity === 'procurement_exception' && String(log.after_json || '').includes('emergency_purchase')).length;
    const prAging = (state.purchaseRequests || []).filter((request) => {
        const status = canonicalStatus(request.status, 'draft');
        if (['approved', 'rejected', 'converted_to_po', 'cancelled'].includes(status)) return false;
        if (!request.request_date) return true;
        const ageDays = (today - new Date(request.request_date)) / 86400000;
        return ageDays >= 2;
    }).length;
    const budget = getBudgetSnapshot(state);

    return {
        pendingApprovals: approvals,
        prAging,
        poOverdue,
        partialDeliveries,
        supplierPerformance: Math.max(0, 100 - partialDeliveries * 10 - poOverdue * 15),
        budgetUtilization: budget.budgetAmount > 0 ? Math.round((budget.actualAmount / budget.budgetAmount) * 100) : 0,
        invoiceMismatch,
        lpjReady,
        lpjIncomplete,
        emergencyPurchases
    };
}

export function buildTransitionAudit({ entity, entityId, action, previousState, newState, actor, role, changedFields = {}, reasonCode = '', note = '', attachmentRef = '' }) {
    return {
        entity,
        entity_id: entityId,
        action,
        before_json: JSON.stringify({ state: previousState }),
        after_json: JSON.stringify({
            previous_state: previousState,
            new_state: newState,
            actor,
            role,
            changed_fields: changedFields,
            reason_code: reasonCode,
            note,
            attachment_ref: attachmentRef
        }),
        user_id: actor,
        created_at: new Date().toISOString()
    };
}
