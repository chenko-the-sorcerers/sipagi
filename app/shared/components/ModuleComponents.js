export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

export function formatNumber(value) {
    return Number(value || 0).toLocaleString('id-ID');
}

export function formatMoney(value) {
    return `Rp ${formatNumber(value)}`;
}

export function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

export function optionRows(rows, idField, labelField, fallback = 'Belum ada data') {
    if (!rows.length) return `<option value="">${fallback}</option>`;
    return rows.map((row) => `<option value="${escapeHtml(row[idField])}">${escapeHtml(row[labelField] || row[idField])}</option>`).join('');
}

export function StatGrid(cards) {
    return `
        <div class="erp-grid">
            ${cards.map((card) => `
                <div class="erp-card">
                    <div class="erp-stat-label">${escapeHtml(card.label)}</div>
                    <div class="erp-stat-value">${card.value}</div>
                    <div class="erp-stat-note">${escapeHtml(card.note || '')}</div>
                </div>
            `).join('')}
        </div>
    `;
}

export function ViewTabs({ views, activeView, dataAttr }) {
    return `
        <div class="inventory-view-grid">
            ${views.map((view) => `
                <button class="inventory-view-card ${activeView === view.id ? 'active' : ''}" ${dataAttr}="${view.id}" type="button">
                    <strong>${escapeHtml(view.label)}</strong>
                    <span>${escapeHtml(view.description)}</span>
                </button>
            `).join('')}
        </div>
    `;
}

export function DataTable({ headers, rows, emptyText }) {
    return `
        <div class="erp-table-wrap">
            <table class="erp-table">
                <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
                <tbody>${rows || `<tr><td colspan="${headers.length}">${escapeHtml(emptyText)}</td></tr>`}</tbody>
            </table>
        </div>
    `;
}

export function LoadingCard({ title, text }) {
    return `
        <div class="erp-card inventory-loading sipagi-loading-card">
            <div class="sipagi-bouncing-dots" aria-hidden="true"><span></span><span></span><span></span></div>
            <h3>${escapeHtml(title)}</h3>
            <p class="erp-muted">${escapeHtml(text)}</p>
        </div>
    `;
}

export function ErrorCard({ title, error, action }) {
    return `<div class="erp-card inventory-error"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(error)}</p><button class="erp-btn primary" data-action="${escapeHtml(action)}" type="button">Coba Lagi</button></div>`;
}

export function showDetailModal({ title, subtitle = '', rows = [], actions = [] }) {
    document.querySelector('.sipagi-modal-backdrop')?.remove();
    const backdrop = document.createElement('div');
    backdrop.className = 'sipagi-modal-backdrop';
    backdrop.innerHTML = `
        <section class="sipagi-detail-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
            <header class="sipagi-detail-modal-header">
                <div>
                    <h3>${escapeHtml(title)}</h3>
                    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
                </div>
                <button class="erp-btn" data-close-detail-modal type="button">Tutup</button>
            </header>
            <div class="sipagi-detail-grid">
                ${rows.map(([label, value]) => `
                    <div class="sipagi-detail-row">
                        <span>${escapeHtml(label)}</span>
                        <strong>${value === undefined || value === null || value === '' ? '-' : value}</strong>
                    </div>
                `).join('')}
            </div>
            ${actions.length ? `<footer class="sipagi-detail-actions">${actions.map((action) => `<button class="erp-btn ${escapeHtml(action.className || '')}" ${action.attr} type="button">${escapeHtml(action.label)}</button>`).join('')}</footer>` : ''}
        </section>
    `;
    document.body.appendChild(backdrop);
}

if (!window.__sipagiDetailModalBound) {
    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-close-detail-modal]') || event.target.classList.contains('sipagi-modal-backdrop')) {
            document.querySelector('.sipagi-modal-backdrop')?.remove();
        }
    });
    window.__sipagiDetailModalBound = true;
}
