import {
    createSheetRow,
    getSheetRows,
    updateSheetRow
} from '../../../shared/services/googleSheetsApi.js';
import {
    buildTransitionAudit,
    canonicalStatus,
    enrichProcurementState,
    getProcurementDashboard,
    numberValue,
    qcDispositionFromPayload,
    receivingStateFromQuantities,
    validateExceptionPayload,
    validateInvoiceGate,
    validatePurchaseOrderGate,
    validatePurchaseRequestGate,
    validateReceivingGate
} from './procurementWorkflow.js';

const USER_ID = 'pengadaan';

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function todayIso() {
    return new Date().toISOString();
}

function activeRows(rows) {
    return rows.filter((row) => row.status !== 'deleted');
}

function findById(rows, idField, id) {
    return rows.find((row) => row[idField] === id);
}

function activeVendorRows(rows) {
    return activeRows(rows).filter((row) => ['aktif', 'active'].includes(String(row.status || 'aktif').toLowerCase()));
}

function appendAudit(payload) {
    return createSheetRow('audit_logs', payload, USER_ID);
}

async function writeWorkflowAudit(payload) {
    return appendAudit(buildTransitionAudit({
        actor: USER_ID,
        role: payload.role || 'purchasing',
        ...payload
    }));
}

async function writeExceptionAudit({ entityId, type, reasonCode, note, attachmentRef = '', approver = '', role = 'purchasing' }) {
    const validation = validateExceptionPayload({
        type,
        reason_code: reasonCode,
        note,
        attachment_ref: attachmentRef,
        approver
    });
    if (!validation.valid) throw new Error(validation.errors.join('\n'));

    return appendAudit({
        entity: 'procurement_exception',
        entity_id: entityId,
        action: type,
        before_json: '',
        after_json: JSON.stringify({
            type,
            reason_code: reasonCode,
            note,
            attachment_ref: attachmentRef,
            approver,
            actor: USER_ID,
            role
        }),
        user_id: USER_ID,
        created_at: todayIso()
    });
}

export async function getPurchasingState() {
    const [
        vendors,
        items,
        purchaseRequests,
        purchaseOrders,
        purchaseOrderItems,
        receivingRecords,
        supplierInvoices,
        budgets,
        financeTransactions,
        auditLogs
    ] = await Promise.all([
        getSheetRows('vendors'),
        getSheetRows('items'),
        getSheetRows('purchase_requests'),
        getSheetRows('purchase_orders'),
        getSheetRows('purchase_order_items'),
        getSheetRows('receiving_records'),
        getSheetRows('supplier_invoices'),
        getSheetRows('budgets'),
        getSheetRows('finance_transactions'),
        getSheetRows('audit_logs')
    ]);

    return enrichProcurementState({
        vendors: activeVendorRows(vendors.rows || []),
        items: activeRows(items.rows || []),
        purchaseRequests: purchaseRequests.rows || [],
        purchaseOrders: purchaseOrders.rows || [],
        purchaseOrderItems: purchaseOrderItems.rows || [],
        receivingRecords: receivingRecords.rows || [],
        supplierInvoices: supplierInvoices.rows || [],
        budgets: budgets.rows || [],
        financeTransactions: financeTransactions.rows || [],
        auditLogs: auditLogs.rows || []
    });
}

export function getPurchasingSummaryFromState(state) {
    const openOrders = state.purchaseOrders.filter((row) => {
        return !['diterima', 'selesai', 'dibatalkan'].includes(String(row.status || '').toLowerCase());
    }).length;
    const receivedOrders = new Set(state.receivingRecords.map((row) => row.po_id).filter(Boolean)).size;
    const invoiceTotal = state.supplierInvoices.reduce((sum, row) => sum + numberValue(row.amount), 0);
    const pendingInvoices = state.supplierInvoices.filter((row) => row.payment_status !== 'lunas').length;

    return {
        vendors: state.vendors.length,
        openOrders,
        receivedOrders,
        invoiceTotal,
        pendingInvoices,
        workflow: getProcurementDashboard(state)
    };
}

export async function createVendor(payload) {
    return createSheetRow('vendors', {
        name: payload.name,
        category: payload.category,
        contact_name: payload.contact_name,
        phone: payload.phone,
        address: payload.address,
        rating: payload.rating || 'baru',
        payment_term: payload.payment_term || 'tempo 7 hari',
        status: payload.status || 'active'
    }, USER_ID);
}

