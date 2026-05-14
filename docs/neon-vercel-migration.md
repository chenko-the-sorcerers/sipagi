# SIPAGI Neon + Vercel Migration Plan

## Target

- Frontend tetap di Vercel.
- Vercel API routes menjadi pintu data utama.
- Neon Postgres menjadi database utama multi-SPPG.
- Prisma menjadi ORM dan schema contract.
- GAS tetap sementara untuk import/export Google Sheets.
- File QC, invoice, receipt, label, dan dokumen pindah ke Vercel Blob atau Supabase Storage.

## Multi-SPPG Rule

Semua data operasional wajib punya `sppgId`, kecuali data global seperti `roles`, `role_permissions`, dan katalog nasional. Dengan pola ini, 10 SPPG cukup di satu database tanpa data tercampur.

## Migration Order

1. Isi `DATABASE_URL` Neon.
2. Jalankan `npm run db:generate`.
3. Jalankan `npm run db:push`.
4. Seed minimal `sppg_units`, `roles`, dan `role_permissions`.
5. Migrasi modul rendah risiko: Settings, Supplier, School.
6. Migrasi modul transaksi: Inventory, Purchasing, Finance.
7. Migrasi modul operasional: Production, QC Gizi, Packing, Distribution.
8. Setelah stabil, GAS hanya dipakai untuk import/export dan backup spreadsheet.

## Frontend Cutover

```html
<script>
  window.SIPAGI_DATA_SOURCE = 'api';
  window.SIPAGI_ACTIVE_SPPG_ID = 'sppg_nakala';
</script>
```

Service module dipindahkan bertahap dari `googleSheetsApi.js` ke `sipagiDataClient.js`.

## Next Build Tasks

- Endpoint workflow approval awal sudah tersedia:
  - `POST /api/workflows/role-permissions`
  - `POST /api/workflows/inventory-material`
  - `POST /api/workflows/procurement`
- Auth session awal sudah tersedia:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Supabase Storage adapter awal sudah tersedia:
  - `POST /api/storage/upload`
- Tambah migration script GAS ke Neon per sheet.
- Tambah audit log otomatis di setiap create/update/delete.

## Auth Demo

Seed membuat user demo `kepala@sipagi.local`. Password diambil dari `SIPAGI_DEMO_PASSWORD` pada `.env`.

Login page tersedia di SPA utama. Setelah login, role aktif mengikuti role session dari `/api/auth/me`.

## Security Layers

- API data utama dilindungi session cookie.
- Request programmatic seperti `curl` dapat memakai header `x-sipagi-api-key`.
- Route UI memakai alias hash seperti `#r-a91d0c`, dengan fallback agar route lama tetap terbaca.
- Endpoint GAS tidak lagi ditanam di frontend. Frontend hanya memanggil `/api/bridge/gas`.
- Inspect element tidak bisa benar-benar dimatikan oleh browser, tetapi shortcut umum dan context menu sudah diblok sebagai deterrent. Keamanan data tetap berada di server/API.

## Storage Note

Untuk upload dokumen privat di production, isi `SUPABASE_SERVICE_ROLE_KEY` di environment Vercel. Publishable key hanya aman untuk client-side policy yang memang dibuka lewat RLS/storage policy.
