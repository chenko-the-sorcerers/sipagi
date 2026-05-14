export const roleDashboardRoles = [
    { id: 'kepala-sppg', label: 'Kepala SPPG' },
    { id: 'admin-pengadaan-keuangan', label: 'Admin Pengadaan / Keuangan' },
    { id: 'ahli-gizi', label: 'Ahli Gizi' },
    { id: 'pengadaan', label: 'Akuntan / Pengadaan' },
    { id: 'distribusi', label: 'Asisten Lapangan / Distribusi' },
    { id: 'produksi', label: 'Produksi' },
    { id: 'pemorsian-packing', label: 'Pemorsian / Packing' },
    { id: 'pencuci-kebersihan', label: 'Pencuci / Kebersihan' },
    { id: 'sekolah', label: 'Sekolah' },
    { id: 'bgn', label: 'BGN' },
    { id: 'supplier', label: 'Supplier' }
];

export const roleDashboards = {
    'kepala-sppg': {
        title: 'Dashboard Kepala SPPG',
        subtitle: 'Ringkasan kinerja dan operasional SPPG',
        dateLabel: 'Minggu, 10 Mei 2026',
        contextLabel: 'SPPG Nakala',
        lastSync: 'Sinkron 09:35 WIB',
        aiQuestion: 'kenapa produksi turun kemarin?',
        aiTitle: 'Kenapa produksi turun kemarin?',
        aiSummary: 'Produksi turun terutama karena keterlambatan bahan baku protein dan satu temuan QC yang menahan proses persiapan.',
        quickActions: [
            { label: 'Persetujuan', icon: 'ki-check-circle', tone: 'primary', target: '#inventory/master-bahan-baku' },
            { label: 'Distribusi Hari Ini', icon: 'ki-delivery', tone: 'success', target: '#operational' },
            { label: 'QC Bahan Baku', icon: 'ki-shield-tick', tone: 'warning', target: '#inventory/penerimaan-bahan-baku' },
            { label: 'Laporan Harian', icon: 'ki-document', tone: 'secondary', target: '#reports' }
        ],
        metrics: [
            { label: 'Produksi Hari Ini', value: '4.832', unit: 'porsi', note: '96,6% dari target', tone: 'primary' },
            { label: 'Distribusi Hari Ini', value: '4.512', unit: 'porsi', note: '94,0% on-time', tone: 'success' },
            { label: 'Sisa Stok Bahan Baku', value: '3,2', unit: 'hari', note: 'Aman >= 2 hari', tone: 'success' },
            { label: 'Tingkat QC Lolos', value: '98,1%', unit: '', note: 'Standar > 95%', tone: 'success' },
            { label: 'Kepatuhan Sanitasi', value: '96,3%', unit: '', note: 'Gudang bahan kering perlu cek', tone: 'warning' },
            { label: 'Kepuasan Penerima', value: '4,7', unit: '/ 5', note: '128 penilaian', tone: 'success' }
        ],
        chart: {
            title: 'Trend Produksi vs Distribusi',
            subtitle: '7 hari terakhir',
            labels: ['4 Mei', '5 Mei', '6 Mei', '7 Mei', '8 Mei', '9 Mei', '10 Mei'],
            series: [
                { label: 'Produksi', color: 'primary', values: [5120, 5210, 5340, 5180, 5010, 4620, 4832] },
                { label: 'Distribusi', color: 'success', values: [4780, 4910, 5020, 4870, 4740, 4210, 4512] }
            ]
        },
        sections: [
            { type: 'queue', title: 'Prioritas & Perhatian', badge: '4', items: [
                ['12 persetujuan menunggu review', 'PO, Distribusi, dan Laporan', 'warning'],
                ['Stok bahan baku mendekati minimum', '3 item perlu pembelian', 'warning'],
                ['QC bahan baku tidak lolos', '2 batch perlu tindak lanjut', 'danger'],
                ['Kepatuhan sanitasi di bawah standar', 'Area gudang bahan kering', 'warning']
            ] },
            { type: 'queue', title: 'Pusat Pengecualian', badge: '3', items: [
                ['Distribusi terlambat', '2 pengantaran', 'danger'],
                ['Suhu penyimpanan tidak sesuai', '1 unit chiller', 'warning'],
                ['Menu tidak sesuai rencana', '1 kejadian', 'warning']
            ] },
            { type: 'approval', title: 'Detail Persetujuan', rows: [
                ['PO Bahan Baku', '8', 'Review'],
                ['Distribusi', '3', 'Review'],
                ['Laporan Harian', '1', 'Review']
            ] },
            { type: 'progress', title: 'Sanitasi & Kebersihan', rows: [
                ['Dapur Produksi', 98, 'success'],
                ['Ruang Pengemasan', 95, 'success'],
                ['Gudang Bahan Kering', 92, 'warning'],
                ['Kendaraan Distribusi', 99, 'success']
            ] },
            { type: 'table', title: 'QC Bahan Baku Hari Ini', columns: ['Parameter', 'Diperiksa', 'Lolos', 'Status'], rows: [
                ['Kesegaran', '18', '18', 'Aman'],
                ['Organoleptik', '18', '17', 'Perhatian'],
                ['Suhu', '12', '12', 'Aman'],
                ['Kemasan', '15', '15', 'Aman']
            ] },
            { type: 'activity', title: 'Aktivitas Terbaru', rows: [
                ['Distribusi ke SDN 01 selesai', '09:20', 'Selesai'],
                ['QC ayam potong tidak lolos', '08:45', 'Tidak Lolos'],
                ['Persetujuan PO bahan baku', '08:30', 'Review'],
                ['Produksi menu dimulai', '07:15', 'Selesai']
            ] },
            { type: 'snapshot', title: 'Snapshot Bisnis Minggu Ini', rows: [
                ['Total Produksi', '32.124 porsi', '+4,6%'],
                ['Total Distribusi', '30.812 porsi', '+4,1%'],
                ['Rata-rata Kehadiran', '98,1%', '+1,2%'],
                ['Biaya Operasional', 'Rp 68.450.000', '+2,3%']
            ] }
        ],
        ai: {
            changed: ['Penerimaan ayam tiba 52 menit lebih lambat dari jadwal.', 'QC menemukan 1 batch sayuran tidak aman.', 'Distribusi rute SDN 12 lebih lambat 28 menit.'],
            caused: ['Keterlambatan bahan baku protein memicu bottleneck persiapan.', 'Penolakan QC membuat jadwal produksi mundur.'],
            impact: ['Produksi turun 1.240 porsi dibanding target.', '2 sekolah menerima distribusi dengan keterlambatan > 30 menit.'],
            recommendations: ['Review SLA pemasok bahan baku utama.', 'Siapkan buffer bahan protein untuk menu berisiko tinggi.', 'Follow-up sanitasi dan QC pada batch terkait.'],
            sources: ['production_batches', 'receiving_records', 'nutrition_checks', 'dispatch_orders']
        }
    },
    'admin-pengadaan-keuangan': {
        title: 'Dashboard Admin Pengadaan / Keuangan',
        subtitle: 'Ringkasan kinerja pengadaan, keuangan, dan persediaan secara real-time',
        dateLabel: 'Tahun Anggaran 2026',
        contextLabel: 'SPPG Nakala',
        lastSync: 'Sinkron 09:20 WIB',
        aiQuestion: 'apa yang berubah pada belanja minggu ini?',
        aiTitle: 'Kenapa belanja naik?',
        aiSummary: 'Kenaikan belanja dipicu pembelian protein, replenishment stok aman, dan penerimaan tertunda yang masuk bersamaan.',
        quickActions: [
            { label: 'Buat PR', icon: 'ki-plus', tone: 'primary', target: '#inventory/kebutuhan-bahan-harian' },
            { label: 'Cek Supplier', icon: 'ki-cheque', tone: 'success', target: '#supplier/daftar-supplier' },
            { label: 'Catat Penerimaan', icon: 'ki-delivery', tone: 'info', target: '#inventory/penerimaan-bahan-baku' },
            { label: 'Catat Pembayaran', icon: 'ki-dollar', tone: 'warning', modal: 'payment' },
            { label: 'Laporan Keuangan', icon: 'ki-document', tone: 'secondary', target: '#finance' }
        ],
        metrics: [
            { label: 'PR Dibuat', value: '28', unit: '', note: '8 menunggu persetujuan', tone: 'warning' },
            { label: 'PO Diterbitkan', value: '15', unit: '', note: '3 perlu tindak lanjut', tone: 'warning' },
            { label: 'Penerimaan', value: '12', unit: '', note: 'Rp 412 jt diterima', tone: 'primary' },
            { label: 'Pembayaran', value: '7', unit: '', note: 'Rp 173 jt jatuh tempo', tone: 'danger' }
        ],
        budget: [
            ['Pagu Anggaran', 'Rp 10,80 M', '100% dari pagu'],
            ['Realisasi Belanja', 'Rp 4,82 M', '44,6% MTD'],
            ['Sisa Anggaran', 'Rp 2,38 M', '22% dari pagu'],
            ['Komitmen PO', 'Rp 6,17 M', '57% dari pagu']
        ],
        chart: {
            title: 'Trend Belanja 30 Hari Terakhir',
            subtitle: 'Realisasi, rata-rata, dan anggaran harian',
            labels: ['11 Apr', '16 Apr', '21 Apr', '26 Apr', '1 Mei', '6 Mei', '10 Mei'],
            series: [
                { label: 'Realisasi', color: 'primary', values: [62, 88, 76, 105, 120, 108, 182] },
                { label: 'Anggaran Harian', color: 'success', values: [120, 135, 128, 142, 150, 143, 148] }
            ]
        },
        sections: [
            { type: 'table', title: 'Permintaan Pembelian Terbaru', columns: ['No PR', 'Unit', 'Nilai', 'Status'], rows: [
                ['PR/050/2024', 'Gizi', 'Rp 125.000.000', 'Menunggu'],
                ['PR/049/2024', 'Sarana', 'Rp 75.000.000', 'Menunggu'],
                ['PR/048/2024', 'Logistik', 'Rp 63.000.000', 'Direvisi'],
                ['PR/046/2024', 'Keuangan', 'Rp 20.000.000', 'Disetujui']
            ] },
            { type: 'table', title: 'PO & Penerimaan Terbaru', columns: ['No PO', 'Vendor', 'Nilai', 'Status'], rows: [
                ['PO/078/2024', 'PT Sentra Pangan', 'Rp 125.000.000', 'Selesai'],
                ['PO/077/2024', 'PT Sumber Makmur', 'Rp 98.500.000', 'Sebagian'],
                ['PO/076/2024', 'CV Nusantara Foods', 'Rp 82.250.000', 'Selesai'],
                ['PO/074/2024', 'PT Mitra Karya', 'Rp 54.300.000', 'Pending']
            ] },
            { type: 'snapshot', title: 'Ringkasan Keuangan Hari Ini', rows: [
                ['Faktur masuk', 'Rp 268.450.000', '9'],
                ['Faktur terverifikasi', 'Rp 173.200.000', '7'],
                ['Pembayaran hari ini', 'Rp 284.600.000', '12'],
                ['Retur / klaim aktif', 'Rp 23.800.000', '2']
            ] },
            { type: 'table', title: 'Catatan Limbah Harian', columns: ['Jenis', 'Berat', 'Nilai', 'Aksi'], rows: [
                ['Organik', '42,5 kg', 'Rp 63.750', 'Input'],
                ['Anorganik', '18,7 kg', 'Rp 28.050', 'Input'],
                ['B3 Medis', '2,1 kg', 'Rp 21.000', 'Input']
            ] },
            { type: 'progress', title: 'Stok Unit Ringkas', rows: [
                ['Beras', 72, 'success'],
                ['Ayam', 48, 'warning'],
                ['Minyak', 64, 'success'],
                ['Sayur', 38, 'danger']
            ] },
            { type: 'documents', title: 'Laporan Populer', rows: [
                ['Rekap Pengadaan', 'Periode 26 Apr - 10 Mei 2026'],
                ['Rekap Penerimaan & Stok', 'Diperbarui 10 Mei 10:00'],
                ['LRA Bulanan', 'Periode April 2026'],
                ['BKU', 'Periode Mei 2026']
            ] },
            { type: 'queue', title: 'Panel Aksi Cepat', badge: '28', items: [
                ['Validasi Faktur Masuk', '9 dokumen', 'danger'],
                ['Verifikasi Penerimaan', '12 dokumen', 'success'],
                ['Review Pembayaran', '7 dokumen', 'warning'],
                ['Monitoring Anggaran', '4 akun', 'primary']
            ] }
        ],
        ai: {
            changed: ['Forecast kebutuhan protein naik 18%.', 'Lead time vendor utama bertambah 3-5 hari.', 'Kebijakan minimum stock dinaikkan untuk 5 komoditas prioritas.'],
            caused: ['Permintaan menu tinggi protein menambah beban pembelian.', 'Gangguan pasokan vendor mendorong substitusi dengan harga lebih tinggi.'],
            impact: ['Realisasi belanja harian naik Rp 182,4 jt.', 'Komitmen PO mendekati 57% dari pagu.'],
            recommendations: ['Kunci kontrak alternatif untuk vendor cadangan.', 'Atur jadwal penerimaan bertahap agar tidak terjadi konsolidasi besar.', 'Review parameter safety stock mingguan.'],
            sources: ['purchase_requests', 'purchase_orders', 'receiving_records', 'finance_transactions']
        }
    },
    'ahli-gizi': {
        title: 'Dashboard Ahli Gizi',
        subtitle: 'Ringkasan kinerja gizi, kualitas makanan, dan kepatuhan standar',
        dateLabel: 'Minggu, 10 Mei 2026',
        contextLabel: 'SPPG Nakala',
        lastSync: 'Sinkron 10:22 WIB',
        aiQuestion: 'apa penyebab kepatuhan menu turun kemarin?',
        aiTitle: 'Kepatuhan Gizi Turun pada 9 Mei 2026',
        aiSummary: 'Kepatuhan turun karena substitusi menu, satu sampel suhu tidak sesuai, dan porsi lauk hewani kurang stabil.',
        quickActions: [
            { label: 'Rencanakan Menu', icon: 'ki-calendar', tone: 'primary', target: '#operational' },
            { label: 'QC Produksi', icon: 'ki-shield-tick', tone: 'success', target: '#nutritionist' },
            { label: 'Input Sampel', icon: 'ki-flask', tone: 'info', modal: 'sample' },
            { label: 'Edukasi Hari Ini', icon: 'ki-teacher', tone: 'warning', modal: 'education' },
            { label: 'Laporan Gizi', icon: 'ki-document', tone: 'secondary', target: '#reports' }
        ],
        metrics: [
            { label: 'Kepatuhan Menu', value: '92,1%', unit: '', note: 'Target >= 90%', tone: 'success' },
            { label: 'Tepat Gizi Rata-rata', value: '93,4%', unit: '', note: '+1,6% dari kemarin', tone: 'success' },
            { label: 'Keamanan Pangan', value: '98,5%', unit: '', note: 'Sangat baik', tone: 'success' },
            { label: 'Keluhan Penerima', value: '3', unit: 'kasus', note: 'Rasa hambar meningkat', tone: 'warning' },
            { label: 'Sampel Sesuai', value: '12 / 12', unit: '', note: '100% sesuai', tone: 'success' },
            { label: 'Skor Mutu Makanan', value: '4,6', unit: '/ 5', note: 'Baik', tone: 'success' }
        ],
        nutritionLabel: [
            ['Energi', '612 kkal'], ['Protein', '24,3 g'], ['Lemak', '18,7 g'],
            ['Karbohidrat', '80,6 g'], ['Serat', '7,2 g'], ['Natrium', '812 mg']
        ],
        chart: {
            title: 'Trend Kepatuhan Menu',
            subtitle: '7 hari terakhir',
            labels: ['4 Mei', '5 Mei', '6 Mei', '7 Mei', '8 Mei', '9 Mei', '10 Mei'],
            series: [
                { label: 'Kepatuhan Menu', color: 'success', values: [95, 94, 93, 95, 93, 95, 92] }
            ]
        },
        sections: [
            { type: 'table', title: 'Label Gizi Hari Ini', columns: ['Nutrisi', 'Nilai', 'Status'], rows: [
                ['Energi', '612 kkal', 'Sesuai'],
                ['Protein', '24,3 g', 'Baik'],
                ['Serat', '7,2 g', 'Baik'],
                ['Natrium', '812 mg', 'Perhatian']
            ] },
            { type: 'table', title: 'QC Produksi Hari Ini', columns: ['Menu', 'Waktu', 'Hasil', 'Status'], rows: [
                ['Mie Ayam', '07:30', 'Mikrobiologi', 'Aman'],
                ['Sayur Capcay', '07:35', 'Organoleptik', 'Sesuai'],
                ['Nasi Putih', '07:40', 'pH, Suhu', 'Sesuai'],
                ['Sup Ayam', '07:45', 'Mikrobiologi', 'Aman']
            ] },
            { type: 'table', title: 'Sampel Makanan Hari Ini', columns: ['Menu', 'Waktu', 'Suhu', 'Status'], rows: [
                ['Nasi Putih', '06:30', '72,4 C', 'Lulus'],
                ['Ayam Bakar', '06:30', '69,1 C', 'Lulus'],
                ['Tumis Buncis', '06:30', '15,6 C', 'Peringatan'],
                ['Puding Susu', '06:30', '8,2 C', 'Lulus']
            ] },
            { type: 'queue', title: 'Insight Hari Ini', badge: '3', items: [
                ['Kepatuhan menu turun 3,2%', 'Perhatikan lauk hewani', 'warning'],
                ['Asupan serat masih rendah', 'Tingkatkan sayur dan buah', 'warning'],
                ['Keluhan rasa hambar meningkat', 'Evaluasi bumbu dan metode memasak', 'primary']
            ] },
            { type: 'table', title: 'Konsultasi Gizi Terbaru', columns: ['Waktu', 'Pasien', 'Topik', 'Status'], rows: [
                ['10:15', 'Ny. Siti A.', 'Edukasi DM', 'Selesai'],
                ['09:40', 'Tn. Budi H.', 'Pembatasan garam', 'Selesai'],
                ['09:05', 'Ny. Lina P.', 'Pembatasan protein', 'Selesai']
            ] },
            { type: 'progress', title: 'Monitoring Kinerja Staff', rows: [
                ['Dewi K.', 96, 'success'],
                ['Rizky A.', 92, 'success'],
                ['Lina M.', 90, 'success'],
                ['Fajar N.', 88, 'warning']
            ] },
            { type: 'progress', title: 'Kepatuhan Standar Gizi', rows: [
                ['Energi', 93, 'success'],
                ['Protein', 91, 'success'],
                ['Lemak', 89, 'warning'],
                ['Serat', 78, 'warning'],
                ['Natrium', 81, 'warning']
            ] },
            { type: 'checklist', title: 'Reminders & Tindak Lanjut', rows: [
                ['Evaluasi kepatuhan menu tanggal 15 Mei', 'Terlambat'],
                ['Follow up keluhan rasa hambar', 'Hari Ini'],
                ['Review hasil QC item lauk hewani', 'Selesai'],
                ['Update rencana menu minggu depan', 'Besok']
            ] },
            { type: 'documents', title: 'Dokumen & Formulir', rows: [
                ['Form QC Harian', 'Update 15/05/2026'],
                ['Form Evaluasi Menu', 'Versi 2.3'],
                ['Form Edukasi Gizi', 'Update 13/05/2026'],
                ['Checklist Porsi Diet', 'Versi 2.1']
            ] }
        ],
        ai: {
            changed: ['Kepatuhan turun dari 93% ke 88% pada 9 Mei.', 'Satu sampel suhu berada di bawah standar.', 'Dua substitusi menu terjadi karena bahan kosong.'],
            caused: ['Suhu Tumis Buncis tercatat 15,6 C, di bawah standar.', 'Substitusi menu meningkat karena stok buncis kosong.'],
            impact: ['Kepatuhan gizi turun 5%.', 'Risiko keamanan pangan meningkat.', 'Potensi ketidakpuasan penerima bertambah.'],
            recommendations: ['Ulangi pemanasan menu terkait hingga suhu aman.', 'Pastikan stok bahan substitusi minimal 2 kg.', 'Monitor suhu saat distribusi.', 'Evaluasi proses substitusi di dapur.'],
            sources: ['nutrition_checks', 'recipes', 'production_batches', 'school_feedback']
        }
    }
};

