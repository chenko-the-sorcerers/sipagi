function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

export function StatusBadge({ tone = 'neutral', label }) {
    return `<span class="sipagi-status ${esc(tone)}">${esc(label)}</span>`;
}

export function MetricCard({ label, value, note, tone = 'neutral' }) {
    return `
        <article class="sipagi-metric ${esc(tone)}">
            <div class="erp-stat-label">${esc(label)}</div>
            <div class="erp-stat-value">${esc(value)}</div>
            <div class="erp-stat-note">${esc(note)}</div>
        </article>
    `;
}

export function TableToolbar({ title, subtitle, actions = '', filters = '' }) {
    return `
        <div class="sipagi-table-toolbar">
            <div class="sipagi-table-toolbar-copy">
                <h3>${esc(title)}</h3>
                ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
            </div>
            ${filters ? `<div class="sipagi-table-filters">${filters}</div>` : ''}
            ${actions ? `<div class="sipagi-table-actions">${actions}</div>` : ''}
        </div>
    `;
}

export function LoadingState({ title, message }) {
    return `
        <div class="erp-card sipagi-state loading">
            <div class="sipagi-bouncing-dots" aria-hidden="true"><span></span><span></span><span></span></div>
            <h3>${esc(title)}</h3>
            <p>${esc(message)}</p>
        </div>
    `;
}

export function EmptyState({ title, message, action = '' }) {
    return `
        <div class="erp-card sipagi-state empty">
            <h3>${esc(title)}</h3>
            <p>${esc(message)}</p>
            ${action ? `<div class="sipagi-state-actions">${action}</div>` : ''}
        </div>
    `;
}

export function ErrorState({ title, message, action = '' }) {
    return `
        <div class="erp-card sipagi-state error">
            <h3>${esc(title)}</h3>
            <p>${esc(message)}</p>
            ${action ? `<div class="sipagi-state-actions">${action}</div>` : ''}
        </div>
    `;
}
