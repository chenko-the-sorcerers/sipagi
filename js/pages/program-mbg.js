async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        document.getElementById(containerId).innerHTML = html;
    } catch (error) {
        console.error(`Gagal memuat ${url}:`, error);
    }
}

// --- 1. DATA MASTER ---

// Data Chart (Skala disesuaikan dengan total ~15.200 siswa se-DIY)
const chartData = {
    sem1: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
        siswa: [4000, 7500, 10000, 12500, 14200, 15255],
        sekolah: [400, 750, 1000, 1250, 1420, 1554]
    },
    sem2: {
        // Proyeksi data
        labels: ['Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
        siswa: [15300, 15800, 16200, 16800, 17500, 18000],
        sekolah: [1560, 1610, 1650, 1710, 1780, 1850]
    }
};

// FULL 78 Kapanewon/Kemantren (Kecamatan) se-DIY
const dataKecamatanDIY = [
    // --- KOTA YOGYAKARTA ---
    { nama: "Danurejan", kabupaten: "Yogyakarta", sekolah: 15, siswa: 180, porsi: 29700, anggaran: 178200000, status: "Optimal", persen: 97 },
    { nama: "Gedongtengen", kabupaten: "Yogyakarta", sekolah: 10, siswa: 120, porsi: 19800, anggaran: 118800000, status: "Berjalan", persen: 88 },
    { nama: "Gondokusuman", kabupaten: "Yogyakarta", sekolah: 22, siswa: 260, porsi: 42900, anggaran: 257400000, status: "Optimal", persen: 99 },
    { nama: "Gondomanan", kabupaten: "Yogyakarta", sekolah: 11, siswa: 130, porsi: 21450, anggaran: 128700000, status: "Optimal", persen: 95 },
    { nama: "Jetis", kabupaten: "Yogyakarta", sekolah: 14, siswa: 150, porsi: 24750, anggaran: 148500000, status: "Berjalan", persen: 89 },
    { nama: "Kotagede", kabupaten: "Yogyakarta", sekolah: 16, siswa: 190, porsi: 31350, anggaran: 188100000, status: "Optimal", persen: 92 },
    { nama: "Kraton", kabupaten: "Yogyakarta", sekolah: 12, siswa: 145, porsi: 23925, anggaran: 143550000, status: "Optimal", persen: 94 },
    { nama: "Mantrijeron", kabupaten: "Yogyakarta", sekolah: 18, siswa: 190, porsi: 31350, anggaran: 188100000, status: "Berjalan", persen: 86 },
    { nama: "Mergangsan", kabupaten: "Yogyakarta", sekolah: 15, siswa: 170, porsi: 28050, anggaran: 168300000, status: "Berjalan", persen: 87 },
    { nama: "Ngampilan", kabupaten: "Yogyakarta", sekolah: 9, siswa: 110, porsi: 18150, anggaran: 108900000, status: "Optimal", persen: 91 },
    { nama: "Pakualaman", kabupaten: "Yogyakarta", sekolah: 8, siswa: 100, porsi: 16500, anggaran: 99000000, status: "Optimal", persen: 96 },
    { nama: "Tegalrejo", kabupaten: "Yogyakarta", sekolah: 17, siswa: 200, porsi: 33000, anggaran: 198000000, status: "Berjalan", persen: 84 },
    { nama: "Umbulharjo", kabupaten: "Yogyakarta", sekolah: 30, siswa: 380, porsi: 62700, anggaran: 376200000, status: "Berjalan", persen: 89 },
    { nama: "Wirobrajan", kabupaten: "Yogyakarta", sekolah: 13, siswa: 160, porsi: 26400, anggaran: 158400000, status: "Optimal", persen: 93 },

    // --- KAB. SLEMAN ---
    { nama: "Berbah", kabupaten: "Sleman", sekolah: 15, siswa: 210, porsi: 34650, anggaran: 207900000, status: "Berjalan", persen: 88 },
    { nama: "Cangkringan", kabupaten: "Sleman", sekolah: 12, siswa: 150, porsi: 24750, anggaran: 148500000, status: "Optimal", persen: 95 },
    { nama: "Depok", kabupaten: "Sleman", sekolah: 42, siswa: 450, porsi: 74250, anggaran: 445500000, status: "Optimal", persen: 98 },
    { nama: "Gamping", kabupaten: "Sleman", sekolah: 20, siswa: 120, porsi: 19800, anggaran: 118800000, status: "Optimal", persen: 92 },
    { nama: "Godean", kabupaten: "Sleman", sekolah: 28, siswa: 312, porsi: 51480, anggaran: 308880000, status: "Optimal", persen: 96 },
    { nama: "Kalasan", kabupaten: "Sleman", sekolah: 22, siswa: 280, porsi: 46200, anggaran: 277200000, status: "Berjalan", persen: 85 },
    { nama: "Minggir", kabupaten: "Sleman", sekolah: 18, siswa: 190, porsi: 31350, anggaran: 188100000, status: "Perhatian", persen: 74 },
    { nama: "Mlati", kabupaten: "Sleman", sekolah: 35, siswa: 245, porsi: 40425, anggaran: 242550000, status: "Berjalan", persen: 85 },
    { nama: "Moyudan", kabupaten: "Sleman", sekolah: 16, siswa: 170, porsi: 28050, anggaran: 168300000, status: "Berjalan", persen: 82 },
    { nama: "Ngaglik", kabupaten: "Sleman", sekolah: 38, siswa: 340, porsi: 56100, anggaran: 336600000, status: "Optimal", persen: 95 },
    { nama: "Ngemplak", kabupaten: "Sleman", sekolah: 24, siswa: 230, porsi: 37950, anggaran: 227700000, status: "Berjalan", persen: 89 },
    { nama: "Pakem", kabupaten: "Sleman", sekolah: 19, siswa: 200, porsi: 33000, anggaran: 198000000, status: "Optimal", persen: 91 },
    { nama: "Prambanan", kabupaten: "Sleman", sekolah: 25, siswa: 210, porsi: 34650, anggaran: 207900000, status: "Berjalan", persen: 88 },
    { nama: "Seyegan", kabupaten: "Sleman", sekolah: 31, siswa: 118, porsi: 19470, anggaran: 116820000, status: "Perhatian", persen: 72 },
    { nama: "Sleman", kabupaten: "Sleman", sekolah: 29, siswa: 300, porsi: 49500, anggaran: 297000000, status: "Optimal", persen: 94 },
    { nama: "Tempel", kabupaten: "Sleman", sekolah: 21, siswa: 220, porsi: 36300, anggaran: 217800000, status: "Berjalan", persen: 86 },
    { nama: "Turi", kabupaten: "Sleman", sekolah: 14, siswa: 160, porsi: 26400, anggaran: 158400000, status: "Optimal", persen: 93 },

    // --- KAB. BANTUL ---
    { nama: "Bambanglipuro", kabupaten: "Bantul", sekolah: 18, siswa: 210, porsi: 34650, anggaran: 207900000, status: "Berjalan", persen: 88 },
    { nama: "Bantul", kabupaten: "Bantul", sekolah: 25, siswa: 250, porsi: 41250, anggaran: 247500000, status: "Berjalan", persen: 87 },
    { nama: "Dlingo", kabupaten: "Bantul", sekolah: 22, siswa: 190, porsi: 31350, anggaran: 188100000, status: "Perhatian", persen: 76 },
    { nama: "Imogiri", kabupaten: "Bantul", sekolah: 20, siswa: 180, porsi: 29700, anggaran: 178200000, status: "Perhatian", persen: 68 },
    { nama: "Jetis", kabupaten: "Bantul", sekolah: 19, siswa: 200, porsi: 33000, anggaran: 198000000, status: "Optimal", persen: 91 },
    { nama: "Kasihan", kabupaten: "Bantul", sekolah: 32, siswa: 320, porsi: 52800, anggaran: 316800000, status: "Optimal", persen: 93 },
    { nama: "Kretek", kabupaten: "Bantul", sekolah: 16, siswa: 170, porsi: 28050, anggaran: 168300000, status: "Berjalan", persen: 84 },
    { nama: "Pajangan", kabupaten: "Bantul", sekolah: 17, siswa: 185, porsi: 30525, anggaran: 183150000, status: "Berjalan", persen: 86 },
    { nama: "Pandak", kabupaten: "Bantul", sekolah: 21, siswa: 230, porsi: 37950, anggaran: 227700000, status: "Optimal", persen: 92 },
    { nama: "Piyungan", kabupaten: "Bantul", sekolah: 24, siswa: 260, porsi: 42900, anggaran: 257400000, status: "Berjalan", persen: 89 },
    { nama: "Pleret", kabupaten: "Bantul", sekolah: 20, siswa: 220, porsi: 36300, anggaran: 217800000, status: "Optimal", persen: 94 },
    { nama: "Pundong", kabupaten: "Bantul", sekolah: 15, siswa: 160, porsi: 26400, anggaran: 158400000, status: "Berjalan", persen: 85 },
    { nama: "Sanden", kabupaten: "Bantul", sekolah: 14, siswa: 150, porsi: 24750, anggaran: 148500000, status: "Optimal", persen: 90 },
    { nama: "Sedayu", kabupaten: "Bantul", sekolah: 23, siswa: 240, porsi: 39600, anggaran: 237600000, status: "Berjalan", persen: 88 },
    { nama: "Sewon", kabupaten: "Bantul", sekolah: 28, siswa: 290, porsi: 47850, anggaran: 287100000, status: "Berjalan", persen: 84 },
    { nama: "Srandakan", kabupaten: "Bantul", sekolah: 12, siswa: 140, porsi: 23100, anggaran: 138600000, status: "Optimal", persen: 95 },
    { nama: "Kretek", kabupaten: "Bantul", sekolah: 13, siswa: 145, porsi: 23925, anggaran: 143550000, status: "Berjalan", persen: 86 },

    // --- KAB. GUNUNGKIDUL ---
    { nama: "Gedangsari", kabupaten: "Gunungkidul", sekolah: 19, siswa: 160, porsi: 26400, anggaran: 158400000, status: "Perhatian", persen: 72 },
    { nama: "Girisubo", kabupaten: "Gunungkidul", sekolah: 14, siswa: 130, porsi: 21450, anggaran: 128700000, status: "Berjalan", persen: 81 },
    { nama: "Karangmojo", kabupaten: "Gunungkidul", sekolah: 25, siswa: 240, porsi: 39600, anggaran: 237600000, status: "Optimal", persen: 90 },
    { nama: "Ngawen", kabupaten: "Gunungkidul", sekolah: 16, siswa: 150, porsi: 24750, anggaran: 148500000, status: "Berjalan", persen: 84 },
    { nama: "Nglipar", kabupaten: "Gunungkidul", sekolah: 20, siswa: 180, porsi: 29700, anggaran: 178200000, status: "Berjalan", persen: 86 },
    { nama: "Paliyan", kabupaten: "Gunungkidul", sekolah: 18, siswa: 170, porsi: 28050, anggaran: 168300000, status: "Optimal", persen: 92 },
    { nama: "Panggang", kabupaten: "Gunungkidul", sekolah: 15, siswa: 140, porsi: 23100, anggaran: 138600000, status: "Berjalan", persen: 85 },
    { nama: "Patuk", kabupaten: "Gunungkidul", sekolah: 22, siswa: 200, porsi: 33000, anggaran: 198000000, status: "Berjalan", persen: 88 },
    { nama: "Playen", kabupaten: "Gunungkidul", sekolah: 22, siswa: 185, porsi: 30525, anggaran: 183150000, status: "Berjalan", persen: 82 },
    { nama: "Ponjong", kabupaten: "Gunungkidul", sekolah: 26, siswa: 230, porsi: 37950, anggaran: 227700000, status: "Optimal", persen: 91 },
    { nama: "Purwosari", kabupaten: "Gunungkidul", sekolah: 13, siswa: 120, porsi: 19800, anggaran: 118800000, status: "Berjalan", persen: 83 },
    { nama: "Rongkop", kabupaten: "Gunungkidul", sekolah: 14, siswa: 125, porsi: 20625, anggaran: 123750000, status: "Perhatian", persen: 77 },
    { nama: "Saptosari", kabupaten: "Gunungkidul", sekolah: 17, siswa: 160, porsi: 26400, anggaran: 158400000, status: "Berjalan", persen: 86 },
    { nama: "Semanu", kabupaten: "Gunungkidul", sekolah: 18, siswa: 150, porsi: 24750, anggaran: 148500000, status: "Perhatian", persen: 70 },
    { nama: "Semin", kabupaten: "Gunungkidul", sekolah: 24, siswa: 210, porsi: 34650, anggaran: 207900000, status: "Berjalan", persen: 89 },
    { nama: "Tanjungsari", kabupaten: "Gunungkidul", sekolah: 12, siswa: 110, porsi: 18150, anggaran: 108900000, status: "Optimal", persen: 93 },
    { nama: "Tepus", kabupaten: "Gunungkidul", sekolah: 15, siswa: 135, porsi: 22275, anggaran: 133650000, status: "Berjalan", persen: 84 },
    { nama: "Wonosari", kabupaten: "Gunungkidul", sekolah: 45, siswa: 400, porsi: 66000, anggaran: 396000000, status: "Optimal", persen: 91 },

    // --- KAB. KULON PROGO ---
    { nama: "Galur", kabupaten: "Kulon Progo", sekolah: 18, siswa: 160, porsi: 26400, anggaran: 158400000, status: "Optimal", persen: 92 },
    { nama: "Girimulyo", kabupaten: "Kulon Progo", sekolah: 16, siswa: 140, porsi: 23100, anggaran: 138600000, status: "Perhatian", persen: 78 },
    { nama: "Kalibawang", kabupaten: "Kulon Progo", sekolah: 17, siswa: 150, porsi: 24750, anggaran: 148500000, status: "Berjalan", persen: 84 },
    { nama: "Kokap", kabupaten: "Kulon Progo", sekolah: 19, siswa: 170, porsi: 28050, anggaran: 168300000, status: "Perhatian", persen: 76 },
    { nama: "Lendah", kabupaten: "Kulon Progo", sekolah: 20, siswa: 180, porsi: 29700, anggaran: 178200000, status: "Berjalan", persen: 88 },
    { nama: "Nanggulan", kabupaten: "Kulon Progo", sekolah: 18, siswa: 165, porsi: 27225, anggaran: 163350000, status: "Optimal", persen: 90 },
    { nama: "Panjatan", kabupaten: "Kulon Progo", sekolah: 22, siswa: 190, porsi: 31350, anggaran: 188100000, status: "Berjalan", persen: 87 },
    { nama: "Pengasih", kabupaten: "Kulon Progo", sekolah: 20, siswa: 175, porsi: 28875, anggaran: 173250000, status: "Perhatian", persen: 75 },
    { nama: "Samigaluh", kabupaten: "Kulon Progo", sekolah: 21, siswa: 160, porsi: 26400, anggaran: 158400000, status: "Perhatian", persen: 74 },
    { nama: "Sentolo", kabupaten: "Kulon Progo", sekolah: 24, siswa: 210, porsi: 34650, anggaran: 207900000, status: "Berjalan", persen: 85 },
    { nama: "Temon", kabupaten: "Kulon Progo", sekolah: 16, siswa: 150, porsi: 24750, anggaran: 148500000, status: "Optimal", persen: 91 },
    { nama: "Wates", kabupaten: "Kulon Progo", sekolah: 30, siswa: 280, porsi: 46200, anggaran: 277200000, status: "Optimal", persen: 94 }
];


