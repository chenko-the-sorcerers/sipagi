# SIPAGI Google Spreadsheet + GAS Database Setup

File GAS: `gas/Code.gs`

Target Spreadsheet:

`https://docs.google.com/spreadsheets/d/1TYaUqNY92msVzjk3vo3PNi1XEYxvs5lYaBTLi5_Oq2U/edit`

Cara pakai:

1. Buat Google Spreadsheet baru untuk database SIPAGI.
2. Buka `Extensions > Apps Script`.
3. Paste isi `gas/Code.gs`.
4. Save project.
5. Jalankan function `setupSipagiDatabase`.
6. Izinkan permission dari Google.
7. Kembali ke Spreadsheet, semua sheet database SIPAGI akan dibuat otomatis.
8. Deploy Apps Script sebagai Web App.
9. Pastikan akses Web App diset ke user yang dibutuhkan, atau `Anyone` untuk MVP testing.
10. Buka URL `/exec?action=health` dan pastikan response JSON `ok: true`.

Script membuat:

- Core user access: `users`, `roles`, `role_permissions`, `audit_logs`, `notifications`, `settings`.
- Master data: `sppg_units`, `schools`, `beneficiaries`, `vendors`, `items`.
- ERP core: inventory, purchasing, finance, HR, operational.
- Stakeholder portal: school, BGN, supplier.
- Intelligence layer: AI runs, recommendations, anomaly flags.
- Reporting: daily reports, monthly reports, exports.
- `_schema_index` sebagai daftar semua sheet dan kolom.

Catatan build:

- Spreadsheet ini cocok untuk MVP dan admin panel awal.
- Untuk production besar, schema ini bisa dimigrasikan ke PostgreSQL/Supabase/Firebase dengan nama tabel dan field yang sama.
- Setiap create/update/delete penting harus menulis ke `audit_logs`.
- File dan foto bukti sebaiknya disimpan di Google Drive, lalu URL-nya dicatat di field `photo_url`, `file_url`, atau `proof_url`.

Endpoint yang dipakai app saat ini:

`https://script.google.com/macros/s/AKfycbwefvZxPKsEX6Bm3jBgX99-HdIR_H6t481ce_UXV1RE7O4fiBhkS-2XUAO2cI6fp_u4/exec`

API actions:

- `GET ?action=health`
- `GET ?action=setup`
- `GET ?action=migrate`
- `GET ?action=schema`
- `GET ?action=tables`
- `GET ?action=list&sheet=items`
- `GET ?action=list&sheet=items&q=beras&limit=10`
- `GET ?action=get&sheet=items&id=I-00001`
- `POST { "action": "create", "sheet": "items", "row": { ... } }`
- `POST { "action": "bulk_create", "sheet": "items", "rows": [{ ... }] }`
- `POST { "action": "update", "sheet": "items", "id": "I-00001", "row": { ... } }`
- `POST { "action": "upsert", "sheet": "items", "id": "I-00001", "row": { ... } }`
- `POST { "action": "delete", "sheet": "items", "id": "I-00001" }`

Important:

- Kalau Apps Script dibuat langsung dari Spreadsheet, `SPREADSHEET_ID` boleh dikosongkan.
- `SIPAGI_CONFIG.SPREADSHEET_ID` sekarang sudah diarahkan ke spreadsheet target di atas.
- Kalau Apps Script standalone tanpa target, `SPREADSHEET_ID` boleh dikosongkan. Script akan membuat Google Spreadsheet baru bernama `SIPAGI Database`, lalu menyimpan ID-nya di Script Properties.
- `GET ?action=setup` atau function `setupSipagiDatabase()` akan membuat semua sheet dulu.
- `GET ?action=migrate` atau function `migrateSipagiSchema()` menambahkan kolom baru tanpa menghapus data lama.
- `GET ?action=sheets` akan menampilkan sheet aktual yang sudah dibuat.
- Delete memakai soft delete jika sheet punya kolom `status`.