export async function createPurchaseRequest(payload, state = {}) {
    const gate = validatePurchaseRequestGate(payload, state);
    if (!gate.valid) throw new Error(gate.errors.join('\n'));

    const result = await createSheetRow('purchase_requests', {
        sppg_id: payload.sppg_id || 'sppg-utama',
        request_date: payload.request_date || todayDate(),
        needed_date: payload.needed_date,
        status: payload.submit_now === 'on' ? 'submitted' : 'draft',
        requested_by: USER_ID,
        approved_by: ''
    }, USER_ID);

    await writeWorkflowAudit({
        entity: 'purchase_requests',
        entityId: result.row.request_id,
        action: 'pr_created',
        previousState: '',
        newState: result.row.status,
        changedFields: { needed_date: result.row.needed_date, item_id: payload.item_id, qty: payload.qty },
        reasonCode: payload.reason_code || '',
        note: payload.note || ''
    });

    return result;
}

export async function createPurchaseOrder(payload, state) {
    const gate = validatePurchaseOrderGate(payload, state);
    if (!gate.valid) throw new Error(gate.errors.join('\n'));

    const item = gate.item;
    const qty = numberValue(payload.qty);
    const unitPrice = numberValue(payload.unit_price);
    const subtotal = qty * unitPrice;
    const previousState = 'draft';
    const newState = gate.approval.approvers.length ? 'pending_approval' : 'approved';

    if (payload.exception_type) {
        await writeExceptionAudit({
            entityId: payload.request_id || payload.vendor_id,
            type: payload.exception_type,
            reasonCode: payload.exception_reason_code,
            note: payload.exception_note,
            attachmentRef: payload.attachment_ref,
            approver: payload.approver,
            role: payload.actor_role || 'purchasing'
        });
    }

    const poResult = await createSheetRow('purchase_orders', {
        vendor_id: payload.vendor_id,
        po_date: payload.po_date || todayDate(),
        delivery_date: payload.delivery_date,
        status: newState,
        subtotal,
        tax: payload.tax || 0,
        total: subtotal + numberValue(payload.tax),
        approval_status: newState === 'approved' ? 'approved' : 'pending',
        created_by: USER_ID
    }, USER_ID);

    await createSheetRow('purchase_order_items', {
        po_id: poResult.row.po_id,
        item_id: payload.item_id,
        qty,
        unit: payload.unit || item.unit,
        unit_price: unitPrice,
        total_price: subtotal
    }, USER_ID);

    if (payload.request_id) {
        await updateSheetRow('purchase_requests', payload.request_id, {
            status: 'converted_to_po',
            approved_by: payload.approver || USER_ID
        }, 'request_id', USER_ID);
    }

    if (newState === 'approved') {
        await createSheetRow('finance_transactions', {
            date: todayDate(),
            account_id: 'BUDGET-COMMITMENT',
            type: 'credit',
            amount: subtotal + numberValue(payload.tax),
            description: `Budget commitment PO ${poResult.row.po_id}`,
            reference_type: 'purchase_order',
            reference_id: poResult.row.po_id,
            created_by: USER_ID
        }, USER_ID);
    }

    await writeWorkflowAudit({
        entity: 'purchase_orders',
        entityId: poResult.row.po_id,
        action: 'po_created',
        previousState,
        newState,
        changedFields: {
            vendor_id: payload.vendor_id,
            item_id: payload.item_id,
            qty,
            unit_price: unitPrice,
            total: subtotal + numberValue(payload.tax),
            budget_available: gate.budget.available,
            required_approvers: gate.approval.approvers
        },
        reasonCode: payload.reason_code || '',
        note: payload.note || ''
    });

    return poResult;
}

