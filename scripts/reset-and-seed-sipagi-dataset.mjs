import fs from 'node:fs/promises';
import { deleteSheetRow, getSheetRows, upsertSheetRow } from '../app/shared/services/googleSheetsApi.js';

const USER_ID = 'seed_sipagi_20260512';
const NOW = '2026-05-12 16:45:00 GMT+7';
const TODAY = '2026-05-12';
const PERIOD = '2026-05';
const idFields = {settings:'setting_id',users:'user_id',roles:'role_id',role_permissions:'permission_id',audit_logs:'audit_id',notifications:'notification_id',sppg_units:'sppg_id',schools:'school_id',beneficiaries:'beneficiary_id',vendors:'vendor_id',items:'item_id',stock_batches:'batch_id',stock_movements:'movement_id',stock_opnames:'opname_id',waste_records:'waste_id',purchase_requests:'request_id',purchase_orders:'po_id',purchase_order_items:'po_item_id',receiving_records:'receiving_id',supplier_invoices:'invoice_id',accounts:'account_id',finance_transactions:'transaction_id',assets:'asset_id',asset_maintenance:'maintenance_id',budgets:'budget_id',payments:'payment_id',employees:'employee_id',recruitment_candidates:'candidate_id',staff_rosters:'roster_id',leave_requests:'leave_id',attendance_logs:'attendance_id',payroll_records:'payroll_id',recipes:'recipe_id',recipe_components:'component_id',nutrition_checks:'check_id',production_batches:'batch_id',portion_batches:'portion_id',packing_batches:'packing_id',dispatch_orders:'dispatch_id',delivery_receipts:'receipt_id',school_feedback:'feedback_id',incidents:'incident_id',cleaning_checklists:'cleaning_id',bgn_reports:'report_id',compliance_checks:'compliance_id',regional_kpis:'kpi_id',supplier_users:'supplier_user_id',supplier_delivery_schedules:'schedule_id',ai_runs:'ai_run_id',ai_recommendations:'recommendation_id',anomaly_flags:'flag_id',daily_reports:'report_id',monthly_reports:'report_id',exports:'export_id'};
delete idFields.asset_maintenance;
const resetSheets = Object.keys(idFields).filter((sheet) => sheet !== 'audit_logs');
const unavailableSheets = new Set();
const modules = ['dashboard','settings','mbg','inventory','purchasing','finance','hr','operational','nutritionist','school','bgn','supplier','ai','reports'];
const roles = [['kepala_sppg','Kepala SPPG'],['ahli_gizi','Ahli Gizi'],['pengadaan','Akuntan/Pengadaan'],['distribusi','Asisten Lapangan/Distribusi'],['produksi','Produksi'],['pemorsian_packing','Pemorsian/Packing'],['pencuci_kebersihan','Pencuci/Kebersihan'],['sekolah','Sekolah'],['bgn','BGN'],['supplier','Supplier']];
const suppliers = [['vendor_beras_merapi','UD Beras Merapi','Beras'],['vendor_tani_segar','Koperasi Tani Segar','Sayur dan Buah'],['vendor_protein_nusantara','PT Protein Nusantara','Protein Hewani'],['vendor_ayam_sejahtera','CV Ayam Sejahtera','Ayam'],['vendor_laut_biru','UD Laut Biru','Ikan dan Seafood'],['vendor_tempe_tahu_jaya','Produsen Tempe Tahu Jaya','Protein Nabati'],['vendor_bumbu_makmur','Toko Bumbu Makmur','Bumbu'],['vendor_kemasan_aman','PT Kemasan Aman Pangan','Kemasan'],['vendor_susu_nutrisi','CV Susu Nutrisi Anak','Dairy'],['vendor_sanitasi_bersih','UD Sanitasi Bersih','Chemical']];
const pools = [
 ['Karbohidrat','KRB','kg',120,13500,'dry storage','vendor_beras_merapi',['Beras Premium Medium','Beras IR64','Beras Pandan Wangi','Beras Merah','Beras Hitam','Jagung Pipil','Kentang Dieng','Ubi Jalar Oranye','Singkong Kupas','Makaroni Elbow','Spaghetti Kering','Bihun Jagung','Mie Telur Kering','Tepung Terigu','Tepung Tapioka','Tepung Maizena','Oat Rolled','Roti Tawar Gandum','Lontong Siap Masak','Sagu Mutiara']],
 ['Protein Hewani','PHW','kg',55,42000,'chiller','vendor_protein_nusantara',['Ayam Fillet Dada','Ayam Paha Atas','Ayam Giling','Telur Ayam Negeri','Telur Puyuh','Daging Sapi Giling','Ikan Lele Fillet','Ikan Nila Fillet','Ikan Tongkol','Ikan Kembung','Udang Kupas','Bakso Sapi','Sosis Ayam','Hati Ayam','Daging Ayam Katsu','Tuna Kaleng','Ikan Dori Beku','Kornet Sapi','Sarden Kaleng','Cumi Ring Beku']],
 ['Protein Nabati','PNB','kg',45,18500,'chiller','vendor_tempe_tahu_jaya',['Tahu Putih','Tahu Kuning','Tempe Kedelai','Tempe Gembus','Kacang Merah','Kacang Hijau','Kacang Tanah Kupas','Kedelai Rebus','Edamame Beku','Oncom','Susu Kedelai Bubuk','Tepung Kacang Hijau','Tahu Sutra','Tempe Mendoan','Kacang Polong','Lentil Merah','Buncis Beku','Tahu Pong','Nugget Tahu','Perkedel Tempe']],
 ['Sayur','SYR','kg',60,11500,'chiller','vendor_tani_segar',['Wortel Lokal','Buncis','Bayam Hijau','Kangkung','Sawi Hijau','Sawi Putih','Kol Putih','Brokoli','Kembang Kol','Labu Siam','Labu Kuning','Tomat Merah','Timun','Daun Bawang','Seledri','Kacang Panjang','Terong Ungu','Paprika Merah','Jagung Manis','Pakchoy']],
 ['Buah','BUH','kg',70,16500,'chiller','vendor_tani_segar',['Pisang Cavendish','Pisang Raja','Pepaya California','Semangka Merah','Melon Hijau','Apel Fuji','Jeruk Baby','Pir Century','Salak Pondoh','Mangga Harum Manis','Jambu Kristal','Nanas Madu','Buah Naga','Alpukat Mentega','Anggur Merah','Strawberry','Rambutan','Kelengkeng','Sawo','Belimbing']],
 ['Bumbu','BMB','kg',18,28000,'dry storage','vendor_bumbu_makmur',['Bawang Merah','Bawang Putih','Bawang Bombay','Cabai Merah Keriting','Cabai Rawit','Jahe','Lengkuas','Kunyit','Kemiri','Ketumbar Bubuk','Lada Bubuk','Garam Beryodium','Gula Pasir','Gula Merah','Daun Salam','Daun Jeruk','Serai','Pala Bubuk','Kayu Manis','Kaldu Jamur']],
 ['Saus dan Cairan','SCS','liter',28,22500,'dry storage','vendor_bumbu_makmur',['Kecap Manis','Saus Tomat','Saus Sambal','Saus Barbeque','Saus Teriyaki','Saus Tiram','Minyak Goreng','Minyak Wijen','Cuka Masak','Santan Cair','Kaldu Ayam Cair','Susu UHT Plain','Yogurt Plain','Mayones','Dressing Salad','Madu','Sirup Gula','Air Mineral Galon','Larutan Garam','Pasta Tomat']],
 ['Kemasan','KMS','pcs',900,850,'packaging storage','vendor_kemasan_aman',['Ompreng Stainless 5 Sekat','Tutup Ompreng','Sendok Stainless','Garpu Stainless','Cup Saus 30 ml','Label Menu Harian','Seal Plastik Food Grade','Kardus Distribusi','Kantong Bio Plastik','Stiker Allergen','Tisu Makan','Sarung Tangan Food Grade','Hairnet','Masker Dapur','Apron Plastik','Box Sampel Makanan','Plastik Vakum','Tray Stainless','Kontainer GN Pan','Termobox Insulated']],
 ['Dairy dan Fortifikasi','DRY','kg',25,52000,'chiller','vendor_susu_nutrisi',['Susu Bubuk Full Cream','Susu Bubuk Skim','Keju Cheddar','Margarin','Butter Unsalted','Krimer Nabati','Bubuk Cokelat','Bubuk Vanila','Fortifikan Zat Besi','Fortifikan Vitamin A','Whey Protein','Sereal Fortifikasi','Kismis','Kurma','Chia Seed','Biji Wijen','Keju Mozzarella','Susu Evaporasi','Bubuk Matcha','Bubuk Kacang Hijau']],
 ['Chemical dan Kebersihan','CHM','liter',20,31000,'chemical storage','vendor_sanitasi_bersih',['Sabun Cuci Alat Food Grade','Disinfektan Permukaan','Hand Sanitizer','Klorin Food Grade','Pembersih Lantai','Degreaser Dapur','Sabun Tangan','Alkohol 70 Persen','Pewangi Ruangan','Kain Lap Microfiber','Spons Cuci','Sikat Lantai','Trash Bag','Sarung Tangan Karet','Termometer Probe','Test Strip Klorin','Pembersih Kaca','Cairan Pel','Descaler Mesin','Filter Air']]
];
const slug = (v) => String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
function addDays(date, days){ const d = new Date(`${date}T00:00:00+07:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
const moneyRound = (v) => Math.round(v/100)*100;
const push = (rows,sheet,id,row) => rows.push({sheet,id,row});
const storageText = (s) => ({'dry storage':'Dry storage: suhu ruang 20-30 C, area kering dan bersih',chiller:'Chiller: suhu 0-4 C bahan segar','chemical storage':'Chemical storage: terpisah dari bahan pangan, berlabel, dan terkunci','packaging storage':'Packaging storage: area kering, bersih, tertutup, dan bebas kontaminasi'}[s] || s);
const locationFor = (s,i) => s==='chiller' ? `Chiller ${i%3+1}` : s==='packaging storage' ? `Packaging Storage ${i%2+1}` : s==='chemical storage' ? 'Chemical Storage' : `Gudang Kering ${String.fromCharCode(65+i%3)}`;
const stockPlan = (i,min) => { const p=[['Aman',2.4],['Perlu Restok',0.85],['Kritis',0.42],['Habis',0],['Batch Perlu Cek',1.3]][i%5]; return {label:p[0], qty:Math.round(min*p[1])}; };

function seedCore(rows){
 push(rows,'sppg_units','sppg_nakala',{sppg_id:'sppg_nakala',name:'SPPG Nakala Banguntapan',region:'Bantul Timur',address:'Jl. Wonosari KM 6, Banguntapan, Bantul',head_user_id:'user_kepala_sppg',status:'aktif'});
 push(rows,'settings','setting_sppg_identity',{setting_id:'setting_sppg_identity',key:'sppg_identity',value:JSON.stringify({nama_sppg:'SPPG Nakala Banguntapan',kepala_sppg:'Raka Pratama',periode:PERIOD}),description:'Identitas SPPG seed baru',updated_at:NOW,updated_by:USER_ID});
 const users=[['user_kepala_sppg','Raka Pratama','kepala_sppg'],['user_gizi','Dewi Anggraini','ahli_gizi'],['user_akuntan','Bima Santoso','pengadaan'],['user_inventory','Nadia Putri','pengadaan'],['user_distribusi','Fajar Maulana','distribusi'],['user_produksi','Yusuf Hakim','produksi'],['user_packing','Mira Lestari','pemorsian_packing'],['user_cleaning','Slamet Riyanto','pencuci_kebersihan'],['user_bgn','Ratna BGN','bgn'],['user_supplier','Hendra Supplier','supplier']];
 users.forEach(([user_id,name,role_id],i)=>{ push(rows,'users',user_id,{user_id,name,email:`${slug(name)}@sipagi.local`,phone:`08120000${String(i+1).padStart(4,'0')}`,role_id,sppg_id:'sppg_nakala',school_id:'',supplier_id:role_id==='supplier'?'vendor_beras_merapi':'',status:'aktif',created_at:'2026-05-01',updated_at:NOW}); push(rows,'employees',`emp_${String(i+1).padStart(3,'0')}`,{employee_id:`emp_${String(i+1).padStart(3,'0')}`,name,role_id,phone:`08120000${String(i+1).padStart(4,'0')}`,address:'Banguntapan Bantul',join_date:'2026-04-01',employment_status:'aktif',base_salary:3500000+i*250000,status:'aktif'}); });
 roles.forEach(([role_id,role_name])=>push(rows,'roles',role_id,{role_id,role_name,scope:'SIPAGI role access',status:'aktif'}));
 roles.forEach(([role_id])=>modules.forEach(module_id=>{ const full=role_id==='kepala_sppg'; const readable=full||(role_id==='pengadaan'&&['dashboard','inventory','purchasing','finance','supplier','reports'].includes(module_id))||(role_id==='ahli_gizi'&&['dashboard','operational','nutritionist','inventory','reports'].includes(module_id))||(role_id==='supplier'&&['purchasing','supplier'].includes(module_id))||(role_id==='sekolah'&&module_id==='school')||(role_id==='bgn'&&['bgn','reports'].includes(module_id)); push(rows,'role_permissions',`perm_${role_id}_${module_id}`,{permission_id:`perm_${role_id}_${module_id}`,role_id,module_id,can_create:full||['pengadaan','ahli_gizi'].includes(role_id)?'TRUE':'FALSE',can_read:readable?'TRUE':'FALSE',can_update:full||['pengadaan','ahli_gizi'].includes(role_id)?'TRUE':'FALSE',can_delete:full?'TRUE':'FALSE',can_approve:full?'TRUE':'FALSE',can_export:readable?'TRUE':'FALSE'}); }));
 suppliers.forEach(([vendor_id,name,category],i)=>{ push(rows,'vendors',vendor_id,{vendor_id,name,category,contact_name:`PIC ${name}`,phone:`02745551${String(i+1).padStart(3,'0')}`,address:`Wilayah Supplier ${i+1} Yogyakarta`,rating:(4+i/10).toFixed(1),payment_term:i%3===0?'COD':'14 hari',status:i===9?'review':'aktif'}); push(rows,'supplier_users',`su_${vendor_id}`,{supplier_user_id:`su_${vendor_id}`,vendor_id,name:`PIC ${name}`,email:`${slug(name)}@supplier.local`,phone:`02745551${String(i+1).padStart(3,'0')}`,status:'aktif'}); });
}

function seedInventory(rows){
 const defs=pools.flatMap(([category,prefix,unit,min,cost,storage,supplier,names])=>names.map(name=>({category,prefix,unit,min,cost,storage,supplier,name}))).slice(0,200);
 defs.forEach((it,i)=>{ const n=i+1,id=`item_${String(n).padStart(3,'0')}_${slug(it.name)}`,sku=`${it.prefix}-${String(n).padStart(4,'0')}`,min=it.min+(i%6)*Math.max(5,Math.round(it.min*.18)),plan=stockPlan(i,min),cost=moneyRound(it.cost*(.88+(i%9)*.035)); const matStatus=['aktif','aktif','aktif','aktif','menunggu approval','draft','ditolak','revisi'][i%8]; push(rows,'items',id,{item_id:id,sku,material_code:`${it.prefix.slice(0,2)}-${String(n).padStart(3,'0')}`,barcode_code:`8997${String(10000000+n)}`,name:it.name,category:it.category,unit:it.unit,usage_method:it.category==='Kemasan'||it.category.includes('Chemical')?'FIFO':'FEFO',storage_rule:storageText(it.storage),brand_type:it.category==='Kemasan'?'food grade':'',description:`${it.name} untuk operasional MBG`,qc_notes:it.category.includes('Protein')?'Cek bau, suhu, warna, dan kemasan':'Cek fisik, label, dan kontaminasi',safety_notes:it.storage==='chemical storage'?'Wajib terpisah dari bahan pangan':'Jaga FEFO/FIFO dan sanitasi',notes:`Seed ${plan.label}`,min_stock:min,unit_cost:cost,expiry_tracking:it.category==='Kemasan'||it.storage==='chemical storage'?'tidak':'ya',status:matStatus,approval_status:matStatus,created_by:i%5===0?'user_inventory':'user_akuntan',created_at:addDays(TODAY,-20+i%15),updated_at:NOW,submitted_at:['menunggu approval','ditolak','revisi'].includes(matStatus)?NOW:'',approved_by:matStatus==='aktif'?'user_kepala_sppg':'',approved_at:matStatus==='aktif'?NOW:'',review_note:matStatus==='ditolak'?'Dokumen supplier belum lengkap':matStatus==='revisi'?'Lengkapi barcode dan catatan QC':''});
  if(matStatus==='aktif'){ const bid=`batch_${String(n).padStart(3,'0')}_${slug(it.name)}`,initial=Math.max(plan.qty+Math.round(min*.8),plan.qty),exp=plan.label==='Batch Perlu Cek'?(i%2===0?2:-1):18+i%120; push(rows,'stock_batches',bid,{batch_id:bid,sku,item_id:id,vendor_id:it.supplier,batch_code:`${it.prefix}-${String(n).padStart(4,'0')}-${TODAY.replace(/-/g,'').slice(2)}`,qty_initial:initial,qty_current:plan.qty,unit:it.unit,inventory_date:addDays(TODAY,-i%7),received_date:addDays(TODAY,-i%7),expiry_date:it.category==='Kemasan'||it.storage==='chemical storage'?'':addDays(TODAY,exp),location:locationFor(it.storage,i),status:plan.label==='Habis'?'habis':plan.label==='Batch Perlu Cek'&&i%4===0?'karantina':'released',qc_status:plan.label==='Batch Perlu Cek'?'pending_qc':'accepted',temperature:it.storage==='chiller'?`${2+i%4}C`:'',received_by:'user_inventory',created_at:NOW,updated_at:NOW}); push(rows,'stock_movements',`mov_in_${String(n).padStart(3,'0')}`,{movement_id:`mov_in_${String(n).padStart(3,'0')}`,sku,item_id:id,batch_id:bid,type:'stok-masuk',qty:initial,unit:it.unit,movement_date:addDays(TODAY,-i%7),reason:'Penerimaan awal seed SIPAGI',reference_type:'purchase_order',reference_id:`po_${String(i%15+1).padStart(3,'0')}`,created_by:'user_inventory',created_at:NOW}); if(plan.qty<initial) push(rows,'stock_movements',`mov_out_${String(n).padStart(3,'0')}`,{movement_id:`mov_out_${String(n).padStart(3,'0')}`,sku,item_id:id,batch_id:bid,type:'stok-keluar',qty:initial-plan.qty,unit:it.unit,movement_date:TODAY,reason:'Pengeluaran ke produksi harian',reference_type:'production_batch',reference_id:`prod_${String(i%12+1).padStart(3,'0')}`,created_by:'user_produksi',created_at:NOW}); if(['Kritis','Habis','Batch Perlu Cek'].includes(plan.label)&&i%2===0) push(rows,'stock_opnames',`opname_${String(n).padStart(3,'0')}`,{opname_id:`opname_${String(n).padStart(3,'0')}`,sku,item_id:id,batch_id:bid,opname_date:TODAY,system_qty:plan.qty,physical_qty:Math.max(plan.qty-(i%4+1),0),variance_qty:-1*(i%4+1),reason:plan.label==='Batch Perlu Cek'?'Batch perlu cek FEFO/QC':'Selisih stok opname gudang',approval_status:i%4===0?'pending':'approved',created_by:'user_inventory',created_at:NOW}); if(i%9===0) push(rows,'waste_records',`waste_${String(n).padStart(3,'0')}`,{waste_id:`waste_${String(n).padStart(3,'0')}`,sku,source:i%2===0?'prep':'storage',item_id:id,batch_id:bid,qty:Math.max(1,Math.round(min*.04)),unit:it.unit,inventory_date:TODAY,reason:plan.label==='Batch Perlu Cek'?'Sortasi batch mendekati expired':'Sisa trimming produksi',cost_estimate:Math.max(1,Math.round(min*.04))*cost,photo_svg:`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="#f8fafc"/><text x="20" y="84" font-size="18">${it.name}</text></svg>`,photo_url:'',created_by:'user_produksi',created_at:NOW}); }});
 return defs;
}
function seedPurchasing(rows,defs){
 const prStatuses=['draft','submitted','approved','rejected','cancelled','converted_to_po'], poStatuses=['draft','pending_approval','approved','partially_received','closed','cancelled'];
 for(let i=1;i<=24;i++) push(rows,'purchase_requests',`pr_${String(i).padStart(3,'0')}`,{request_id:`pr_${String(i).padStart(3,'0')}`,sppg_id:'sppg_nakala',request_date:addDays(TODAY,-12+i),needed_date:addDays(TODAY,-10+i),status:prStatuses[i%prStatuses.length],requested_by:i%2?'user_akuntan':'user_inventory',approved_by:['approved','converted_to_po'].includes(prStatuses[i%prStatuses.length])?'user_kepala_sppg':''});
 for(let i=1;i<=18;i++){ const vendor=suppliers[(i-1)%suppliers.length][0],status=poStatuses[i%poStatuses.length],subtotal=2500000+i*840000,tax=i%3===0?Math.round(subtotal*.11):0,poId=`po_${String(i).padStart(3,'0')}`; push(rows,'purchase_orders',poId,{po_id:poId,vendor_id:vendor,po_date:addDays(TODAY,-10+i),delivery_date:addDays(TODAY,-8+i),status,workflow_state:status,subtotal,tax,total:subtotal+tax,approval_status:['draft','pending_approval'].includes(status)?'pending':status==='cancelled'?'cancelled':'approved',created_by:'user_akuntan',request_id:`pr_${String(i).padStart(3,'0')}`}); for(let line=1;line<=3;line++){ const idx=(i*line*7)%defs.length,it=defs[idx],itemId=`item_${String(idx+1).padStart(3,'0')}_${slug(it.name)}`,qty=25+(i+line)*8,unit_price=moneyRound(it.cost*(1+(line%4)*.05)); push(rows,'purchase_order_items',`poi_${String(i).padStart(3,'0')}_${line}`,{po_item_id:`poi_${String(i).padStart(3,'0')}_${line}`,po_id:poId,item_id:itemId,qty,unit:it.unit,unit_price,total_price:qty*unit_price}); if(!['draft','pending_approval','cancelled'].includes(status) && (status!=='partially_received'||line<3)){ const rejected=i%5===0?line:0; push(rows,'receiving_records',`recv_${String(i).padStart(3,'0')}_${line}`,{receiving_id:`recv_${String(i).padStart(3,'0')}_${line}`,po_id:poId,item_id:itemId,received_qty:qty,rejected_qty:rejected,qc_status:rejected?'partial_pass':i%7===0?'pending':'pass',temperature:it.storage==='chiller'?`${2+line}C`:'',photo_url:`svg://sipagi/receiving/${poId}/${line}`,received_by:'user_inventory',received_at:`${addDays(TODAY,-7+i)} 08:${String(10+line).padStart(2,'0')}:00 GMT+7`}); }} if(!['draft','pending_approval','cancelled'].includes(status)){ const invStatus=i%4===0?'pending':i%5===0?'discrepancy':i%3===0?'posted':'lunas'; push(rows,'supplier_invoices',`inv_${String(i).padStart(3,'0')}`,{invoice_id:`inv_${String(i).padStart(3,'0')}`,vendor_id:vendor,po_id:poId,invoice_number:`INV/SIPAGI/${PERIOD.replace('-','')}/${String(i).padStart(3,'0')}`,invoice_date:addDays(TODAY,-6+i),amount:subtotal+tax,payment_status:invStatus,file_url:`https://drive.google.com/mock/sipagi-invoice-${String(i).padStart(3,'0')}.pdf`}); }}
}
function seedFinance(rows){
 const accounts=[['acc_bank_bri','1101','Bank BRI Operasional','kas'],['acc_kas_tunai','1102','Kas Tunai SPPG','kas'],['acc_piutang_dana','1201','Piutang Dana Program','aset'],['acc_aset_dapur','1301','Aset Peralatan Dapur','aset'],['acc_aset_kendaraan','1302','Aset Kendaraan Distribusi','aset'],['acc_utang_supplier','2101','Utang Supplier','utang'],['acc_utang_pajak','2102','Utang Pajak','utang'],['acc_pendanaan_mbg','4101','Pendanaan MBG','pendapatan'],['acc_belanja_bahan','5101','Belanja Bahan Pangan','biaya'],['acc_belanja_kemasan','5102','Belanja Kemasan','biaya'],['acc_gaji_honor','5201','Gaji dan Honor','biaya'],['acc_operasional','5301','Operasional Dapur','biaya']]; accounts.forEach(([account_id,account_code,account_name,type])=>push(rows,'accounts',account_id,{account_id,account_code,account_name,type,status:'aktif'}));
 ['inventory','purchasing','operational','finance','hr','distribution','compliance','maintenance','school','reports'].forEach((module,i)=>{ const budget=18000000+i*11500000,actual=Math.round(budget*(.58+(i%5)*.08)); push(rows,'budgets',`budget_${module}_${PERIOD}`,{budget_id:`budget_${module}_${PERIOD}`,period:PERIOD,module,budget_amount:budget,actual_amount:actual,variance_amount:budget-actual,status:i%6===0?'pending':'aktif'}); });
 push(rows,'finance_transactions','trx_dana_masuk_001',{transaction_id:'trx_dana_masuk_001',date:'2026-05-01',account_id:'acc_bank_bri',type:'debit',amount:425000000,description:'Dana program MBG Mei 2026 | Kategori: pendanaan | Cost center: kepala sppg | Metode: VA | Approval: approved',reference_type:'monthly_report',reference_id:'monthly_202605',created_by:'user_akuntan'});
 for(let i=1;i<=80;i++){ const credit=i%4!==0, account=credit?['acc_belanja_bahan','acc_belanja_kemasan','acc_operasional','acc_gaji_honor'][i%4]:'acc_kas_tunai'; push(rows,'finance_transactions',`trx_${String(i).padStart(3,'0')}`,{transaction_id:`trx_${String(i).padStart(3,'0')}`,date:addDays(TODAY,-20+i%20),account_id:account,type:credit?'credit':'debit',amount:moneyRound(125000+i*73500),description:`Transaksi ${credit?'pengeluaran':'kas masuk'} operasional ${i} | Kategori: ${credit?'biaya':'kas kecil'} | Cost center: ${i%2?'inventory':'operational'} | Metode: ${i%3?'transfer':'tunai'} | Approval: ${i%9===0?'menunggu':'approved'}`,reference_type:i%5===0?'supplier_invoice':i%4===0?'petty_cash':'manual',reference_id:i%5===0?`inv_${String(i%18+1).padStart(3,'0')}`:`REF-${String(i).padStart(3,'0')}`,created_by:'user_akuntan'}); }
 const assetTypes=[['Oven Combi 20 Tray','Peralatan Dapur','Area Produksi Panas',87500000],['Rice Cooker Industrial','Peralatan Dapur','Area Karbohidrat',28000000],['Chiller 4 Pintu','Cold Storage','Chiller Room',42000000],['Freezer Chest 600 Liter','Cold Storage','Freezer Room',18500000],['Meja Stainless 2 Meter','Furniture Dapur','Area Prep',6500000],['Rak Gudang Heavy Duty','Gudang','Gudang Kering A',4800000],['Mobil Box Pendingin','Kendaraan Distribusi','Garasi SPPG',238000000],['Motor Distribusi Box','Kendaraan Distribusi','Garasi SPPG',32000000],['Timbangan Digital 150kg','QC dan Timbang','Receiving',3250000],['Termometer Probe Digital','QC dan Food Safety','QC Penerimaan',750000]];
 for(let i=1;i<=40;i++){ const [name,category,location,value]=assetTypes[(i-1)%assetTypes.length],condition=['baik','baik','perlu servis','rusak ringan','kalibrasi due'][i%5],assetId=`asset_${String(i).padStart(3,'0')}`; push(rows,'assets',assetId,{asset_id:assetId,name:`AST-${String(i).padStart(3,'0')} - ${name}`,category,purchase_date:addDays('2026-01-15',i*3),purchase_value:value+i*125000,condition,location:`${location} | SN SIP-${260000+i} | PIC ${i%2?'Yusuf Hakim':'Fajar Maulana'} | Umur ${36+i%48} bulan`,status:i%17===0?'nonaktif':'aktif'}); if(i%3===0){ const maintenance_id=`maint_${String(i).padStart(3,'0')}`; const maintenance={maintenance_id,asset_id:assetId,maintenance_date:addDays(TODAY,-i%18),type:i%2?'servis':'kalibrasi',vendor:i%2?'CV Teknik Dapur Jogja':'Internal QC',cost:moneyRound(150000+i*42000),finding:condition==='baik'?'Pengecekan rutin, aman digunakan':`Tindak lanjut kondisi ${condition}`,next_schedule:addDays(TODAY,30+i),status:i%5===0?'proses':'selesai',created_by:'user_akuntan',created_at:NOW}; push(rows,'settings',maintenance_id,{setting_id:maintenance_id,key:`finance_asset_maintenance_${maintenance_id}`,value:JSON.stringify(maintenance),description:'Fallback log maintenance aset Finance sampai sheet asset_maintenance tersedia',updated_at:NOW,updated_by:USER_ID}); } }
 for(let i=1;i<=16;i++) push(rows,'payments',`pay_${String(i).padStart(3,'0')}`,{payment_id:`pay_${String(i).padStart(3,'0')}`,invoice_id:`inv_${String(i).padStart(3,'0')}`,payment_date:addDays(TODAY,-5+i),amount:moneyRound(2500000+i*840000),method:i%4===0?'tunai':'transfer',status:i%5===0?'proses':'dibayar',proof_url:`https://drive.google.com/mock/payment-${String(i).padStart(3,'0')}.pdf`});
}
function seedOperations(rows,defs){
 const menus=['Nasi Ayam Katsu Saus Barbeque','Nasi Telur Semur Sayur Bening','Nasi Ikan Kembung Balado','Nasi Tahu Tempe Orek','Nasi Ayam Teriyaki','Nasi Lele Goreng Sayur Sop','Nasi Daging Giling Bolognese','Nasi Sarden Tumis Tomat','Nasi Nugget Tahu Sayur','Nasi Ayam Kari'];
 menus.forEach((name,i)=>{ const recipeId=`recipe_${String(i+1).padStart(3,'0')}`; push(rows,'recipes',recipeId,{recipe_id:recipeId,name,portion_size:'650 kkal anak SD',target_age_group:i%2?'SMP':'SD',nutrition_target_json:JSON.stringify({energy_kcal:650+i*12,protein_g:22+i,carb_g:88,fat_g:18}),status:i%7===0?'review':'aktif',created_by:'user_gizi'}); for(let line=1;line<=5;line++){ const idx=(i*11+line*3)%defs.length,it=defs[idx]; push(rows,'recipe_components',`comp_${String(i+1).padStart(3,'0')}_${line}`,{component_id:`comp_${String(i+1).padStart(3,'0')}_${line}`,recipe_id:recipeId,item_id:`item_${String(idx+1).padStart(3,'0')}_${slug(it.name)}`,qty_per_portion:line===1?.18:Number((.015+line*.012).toFixed(3)),unit:it.unit,notes:line===1?'komponen utama':'komponen pendukung'}); } push(rows,'nutrition_checks',`nutri_${String(i+1).padStart(3,'0')}`,{check_id:`nutri_${String(i+1).padStart(3,'0')}`,recipe_id:recipeId,score:82+i,protein_g:21+i,carb_g:86+i,fat_g:17+i/2,fiber_g:4+i/3,warning_json:JSON.stringify(i%3===0?{allergen:'telur',action:'label wajib'}:{}),checked_by:'user_gizi',checked_at:NOW}); });
 for(let i=1;i<=14;i++){ push(rows,'production_batches',`prod_${String(i).padStart(3,'0')}`,{batch_id:`prod_${String(i).padStart(3,'0')}`,recipe_id:`recipe_${String(i%10+1).padStart(3,'0')}`,target_portion:1200+i*25,actual_portion:1190+i*24,start_time:`${addDays(TODAY,-3+i%4)} 04:30:00 GMT+7`,end_time:`${addDays(TODAY,-3+i%4)} 08:15:00 GMT+7`,temperature:`${72+i%6}C`,qc_status:i%6===0?'pending':i%9===0?'failed':'pass',created_by:'user_produksi'}); push(rows,'portion_batches',`portion_${String(i).padStart(3,'0')}`,{portion_id:`portion_${String(i).padStart(3,'0')}`,production_batch_id:`prod_${String(i).padStart(3,'0')}`,target_portion:1200+i*25,actual_portion:1188+i*24,variance:-1*(i%8),created_by:'user_packing',created_at:NOW}); }
 for(let i=1;i<=10;i++) push(rows,'cleaning_checklists',`cleaning_${String(i).padStart(3,'0')}`,{cleaning_id:`cleaning_${String(i).padStart(3,'0')}`,area:['Receiving','Prep','Produksi Panas','Packing','Gudang'][i%5],shift:['pagi','siang','malam'][i%3],checklist_json:JSON.stringify({lantai:'bersih',meja:'sanitasi selesai',alat:'dicuci 3 bak',ompreng_return:700+i*12}),status:i%4===0?'perlu cek ulang':'selesai',photo_url:`svg://sipagi/cleaning/${i}`,checked_by:'user_cleaning',checked_at:NOW});
}
function seedSchools(rows){
 const schools=[['school_sdn_karangbendo','SDN Karangbendo','20400311','Karangbendo, Banguntapan','Siti Aminah','081288810001','R-A1',420],['school_mi_miftahul','MI Miftahul Huda','60714021','Potorono, Banguntapan','Nur Hayati','081288810002','R-A2',310],['school_smp_banguntapan','SMP 3 Banguntapan','20400418','Jambidan, Banguntapan','Agus Widodo','081288810003','R-B1',510],['school_sdn_baturetno','SDN Baturetno','20400322','Baturetno, Banguntapan','Rini Wulandari','081288810004','R-B2',365],['school_tk_pelangi','TK Pelangi Anak','69981231','Potorono, Bantul','Maya Sari','081288810005','R-C1',180],['school_sdn_jambidan','SDN Jambidan','20400377','Jambidan, Banguntapan','Sugeng Riyadi','081288810006','R-C2',295],['school_mts_nurul','MTs Nurul Huda','20499121','Banguntapan','Ika Rahmawati','081288810007','R-D1',440],['school_slb_harapan','SLB Harapan Bangsa','20488765','Bantul','Eko Purnomo','081288810008','R-D2',120]];
 schools.forEach(([school_id,name,npsn,address,pic_name,pic_phone,route_code,beneficiary_count],idx)=>{ push(rows,'schools',school_id,{school_id,sppg_id:'sppg_nakala',name,npsn,address,pic_name,pic_phone,route_code,beneficiary_count,status:'aktif'}); for(let i=1;i<=3;i++) push(rows,'beneficiaries',`ben_${idx+1}_${i}`,{beneficiary_id:`ben_${idx+1}_${i}`,school_id,name:`Siswa ${name.split(' ')[0]} ${i}`,grade:String((i+idx)%6+1),class_name:`${(i+idx)%6+1}${String.fromCharCode(64+i)}`,nutrition_status:i===2?'risiko kurang energi':'normal',allergy_notes:i===3?'telur':'tidak ada',status:'aktif'}); });
 for(let i=1;i<=16;i++){ const s=schools[(i-1)%schools.length]; push(rows,'packing_batches',`packing_${String(i).padStart(3,'0')}`,{packing_id:`packing_${String(i).padStart(3,'0')}`,portion_id:`portion_${String(i%14+1).padStart(3,'0')}`,school_id:s[0],pack_count:s[7],label_code:`PKG-${s[6]}-${String(i).padStart(3,'0')}`,status:i%7===0?'hold_qc':'ready_dispatch',created_at:NOW}); push(rows,'dispatch_orders',`dispatch_${String(i).padStart(3,'0')}`,{dispatch_id:`dispatch_${String(i).padStart(3,'0')}`,school_id:s[0],packing_id:`packing_${String(i).padStart(3,'0')}`,driver_user_id:'user_distribusi',route_code:s[6],portion_qty:s[7],status:i%6===0?'delayed':i%9===0?'cancelled':'delivered',eta:`${TODAY} 10:${String(20+i).padStart(2,'0')}:00 GMT+7`,delivered_at:i%9===0?'':`${TODAY} 10:${String(25+i).padStart(2,'0')}:00 GMT+7`}); push(rows,'delivery_receipts',`receipt_${String(i).padStart(3,'0')}`,{receipt_id:`receipt_${String(i).padStart(3,'0')}`,dispatch_id:`dispatch_${String(i).padStart(3,'0')}`,school_id:s[0],received_qty:i%6===0?s[7]-3:s[7],received_by:s[4],received_at:`${TODAY} 10:${String(30+i).padStart(2,'0')}:00 GMT+7`,photo_url:`svg://sipagi/receipt/${i}`,feedback_status:i%6===0?'selisih':'ok',notes:i%6===0?'Ada selisih saat penerimaan sekolah':'Jumlah sesuai surat jalan'}); if(i%6===0){ push(rows,'school_feedback',`feedback_${String(i).padStart(3,'0')}`,{feedback_id:`feedback_${String(i).padStart(3,'0')}`,school_id:s[0],dispatch_id:`dispatch_${String(i).padStart(3,'0')}`,rating:3,category:'pengiriman',message:'Ada selisih porsi saat penerimaan',created_by:s[4],created_at:NOW,status:'open'}); push(rows,'incidents',`incident_${String(i).padStart(3,'0')}`,{incident_id:`incident_${String(i).padStart(3,'0')}`,school_id:s[0],dispatch_id:`dispatch_${String(i).padStart(3,'0')}`,type:'selisih_porsi',severity:'medium',description:'Selisih porsi perlu investigasi',photo_url:`svg://sipagi/incident/${i}`,status:'investigasi',created_at:NOW}); }}
}
function seedReports(rows){
 for(let i=1;i<=10;i++) push(rows,'daily_reports',`daily_${String(i).padStart(3,'0')}`,{report_id:`daily_${String(i).padStart(3,'0')}`,sppg_id:'sppg_nakala',report_date:addDays(TODAY,-10+i),target_portion:2600,delivered_portion:2580+i,qc_summary:i%4===0?'Ada pending QC bahan masuk':'QC produksi lulus',waste_summary:i%3===0?'Waste sayur meningkat':'Waste dalam batas',issue_summary:i%5===0?'Distribusi terlambat satu rute':'Tidak ada isu mayor',status:i%2?'submitted':'approved',created_at:NOW});
 push(rows,'monthly_reports','monthly_202605',{report_id:'monthly_202605',sppg_id:'sppg_nakala',period:PERIOD,summary_json:JSON.stringify({target_portion:78000,delivered_portion:77340,waste_value:4850000,finance_status:'menunggu rekonsiliasi'}),file_url:'https://drive.google.com/mock/monthly-202605.pdf',status:'submitted'});
 push(rows,'bgn_reports','bgn_202605_bantul',{report_id:'bgn_202605_bantul',period:PERIOD,region:'Bantul Timur',coverage_school:8,coverage_portion:77340,compliance_score:91,incident_count:3,file_url:'https://drive.google.com/mock/bgn-202605.pdf',created_at:NOW});
 push(rows,'regional_kpis','kpi_202605_bantul',{kpi_id:'kpi_202605_bantul',period:PERIOD,region:'Bantul Timur',schools_total:8,portions_total:77340,ontime_rate:.91,qc_pass_rate:.94,waste_value:4850000});
 push(rows,'ai_runs','ai_run_inventory_forecast',{ai_run_id:'ai_run_inventory_forecast',use_case:'forecast_bahan',input_ref_type:'items',input_ref_id:'all',model_name:'sipagi-rule-engine',status:'completed',result_json:JSON.stringify({critical:40,reorder:40,batch_check:40}),created_by:'user_kepala_sppg',created_at:NOW});
 push(rows,'ai_recommendations','ai_rec_restock_critical',{recommendation_id:'ai_rec_restock_critical',ai_run_id:'ai_run_inventory_forecast',module:'inventory',priority:'high',title:'Restok bahan kritis',recommendation:'Prioritaskan PR untuk bahan status Kritis dan Habis sebelum produksi besok.',status:'open',created_at:NOW});
 push(rows,'anomaly_flags','anom_pending_qc_batch',{flag_id:'anom_pending_qc_batch',module:'inventory',entity_type:'stock_batches',entity_id:'multiple',severity:'high',reason:'Batch perlu cek dan opname pending terdeteksi setelah seed.',status:'open',created_at:NOW});
 push(rows,'exports','export_laporan_stok_202605',{export_id:'export_laporan_stok_202605',report_type:'Laporan Stok',format:'PDF',file_url:'https://drive.google.com/mock/laporan-stok-202605.pdf',requested_by:'user_kepala_sppg',created_at:NOW,status:'generated'});
}

function buildRows() {
    const rows = [];
    seedCore(rows);
    const defs = seedInventory(rows);
    seedPurchasing(rows, defs);
    seedFinance(rows);
    seedOperations(rows, defs);
    seedSchools(rows);
    seedReports(rows);
    push(rows, 'settings', 'setting_seed_summary', {
        setting_id: 'setting_seed_summary',
        key: 'seed_summary',
        value: JSON.stringify({ version: '2026-05-12', items: 200, suppliers: 10, assets: 40 }),
        description: 'Ringkasan reset dan seed SIPAGI',
        updated_at: NOW,
        updated_by: USER_ID
    });
    return rows;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(label, fn) {
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            process.stdout.write('\nretry ' + label + ' ' + attempt + ': ' + String(error.message || error).slice(0, 90) + '\n');
            await sleep(1200 * attempt);
        }
    }
    throw lastError;
}

