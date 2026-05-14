import {
    createAttendance,
    createCandidate,
    createEmployee,
    createLeaveRequest,
    createPayroll,
    createRoster,
    deleteEmployee,
    deleteRoster,
    getHrState,
    getHrSummaryFromState,
    seedHrDemoData
} from '../services/hrApi.js';
import { LoadingCard, showDetailModal } from '../../../shared/components/ModuleComponents.js';

const pageState = {
    activeView: 'overview',
    month: '2026-05',
    selectedShiftDate: new Date().toISOString().slice(0, 10),
    loading: true,
    seeding: false,
    error: '',
    state: {
        employees: [],
        roles: [],
        rosters: [],
        attendance: [],
        payroll: [],
        candidates: [],
        leaves: []
    }
};

const views = [
    { id: 'overview', label: 'Overview', description: 'Ringkasan recruitment, shift, cuti, absensi, dan payroll.' },
    { id: 'recruitment', label: 'Recruitment', description: 'Pipeline kandidat dari screening sampai diterima.' },
    { id: 'employees', label: 'Data Karyawan', description: 'Master staf, role, nomor kontak, status kerja, dan gaji pokok.' },
    { id: 'shift-calendar', label: 'Kalender Shift', description: 'Jadwal bulanan dengan kartu orang, shift, jam kerja, dan area tugas.' },
    { id: 'leave', label: 'Cuti', description: 'Pengajuan cuti, izin, sakit, dan status approval Kepala SPPG.' },
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
        ['Kandidat Aktif', summary.openCandidates, 'Recruitment dalam pipeline'],
        ['Karyawan Aktif', summary.activeEmployees, 'Staf aktif di SPPG'],
        ['Roster Hari Ini', summary.rosterToday, 'Shift yang terjadwal hari ini'],
        ['Cuti Menunggu', summary.pendingLeaves, 'Butuh approval Kepala SPPG'],
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
            <button class="erp-btn primary" data-action="refresh-hr" type="button">Refresh Data</button>
            <button class="erp-btn" data-action="seed-hr" type="button" ${pageState.seeding ? 'disabled' : ''}>${pageState.seeding ? 'Mengisi Data...' : 'Isi Dummy 1 Bulan ke Data'}</button>
            <button class="erp-btn" data-jump-view="recruitment" type="button">Recruitment</button>
            <button class="erp-btn" data-jump-view="employees" type="button">Tambah Karyawan</button>
            <button class="erp-btn" data-jump-view="shift-calendar" type="button">Kalender Shift</button>
            <button class="erp-btn" data-jump-view="leave" type="button">Cuti</button>
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

function renderRecruitmentForm() {
    return `
        <form class="erp-card" data-hr-form="candidate">
            <h3>Tambah Kandidat</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Nama Kandidat</label><input class="erp-input" name="name" required></div>
                <div class="erp-field"><label>Role Tujuan</label><select class="erp-select" name="role_id" required>${optionRows(pageState.state.roles, 'role_id', 'role_name', 'Setup role dahulu')}</select></div>
                <div class="erp-field"><label>No. HP</label><input class="erp-input" name="phone" required></div>
                <div class="erp-field"><label>Sumber</label><select class="erp-select" name="source"><option value="referensi">Referensi</option><option value="walk in">Walk In</option><option value="job portal">Job Portal</option><option value="internal">Internal</option></select></div>
                <div class="erp-field"><label>Tahap</label><select class="erp-select" name="stage"><option value="screening">Screening</option><option value="interview">Interview</option><option value="offering">Offering</option><option value="training">Training</option><option value="diterima">Diterima</option><option value="ditolak">Ditolak</option></select></div>
                <div class="erp-field"><label>Tanggal Lamar</label><input class="erp-input" name="applied_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
                <div class="erp-field"><label>Tanggal Interview</label><input class="erp-input" name="interview_date" type="date"></div>
                <div class="erp-field full"><label>Catatan</label><textarea class="erp-textarea" name="notes"></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Kandidat</button></div>
        </form>
    `;
}

function renderRosterForm() {
    return `
        <form class="erp-card" data-hr-form="roster">
            <h3>Buat Roster Shift</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Karyawan</label><select class="erp-select" name="employee_id" required>${employeeOptions()}</select></div>
                <div class="erp-field"><label>Tanggal Shift</label><input class="erp-input" name="shift_date" type="date" value="${esc(pageState.selectedShiftDate)}" required></div>
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

function renderLeaveForm() {
    return `
        <form class="erp-card" data-hr-form="leave">
            <h3>Pengajuan Cuti</h3>
            <div class="erp-form-grid">
                <div class="erp-field"><label>Karyawan</label><select class="erp-select" name="employee_id" required>${employeeOptions()}</select></div>
                <div class="erp-field"><label>Jenis</label><select class="erp-select" name="leave_type"><option value="tahunan">Cuti Tahunan</option><option value="sakit">Sakit</option><option value="izin">Izin</option><option value="darurat">Darurat</option></select></div>
                <div class="erp-field"><label>Mulai</label><input class="erp-input" name="start_date" type="date" required></div>
                <div class="erp-field"><label>Selesai</label><input class="erp-input" name="end_date" type="date" required></div>
                <div class="erp-field"><label>Status Approval</label><select class="erp-select" name="approval_status"><option value="menunggu">Menunggu</option><option value="disetujui">Disetujui</option><option value="ditolak">Ditolak</option></select></div>
                <div class="erp-field full"><label>Alasan</label><textarea class="erp-textarea" name="reason"></textarea></div>
            </div>
            <div class="erp-inline-actions" style="margin-top: 1rem;"><button class="erp-btn primary" type="submit">Simpan Cuti</button></div>
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
        <tr class="sipagi-clickable" data-hr-detail="employee" data-employee-id="${esc(row.employee_id)}"><td>${esc(row.name)}</td><td>${esc(roleName(row.role_id))}</td><td>${esc(row.phone)}</td><td>${esc(row.employment_status)}</td><td>Rp ${money(row.base_salary)}</td><td><span class="erp-status safe">${esc(row.status || 'aktif')}</span></td></tr>
    `).join('');
    return renderTable(['Nama', 'Role', 'HP', 'Status Kerja', 'Gaji Pokok', 'Status'], rows, 'Belum ada karyawan.');
}

function renderPeopleCards() {
    const shiftCounts = pageState.state.rosters.reduce((map, row) => {
        if (row.shift_date?.startsWith(pageState.month)) map[row.employee_id] = (map[row.employee_id] || 0) + 1;
        return map;
    }, {});
    const cards = pageState.state.employees.slice(0, 18).map((row) => `
        <article class="hr-person-card sipagi-clickable" data-hr-detail="employee" data-employee-id="${esc(row.employee_id)}">
            <div class="hr-person-avatar">${esc((row.name || '?').slice(0, 1).toUpperCase())}</div>
            <div><strong>${esc(row.name)}</strong><span>${esc(roleName(row.role_id))}</span></div>
            <small>${shiftCounts[row.employee_id] || 0} shift bulan ini</small>
            <small>${esc(row.phone || '-')}</small>
        </article>
    `).join('');
    return `<div class="hr-people-grid">${cards || '<p class="erp-muted">Belum ada karyawan.</p>'}</div>`;
}

function renderRecruitmentTable() {
    const rows = pageState.state.candidates.slice(0, 14).map((row) => `
        <tr><td>${esc(row.name)}</td><td>${esc(roleName(row.role_id))}</td><td>${esc(row.phone)}</td><td>${esc(row.source)}</td><td><span class="erp-status warning">${esc(row.stage)}</span></td><td>${esc(row.applied_date)}</td><td>${esc(row.interview_date || '-')}</td></tr>
    `).join('');
    return renderTable(['Nama', 'Role', 'HP', 'Sumber', 'Tahap', 'Lamar', 'Interview'], rows, 'Belum ada kandidat.');
}

function renderRosterTable() {
    const rows = pageState.state.rosters.slice(0, 12).map((row) => `
        <tr class="sipagi-clickable" data-hr-detail="roster" data-roster-id="${esc(row.roster_id)}"><td>${esc(row.shift_date)}</td><td>${esc(employeeName(row.employee_id))}</td><td>${esc(row.shift_name)}</td><td>${esc(row.start_time)} - ${esc(row.end_time)}</td><td>${esc(row.assignment)}</td><td><span class="erp-status warning">${esc(row.status || 'terjadwal')}</span></td></tr>
    `).join('');
    return renderTable(['Tanggal', 'Karyawan', 'Shift', 'Jam', 'Penugasan', 'Status'], rows, 'Belum ada roster.');
}

function renderShiftCalendar() {
    const [year, month] = pageState.month.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayCells = [];

    for (let blank = 0; blank < firstDay; blank += 1) dayCells.push('<div class="hr-calendar-day muted"></div>');

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${pageState.month}-${String(day).padStart(2, '0')}`;
        const shifts = pageState.state.rosters.filter((row) => row.shift_date === date);
        dayCells.push(`
            <button class="hr-calendar-day" data-shift-date="${esc(date)}" type="button">
                <div class="hr-calendar-date">${day}</div>
                ${shifts.slice(0, 4).map((row) => `
                    <span class="hr-shift-chip ${esc(row.shift_name || '')}" data-hr-detail="roster" data-roster-id="${esc(row.roster_id)}">
                        <strong>${esc(row.shift_name || '-')}</strong>
                        <span>${esc(employeeName(row.employee_id))}</span>
                        <small>${esc(row.start_time || '')}-${esc(row.end_time || '')} · ${esc(row.assignment || '-')}</small>
                    </span>
                `).join('') || '<span class="hr-empty-shift">Kosong</span>'}
            </button>
        `);
    }

    return `
        <div class="erp-card module-card-gap">
            <div class="hr-calendar-toolbar">
                <div><h3>Kalender Shift Bulanan</h3><p class="erp-muted">Roster 1 bulan dengan tampilan tanggalan dan kartu orang.</p></div>
                <input class="erp-input" data-hr-month type="month" value="${esc(pageState.month)}">
            </div>
            <div class="hr-calendar-weekdays"><span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span></div>
            <div class="hr-calendar-grid">${dayCells.join('')}</div>
        </div>
    `;
}

