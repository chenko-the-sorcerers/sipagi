import fs from 'node:fs/promises';
import { getSheetRows, upsertSheetRow } from '../app/shared/services/googleSheetsApi.js';

const USER_ID = 'qa_system';

const idFields = {
    settings: 'setting_id',
    users: 'user_id',
    audit_logs: 'audit_id',
    notifications: 'notification_id',
    sppg_units: 'sppg_id',
    schools: 'school_id',
    beneficiaries: 'beneficiary_id',
    vendors: 'vendor_id',
    items: 'item_id',
    stock_batches: 'batch_id',
    stock_movements: 'movement_id',
    stock_opnames: 'opname_id',
    waste_records: 'waste_id',
    purchase_requests: 'request_id',
    purchase_orders: 'po_id',
    purchase_order_items: 'po_item_id',
    receiving_records: 'receiving_id',
    supplier_invoices: 'invoice_id',
    accounts: 'account_id',
    finance_transactions: 'transaction_id',
    assets: 'asset_id',
    budgets: 'budget_id',
    payments: 'payment_id',
    employees: 'employee_id',
    staff_rosters: 'roster_id',
    attendance_logs: 'attendance_id',
    payroll_records: 'payroll_id',
    recipes: 'recipe_id',
    recipe_components: 'component_id',
    nutrition_checks: 'check_id',
    production_batches: 'batch_id',
    portion_batches: 'portion_id',
    packing_batches: 'packing_id',
    dispatch_orders: 'dispatch_id',
    delivery_receipts: 'receipt_id',
    school_feedback: 'feedback_id',
    incidents: 'incident_id',
    cleaning_checklists: 'cleaning_id',
    bgn_reports: 'report_id',
    compliance_checks: 'compliance_id',
    regional_kpis: 'kpi_id',
    supplier_users: 'supplier_user_id',
    supplier_delivery_schedules: 'schedule_id',
    ai_runs: 'ai_run_id',
    ai_recommendations: 'recommendation_id',
    anomaly_flags: 'flag_id',
    daily_reports: 'report_id',
    monthly_reports: 'report_id',
    exports: 'export_id'
};

function setting(id, key, value, description) {
    return {
        sheet: 'settings',
        id,
        row: {
            setting_id: id,
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            description,
            updated_at: '2026-05-11T09:00:00+07:00',
            updated_by: USER_ID
        }
    };
}

