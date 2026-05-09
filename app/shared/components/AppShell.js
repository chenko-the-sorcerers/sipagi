import { productModules } from '../data/productCatalog.js';

export function AppShell({ activeModule, title, subtitle, content, actions = '' }) {
    const navItems = productModules.map((module) => {
        const active = module.id === activeModule ? 'active' : '';
        const badge = `<span class="nav-badge">${module.status}</span>`;
        const href = module.status === 'Live' ? `#${module.id}` : `#${module.id}`;

        return `
            <a href="${href}" class="nav-item ${active}" data-module="${module.id}">
                <span>${module.label}</span>
                ${badge}
            </a>
        `;
    }).join('');

    return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <div class="logo-icon">S</div>
                    <div>
                        <h1>SIPAGI</h1>
                        <p>Suite Produk</p>
                    </div>
                </div>
                <div class="user-info">
                    <div class="user-avatar">KS</div>
                    <div class="user-details">
                        <h4>Kepala SPPG</h4>
                        <p>Dashboard Produk</p>
                    </div>
                </div>
            </div>

            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-section-title">Modul</div>
                    ${navItems}
                </div>
                <div class="nav-section">
                    <div class="nav-section-title">Status</div>
                    <div class="erp-sidebar-placeholder">Dashboard produk mencakup ERP, portal stakeholder, laporan, dan AI assist.</div>
                </div>
            </nav>
        </aside>

        <main class="main-content">
            <div class="topbar">
                <div class="topbar-left">
                    <h2 id="page-title">${title}</h2>
                    <div class="breadcrumb">
                        <span>SIPAGI ERP</span>
                        <span>/</span>
                        <span>${title}</span>
                    </div>
                </div>
                <div class="topbar-right">
                    <div class="search-box">
                        <span>Search</span>
                        <input id="global-search" type="text" placeholder="Cari modul, role, atau tabel...">
                    </div>
                </div>
            </div>

            <section class="erp-page">
                <div class="erp-header">
                    <div>
                        <h2>${title}</h2>
                        <p>${subtitle}</p>
                    </div>
                    ${actions ? `<div class="erp-actions">${actions}</div>` : ''}
                </div>
                ${content}
            </section>
        </main>
    `;
}
