const SIPAGI_CONFIG = {
  SPREADSHEET_ID: '1TYaUqNY92msVzjk3vo3PNi1XEYxvs5lYaBTLi5_Oq2U',
  SPREADSHEET_NAME: 'SIPAGI Database',
  SOFT_DELETE: true,
  DELETED_STATUS_VALUE: 'deleted'
};

const SIPAGI_SCHEMA = [
  table_('settings', 'Core', 'setting_id,key,value,description,updated_at,updated_by'),
  table_('users', 'Core', 'user_id,name,email,phone,role_id,sppg_id,school_id,supplier_id,status,created_at,updated_at'),
  table_('roles', 'Core', 'role_id,role_name,scope,status'),
  table_('role_permissions', 'Core', 'permission_id,role_id,module_id,can_create,can_read,can_update,can_delete,can_approve,can_export'),
  table_('audit_logs', 'Core', 'audit_id,entity,entity_id,action,before_json,after_json,user_id,created_at'),
  table_('notifications', 'Core', 'notification_id,user_id,type,title,message,status,created_at,read_at'),
  table_('sppg_units', 'Master', 'sppg_id,name,region,address,head_user_id,status'),
  table_('schools', 'School', 'school_id,sppg_id,name,npsn,address,pic_name,pic_phone,route_code,beneficiary_count,status'),
  table_('beneficiaries', 'School', 'beneficiary_id,school_id,name,grade,class_name,nutrition_status,allergy_notes,status'),
  table_('vendors', 'Purchasing', 'vendor_id,name,category,contact_name,phone,address,rating,payment_term,status'),
  table_('items', 'Inventory', 'item_id,sku,name,category,unit,min_stock,unit_cost,expiry_tracking,status,created_at,updated_at'),
  table_('stock_batches', 'Inventory', 'batch_id,sku,item_id,vendor_id,batch_code,qty_initial,qty_current,unit,inventory_date,received_date,expiry_date,location,status'),
  table_('stock_movements', 'Inventory', 'movement_id,sku,item_id,batch_id,type,qty,unit,movement_date,reason,reference_type,reference_id,created_by,created_at'),
  table_('stock_opnames', 'Inventory', 'opname_id,sku,item_id,batch_id,opname_date,system_qty,physical_qty,variance_qty,reason,approval_status,created_by,created_at'),
  table_('waste_records', 'Inventory', 'waste_id,sku,source,item_id,batch_id,qty,unit,inventory_date,reason,cost_estimate,photo_svg,photo_url,created_by,created_at'),
  table_('purchase_requests', 'Purchasing', 'request_id,sppg_id,request_date,needed_date,status,requested_by,approved_by'),
  table_('purchase_orders', 'Purchasing', 'po_id,vendor_id,po_date,delivery_date,status,subtotal,tax,total,approval_status,created_by'),
  table_('purchase_order_items', 'Purchasing', 'po_item_id,po_id,item_id,qty,unit,unit_price,total_price'),
  table_('receiving_records', 'Purchasing', 'receiving_id,po_id,item_id,received_qty,rejected_qty,qc_status,temperature,photo_url,received_by,received_at'),
  table_('supplier_invoices', 'Purchasing', 'invoice_id,vendor_id,po_id,invoice_number,invoice_date,amount,payment_status,file_url'),
  table_('accounts', 'Finance', 'account_id,account_code,account_name,type,status'),
  table_('finance_transactions', 'Finance', 'transaction_id,date,account_id,type,amount,description,reference_type,reference_id,created_by'),
  table_('assets', 'Finance', 'asset_id,name,category,purchase_date,purchase_value,condition,location,status'),
  table_('budgets', 'Finance', 'budget_id,period,module,budget_amount,actual_amount,variance_amount,status'),
  table_('payments', 'Finance', 'payment_id,invoice_id,payment_date,amount,method,status,proof_url'),
  table_('employees', 'HR', 'employee_id,name,role_id,phone,address,join_date,employment_status,base_salary,status'),
  table_('staff_rosters', 'HR', 'roster_id,employee_id,shift_date,shift_name,start_time,end_time,assignment,status'),
  table_('attendance_logs', 'HR', 'attendance_id,employee_id,date,check_in,check_out,source,status,notes'),
  table_('payroll_records', 'HR', 'payroll_id,employee_id,period,base_salary,allowance,deduction,net_salary,status'),
  table_('recipes', 'Operational', 'recipe_id,name,portion_size,target_age_group,nutrition_target_json,status,created_by'),
  table_('recipe_components', 'Operational', 'component_id,recipe_id,item_id,qty_per_portion,unit,notes'),
  table_('nutrition_checks', 'Operational', 'check_id,recipe_id,score,protein_g,carb_g,fat_g,fiber_g,warning_json,checked_by,checked_at'),
  table_('production_batches', 'Operational', 'batch_id,recipe_id,target_portion,actual_portion,start_time,end_time,temperature,qc_status,created_by'),
  table_('portion_batches', 'Operational', 'portion_id,production_batch_id,target_portion,actual_portion,variance,created_by,created_at'),
  table_('packing_batches', 'Operational', 'packing_id,portion_id,school_id,pack_count,label_code,status,created_at'),
  table_('dispatch_orders', 'Operational', 'dispatch_id,school_id,packing_id,driver_user_id,route_code,portion_qty,status,eta,delivered_at'),
  table_('delivery_receipts', 'School', 'receipt_id,dispatch_id,school_id,received_qty,received_by,received_at,photo_url,feedback_status,notes'),
  table_('school_feedback', 'School', 'feedback_id,school_id,dispatch_id,rating,category,message,created_by,created_at,status'),
  table_('incidents', 'School', 'incident_id,school_id,dispatch_id,type,severity,description,photo_url,status,created_at'),
  table_('cleaning_checklists', 'Operational', 'cleaning_id,area,shift,checklist_json,status,photo_url,checked_by,checked_at'),
  table_('bgn_reports', 'BGN', 'report_id,period,region,coverage_school,coverage_portion,compliance_score,incident_count,file_url,created_at'),
  table_('compliance_checks', 'BGN', 'compliance_id,sppg_id,check_date,category,score,finding,status,checked_by'),
  table_('regional_kpis', 'BGN', 'kpi_id,period,region,schools_total,portions_total,ontime_rate,qc_pass_rate,waste_value'),
  table_('supplier_users', 'Supplier', 'supplier_user_id,vendor_id,name,email,phone,status'),
  table_('supplier_delivery_schedules', 'Supplier', 'schedule_id,vendor_id,po_id,planned_at,actual_at,status,notes'),
  table_('ai_runs', 'AI', 'ai_run_id,use_case,input_ref_type,input_ref_id,model_name,status,result_json,created_by,created_at'),
  table_('ai_recommendations', 'AI', 'recommendation_id,ai_run_id,module,priority,title,recommendation,status,created_at'),
  table_('anomaly_flags', 'AI', 'flag_id,module,entity_type,entity_id,severity,reason,status,created_at'),
  table_('daily_reports', 'Reports', 'report_id,sppg_id,report_date,target_portion,delivered_portion,qc_summary,waste_summary,issue_summary,status,created_at'),
  table_('monthly_reports', 'Reports', 'report_id,sppg_id,period,summary_json,file_url,status,created_at'),
  table_('exports', 'Reports', 'export_id,report_type,format,file_url,requested_by,created_at,status')
];

