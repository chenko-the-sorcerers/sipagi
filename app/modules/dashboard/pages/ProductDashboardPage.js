import { accessMatrix, productModules, spreadsheetTables, userRoles } from '../../../shared/data/productCatalog.js';
import { checkGasHealth, GAS_ENDPOINT, getSchemaIndex } from '../../../shared/services/googleSheetsApi.js';

function statusClass(status) {
    if (status === 'Live') return 'safe';
    if (status === 'Planned') return 'warning';
    return 'danger';
}

function countTables(moduleName) {
    return spreadsheetTables.filter((table) => table.module.toLowerCase() === moduleName.toLowerCase()).length;
}

function renderModuleCards() {
    return productModules.map((module) => {
        const featureList = module.features.map((feature) => `<li>${feature}</li>`).join('');
        const tableCount = module.tables.length || countTables(module.label);

        return `
            <article class="erp-card product-module-card">
                <div class="product-module-head">
                    <div>
                        <div class="erp-stat-label">${module.group}</div>
                        <h3>${module.label}</h3>
                    </div>
                    <span class="erp-status ${statusClass(module.status)}">${module.status}</span>
                </div>
                <p class="erp-muted">${module.description}</p>
                <ul class="product-feature-list">${featureList}</ul>
                <div class="product-module-meta">
                    <span>Owner: ${module.owner}</span>
                    <span>${tableCount} tables</span>
                </div>
            </article>
        `;
    }).join('');
}

function renderRoleAccessTable() {
    const moduleHeaders = productModules.map((module) => `<th>${module.label}</th>`).join('');
    const rows = userRoles.map((role) => {
        const cells = productModules.map((module) => {
            const access = accessMatrix.find((entry) => entry.moduleId === module.id);
            const hasAccess = access?.roles.includes(role.id);
            return `<td><span class="erp-status ${hasAccess ? 'safe' : 'danger'}">${hasAccess ? 'Yes' : 'No'}</span></td>`;
        }).join('');

        return `
            <tr>
                <td>
                    <strong>${role.name}</strong>
                    <div class="erp-muted">${role.scope}</div>
                </td>
                ${cells}
            </tr>
        `;
    }).join('');

    return `
        <div class="erp-table-wrap">
            <table class="erp-table product-access-table">
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
                <td class="erp-muted">${table.columns.join(', ')}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="erp-table-wrap">
            <table class="erp-table">
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
        <div class="erp-grid">
            <div class="erp-card">
                <div class="erp-stat-label">Product Modules</div>
                <div class="erp-stat-value">${productModules.length}</div>
                <div class="erp-stat-note">Full SIPAGI product surface</div>
            </div>
            <div class="erp-card">
                <div class="erp-stat-label">Live Modules</div>
                <div class="erp-stat-value">${liveModules}</div>
                <div class="erp-stat-note">Ready in current app shell</div>
            </div>
            <div class="erp-card">
                <div class="erp-stat-label">Planned Modules</div>
                <div class="erp-stat-value">${plannedModules}</div>
                <div class="erp-stat-note">Prepared for next build waves</div>
            </div>
            <div class="erp-card">
                <div class="erp-stat-label">Spreadsheet Tables</div>
                <div class="erp-stat-value">${spreadsheetTables.length}</div>
                <div class="erp-stat-note">Ready for GAS setup</div>
            </div>
        </div>

        <div class="erp-card product-flow-card">
            <h3>SIPAGI Product Flow</h3>
            <div class="product-flow">
                <span>Planning</span>
                <span>Purchasing</span>
                <span>Inventory</span>
                <span>Production</span>
                <span>QC Gizi</span>
                <span>Packing</span>
                <span>Distribution</span>
                <span>School Receipt</span>
                <span>Reports</span>
                <span>AI Assist</span>
            </div>
        </div>

        <div class="erp-card">
            <div class="product-module-head">
                <div>
                    <h3>Google Sheets Connection</h3>
                    <p class="erp-muted">${GAS_ENDPOINT}</p>
                </div>
                <span class="erp-status warning" id="gas-status">Checking</span>
            </div>
            <div class="erp-muted" id="gas-message" style="margin-top: 0.75rem;">Checking Apps Script health endpoint...</div>
        </div>

        <div class="product-module-grid">
            ${renderModuleCards()}
        </div>

        <div class="erp-stack" style="margin-top: 1rem;">
            <div class="erp-card">
                <h3>User Access Matrix</h3>
                ${renderRoleAccessTable()}
            </div>

            <div class="erp-card">
                <h3>Google Spreadsheet Database Sheets</h3>
                ${renderDatabaseTable()}
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
        status.className = 'erp-status safe';
        status.textContent = 'Connected';
        message.textContent = `${health.app} connected. ${schema.rows.length} spreadsheet tables available.`;
    } catch (error) {
        status.className = 'erp-status danger';
        status.textContent = 'Needs doGet';
        message.textContent = `Endpoint reached, but it is not returning SIPAGI JSON yet: ${error.message}`;
    }
}