// --- 2. FUNGSI LOGIKA PERHITUNGAN OTOMATIS (DYNAMIC SUMMARY) ---
function calculateAndInjectSummary() {
    // Menghitung (SUM) seluruh data yang ada di array dataKecamatanDIY
    const totalSekolah = dataKecamatanDIY.reduce((sum, item) => sum + item.sekolah, 0);
    const totalSiswa = dataKecamatanDIY.reduce((sum, item) => sum + item.siswa, 0);
    const totalAnggaran = dataKecamatanDIY.reduce((sum, item) => sum + item.anggaran, 0);
    const totalPersen = dataKecamatanDIY.reduce((sum, item) => sum + item.persen, 0);
    const avgPersen = Math.round(totalPersen / dataKecamatanDIY.length);

    // Hitung format Miliar untuk anggaran
    const anggaranMiliar = (totalAnggaran / 1000000000).toFixed(2);

    // Menyuntikkan hasil perhitungan ke Kartu Statistik (Atas)
    document.getElementById('stat-sekolah').innerText = totalSekolah.toLocaleString('id-ID');
    document.getElementById('stat-siswa').innerText = totalSiswa.toLocaleString('id-ID');
    document.getElementById('stat-anggaran').innerText = `Rp ${anggaranMiliar} M`;

    // Menyuntikkan hasil perhitungan ke Tabel Rincian Global
    document.getElementById('tbl-sekolah').innerText = `${totalSekolah.toLocaleString('id-ID')} sekolah`;
    document.getElementById('tbl-siswa').innerText = `${totalSiswa.toLocaleString('id-ID')} siswa`;
    document.getElementById('tbl-gizi').innerText = `${avgPersen}%`;

    // Persentase Ketercapaian
    const pctSekolah = Math.round((totalSekolah / 1600) * 100);
    const pctSiswa = Math.round((totalSiswa / 18000) * 100);
    
    document.getElementById('tbl-sekolah-pct').innerHTML = `<span class="status-badge ${pctSekolah >= 90 ? 'success' : 'warning'}">${pctSekolah}%</span>`;
    document.getElementById('tbl-siswa-pct').innerHTML = `<span class="status-badge ${pctSiswa >= 80 ? 'success' : 'warning'}">${pctSiswa}%</span>`;
}