const SIPAGI_ROLES = [
  ['kepala_sppg', 'Kepala SPPG', 'Full command center, approval, dashboard, audit, laporan', 'active'],
  ['ahli_gizi', 'Ahli Gizi / QC Produksi', 'Recipe, cek gizi, QC produksi, food safety, laporan gizi', 'active'],
  ['pengadaan', 'Akuntan / Pengadaan', 'Purchasing, vendor, inventory, finance, PO, receiving', 'active'],
  ['distribusi', 'Asisten Lapangan / Distribusi', 'Dispatch, route, delivery proof, school coordination', 'active'],
  ['produksi', 'Produksi', 'Persiapan bahan, cooking batch, production checklist', 'active'],
  ['pemorsian_packing', 'Pemorsian / Packing', 'Portion batch, packing, label, count variance', 'active'],
  ['pencuci_kebersihan', 'Pencuci / Kebersihan', 'Return ompreng, cleaning checklist, sanitation log', 'active'],
  ['sekolah', 'Sekolah', 'Delivery receipt, menu view, feedback, incident report', 'active'],
  ['bgn', 'BGN', 'Aggregated monitoring, compliance, regional reporting', 'active'],
  ['supplier', 'Supplier', 'PO view, delivery schedule, invoice status', 'active']
];

const SIPAGI_MODULES = ['dashboard', 'inventory', 'purchasing', 'finance', 'hr', 'operational', 'school', 'bgn', 'supplier', 'ai', 'reports'];