export async function recordReceiving(payload, state) {
    const gate = validateReceivingGate(payload, state);
    if (!gate.valid) throw new Error(gate.errors.join('\n'));

    const item = findById(state.items, 'item_id', payload.item_id);
    const purchaseOrder = gate.po;
    const receivedQty = gate.receivedQty;
    const rejectedQty = gate.rejectedQty;
    const acceptedQty = gate.acceptedQty;
    const qcState = qcDispositionFromPayload(payload);
    const receivingState = receivingStateFromQuantities(gate);
    if (!item) throw new Error('Item bahan tidak ditemukan');

    if (gate.overDelivery || gate.underDelivery || rejectedQty > 0) {
        await writeExceptionAudit({
            entityId: payload.po_id,
            type: gate.overDelivery ? 'over_delivery' : gate.underDelivery ? 'under_delivery' : 'rejected_qc',
            reasonCode: payload.exception_reason_code || payload.qc_reason_code,
            note: payload.qc_note || payload.exception_note,
            attachmentRef: payload.attachment_ref || payload.photo_url,
            approver: payload.approver || '',
            role: payload.actor_role || 'warehouse'
        });
    }

    const receivedAt = payload.received_at || todayIso();
    const receivingResult = await createSheetRow('receiving_records', {
        po_id: payload.po_id,
        item_id: payload.item_id,
        received_qty: receivedQty,
        rejected_qty: rejectedQty,
        qc_status: qcState,
        temperature: payload.temperature,
        photo_url: payload.photo_url || '',
        received_by: payload.received_by || USER_ID,
        received_at: receivedAt
    }, USER_ID);

    if (qcState === 'accepted' || qcState === 'partially_rejected') {
        const batchResult = await createSheetRow('stock_batches', {
            sku: item.sku || item.item_id,
            item_id: item.item_id,
            vendor_id: purchaseOrder.vendor_id,
            batch_code: payload.batch_code || `${item.sku || item.item_id}-${Date.now()}`,
            qty_initial: acceptedQty,
            qty_current: acceptedQty,
            unit: item.unit,
            inventory_date: receivedAt.slice(0, 10),
            received_date: receivedAt.slice(0, 10),
            expiry_date: payload.expiry_date,
            location: payload.location || 'Gudang Utama',
            status: 'released'
        }, USER_ID);

        await createSheetRow('stock_movements', {
            sku: item.sku || item.item_id,
            item_id: item.item_id,
            batch_id: batchResult.row.batch_id,
            type: 'stok-masuk',
            qty: acceptedQty,
            unit: item.unit,
            movement_date: receivedAt.slice(0, 10),
            reason: `QC accepted dari PO ${payload.po_id}`,
            reference_type: 'receiving_records',
            reference_id: receivingResult.row.receiving_id,
            created_by: USER_ID,
            created_at: todayIso()
        }, USER_ID);

        await createSheetRow('finance_transactions', {
            date: receivedAt.slice(0, 10),
            account_id: 'GRNI',
            type: 'credit',
            amount: purchaseOrder.total || 0,
            description: `Receiving accrual / GRNI PO ${payload.po_id}`,
            reference_type: 'receiving_records',
            reference_id: receivingResult.row.receiving_id,
            created_by: USER_ID
        }, USER_ID);
    }

    await updateSheetRow('purchase_orders', payload.po_id, {
        status: receivingState === 'completed' ? 'fully_received' : receivingState === 'partial' ? 'partially_received' : receivingState
    }, 'po_id', USER_ID);

    await writeWorkflowAudit({
        entity: 'receiving_records',
        entityId: receivingResult.row.receiving_id,
        action: 'receiving_recorded',
        previousState: 'pending',
        newState: receivingState,
        changedFields: {
            po_id: payload.po_id,
            received_qty: receivedQty,
            rejected_qty: rejectedQty,
            accepted_qty: acceptedQty,
            qc_state: qcState,
            outstanding_qty: Math.max(gate.orderedQty - gate.alreadyReceivedQty - receivedQty, 0)
        },
        reasonCode: payload.qc_reason_code || payload.exception_reason_code || '',
        note: payload.qc_note || payload.exception_note || ''
    });

    return receivingResult;
}