const roleDashboardAliases = {
    pengadaan: 'admin-pengadaan-keuangan',
    'akuntan-pengadaan': 'admin-pengadaan-keuangan',
    'asisten-distribusi': 'distribusi'
};

const genericRoleProfiles = {
    distribusi: { label: 'Asisten Lapangan / Distribusi', focus: 'pengantaran, rute, bukti terima, dan koordinasi sekolah', target: '#operational/dispatch', action: 'Buka Distribusi' },
    produksi: { label: 'Produksi', focus: 'batch masak, suhu produksi, porsi aktual, dan checklist dapur', target: '#operational/production', action: 'Buka Produksi' },
    'pemorsian-packing': { label: 'Pemorsian / Packing', focus: 'pemorsian, label, jumlah pack, dan serah terima distribusi', target: '#operational/packing', action: 'Buka Packing' },
    'pencuci-kebersihan': { label: 'Pencuci / Kebersihan', focus: 'checklist sanitasi, kebersihan area, dan pencucian alat makan', target: '#operational/cleaning', action: 'Buka Kebersihan' },
    sekolah: { label: 'Sekolah', focus: 'konfirmasi penerimaan, feedback, penerima manfaat, dan insiden sekolah', target: '#school/receipts', action: 'Konfirmasi Terima' },
    bgn: { label: 'BGN', focus: 'monitoring agregat, compliance, KPI regional, dan laporan program', target: '#bgn', action: 'Buka BGN' },
    supplier: { label: 'Supplier', focus: 'PO aktif, jadwal kirim, status penerimaan, dan faktur supplier', target: '#supplier', action: 'Buka Supplier' }
};

