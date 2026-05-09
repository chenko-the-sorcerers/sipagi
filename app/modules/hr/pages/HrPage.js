import {
    createAttendance,
    createEmployee,
    createPayroll,
    createRoster,
    getHrState,
    getHrSummaryFromState
} from '../services/hrApi.js';

const pageState = {
    activeView: 'employees',
    loading: true,
    error: '',
    state: {
        employees: [],
        roles: [],
        rosters: [],
        attendance: [],
        payroll: []
    }
};

const views = [
    { id: 'employees', label: 'Data Karyawan', description: 'Master staf, role, nomor kontak, status kerja, dan gaji pokok.' },
    { id: 'roster', label: 'Roster Shift', description: 'Jadwal shift per tanggal, jam kerja, dan penugasan area.' },
    { id: 'attendance', label: 'Fingerprint', description: 'Log absensi dari fingerprint atau input manual.' },
    { id: 'payroll', label: 'Payroll', description: 'Slip gaji bulanan, tunjangan, potongan, dan gaji bersih.' }
];

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

function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function optionRows(rows, idField, labelField, fallback = 'Belum ada data') {
    if (!rows.length) return `<option value="">${fallback}</option>`;
    return rows.map((row) => `<option value="${esc(row[idField])}">${esc(row[labelField] || row[idField])}</option>`).join('');
}

function employeeName(id) {
    return pageState.state.employees.find((row) => row.employee_id === id)?.name || id || '-';
}

function roleName(id) {
    return pageState.state.roles.find((row) => row.role_id === id)?.role_name || id || '-';
}

function employeeOptions() {
    return optionRows(pageState.state.employees, 'employee_id', 'name', 'Tambah karyawan dahulu');
}

