import {
    createPurchaseOrder,
    createPurchaseRequest,
    createRfqEvent,
    createSupplierInvoice,
    createVendor,
    getPurchasingState,
    getPurchasingSummaryFromState,
    recordLpjPacketReady,
    recordReceiving
} from '../services/purchasingApi.js';
import { ErrorState, LoadingState } from '../../../shared/components/UiPrimitives.js';
import { showDetailModal } from '../../../shared/components/ModuleComponents.js';

const pageState = {
    activeView: 'overview',
    query: '',
    statusTab: 'all',
    createPanel: '',
    loading: true,
    error: '',
    state: {
        vendors: [],
        items: [],
        purchaseRequests: [],
        purchaseOrders: [],
        purchaseOrderItems: [],
        receivingRecords: [],
        supplierInvoices: [],
        budgets: [],
        financeTransactions: [],
        auditLogs: []
    }
};

const views = [
    { id: 'overview', label: 'Overview', icon: 'ki-chart-line' },
    { id: 'pr', label: 'Purchase Request', icon: 'ki-document' },
    { id: 'rfq', label: 'RFQ', icon: 'ki-price-tag' },
    { id: 'po', label: 'Purchase Order', icon: 'ki-cheque' },
    { id: 'receiving', label: 'Receiving', icon: 'ki-delivery' },
    { id: 'qc', label: 'QC / Pemeriksaan', icon: 'ki-shield-tick' },
    { id: 'supplier', label: 'Master Supplier', icon: 'ki-people' },
    { id: 'invoice', label: 'Invoice', icon: 'ki-bill' },
    { id: 'payment', label: 'Pembayaran', icon: 'ki-wallet' },
    { id: 'lpj', label: 'LPJ', icon: 'ki-archive' },
    { id: 'report', label: 'Laporan', icon: 'ki-chart-line' }
];

const statusSets = {
    pr: [
        ['all', 'Semua'],
        ['draft', 'Draft'],
        ['submitted', 'Menunggu Approval'],
        ['approved', 'Disetujui'],
        ['rejected', 'Ditolak'],
        ['converted_to_po', 'Converted']
    ],
    rfq: [
        ['all', 'Semua'],
        ['sent', 'Sent'],
        ['quoted', 'Quoted'],
        ['compared', 'Comparing'],
        ['selected', 'Selected'],
        ['expired', 'Expired'],
        ['cancelled', 'Canceled']
    ],
    po: [
        ['all', 'Semua'],
        ['draft', 'Draft'],
        ['pending_approval', 'Pending Approval'],
        ['approved', 'Approved'],
        ['partially_received', 'Partial Receive'],
        ['closed', 'Closed'],
        ['cancelled', 'Canceled']
    ],
    qc: [
        ['all', 'Semua'],
        ['pending', 'Pending'],
        ['completed', 'Completed'],
        ['accepted', 'Accepted'],
        ['partially_rejected', 'Partially Rejected'],
        ['rejected', 'Rejected']
    ],
    invoice: [
        ['all', 'Semua'],
        ['pending', 'Pending Matching'],
        ['matched', 'Matched'],
        ['discrepancy', 'Discrepancy'],
        ['approved', 'Approved'],
        ['posted', 'Posted']
    ],
    report: [
        ['summary', 'Ringkasan'],
        ['supplier', 'Performa Supplier'],
        ['spend', 'Pengeluaran'],
        ['overdue', 'PO Overdue'],
        ['receiving', 'Receiving'],
        ['qc', 'QC'],
        ['invoice', 'Invoice'],
        ['lpj', 'LPJ']
    ]
};

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function money(value) {
    return Number(value || 0).toLocaleString('id-ID');
}

function numberValue(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value) {
    return String(value ?? '').toLowerCase();
}

function matchesQuery(values) {
    const query = normalize(pageState.query).trim();
    if (!query) return true;
    return values.some((value) => normalize(value).includes(query));
}

function statusTone(status) {
    const normalized = normalize(status);
    if (['approved', 'matched', 'posted', 'accepted', 'completed', 'fully_received', 'closed', 'ready', 'active', 'aktif', 'lunas'].includes(normalized)) return 'safe';
    if (['rejected', 'cancelled', 'canceled', 'discrepancy', 'overdue'].includes(normalized)) return 'danger';
    if (['draft', 'incomplete'].includes(normalized)) return 'muted';
    return 'warning';
}

function badgeClass(status) {
    const tone = statusTone(status);
    if (tone === 'safe') return 'kt-badge-success';
    if (tone === 'danger') return 'kt-badge-destructive';
    if (tone === 'muted') return 'kt-badge-secondary';
    return 'kt-badge-warning';
}

function statusBadge(status) {
    return `<span class="kt-badge kt-badge-sm kt-badge-light ${badgeClass(status)}">${esc(stateLabel(status))}</span>`;
}