const SIPAGI_ROLE_ACCESS = {
  kepala_sppg: ['dashboard', 'inventory', 'purchasing', 'finance', 'hr', 'operational', 'school', 'bgn', 'supplier', 'ai', 'reports'],
  ahli_gizi: ['dashboard', 'operational', 'ai', 'reports'],
  pengadaan: ['dashboard', 'inventory', 'purchasing', 'finance', 'supplier', 'ai', 'reports'],
  distribusi: ['dashboard', 'operational', 'school', 'reports'],
  produksi: ['dashboard', 'inventory', 'operational'],
  pemorsian_packing: ['dashboard', 'operational'],
  pencuci_kebersihan: ['dashboard', 'operational'],
  sekolah: ['school'],
  bgn: ['dashboard', 'bgn', 'reports'],
  supplier: ['supplier', 'purchasing']
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SIPAGI')
    .addItem('Setup All Database Sheets', 'setupSipagiDatabase')
    .addItem('Migrasi Kolom Schema', 'migrateSipagiSchema')
    .addItem('Seed Base Roles', 'seedBaseRoles')
    .addItem('Seed Role Permissions', 'seedRolePermissions')
    .addToUi();
}

function setupSipagiDatabase() {
  const spreadsheet = getSpreadsheet_();

  SIPAGI_SCHEMA.forEach((table) => {
    const sheet = getOrCreateSheet_(spreadsheet, table.sheet);
    sheet.clear();
    sheet.getRange(1, 1, 1, table.columns.length).setValues([table.columns]);
    sheet.getRange('A1').setNote(`SIPAGI module: ${table.module}`);
    formatHeader_(sheet, table.columns.length, '#0056B3');
  });

  seedBaseRoles();
  seedRolePermissions();
  seedBaseSettings();
  createSchemaIndex_(spreadsheet);
  removeDefaultBlankSheets_(spreadsheet);

  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetCount: SIPAGI_SCHEMA.length + 1,
    tables: SIPAGI_SCHEMA.map((table) => table.sheet),
    actualSheets: listActualSheets_()
  };
}

function doGet(event) {
  const params = (event && event.parameter) || {};
  const action = String(params.action || 'health').toLowerCase();

  try {
    if (action === 'health') {
      return json_({
        ok: true,
        app: 'SIPAGI GAS API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'setup') {
      return json_({ ok: true, action, result: setupSipagiDatabase() });
    }

    if (action === 'migrate') {
      return json_({ ok: true, action, result: migrateSipagiSchema() });
    }

    if (action === 'schema') {
      return json_({
        ok: true,
        rows: SIPAGI_SCHEMA.map((table) => ({
          sheet: table.sheet,
          module: table.module,
          columns: table.columns
        }))
      });
    }

    if (action === 'tables') {
      return json_({ ok: true, rows: SIPAGI_SCHEMA.map((table) => table.sheet) });
    }

    if (action === 'sheets') {
      const spreadsheet = getSpreadsheet_();
      return json_({
        ok: true,
        spreadsheetId: spreadsheet.getId(),
        spreadsheetUrl: spreadsheet.getUrl(),
        rows: listActualSheets_()
      });
    }

    if (action === 'list') {
      validateSheetName_(params.sheet);
      return json_({
        ok: true,
        sheet: params.sheet,
        rows: readSheetObjects_(params.sheet, params)
      });
    }

    if (action === 'get') {
      validateSheetName_(params.sheet);
      return json_({
        ok: true,
        sheet: params.sheet,
        row: getObjectById_(params.sheet, params.id, params.idField)
      });
    }

    return json_({ ok: false, error: `Unknown GET action: ${action}` }, 400);
  } catch (error) {
    return json_({ ok: false, error: error.message }, 500);
  }
}

function doPost(event) {
  try {
    const payload = JSON.parse((event.postData && event.postData.contents) || '{}');
    const action = String(payload.action || '').toLowerCase();

    if (action === 'setup') {
      return json_({ ok: true, action, result: setupSipagiDatabase() });
    }

    if (action === 'migrate') {
      return json_({ ok: true, action, result: migrateSipagiSchema() });
    }

    if (action === 'create') {
      validateSheetName_(payload.sheet);
      const row = createObject_(payload.sheet, payload.row || {}, payload.userId);
      return json_({ ok: true, action, sheet: payload.sheet, row });
    }

    if (action === 'bulk_create') {
      validateSheetName_(payload.sheet);
      const rows = (payload.rows || []).map((row) => createObject_(payload.sheet, row, payload.userId, true));
      writeAuditLog_('bulk_create', payload.sheet, '', '', JSON.stringify(rows), payload.userId);
      return json_({ ok: true, action, sheet: payload.sheet, rows });
    }

    if (action === 'update') {
      validateSheetName_(payload.sheet);
      const row = updateObject_(payload.sheet, payload.id, payload.row || {}, payload.idField, payload.userId);
      return json_({ ok: true, action, sheet: payload.sheet, row });
    }

    if (action === 'upsert') {
      validateSheetName_(payload.sheet);
      const row = upsertObject_(payload.sheet, payload.id, payload.row || {}, payload.idField, payload.userId);
      return json_({ ok: true, action, sheet: payload.sheet, row });
    }

    if (action === 'delete') {
      validateSheetName_(payload.sheet);
      const row = deleteObject_(payload.sheet, payload.id, payload.idField, payload.userId);
      return json_({ ok: true, action, sheet: payload.sheet, row });
    }

    return json_({ ok: false, error: `Unknown POST action: ${action}` }, 400);
  } catch (error) {
    return json_({ ok: false, error: error.message }, 500);
  }
}

function seedBaseRoles() {
  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheet_(spreadsheet, 'roles');
  const headers = ['role_id', 'role_name', 'scope', 'status'];
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, SIPAGI_ROLES.length, headers.length).setValues(SIPAGI_ROLES);
  formatHeader_(sheet, headers.length, '#0056B3');
}

function migrateSipagiSchema() {
  const spreadsheet = getSpreadsheet_();
  const result = [];

  SIPAGI_SCHEMA.forEach((table) => {
    const sheet = getOrCreateSheet_(spreadsheet, table.sheet);
    const existingHeaders = getHeaders_(sheet);

    if (existingHeaders.length === 0) {
      sheet.getRange(1, 1, 1, table.columns.length).setValues([table.columns]);
      formatHeader_(sheet, table.columns.length, '#0056B3');
      result.push({ sheet: table.sheet, added: table.columns });
      return;
    }

    const added = [];
    table.columns.forEach((column) => {
      if (!existingHeaders.includes(column)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(column);
        added.push(column);
      }
    });

    if (added.length > 0) formatHeader_(sheet, sheet.getLastColumn(), '#0056B3');
    result.push({ sheet: table.sheet, added });
  });

  createSchemaIndex_(spreadsheet);
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    migratedSheets: result.filter((entry) => entry.added.length > 0)
  };
}