function renderLeaveTable() {
    const rows = pageState.state.leaves.slice(0, 14).map((row) => `
        <tr><td>${esc(employeeName(row.employee_id))}</td><td>${esc(row.leave_type)}</td><td>${esc(row.start_date)} - ${esc(row.end_date)}</td><td>${esc(row.days || 1)} hari</td><td>${esc(row.reason || '-')}</td><td><span class="erp-status ${row.approval_status === 'disetujui' ? 'safe' : 'warning'}">${esc(row.approval_status || 'menunggu')}</span></td></tr>
    `).join('');
    return renderTable(['Karyawan', 'Jenis', 'Tanggal', 'Durasi', 'Alasan', 'Status'], rows, 'Belum ada pengajuan cuti.');
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

function renderHrOverview() {
    const summary = getHrSummaryFromState(pageState.state);
    const pendingLeaves = pageState.state.leaves.filter((row) => ['pending', 'submitted', 'menunggu'].includes(String(row.approval_status || '').toLowerCase())).length;
    const openCandidates = pageState.state.candidates.filter((row) => !['ditolak', 'diterima', 'closed'].includes(String(row.status || '').toLowerCase())).length;
    const cards = [
        ['Recruitment aktif', openCandidates, 'Kandidat dalam pipeline'],
        ['Shift bulan ini', pageState.state.rosters.length, 'Roster tanggalan aktif'],
        ['Cuti menunggu', pendingLeaves, 'Butuh approval Kepala SPPG'],
        ['Fingerprint', pageState.state.attendance.length, 'Log absensi tercatat'],
        ['Payroll draft', pageState.state.payroll.filter((row) => String(row.status || '').toLowerCase() !== 'paid').length, `${summary.employees || pageState.state.employees.length} karyawan`]
    ];
    return `
        <section class="kt-card">
            <div class="kt-card-header flex-wrap gap-3">
                <div>
                    <h3 class="kt-card-title">Overview HR</h3>
                    <p class="kt-card-description">Perjalanan HR dari recruitment, data karyawan, shift tanggalan, cuti, absensi, sampai payroll.</p>
                </div>
                <a class="kt-btn kt-btn-sm kt-btn-primary" href="#hr/shift-calendar">Buka Kalender Shift</a>
            </div>
            <div class="kt-card-content grid gap-4">
                <div class="erp-grid">${cards.map(([label, value, note]) => `<article class="erp-card"><div class="erp-stat-label">${label}</div><div class="erp-stat-value">${value}</div><div class="erp-stat-note">${note}</div></article>`).join('')}</div>
                <div class="erp-card">${renderPeopleCards()}</div>
            </div>
        </section>
    `;
}

function renderActiveView() {
    if (pageState.activeView === 'overview') return renderHrOverview();
    if (pageState.activeView === 'shift-calendar') return `${renderRosterForm()}${renderShiftCalendar()}<div class="erp-card module-card-gap"><h3>Kartu Karyawan</h3>${renderPeopleCards()}</div><div class="erp-card module-card-gap"><h3>Daftar Roster</h3>${renderRosterTable()}</div>`;
    if (pageState.activeView === 'leave') return `${renderLeaveForm()}<div class="erp-card module-card-gap"><h3>Pengajuan Cuti</h3>${renderLeaveTable()}</div>`;
    if (pageState.activeView === 'attendance') return `${renderAttendanceForm()}<div class="erp-card module-card-gap"><h3>Log Fingerprint</h3>${renderAttendanceTable()}</div>`;
    if (pageState.activeView === 'payroll') return `${renderPayrollForm()}<div class="erp-card module-card-gap"><h3>Payroll</h3>${renderPayrollTable()}</div>`;
    if (pageState.activeView === 'employees') return `${renderEmployeeForm()}<div class="erp-card module-card-gap"><h3>Kartu Karyawan</h3>${renderPeopleCards()}</div><div class="erp-card module-card-gap"><h3>Data Karyawan</h3>${renderEmployeeTable()}</div>`;
    return `${renderRecruitmentForm()}<div class="erp-card module-card-gap"><h3>Pipeline Kandidat</h3>${renderRecruitmentTable()}</div>`;
}

function renderHrContent() {
    const root = document.getElementById('hr-root');
    if (!root) return;

    if (pageState.loading) {
        root.innerHTML = LoadingCard({ title: 'Memuat HR dari Data', text: 'Mengambil karyawan, role, roster, fingerprint, dan payroll...' });
        return;
    }

    if (pageState.error) {
        root.innerHTML = `<div class="erp-card inventory-error"><h3>HR tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-hr" type="button">Coba Lagi</button></div>`;
        return;
    }

    root.innerHTML = `${renderStats()}<div class="module-view-panel">${renderActiveView()}</div>`;
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

    if (form.dataset.hrForm === 'candidate') await createCandidate(payload);
    if (form.dataset.hrForm === 'employee') await createEmployee(payload);
    if (form.dataset.hrForm === 'roster') await createRoster(payload, pageState.state);
    if (form.dataset.hrForm === 'leave') await createLeaveRequest(payload, pageState.state);
    if (form.dataset.hrForm === 'attendance') await createAttendance(payload, pageState.state);
    if (form.dataset.hrForm === 'payroll') await createPayroll(payload, pageState.state);

    await loadHr();
}

function openEmployeeDetail(employeeId) {
    const row = pageState.state.employees.find((item) => item.employee_id === employeeId);
    if (!row) return;
    const shiftCount = pageState.state.rosters.filter((item) => item.employee_id === employeeId && item.shift_date?.startsWith(pageState.month)).length;
    showDetailModal({
        title: row.name,
        subtitle: roleName(row.role_id),
        rows: [
            ['ID Karyawan', esc(row.employee_id)],
            ['No. HP', esc(row.phone)],
            ['Status Kerja', esc(row.employment_status)],
            ['Gaji Pokok', `Rp ${money(row.base_salary)}`],
            ['Tanggal Masuk', esc(row.join_date)],
            ['Shift Bulan Ini', shiftCount],
            ['Alamat', esc(row.address)]
        ],
        actions: [{ label: 'Hapus Karyawan', className: 'danger', attr: `data-hr-delete-employee="${esc(row.employee_id)}"` }]
    });
}

function openRosterDetail(rosterId) {
    const row = pageState.state.rosters.find((item) => item.roster_id === rosterId);
    if (!row) return;
    showDetailModal({
        title: `Shift ${row.shift_name || '-'}`,
        subtitle: `${row.shift_date || '-'} · ${employeeName(row.employee_id)}`,
        rows: [
            ['ID Roster', esc(row.roster_id)],
            ['Karyawan', esc(employeeName(row.employee_id))],
            ['Tanggal', esc(row.shift_date)],
            ['Jam', `${esc(row.start_time)} - ${esc(row.end_time)}`],
            ['Penugasan', esc(row.assignment)],
            ['Status', esc(row.status || 'terjadwal')]
        ],
        actions: [{ label: 'Hapus Shift', className: 'danger', attr: `data-hr-delete-roster="${esc(row.roster_id)}"` }]
    });
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

        const detailTarget = event.target.closest('[data-hr-detail]');
        if (detailTarget?.dataset.hrDetail === 'employee') {
            openEmployeeDetail(detailTarget.dataset.employeeId);
            return;
        }
        if (detailTarget?.dataset.hrDetail === 'roster') {
            openRosterDetail(detailTarget.dataset.rosterId);
            return;
        }

        const shiftDay = event.target.closest('[data-shift-date]');
        if (shiftDay) {
            pageState.selectedShiftDate = shiftDay.dataset.shiftDate;
            renderHrContent();
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget?.dataset.action === 'refresh-hr') await loadHr();
        if (actionTarget?.dataset.action === 'seed-hr') {
            pageState.seeding = true;
            renderHrContent();
            try {
                await seedHrDemoData(pageState.month);
            } catch (error) {
                window.alert(error.message);
            } finally {
                pageState.seeding = false;
                await loadHr();
            }
        }

        const deleteRosterTarget = event.target.closest('[data-hr-delete-roster]');
        if (deleteRosterTarget && window.confirm('Hapus shift ini?')) {
            await deleteRoster(deleteRosterTarget.dataset.hrDeleteRoster);
            document.querySelector('.sipagi-modal-backdrop')?.remove();
            await loadHr();
        }

        const deleteEmployeeTarget = event.target.closest('[data-hr-delete-employee]');
        if (deleteEmployeeTarget && window.confirm('Hapus karyawan ini?')) {
            await deleteEmployee(deleteEmployeeTarget.dataset.hrDeleteEmployee);
            document.querySelector('.sipagi-modal-backdrop')?.remove();
            await loadHr();
        }
    });

    document.addEventListener('change', (event) => {
        if (!document.getElementById('hr-root')) return;
        if (!event.target.matches('[data-hr-month]')) return;
        pageState.month = event.target.value || pageState.month;
        renderHrContent();
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

export function initHrPage(initialView = 'overview') {
    pageState.activeView = views.some((view) => view.id === initialView) ? initialView : 'overview';
    if (!eventsBound) {
        bindHrEvents();
        eventsBound = true;
    }
    loadHr();
}