function genericRoleDashboard(roleId) {
    const profile = genericRoleProfiles[roleId] || genericRoleProfiles.produksi;
    return {
        title: `Dashboard ${profile.label}`,
        subtitle: `Workspace role untuk ${profile.focus}.`,
        dateLabel: 'Minggu, 10 Mei 2026',
        contextLabel: 'SPPG Nakala',
        lastSync: 'Sinkron lokal',
        aiQuestion: `apa prioritas ${profile.label.toLowerCase()} hari ini?`,
        aiTitle: `Prioritas ${profile.label}`,
        aiSummary: `Ringkasan otomatis untuk role ${profile.label} berdasarkan data operasional SIPAGI.`,
        quickActions: [
            { label: profile.action, icon: 'ki-arrow-right', tone: 'primary', target: profile.target },
            { label: 'Laporan', icon: 'ki-document', tone: 'secondary', target: '#reports' }
        ],
        metrics: [
            { label: 'Tugas Hari Ini', value: '12', unit: '', note: 'Prioritas aktif', tone: 'primary' },
            { label: 'Selesai', value: '8', unit: '', note: 'Tertutup hari ini', tone: 'success' },
            { label: 'Perlu Review', value: '3', unit: '', note: 'Butuh tindak lanjut', tone: 'warning' },
            { label: 'Kritis', value: '1', unit: '', note: 'Naikkan ke Kepala SPPG', tone: 'danger' }
        ],
        chart: {
            title: 'Trend Tugas Role',
            subtitle: '7 hari terakhir',
            labels: ['4 Mei', '5 Mei', '6 Mei', '7 Mei', '8 Mei', '9 Mei', '10 Mei'],
            series: [
                { label: 'Selesai', color: 'success', values: [7, 8, 9, 8, 10, 7, 8] },
                { label: 'Review', color: 'warning', values: [2, 3, 2, 4, 3, 5, 3] }
            ]
        },
        sections: [
            { type: 'queue', title: 'Antrian Tugas', badge: '3', items: [
                ['Tugas perlu diselesaikan', profile.focus, 'warning'],
                ['Data belum lengkap', 'Lengkapi catatan sebelum tutup shift', 'primary'],
                ['Butuh eskalasi', 'Laporkan ke Kepala SPPG jika melewati SLA', 'danger']
            ] },
            { type: 'activity', title: 'Aktivitas Terbaru', rows: [
                ['Update data role', 'Hari Ini', 'Selesai'],
                ['Review catatan shift', 'Hari Ini', 'Review'],
                ['Sinkron data', 'Hari Ini', 'Selesai']
            ] },
            { type: 'documents', title: 'Dokumen Role', rows: [
                ['Checklist Harian', 'Template aktif'],
                ['Laporan Shift', 'Siap export'],
                ['Catatan Tindak Lanjut', 'Perlu review']
            ] }
        ],
        ai: {
            changed: ['Ada tugas role yang belum ditutup.', 'Beberapa catatan membutuhkan kelengkapan data.'],
            caused: ['Data lintas modul belum sepenuhnya sinkron.', 'Sebagian aktivitas masih menunggu konfirmasi.'],
            impact: ['Dashboard role membantu fokus pada pekerjaan yang relevan.', 'Eskalasi bisa dilakukan lebih cepat.'],
            recommendations: ['Selesaikan tugas prioritas lebih dulu.', 'Lengkapi data wajib sebelum akhir shift.', 'Sinkronkan data setelah perubahan penting.'],
            sources: ['role_permissions', 'notifications', 'audit_logs']
        }
    };
}

export function getRoleDashboardConfig(roleId = 'kepala-sppg') {
    const normalizedRoleId = String(roleId || 'kepala-sppg').replaceAll('_', '-');
    const alias = roleDashboardAliases[normalizedRoleId] || normalizedRoleId;
    return roleDashboards[alias] || genericRoleDashboard(alias);
}