function seedRolePermissions() {
  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheet_(spreadsheet, 'role_permissions');
  const headers = ['permission_id', 'role_id', 'module_id', 'can_create', 'can_read', 'can_update', 'can_delete', 'can_approve', 'can_export'];
  const rows = [];

  Object.keys(SIPAGI_ROLE_ACCESS).forEach((roleId) => {
    SIPAGI_MODULES.forEach((moduleId) => {
      const allowed = SIPAGI_ROLE_ACCESS[roleId].includes(moduleId);
      rows.push([
        `PERM-${roleId}-${moduleId}`,
        roleId,
        moduleId,
        allowed && !['bgn', 'reports'].includes(moduleId),
        allowed,
        allowed && moduleId !== 'bgn',
        roleId === 'kepala_sppg',
        roleId === 'kepala_sppg' || ['ahli_gizi', 'pengadaan'].includes(roleId),
        allowed && ['kepala_sppg', 'pengadaan', 'bgn'].includes(roleId)
      ]);
    });
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  formatHeader_(sheet, headers.length, '#0056B3');
}

function seedBaseSettings() {
  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheet_(spreadsheet, 'settings');
  const headers = ['setting_id', 'key', 'value', 'description', 'updated_at', 'updated_by'];
  const now = new Date().toISOString();
  const rows = [
    ['SET-001', 'app_name', 'SIPAGI', 'Product name', now, 'system'],
    ['SET-002', 'database_version', '1.0.0', 'Spreadsheet schema version', now, 'system'],
    ['SET-003', 'default_sppg_id', 'SPPG-001', 'Default SPPG for MVP testing', now, 'system']
  ];

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  formatHeader_(sheet, headers.length, '#0056B3');
}

function createSchemaIndex_(spreadsheet) {
  const sheet = getOrCreateSheet_(spreadsheet, '_schema_index');
  const rows = SIPAGI_SCHEMA.map((table) => [
    table.sheet,
    table.module,
    table.columns.length,
    table.columns.join(', ')
  ]);

  sheet.clear();
  sheet.getRange(1, 1, 1, 4).setValues([['sheet', 'module', 'column_count', 'columns']]);
  sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  formatHeader_(sheet, 4, '#003D82');
}

function getSpreadsheet_() {
  if (SIPAGI_CONFIG.SPREADSHEET_ID) return SpreadsheetApp.openById(SIPAGI_CONFIG.SPREADSHEET_ID);

  const savedSpreadsheetId = PropertiesService.getScriptProperties().getProperty('SIPAGI_SPREADSHEET_ID');
  if (savedSpreadsheetId) {
    try {
      return SpreadsheetApp.openById(savedSpreadsheetId);
    } catch (error) {
      PropertiesService.getScriptProperties().deleteProperty('SIPAGI_SPREADSHEET_ID');
    }
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet) {
    PropertiesService.getScriptProperties().setProperty('SIPAGI_SPREADSHEET_ID', spreadsheet.getId());
    return spreadsheet;
  }

  const createdSpreadsheet = SpreadsheetApp.create(SIPAGI_CONFIG.SPREADSHEET_NAME);
  PropertiesService.getScriptProperties().setProperty('SIPAGI_SPREADSHEET_ID', createdSpreadsheet.getId());
  return createdSpreadsheet;
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function listActualSheets_() {
  return getSpreadsheet_().getSheets().map((sheet) => sheet.getName());
}

function removeDefaultBlankSheets_(spreadsheet) {
  const protectedSheets = SIPAGI_SCHEMA.map((table) => table.sheet).concat(['_schema_index']);
  spreadsheet.getSheets().forEach((sheet) => {
    const name = sheet.getName();
    const isDefaultBlank = ['Sheet1', 'Sheet 1', 'Lembar1', 'Lembar 1'].includes(name);
    const isEmpty = sheet.getLastRow() <= 1 && sheet.getLastColumn() <= 1 && !sheet.getRange(1, 1).getValue();
    if (isDefaultBlank && isEmpty && !protectedSheets.includes(name) && spreadsheet.getSheets().length > 1) {
      spreadsheet.deleteSheet(sheet);
    }
  });
}

function validateSheetName_(sheetName) {
  const valid = SIPAGI_SCHEMA.some((table) => table.sheet === sheetName) || sheetName === '_schema_index';
  if (!valid) throw new Error(`Invalid sheet: ${sheetName}`);
}

function readSheetObjects_(sheetName, options) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  let rows = values.slice(1).filter((row) => row.some((cell) => cell !== '')).map((row) => rowToObject_(headers, row));
  options = options || {};

  if (options.q) {
    const query = String(options.q).toLowerCase();
    rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }

  if (options.status) {
    rows = rows.filter((row) => String(row.status || '').toLowerCase() === String(options.status).toLowerCase());
  }

  if (options.limit) rows = rows.slice(0, Number(options.limit));
  return rows;
}

function createObject_(sheetName, rowObject, userId, skipAudit) {
  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheet_(spreadsheet, sheetName);
  ensureSheetHeader_(sheetName);
  const headers = getHeaders_(sheet);
  const normalized = normalizeObjectForSheet_(sheetName, rowObject, headers);
  const row = headers.map((header) => normalized[header] === undefined ? '' : normalized[header]);
  sheet.appendRow(row);
  if (!skipAudit) writeAuditLog_('create', sheetName, getObjectId_(sheetName, normalized), '', JSON.stringify(normalized), userId);
  return normalized;
}

function updateObject_(sheetName, id, patchObject, idField, userId) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);

  const headers = getHeaders_(sheet);
  const keyField = idField || getPrimaryKey_(sheetName);
  const keyIndex = headers.indexOf(keyField);
  if (keyIndex < 0) throw new Error(`Primary key not found: ${keyField}`);

  const values = sheet.getDataRange().getValues();
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][keyIndex]) === String(id)) {
      const before = rowToObject_(headers, values[rowIndex]);
      const after = { ...before, ...patchObject };
      headers.forEach((header, columnIndex) => {
        sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(after[header] === undefined ? '' : after[header]);
      });
      writeAuditLog_('update', sheetName, id, JSON.stringify(before), JSON.stringify(after), userId);
      return after;
    }
  }

  throw new Error(`Row not found: ${id}`);
}