function stateLabel(value) {
    const labels = {
        draft: 'Draft',
        submitted: 'Menunggu Approval',
        budget_checked: 'Budget Checked',
        approved: 'Approved',
        rejected: 'Ditolak',
        converted_to_po: 'Converted',
        cancelled: 'Canceled',
        pending_approval: 'Pending Approval',
        partially_received: 'Partial Receive',
        fully_received: 'Fully Received',
        closed: 'Closed',
        pending: 'Pending',
        partial: 'Partial',
        completed: 'Completed',
        discrepancy: 'Discrepancy',
        accepted: 'Accepted',
        hold: 'Pending QC',
        partially_rejected: 'Partially Rejected',
        matched: 'Matched',
        posted: 'Posted',
        incomplete: 'Incomplete',
        ready: 'Ready',
        submitted_lpj: 'Submitted',
        active: 'Active',
        aktif: 'Aktif',
        lunas: 'Lunas'
    };
    return labels[value] || value || '-';
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function vendorName(id) {
    return pageState.state.vendors.find((vendor) => vendor.vendor_id === id)?.name || id || '-';
}

function itemName(id) {
    return pageState.state.items.find((item) => item.item_id === id)?.name || id || '-';
}

function optionRows(rows, idField, labelField, fallback = 'Belum ada data') {
    if (!rows.length) return `<option value="">${fallback}</option>`;
    return rows.map((row) => `<option value="${esc(row[idField])}">${esc(row[labelField] || row[idField])}</option>`).join('');
}

function requestOptions(rows) {
    if (!rows.length) return '<option value="">Tanpa PR</option>';
    return '<option value="">Tanpa PR</option>' + rows.map((row) => `<option value="${esc(row.request_id)}">${esc(row.request_id)} - ${esc(stateLabel(row.status))}</option>`).join('');
}

function poOptions(rows, fallback = 'Buat PO dahulu') {
    if (!rows.length) return `<option value="">${fallback}</option>`;
    return rows.map((row) => `<option value="${esc(row.po_id)}">${esc(row.po_id)} - ${esc(vendorName(row.vendor_id))}</option>`).join('');
}

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function field({ label, body, full = false }) {
    return `
        <div class="grid gap-1.5 ${full ? 'md:col-span-2' : ''}">
            <label class="text-sm font-medium text-mono">${esc(label)}</label>
            ${body}
        </div>
    `;
}

function safeJson(value) {
    try {
        return JSON.parse(value || '{}');
    } catch {
        return {};
    }
}

function getRfqRows() {
    return (pageState.state.auditLogs || [])
        .filter((log) => log.entity === 'procurement_rfq')
        .map((log) => {
            const after = safeJson(log.after_json);
            return {
                rfq_id: log.entity_id,
                request_id: after.request_id || '-',
                vendor_id: after.vendor_id || '',
                quoted_price: after.quoted_price || 0,
                selected_reason: after.selected_reason || '-',
                attachment: after.quotation_attachment || '',
                status: after.state || log.action || 'sent',
                created_at: log.created_at,
                user_id: log.user_id
            };
        });
}

function getLpjRows() {
    return (pageState.state.auditLogs || [])
        .filter((log) => log.entity === 'procurement_lpj')
        .map((log) => {
            const after = safeJson(log.after_json);
            return {
                po_id: log.entity_id,
                status: after.state || log.action || 'ready',
                document_packet_ref: after.document_packet_ref || '-',
                note: after.note || '-',
                created_at: log.created_at,
                user_id: log.user_id
            };
        });
}

function statusMatches(status) {
    return pageState.statusTab === 'all' || pageState.statusTab === status;
}

function getFilteredPrRows() {
    return pageState.state.purchaseRequests.filter((row) => {
        const status = row.status || 'draft';
        return statusMatches(status) && matchesQuery([row.request_id, row.sppg_id, row.requested_by, row.status, row.request_date]);
    });
}

function getFilteredPoRows() {
    return pageState.state.purchaseOrders.filter((row) => {
        const status = row.workflow_state || row.status || 'draft';
        return statusMatches(status) && matchesQuery([row.po_id, vendorName(row.vendor_id), row.po_date, row.delivery_date, row.total, status]);
    });
}

function getFilteredRfqRows() {
    return getRfqRows().filter((row) => {
        const status = row.status || 'sent';
        return statusMatches(status) && matchesQuery([row.rfq_id, row.request_id, vendorName(row.vendor_id), status, row.created_at]);
    });
}

function getFilteredReceivingRows() {
    return pageState.state.receivingRecords.filter((row) => {
        const status = row.qc_status || 'pending';
        const tabMatches = pageState.activeView === 'qc' ? statusMatches(status) : true;
        return tabMatches && matchesQuery([row.receiving_id, row.po_id, itemName(row.item_id), status, row.received_at]);
    });
}

function getFilteredInvoiceRows() {
    return pageState.state.supplierInvoices.filter((row) => {
        const status = row.payment_status || 'pending';
        return statusMatches(status) && matchesQuery([row.invoice_number, row.po_id, vendorName(row.vendor_id), status, row.invoice_date]);
    });
}

function getFilteredVendorRows() {
    return pageState.state.vendors.filter((row) => matchesQuery([row.vendor_id, row.name, row.category, row.contact_name, row.phone, row.status]));
}

function rowAction() {
    return `
        <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-outline" type="button" aria-label="Tindakan">
            <i class="ki-filled ki-dots-vertical"></i>
        </button>
    `;
}

function renderTable(headers, rows, emptyText, minWidth = 'min-w-[960px]') {
    return `
        <div class="kt-table-wrapper overflow-x-auto">
            <table class="kt-table kt-table-border ${minWidth}">
                <thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
                <tbody>${rows || `<tr><td colspan="${headers.length}" class="text-center text-secondary-foreground">${esc(emptyText)}</td></tr>`}</tbody>
            </table>
        </div>
    `;
}

function renderPagination(total, perPage = 6) {
    const pages = Math.max(Math.ceil(total / perPage), 1);
    return `
        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-secondary-foreground">
            <span>Menampilkan 1 - ${Math.min(total, perPage)} dari ${total} data</span>
            <div class="flex items-center gap-2">
                <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-outline" type="button"><i class="ki-filled ki-left"></i></button>
                ${Array.from({ length: Math.min(pages, 5) }, (_, index) => `
                    <button class="kt-btn kt-btn-sm ${index === 0 ? 'kt-btn-primary' : 'kt-btn-outline'}" type="button">${index + 1}</button>
                `).join('')}
                <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-outline" type="button"><i class="ki-filled ki-right"></i></button>
            </div>
        </div>
    `;
}

function renderStatusTabs(section) {
    const tabs = statusSets[section];
    if (!tabs) return '';
    const active = tabs.some(([id]) => id === pageState.statusTab) ? pageState.statusTab : tabs[0][0];
    return `
        <div class="kt-tabs kt-tabs-line border-b border-border" data-kt-tabs="true">
            ${tabs.map(([id, label]) => `
                <button class="kt-tab-toggle py-4 ${active === id ? 'active' : ''}" data-status-tab="${id}" type="button">${label}</button>
            `).join('')}
        </div>
    `;
}

function renderFilterToolbar({ placeholder = 'Cari data...', primary = '', panel = '', date = true } = {}) {
    return `
        <div class="flex flex-wrap items-center gap-3">
            <label class="kt-input min-w-[260px] flex-1">
                <i class="ki-filled ki-magnifier text-muted-foreground"></i>
                <input data-purchasing-filter="query" type="search" value="${esc(pageState.query)}" placeholder="${esc(placeholder)}">
            </label>
            ${date ? `
                <button class="kt-btn kt-btn-outline" type="button">
                    <i class="ki-filled ki-calendar"></i>Semua Tanggal
                </button>
            ` : ''}
            <button class="kt-btn kt-btn-outline" type="button">
                <i class="ki-filled ki-filter"></i>Filter
            </button>
            ${primary ? `<button class="kt-btn kt-btn-primary" data-create-panel="${panel}" type="button"><i class="ki-filled ki-plus"></i>${primary}</button>` : ''}
        </div>
    `;
}

function renderPageHeader({ title, subtitle, primary = '', panel = '', actions = '' }) {
    return `
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="grid gap-1">
                <h2 class="text-xl font-semibold text-mono">${esc(title)}</h2>
                <p class="text-sm text-secondary-foreground">${esc(subtitle)}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                ${actions}
                ${primary ? `<button class="kt-btn kt-btn-primary" data-create-panel="${panel}" type="button"><i class="ki-filled ki-plus"></i>${primary}</button>` : ''}
            </div>
        </div>
    `;
}

function routeViewFromHash() {
    const [, view = 'overview'] = window.location.hash.replace('#', '').split('/');
    return views.some((item) => item.id === view) ? view : 'overview';
}

function renderMetricCard({ label, value, note, icon, badge = 'Live', badgeClass = 'kt-badge-primary' }) {
    return `
        <article class="kt-card kt-card-border shadow-none purchasing-kpi-card">
            <div class="flex items-start justify-between gap-3 min-w-0">
                <div class="grid gap-1 min-w-0">
                    <span class="text-xs font-medium uppercase text-secondary-foreground truncate">${esc(label)}</span>
                    <strong class="text-2xl font-semibold leading-none text-mono truncate">${value}</strong>
                </div>
                <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                    <i class="ki-filled ${icon} text-lg"></i>
                </span>
            </div>
            <div class="flex items-center justify-between gap-3">
                <p class="truncate text-sm text-secondary-foreground">${esc(note)}</p>
                <span class="kt-badge kt-badge-sm kt-badge-light ${badgeClass}">${esc(badge)}</span>
            </div>
        </article>
    `;
}

function renderOverviewMetric({ label, value, note, tone = 'primary' }) {
    return `
        <article class="sipagi-overview-metric ${tone}">
            <div class="erp-stat-label">${esc(label)}</div>
            <div class="sipagi-metric-value">${value}</div>
            <div class="erp-stat-note">${esc(note)}</div>
        </article>
    `;
}

function renderWorkflowSteps() {
    const summary = getPurchasingSummaryFromState(pageState.state);
    const workflow = summary.workflow || {};
    const steps = [
        ['PR', 'Purchase Request', workflow.prAging || 0, 'ki-document'],
        ['RFQ', 'Request for Quotation', getRfqRows().length, 'ki-price-tag'],
        ['PO', 'Purchase Order', workflow.pendingApprovals || 0, 'ki-cheque'],
        ['Receiving', 'Penerimaan', workflow.partialDeliveries || 0, 'ki-delivery'],
        ['QC', 'Quality Check', getQcSummary().pending, 'ki-shield-tick'],
        ['Invoice', 'Invoice Matching', workflow.invoiceMismatch || 0, 'ki-bill'],
        ['LPJ', 'LPJ', workflow.lpjReady || 0, 'ki-archive']
    ];

    return `
        <section class="kt-card purchasing-overview-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Pipeline Pengadaan</h3>
                    <p class="kt-card-description">Status kerja dari PR sampai LPJ, dibuat compact supaya mudah dipindai.</p>
                </div>
            </div>
            <div class="kt-card-content">
                <div class="purchasing-pipeline-grid">
                    ${steps.map(([label, title, count, icon], index) => {
                        const active = Number(count) > 0 || index === 0;
                        return `
                            <div class="purchasing-pipeline-step ${active ? 'active' : ''}">
                                <span class="purchasing-pipeline-index">${index + 1}</span>
                                <div class="purchasing-pipeline-icon"><i class="ki-filled ${icon}"></i></div>
                                <div class="min-w-0">
                                    <strong>${esc(label)}</strong>
                                    <p>${esc(title)}</p>
                                </div>
                                <span class="kt-badge kt-badge-sm kt-badge-light ${Number(count) > 0 ? 'kt-badge-primary' : 'kt-badge-secondary'}">${count}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </section>
    `;
}

function renderPurchasingHero({ workflow, openPoValue }) {
    return `
        <section class="kt-card kt-card-border shadow-none purchasing-hero">
            <div class="purchasing-hero-copy">
                <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">Pengadaan</span>
                <h2>Overview Pengadaan SPPG</h2>
                <p>Pantau PR, PO, penerimaan, QC, invoice, dan LPJ dalam satu halaman kerja yang ringkas.</p>
            </div>
            <div class="purchasing-hero-actions">
                <button class="kt-btn kt-btn-primary" data-create-panel="purchase-request" type="button"><i class="ki-filled ki-plus"></i>New Purchase Request</button>
                <button class="kt-btn kt-btn-outline" data-action="refresh-purchasing" type="button"><i class="ki-filled ki-arrows-circle"></i>Refresh</button>
                <a class="kt-btn kt-btn-outline" href="#inventory"><i class="ki-filled ki-cube-2"></i>Cek Inventori</a>
            </div>
            <div class="purchasing-hero-summary">
                <div><span>Approval</span><strong>${workflow.pendingApprovals || 0}</strong></div>
                <div><span>PO Open</span><strong>${workflow.poOverdue || 0}</strong></div>
                <div><span>Komitmen</span><strong>Rp ${money(openPoValue)}</strong></div>
            </div>
        </section>
    `;
}

function renderPurchasingBudgetCard(summary, workflow, openPoValue) {
    const totalBudget = (pageState.state.budgets || []).reduce((sum, row) => sum + numberValue(row.budget_amount), 0);
    const utilization = Math.min(Number(workflow.budgetUtilization || 0), 100);
    return `
        <section class="kt-card min-w-0">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Ringkasan Budget</h3>
                    <p class="kt-card-description">Budget, komitmen PO, dan realisasi invoice.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4">
                <div class="purchasing-budget-main">
                    <span>Total Budget</span>
                    <strong>Rp ${money(totalBudget)}</strong>
                </div>
                ${[
                    ['Total Komitmen', `Rp ${money(openPoValue)}`],
                    ['Realisasi PO', `Rp ${money(summary.invoiceTotal || 0)}`],
                    ['Utilisasi', `${workflow.budgetUtilization || 0}%`]
                ].map(([label, value]) => `
                    <div class="purchasing-budget-row"><span>${label}</span><strong>${value}</strong></div>
                `).join('')}
                <div class="purchasing-budget-track"><span style="width:${utilization}%"></span></div>
            </div>
        </section>
    `;
}

function renderPurchasingActionQueue(workflow) {
    const queue = [
        ['PO terlambat', workflow.poOverdue || 0, 'danger', 'po'],
        ['Receiving pending', workflow.partialDeliveries || 0, 'warning', 'receiving'],
        ['QC pending', getQcSummary().pending, 'warning', 'qc'],
        ['Invoice belum match', workflow.invoiceMismatch || 0, 'danger', 'invoice']
    ];
    return `
        <section class="kt-card min-w-0">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Action Queue</h3>
                    <p class="kt-card-description">Pekerjaan yang perlu dicek hari ini.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-2">
                ${queue.map(([label, value, tone, view]) => `
                    <button class="purchasing-queue-row ${tone}" data-purchasing-view="${view}" type="button">
                        <span>${esc(label)}</span>
                        <strong>${value}</strong>
                    </button>
                `).join('')}
            </div>
        </section>
    `;
}

function getQcSummary() {
    const rows = pageState.state.receivingRecords || [];
    return {
        accepted: rows.filter((row) => row.qc_status === 'accepted').length,
        partiallyRejected: rows.filter((row) => row.qc_status === 'partially_rejected').length,
        rejected: rows.filter((row) => row.qc_status === 'rejected').length,
        pending: rows.filter((row) => !row.qc_status || row.qc_status === 'pending' || row.qc_status === 'hold').length
    };
}

function renderOverview() {
    const summary = getPurchasingSummaryFromState(pageState.state);
    const workflow = summary.workflow || {};
    const openPoValue = pageState.state.purchaseOrders
        .filter((po) => !['closed', 'cancelled', 'fully_received'].includes(po.workflow_state || po.status))
        .reduce((sum, po) => sum + numberValue(po.total), 0);
    const recent = [
        ...pageState.state.purchaseOrders.map((po) => ({ doc: po.po_id, activity: 'PO dibuat', user: po.created_by || 'Purchasing', time: po.po_date, status: po.status })),
        ...pageState.state.receivingRecords.map((row) => ({ doc: row.receiving_id, activity: 'Penerimaan barang', user: row.received_by || 'Warehouse', time: row.received_at, status: row.qc_status })),
        ...pageState.state.supplierInvoices.map((row) => ({ doc: row.invoice_number, activity: 'Invoice matching', user: 'Finance', time: row.invoice_date, status: row.payment_status }))
    ].filter((row) => row.doc).slice(0, 6);
    const activityRows = recent.map((row) => `
        <tr>
            <td class="font-medium text-primary">${esc(row.doc)}</td>
            <td>${esc(row.activity)}</td>
            <td>${esc(row.user)}</td>
            <td>${esc(row.time || '-')}</td>
            <td>${statusBadge(row.status)}</td>
        </tr>
    `).join('');

    return `
        <div class="sipagi-overview-content purchasing-overview">
            <div class="sipagi-overview-header flex flex-wrap items-start justify-between gap-4">
                <div class="sipagi-card-heading">
                    <h3>Overview Pengadaan</h3>
                    <p>Ringkasan PR, PO, penerimaan, QC, invoice, LPJ, dan action queue harian.</p>
                </div>
                <div class="sipagi-overview-actions">
                    <button class="kt-btn kt-btn-primary" data-create-panel="purchase-request" type="button"><i class="ki-filled ki-plus"></i>Purchase Request</button>
                    <button class="kt-btn kt-btn-outline" data-action="refresh-purchasing" type="button"><i class="ki-filled ki-arrows-circle"></i>Refresh</button>
                    <a class="kt-btn kt-btn-outline" href="#inventory"><i class="ki-filled ki-cube-2"></i>Cek Inventori</a>
                </div>
            </div>
            <div class="sipagi-overview-grid">
                ${renderOverviewMetric({ label: 'Vendor Aktif', value: summary.vendors || 0, note: 'Supplier siap dipakai PO', tone: 'success' })}
                ${renderOverviewMetric({ label: 'PR Menunggu Approval', value: workflow.pendingApprovals || 0, note: 'Butuh keputusan hari ini', tone: 'warning' })}
                ${renderOverviewMetric({ label: 'PO Berjalan', value: summary.openOrders || 0, note: 'Belum closed / selesai', tone: 'primary' })}
                ${renderOverviewMetric({ label: 'Pending QC', value: getQcSummary().pending, note: 'Penerimaan perlu cek', tone: 'warning' })}
            </div>
            <div class="sipagi-overview-secondary">
                <section class="sipagi-panel">
                    <div class="sipagi-card-heading">
                        <h3>Alur Pengadaan</h3>
                        <p>Flow utama dari request sampai LPJ.</p>
                    </div>
                    <div class="sipagi-process-list">
                        ${[
                            ['PR', workflow.prAging || 0],
                            ['RFQ', getRfqRows().length],
                            ['PO', workflow.pendingApprovals || 0],
                            ['Receiving', workflow.partialDeliveries || 0],
                            ['QC', getQcSummary().pending],
                            ['Invoice', workflow.invoiceMismatch || 0],
                            ['LPJ', workflow.lpjReady || 0]
                        ].map(([label, count]) => `<span>${esc(label)} · ${count}</span>`).join('')}
                    </div>
                </section>
                <section class="sipagi-panel">
                    <div class="sipagi-card-heading">
                        <h3>Action Queue</h3>
                        <p>Pekerjaan yang paling perlu didahulukan.</p>
                    </div>
                    <div class="sipagi-priority-list">
                        ${[
                            ['PO terlambat', workflow.poOverdue || 0, 'po'],
                            ['Receiving pending', workflow.partialDeliveries || 0, 'receiving'],
                            ['QC pending', getQcSummary().pending, 'qc'],
                            ['Invoice belum match', workflow.invoiceMismatch || 0, 'invoice']
                        ].map(([label, value, view]) => `
                            <button class="sipagi-priority-item purchasing-priority-button" data-purchasing-view="${view}" type="button">
                                <span><strong>${esc(label)}</strong><small>${value ? 'Perlu tindak lanjut' : 'Tidak ada antrian'}</small></span>
                                <span class="kt-badge kt-badge-sm kt-badge-light ${value ? 'kt-badge-warning' : 'kt-badge-success'}">${value}</span>
                            </button>
                        `).join('')}
                    </div>
                </section>
            </div>
            <div class="sipagi-overview-grid">
                ${renderOverviewMetric({ label: 'Dalam Penerimaan', value: summary.receivedOrders || 0, note: 'GRN tercatat', tone: 'primary' })}
                ${renderOverviewMetric({ label: 'Nilai PO Berjalan', value: `Rp ${money(openPoValue)}`, note: 'Komitmen terbuka', tone: 'neutral' })}
                ${renderOverviewMetric({ label: 'Realisasi Invoice', value: `Rp ${money(summary.invoiceTotal || 0)}`, note: 'Invoice tercatat', tone: 'success' })}
                ${renderOverviewMetric({ label: 'Utilisasi Budget', value: `${workflow.budgetUtilization || 0}%`, note: 'Budget pengadaan', tone: 'neutral' })}
            </div>
            ${pageState.createPanel === 'purchase-request' ? renderRequestForm() : ''}
            <div class="purchasing-overview-bottom single">
                <section class="kt-card kt-card-border shadow-none min-w-0">
                    <div class="kt-card-header flex-wrap gap-3">
                        <div>
                            <h3 class="kt-card-title">Aktivitas Terbaru</h3>
                            <p class="kt-card-description">Dokumen terbaru dari PO, receiving, dan invoice.</p>
                        </div>
                        <button class="kt-btn kt-btn-sm kt-btn-outline" data-purchasing-view="po" type="button">Lihat Semua</button>
                    </div>
                    <div class="kt-card-content">
                        ${renderTable(['Dokumen', 'Aktivitas', 'User/Role', 'Waktu', 'Status'], activityRows, 'Belum ada aktivitas.', 'min-w-[760px]')}
                    </div>
                </section>
            </div>
        </div>
    `;
}

function renderRequestForm() {
    return `
        <form class="kt-card" data-purchasing-form="purchase-request">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Buat Purchase Request</h3>
                    <p class="kt-card-description">Mulai dari kebutuhan menu planning atau shortage.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 md:grid-cols-2">
                ${field({ label: 'Tanggal Request', body: `<input class="kt-input" name="request_date" type="date" value="${today()}">` })}
                ${field({ label: 'Tanggal Dibutuhkan', body: '<input class="kt-input" name="needed_date" type="date" required>' })}
                ${field({ label: 'Item Bahan', body: `<select class="kt-input" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventory dahulu')}</select>` })}
                ${field({ label: 'Qty Request', body: '<input class="kt-input" name="qty" type="number" min="0" step="0.01" required>' })}
                ${field({ label: 'Estimasi Harga', body: '<input class="kt-input" name="estimated_unit_price" type="number" min="0" step="100" required>' })}
                ${field({ label: 'Submit sekarang', body: '<select class="kt-input" name="submit_now"><option value="on">Submitted</option><option value="">Draft</option></select>' })}
                ${field({ label: 'Alasan kebutuhan', full: true, body: '<textarea class="kt-input min-h-24" name="note" placeholder="Contoh: kebutuhan produksi besok"></textarea>' })}
            </div>
            <div class="kt-card-footer justify-end">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="cancel-create-panel" type="button">Tutup</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan PR</button>
            </div>
        </form>
    `;
}

function renderPrSection() {
    const rows = getFilteredPrRows();
    const tableRows = rows.slice(0, 6).map((row) => `
        <tr>
            <td class="font-medium text-primary">${esc(row.request_id)}</td>
            <td>${esc(row.request_date || '-')}</td>
            <td>${esc(row.sppg_id || '-')}</td>
            <td>${esc(row.requested_by || '-')}</td>
            <td>${esc(row.total_items || '-')}</td>
            <td>Rp ${money(row.estimated_total || 0)}</td>
            <td>${statusBadge(row.status || 'draft')}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');

    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'Purchase Request', subtitle: 'Kelola permintaan pembelian barang/jasa' })}
            ${renderStatusTabs('pr')}
            ${renderFilterToolbar({ placeholder: 'Cari PR, item, requester, SPPG...', primary: 'Buat PR', panel: 'purchase-request' })}
            ${pageState.createPanel === 'purchase-request' ? renderRequestForm() : ''}
            <section class="kt-card">
                <div class="kt-card-content">
                    ${renderTable(['No. PR', 'Tanggal', 'SPPG', 'Diminta Oleh', 'Total Item', 'Estimasi', 'Status', 'Aksi'], tableRows, 'Belum ada Purchase Request.')}
                    ${renderPagination(rows.length)}
                </div>
            </section>
            ${renderPrDetail(rows[0])}
        </div>
    `;
}

function renderPrDetail(row) {
    if (!row) return '';
    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <h3 class="kt-card-title">${esc(row.request_id)}</h3>
                        ${statusBadge(row.status || 'draft')}
                    </div>
                    <p class="kt-card-description">Detail, approval, lampiran, dan riwayat ditampilkan tanpa mengubah approval logic.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="kt-btn kt-btn-sm kt-btn-outline" type="button">Tindakan</button>
                    <button class="kt-btn kt-btn-sm kt-btn-primary" type="button"><i class="ki-filled ki-pencil"></i>Edit</button>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
                <div class="grid gap-4">
                    ${renderDetailTabs(['Detail', 'Item', 'Approval', 'Lampiran', 'Riwayat'])}
                    <div class="grid gap-4 md:grid-cols-2">
                        ${renderInfoCard('Informasi PR', [
                            ['Tanggal Request', row.request_date],
                            ['SPPG', row.sppg_id],
                            ['Diminta Oleh', row.requested_by],
                            ['Status Budget', 'Aman']
                        ])}
                        ${renderInfoCard('Ringkasan Budget', [
                            ['Total Item', row.total_items || '-'],
                            ['Total Estimasi', `Rp ${money(row.estimated_total || 0)}`],
                            ['Budget Tersedia', '-'],
                            ['Persentase', '-']
                        ])}
                    </div>
                </div>
                <div class="grid gap-4">
                    ${renderInfoCard('Catatan', [['Keterangan', row.note || '-']])}
                    ${renderInfoCard('Approval Saat Ini', [['Role', 'Kepala SPPG'], ['Status', stateLabel(row.status)]])}
                    ${renderInfoCard('Lampiran', [['File', row.attachment || '-']])}
                </div>
            </div>
        </section>
    `;
}

