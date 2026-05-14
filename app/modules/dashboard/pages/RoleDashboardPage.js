import { getRoleDashboardConfig } from '../data/roleDashboardData.js';
import { getDashboardRealConfig } from '../services/dashboardRealData.js';
import { getInventoryState } from '../../inventory/services/inventoryApi.js?v=inventory-approval-20260511';
import { productModules, userRoles } from '../../../shared/data/productCatalog.js';
import {
    getRolePermissions,
    getTargetPermissionRoleId,
    loadRolePermissionsFromGas,
    permissionActions,
    resetRolePermissions,
    setTargetPermissionRoleId,
    syncRolePermissionsToGas,
    toDashboardRoleId,
    toCatalogRoleId,
    updatePermission
} from '../../../shared/auth/permissionStore.js';

const dashboardViewStorageKey = 'sipagi.dashboard.sessionView';
const dashboardRealCache = new Map();
const approvalInboxCache = new Map();

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function canInspectDashboards(sessionRoleId) {
    return ['kepala_sppg', 'developer'].includes(toCatalogRoleId(sessionRoleId));
}

function dashboardViewForSession(sessionRoleId = 'kepala-sppg') {
    const normalizedSessionRole = toDashboardRoleId(toCatalogRoleId(sessionRoleId));
    if (!canInspectDashboards(sessionRoleId)) return normalizedSessionRole;
    const fallbackViewId = dashboardRoleTabs.some((tab) => tab.id === normalizedSessionRole) ? normalizedSessionRole : 'kepala-sppg';

    try {
        const storedViewId = sessionStorage.getItem(dashboardViewStorageKey);
        return dashboardRoleTabs.some((tab) => tab.id === storedViewId) ? storedViewId : fallbackViewId;
    } catch {
        return fallbackViewId;
    }
}

function setDashboardViewId(roleId) {
    try {
        sessionStorage.setItem(dashboardViewStorageKey, roleId);
    } catch {
        // Dashboard view selection is a UI preference only.
    }
}

function badgeClass(tone = 'primary') {
    const tones = {
        primary: 'kt-badge-primary',
        success: 'kt-badge-success',
        warning: 'kt-badge-warning',
        danger: 'kt-badge-destructive',
        info: 'kt-badge-info',
        secondary: 'kt-badge-secondary'
    };
    return tones[tone] || tones.primary;
}

function buttonClass(tone = 'primary') {
    if (tone === 'primary') return 'kt-btn kt-btn-primary';
    if (tone === 'danger') return 'kt-btn kt-btn-outline kt-btn-destructive';
    return 'kt-btn kt-btn-outline';
}