export async function createSupplierInvoice(payload, state = {}) {
    const gate = validateInvoiceGate(payload, state);
    if (!gate.valid) throw new Error(gate.errors.join('\n'));

    if (gate.amountMismatch) {
        await writeExceptionAudit({
            entityId: payload.po_id,
            type: 'invoice_mismatch',
            reasonCode: payload.mismatch_reason_code || 'amount_mismatch',
            note: payload.mismatch_reason,
            attachmentRef: payload.file_url,
            approver: payload.approver || '',
            role: payload.actor_role || 'finance'
        });
    }

    const invoiceResult = await createSheetRow('supplier_invoices', {
        vendor_id: payload.vendor_id,
        po_id: payload.po_id,
        invoice_number: payload.invoice_number,
        invoice_date: payload.invoice_date || todayDate(),
        amount: numberValue(payload.amount),
        payment_status: gate.invoiceState,
        file_url: payload.file_url || ''
    }, USER_ID);

    if (gate.invoiceState === 'matched') {
        await createSheetRow('finance_transactions', {
            date: payload.invoice_date || todayDate(),
            account_id: 'AP',
            type: 'credit',
            amount: numberValue(payload.amount),
            description: `AP recognition invoice ${payload.invoice_number}`,
            reference_type: 'supplier_invoice',
            reference_id: invoiceResult.row.invoice_id,
            created_by: USER_ID
        }, USER_ID);
    }

    await writeWorkflowAudit({
        entity: 'supplier_invoices',
        entityId: invoiceResult.row.invoice_id,
        action: 'invoice_recorded',
        previousState: 'pending',
        newState: gate.invoiceState,
        changedFields: {
            po_id: payload.po_id,
            invoice_amount: gate.invoiceAmount,
            po_amount: gate.poAmount,
            accepted_qty: gate.acceptedQty
        },
        reasonCode: payload.mismatch_reason_code || '',
        note: payload.mismatch_reason || ''
    });

    return invoiceResult;
}

export async function createRfqEvent(payload, state = {}) {
    const request = payload.request_id
        ? findById(state.purchaseRequests || [], 'request_id', payload.request_id)
        : null;
    const requestState = request ? canonicalStatus(request.status, 'draft') : '';
    if (payload.request_id && !['approved', 'budget_checked', 'converted_to_po'].includes(requestState)) {
        throw new Error('RFQ hanya bisa dibuat dari PR yang sudah budget checked / approved.');
    }
    if (!payload.vendor_id) throw new Error('Supplier wajib dipilih untuk RFQ.');
    if (!payload.quoted_price || numberValue(payload.quoted_price) <= 0) throw new Error('Harga quotation wajib lebih dari nol.');
    if (!payload.selected_reason) throw new Error('Alasan pemilihan supplier wajib diisi.');
    if (!payload.quotation_attachment) throw new Error('Attachment quotation wajib diisi.');

    const rfqId = payload.rfq_id || `RFQ-${Date.now()}`;
    return appendAudit({
        entity: 'procurement_rfq',
        entity_id: rfqId,
        action: payload.rfq_action || 'quoted',
        before_json: JSON.stringify({ state: 'sent' }),
        after_json: JSON.stringify({
            state: payload.rfq_action === 'selected' ? 'selected' : 'quoted',
            request_id: payload.request_id || '',
            vendor_id: payload.vendor_id,
            quoted_price: numberValue(payload.quoted_price),
            selected_reason: payload.selected_reason,
            quotation_attachment: payload.quotation_attachment,
            supplier_replacement_reason: payload.supplier_replacement_reason || '',
            actor: USER_ID,
            role: payload.actor_role || 'purchasing'
        }),
        user_id: USER_ID,
        created_at: todayIso()
    });
}

export async function recordLpjPacketReady(payload, state = {}) {
    const po = findById(state.purchaseOrders || [], 'po_id', payload.po_id);
    const invoice = (state.supplierInvoices || []).find((candidate) => candidate.po_id === payload.po_id);
    const hasFinancePosting = (state.financeTransactions || []).some((transaction) => {
        return transaction.reference_type === 'supplier_invoice' && transaction.reference_id === invoice?.invoice_id;
    });
    if (!po) throw new Error('PO wajib dipilih untuk LPJ.');
    if (!invoice) throw new Error('LPJ belum bisa ready: invoice belum tercatat.');
    if (!hasFinancePosting) throw new Error('LPJ belum bisa ready: finance posting belum lengkap.');
    if (!payload.document_packet_ref) throw new Error('Referensi dokumen LPJ wajib diisi.');

    return appendAudit({
        entity: 'procurement_lpj',
        entity_id: payload.po_id,
        action: payload.submit_lpj === 'on' ? 'lpj_submitted' : 'lpj_packet_ready',
        before_json: '',
        after_json: JSON.stringify({
            state: payload.submit_lpj === 'on' ? 'submitted' : 'ready',
            document_packet_ref: payload.document_packet_ref,
            note: payload.note || '',
            actor: USER_ID,
            role: payload.actor_role || 'finance'
        }),
        user_id: USER_ID,
        created_at: todayIso()
    });
}