// --- 3. FUNGSI RENDER TABEL BAWAH ---
function renderTable(data) {
    const tableBody = document.getElementById('table-body-kecamatan');
    tableBody.innerHTML = ''; 

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Tidak ada data untuk wilayah ini.</td></tr>`;
        return;
    }

    data.forEach(item => {
        let badgeClass = 'success';
        if (item.status === 'Berjalan') badgeClass = 'warning';
        if (item.status === 'Perhatian') badgeClass = 'danger';

        const row = `
            <tr>
                <td><strong>${item.nama}</strong></td>
                <td>${item.kabupaten}</td>
                <td>${item.sekolah} Sekolah</td>
                <td>${item.siswa.toLocaleString('id-ID')} Siswa</td>
                <td>${item.porsi.toLocaleString('id-ID')} porsi</td>
                <td>Rp ${item.anggaran.toLocaleString('id-ID')}</td>
                <td><span class="status-badge ${badgeClass}">${item.status} (${item.persen}%)</span></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// --- 4. FUNGSI RENDER CHART ---
let areaChartInstance = null;

function renderProgramCharts() {
    const ctxArea = document.getElementById('areaChart');
    if (ctxArea) {
        areaChartInstance = new Chart(ctxArea.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartData.sem1.labels,
                datasets: [
                    {
                        label: 'Siswa Penerima',
                        data: chartData.sem1.siswa,
                        borderColor: '#059669', 
                        backgroundColor: 'rgba(5, 150, 105, 0.15)',
                        borderWidth: 3, fill: true, tension: 0.4
                    },
                    {
                        label: 'Sekolah Terdaftar',
                        data: chartData.sem1.sekolah,
                        borderColor: '#0056B3',
                        backgroundColor: 'rgba(0, 86, 179, 0.1)',
                        borderWidth: 2, fill: true, tension: 0.4,
                        yAxisID: 'y1' 
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'Jumlah Siswa' } },
                    y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Jumlah Sekolah' } },
                },
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    const ctxPie = document.getElementById('pieChart');
    if (ctxPie) {
        new Chart(ctxPie.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Bahan Pangan', 'Operasional Dapur', 'Logistik & Distribusi', 'Monitoring & Tech'],
                datasets: [{
                    data: [60, 20, 12, 8],
                    backgroundColor: ['#0056B3', '#F59E0B', '#7C3AED', '#059669'],
                    borderWidth: 2, borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { padding: 20, boxWidth: 15 } } }
            }
        });
    }
}

