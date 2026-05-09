import {
    createSheetRow,
    getSheetRows
} from '../../../shared/services/googleSheetsApi.js';

const USER_ID = 'kepala_sppg';

function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function activeRows(rows) {
    return rows.filter((row) => row.status !== 'deleted');
}

function findById(rows, idField, id) {
    return rows.find((row) => row[idField] === id);
}

export async function getHrState() {
    const [employees, roles, rosters, attendance, payroll] = await Promise.all([
        getSheetRows('employees'),
        getSheetRows('roles'),
        getSheetRows('staff_rosters'),
        getSheetRows('attendance_logs'),
        getSheetRows('payroll_records')
    ]);

    return {
        employees: activeRows(employees.rows || []),
        roles: activeRows(roles.rows || []),
        rosters: rosters.rows || [],
        attendance: attendance.rows || [],
        payroll: payroll.rows || []
    };
}

export function getHrSummaryFromState(state) {
    const today = todayDate();
    const activeEmployees = state.employees.filter((row) => row.status !== 'nonaktif').length;
    const rosterToday = state.rosters.filter((row) => row.shift_date === today).length;
    const attendanceToday = state.attendance.filter((row) => row.date === today).length;
    const payrollTotal = state.payroll.reduce((sum, row) => sum + numberValue(row.net_salary), 0);
    const lateCount = state.attendance.filter((row) => row.status === 'terlambat').length;

    return {
        activeEmployees,
        rosterToday,
        attendanceToday,
        payrollTotal,
        lateCount
    };
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
