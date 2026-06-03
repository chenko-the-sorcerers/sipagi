import { productModules } from '../data/productCatalog.js?v=settings-sidebar-20260511';
import { moduleIcons, navigationGroups } from '../data/navigationGroups.js?v=settings-sidebar-20260511';
import { getRoleLabel, getVisibleModulesForRole, toCatalogRoleId } from '../auth/permissionStore.js?v=settings-sidebar-20260511';
import { Icon } from './Icon.js';
import { encodeRoute } from '../router/secureRoutes.js';

const dashboardSubmenu = [
    { id: 'overview', label: 'Overview Role' },
    { id: 'mbg', label: 'Dashboard MBG' },
    { id: 'lpj', label: 'LPJ Program' },
    { id: 'finance', label: 'RAB & Realisasi' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'reports', label: 'Laporan MBG' }
];

const financeSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'rab-harian', label: 'RAB Harian' },
    { id: 'pengajuan-dana', label: 'Pengajuan Dana' },
    { id: 'petty-cash', label: 'Kas Kecil / Petty Cash' },
    { id: 'pembayaran-supplier', label: 'Pembayaran Supplier' },
    { id: 'bukti-pengeluaran', label: 'Bukti Pengeluaran' },
    { id: 'rekonsiliasi-va', label: 'Rekonsiliasi VA' },
    { id: 'laporan-keuangan', label: 'Laporan Keuangan' }
];

const hrSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'recruitment', label: 'Recruitment' },
    { id: 'employees', label: 'Data Karyawan' },
    { id: 'shift-calendar', label: 'Kalender Shift' },
    { id: 'leave', label: 'Cuti' },
    { id: 'attendance', label: 'Fingerprint' },
    { id: 'payroll', label: 'Payroll' }
];

const operationalSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'recipe', label: 'Resep' },
    { id: 'component', label: 'Komponen' },
    { id: 'nutrition', label: 'Cek Gizi' },
    { id: 'production', label: 'Produksi' },
    { id: 'packing', label: 'Packing' },
    { id: 'dispatch', label: 'Distribusi' },
    { id: 'cleaning', label: 'Kebersihan' }
];

const schoolSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'schools', label: 'Data Sekolah' },
    { id: 'beneficiaries', label: 'Penerima Manfaat' },
    { id: 'receipts', label: 'Konfirmasi Terima' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'incidents', label: 'Insiden' }
];

const supplierSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'daftar-supplier', label: 'Daftar Supplier' },
    { id: 'survei-harga-pasar', label: 'Survei Harga Pasar' },
    { id: 'perbandingan-harga', label: 'Perbandingan Harga' },
    { id: 'riwayat-pembelian', label: 'Riwayat Pembelian' }
];

const reportsSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'lpj', label: 'LPJ' },
    { id: 'laporan-harian-sppg', label: 'Laporan Harian SPPG' },
    { id: 'laporan-2-mingguan', label: 'Laporan 2 Mingguan' },
    { id: 'laporan-bulanan', label: 'Laporan Bulanan' },
    { id: 'laporan-stok', label: 'Laporan Stok' },
    { id: 'laporan-biaya-per-porsi', label: 'Laporan Biaya per Porsi' },
    { id: 'laporan-selisih-waste', label: 'Laporan Selisih / Waste' }
];

const bgnSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'checklist-penerimaan-bahan', label: 'Checklist Penerimaan Bahan' },
    { id: 'monitor-suhu', label: 'Monitor Suhu' },
    { id: 'bank-sampel', label: 'Bank Sampel' },
    { id: 'sanitasi', label: 'Sanitasi' },
    { id: 'audit-trail', label: 'Audit Trail' },
    { id: 'regional', label: 'KPI Regional' },
    { id: 'reports', label: 'Laporan BGN' }
];

const aiSubmenu = [
    { id: 'runs', label: 'AI Runs' },
    { id: 'recommendations', label: 'Rekomendasi' },
    { id: 'anomaly', label: 'Anomali' },
    { id: 'context', label: 'Konteks Data' }
];

const nutritionistSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'food-analysis', label: 'Food Analysis' },
    { id: 'menu-cycle', label: 'Menu Cycle Builder' },
    { id: 'recipe-composer', label: 'Recipe Composer' },
    { id: 'akg-target', label: 'AKG Target Engine' },
    { id: 'requirement', label: 'Belanja & Stock' },
    { id: 'qc-receiving', label: 'QC Penerimaan' },
    { id: 'reports', label: 'Nutrition Report' }
];

const distributionSubmenu = [
    { id: 'overview', label: 'Overview' },
    { id: 'route-board', label: 'Route Board' },
    { id: 'driver', label: 'Driver / Kurir' },
    { id: 'manifest', label: 'Manifest Sekolah' },
    { id: 'receipt', label: 'Tanda Terima' },
    { id: 'exception', label: 'Insiden' }
];

const moduleSubmenus = {
    finance: financeSubmenu,
    hr: hrSubmenu,
    operational: operationalSubmenu,
    school: schoolSubmenu,
    supplier: supplierSubmenu,
    reports: reportsSubmenu,
    bgn: bgnSubmenu,
    ai: aiSubmenu,
    nutritionist: nutritionistSubmenu,
    distribution: distributionSubmenu
};

const defaultSubViews = {
    inventory: 'overview',
    finance: 'overview',
    hr: 'overview',
    operational: 'overview',
    school: 'overview',
    supplier: 'overview',
    reports: 'overview',
    bgn: 'overview',
    ai: 'runs',
    nutritionist: 'overview',
    distribution: 'overview'
};

const primaryModuleIds = new Set(['dashboard', 'inventory', 'finance', 'reports', 'distribution']);
const quietModuleIds = new Set(['dev-dashboard', 'ai', 'hr', 'nutritionist', 'school', 'bgn', 'supplier', 'settings']);