const rows = [
    setting('setting_sppg_identity_2026', 'sppg_identity', {
        nama_sppg: 'SPPG Nakala Banguntapan',
        alamat: 'Jl. Wonosari KM 6, Banguntapan, Bantul, DI Yogyakarta',
        kepala_sppg: 'Raka Pratama',
        akuntan: 'Bima Santoso',
        tahun_anggaran: 2026,
        periode: 'Mei 2026',
        tanggal_pelaporan: '2026-05-31',
        tempat_pelaporan: 'Bantul'
    }, 'Data setup SPPG untuk QA laporan dan dokumen keuangan'),
    setting('setting_opening_balance_202605', 'saldo_awal_buku_202605', {
        bank_bri: 125000000,
        kas_tunai: 7500000,
        periode: '2026-05'
    }, 'Saldo awal buku kas Mei 2026'),
    setting('setting_finance_approval_lpu_202605', 'approval_laporan_penggunaan_uang_202605', {
        report_id: 'monthly_202605_lpu',
        maker: 'user_akuntan',
        reviewer: 'user_kepala_sppg',
        status: 'approved',
        locked: false,
        business_gap: 'Approved belum otomatis final/locked'
    }, 'Data edge case QA approval: approved belum terkunci'),
    setting('finance_asset_maintenance_asset_maint_20260511_oven', 'finance_asset_maintenance_asset_maint_20260511_oven', {
        maintenance_id: 'asset_maint_20260511_oven',
        asset_id: 'asset_oven_001',
        maintenance_date: '2026-05-11',
        type: 'kalibrasi',
        vendor: 'CV Teknik Dapur Jogja',
        cost: 450000,
        finding: 'Suhu oven selisih 4 derajat, sudah dikalibrasi ulang',
        next_schedule: '2026-08-11',
        status: 'selesai',
        created_by: USER_ID,
        created_at: '2026-05-11T10:10:00+07:00'
    }, 'Fallback maintenance aset untuk halaman Finance'),

    { sheet: 'sppg_units', id: 'sppg_nakala', row: { sppg_id: 'sppg_nakala', name: 'SPPG Nakala Banguntapan', region: 'Bantul Timur', address: 'Jl. Wonosari KM 6, Banguntapan, Bantul', head_user_id: 'user_kepala_sppg', status: 'aktif' } },
    { sheet: 'users', id: 'user_kepala_sppg', row: { user_id: 'user_kepala_sppg', name: 'Raka Pratama', email: 'kepala@sppg-nakala.id', phone: '081200000001', role_id: 'kepala_sppg', sppg_id: 'sppg_nakala', school_id: '', supplier_id: '', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },
    { sheet: 'users', id: 'user_akuntan', row: { user_id: 'user_akuntan', name: 'Bima Santoso', email: 'akuntan@sppg-nakala.id', phone: '081200000003', role_id: 'pengadaan', sppg_id: 'sppg_nakala', school_id: '', supplier_id: '', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },
    { sheet: 'users', id: 'user_gizi', row: { user_id: 'user_gizi', name: 'Dewi Anggraini', email: 'gizi@sppg-nakala.id', phone: '081200000002', role_id: 'ahli_gizi', sppg_id: 'sppg_nakala', school_id: '', supplier_id: '', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },
    { sheet: 'users', id: 'user_distribusi', row: { user_id: 'user_distribusi', name: 'Fajar Maulana', email: 'distribusi@sppg-nakala.id', phone: '081200000004', role_id: 'distribusi', sppg_id: 'sppg_nakala', school_id: '', supplier_id: '', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },

    { sheet: 'schools', id: 'school_sdn_karangbendo', row: { school_id: 'school_sdn_karangbendo', sppg_id: 'sppg_nakala', name: 'SDN Karangbendo', npsn: '20400311', address: 'Karangbendo, Banguntapan', pic_name: 'Siti Aminah', pic_phone: '081288810001', route_code: 'R-A1', beneficiary_count: 420, status: 'aktif' } },
    { sheet: 'schools', id: 'school_mi_miftahul', row: { school_id: 'school_mi_miftahul', sppg_id: 'sppg_nakala', name: 'MI Miftahul Huda', npsn: '60714021', address: 'Potorono, Banguntapan', pic_name: 'Nur Hayati', pic_phone: '081288810002', route_code: 'R-A2', beneficiary_count: 310, status: 'aktif' } },
    { sheet: 'schools', id: 'school_smp_banguntapan', row: { school_id: 'school_smp_banguntapan', sppg_id: 'sppg_nakala', name: 'SMP 3 Banguntapan', npsn: '20400418', address: 'Jambidan, Banguntapan', pic_name: 'Agus Widodo', pic_phone: '081288810003', route_code: 'R-B1', beneficiary_count: 510, status: 'aktif' } },
    { sheet: 'beneficiaries', id: 'ben_sdn_001', row: { beneficiary_id: 'ben_sdn_001', school_id: 'school_sdn_karangbendo', name: 'Alya Putri', grade: '4', class_name: '4A', nutrition_status: 'normal', allergy_notes: 'tidak ada', status: 'aktif' } },
    { sheet: 'beneficiaries', id: 'ben_sdn_002', row: { beneficiary_id: 'ben_sdn_002', school_id: 'school_sdn_karangbendo', name: 'Rafi Pranata', grade: '5', class_name: '5B', nutrition_status: 'risiko kurang energi', allergy_notes: 'telur', status: 'aktif' } },

    { sheet: 'vendors', id: 'vendor_beras_merapi', row: { vendor_id: 'vendor_beras_merapi', name: 'UD Beras Merapi', category: 'Beras', contact_name: 'Hendra', phone: '02745551001', address: 'Pasar Induk Giwangan', rating: 4.7, payment_term: '14 hari', status: 'aktif' } },
    { sheet: 'vendors', id: 'vendor_sayur_tani', row: { vendor_id: 'vendor_sayur_tani', name: 'Koperasi Tani Segar', category: 'Sayur', contact_name: 'Murni', phone: '02745551002', address: 'Pleret, Bantul', rating: 4.6, payment_term: '7 hari', status: 'aktif' } },
    { sheet: 'vendors', id: 'vendor_protein_nusantara', row: { vendor_id: 'vendor_protein_nusantara', name: 'PT Protein Nusantara', category: 'Protein Hewani', contact_name: 'Yudha', phone: '02745551003', address: 'Sleman', rating: 4.4, payment_term: '14 hari', status: 'aktif' } },
    { sheet: 'supplier_users', id: 'supplier_user_beras', row: { supplier_user_id: 'supplier_user_beras', vendor_id: 'vendor_beras_merapi', name: 'Hendra Merapi', email: 'order@berasmerapi.id', phone: '02745551001', status: 'aktif' } },

    { sheet: 'items', id: 'item_beras_premium', row: { item_id: 'item_beras_premium', sku: 'INV-BHN-BER-0001', barcode_code: '8991111100012', name: 'Beras premium medium', category: 'bahan pokok', unit: 'kg', min_stock: 250, unit_cost: 13800, expiry_tracking: 'ya', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },
    { sheet: 'items', id: 'item_telur_ayam', row: { item_id: 'item_telur_ayam', sku: 'INV-BHN-TEL-0001', barcode_code: '8991111100029', name: 'Telur ayam negeri', category: 'protein', unit: 'kg', min_stock: 80, unit_cost: 29200, expiry_tracking: 'ya', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },
    { sheet: 'items', id: 'item_wortel', row: { item_id: 'item_wortel', sku: 'INV-BHN-SYR-0001', barcode_code: '8991111100036', name: 'Wortel lokal', category: 'sayur', unit: 'kg', min_stock: 60, unit_cost: 9000, expiry_tracking: 'ya', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },
    { sheet: 'items', id: 'item_ompreng', row: { item_id: 'item_ompreng', sku: 'INV-KMS-OMP-0001', barcode_code: '8991111100043', name: 'Ompreng stainless 5 sekat', category: 'alat makan', unit: 'pcs', min_stock: 1300, unit_cost: 32000, expiry_tracking: 'tidak', status: 'aktif', created_at: '2026-05-01', updated_at: '2026-05-11' } },
    { sheet: 'stock_batches', id: 'batch_beras_20260510', row: { batch_id: 'batch_beras_20260510', sku: 'INV-BHN-BER-0001', item_id: 'item_beras_premium', vendor_id: 'vendor_beras_merapi', batch_code: 'BR-MRP-100526', qty_initial: 1200, qty_current: 840, unit: 'kg', inventory_date: '2026-05-10', received_date: '2026-05-10', expiry_date: '2026-08-10', location: 'Gudang Kering A', status: 'aktif' } },
    { sheet: 'stock_batches', id: 'batch_telur_20260510', row: { batch_id: 'batch_telur_20260510', sku: 'INV-BHN-TEL-0001', item_id: 'item_telur_ayam', vendor_id: 'vendor_protein_nusantara', batch_code: 'TLR-PTN-100526', qty_initial: 260, qty_current: 176, unit: 'kg', inventory_date: '2026-05-10', received_date: '2026-05-10', expiry_date: '2026-05-20', location: 'Chiller 1', status: 'aktif' } },
    { sheet: 'stock_movements', id: 'mov_beras_in_20260510', row: { movement_id: 'mov_beras_in_20260510', sku: 'INV-BHN-BER-0001', item_id: 'item_beras_premium', batch_id: 'batch_beras_20260510', type: 'in', qty: 1200, unit: 'kg', movement_date: '2026-05-10', reason: 'Penerimaan PO beras premium', reference_type: 'purchase_order', reference_id: 'po_20260510_beras', created_by: 'user_akuntan', created_at: '2026-05-10T08:00:00+07:00' } },
    { sheet: 'stock_movements', id: 'mov_beras_prod_20260511', row: { movement_id: 'mov_beras_prod_20260511', sku: 'INV-BHN-BER-0001', item_id: 'item_beras_premium', batch_id: 'batch_beras_20260510', type: 'out', qty: 360, unit: 'kg', movement_date: '2026-05-11', reason: 'Pemakaian produksi nasi 1.240 porsi', reference_type: 'production_batch', reference_id: 'prod_20260511_menu_a', created_by: 'user_produksi', created_at: '2026-05-11T05:30:00+07:00' } },
    { sheet: 'stock_opnames', id: 'opname_beras_20260511', row: { opname_id: 'opname_beras_20260511', sku: 'INV-BHN-BER-0001', item_id: 'item_beras_premium', batch_id: 'batch_beras_20260510', opname_date: '2026-05-11', system_qty: 840, physical_qty: 838, variance_qty: -2, reason: 'Selisih timbang karung terbuka', approval_status: 'menunggu', created_by: 'user_akuntan', created_at: '2026-05-11T16:30:00+07:00' } },
    { sheet: 'waste_records', id: 'waste_wortel_20260511', row: { waste_id: 'waste_wortel_20260511', sku: 'INV-BHN-SYR-0001', source: 'prep', item_id: 'item_wortel', batch_id: '', qty: 4.5, unit: 'kg', inventory_date: '2026-05-11', reason: 'Sortasi wortel busuk saat persiapan', cost_estimate: 40500, photo_svg: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#f8fafc"/><text x="10" y="44" font-size="12">Waste wortel 4.5kg</text></svg>', photo_url: '', created_by: 'user_produksi', created_at: '2026-05-11T06:20:00+07:00' } },

    { sheet: 'purchase_requests', id: 'pr_20260509_bahan', row: { request_id: 'pr_20260509_bahan', sppg_id: 'sppg_nakala', request_date: '2026-05-09', needed_date: '2026-05-10', status: 'approved', requested_by: 'user_akuntan', approved_by: 'user_kepala_sppg' } },
    { sheet: 'purchase_orders', id: 'po_20260510_beras', row: { po_id: 'po_20260510_beras', vendor_id: 'vendor_beras_merapi', po_date: '2026-05-09', delivery_date: '2026-05-10', status: 'received', subtotal: 16560000, tax: 0, total: 16560000, approval_status: 'approved', created_by: 'user_akuntan' } },
    { sheet: 'purchase_orders', id: 'po_20260510_telur', row: { po_id: 'po_20260510_telur', vendor_id: 'vendor_protein_nusantara', po_date: '2026-05-09', delivery_date: '2026-05-10', status: 'partial_received', subtotal: 7592000, tax: 835120, total: 8427120, approval_status: 'approved', created_by: 'user_akuntan' } },
    { sheet: 'purchase_order_items', id: 'poi_beras_001', row: { po_item_id: 'poi_beras_001', po_id: 'po_20260510_beras', item_id: 'item_beras_premium', qty: 1200, unit: 'kg', unit_price: 13800, total_price: 16560000 } },
    { sheet: 'purchase_order_items', id: 'poi_telur_001', row: { po_item_id: 'poi_telur_001', po_id: 'po_20260510_telur', item_id: 'item_telur_ayam', qty: 260, unit: 'kg', unit_price: 29200, total_price: 7592000 } },
    { sheet: 'receiving_records', id: 'recv_beras_20260510', row: { receiving_id: 'recv_beras_20260510', po_id: 'po_20260510_beras', item_id: 'item_beras_premium', received_qty: 1200, rejected_qty: 0, qc_status: 'pass', temperature: '', photo_url: 'https://drive.google.com/mock/beras-20260510', received_by: 'user_akuntan', received_at: '2026-05-10T07:40:00+07:00' } },
    { sheet: 'receiving_records', id: 'recv_telur_20260510', row: { receiving_id: 'recv_telur_20260510', po_id: 'po_20260510_telur', item_id: 'item_telur_ayam', received_qty: 260, rejected_qty: 8, qc_status: 'partial_pass', temperature: '6C', photo_url: 'https://drive.google.com/mock/telur-20260510', received_by: 'user_akuntan', received_at: '2026-05-10T08:10:00+07:00' } },
    { sheet: 'supplier_invoices', id: 'inv_beras_20260510', row: { invoice_id: 'inv_beras_20260510', vendor_id: 'vendor_beras_merapi', po_id: 'po_20260510_beras', invoice_number: 'INV/BRM/2026/0510', invoice_date: '2026-05-10', amount: 16560000, payment_status: 'lunas', file_url: 'https://drive.google.com/mock/inv-beras' } },
    { sheet: 'supplier_invoices', id: 'inv_telur_20260510', row: { invoice_id: 'inv_telur_20260510', vendor_id: 'vendor_protein_nusantara', po_id: 'po_20260510_telur', invoice_number: 'INV/PTN/2026/0510', invoice_date: '2026-05-10', amount: 8427120, payment_status: 'belum-lunas', file_url: 'https://drive.google.com/mock/inv-telur' } },

    { sheet: 'accounts', id: 'acc_bank_bri', row: { account_id: 'acc_bank_bri', account_code: '1101', account_name: 'Bank BRI Operasional', type: 'kas', status: 'aktif' } },
    { sheet: 'accounts', id: 'acc_kas_tunai', row: { account_id: 'acc_kas_tunai', account_code: '1102', account_name: 'Kas Tunai SPPG', type: 'kas', status: 'aktif' } },
    { sheet: 'accounts', id: 'acc_belanja_bahan', row: { account_id: 'acc_belanja_bahan', account_code: '5101', account_name: 'Belanja Bahan Pangan', type: 'biaya', status: 'aktif' } },
    { sheet: 'accounts', id: 'acc_pajak', row: { account_id: 'acc_pajak', account_code: '2102', account_name: 'Utang Pajak', type: 'utang', status: 'aktif' } },
    { sheet: 'accounts', id: 'acc_aset_dapur', row: { account_id: 'acc_aset_dapur', account_code: '1301', account_name: 'Aset Peralatan Dapur', type: 'aset', status: 'aktif' } },
    { sheet: 'budgets', id: 'budget_bahan_202605', row: { budget_id: 'budget_bahan_202605', period: '2026-05', module: 'inventory', budget_amount: 315000000, actual_amount: 249876000, variance_amount: 65124000, status: 'aktif' } },
    { sheet: 'budgets', id: 'budget_operasional_202605', row: { budget_id: 'budget_operasional_202605', period: '2026-05', module: 'operational', budget_amount: 42000000, actual_amount: 31450000, variance_amount: 10550000, status: 'aktif' } },
    { sheet: 'budgets', id: 'budget_hr_202605', row: { budget_id: 'budget_hr_202605', period: '2026-05', module: 'hr', budget_amount: 86000000, actual_amount: 80450000, variance_amount: 5550000, status: 'aktif' } },
    { sheet: 'finance_transactions', id: 'trx_dana_masuk_20260501', row: { transaction_id: 'trx_dana_masuk_20260501', date: '2026-05-01', account_id: 'acc_bank_bri', type: 'debit', amount: 375000000, description: 'Penerimaan dana program Mei 2026 | Kategori: penerimaan dana | Cost center: planning | Metode: bank | Approval: disetujui', reference_type: 'monthly_report', reference_id: 'monthly_202605_lpu', created_by: 'user_akuntan' } },
    { sheet: 'finance_transactions', id: 'trx_bayar_beras_20260510', row: { transaction_id: 'trx_bayar_beras_20260510', date: '2026-05-10', account_id: 'acc_belanja_bahan', type: 'credit', amount: 16560000, description: 'Pembayaran beras premium UD Beras Merapi | Kategori: bahan pangan | Cost center: inventory | Metode: transfer | Approval: disetujui', reference_type: 'supplier_invoice', reference_id: 'inv_beras_20260510', created_by: 'user_akuntan' } },
    { sheet: 'finance_transactions', id: 'trx_pajak_ppn_20260510', row: { transaction_id: 'trx_pajak_ppn_20260510', date: '2026-05-10', account_id: 'acc_pajak', type: 'credit', amount: 835120, description: 'Pencatatan PPN telur ayam | Kategori: pajak | Cost center: purchasing | Metode: jurnal | Approval: menunggu', reference_type: 'supplier_invoice', reference_id: 'inv_telur_20260510', created_by: 'user_akuntan' } },
    { sheet: 'finance_transactions', id: 'trx_setor_pajak_20260511', row: { transaction_id: 'trx_setor_pajak_20260511', date: '2026-05-11', account_id: 'acc_bank_bri', type: 'credit', amount: 835120, description: 'Setor pajak PPN supplier protein | Kategori: pajak | Cost center: finance | Metode: transfer | Approval: disetujui', reference_type: 'tax', reference_id: 'trx_pajak_ppn_20260510', created_by: 'user_akuntan' } },
    { sheet: 'payments', id: 'pay_beras_20260510', row: { payment_id: 'pay_beras_20260510', invoice_id: 'inv_beras_20260510', payment_date: '2026-05-10', amount: 16560000, method: 'transfer', status: 'dibayar', proof_url: 'https://drive.google.com/mock/bukti-bayar-beras' } },
    { sheet: 'assets', id: 'asset_oven_001', row: { asset_id: 'asset_oven_001', name: 'AST-KCH-001 - Oven combi 20 tray', category: 'Peralatan Dapur', purchase_date: '2026-02-15', purchase_value: 87500000, condition: 'baik', location: 'Area Produksi Panas | SN OVEN20-260215 | PIC Yusuf Hakim | Umur 60 bulan', status: 'aktif' } },
    { sheet: 'assets', id: 'asset_mobil_box_001', row: { asset_id: 'asset_mobil_box_001', name: 'AST-DST-001 - Mobil box pendingin', category: 'Kendaraan Distribusi', purchase_date: '2026-01-20', purchase_value: 238000000, condition: 'perlu-servis', location: 'Garasi SPPG | SN BOX-260120 | PIC Fajar Maulana | Umur 84 bulan', status: 'aktif' } },

    { sheet: 'recipes', id: 'recipe_menu_a_20260511', row: { recipe_id: 'recipe_menu_a_20260511', name: 'Nasi, telur semur, sayur bening, pisang', portion_size: 'anak SD 650 kkal', target_age_group: 'SD kelas 1-6', nutrition_target_json: '{"energy_kcal":650,"protein_g":22,"fat_g":18,"carb_g":92}', status: 'aktif', created_by: 'user_gizi' } },
    { sheet: 'recipe_components', id: 'comp_menu_a_beras', row: { component_id: 'comp_menu_a_beras', recipe_id: 'recipe_menu_a_20260511', item_id: 'item_beras_premium', qty_per_portion: 0.18, unit: 'kg', notes: 'beras matang 1 porsi' } },
    { sheet: 'recipe_components', id: 'comp_menu_a_telur', row: { component_id: 'comp_menu_a_telur', recipe_id: 'recipe_menu_a_20260511', item_id: 'item_telur_ayam', qty_per_portion: 0.06, unit: 'kg', notes: 'telur semur' } },
    { sheet: 'nutrition_checks', id: 'nutri_menu_a_20260511', row: { check_id: 'nutri_menu_a_20260511', recipe_id: 'recipe_menu_a_20260511', score: 92, protein_g: 23.4, carb_g: 91.8, fat_g: 17.6, fiber_g: 5.2, warning_json: '{"allergen":"telur","status":"label wajib tampil"}', checked_by: 'user_gizi', checked_at: '2026-05-11T04:45:00+07:00' } },
    { sheet: 'production_batches', id: 'prod_20260511_menu_a', row: { batch_id: 'prod_20260511_menu_a', recipe_id: 'recipe_menu_a_20260511', target_portion: 1240, actual_portion: 1232, start_time: '2026-05-11T04:30:00+07:00', end_time: '2026-05-11T08:20:00+07:00', temperature: '74C', qc_status: 'pass', created_by: 'user_produksi' } },
    { sheet: 'portion_batches', id: 'portion_20260511_a', row: { portion_id: 'portion_20260511_a', production_batch_id: 'prod_20260511_menu_a', target_portion: 1240, actual_portion: 1230, variance: -10, created_by: 'user_pemorsian', created_at: '2026-05-11T09:05:00+07:00' } },
    { sheet: 'packing_batches', id: 'packing_20260511_sdn', row: { packing_id: 'packing_20260511_sdn', portion_id: 'portion_20260511_a', school_id: 'school_sdn_karangbendo', pack_count: 420, label_code: 'PKG-RA1-20260511', status: 'ready_dispatch', created_at: '2026-05-11T09:50:00+07:00' } },
    { sheet: 'packing_batches', id: 'packing_20260511_mi', row: { packing_id: 'packing_20260511_mi', portion_id: 'portion_20260511_a', school_id: 'school_mi_miftahul', pack_count: 310, label_code: 'PKG-RA2-20260511', status: 'ready_dispatch', created_at: '2026-05-11T09:55:00+07:00' } },
    { sheet: 'dispatch_orders', id: 'dispatch_20260511_sdn', row: { dispatch_id: 'dispatch_20260511_sdn', school_id: 'school_sdn_karangbendo', packing_id: 'packing_20260511_sdn', driver_user_id: 'user_distribusi', route_code: 'R-A1', portion_qty: 420, status: 'delivered', eta: '2026-05-11T10:30:00+07:00', delivered_at: '2026-05-11T10:28:00+07:00' } },
    { sheet: 'dispatch_orders', id: 'dispatch_20260511_mi', row: { dispatch_id: 'dispatch_20260511_mi', school_id: 'school_mi_miftahul', packing_id: 'packing_20260511_mi', driver_user_id: 'user_distribusi', route_code: 'R-A2', portion_qty: 310, status: 'delivered_with_note', eta: '2026-05-11T10:45:00+07:00', delivered_at: '2026-05-11T10:58:00+07:00' } },
    { sheet: 'delivery_receipts', id: 'receipt_20260511_sdn', row: { receipt_id: 'receipt_20260511_sdn', dispatch_id: 'dispatch_20260511_sdn', school_id: 'school_sdn_karangbendo', received_qty: 420, received_by: 'Siti Aminah', received_at: '2026-05-11T10:31:00+07:00', photo_url: 'https://drive.google.com/mock/receipt-sdn', feedback_status: 'ok', notes: 'Jumlah sesuai surat jalan' } },
    { sheet: 'delivery_receipts', id: 'receipt_20260511_mi', row: { receipt_id: 'receipt_20260511_mi', dispatch_id: 'dispatch_20260511_mi', school_id: 'school_mi_miftahul', received_qty: 308, received_by: 'Nur Hayati', received_at: '2026-05-11T11:02:00+07:00', photo_url: 'https://drive.google.com/mock/receipt-mi', feedback_status: 'selisih', notes: '2 porsi tumpah saat unloading, dicatat insiden' } },
    { sheet: 'school_feedback', id: 'feedback_20260511_mi', row: { feedback_id: 'feedback_20260511_mi', school_id: 'school_mi_miftahul', dispatch_id: 'dispatch_20260511_mi', rating: 4, category: 'pengiriman', message: 'Datang terlambat 13 menit dan ada 2 porsi tumpah', created_by: 'school_pic_mi', created_at: '2026-05-11T11:10:00+07:00', status: 'open' } },
    { sheet: 'incidents', id: 'incident_20260511_tumpah', row: { incident_id: 'incident_20260511_tumpah', school_id: 'school_mi_miftahul', dispatch_id: 'dispatch_20260511_mi', type: 'selisih_porsi', severity: 'medium', description: '2 porsi rusak/tumpah saat unloading di sekolah', photo_url: 'https://drive.google.com/mock/incident-mi', status: 'investigasi', created_at: '2026-05-11T11:12:00+07:00' } },
    { sheet: 'cleaning_checklists', id: 'cleaning_20260511_pagi', row: { cleaning_id: 'cleaning_20260511_pagi', area: 'Produksi panas dan packing', shift: 'pagi', checklist_json: '{"lantai":"bersih","meja":"sanitasi selesai","alat":"dicuci 3 bak","ompreng_return":728}', status: 'selesai', photo_url: 'https://drive.google.com/mock/cleaning-pagi', checked_by: 'user_clean_001', checked_at: '2026-05-11T14:30:00+07:00' } },

    { sheet: 'daily_reports', id: 'daily_20260511', row: { report_id: 'daily_20260511', sppg_id: 'sppg_nakala', report_date: '2026-05-11', target_portion: 1240, delivered_portion: 1228, qc_summary: 'QC pass, label telur ditampilkan', waste_summary: 'Wortel sortasi 4.5kg; selisih distribusi 2 porsi', issue_summary: 'MI terlambat 13 menit dan 2 porsi tumpah', status: 'submitted', created_at: '2026-05-11T16:45:00+07:00' } },
    { sheet: 'monthly_reports', id: 'monthly_202605_lpu', row: { report_id: 'monthly_202605_lpu', sppg_id: 'sppg_nakala', period: '2026-05', summary_json: '{"saldo_awal":132500000,"penerimaan":375000000,"pengeluaran":174195120,"sisa_dana":333080880,"status_approval":"approved","locked":false}', file_url: 'https://drive.google.com/mock/lpu-mei-2026', status: 'approved' } },
    { sheet: 'exports', id: 'export_sptj_202605', row: { export_id: 'export_sptj_202605', report_type: 'SPTJ', format: 'PDF', file_url: 'https://drive.google.com/mock/sptj-mei-2026', requested_by: 'user_akuntan', created_at: '2026-05-11T17:00:00+07:00', status: 'generated' } },
    { sheet: 'exports', id: 'export_bap_sisa_dana_202605', row: { export_id: 'export_bap_sisa_dana_202605', report_type: 'BAP Sisa Dana', format: 'PDF', file_url: 'https://drive.google.com/mock/bap-sisa-dana-mei-2026', requested_by: 'user_akuntan', created_at: '2026-05-11T17:05:00+07:00', status: 'generated' } },
    { sheet: 'exports', id: 'export_daftar_nominatif_202605', row: { export_id: 'export_daftar_nominatif_202605', report_type: 'Daftar Nominatif', format: 'XLSX', file_url: 'https://drive.google.com/mock/daftar-nominatif-mei-2026', requested_by: 'user_akuntan', created_at: '2026-05-11T17:10:00+07:00', status: 'generated' } },
    { sheet: 'bgn_reports', id: 'bgn_202605_bantul', row: { report_id: 'bgn_202605_bantul', period: '2026-05', region: 'Bantul Timur', coverage_school: 3, coverage_portion: 1240, compliance_score: 91, incident_count: 1, file_url: 'https://drive.google.com/mock/bgn-may', created_at: '2026-05-11T17:20:00+07:00' } },
    { sheet: 'compliance_checks', id: 'comp_food_safety_20260511', row: { compliance_id: 'comp_food_safety_20260511', sppg_id: 'sppg_nakala', check_date: '2026-05-11', category: 'food_safety', score: 93, finding: 'Sample food tercatat; perlu perbaikan unloading sekolah MI', status: 'open', checked_by: 'user_gizi' } },
    { sheet: 'regional_kpis', id: 'kpi_bantul_202605', row: { kpi_id: 'kpi_bantul_202605', period: '2026-05', region: 'Bantul Timur', schools_total: 3, portions_total: 1240, ontime_rate: 0.67, qc_pass_rate: 1, waste_value: 40500 } },
    { sheet: 'ai_runs', id: 'ai_run_forecast_20260511', row: { ai_run_id: 'ai_run_forecast_20260511', use_case: 'forecast_bahan', input_ref_type: 'daily_report', input_ref_id: 'daily_20260511', model_name: 'qa-rule-engine', status: 'completed', result_json: '{"beras_kg_next_day":365,"telur_kg_next_day":78,"risk":"telur expire 2026-05-20"}', created_by: 'user_gizi', created_at: '2026-05-11T16:00:00+07:00' } },
    { sheet: 'ai_recommendations', id: 'ai_rec_telur_expiry', row: { recommendation_id: 'ai_rec_telur_expiry', ai_run_id: 'ai_run_forecast_20260511', module: 'inventory', priority: 'high', title: 'Gunakan batch telur sebelum 2026-05-20', recommendation: 'Prioritaskan batch TLR-PTN-100526 untuk menu protein 3 hari ke depan.', status: 'open', created_at: '2026-05-11T16:01:00+07:00' } },
    { sheet: 'anomaly_flags', id: 'anom_distribusi_mi_20260511', row: { flag_id: 'anom_distribusi_mi_20260511', module: 'distribution', entity_type: 'dispatch_order', entity_id: 'dispatch_20260511_mi', severity: 'medium', reason: 'Delivered late dan receipt quantity lebih rendah 2 porsi', status: 'open', created_at: '2026-05-11T11:15:00+07:00' } },
    { sheet: 'audit_logs', id: 'audit_submit_lpu_202605', row: { audit_id: 'audit_submit_lpu_202605', entity: 'monthly_reports', entity_id: 'monthly_202605_lpu', action: 'submit', before_json: '{"status":"draft"}', after_json: '{"status":"submitted"}', user_id: 'user_akuntan', created_at: '2026-05-11T16:50:00+07:00' } },
    { sheet: 'audit_logs', id: 'audit_approve_lpu_202605', row: { audit_id: 'audit_approve_lpu_202605', entity: 'monthly_reports', entity_id: 'monthly_202605_lpu', action: 'approve', before_json: '{"status":"submitted"}', after_json: '{"status":"approved","locked":false}', user_id: 'user_kepala_sppg', created_at: '2026-05-11T17:00:00+07:00' } },
    { sheet: 'audit_logs', id: 'audit_revision_sample', row: { audit_id: 'audit_revision_sample', entity: 'monthly_reports', entity_id: 'monthly_202604_lpu', action: 'request_revision', before_json: '{"status":"submitted"}', after_json: '{"status":"revision_requested"}', user_id: 'user_kepala_sppg', created_at: '2026-05-02T17:10:00+07:00' } }
];

async function main() {
    const results = [];
    for (const entry of rows) {
        const idField = idFields[entry.sheet];
        if (!idField) throw new Error(`Missing idField for ${entry.sheet}`);
        try {
            await upsertSheetRow(entry.sheet, entry.id, entry.row, idField, USER_ID);
            results.push({ sheet: entry.sheet, id: entry.id, status: 'ok' });
            process.stdout.write('.');
        } catch (error) {
            results.push({ sheet: entry.sheet, id: entry.id, status: 'error', error: error.message });
            process.stdout.write('E');
        }
    }
    process.stdout.write('\n');

    const countSheets = [...new Set(rows.map((row) => row.sheet))];
    const counts = {};
    for (const sheet of countSheets) {
        try {
            const payload = await getSheetRows(sheet);
            counts[sheet] = (payload.rows || []).length;
        } catch (error) {
            counts[sheet] = `error: ${error.message}`;
        }
    }

    const summary = {
        attempted: rows.length,
        success: results.filter((row) => row.status === 'ok').length,
        failed: results.filter((row) => row.status === 'error'),
        counts
    };
    await fs.writeFile('outputs/sipagi-real-qa-seed-result.json', JSON.stringify({ summary, results }, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed.length) process.exitCode = 1;
}

main();