function renderDetailTabs(labels) {
    return `
        <div class="kt-tabs kt-tabs-line border-b border-border" data-kt-tabs="true">
            ${labels.map((label, index) => `<button class="kt-tab-toggle py-3 ${index === 0 ? 'active' : ''}" type="button">${esc(label)}</button>`).join('')}
        </div>
    `;
}

function renderInfoCard(title, rows) {
    return `
        <div class="kt-card kt-card-border shadow-none">
            <div class="kt-card-header"><h4 class="kt-card-title">${esc(title)}</h4></div>
            <div class="kt-card-content grid gap-3">
                ${rows.map(([label, value]) => `
                    <div class="flex items-start justify-between gap-4 text-sm">
                        <span class="text-secondary-foreground">${esc(label)}</span>
                        <strong class="text-end text-mono">${esc(value || '-')}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderRfqForm() {
    return `
        <form class="kt-card" data-purchasing-form="rfq">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Buat RFQ Evidence</h3>
                    <p class="kt-card-description">Quotation dan alasan supplier disimpan sebagai audit evidence.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 md:grid-cols-2">
                ${field({ label: 'PR Reference', body: `<select class="kt-input" name="request_id">${requestOptions(pageState.state.purchaseRequests)}</select>` })}
                ${field({ label: 'Supplier', body: `<select class="kt-input" name="vendor_id" required>${optionRows(pageState.state.vendors, 'vendor_id', 'name', 'Tambah vendor dahulu')}</select>` })}
                ${field({ label: 'RFQ Action', body: '<select class="kt-input" name="rfq_action"><option value="quoted">Quoted</option><option value="compared">Compared</option><option value="selected">Selected</option></select>' })}
                ${field({ label: 'Harga Quotation', body: '<input class="kt-input" name="quoted_price" type="number" min="0" step="100" required>' })}
                ${field({ label: 'Alasan Supplier Terpilih', full: true, body: '<textarea class="kt-input min-h-24" name="selected_reason" required></textarea>' })}
                ${field({ label: 'Supplier Replacement Reason', body: '<input class="kt-input" name="supplier_replacement_reason" placeholder="Isi jika ganti supplier">' })}
                ${field({ label: 'Attachment Quotation', body: '<input class="kt-input" name="quotation_attachment" placeholder="URL / Drive ID" required>' })}
            </div>
            <div class="kt-card-footer justify-end">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="cancel-create-panel" type="button">Tutup</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan RFQ</button>
            </div>
        </form>
    `;
}

function renderRfqSection() {
    const rows = getFilteredRfqRows();
    const tableRows = rows.slice(0, 6).map((row) => `
        <tr>
            <td class="font-medium text-primary">${esc(row.rfq_id)}</td>
            <td>${esc((row.created_at || '').slice(0, 10) || '-')}</td>
            <td>${esc(row.request_id)}</td>
            <td>${esc(row.sppg_id || '-')}</td>
            <td>${statusBadge(row.status)}</td>
            <td>${esc(row.deadline || '-')}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');

    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'RFQ (Request for Quotation)', subtitle: 'Kelola permintaan penawaran dari supplier' })}
            ${renderStatusTabs('rfq')}
            ${renderFilterToolbar({ placeholder: 'Cari RFQ, supplier, item...', primary: 'Buat RFQ', panel: 'rfq' })}
            ${pageState.createPanel === 'rfq' ? renderRfqForm() : ''}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['No. RFQ', 'Tanggal', 'PR Referensi', 'SPPG', 'Status', 'Batas Waktu', 'Aksi'], tableRows, 'Belum ada RFQ.')}${renderPagination(rows.length, 5)}</div></section>
            ${renderRfqDetail(rows[0])}
        </div>
    `;
}

function renderRfqDetail(row) {
    if (!row) return '';
    const supplierRows = getRfqRows().slice(0, 4);
    const comparisonRows = supplierRows.map((supplier, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${esc(vendorName(supplier.vendor_id))}</td>
            <td>Rp ${money(supplier.quoted_price)}</td>
            <td>${esc(supplier.selected_reason)}</td>
            <td>${statusBadge(supplier.status)}</td>
        </tr>
    `).join('');

    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <h3 class="kt-card-title">${esc(row.rfq_id)}</h3>
                        ${statusBadge(row.status)}
                    </div>
                    <p class="kt-card-description">Detail RFQ dan perbandingan supplier.</p>
                </div>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="button">Pilih Supplier</button>
            </div>
            <div class="kt-card-content grid gap-4">
                ${renderDetailTabs(['Detail', 'Item', 'Penawaran Supplier', 'Perbandingan', 'Lampiran', 'Riwayat'])}
                <div class="grid gap-4 lg:grid-cols-2">
                    ${renderInfoCard('Informasi RFQ', [['PR Referensi', row.request_id], ['Tanggal RFQ', (row.created_at || '').slice(0, 10)], ['Metode Pemilihan', 'Perbandingan Harga'], ['Status', stateLabel(row.status)]])}
                    ${renderInfoCard('Ringkasan Penawaran', [['Total Supplier', supplierRows.length], ['Terima Penawaran', supplierRows.filter((supplier) => supplier.status === 'quoted' || supplier.status === 'selected').length], ['Tidak Merespon', 0], ['Ditolak', 0]])}
                </div>
                ${renderTable(['No.', 'Supplier', 'Total Penawaran', 'Alasan', 'Status'], comparisonRows, 'Belum ada penawaran supplier.', 'min-w-[760px]')}
            </div>
        </section>
    `;
}

function renderPoForm() {
    return `
        <form class="kt-card" data-purchasing-form="purchase-order">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Buat Purchase Order</h3>
                    <p class="kt-card-description">Gate tetap memakai validasi existing: supplier, item, delivery date, budget, dan approval.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 md:grid-cols-2">
                ${field({ label: 'PR Reference', body: `<select class="kt-input" name="request_id">${requestOptions(pageState.state.purchaseRequests)}</select>` })}
                ${field({ label: 'Vendor', body: `<select class="kt-input" name="vendor_id" required>${optionRows(pageState.state.vendors, 'vendor_id', 'name', 'Tambah vendor dahulu')}</select>` })}
                ${field({ label: 'Item Bahan', body: `<select class="kt-input" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventory dahulu')}</select>` })}
                ${field({ label: 'Tanggal PO', body: `<input class="kt-input" name="po_date" type="date" value="${today()}">` })}
                ${field({ label: 'Tanggal Kebutuhan', body: '<input class="kt-input" name="delivery_date" type="date" required>' })}
                ${field({ label: 'Qty', body: '<input class="kt-input" name="qty" type="number" min="0" step="0.01" required>' })}
                ${field({ label: 'Harga Satuan', body: '<input class="kt-input" name="unit_price" type="number" min="0" step="100" required>' })}
                ${field({ label: 'Pajak', body: '<input class="kt-input" name="tax" type="number" min="0" step="100" value="0">' })}
                ${field({ label: 'Role Aktor', body: '<select class="kt-input" name="actor_role"><option value="purchasing">Purchasing</option><option value="kepala_sppg">Kepala SPPG</option><option value="finance">Finance</option><option value="yayasan/admin">Yayasan/Admin</option></select>' })}
                ${field({ label: 'Approver', body: '<input class="kt-input" name="approver" placeholder="Wajib jika threshold/exception butuh approval">' })}
                ${field({ label: 'Emergency', body: '<select class="kt-input" name="emergency_flag"><option value="">Tidak</option><option value="on">Ya</option></select>' })}
                ${field({ label: 'Exception Type', body: '<select class="kt-input" name="exception_type"><option value="">Tidak ada</option><option value="emergency_purchase">Emergency purchase</option><option value="supplier_change">Supplier change</option><option value="budget_overrun">Budget overrun</option><option value="po_cancellation_after_approval">PO cancellation after approval</option></select>' })}
                ${field({ label: 'Reason Code', body: '<input class="kt-input" name="exception_reason_code" placeholder="Contoh: urgent_production">' })}
                ${field({ label: 'Attachment Ref', body: '<input class="kt-input" name="attachment_ref" placeholder="URL / Drive ID bukti pendukung">' })}
                ${field({ label: 'Exception Note', full: true, body: '<textarea class="kt-input min-h-24" name="exception_note" placeholder="Catatan exception untuk audit trail"></textarea>' })}
                ${field({ label: 'Budget Override Reason', full: true, body: '<input class="kt-input" name="budget_override_reason" placeholder="Wajib jika budget overrun">' })}
            </div>
            <div class="kt-card-footer justify-end">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="cancel-create-panel" type="button">Tutup</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan PO</button>
            </div>
        </form>
    `;
}

function renderPoSection() {
    const rows = getFilteredPoRows();
    const tableRows = rows.slice(0, 6).map((po) => `
        <tr>
            <td class="font-medium text-primary">${esc(po.po_id)}</td>
            <td>${esc(po.po_date || '-')}</td>
            <td>${esc(vendorName(po.vendor_id))}</td>
            <td>${esc(po.sppg_id || 'SPPG Nakala')}</td>
            <td>Rp ${money(po.total)}</td>
            <td>${statusBadge(po.workflow_state || po.status || 'draft')}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');

    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'Purchase Order', subtitle: 'Kelola pesanan pembelian' })}
            ${renderStatusTabs('po')}
            ${renderFilterToolbar({ placeholder: 'Cari PO, supplier...', primary: 'Buat PO', panel: 'purchase-order' })}
            ${pageState.createPanel === 'purchase-order' ? renderPoForm() : ''}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['No. PO', 'Tanggal', 'Supplier', 'SPPG', 'Total PO', 'Status', 'Aksi'], tableRows, 'Belum ada Purchase Order.')}${renderPagination(rows.length)}</div></section>
            ${renderPoDetail(rows[0])}
        </div>
    `;
}

function renderPoDetail(po) {
    if (!po) return '';
    const items = pageState.state.purchaseOrderItems.filter((item) => item.po_id === po.po_id);
    const itemRows = items.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${esc(itemName(item.item_id))}</td>
            <td>${money(item.qty)} ${esc(item.unit || '')}</td>
            <td>Rp ${money(item.unit_price)}</td>
            <td>Rp ${money(item.total_price)}</td>
            <td>${statusBadge(po.workflow_state || po.status)}</td>
        </tr>
    `).join('');
    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <h3 class="kt-card-title">${esc(po.po_id)}</h3>
                        ${statusBadge(po.workflow_state || po.status)}
                    </div>
                    <p class="kt-card-description">Ringkasan PO, penerimaan, item, dan invoice.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="kt-btn kt-btn-sm kt-btn-outline" type="button">Tindakan</button>
                    <button class="kt-btn kt-btn-sm kt-btn-primary" type="button"><i class="ki-filled ki-pencil"></i>Edit</button>
                </div>
            </div>
            <div class="kt-card-content grid gap-4">
                ${renderDetailTabs(['Detail', 'Item', 'Pengiriman', 'Penerimaan', 'Invoice', 'Lampiran', 'Riwayat'])}
                <div class="grid gap-4 lg:grid-cols-2">
                    ${renderInfoCard('Informasi PO', [['Supplier', vendorName(po.vendor_id)], ['SPPG', po.sppg_id || 'SPPG Nakala'], ['Tanggal PO', po.po_date], ['Target Kirim', po.delivery_date], ['Total PO', `Rp ${money(po.total)}`]])}
                    <div class="kt-card kt-card-border shadow-none">
                        <div class="kt-card-header"><h4 class="kt-card-title">Ringkasan Penerimaan</h4></div>
                        <div class="kt-card-content grid gap-4">
                            <div class="flex justify-between text-sm"><span>Total Order</span><strong>${money(po.ordered_qty || 0)}</strong></div>
                            <div class="kt-progress kt-progress-success"><div class="kt-progress-indicator w-full"></div></div>
                            <div class="flex justify-between text-sm"><span>Total Diterima</span><strong>${money(po.received_qty || 0)}</strong></div>
                            <div class="kt-progress kt-progress-primary"><div class="kt-progress-indicator w-2/3"></div></div>
                            <div class="flex justify-between text-sm"><span>Sisa</span><strong>${money(po.outstanding_qty || 0)}</strong></div>
                            <div class="kt-progress kt-progress-warning"><div class="kt-progress-indicator w-1/3"></div></div>
                        </div>
                    </div>
                </div>
                ${renderTable(['No', 'Item', 'Qty Order', 'Harga Satuan', 'Total', 'Status'], itemRows, 'Belum ada item PO.', 'min-w-[760px]')}
            </div>
        </section>
    `;
}

function renderReceivingForm() {
    const receivableOrders = pageState.state.purchaseOrders.filter((po) => ['approved', 'partially_received'].includes(po.workflow_state || po.status));
    return `
        <form class="kt-card" data-purchasing-form="receiving">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Buat GRN</h3>
                    <p class="kt-card-description">Receiving wajib mereferensikan PO approved. Stok final setelah QC accepted.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 md:grid-cols-2">
                ${field({ label: 'PO Approved', body: `<select class="kt-input" name="po_id" required>${poOptions(receivableOrders, 'Tidak ada PO approved')}</select>` })}
                ${field({ label: 'Item Bahan', body: `<select class="kt-input" name="item_id" required>${optionRows(pageState.state.items, 'item_id', 'name', 'Tambah item inventory dahulu')}</select>` })}
                ${field({ label: 'Qty Diterima', body: '<input class="kt-input" name="received_qty" type="number" min="0" step="0.01" required>' })}
                ${field({ label: 'Qty Ditolak', body: '<input class="kt-input" name="rejected_qty" type="number" min="0" step="0.01" value="0">' })}
                ${field({ label: 'QC Disposition', body: '<select class="kt-input" name="qc_status"><option value="accepted">Accepted</option><option value="hold">Hold</option><option value="rejected">Rejected</option></select>' })}
                ${field({ label: 'Suhu', body: '<input class="kt-input" name="temperature" placeholder="Contoh: 5 C">' })}
                ${field({ label: 'Kode Batch', body: '<input class="kt-input" name="batch_code">' })}
                ${field({ label: 'Tanggal Expired', body: '<input class="kt-input" name="expiry_date" type="date">' })}
                ${field({ label: 'Lokasi', body: '<input class="kt-input" name="location" value="Gudang Utama">' })}
                ${field({ label: 'Diterima Pada', body: '<input class="kt-input" name="received_at" type="datetime-local">' })}
                ${field({ label: 'Exception Reason Code', body: '<input class="kt-input" name="exception_reason_code" placeholder="partial_delivery / damaged_item">' })}
                ${field({ label: 'Attachment Ref', body: '<input class="kt-input" name="attachment_ref" placeholder="URL / Drive ID bukti">' })}
                ${field({ label: 'QC Note', full: true, body: '<textarea class="kt-input min-h-24" name="qc_note" placeholder="Wajib jika reject / discrepancy"></textarea>' })}
            </div>
            <div class="kt-card-footer justify-end">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="cancel-create-panel" type="button">Tutup</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan GRN + QC</button>
            </div>
        </form>
    `;
}

function renderReceivingSection() {
    const rows = getFilteredReceivingRows();
    const tableRows = rows.slice(0, 6).map((row) => `
        <tr>
            <td class="font-medium text-primary">${esc(row.receiving_id)}</td>
            <td>${esc((row.received_at || '').slice(0, 10) || '-')}</td>
            <td class="text-primary">${esc(row.po_id)}</td>
            <td>${esc(vendorName(pageState.state.purchaseOrders.find((po) => po.po_id === row.po_id)?.vendor_id))}</td>
            <td>${statusBadge(row.qc_status || 'pending')}</td>
            <td>${money(row.received_qty || 0)}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');

    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'Penerimaan Barang (GRN)', subtitle: 'Kelola penerimaan barang dari supplier' })}
            ${renderFilterToolbar({ placeholder: 'Cari GRN, PO, supplier...', primary: 'Buat GRN', panel: 'receiving' })}
            ${pageState.createPanel === 'receiving' ? renderReceivingForm() : ''}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['No. GRN', 'Tanggal', 'PO Referensi', 'Supplier', 'Status', 'Total Diterima', 'Aksi'], tableRows, 'Belum ada GRN.')}${renderPagination(rows.length)}</div></section>
        </div>
    `;
}

function renderQcSection() {
    const summary = getQcSummary();
    const rows = getFilteredReceivingRows();
    const tableRows = rows.slice(0, 6).map((row) => `
        <tr>
            <td class="font-medium text-primary">QC-${esc(row.receiving_id || '-')}</td>
            <td>${esc((row.received_at || '').slice(0, 10) || '-')}</td>
            <td class="text-primary">${esc(row.receiving_id)}</td>
            <td>${statusBadge(row.qc_status || 'pending')}</td>
            <td>${statusBadge(row.qc_status || 'pending')}</td>
            <td>${esc(row.received_by || 'Tim QC')}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');

    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'Quality Check', subtitle: 'Periksa kualitas barang yang diterima' })}
            ${renderStatusTabs('qc')}
            ${renderFilterToolbar({ placeholder: 'Cari No. QC, item, GRN referensi...', primary: 'Buat QC', panel: 'receiving' })}
            ${pageState.createPanel === 'receiving' ? renderReceivingForm() : ''}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['No. QC', 'Tanggal', 'GRN Referensi', 'Status', 'Hasil QC', 'Diperiksa Oleh', 'Aksi'], tableRows, 'Belum ada QC.')}${renderPagination(rows.length)}</div></section>
            <section class="kt-card">
                <div class="kt-card-header"><h3 class="kt-card-title">Ringkasan Hasil QC</h3></div>
                <div class="kt-card-content grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    ${renderMetricCard({ label: 'Accepted', value: summary.accepted, note: 'Barang diterima stok', icon: 'ki-check-circle', badge: 'OK', badgeClass: 'kt-badge-success' })}
                    ${renderMetricCard({ label: 'Partially Rejected', value: summary.partiallyRejected, note: 'Sebagian ditolak', icon: 'ki-information-2', badge: 'Review', badgeClass: 'kt-badge-warning' })}
                    ${renderMetricCard({ label: 'Rejected', value: summary.rejected, note: 'Tidak masuk stok', icon: 'ki-cross-circle', badge: 'Reject', badgeClass: 'kt-badge-destructive' })}
                    ${renderMetricCard({ label: 'Pending', value: summary.pending, note: 'Menunggu pemeriksaan', icon: 'ki-time', badge: 'Pending', badgeClass: 'kt-badge-secondary' })}
                </div>
            </section>
        </div>
    `;
}

function renderVendorForm() {
    return `
        <form class="kt-card" data-purchasing-form="vendor">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Tambah Supplier</h3>
                    <p class="kt-card-description">Supplier aktif saja yang bisa dipakai pada PO.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 md:grid-cols-2">
                ${field({ label: 'Nama Supplier', body: '<input class="kt-input" name="name" required>' })}
                ${field({ label: 'Kategori', body: '<input class="kt-input" name="category" placeholder="Sayur, beras, protein..." required>' })}
                ${field({ label: 'PIC', body: '<input class="kt-input" name="contact_name" required>' })}
                ${field({ label: 'No. HP', body: '<input class="kt-input" name="phone" required>' })}
                ${field({ label: 'Rating', body: '<select class="kt-input" name="rating"><option value="baru">Baru</option><option value="baik">Baik</option><option value="prioritas">Prioritas</option><option value="evaluasi">Evaluasi</option></select>' })}
                ${field({ label: 'Termin Bayar', body: '<input class="kt-input" name="payment_term" value="tempo 7 hari">' })}
                ${field({ label: 'Alamat', full: true, body: '<textarea class="kt-input min-h-24" name="address"></textarea>' })}
            </div>
            <div class="kt-card-footer justify-end">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="cancel-create-panel" type="button">Tutup</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Simpan Supplier</button>
            </div>
        </form>
    `;
}

function renderSupplierSection() {
    const rows = getFilteredVendorRows();
    const tableRows = rows.slice(0, 8).map((row) => `
        <tr>
            <td class="font-medium text-mono">${esc(row.name)}</td>
            <td>${esc(row.category)}</td>
            <td>${esc(row.contact_name)}</td>
            <td>${esc(row.phone)}</td>
            <td>${esc(row.payment_term)}</td>
            <td>${statusBadge(row.status || 'active')}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');
    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'Master Supplier', subtitle: 'Kelola supplier aktif, kontak, rating, dan termin pembayaran' })}
            ${renderFilterToolbar({ placeholder: 'Cari supplier, kategori, PIC...', primary: 'Tambah Supplier', panel: 'vendor', date: false })}
            ${pageState.createPanel === 'vendor' ? renderVendorForm() : ''}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['Supplier', 'Kategori', 'PIC', 'HP', 'Termin', 'Status', 'Aksi'], tableRows, 'Belum ada supplier.')}${renderPagination(rows.length, 8)}</div></section>
        </div>
    `;
}

function renderInvoiceForm() {
    const invoiceReadyOrders = pageState.state.purchaseOrders.filter((po) => ['fully_received', 'closed'].includes(po.workflow_state || po.status));
    return `
        <form class="kt-card" data-purchasing-form="invoice">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Catat Faktur Supplier</h3>
                    <p class="kt-card-description">Invoice hanya matched jika PO, GRN, dan QC sudah sesuai.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 md:grid-cols-2">
                ${field({ label: 'Vendor', body: `<select class="kt-input" name="vendor_id" required>${optionRows(pageState.state.vendors, 'vendor_id', 'name', 'Tambah vendor dahulu')}</select>` })}
                ${field({ label: 'PO Fully Received', body: `<select class="kt-input" name="po_id" required>${poOptions(invoiceReadyOrders, 'Tidak ada PO fully received')}</select>` })}
                ${field({ label: 'Nomor Faktur', body: '<input class="kt-input" name="invoice_number" required>' })}
                ${field({ label: 'Tanggal Faktur', body: `<input class="kt-input" name="invoice_date" type="date" value="${today()}">` })}
                ${field({ label: 'Nilai', body: '<input class="kt-input" name="amount" type="number" min="0" step="100" required>' })}
                ${field({ label: 'File Faktur', body: '<input class="kt-input" name="file_url" placeholder="URL / Drive ID faktur">' })}
                ${field({ label: 'Mismatch Reason Code', body: '<input class="kt-input" name="mismatch_reason_code" placeholder="amount_mismatch">' })}
                ${field({ label: 'Approver', body: '<input class="kt-input" name="approver" placeholder="Wajib jika discrepancy">' })}
                ${field({ label: 'Mismatch Note', full: true, body: '<textarea class="kt-input min-h-24" name="mismatch_reason"></textarea>' })}
            </div>
            <div class="kt-card-footer justify-end">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="cancel-create-panel" type="button">Tutup</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Run 3-Way Match</button>
            </div>
        </form>
    `;
}

function renderInvoiceSection() {
    const rows = getFilteredInvoiceRows();
    const tableRows = rows.slice(0, 6).map((row) => {
        const po = pageState.state.purchaseOrders.find((candidate) => candidate.po_id === row.po_id);
        const variance = Math.abs(numberValue(row.amount) - numberValue(po?.total));
        return `
            <tr>
                <td><button class="kt-btn kt-btn-sm kt-btn-ghost text-primary" data-purchasing-invoice="${esc(row.invoice_id)}" type="button">${esc(row.invoice_number)}</button></td>
                <td>${esc(row.invoice_date || '-')}</td>
                <td class="text-primary">${esc(row.po_id)}</td>
                <td>${esc(vendorName(row.vendor_id))}</td>
                <td>${statusBadge(row.payment_status || 'pending')}</td>
                <td>Rp ${money(variance)}</td>
                <td>${rowAction()}</td>
            </tr>
        `;
    }).join('');
    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'Invoice Matching', subtitle: 'Cocokkan invoice dengan PO dan GRN' })}
            ${renderStatusTabs('invoice')}
            ${renderFilterToolbar({ placeholder: 'Cari invoice, PO, supplier...', primary: 'Catat Invoice', panel: 'invoice' })}
            ${pageState.createPanel === 'invoice' ? renderInvoiceForm() : ''}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['No. Invoice', 'Tanggal', 'PO Referensi', 'Supplier', 'Status', 'Selisih', 'Aksi'], tableRows, 'Belum ada invoice.')}${renderPagination(rows.length)}</div></section>
        </div>
    `;
}

