import { accessMatrix, productModules, spreadsheetTables, userRoles } from '../../../shared/data/productCatalog.js';
import { moduleIcons, navigationGroups } from '../../../shared/data/navigationGroups.js';
import { Icon } from '../../../shared/components/Icon.js';
import { checkGasHealth, getSchemaIndex } from '../../../shared/services/googleSheetsApi.js';

function statusClass(status) {
    if (status === 'Live') return 'kt-badge kt-badge-sm kt-badge-light kt-badge-success';
    if (status === 'Planned') return 'kt-badge kt-badge-sm kt-badge-light kt-badge-warning';
    return 'kt-badge kt-badge-sm kt-badge-light kt-badge-destructive';
}

function countTables(moduleName) {
    return spreadsheetTables.filter((table) => table.module.toLowerCase() === moduleName.toLowerCase()).length;
}

function countAccessAssignments() {
    return accessMatrix.reduce((total, entry) => total + entry.roles.length, 0);
}

function renderModuleCards(modules = productModules) {
    return modules.map((module) => {
        const featureList = module.features.slice(0, 4).map((feature) => `
            <li class="flex items-center gap-2 text-sm text-secondary-foreground">
                <span class="kt-badge-dot kt-badge-success"></span>
                <span>${feature}</span>
            </li>
        `).join('');
        const tableCount = module.tables.length || countTables(module.label);
        const iconName = moduleIcons[module.id] || 'grid';

        return `
            <article class="kt-card kt-card-border shadow-none p-4 gap-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0">
                        <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground" data-icon="${iconName}" aria-hidden="true">${Icon(iconName, 'size-4')}</span>
                        <div class="min-w-0">
                            <div class="text-xs font-medium text-secondary-foreground uppercase">${module.group}</div>
                            <h3 class="text-sm font-semibold text-mono truncate">${module.label}</h3>
                        </div>
                    </div>
                    <span class="${statusClass(module.status)}">${module.status}</span>
                </div>
                <p class="text-sm text-secondary-foreground leading-5">${module.description}</p>
                <ul class="grid gap-2">${featureList}</ul>
                <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs font-medium text-secondary-foreground">
                    <span>Owner: ${module.owner}</span>
                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-secondary">${tableCount} tables</span>
                </div>
            </article>
        `;
    }).join('');
}

function renderModuleGroups() {
    const modulesById = new Map(productModules.map((module) => [module.id, module]));

    return navigationGroups.map((group) => {
        const modules = group.modules
            .map((moduleId) => modulesById.get(moduleId))
            .filter(Boolean);

        return `
            <section class="grid gap-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div class="text-xs font-medium text-secondary-foreground uppercase">${group.label}</div>
                        <h3 class="text-base font-semibold text-mono">${group.label} Modules</h3>
                    </div>
                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">${modules.length} modul</span>
                </div>
                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    ${renderModuleCards(modules)}
                </div>
            </section>
        `;
    }).join('');
}