function renderStats() {
    const summary = getHrSummaryFromState(pageState.state);
    const cards = [
        ['Karyawan Aktif', summary.activeEmployees, 'Staf aktif di SPPG'],
        ['Roster Hari Ini', summary.rosterToday, 'Shift yang terjadwal hari ini'],
        ['Absensi Hari Ini', summary.attendanceToday, 'Fingerprint/manual tercatat'],
        ['Total Payroll', `Rp ${money(summary.payrollTotal)}`, `${summary.lateCount} catatan terlambat`]
    ];

    return `
        <div class="erp-grid">
            ${cards.map(([label, value, note]) => `
                <div class="erp-card">
                    <div class="erp-stat-label">${label}</div>
                    <div class="erp-stat-value">${value}</div>
                    <div class="erp-stat-note">${note}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderViewNav() {
    return `
        <div class="inventory-view-grid">
            ${views.map((view) => `
                <button class="inventory-view-card ${pageState.activeView === view.id ? 'active' : ''}" data-hr-view="${view.id}" type="button">
                    <strong>${view.label}</strong>
                    <span>${view.description}</span>
                </button>
            `).join('')}
        </div>
    `;
}

function renderActionBar() {
    return `
        <div class="inventory-action-bar">
            <button class="erp-btn primary" data-action="refresh-hr" type="button">Refresh GAS</button>
            <button class="erp-btn" data-jump-view="employees" type="button">Tambah Karyawan</button>
            <button class="erp-btn" data-jump-view="roster" type="button">Buat Roster</button>
            <button class="erp-btn" data-jump-view="attendance" type="button">Input Absensi</button>
            <button class="erp-btn" data-jump-view="payroll" type="button">Proses Payroll</button>
        </div>
    `;
}

function renderEmployeeForm() {
    return `
        <form class="erp-card" data-hr-form="employee">
            <h3>Tambah Karyawan</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Nama</label><input class="erp-input" name="name" required></div>
                <div class="erp-field"><label>Role</label><select class="erp-select" name="role_id" required>${optionRows(pageState.state.roles, 'role_id', 'role_name', 'Setup role dahulu')}</select></div>
                <div class="erp-field"><label>No. HP</label><input class="erp-input" name="phone" required></div>
                <div class="erp-field"><label>Tanggal Masuk</label><input class="erp-input" name="join_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Status Kerja</label><select class="erp-select" name="employment_status"><option value="tetap">Tetap</option><option value="kontrak">Kontrak</option><option value="harian">Harian</option></select></div>
                <div class="erp-field"><label>Gaji Pokok</label><input class="erp-input" name="base_salary" type="number" min="0" step="1000" required></div>
                <div class="erp-field full"><label>Alamat</label><textarea class="erp-textarea" name="address"></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Karyawan</button></div>
        </form>
    `;
}

function renderRosterForm() {
    return `
        <form class="erp-card" data-hr-form="roster">
            <h3>Buat Roster Shift</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Karyawan</label><select class="erp-select" name="employee_id" required>${employeeOptions()}</select></div>
                <div class="erp-field"><label>Tanggal Shift</label><input class="erp-input" name="shift_date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div>
                <div class="erp-field"><label>Nama Shift</label><select class="erp-select" name="shift_name"><option value="pagi">Pagi</option><option value="siang">Siang</option><option value="malam">Malam</option></select></div>
                <div class="erp-field"><label>Penugasan</label><select class="erp-select" name="assignment"><option value="persiapan">Persiapan</option><option value="produksi">Produksi</option><option value="pemorsian">Pemorsian</option><option value="packing">Packing</option><option value="distribusi">Distribusi</option><option value="kebersihan">Kebersihan</option></select></div>
                <div class="erp-field"><label>Mulai</label><input class="erp-input" name="start_time" type="time" value="06:00"></div>
                <div class="erp-field"><label>Selesai</label><input class="erp-input" name="end_time" type="time" value="14:00"></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Roster</button></div>
        </form>
    `;
}

function renderAttendanceForm() {
    return `
        <form class="erp-card" data-hr-form="attendance">
            <h3>Input Absensi Fingerprint</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Karyawan</label><select class="erp-select" name="employee_id" required>${employeeOptions()}</select></div>
                <div class="erp-field"><label>Tanggal</label><input class="erp-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div>
                <div class="erp-field"><label>Check In</label><input class="erp-input" name="check_in" type="time" required></div>
                <div class="erp-field"><label>Check Out</label><input class="erp-input" name="check_out" type="time"></div>
                <div class="erp-field"><label>Sumber</label><select class="erp-select" name="source"><option value="fingerprint">Fingerprint</option><option value="manual">Manual</option><option value="import">Import</option></select></div>
                <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="hadir">Hadir</option><option value="terlambat">Terlambat</option><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alpha">Alpha</option></select></div>
                <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Absensi</button></div>
        </form>
    `;
}

function renderPayrollForm() {
    return `
        <form class="erp-card" data-hr-form="payroll">
            <h3>Proses Payroll</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Karyawan</label><select class="erp-select" name="employee_id" required>${employeeOptions()}</select></div>
                <div class="erp-field"><label>Periode</label><input class="erp-input" name="period" placeholder="2026-05" required></div>
                <div class="erp-field"><label>Gaji Pokok Manual</label><input class="erp-input" name="base_salary" type="number" min="0" step="1000" placeholder="Kosongkan pakai data karyawan"></div>
                <div class="erp-field"><label>Tunjangan</label><input class="erp-input" name="allowance" type="number" min="0" step="1000" value="0"></div>
                <div class="erp-field"><label>Potongan</label><input class="erp-input" name="deduction" type="number" min="0" step="1000" value="0"></div>
                <div class="erp-field"><label>Status</label><select class="erp-select" name="status"><option value="draft">Draft</option><option value="disetujui">Disetujui</option><option value="dibayar">Dibayar</option></select></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Payroll</button></div>
        </form>
    `;
}

function renderTable(headers, rows, emptyText) {
    return `
        <div class="erp-table-wrap">
            <table class="erp-table">
                <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
                <tbody>${rows || `<tr><td colspan="${headers.length}">${emptyText}</td></tr>`}</tbody>
            </table>
        </div>
    `;
}

function renderEmployeeTable() {
    const rows = pageState.state.employees.slice(0, 12).map((row) => `
        <tr><td>${esc(row.name)}</td><td>${esc(roleName(row.role_id))}</td><td>${esc(row.phone)}</td><td>${esc(row.employment_status)}</td><td>Rp ${money(row.base_salary)}</td><td><span class="erp-status safe">${esc(row.status || 'aktif')}</span></td></tr>
    `).join('');
    return renderTable(['Nama', 'Role', 'HP', 'Status Kerja', 'Gaji Pokok', 'Status'], rows, 'Belum ada karyawan.');
}

function renderRosterTable() {
    const rows = pageState.state.rosters.slice(0, 12).map((row) => `
        <tr><td>${esc(row.shift_date)}</td><td>${esc(employeeName(row.employee_id))}</td><td>${esc(row.shift_name)}</td><td>${esc(row.start_time)} - ${esc(row.end_time)}</td><td>${esc(row.assignment)}</td><td><span class="erp-status warning">${esc(row.status || 'terjadwal')}</span></td></tr>
    `).join('');
    return renderTable(['Tanggal', 'Karyawan', 'Shift', 'Jam', 'Penugasan', 'Status'], rows, 'Belum ada roster.');
}

function renderAttendanceTable() {
    const rows = pageState.state.attendance.slice(0, 12).map((row) => `
        <tr><td>${esc(row.date)}</td><td>${esc(employeeName(row.employee_id))}</td><td>${esc(row.check_in)}</td><td>${esc(row.check_out || '-')}</td><td>${esc(row.source)}</td><td><span class="erp-status ${row.status === 'hadir' ? 'safe' : 'warning'}">${esc(row.status)}</span></td><td>${esc(row.notes || '-')}</td></tr>
    `).join('');
    return renderTable(['Tanggal', 'Karyawan', 'Masuk', 'Pulang', 'Sumber', 'Status', 'Catatan'], rows, 'Belum ada absensi.');
}

function renderPayrollTable() {
    const rows = pageState.state.payroll.slice(0, 12).map((row) => `
        <tr><td>${esc(row.period)}</td><td>${esc(employeeName(row.employee_id))}</td><td>Rp ${money(row.base_salary)}</td><td>Rp ${money(row.allowance)}</td><td>Rp ${money(row.deduction)}</td><td>Rp ${money(row.net_salary)}</td><td><span class="erp-status safe">${esc(row.status || 'draft')}</span></td></tr>
    `).join('');
    return renderTable(['Periode', 'Karyawan', 'Pokok', 'Tunjangan', 'Potongan', 'Bersih', 'Status'], rows, 'Belum ada payroll.');
}

function renderActiveView() {
    if (pageState.activeView === 'roster') return `${renderRosterForm()}<div class="erp-card module-card-gap"><h3>Roster Shift</h3>${renderRosterTable()}</div>`;
    if (pageState.activeView === 'attendance') return `${renderAttendanceForm()}<div class="erp-card module-card-gap"><h3>Log Fingerprint</h3>${renderAttendanceTable()}</div>`;
    if (pageState.activeView === 'payroll') return `${renderPayrollForm()}<div class="erp-card module-card-gap"><h3>Payroll</h3>${renderPayrollTable()}</div>`;
    return `${renderEmployeeForm()}<div class="erp-card module-card-gap"><h3>Data Karyawan</h3>${renderEmployeeTable()}</div>`;
}

function renderHrContent() {
    const root = document.getElementById('hr-root');
    if (!root) return;

    if (pageState.loading) {
        root.innerHTML = '<div class="erp-card inventory-loading"><h3>Memuat HR dari GAS</h3><p class="erp-muted">Mengambil karyawan, role, roster, fingerprint, dan payroll...</p></div>';
        return;
    }

    if (pageState.error) {
        root.innerHTML = `<div class="erp-card inventory-error"><h3>HR tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-hr" type="button">Coba Lagi</button></div>`;
        return;
    }

    root.innerHTML = `${renderStats()}${renderActionBar()}${renderViewNav()}<div class="module-view-panel">${renderActiveView()}</div>`;
}

async function loadHr() {
    pageState.loading = true;
    pageState.error = '';
    renderHrContent();

    try {
        pageState.state = await getHrState();
    } catch (error) {
        pageState.error = error.message;
    } finally {
        pageState.loading = false;
        renderHrContent();
    }
}

async function handleSubmit(form) {
    const payload = serializeForm(form);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Menyimpan...';

    if (form.dataset.hrForm === 'employee') await createEmployee(payload);
    if (form.dataset.hrForm === 'roster') await createRoster(payload, pageState.state);
    if (form.dataset.hrForm === 'attendance') await createAttendance(payload, pageState.state);
    if (form.dataset.hrForm === 'payroll') await createPayroll(payload, pageState.state);

    await loadHr();
}

function bindHrEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('hr-root')) return;
        const viewButton = event.target.closest('[data-hr-view], [data-jump-view]');
        if (viewButton) {
            pageState.activeView = viewButton.dataset.hrView || viewButton.dataset.jumpView;
            renderHrContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget?.dataset.action === 'refresh-hr') await loadHr();
    });

    document.addEventListener('submit', async (event) => {
        if (!document.getElementById('hr-root')) return;
        if (!event.target.matches('[data-hr-form]')) return;

        event.preventDefault();
        try {
            await handleSubmit(event.target);
        } catch (error) {
            window.alert(error.message);
            await loadHr();
        }
    });
}

let eventsBound = false;

export function HrPage() {
    return '<div id="hr-root"></div>';
}

export function initHrPage() {
    if (!eventsBound) {
        bindHrEvents();
        eventsBound = true;
    }
    loadHr();
}