function upsertObject_(sheetName, id, rowObject, idField, userId) {
  const keyField = idField || getPrimaryKey_(sheetName);
  const rowId = id || rowObject[keyField];
  if (!rowId) return createObject_(sheetName, rowObject, userId);

  try {
    return updateObject_(sheetName, rowId, rowObject, keyField, userId);
  } catch (error) {
    return createObject_(sheetName, rowObject, userId);
  }
}

function deleteObject_(sheetName, id, idField, userId) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);

  const headers = getHeaders_(sheet);
  const keyField = idField || getPrimaryKey_(sheetName);
  const keyIndex = headers.indexOf(keyField);
  if (keyIndex < 0) throw new Error(`Primary key not found: ${keyField}`);

  const values = sheet.getDataRange().getValues();
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][keyIndex]) === String(id)) {
      const before = rowToObject_(headers, values[rowIndex]);
      if (SIPAGI_CONFIG.SOFT_DELETE && headers.includes('status')) {
        const statusIndex = headers.indexOf('status');
        sheet.getRange(rowIndex + 1, statusIndex + 1).setValue(SIPAGI_CONFIG.DELETED_STATUS_VALUE);
        const after = { ...before, status: SIPAGI_CONFIG.DELETED_STATUS_VALUE };
        writeAuditLog_('delete', sheetName, id, JSON.stringify(before), JSON.stringify(after), userId);
        return after;
      }

      sheet.deleteRow(rowIndex + 1);
      writeAuditLog_('delete', sheetName, id, JSON.stringify(before), '', userId);
      return before;
    }
  }

  throw new Error(`Row not found: ${id}`);
}