function renderTodayOperations() {
    const operationalItems = [
        {
            label: 'Stok bahan',
            value: 'Perlu cek modul',
            note: 'Pantau bahan kritis dari Inventory',
            badge: 'kt-badge-warning',
            action: '#inventory',
            actionLabel: 'Buka Inventory',
            icon: 'box'
        },
        {
            label: 'Inventory & Supplier',
            value: 'Siap direview',
            note: 'Validasi PO dan supplier aktif',
            badge: 'kt-badge-primary',
            action: '#inventory',
            actionLabel: 'Cek PO',
            icon: 'cart'
        },
        {
            label: 'Distribusi',
            value: 'Dalam monitoring',
            note: 'Lihat status operasional harian',
            badge: 'kt-badge-success',
            action: '#operational',
            actionLabel: 'Lihat Operasional',
            icon: 'truck'
        }
    ];

    const rows = operationalItems.map((item) => `
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
            <div class="flex min-w-0 items-start gap-3">
                <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground">${Icon(item.icon, 'size-4')}</span>
                <span class="grid gap-1">
                    <span class="text-sm font-medium text-mono">${item.label}</span>
                    <span class="text-sm text-secondary-foreground">${item.note}</span>
                </span>
            </div>
            <div class="flex items-center gap-2">
                <span class="kt-badge kt-badge-sm kt-badge-light ${item.badge}">${item.value}</span>
                <a class="kt-btn kt-btn-sm kt-btn-outline" href="${item.action}">${item.actionLabel}</a>
            </div>
        </div>
    `).join('');

    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Operasional Hari Ini</h3>
                    <p class="kt-card-description">Ringkasan tindakan cepat untuk modul operasional utama.</p>
                </div>
                <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">Siap dipantau</span>
            </div>
            <div class="kt-card-content">
                ${rows}
            </div>
        </section>
    `;
}

function renderProcessFlow() {
    const steps = ['Planning', 'Purchasing', 'Inventory', 'Production', 'QC Gizi', 'Packing', 'Distribution', 'School Receipt'];

    return `
        <div class="kt-card kt-card-border shadow-none bg-muted/40 p-4 gap-4">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-xs font-medium text-secondary-foreground uppercase">Alur Operasional</div>
                    <h3 class="text-base font-semibold text-mono">SIPAGI Product Flow</h3>
                </div>
                <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-secondary">${steps.length} tahap</span>
            </div>
            <div class="grid gap-3 md:grid-cols-4">
                ${steps.map((step, index) => `
                    <div class="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                        <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">${index + 1}</span>
                        <span class="text-sm font-medium text-mono">${step}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderDashboardOverview({ liveModules, plannedModules }) {
    const accessAssignments = countAccessAssignments();
    const overviewMetrics = [
        { label: 'Modul Produk', value: productModules.length, note: 'Total modul katalog', icon: 'grid', badge: 'Ready', badgeClass: 'kt-badge-primary' },
        { label: 'Modul Aktif', value: liveModules, note: 'Siap dipakai di app shell', icon: 'shield', badge: 'Live', badgeClass: 'kt-badge-success' },
        { label: 'Rencana Modul', value: plannedModules, note: 'Batch migrasi berikutnya', icon: 'chart', badge: 'Queue', badgeClass: 'kt-badge-warning' },
        { label: 'Sheet Database', value: spreadsheetTables.length, note: 'Dipetakan untuk data', icon: 'building', badge: 'Mapped', badgeClass: 'kt-badge-secondary' }
    ];
    const metricCards = overviewMetrics.map((metric) => `
        <article class="kt-card kt-card-border shadow-none p-4 gap-3">
            <div class="flex items-center justify-between gap-3">
                <span class="text-xs font-medium text-secondary-foreground uppercase">${metric.label}</span>
                <span class="inline-flex size-8 items-center justify-center rounded-md bg-accent text-muted-foreground">${Icon(metric.icon, 'size-4')}</span>
            </div>
            <div class="flex items-end justify-between gap-3">
                <div class="text-2xl font-semibold text-mono">${metric.value}</div>
                <span class="kt-badge kt-badge-sm kt-badge-light ${metric.badgeClass}">${metric.badge}</span>
            </div>
            <div class="text-sm text-secondary-foreground">${metric.note}</div>
        </article>
    `).join('');
    const readinessItems = [
        { label: 'Akses Role', value: `${accessAssignments} akses role`, tone: 'primary' },
        { label: 'Mapping Spreadsheet', value: `${spreadsheetTables.length} sheets`, tone: 'success' },
        { label: 'Health Check Data', value: 'Dicek saat halaman dibuka', tone: 'warning' }
    ];
    const readinessList = readinessItems.map((item) => `
        <li class="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
            <span>
                <strong class="block text-sm font-medium text-mono">${item.label}</strong>
                <small class="text-sm text-secondary-foreground">${item.value}</small>
            </span>
            <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-${item.tone}">Ready</span>
        </li>
    `).join('');

    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div class="flex flex-col gap-1.5">
                    <div>
                        <h2 class="kt-card-title">Dashboard Produk SIPAGI</h2>
                        <p class="kt-card-description">Ringkasan kesiapan modul, akses role, dan integrasi spreadsheet untuk operasional SPPG.</p>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <a class="kt-btn kt-btn-sm" href="#inventory">${Icon('box', 'size-4')} Inventory</a>
                    <a class="kt-btn kt-btn-sm kt-btn-outline" href="#inventory">${Icon('box', 'size-4')} Inventory</a>
                    <a class="kt-btn kt-btn-sm kt-btn-outline" href="#reports">${Icon('chart', 'size-4')} Reports</a>
                </div>
            </div>
            <div class="kt-card-content grid gap-5">
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    ${metricCards}
                </div>
                <div class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
                    ${renderProcessFlow()}
                    <div class="kt-card kt-card-border shadow-none p-4 gap-3">
                        <div>
                            <div class="text-xs font-medium text-secondary-foreground uppercase">Kesiapan Sistem</div>
                            <h3 class="text-base font-semibold text-mono">Kesiapan Data</h3>
                        </div>
                        <ul>
                            ${readinessList}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderRoleAccessTable() {
    const moduleHeaders = productModules.map((module) => `<th>${module.label}</th>`).join('');
    const rows = userRoles.map((role) => {
        const cells = productModules.map((module) => {
            const access = accessMatrix.find((entry) => entry.moduleId === module.id);
            const hasAccess = access?.roles.includes(role.id);
            return `<td><span class="kt-badge kt-badge-sm kt-badge-light kt-badge-${hasAccess ? 'success' : 'destructive'}">${hasAccess ? 'Yes' : 'No'}</span></td>`;
        }).join('');

        return `
            <tr>
                <td>
                    <strong class="text-sm font-medium text-mono">${role.name}</strong>
                    <div class="text-sm text-secondary-foreground">${role.scope}</div>
                </td>
                ${cells}
            </tr>
        `;
    }).join('');

    return `
        <div class="kt-table-wrapper overflow-x-auto">
            <table class="kt-table kt-table-border min-w-[1120px]">
                <thead>
                    <tr>
                        <th>Role</th>
                        ${moduleHeaders}
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderDatabaseTable() {
    const rows = spreadsheetTables.map((table) => {
        return `
            <tr>
                <td><strong>${table.sheet}</strong></td>
                <td>${table.module}</td>
                <td>${table.columns.length}</td>
                <td class="text-secondary-foreground">${table.columns.join(', ')}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="kt-table-wrapper overflow-x-auto">
            <table class="kt-table kt-table-border">
                <thead>
                    <tr>
                        <th>Sheet</th>
                        <th>Module</th>
                        <th>Columns</th>
                        <th>Fields</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

export function ProductDashboardPage() {
    const liveModules = productModules.filter((module) => module.status === 'Live').length;
    const plannedModules = productModules.filter((module) => module.status === 'Planned').length;

    return `
        <div class="grid gap-5">
            ${renderDashboardOverview({ liveModules, plannedModules })}
            ${renderTodayOperations()}

            <section class="kt-card">
                <div class="kt-card-header flex-wrap gap-3">
                    <div class="flex flex-col gap-1.5">
                        <div>
                            <h3 class="kt-card-title">Koneksi Data</h3>
                            <p class="kt-card-description">Health check sumber data aplikasi.</p>
                        </div>
                    </div>
                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-warning" id="gas-status">Checking</span>
                </div>
                <div class="kt-card-content grid gap-3">
                    <div class="grid gap-1">
                        <div class="text-xs font-medium text-secondary-foreground uppercase">Endpoint configured</div>
                        <p class="text-sm text-secondary-foreground">Endpoint aktif dan tersambung.</p>
                    </div>
                    <div class="text-sm text-secondary-foreground" id="gas-message">Mengecek koneksi data...</div>
                </div>
            </section>

            <section class="kt-card">
                <div class="kt-card-header flex-wrap gap-3">
                    <div>
                        <h3 class="kt-card-title">ERP Module Map</h3>
                        <p class="kt-card-description">Modul dipisah berdasarkan alur kerja supaya mudah discan.</p>
                    </div>
                </div>
                <div class="kt-card-content">
                    <div class="grid gap-7">
                        ${renderModuleGroups()}
                    </div>
                </div>
            </section>

            <div class="grid gap-5">
                <details class="kt-card">
                    <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                        <span>
                            <strong class="block text-base font-semibold text-mono">User Access Matrix</strong>
                            <small class="text-sm text-secondary-foreground">${userRoles.length} role profiles across ${productModules.length} modules</small>
                        </span>
                        <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">Detail</span>
                    </summary>
                    <div class="kt-card-content border-t border-border">
                        ${renderRoleAccessTable()}
                    </div>
                </details>

                <details class="kt-card">
                    <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                        <span>
                            <strong class="block text-base font-semibold text-mono">Database Sheets</strong>
                            <small class="text-sm text-secondary-foreground">${spreadsheetTables.length} sheet mappings available</small>
                        </span>
                        <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">Detail</span>
                    </summary>
                    <div class="kt-card-content border-t border-border">
                        ${renderDatabaseTable()}
                    </div>
                </details>
            </div>
        </div>
    `;
}

export async function initProductDashboardPage() {
    const status = document.getElementById('gas-status');
    const message = document.getElementById('gas-message');
    if (!status || !message) return;

    try {
        const health = await checkGasHealth();
        const schema = await getSchemaIndex();
        status.className = 'kt-badge kt-badge-sm kt-badge-light kt-badge-success';
        status.textContent = 'Connected';
        message.textContent = `${health.app} tersambung. ${schema.rows.length} tabel data tersedia.`;
    } catch (error) {
        status.className = 'kt-badge kt-badge-sm kt-badge-light kt-badge-destructive';
        status.textContent = 'Needs doGet';
        message.textContent = `Sumber data belum merespons sesuai format aplikasi: ${error.message}`;
    }
}