function renderCardMenu() {
    return `
        <div class="kt-menu" data-kt-menu="true">
            <div class="kt-menu-item" data-kt-menu-item-offset="0, 10px" data-kt-menu-item-placement="bottom-end" data-kt-menu-item-toggle="dropdown" data-kt-menu-item-trigger="click">
                <button class="kt-menu-toggle kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" type="button" aria-label="Menu kartu">
                    <i class="ki-filled ki-dots-vertical text-lg"></i>
                </button>
                <div class="kt-menu-dropdown kt-menu-default w-full max-w-[180px]" data-kt-menu-dismiss="true">
                    <div class="kt-menu-item">
                        <button class="kt-menu-link" data-dashboard-chart-detail type="button">
                            <span class="kt-menu-icon"><i class="ki-filled ki-chart-line-star"></i></span>
                            <span class="kt-menu-title">Lihat detail</span>
                        </button>
                    </div>
                    <div class="kt-menu-item">
                        <button class="kt-menu-link" data-ai-open type="button">
                            <span class="kt-menu-icon"><i class="ki-filled ki-sparkles"></i></span>
                            <span class="kt-menu-title">Analisis AI</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

const dashboardRoleTabs = [
    { id: 'kepala-sppg', label: 'Advance Dashboard' },
    { id: 'ahli-gizi', label: 'Ahli Gizi Dashboard' },
    { id: 'pengadaan', label: 'Inventory Dashboard' },
    { id: 'akuntan', label: 'Accounting Dashboard' }
];

function renderDashboardRoleTabs(activeRoleId, sessionRoleId) {
    if (!canInspectDashboards(sessionRoleId)) return '';
    return `
        <div class="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-2" aria-label="Pilihan dashboard">
            ${dashboardRoleTabs.map((tab, index) => `
                <button class="kt-btn kt-btn-sm ${tab.id === activeRoleId ? 'kt-btn-primary' : 'kt-btn-outline'}" data-dashboard-role-tab="${esc(tab.id)}" type="button">
                    ${esc(tab.label)}
                </button>
            `).join('')}
        </div>
    `;
}

function renderPermissionCenter(sessionRoleId) {
    if (toCatalogRoleId(sessionRoleId) !== 'kepala_sppg') return '';
    const targetRoleId = getTargetPermissionRoleId();
    const permissions = getRolePermissions().filter((permission) => permission.role_id === targetRoleId);
    const permissionByModule = new Map(permissions.map((permission) => [permission.module_id, permission]));
    const manageableModules = productModules.filter((module) => module.id !== 'dev-dashboard');

    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Kontrol Akses Role</h3>
                    <p class="kt-card-description">Kepala SPPG bisa membuka/menutup halaman dan aksi CRUD untuk setiap role.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <select class="kt-select kt-select-sm w-[220px]" data-permission-target-role>
                        ${userRoles.map((role) => `<option value="${role.id}" ${role.id === targetRoleId ? 'selected' : ''}>${esc(role.name)}</option>`).join('')}
                    </select>
                    <button class="kt-btn kt-btn-sm kt-btn-outline" data-permission-load type="button">Muat Akses</button>
                    <button class="kt-btn kt-btn-sm kt-btn-primary" data-permission-sync type="button">Simpan Akses</button>
                    <button class="kt-btn kt-btn-sm kt-btn-outline kt-btn-destructive" data-permission-reset type="button">Reset</button>
                </div>
            </div>
            <div class="kt-card-content">
                <div class="erp-table-wrap">
                    <table class="erp-table">
                        <thead>
                            <tr>
                                <th>Halaman</th>
                                ${permissionActions.map((action) => `<th>${esc(action.label)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${manageableModules.map((module) => {
                                const permission = permissionByModule.get(module.id) || {};
                                return `
                                    <tr>
                                        <td><strong>${esc(module.label)}</strong><br><span class="erp-muted">${esc(module.owner)}</span></td>
                                        ${permissionActions.map((action) => `
                                            <td>
                                                <label class="inline-flex items-center gap-2 text-sm">
                                                    <input type="checkbox" data-permission-toggle data-role-id="${esc(targetRoleId)}" data-module-id="${esc(module.id)}" data-action-key="${esc(action.key)}" ${permission[action.key] ? 'checked' : ''} ${module.id === 'dashboard' && action.key === 'can_read' ? 'disabled' : ''}>
                                                </label>
                                            </td>
                                        `).join('')}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `;
}

function renderDashboardApprovalInbox(sessionRoleId) {
    if (toCatalogRoleId(sessionRoleId) !== 'kepala_sppg') return '';
    const inbox = approvalInboxCache.get('kepala_sppg');
    const pendingMaterials = inbox?.pendingMaterials || 0;
    const pendingReceivings = inbox?.pendingReceivings || 0;
    const total = pendingMaterials + pendingReceivings;
    if (!total) return '';
    return `
        <section class="erp-card sipagi-review-inbox">
            <div>
                <strong>Notifikasi Approval</strong>
                <p class="erp-muted">${total} pengajuan belum direview. Klik untuk langsung ke halaman approval.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                ${pendingMaterials ? `<a class="kt-btn kt-btn-sm kt-btn-primary" href="#inventory/master-bahan-baku">Bahan (${pendingMaterials})</a>` : ''}
                ${pendingReceivings ? `<a class="kt-btn kt-btn-sm kt-btn-primary" href="#inventory/penerimaan-bahan-baku">Penerimaan (${pendingReceivings})</a>` : ''}
            </div>
        </section>
    `;
}

function renderHeader(config, activeRoleId, sessionRoleId) {
    const actions = config.quickActions.map((action) => {
        const attrs = action.modal
            ? `data-dashboard-placeholder="${esc(action.modal)}"`
            : `href="${esc(action.target || '#dashboard')}"`;
        const tag = action.modal ? 'button' : 'a';
        return `
            <${tag} class="${buttonClass(action.tone)} kt-btn-sm justify-start" ${attrs} ${action.modal ? 'type="button"' : ''}>
                <i class="ki-filled ${esc(action.icon)}"></i>
                ${esc(action.label)}
            </${tag}>
        `;
    }).join('');

    return `
        <section class="grid gap-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="grid gap-2">
                    <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-secondary-foreground">
                        <span>${esc(config.contextLabel)}</span>
                        <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-secondary">${esc(config.dateLabel)}</span>
                        <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-success">${esc(config.lastSync)}</span>
                    </div>
                    <div>
                        <h2 class="text-2xl font-semibold text-mono">${esc(config.title)}</h2>
                        <p class="text-sm text-secondary-foreground">${esc(config.subtitle)}</p>
                    </div>
                </div>
            </div>
            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                ${actions}
            </div>
            ${renderDashboardRoleTabs(activeRoleId, sessionRoleId)}
        </section>
    `;
}

function renderMetrics(config) {
    return `
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            ${config.metrics.map((metric) => `
                <article class="kt-card kt-card-border shadow-none p-4 gap-3">
                    <div class="flex items-start justify-between gap-3">
                        <span class="text-xs font-medium uppercase text-secondary-foreground">${esc(metric.label)}</span>
                        <span class="kt-badge kt-badge-sm kt-badge-light ${badgeClass(metric.tone)}">${esc(metric.tone === 'danger' ? 'Perlu cek' : metric.tone === 'warning' ? 'Perhatian' : 'Baik')}</span>
                    </div>
                    <div class="flex items-end gap-1">
                        <strong class="text-2xl font-semibold leading-none text-mono">${esc(metric.value)}</strong>
                        ${metric.unit ? `<span class="text-sm text-secondary-foreground">${esc(metric.unit)}</span>` : ''}
                    </div>
                    <p class="text-sm text-secondary-foreground">${esc(metric.note)}</p>
                </article>
            `).join('')}
        </section>
    `;
}

function renderBudget(config) {
    if (!config.budget) return '';
    return `
        <section class="kt-card kt-card-border shadow-none">
            <div class="kt-card-header">
                <h3 class="kt-card-title">Ringkasan Keuangan</h3>
            </div>
            <div class="kt-card-content">
                <div class="grid gap-4 md:grid-cols-4">
                    ${config.budget.map(([label, value, note]) => `
                        <div class="border-e border-border last:border-e-0 pe-4">
                            <div class="text-xs font-medium text-secondary-foreground">${esc(label)}</div>
                            <div class="mt-2 text-lg font-semibold text-mono">${esc(value)}</div>
                            <div class="text-xs text-secondary-foreground">${esc(note)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    `;
}

function renderNutritionLabel(config) {
    if (!config.nutritionLabel) return '';
    return `
        <section class="kt-card kt-card-border shadow-none">
            <div class="kt-card-header">
                <h3 class="kt-card-title">Label Gizi Hari Ini</h3>
            </div>
            <div class="kt-card-content grid gap-3">
                <div class="grid grid-cols-2 gap-2">
                    ${config.nutritionLabel.map(([label, value]) => `
                        <div class="rounded-md border border-border p-3">
                            <div class="text-xs text-secondary-foreground">${esc(label)}</div>
                            <div class="text-base font-semibold text-mono">${esc(value)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="kt-progress kt-progress-primary">
                    <div class="kt-progress-indicator w-[85%]"></div>
                </div>
                <div class="flex justify-between text-xs text-secondary-foreground">
                    <span>% AKG rata-rata</span>
                    <span>85%</span>
                </div>
            </div>
        </section>
    `;
}

function renderOperationalHighlight(config) {
    const primaryMetric = config.metrics[0];
    const rows = config.sections.flatMap((section) => section.rows || section.items || []).slice(0, 3);
    const rowBadgeLabel = (value) => {
        if (value === 'danger') return 'Kritis';
        if (value === 'warning') return 'Perhatian';
        if (value === 'success') return 'Aman';
        if (value === 'primary') return 'Review';
        return value || 'Lihat';
    };

    return `
        <section class="kt-card kt-card-border shadow-none h-full sipagi-dashboard-highlight-full">
            <div class="kt-card-header">
                <h3 class="kt-card-title">Highlights</h3>
                ${renderCardMenu()}
            </div>
            <div class="kt-card-content flex flex-col gap-4 p-5 lg:p-7.5 lg:pt-4">
                <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-normal text-secondary-foreground">${esc(primaryMetric.label)}</span>
                    <div class="flex items-center gap-2.5">
                        <span class="text-3xl font-semibold text-mono">${esc(primaryMetric.value)}</span>
                        <span class="kt-badge kt-badge-outline ${badgeClass(primaryMetric.tone)} kt-badge-sm">${esc(primaryMetric.note)}</span>
                    </div>
                </div>
                <div class="flex items-center gap-1 mb-1.5">
                    <div class="bg-green-500 h-2 w-full max-w-[62%] rounded-xs"></div>
                    <div class="bg-yellow-500 h-2 w-full max-w-[24%] rounded-xs"></div>
                    <div class="bg-primary h-2 w-full max-w-[14%] rounded-xs"></div>
                </div>
                <div class="flex items-center flex-wrap gap-4 mb-1">
                    <div class="flex items-center gap-1.5">
                        <span class="rounded-full size-2 kt-badge-success"></span>
                        <span class="text-sm font-normal text-foreground">Aman</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="rounded-full size-2 kt-badge-warning"></span>
                        <span class="text-sm font-normal text-foreground">Perhatian</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="rounded-full size-2 kt-badge-primary"></span>
                        <span class="text-sm font-normal text-foreground">Dalam proses</span>
                    </div>
                </div>
                <div class="border-b border-input"></div>
                <div class="grid gap-3">
                    ${rows.map((row) => `
                        <div class="flex items-center justify-between flex-wrap gap-2">
                            <div class="flex items-center gap-1.5">
                                <i class="ki-filled ki-notification-status text-base text-muted-foreground"></i>
                                <span class="text-sm font-normal text-mono">${esc(row[0])}</span>
                            </div>
                            <div class="flex items-center text-sm font-medium text-foreground gap-3">
                                <span class="lg:text-right">${esc(row[1] || '-')}</span>
                                <span class="kt-badge kt-badge-sm kt-badge-light ${badgeClass(statusTone(row[2] || row[1]))}">${esc(rowBadgeLabel(row[2]))}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    `;
}

function renderChart(config) {
    const max = Math.max(...config.chart.series.flatMap((serie) => serie.values));
    const min = Math.min(...config.chart.series.flatMap((serie) => serie.values));
    const points = (values) => values.map((value, index) => {
        const x = 8 + (index * (84 / Math.max(values.length - 1, 1)));
        const y = 82 - (((value - min) / Math.max(max - min, 1)) * 58);
        return `${x},${y}`;
    }).join(' ');
    const lineColor = (tone) => {
        if (tone === 'success') return 'var(--color-green-500, #17c653)';
        if (tone === 'warning') return 'var(--color-yellow-500, #f6b100)';
        return 'var(--primary, #1b84ff)';
    };
    const dotClass = (tone) => {
        if (tone === 'success') return 'kt-badge-success';
        if (tone === 'warning') return 'kt-badge-warning';
        return 'kt-badge-primary';
    };
    const latestLabel = config.chart.labels.at(-1) || '-';

    return `
        <section class="kt-card kt-card-border shadow-none xl:col-span-2">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">${esc(config.chart.title)}</h3>
                    <p class="kt-card-description">${esc(config.chart.subtitle)}</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <label class="flex items-center gap-2 text-sm font-medium text-mono">
                        <input checked class="kt-switch kt-switch-sm" type="checkbox" disabled/>
                        AI insight
                    </label>
                    <select class="kt-select kt-select-sm w-[150px]" aria-label="Periode chart">
                        <option>7 hari terakhir</option>
                        <option>30 hari terakhir</option>
                    </select>
                    ${renderCardMenu()}
                </div>
            </div>
            <div class="kt-card-content grid gap-4">
                <div class="grid gap-3">
                    <div class="flex flex-wrap gap-3 text-xs font-medium text-secondary-foreground">
                        ${config.chart.series.map((serie) => `<span class="inline-flex items-center gap-2"><span class="kt-badge-dot ${dotClass(serie.color)}"></span>${esc(serie.label)}</span>`).join('')}
                    </div>
                    <svg class="h-[260px] w-full rounded-md border border-border bg-muted/20" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${esc(config.chart.title)}">
                        <g class="stroke-border" stroke-width="0.25">
                            <line x1="8" y1="24" x2="94" y2="24"></line>
                            <line x1="8" y1="44" x2="94" y2="44"></line>
                            <line x1="8" y1="64" x2="94" y2="64"></line>
                            <line x1="8" y1="84" x2="94" y2="84"></line>
                        </g>
                        ${config.chart.series.map((serie) => `
                            <polyline fill="none" stroke="${lineColor(serie.color)}" stroke-width="1.2" vector-effect="non-scaling-stroke" points="${points(serie.values)}"></polyline>
                        `).join('')}
                    </svg>
                    <div class="flex items-center justify-between gap-1 text-center text-xs text-secondary-foreground">
                        ${config.chart.labels.map((label) => `<span>${esc(label)}</span>`).join('')}
                    </div>
                    <div class="hidden rounded-md border border-border bg-background p-3 text-sm" data-chart-popover>
                        <div class="font-medium text-mono">${esc(latestLabel)}</div>
                        <p class="mt-1 text-secondary-foreground">Titik terakhir menunjukkan perubahan yang perlu dicek bersama daftar prioritas di bawah.</p>
                    </div>
                </div>
                ${renderAiPrompt(config)}
            </div>
        </section>
    `;
}

function renderAiPrompt(config) {
    const chips = ['What changed', 'What caused this spike', 'Bandingkan minggu lalu'];
    return `
        <div class="rounded-md border border-primary/25 bg-primary/5 p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2 text-sm">
                    <span class="font-medium text-mono">Tanya AI:</span>
                    <span class="text-secondary-foreground">${esc(config.aiQuestion)}</span>
                </div>
                <button class="kt-btn kt-btn-sm kt-btn-primary" data-ai-open type="button">
                    <i class="ki-filled ki-sparkles"></i>
                    Buka Analisis AI
                </button>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
                ${chips.map((chip) => `<button class="kt-btn kt-btn-xs kt-btn-outline" data-ai-open data-ai-chip="${esc(chip)}" type="button">${esc(chip)}</button>`).join('')}
            </div>
        </div>
    `;
}

function statusTone(label) {
    const text = String(label).toLowerCase();
    if (text.includes('tidak') || text.includes('kritis') || text.includes('terlambat')) return 'danger';
    if (text.includes('pending') || text.includes('menunggu') || text.includes('perhatian') || text.includes('peringatan')) return 'warning';
    if (text.includes('selesai') || text.includes('aman') || text.includes('sesuai') || text.includes('lulus') || text.includes('disetujui')) return 'success';
    return 'primary';
}

function renderSection(section) {
    if (section.type === 'queue') {
        return `
            <section class="kt-card kt-card-border shadow-none">
                <div class="kt-card-header">
                    <h3 class="kt-card-title">${esc(section.title)}</h3>
                    ${section.badge ? `<span class="kt-badge kt-badge-sm kt-badge-light kt-badge-warning">${esc(section.badge)}</span>` : ''}
                </div>
                <div class="kt-card-content grid gap-2">
                    ${section.items.map(([title, note, tone]) => `
                        <div class="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                            <span>
                                <strong class="block text-sm font-medium text-mono">${esc(title)}</strong>
                                <small class="text-sm text-secondary-foreground">${esc(note)}</small>
                            </span>
                            <span class="kt-badge kt-badge-sm kt-badge-light ${badgeClass(tone)}">${tone === 'danger' ? 'Kritis' : tone === 'warning' ? 'Perhatian' : 'Review'}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    if (section.type === 'progress') {
        return `
            <section class="kt-card kt-card-border shadow-none">
                <div class="kt-card-header">
                    <h3 class="kt-card-title">${esc(section.title)}</h3>
                    ${renderCardMenu()}
                </div>
                <div class="kt-card-content grid gap-4">
                    ${section.rows.map(([label, value, tone]) => `
                        <div class="grid gap-1">
                            <div class="flex justify-between text-sm">
                                <span class="text-secondary-foreground">${esc(label)}</span>
                                <span class="font-medium text-mono">${value}%</span>
                            </div>
                            <div class="kt-progress ${tone === 'danger' ? 'kt-progress-destructive' : tone === 'warning' ? 'kt-progress-warning' : 'kt-progress-success'}">
                                <div class="kt-progress-indicator" style="width:${value}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    if (section.type === 'table') {
        return `
            <section class="kt-card kt-card-border shadow-none">
                <div class="kt-card-header">
                    <h3 class="kt-card-title">${esc(section.title)}</h3>
                    ${renderCardMenu()}
                </div>
                <div class="kt-card-table overflow-x-auto">
                    <table class="kt-table kt-table-border min-w-[520px]">
                        <thead><tr>${section.columns.map((column) => `<th>${esc(column)}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${section.rows.map((row) => `
                                <tr>
                                    ${row.map((cell, index) => index === row.length - 1
                                        ? `<td><span class="kt-badge kt-badge-sm kt-badge-light ${badgeClass(statusTone(cell))}">${esc(cell)}</span></td>`
                                        : `<td>${esc(cell)}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    }

    if (section.type === 'approval' || section.type === 'snapshot' || section.type === 'activity' || section.type === 'documents' || section.type === 'checklist') {
        return `
            <section class="kt-card kt-card-border shadow-none">
                <div class="kt-card-header">
                    <h3 class="kt-card-title">${esc(section.title)}</h3>
                    ${renderCardMenu()}
                </div>
                <div class="kt-card-content grid gap-2">
                    ${section.rows.map((row) => `
                        <div class="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
                            <span>
                                <strong class="block text-sm font-medium text-mono">${esc(row[0])}</strong>
                                <small class="text-sm text-secondary-foreground">${esc(row[1] || '')}</small>
                            </span>
                            <span class="kt-badge kt-badge-sm kt-badge-light ${badgeClass(statusTone(row[2] || row[1]))}">${esc(row[2] || 'Lihat')}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    return '';
}

function renderStates() {
    return `
        <section class="hidden" data-dashboard-state-templates aria-hidden="true">
            <div class="kt-card kt-card-border shadow-none p-4 gap-3">
                <div class="h-4 w-24 rounded bg-muted"></div>
                <div class="h-8 w-16 rounded bg-muted"></div>
                <div class="h-3 w-40 rounded bg-muted"></div>
                <span class="text-xs text-secondary-foreground">Skeleton summary card</span>
            </div>
            <div class="kt-card kt-card-border shadow-none p-4" data-dashboard-empty-state>
                <h3 class="text-sm font-semibold text-mono">Tidak ada tindak lanjut hari ini.</h3>
                <p class="mt-1 text-sm text-secondary-foreground">Tidak ada tindak lanjut hari ini.</p>
            </div>
            <div class="kt-alert kt-alert-destructive" data-dashboard-error-state>
                <div>
                    <h3 class="font-medium">Gagal memuat ringkasan dashboard.</h3>
                    <p class="text-sm">Coba refresh atau cek koneksi data.</p>
                </div>
            </div>
        </section>
    `;
}

function renderAiModal(config) {
    return `
        <div class="kt-modal-backdrop hidden" data-ai-backdrop></div>
        <div class="kt-modal" data-kt-modal="true" data-ai-modal role="dialog" aria-modal="true" aria-label="${esc(config.aiTitle)}">
            <div class="kt-modal-content max-w-[720px] top-5 lg:top-[8%]">
                <div class="kt-modal-header">
                    <div>
                        <h3 class="kt-modal-title">${esc(config.aiTitle)}</h3>
                        <p class="text-sm text-secondary-foreground">${esc(config.aiSummary)}</p>
                    </div>
                    <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" data-ai-close type="button" aria-label="Tutup analisis AI">
                        <i class="ki-filled ki-cross"></i>
                    </button>
                </div>
                <div class="kt-modal-body grid gap-4">
                    ${[
                        ['What changed', config.ai.changed],
                        ['What caused this spike', config.ai.caused],
                        ['Dampak', config.ai.impact],
                        ['Rekomendasi', config.ai.recommendations],
                        ['Sumber data internal', config.ai.sources]
                    ].map(([title, items]) => `
                        <div class="rounded-md border border-border p-3">
                            <h4 class="text-sm font-semibold text-mono">${esc(title)}</h4>
                            <ul class="mt-2 grid gap-1 text-sm text-secondary-foreground">
                                ${items.map((item) => `<li class="flex gap-2"><span class="kt-badge-dot kt-badge-primary mt-2"></span><span>${esc(item)}</span></li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                <div class="kt-modal-footer justify-end gap-2">
                    <button class="kt-btn kt-btn-primary" data-ai-close type="button">Lihat Rekomendasi</button>
                    <button class="kt-btn kt-btn-outline" data-ai-close type="button">Tutup</button>
                </div>
            </div>
        </div>
    `;
}

function renderPlaceholderModal() {
    return `
        <div class="kt-modal-backdrop hidden" data-dashboard-placeholder-backdrop></div>
        <div class="kt-modal" data-kt-modal="true" data-dashboard-placeholder-modal role="dialog" aria-modal="true" aria-label="Form cepat">
            <div class="kt-modal-content max-w-[460px] top-5 lg:top-[15%]">
                <div class="kt-modal-header">
                    <h3 class="kt-modal-title" data-dashboard-placeholder-title>Form cepat</h3>
                    <button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" data-dashboard-placeholder-close type="button" aria-label="Tutup">
                        <i class="ki-filled ki-cross"></i>
                    </button>
                </div>
                <div class="kt-modal-body">
                    <p class="text-sm text-secondary-foreground">Form ini placeholder frontend. Saat route/form resmi tersedia, tombol bisa diarahkan tanpa mengubah kontrak data.</p>
                </div>
                <div class="kt-modal-footer justify-end">
                    <button class="kt-btn kt-btn-primary" data-dashboard-placeholder-close type="button">Mengerti</button>
                </div>
            </div>
        </div>
    `;
}

function mergeDashboardConfig(config, realConfig) {
    if (!realConfig) return config;
    return {
        ...config,
        ...realConfig,
        quickActions: config.quickActions,
        ai: config.ai,
        aiQuestion: config.aiQuestion,
        aiTitle: config.aiTitle,
        aiSummary: config.aiSummary,
        sections: realConfig.sections?.length ? [...realConfig.sections, ...config.sections.slice(2)] : config.sections
    };
}

function refreshDashboardRoot(sessionRoleId) {
    const root = document.getElementById('role-dashboard-root');
    if (!root) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = RoleDashboardPage(sessionRoleId).trim();
    const nextRoot = wrapper.firstElementChild;
    if (!nextRoot) return;
    root.replaceWith(nextRoot);
    initRoleDashboardPage(sessionRoleId);
}

export function RoleDashboardPage(sessionRoleId = 'kepala-sppg') {
    const activeRoleId = dashboardViewForSession(sessionRoleId);
    const config = mergeDashboardConfig(getRoleDashboardConfig(activeRoleId), dashboardRealCache.get(activeRoleId));
    const sidePanel = renderNutritionLabel(config) || renderOperationalHighlight(config);

    return `
        <div id="role-dashboard-root" class="grid gap-5">
            ${renderHeader(config, activeRoleId, sessionRoleId)}
            ${renderDashboardApprovalInbox(sessionRoleId)}
            ${renderMetrics(config)}
            ${renderBudget(config)}
            ${sidePanel ? `<div class="flex w-full">${sidePanel}</div>` : ''}
            <div class="grid gap-5">
                ${renderChart(config)}
            </div>
            <div class="grid gap-5 xl:grid-cols-3">
                ${config.sections.slice(sidePanel ? 0 : 2).map(renderSection).join('')}
            </div>
            ${renderPermissionCenter(sessionRoleId)}
            ${renderStates()}
            ${renderAiModal(config)}
            ${renderPlaceholderModal()}
        </div>
    `;
}

export function initRoleDashboardPage(sessionRoleId = 'kepala-sppg') {
    const root = document.getElementById('role-dashboard-root');
    if (!root) return;
    const activeRoleId = dashboardViewForSession(sessionRoleId);
    if (!dashboardRealCache.has(activeRoleId)) {
        getDashboardRealConfig(activeRoleId)
            .then((realConfig) => {
                dashboardRealCache.set(activeRoleId, realConfig);
                refreshDashboardRoot(sessionRoleId);
            })
            .catch(() => dashboardRealCache.set(activeRoleId, null));
    }
    if (toCatalogRoleId(sessionRoleId) === 'kepala_sppg' && !approvalInboxCache.has('kepala_sppg')) {
        getInventoryState()
            .then((state) => {
                approvalInboxCache.set('kepala_sppg', {
                    pendingMaterials: state.items.filter((item) => String(item.status || '').toLowerCase() === 'menunggu approval').length,
                    pendingReceivings: (state.receivingWorkflows || []).filter((row) => row.status === 'menunggu approval').length
                });
                refreshDashboardRoot(sessionRoleId);
            })
            .catch(() => approvalInboxCache.set('kepala_sppg', { pendingMaterials: 0, pendingReceivings: 0 }));
    }

    root.addEventListener('change', (event) => {
        const permissionRole = event.target.closest('[data-permission-target-role]');
        if (permissionRole) {
            setTargetPermissionRoleId(permissionRole.value);
            refreshDashboardRoot(sessionRoleId);
            return;
        }

        const permissionToggle = event.target.closest('[data-permission-toggle]');
        if (permissionToggle) {
            updatePermission(permissionToggle.dataset.roleId, permissionToggle.dataset.moduleId, permissionToggle.dataset.actionKey, permissionToggle.checked);
            refreshDashboardRoot(sessionRoleId);
        }
    });

    root.addEventListener('click', (event) => {
        const roleTab = event.target.closest('[data-dashboard-role-tab]');
        const aiOpen = event.target.closest('[data-ai-open]');
        const aiClose = event.target.closest('[data-ai-close]');
        const chartDetail = event.target.closest('[data-dashboard-chart-detail]');
        const placeholderOpen = event.target.closest('[data-dashboard-placeholder]');
        const placeholderClose = event.target.closest('[data-dashboard-placeholder-close]');
        const permissionLoad = event.target.closest('[data-permission-load]');
        const permissionSync = event.target.closest('[data-permission-sync]');
        const permissionReset = event.target.closest('[data-permission-reset]');
        const aiModal = root.querySelector('[data-ai-modal]');
        const aiBackdrop = root.querySelector('[data-ai-backdrop]');
        const placeholderModal = root.querySelector('[data-dashboard-placeholder-modal]');
        const placeholderBackdrop = root.querySelector('[data-dashboard-placeholder-backdrop]');
        const chartPopover = root.querySelector('[data-chart-popover]');

        if (roleTab) {
            setDashboardViewId(roleTab.dataset.dashboardRoleTab);
            refreshDashboardRoot(sessionRoleId);
            return;
        }

        if (chartDetail) {
            chartPopover?.classList.toggle('hidden');
            return;
        }

        if (permissionLoad) {
            permissionLoad.textContent = 'Memuat...';
            loadRolePermissionsFromGas()
                .then(() => refreshDashboardRoot(sessionRoleId))
                .catch((error) => window.alert(error.message || 'Akses belum bisa dimuat.'));
            return;
        }

        if (permissionSync) {
            permissionSync.textContent = 'Menyimpan...';
            syncRolePermissionsToGas(getTargetPermissionRoleId())
                .then(() => refreshDashboardRoot(sessionRoleId))
                .catch((error) => window.alert(error.message || 'Akses belum bisa disimpan.'));
            return;
        }

        if (permissionReset) {
            resetRolePermissions();
            refreshDashboardRoot(sessionRoleId);
            return;
        }

        if (aiOpen) {
            aiModal?.classList.add('open');
            aiBackdrop?.classList.remove('hidden');
            return;
        }

        if (aiClose) {
            aiModal?.classList.remove('open');
            aiBackdrop?.classList.add('hidden');
            return;
        }

        if (placeholderOpen) {
            const title = root.querySelector('[data-dashboard-placeholder-title]');
            if (title) title.textContent = placeholderOpen.textContent.trim();
            placeholderModal?.classList.add('open');
            placeholderBackdrop?.classList.remove('hidden');
            return;
        }

        if (placeholderClose) {
            placeholderModal?.classList.remove('open');
            placeholderBackdrop?.classList.add('hidden');
        }
    });
}