function updateAreaChart(semesterKey) {
    if (!areaChartInstance) return;
    areaChartInstance.data.labels = chartData[semesterKey].labels;
    areaChartInstance.data.datasets[0].data = chartData[semesterKey].siswa;
    areaChartInstance.data.datasets[1].data = chartData[semesterKey].sekolah;
    areaChartInstance.update();
}

// --- 5. FUNGSI EXPORT CSV ---
function exportToCSV(data) {
    const headers = ["Kecamatan", "Kabupaten/Kota", "Total Sekolah", "Total Siswa", "Porsi Terkirim", "Anggaran Terserap (Rp)", "Status", "Persentase Capaian"];
    const rows = [headers.join(",")];

    data.forEach(item => {
        const row = [item.nama, item.kabupaten, item.sekolah, item.siswa, item.porsi, item.anggaran, item.status, item.persen];
        rows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Kecamatan_MBG_DIY.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 6. INIT SAAT HALAMAN DIMUAT ---
document.addEventListener('DOMContentLoaded', async () => {
    // Muat komponen Sidebar
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    const activeMenu = document.getElementById('nav-program-mbg'); 
    if(activeMenu) activeMenu.classList.add('active');

    // 1. Jalankan perhitungan dinamis
    calculateAndInjectSummary();

    // 2. Suntik data tabel & chart saat pertama kali jalan
    renderTable(dataKecamatanDIY);
    renderProgramCharts();

    // Event Listener Filter Chart
    const btnSem1 = document.getElementById('btn-sem1');
    const btnSem2 = document.getElementById('btn-sem2');

    btnSem1.addEventListener('click', () => {
        btnSem1.classList.add('active');
        btnSem2.classList.remove('active');
        updateAreaChart('sem1');
    });

    btnSem2.addEventListener('click', () => {
        btnSem2.classList.add('active');
        btnSem1.classList.remove('active');
        updateAreaChart('sem2');
    });

    // Event Listener Dropdown Filter Wilayah
    const filterKabupaten = document.getElementById('filter-kabupaten');
    filterKabupaten.addEventListener('change', (e) => {
        const selectedKabupaten = e.target.value;
        if (selectedKabupaten === "Semua") {
            renderTable(dataKecamatanDIY);
        } else {
            const filteredData = dataKecamatanDIY.filter(item => item.kabupaten === selectedKabupaten);
            renderTable(filteredData);
        }
    });

    // Event Listener Tombol CSV
    const btnExport = document.getElementById('btn-export-csv');
    btnExport.addEventListener('click', () => {
        const selectedKabupaten = filterKabupaten.value;
        const dataToExport = selectedKabupaten === "Semua" 
            ? dataKecamatanDIY 
            : dataKecamatanDIY.filter(item => item.kabupaten === selectedKabupaten);
            
        exportToCSV(dataToExport);
    });
});