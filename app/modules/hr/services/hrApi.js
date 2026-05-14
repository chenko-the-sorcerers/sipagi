import {
    createSheetRow,
    deleteSheetRow,
    getSheetRows,
    upsertSheetRow,
    updateSheetRow
} from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'kepala_sppg';

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
    if (!value) return '';
    const text = String(value);
    if (!text.includes('T')) return text.slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(text));
}

function normalizeTime(value) {
    if (!value) return '';
    const text = String(value);
    if (!text.includes('T')) return text.slice(0, 5);
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date(text));
}

function activeRows(rows) {
    return rows.filter((row) => row.status !== 'deleted');
}

function findById(rows, idField, id) {
    return rows.find((row) => row[idField] === id);
}

function parseSettingsRows(rows, prefix) {
    return rows
        .filter((row) => String(row.key || '').startsWith(prefix))
        .map((row) => {
            try {
                return JSON.parse(row.value || '{}');
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

async function safeGetRows(sheet) {
    try {
        return await getSheetRows(sheet);
    } catch (error) {
        console.warn(`Sheet ${sheet} belum tersedia`, error);
        return { rows: [] };
    }
}

export async function getHrState() {
    const [employees, roles, rosters, attendance, payroll, candidates, leaves, settings] = await Promise.all([
        safeGetRows('employees'),
        safeGetRows('roles'),
        safeGetRows('staff_rosters'),
        safeGetRows('attendance_logs'),
        safeGetRows('payroll_records'),
        safeGetRows('recruitment_candidates'),
        safeGetRows('leave_requests'),
        safeGetRows('settings')
    ]);
    const candidateRows = candidates.rows?.length ? candidates.rows : parseSettingsRows(settings.rows || [], 'hr_candidate_');
    const leaveRows = leaves.rows?.length ? leaves.rows : parseSettingsRows(settings.rows || [], 'hr_leave_');

    return {
        employees: activeRows(employees.rows || []),
        roles: activeRows(roles.rows || []),
        rosters: (rosters.rows || []).map((row) => ({
            ...row,
            shift_date: normalizeDate(row.shift_date),
            start_time: normalizeTime(row.start_time),
            end_time: normalizeTime(row.end_time)
        })),
        attendance: (attendance.rows || []).map((row) => ({
            ...row,
            date: normalizeDate(row.date),
            check_in: normalizeTime(row.check_in),
            check_out: normalizeTime(row.check_out)
        })),
        payroll: payroll.rows || [],
        candidates: activeRows(candidateRows || []),
        leaves: (leaveRows || []).map((row) => ({
            ...row,
            start_date: normalizeDate(row.start_date),
            end_date: normalizeDate(row.end_date)
        }))
    };
}

export function getHrSummaryFromState(state) {
    const today = todayDate();
    const activeEmployees = state.employees.filter((row) => row.status !== 'nonaktif').length;
    const rosterToday = state.rosters.filter((row) => row.shift_date === today).length;
    const attendanceToday = state.attendance.filter((row) => row.date === today).length;
    const payrollTotal = state.payroll.reduce((sum, row) => sum + numberValue(row.net_salary), 0);
    const lateCount = state.attendance.filter((row) => row.status === 'terlambat').length;
    const openCandidates = state.candidates.filter((row) => !['ditolak', 'diterima'].includes(row.stage)).length;
    const pendingLeaves = state.leaves.filter((row) => row.approval_status === 'menunggu').length;

    return {
        activeEmployees,
        rosterToday,
        attendanceToday,
        payrollTotal,
        lateCount,
        openCandidates,
        pendingLeaves
    };
}

export async function createCandidate(payload) {
    if (!payload.name) throw new Error('Nama kandidat wajib diisi');
    if (!payload.role_id) throw new Error('Role tujuan wajib dipilih');

    const row = {
        candidate_id: `cand_${Date.now()}`,
        name: payload.name,
        role_id: payload.role_id,
        phone: payload.phone,
        source: payload.source || 'referensi',
        stage: payload.stage || 'screening',
        applied_date: payload.applied_date || todayDate(),
        interview_date: payload.interview_date || '',
        notes: payload.notes || '',
        status: payload.status || 'aktif'
    };

    try {
        return await createSheetRow('recruitment_candidates', row, USER_ID);
    } catch {
        return upsertSheetRow('settings', row.candidate_id, {
            setting_id: row.candidate_id,
            key: `hr_candidate_${row.candidate_id}`,
            value: JSON.stringify(row),
            description: 'Fallback kandidat HR sampai sheet recruitment_candidates tersedia',
            updated_at: new Date().toISOString(),
            updated_by: USER_ID
        }, 'setting_id', USER_ID);
    }
}

export async function createEmployee(payload) {
    const salary = numberValue(payload.base_salary);
    if (!payload.name) throw new Error('Nama karyawan wajib diisi');
    if (!payload.role_id) throw new Error('Role wajib dipilih');

    return createSheetRow('employees', {
        name: payload.name,
        role_id: payload.role_id,
        phone: payload.phone,
        address: payload.address,
        join_date: payload.join_date || todayDate(),
        employment_status: payload.employment_status || 'tetap',
        base_salary: salary,
        status: payload.status || 'aktif'
    }, USER_ID);
}

export async function createRoster(payload, state) {
    const employee = findById(state.employees, 'employee_id', payload.employee_id);
    if (!employee) throw new Error('Karyawan wajib dipilih');
    if (!payload.shift_date) throw new Error('Tanggal shift wajib diisi');

    return createSheetRow('staff_rosters', {
        employee_id: payload.employee_id,
        shift_date: payload.shift_date,
        shift_name: payload.shift_name,
        start_time: payload.start_time,
        end_time: payload.end_time,
        assignment: payload.assignment,
        status: payload.status || 'terjadwal'
    }, USER_ID);
}

export function deleteRoster(rosterId) {
    if (!rosterId) throw new Error('Roster tidak ditemukan');
    return deleteSheetRow('staff_rosters', rosterId, 'roster_id', USER_ID);
}

export function deleteEmployee(employeeId) {
    if (!employeeId) throw new Error('Karyawan tidak ditemukan');
    return updateSheetRow('employees', employeeId, { status: 'deleted' }, 'employee_id', USER_ID);
}

export async function createAttendance(payload, state) {
    const employee = findById(state.employees, 'employee_id', payload.employee_id);
    if (!employee) throw new Error('Karyawan wajib dipilih');
    if (!payload.date) throw new Error('Tanggal absensi wajib diisi');

    return createSheetRow('attendance_logs', {
        employee_id: payload.employee_id,
        date: payload.date,
        check_in: payload.check_in,
        check_out: payload.check_out,
        source: payload.source || 'manual',
        status: payload.status || 'hadir',
        notes: payload.notes || ''
    }, USER_ID);
}

export async function createPayroll(payload, state) {
    const employee = findById(state.employees, 'employee_id', payload.employee_id);
    if (!employee) throw new Error('Karyawan wajib dipilih');

    const baseSalary = numberValue(payload.base_salary || employee.base_salary);
    const allowance = numberValue(payload.allowance);
    const deduction = numberValue(payload.deduction);

    return createSheetRow('payroll_records', {
        employee_id: payload.employee_id,
        period: payload.period,
        base_salary: baseSalary,
        allowance,
        deduction,
        net_salary: baseSalary + allowance - deduction,
        status: payload.status || 'draft'
    }, USER_ID);
}

export async function createLeaveRequest(payload, state) {
    const employee = findById(state.employees, 'employee_id', payload.employee_id);
    if (!employee) throw new Error('Karyawan wajib dipilih');
    if (!payload.start_date || !payload.end_date) throw new Error('Tanggal cuti wajib diisi');

    const start = new Date(payload.start_date);
    const end = new Date(payload.end_date);
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);

    const row = {
        leave_id: `leave_${Date.now()}`,
        employee_id: payload.employee_id,
        leave_type: payload.leave_type || 'tahunan',
        start_date: payload.start_date,
        end_date: payload.end_date,
        days,
        reason: payload.reason || '',
        approval_status: payload.approval_status || 'menunggu',
        approved_by: payload.approved_by || '',
        created_at: new Date().toISOString()
    };

    try {
        return await createSheetRow('leave_requests', row, USER_ID);
    } catch {
        return upsertSheetRow('settings', row.leave_id, {
            setting_id: row.leave_id,
            key: `hr_leave_${row.leave_id}`,
            value: JSON.stringify(row),
            description: 'Fallback cuti HR sampai sheet leave_requests tersedia',
            updated_at: new Date().toISOString(),
            updated_by: USER_ID
        }, 'setting_id', USER_ID);
    }
}

const demoRoles = [
    ['kepala_sppg', 'Kepala SPPG', 'Command center, approval, audit, laporan'],
    ['ahli_gizi', 'Ahli Gizi / QC Produksi', 'Resep, cek gizi, QC produksi'],
    ['pengadaan', 'Akuntan / Pengadaan', 'Purchasing, inventory, finance'],
    ['distribusi', 'Asisten Lapangan / Distribusi', 'Dispatch, route, school coordination'],
    ['produksi', 'Produksi', 'Persiapan dan pengolahan bahan makanan'],
    ['pemorsian_packing', 'Pemorsian / Packing', 'Pemorsian, packing, label'],
    ['pencuci_kebersihan', 'Pencuci / Kebersihan', 'Cuci alat makan dan sanitasi'],
    ['sekolah', 'Sekolah', 'Konfirmasi penerimaan dan feedback'],
    ['bgn', 'BGN', 'Monitoring agregat dan compliance'],
    ['supplier', 'Supplier', 'PO, pengiriman, invoice']
];

const demoEmployees = [
    ['emp_kepala_001', 'Raka Pratama', 'kepala_sppg', '081200000001', 6500000],
    ['emp_gizi_001', 'Dewi Anggraini', 'ahli_gizi', '081200000002', 5200000],
    ['emp_pengadaan_001', 'Bima Santoso', 'pengadaan', '081200000003', 5000000],
    ['emp_distribusi_001', 'Fajar Maulana', 'distribusi', '081200000004', 4200000],
    ['emp_produksi_001', 'Sari Wulandari', 'produksi', '081200000005', 3900000],
    ['emp_produksi_002', 'Yusuf Hakim', 'produksi', '081200000006', 3800000],
    ['emp_packing_001', 'Nadia Putri', 'pemorsian_packing', '081200000007', 3600000],
    ['emp_packing_002', 'Andi Permana', 'pemorsian_packing', '081200000008', 3600000],
    ['emp_clean_001', 'Maya Lestari', 'pencuci_kebersihan', '081200000009', 3400000],
    ['emp_clean_002', 'Tono Wijaya', 'pencuci_kebersihan', '081200000010', 3400000],
    ['emp_school_001', 'Siti Aminah', 'sekolah', '081200000011', 0],
    ['emp_supplier_001', 'Hendra Supplier', 'supplier', '081200000012', 0]
];

const demoShifts = [
    ['pagi', '05:00', '13:00'],
    ['siang', '13:00', '21:00'],
    ['malam', '21:00', '05:00']
];

function upsertHrSettingsRecord(prefix, id, row, description) {
    return upsertSheetRow('settings', id, {
        setting_id: id,
        key: `${prefix}${id}`,
        value: JSON.stringify(row),
        description,
        updated_at: new Date().toISOString(),
        updated_by: USER_ID
    }, 'setting_id', USER_ID);
}

export async function seedHrDemoData(period = '2026-05') {
    const [year, month] = period.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const rosterEmployees = demoEmployees.filter((employee) => !['sekolah', 'supplier', 'bgn'].includes(employee[2]));
    const writes = [];

    demoRoles.forEach(([role_id, role_name, scope]) => {
        writes.push(() => upsertSheetRow('roles', role_id, { role_id, role_name, scope, status: 'aktif' }, 'role_id', USER_ID));
    });

    demoEmployees.forEach(([employee_id, name, role_id, phone, base_salary], index) => {
        writes.push(() => upsertSheetRow('employees', employee_id, {
            employee_id,
            name,
            role_id,
            phone,
            address: `Area SPPG ${index + 1}`,
            join_date: `2026-0${(index % 4) + 1}-0${(index % 8) + 1}`.slice(0, 10),
            employment_status: base_salary ? 'tetap' : 'mitra',
            base_salary,
            status: 'aktif'
        }, 'employee_id', USER_ID));
    });

    for (let day = 1; day <= daysInMonth; day += 1) {
        const shiftDate = `${period}-${String(day).padStart(2, '0')}`;
        demoShifts.forEach(([shift_name, start_time, end_time], shiftIndex) => {
            const employee = rosterEmployees[(day + shiftIndex) % rosterEmployees.length];
            const assignment = ['persiapan', 'produksi', 'pemorsian', 'packing', 'distribusi', 'kebersihan'][(day + shiftIndex) % 6];
            const roster_id = `roster_${period.replace('-', '')}_${String(day).padStart(2, '0')}_${shift_name}`;
            writes.push(() => upsertSheetRow('staff_rosters', roster_id, {
                roster_id,
                employee_id: employee[0],
                shift_date: shiftDate,
                shift_name,
                start_time,
                end_time,
                assignment,
                status: 'terjadwal'
            }, 'roster_id', USER_ID));
        });
    }

    ['ahli_gizi', 'produksi', 'pemorsian_packing', 'distribusi', 'pencuci_kebersihan'].forEach((role_id, index) => {
        const candidate_id = `cand_${period.replace('-', '')}_${index + 1}`;
        const row = {
            candidate_id,
            name: ['Laras', 'Rizky', 'Mega', 'Danu', 'Aulia'][index],
            role_id,
            phone: `08129900000${index + 1}`,
            source: index % 2 ? 'walk in' : 'referensi',
            stage: ['screening', 'interview', 'offering', 'training', 'screening'][index],
            applied_date: `${period}-0${index + 1}`,
            interview_date: `${period}-1${index + 1}`,
            notes: 'Dummy HR MVP',
            status: 'aktif'
        };
        writes.push(() => upsertHrSettingsRecord('hr_candidate_', candidate_id, row, 'Fallback kandidat HR MVP'));
    });

    demoEmployees.slice(0, 10).forEach(([employee_id,, , , base_salary], index) => {
        const payroll_id = `payroll_${period.replace('-', '')}_${employee_id}`;
        writes.push(() => upsertSheetRow('payroll_records', payroll_id, {
            payroll_id,
            employee_id,
            period,
            base_salary,
            allowance: 250000,
            deduction: index % 3 === 0 ? 50000 : 0,
            net_salary: numberValue(base_salary) + 250000 - (index % 3 === 0 ? 50000 : 0),
            status: 'draft'
        }, 'payroll_id', USER_ID));
    });

    demoEmployees.slice(1, 5).forEach(([employee_id], index) => {
        const leave_id = `leave_${period.replace('-', '')}_${index + 1}`;
        const row = {
            leave_id,
            employee_id,
            leave_type: ['tahunan', 'sakit', 'izin', 'tahunan'][index],
            start_date: `${period}-${String(10 + index).padStart(2, '0')}`,
            end_date: `${period}-${String(10 + index).padStart(2, '0')}`,
            days: 1,
            reason: 'Dummy cuti HR MVP',
            approval_status: index === 0 ? 'disetujui' : 'menunggu',
            approved_by: index === 0 ? 'kepala_sppg' : '',
            created_at: new Date().toISOString()
        };
        writes.push(() => upsertHrSettingsRecord('hr_leave_', leave_id, row, 'Fallback cuti HR MVP'));
    });

    for (const write of writes) {
        await write();
    }
    return { roles: demoRoles.length, employees: demoEmployees.length, rosters: daysInMonth * demoShifts.length, candidates: 5, leaves: 4, payroll: 10 };
}