function renderPaymentSection() {
    const rows = pageState.state.supplierInvoices;
    const tableRows = rows.slice(0, 8).map((row) => `
        <tr>
            <td><button class="kt-btn kt-btn-sm kt-btn-ghost text-primary" data-purchasing-invoice="${esc(row.invoice_id)}" type="button">${esc(row.invoice_number)}</button></td>
            <td>${esc(row.invoice_date || '-')}</td>
            <td>${esc(vendorName(row.vendor_id))}</td>
            <td>Rp ${money(row.amount)}</td>
            <td>${statusBadge(row.payment_status || 'pending')}</td>
            <td>${row.payment_status === 'matched' ? statusBadge('ready') : statusBadge('incomplete')}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');
    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'Pembayaran', subtitle: 'Pantau kesiapan pembayaran dari invoice yang sudah matched' })}
            ${renderFilterToolbar({ placeholder: 'Cari invoice, supplier, status...', date: true })}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['Invoice', 'Tanggal', 'Supplier', 'Nilai', 'Status Invoice', 'Payment Readiness', 'Aksi'], tableRows, 'Belum ada invoice untuk pembayaran.')}${renderPagination(rows.length, 8)}</div></section>
        </div>
    `;
}

function renderLpjForm() {
    return `
        <form class="kt-card" data-purchasing-form="lpj">
            <div class="kt-card-header">
                <div>
                    <h3 class="kt-card-title">Update LPJ Readiness</h3>
                    <p class="kt-card-description">Ready hanya jika invoice dan finance posting lengkap.</p>
                </div>
            </div>
            <div class="kt-card-content grid gap-4 md:grid-cols-2">
                ${field({ label: 'PO', body: `<select class="kt-input" name="po_id" required>${poOptions(pageState.state.purchaseOrders)}</select>` })}
                ${field({ label: 'Document Packet Ref', body: '<input class="kt-input" name="document_packet_ref" placeholder="Drive folder / packet ID" required>' })}
                ${field({ label: 'Submit LPJ', body: '<select class="kt-input" name="submit_lpj"><option value="">Ready only</option><option value="on">Submit</option></select>' })}
                ${field({ label: 'Catatan', full: true, body: '<textarea class="kt-input min-h-24" name="note"></textarea>' })}
            </div>
            <div class="kt-card-footer justify-end">
                <button class="kt-btn kt-btn-sm kt-btn-outline" data-action="cancel-create-panel" type="button">Tutup</button>
                <button class="kt-btn kt-btn-sm kt-btn-primary" type="submit">Update LPJ</button>
            </div>
        </form>
    `;
}

function renderLpjSection() {
    const rows = getLpjRows();
    const tableRows = rows.slice(0, 8).map((row) => `
        <tr>
            <td class="font-medium text-primary">${esc(row.po_id)}</td>
            <td>${statusBadge(row.status)}</td>
            <td>${esc(row.document_packet_ref)}</td>
            <td>${esc(row.user_id || '-')}</td>
            <td>${esc(row.created_at || '-')}</td>
            <td>${rowAction()}</td>
        </tr>
    `).join('');
    return `
        <div class="grid gap-5">
            ${renderPageHeader({ title: 'LPJ', subtitle: 'Pantau kesiapan dokumen pertanggungjawaban' })}
            ${renderFilterToolbar({ placeholder: 'Cari PO, dokumen, status...', primary: 'Update LPJ', panel: 'lpj' })}
            ${pageState.createPanel === 'lpj' ? renderLpjForm() : ''}
            <section class="kt-card"><div class="kt-card-content">${renderTable(['PO', 'Status LPJ', 'Document Packet', 'User', 'Waktu', 'Aksi'], tableRows, 'Belum ada packet LPJ.')}${renderPagination(rows.length, 8)}</div></section>
        </div>
    `;
}

function renderReportSection() {
    const summary = getPurchasingSummaryFromState(pageState.state);
    const workflow = summary.workflow || {};
    const totalPo = pageState.state.purchaseOrders.length;
    const totalSpend = pageState.state.purchaseOrders.reduce((sum, row) => sum + numberValue(row.total), 0);
    return `
        <div class="grid gap-5">
            ${renderPageHeader({
                title: 'Laporan Pengadaan',
                subtitle: 'Analisa dan laporan performa pengadaan',
                actions: '<button class="kt-btn kt-btn-outline" data-action="export-purchasing" type="button"><i class="ki-filled ki-exit-up"></i>Export</button>'
            })}
            <div class="flex flex-wrap gap-2">
                ${['7 Hari', '30 Hari', '3 Bulan', '6 Bulan', 'Tahun Ini'].map((label, index) => `<button class="kt-btn kt-btn-sm ${index === 2 ? 'kt-btn-primary' : 'kt-btn-outline'}" type="button">${label}</button>`).join('')}
                <button class="kt-btn kt-btn-sm kt-btn-outline ms-auto" type="button"><i class="ki-filled ki-filter"></i>Filter Lanjutan</button>
            </div>
            ${renderStatusTabs('report')}
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                ${renderMetricCard({ label: 'Total Pengeluaran', value: `Rp ${money(totalSpend)}`, note: 'Dari semua PO tercatat', icon: 'ki-wallet', badge: 'Spend', badgeClass: 'kt-badge-primary' })}
                ${renderMetricCard({ label: 'PO Overdue', value: workflow.poOverdue || 0, note: 'Perlu follow-up supplier', icon: 'ki-time', badge: 'Overdue', badgeClass: 'kt-badge-warning' })}
                ${renderMetricCard({ label: 'Supplier Aktif', value: summary.vendors || 0, note: 'Supplier siap dipakai', icon: 'ki-people', badge: 'Active', badgeClass: 'kt-badge-success' })}
                ${renderMetricCard({ label: 'Total PO', value: totalPo, note: 'Dokumen PO di sheet', icon: 'ki-cheque', badge: 'PO', badgeClass: 'kt-badge-secondary' })}
            </div>
            <div class="grid gap-5 xl:grid-cols-2">
                <section class="kt-card">
                    <div class="kt-card-header"><h3 class="kt-card-title">Pengeluaran per Kategori</h3></div>
                    <div class="kt-card-content grid gap-3">
                        ${['Bahan Pangan', 'Bahan Non Pangan', 'Jasa', 'Peralatan', 'Lainnya'].map((label, index) => `
                            <div class="flex items-center justify-between gap-3 text-sm">
                                <span class="text-secondary-foreground">${label}</span>
                                <strong>Rp ${money(Math.round(totalSpend / (index + 3)))}</strong>
                            </div>
                        `).join('')}
                    </div>
                </section>
                <section class="kt-card">
                    <div class="kt-card-header flex-wrap gap-3">
                        <h3 class="kt-card-title">Trend Pengeluaran</h3>
                        <button class="kt-btn kt-btn-sm kt-btn-outline" type="button">Bulanan</button>
                    </div>
                    <div class="kt-card-content grid gap-4">
                        <div class="grid gap-3">
                            ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'].map((month, index) => `
                                <div class="flex items-center gap-3">
                                    <span class="w-10 text-sm text-secondary-foreground">${month}</span>
                                    <div class="kt-progress kt-progress-primary"><div class="kt-progress-indicator ${['w-1/3', 'w-1/2', 'w-2/5', 'w-2/3', 'w-1/2', 'w-3/4'][index]}"></div></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    `;
}

function renderActiveView() {
    if (pageState.activeView === 'overview') return renderOverview();
    if (pageState.activeView === 'pr') return renderPrSection();
    if (pageState.activeView === 'rfq') return renderRfqSection();
    if (pageState.activeView === 'po') return renderPoSection();
    if (pageState.activeView === 'receiving') return renderReceivingSection();
    if (pageState.activeView === 'qc') return renderQcSection();
    if (pageState.activeView === 'supplier') return renderSupplierSection();
    if (pageState.activeView === 'invoice') return renderInvoiceSection();
    if (pageState.activeView === 'payment') return renderPaymentSection();
    if (pageState.activeView === 'lpj') return renderLpjSection();
    if (pageState.activeView === 'report') return renderReportSection();
    return renderPrSection();
}

function renderPurchasingContent() {
    const root = document.getElementById('purchasing-root');
    if (!root) return;

    if (pageState.loading) {
        root.innerHTML = LoadingState({
            title: 'Memuat Pengadaan dari Data',
            message: 'Mengambil vendor, PR, PO, penerimaan, faktur, dan audit evidence.'
        });
        return;
    }

    if (pageState.error) {
        root.innerHTML = ErrorState({
            title: 'Pengadaan tidak bisa dimuat',
            message: pageState.error,
            action: '<button class="kt-btn kt-btn-sm kt-btn-primary" data-action="refresh-purchasing" type="button">Coba Lagi</button>'
        });
        return;
    }

    root.innerHTML = `
        <div class="grid gap-5">
            ${renderActiveView()}
        </div>
    `;
}

async function loadPurchasing() {
    pageState.loading = true;
    pageState.error = '';
    renderPurchasingContent();

    try {
        pageState.state = await getPurchasingState();
    } catch (error) {
        pageState.error = error.message;
    } finally {
        pageState.loading = false;
        renderPurchasingContent();
    }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Menyimpan...';

    if (form.dataset.purchasingForm === 'vendor') await createVendor(payload);
    if (form.dataset.purchasingForm === 'purchase-request') await createPurchaseRequest(payload, pageState.state);
    if (form.dataset.purchasingForm === 'rfq') await createRfqEvent(payload, pageState.state);
    if (form.dataset.purchasingForm === 'purchase-order') await createPurchaseOrder(payload, pageState.state);
    if (form.dataset.purchasingForm === 'receiving') await recordReceiving(payload, pageState.state);
    if (form.dataset.purchasingForm === 'invoice') await createSupplierInvoice(payload, pageState.state);
    if (form.dataset.purchasingForm === 'lpj') await recordLpjPacketReady(payload, pageState.state);

    pageState.createPanel = '';
    await loadPurchasing();
}

function resetViewState() {
    pageState.query = '';
    pageState.statusTab = 'all';
    pageState.createPanel = '';
}

function openPurchasingInvoice(invoiceId) {
    const row = pageState.state.supplierInvoices.find((item) => item.invoice_id === invoiceId);
    if (!row) return;
    const po = pageState.state.purchaseOrders.find((item) => item.po_id === row.po_id);
    showDetailModal({
        title: row.invoice_number || row.invoice_id,
        subtitle: `${vendorName(row.vendor_id)} · PO ${row.po_id || '-'}`,
        rows: [
            ['ID Faktur', esc(row.invoice_id)],
            ['Tanggal Faktur', esc(row.invoice_date)],
            ['Nilai Faktur', `Rp ${money(row.amount)}`],
            ['Nilai PO', po ? `Rp ${money(po.total)}` : '-'],
            ['Status', statusBadge(row.payment_status || 'pending')],
            ['File Faktur', row.file_url ? `<a href="${esc(row.file_url)}" target="_blank">Buka file faktur</a>` : '-']
        ]
    });
}

function bindPurchasingEvents() {
    document.addEventListener('input', (event) => {
        if (!document.getElementById('purchasing-root')) return;
        const filter = event.target.closest('[data-purchasing-filter]');
        if (!filter) return;

        pageState[filter.dataset.purchasingFilter] = filter.value;
        renderPurchasingContent();
    });

    document.addEventListener('click', async (event) => {
        if (!document.getElementById('purchasing-root')) return;
        const viewButton = event.target.closest('[data-purchasing-view], [data-jump-view]');
        if (viewButton) {
            pageState.activeView = viewButton.dataset.purchasingView || viewButton.dataset.jumpView;
            resetViewState();
            if (window.location.hash.startsWith('#purchasing/')) {
                window.location.hash = `purchasing/${pageState.activeView}`;
            }
            renderPurchasingContent();
            return;
        }

        const statusButton = event.target.closest('[data-status-tab]');
        if (statusButton) {
            pageState.statusTab = statusButton.dataset.statusTab;
            renderPurchasingContent();
            return;
        }

        const createButton = event.target.closest('[data-create-panel]');
        if (createButton) {
            pageState.createPanel = createButton.dataset.createPanel;
            renderPurchasingContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget?.dataset.action === 'cancel-create-panel') {
            pageState.createPanel = '';
            renderPurchasingContent();
            return;
        }
        if (actionTarget?.dataset.action === 'refresh-purchasing') await loadPurchasing();
        if (actionTarget?.dataset.action === 'export-purchasing') downloadPurchasingReport();

        const invoiceTarget = event.target.closest('[data-purchasing-invoice]');
        if (invoiceTarget) openPurchasingInvoice(invoiceTarget.dataset.purchasingInvoice);
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('purchasing-root')) return;
        if (!event.target.matches('[data-purchasing-form]')) return;

        event.preventDefault();
        try {
            await handleSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            await loadPurchasing();
        }
    });
}

function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
}

function downloadPurchasingReport() {
    const rows = pageState.state.purchaseOrders.map((po) => [
        po.po_id,
        vendorName(po.vendor_id),
        po.po_date,
        po.delivery_date,
        po.total,
        po.workflow_state || po.status || 'draft'
    ]);
    const csv = [['po_id', 'vendor', 'po_date', 'delivery_date', 'total', 'status'], ...rows]
        .map((row) => row.map(csvCell).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchase-orders-sipagi-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

let eventsBound = false;

export function PurchasingPage() {
    return '<div id="purchasing-root"></div>';
}

export function initPurchasingPage() {
    pageState.activeView = routeViewFromHash();
    if (!eventsBound) {
        bindPurchasingEvents();
        eventsBound = true;
    }
    loadPurchasing();
}
