import { AppShell } from './shared/components/AppShell.js';
import { productModules } from './shared/data/productCatalog.js';
import { ProductDashboardPage, initProductDashboardPage } from './modules/dashboard/pages/ProductDashboardPage.js';
import { InventoryPage, initInventoryPage } from './modules/inventory/pages/InventoryPage.js';
import { PurchasingPage, initPurchasingPage } from './modules/purchasing/pages/PurchasingPage.js';
import { FinancePage, initFinancePage } from './modules/finance/pages/FinancePage.js';
import { HrPage, initHrPage } from './modules/hr/pages/HrPage.js';
import { OperationalPage, initOperationalPage } from './modules/operational/pages/OperationalPage.js';
import { SchoolPage, initSchoolPage } from './modules/school/pages/SchoolPage.js';
import { BgnPage, initBgnPage } from './modules/bgn/pages/BgnPage.js';
import { SupplierPage, initSupplierPage } from './modules/supplier/pages/SupplierPage.js';
import { AiPage, initAiPage } from './modules/ai/pages/AiPage.js';
import { NutritionistPage, initNutritionistPage } from './modules/nutritionist/pages/NutritionistPage.js';
import { ReportsPage, initReportsPage } from './modules/reports/pages/ReportsPage.js';

const app = document.getElementById('app');

function modulePlaceholder(module) {
    const features = module.features.map((feature) => `<li>${feature}</li>`).join('');
    const tables = module.tables.map((table) => `<span class="product-chip">${table}</span>`).join('');

    return `
        <div class="erp-card">
            <div class="product-module-head">
                <div>
                    <div class="erp-stat-label">${module.group}</div>
                    <h3>${module.label}</h3>
                </div>
                <span class="erp-status warning">${module.status}</span>
            </div>
            <p class="erp-muted">${module.description}</p>
            <h3 style="margin-top: 1.25rem;">Fitur Direncanakan</h3>
            <ul class="product-feature-list">${features}</ul>
            <h3 style="margin-top: 1.25rem;">Sheet Database</h3>
            <div class="product-chip-list">${tables}</div>
        </div>
    `;
}

function render() {
    const route = window.location.hash.replace('#', '') || 'dashboard';
    const module = productModules.find((entry) => entry.id === route) || productModules[0];
    const isDashboard = module.id === 'dashboard';
    const isInventory = module.id === 'inventory';
    const isPurchasing = module.id === 'purchasing';
    const isFinance = module.id === 'finance';
    const isHr = module.id === 'hr';
    const isOperational = module.id === 'operational';
    const isSchool = module.id === 'school';
    const isBgn = module.id === 'bgn';
    const isSupplier = module.id === 'supplier';
    const isAi = module.id === 'ai';
    const isNutritionist = module.id === 'nutritionist';
    const isReports = module.id === 'reports';
    const content = isDashboard
        ? ProductDashboardPage()
        : isInventory
            ? InventoryPage()
            : isPurchasing
                ? PurchasingPage()
                : isFinance
                    ? FinancePage()
                    : isHr
                        ? HrPage()
                        : isOperational
                            ? OperationalPage()
                            : isSchool
                                ? SchoolPage()
                                : isBgn
                                    ? BgnPage()
                                    : isSupplier
                                        ? SupplierPage()
                                        : isAi
                                            ? AiPage()
                                            : isNutritionist
                                                ? NutritionistPage()
                                                : isReports
                                                    ? ReportsPage()
                                                    : modulePlaceholder(module);
    const actions = isInventory
        ? '<button class="erp-btn" data-action="refresh-inventory">Refresh GAS</button><button class="erp-btn primary" data-action="focus-add-item">Tambah Item Bahan</button>'
        : isPurchasing
            ? '<button class="erp-btn" data-action="refresh-purchasing">Refresh GAS</button><a class="erp-btn primary" href="#inventory">Cek Inventori</a>'
            : isFinance
                ? '<button class="erp-btn" data-action="refresh-finance">Refresh GAS</button><a class="erp-btn primary" href="#purchasing">Cek Faktur</a>'
                : isHr
                    ? '<button class="erp-btn" data-action="refresh-hr">Refresh GAS</button><a class="erp-btn primary" href="#finance">Cek Payroll</a>'
                    : isOperational
                        ? '<button class="erp-btn" data-action="refresh-operational">Refresh GAS</button><a class="erp-btn primary" href="#purchasing">Cek Pengadaan</a>'
                        : isSchool
                            ? '<button class="erp-btn" data-action="refresh-school">Refresh GAS</button><a class="erp-btn primary" href="#operational">Cek Distribusi</a>'
                            : isBgn
                                ? '<button class="erp-btn" data-action="refresh-bgn">Refresh GAS</button><a class="erp-btn primary" href="#reports">Cek Reports</a>'
                                : isSupplier
                                    ? '<button class="erp-btn" data-action="refresh-supplier">Refresh GAS</button><a class="erp-btn primary" href="#purchasing">Cek PO</a>'
                                    : isAi
                                        ? '<button class="erp-btn" data-action="refresh-ai">Refresh GAS</button><a class="erp-btn primary" href="#nutritionist">Cek Ahli Gizi</a>'
                                        : isNutritionist
                                            ? '<button class="erp-btn" data-action="refresh-nutritionist">Refresh GAS</button><a class="erp-btn primary" href="#operational">Operasional</a>'
                                            : isReports
                                                ? '<button class="erp-btn" data-action="refresh-reports">Refresh GAS</button><a class="erp-btn primary" href="#dashboard">Dashboard Produk</a>'
                                                : '<a class="erp-btn primary" href="#inventory">Buka Inventori</a>';

    app.innerHTML = AppShell({
        activeModule: module.id,
        title: module.label,
        subtitle: module.description,
        content,
        actions
    });

    if (isDashboard) initProductDashboardPage();
    if (isInventory) initInventoryPage();
    if (isPurchasing) initPurchasingPage();
    if (isFinance) initFinancePage();
    if (isHr) initHrPage();
    if (isOperational) initOperationalPage();
    if (isSchool) initSchoolPage();
    if (isBgn) initBgnPage();
    if (isSupplier) initSupplierPage();
    if (isAi) initAiPage();
    if (isNutritionist) initNutritionistPage();
    if (isReports) initReportsPage();
}

document.addEventListener('DOMContentLoaded', render);
window.addEventListener('hashchange', render);