async function clearSheet(sheet, idField) {
    let payload;
    try {
        payload = await withRetry('list ' + sheet, () => getSheetRows(sheet));
    } catch (error) {
        if (String(error.message || error).includes('Invalid sheet')) {
            unavailableSheets.add(sheet);
            process.stdout.write(' ' + sheet + ':skip invalid\n');
            return 0;
        }
        throw error;
    }
    let deleted = 0;
    for (const row of payload.rows || []) {
        const id = row[idField];
        if (!id) continue;
        await withRetry('delete ' + sheet + ':' + id, () => deleteSheetRow(sheet, id, idField, USER_ID));
        deleted += 1;
        process.stdout.write('-');
        if (deleted % 20 === 0) await sleep(500);
    }
    return deleted;
}

async function main() {
    const rows = buildRows();
    const deleted = {};
    console.log('Reset ' + resetSheets.length + ' sheet lalu seed ' + rows.length + ' baris...');
    for (const sheet of resetSheets) {
        deleted[sheet] = await clearSheet(sheet, idFields[sheet]);
        process.stdout.write(' ' + sheet + ':' + deleted[sheet] + '\n');
    }

    const results = [];
    for (const entry of rows) {
        if (!idFields[entry.sheet] || unavailableSheets.has(entry.sheet)) continue;
        try {
            await withRetry('upsert ' + entry.sheet + ':' + entry.id, () => upsertSheetRow(entry.sheet, entry.id, entry.row, idFields[entry.sheet], USER_ID));
        } catch (error) {
            if (String(error.message || error).includes('Invalid sheet')) {
                unavailableSheets.add(entry.sheet);
                process.stdout.write('\nskip sheet invalid ' + entry.sheet + '\n');
                continue;
            }
            throw error;
        }
        results.push(entry);
        process.stdout.write('.');
        if (results.length % 40 === 0) await sleep(500);
    }
    process.stdout.write('\n');

    const counts = {};
    for (const sheet of resetSheets) {
        try {
            if (unavailableSheets.has(sheet)) {
                counts[sheet] = 'skip invalid';
                continue;
            }
            counts[sheet] = (await withRetry('count ' + sheet, () => getSheetRows(sheet))).rows?.length || 0;
        } catch (error) {
            counts[sheet] = 'error: ' + error.message;
        }
    }

    const summary = {
        deleted,
        seeded: results.length,
        intended: {
            items: 200,
            suppliers: 10,
            assets: 40,
            finance_transactions: 81,
            purchase_requests: 24,
            purchase_orders: 18
        },
        counts
        ,
        unavailableSheets: [...unavailableSheets]
    };
    await fs.mkdir('outputs', { recursive: true });
    await fs.writeFile('outputs/sipagi-reset-seed-summary.json', JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
}

await main();