function getObjectById_(sheetName, id, idField) {
  const rows = readSheetObjects_(sheetName);
  const keyField = idField || getPrimaryKey_(sheetName);
  return rows.find((row) => String(row[keyField]) === String(id)) || null;
}

function ensureSheetHeader_(sheetName) {
  const spreadsheet = getSpreadsheet_();
  const table = SIPAGI_SCHEMA.find((entry) => entry.sheet === sheetName);
  if (!table) throw new Error(`Invalid sheet: ${sheetName}`);

  const sheet = getOrCreateSheet_(spreadsheet, sheetName);
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, table.columns.length).setValues([table.columns]);
    formatHeader_(sheet, table.columns.length, '#0056B3');
  }
}

function getHeaders_(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function normalizeObjectForSheet_(sheetName, rowObject, headers) {
  const normalized = { ...rowObject };
  const primaryKey = getPrimaryKey_(sheetName);
  if (headers.includes(primaryKey) && !normalized[primaryKey]) normalized[primaryKey] = createRecordId_(sheetName);
  if (headers.includes('created_at') && !normalized.created_at) normalized.created_at = new Date().toISOString();
  if (headers.includes('updated_at') && !normalized.updated_at) normalized.updated_at = new Date().toISOString();
  if (headers.includes('status') && !normalized.status) normalized.status = 'active';
  return normalized;
}

function createRecordId_(sheetName) {
  const prefix = sheetName.split('_').map((part) => part.charAt(0)).join('').toUpperCase().slice(0, 5);
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const next = sheet ? Math.max(1, sheet.getLastRow()) : 1;
  return `${prefix}-${Utilities.formatString('%05d', next)}`;
}

function getPrimaryKey_(sheetName) {
  const table = SIPAGI_SCHEMA.find((entry) => entry.sheet === sheetName);
  if (!table) throw new Error(`Invalid sheet: ${sheetName}`);
  return table.columns[0];
}

function getObjectId_(sheetName, rowObject) {
  return rowObject[getPrimaryKey_(sheetName)] || '';
}

function rowToObject_(headers, row) {
  return headers.reduce((object, header, index) => {
    object[header] = row[index];
    return object;
  }, {});
}

function writeAuditLog_(action, entity, entityId, beforeJson, afterJson, userId) {
  if (entity === 'audit_logs') return;
  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheet_(spreadsheet, 'audit_logs');
    ensureSheetHeader_('audit_logs');
    sheet.appendRow([
      createRecordId_('audit_logs'),
      entity,
      entityId,
      action,
      beforeJson || '',
      afterJson || '',
      userId || 'system',
      new Date().toISOString()
    ]);
  } catch (error) {
    Logger.log(`Audit log failed: ${error.message}`);
  }
}

function formatHeader_(sheet, columnCount, color) {
  sheet.getRange(1, 1, 1, columnCount)
    .setFontWeight('bold')
    .setBackground(color)
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, columnCount);
}

function table_(sheet, module, columns) {
  return { sheet, module, columns: columns.split(',') };
}

function json_(payload, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify({ statusCode: statusCode || 200, ...payload }))
    .setMimeType(ContentService.MimeType.JSON);
}