export function AppShell({ activeModule, activeSubModule = '', title, subtitle, content, actions = '', sidebarCollapsed = false, activeRoleId = 'kepala-sppg', sppgName = 'SPPG Nakala' }) {
    const visibleModules = getVisibleModulesForRole(activeRoleId);
    const modulesById = new Map(visibleModules.map((module) => [module.id, module]));
    const allModulesById = new Map(productModules.map((module) => [module.id, module]));
    const activeModuleMeta = modulesById.get(activeModule) || {};
    const activeGroup = navigationGroups.find((group) => group.modules.includes(activeModule));
    const activeRoleLabel = getRoleLabel(activeRoleId);
    const activeRoleInitials = activeRoleLabel
        .split(/[ /]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
    const normalizedActions = actions
        .replaceAll('erp-btn primary', 'kt-btn kt-btn-sm kt-btn-primary')
        .replaceAll('erp-btn danger', 'kt-btn kt-btn-sm kt-btn-outline kt-btn-destructive')
        .replaceAll('erp-btn', 'kt-btn kt-btn-sm kt-btn-outline');
    const renderNavItem = (module) => {
        const active = module.id === activeModule ? 'active' : '';
        const badge = module.status !== 'Live' ? `<span class="kt-menu-badge"><span class="kt-badge kt-badge-sm kt-badge-light kt-badge-warning">${module.status}</span></span>` : '';
        const href = module.status === 'Live' ? `#${encodeRoute(module.id)}` : `#${encodeRoute(module.id)}`;
        const iconName = moduleIcons[module.id] || 'grid';
        const submenu = module.id === 'dashboard' && toCatalogRoleId(activeRoleId) === 'kepala_sppg'
            ? dashboardSubmenu
            : moduleSubmenus[module.id];
        const quiet = quietModuleIds.has(module.id);
        const titleTone = quiet
            ? 'text-2sm font-normal text-secondary-foreground'
            : 'text-sm font-medium text-foreground';
        const rowDensity = primaryModuleIds.has(module.id) ? 'py-[7px]' : 'py-[6px]';

        if (submenu) {
            const isOpen = module.id === activeModule;
            const accordionState = isOpen ? 'here show' : '';
            const accordionName = module.id;
            const defaultSubView = defaultSubViews[module.id] || submenu[0]?.id || '';
            const subItems = submenu.map((item) => {
                const subActive = isOpen && (activeSubModule || defaultSubView) === item.id ? 'active' : '';
                return `
                    <div class="kt-menu-item ${subActive}">
                        <a class="kt-menu-link border border-transparent items-center grow kt-menu-item-active:bg-accent/60 dark:kt-menu-item-active:border-border kt-menu-item-active:rounded-lg hover:bg-accent/60 hover:rounded-lg gap-[14px] ps-[10px] pe-[10px] py-[8px]" href="#${encodeRoute(`${module.id}/${item.id}`)}" data-sidebar-sub-view="${item.id}" tabindex="0">
                            <span class="kt-menu-bullet flex w-[6px] -start-[3px] rtl:start-0 relative before:absolute before:top-0 before:size-[6px] before:rounded-full rtl:before:translate-x-1/2 before:-translate-y-1/2 kt-menu-item-active:before:bg-primary kt-menu-item-hover:before:bg-primary"></span>
                            <span class="kt-menu-title text-2sm font-normal me-1 text-foreground kt-menu-item-active:text-primary kt-menu-item-active:font-medium kt-menu-link-hover:!text-primary">${item.label}</span>
                        </a>
                    </div>
                `;
            }).join('');

            return `
                <div class="kt-menu-item ${accordionState}" data-kt-menu-item-toggle="accordion" data-kt-menu-item-trigger="click">
                    <button class="kt-menu-link flex items-center grow cursor-pointer border border-transparent kt-menu-item-here:text-primary hover:bg-accent/60 hover:rounded-lg gap-[10px] ps-[10px] pe-[10px] py-[7px] w-full text-start" data-module="${module.id}" data-sidebar-accordion="${accordionName}" type="button" tabindex="0" aria-expanded="${isOpen ? 'true' : 'false'}">
                        <span class="kt-menu-icon items-start text-muted-foreground w-[20px]" data-icon="${iconName}" aria-hidden="true">${Icon(iconName, 'sipagi-icon-svg')}</span>
                        <span class="kt-menu-title text-sm font-medium text-foreground kt-menu-item-here:text-primary kt-menu-link-hover:!text-primary">${module.label}</span>
                        <span class="kt-menu-arrow text-muted-foreground w-[20px] shrink-0 justify-end ms-1 me-[-10px]">
                            <span class="inline-flex kt-menu-item-show:hidden"><i class="ki-filled ki-plus text-[11px]"></i></span>
                            <span class="hidden kt-menu-item-show:inline-flex"><i class="ki-filled ki-minus text-[11px]"></i></span>
                        </span>
                    </button>
                    <div class="kt-menu-accordion gap-1 ps-[10px] relative before:absolute before:start-[20px] before:top-0 before:bottom-0 before:border-s before:border-border">
                        ${subItems}
                    </div>
                </div>
            `;
        }

        return `
            <div class="kt-menu-item ${active}">
                <a href="${href}" class="kt-menu-link border border-transparent items-center grow kt-menu-item-active:bg-accent/60 kt-menu-item-active:rounded-lg hover:bg-accent/60 hover:rounded-lg gap-[10px] ps-[10px] pe-[10px] ${rowDensity}" data-module="${module.id}" tabindex="0" ${active ? 'aria-current="page"' : ''}>
                    <span class="kt-menu-icon items-start text-muted-foreground w-[20px]" data-icon="${iconName}" aria-hidden="true">${Icon(iconName, 'sipagi-icon-svg')}</span>
                    <span class="kt-menu-title ${titleTone} kt-menu-item-active:text-primary kt-menu-item-active:font-medium kt-menu-link-hover:!text-primary">${module.label}</span>
                    ${badge}
                </a>
            </div>
        `;
    };
    const navSections = navigationGroups.map((group) => {
        const navItems = group.modules
            .map((moduleId) => modulesById.get(moduleId))
            .filter(Boolean)
            .map(renderNavItem)
            .join('');

        return `
            <div class="kt-menu-item pt-3 pb-1 first:pt-0" data-section="${group.id}">
                <span class="kt-menu-heading uppercase text-[11px] font-semibold text-muted-foreground tracking-[0.02em] ps-[10px] pe-[10px]">${group.label}</span>
            </div>
            <div class="flex flex-col gap-0.5">
                ${navItems}
            </div>
        `;
    }).join('');

    return `
        <div class="flex grow [--sidebar-width:250px]">
            <aside class="kt-sidebar bg-background border-e border-e-border fixed top-0 bottom-0 z-20 hidden lg:flex flex-col items-stretch shrink-0 [--sidebar-width:250px] [--kt-drawer-enable:true] lg:[--kt-drawer-enable:false]" data-kt-drawer="true" data-kt-drawer-class="kt-drawer kt-drawer-start top-0 bottom-0" id="sidebar">
                <div class="kt-sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-5 shrink-0" id="sidebar_header">
                    <a class="flex items-center gap-2.5" href="#${encodeRoute('dashboard')}">
                        <img class="sipagi-shell-logo" src="/app/assets/images/sipagi-logo.png" alt="SIPAGI ERP Suite">
                        <span class="default-logo flex flex-col">
                            <span class="text-base font-semibold text-mono leading-none">SIPAGI</span>
                            <span class="text-xs font-medium text-secondary-foreground">ERP Suite</span>
                        </span>
                        <span class="small-logo hidden text-sm font-semibold text-mono">S</span>
                    </a>
                    <button class="kt-btn kt-btn-outline kt-btn-icon size-[30px] absolute start-full top-2/4 -translate-x-2/4 -translate-y-2/4 rtl:translate-x-2/4 ${sidebarCollapsed ? 'active' : ''}" data-action="toggle-sidebar-collapse" id="sidebar_toggle" type="button" aria-label="Toggle sidebar" aria-pressed="${sidebarCollapsed ? 'true' : 'false'}">
                        <i class="ki-filled ki-black-left-line ${sidebarCollapsed ? 'rotate-180' : ''} transition-all duration-300 rtl:translate rtl:rotate-180"></i>
                    </button>
                </div>

                <div class="kt-sidebar-content flex grow shrink-0 py-4 pe-2" id="sidebar_content">
                    <div class="kt-scrollable-y-hover grow shrink-0 flex ps-2 lg:ps-4 pe-1 lg:pe-2.5" data-kt-scrollable="true" data-kt-scrollable-dependencies="#sidebar_header" data-kt-scrollable-height="auto" data-kt-scrollable-offset="0px" data-kt-scrollable-wrappers="#sidebar_content" id="sidebar_scrollable">
                        <nav class="kt-menu flex flex-col grow gap-1" data-kt-menu="true" data-kt-menu-accordion-expand-all="false" id="sidebar_menu">
                            ${navSections}
                            <div class="kt-menu-item pt-3 pb-1">
                                <span class="kt-menu-heading uppercase text-[11px] font-semibold text-muted-foreground tracking-[0.02em] ps-[10px] pe-[10px]">Status Sistem</span>
                            </div>
                            <div class="kt-card kt-card-border shadow-none p-3 gap-2 mx-1 bg-muted/30">
                                <div class="flex items-center justify-between gap-3 text-xs font-medium text-secondary-foreground">
                                    <span>Sumber Data</span>
                                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-success">Online</span>
                                </div>
                                <div class="flex items-center justify-between gap-3 text-xs font-medium text-secondary-foreground">
                                    <span>${visibleModules.length} modul terbuka</span>
                                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">Live</span>
                                </div>
                                <div class="flex items-center justify-between gap-3 text-xs font-medium text-secondary-foreground">
                                    <span>51 sheet data</span>
                                    <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-success">Ready</span>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
            </aside>

            <div class="kt-wrapper flex grow flex-col">
                <header class="kt-header fixed top-0 z-10 start-0 end-0 flex items-stretch shrink-0 bg-background/95 border-b border-border/70" data-kt-sticky="true" data-kt-sticky-class="border-b border-border" data-kt-sticky-name="header" id="header">
                    <div class="kt-container-fixed flex justify-between items-center gap-3 lg:gap-4" id="headerContainer">
                        <div class="flex gap-2.5 lg:hidden items-center -ms-1">
                            <a class="flex items-center gap-2" href="#${encodeRoute('dashboard')}">
                                <span class="sipagi-brand-mark compact">S</span>
                                <span class="text-sm font-semibold text-mono">SIPAGI</span>
                            </a>
                            <button class="kt-btn kt-btn-icon kt-btn-ghost" data-kt-drawer-toggle="#sidebar" type="button" aria-label="Open sidebar">
                                <i class="ki-filled ki-menu"></i>
                            </button>
                        </div>

                        <div class="hidden lg:flex items-center min-w-0 gap-3">
                            <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-primary">${activeGroup?.label || 'Workspace'}</span>
                            <div class="flex items-center gap-2 min-w-0 text-sm text-secondary-foreground">
                                <span>SIPAGI ERP</span>
                                <span>/</span>
                                <span class="text-mono font-medium truncate">${title}</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2.5 min-w-0">
                            <label class="kt-input hidden md:flex w-[min(420px,36vw)]">
                                ${Icon('search', 'sipagi-search-icon')}
                                <input id="global-search" class="kt-input" type="text" placeholder="Cari modul atau perintah..." list="global-search-options" autocomplete="off" aria-label="Cari modul atau perintah">
                                <span class="kt-badge kt-badge-sm kt-badge-light kt-badge-secondary">⌘ K</span>
                            </label>
                            <datalist id="global-search-options">
                                ${visibleModules.map((module) => `<option value="${module.label}"></option>`).join('')}
                            </datalist>
                            <div class="flex items-center gap-2 border-s border-border ps-2.5">
                                <button class="kt-btn kt-btn-icon kt-btn-outline" data-action="sync-current-module" type="button" title="Sinkron modul aktif" aria-label="Sinkron modul aktif">${Icon('sync', 'sipagi-icon-svg')}</button>
                                <button class="kt-btn kt-btn-icon kt-btn-outline" data-action="toggle-shell-panel" data-panel="notifications" type="button" title="Notifikasi" aria-label="Notifikasi">${Icon('bell', 'sipagi-icon-svg')}</button>
                                <button class="kt-btn kt-btn-outline gap-2 px-2.5" data-action="toggle-shell-panel" data-panel="user" type="button" aria-label="User menu">
                                    <span class="kt-badge kt-badge-primary kt-badge-circle size-7 text-xs font-semibold">${activeRoleInitials || 'SP'}</span>
                                    <span class="hidden lg:flex flex-col items-start leading-none">
                                        <span class="text-xs font-semibold text-mono">${activeRoleLabel}</span>
                                        <span class="text-[11px] text-secondary-foreground">${sppgName}</span>
                                    </span>
                                </button>
                                <button class="kt-btn kt-btn-icon kt-btn-outline" data-action="logout" type="button" title="Keluar" aria-label="Keluar">${Icon('log-out', 'sipagi-icon-svg')}</button>
                            </div>
                            <div class="kt-card kt-card-border sipagi-shell-popover hidden w-[260px]" data-shell-panel="notifications">
                                <div>
                                    <strong class="text-sm font-semibold text-mono">Notifikasi</strong>
                                </div>
                                <div class="text-sm text-secondary-foreground">Belum ada alert operasional baru.</div>
                            </div>
                            <div class="kt-card kt-card-border sipagi-shell-popover hidden w-[260px]" data-shell-panel="user">
                                <div>
                                    <strong class="text-sm font-semibold text-mono">${activeRoleLabel}</strong>
                                </div>
                                <div class="text-sm text-secondary-foreground">${sppgName} aktif dengan ${visibleModules.length} halaman terbuka.</div>
                                <button class="kt-btn kt-btn-sm kt-btn-outline w-full justify-center" type="button" data-action="logout">Keluar</button>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="grow pt-5" id="content" role="content">
                    ${normalizedActions ? `
                        <div class="kt-container-fixed sipagi-page-actions">
                            <div class="flex items-center justify-end gap-2.5 flex-wrap">${normalizedActions}</div>
                        </div>
                    ` : ''}
                    <div class="kt-container-fixed">
                        <section class="sipagi-content-scope">
                            ${content}
                        </section>
                    </div>
                </main>
            </div>
        </div>
    `;
}
