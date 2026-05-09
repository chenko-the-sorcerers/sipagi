// Fungsi utilitas untuk memuat file HTML komponen
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

// --- 1. MASTER DATA (78 Kecamatan se-DIY) ---
// Diambil dari data yang sama dengan program-mbg.js untuk konsistensi
const dataKecamatanDIY = [
    // Yogyakarta
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
    // Sleman
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
    // Bantul
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
    // Gunungkidul
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
    // Kulon Progo
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

// --- 2. FUNGSI LOGIKA DINAMIS ---

function initDashboardDinamis() {
    // A. Hitung Total Summary se-DIY
    const totalSekolah = dataKecamatanDIY.reduce((sum, item) => sum + item.sekolah, 0);
    const totalSiswa = dataKecamatanDIY.reduce((sum, item) => sum + item.siswa, 0);
    const totalPorsi = dataKecamatanDIY.reduce((sum, item) => sum + item.porsi, 0);
    const avgGizi = Math.round(dataKecamatanDIY.reduce((sum, item) => sum + item.persen, 0) / dataKecamatanDIY.length);

    // Inject ke Card Atas
    document.getElementById('stat-sekolah').innerText = totalSekolah.toLocaleString('id-ID');
    document.getElementById('stat-penerima').innerText = totalSiswa.toLocaleString('id-ID');
    document.getElementById('stat-porsi').innerText = totalPorsi.toLocaleString('id-ID');
    document.getElementById('stat-gizi').innerText = avgGizi + "%";

    // B. Isi Tabel Wilayah Capaian Tertinggi (Top 4)
    const topWilayahBody = document.getElementById('top-wilayah-body');
    topWilayahBody.innerHTML = ''; // Clear
    const sortedData = [...dataKecamatanDIY].sort((a, b) => b.persen - a.persen).slice(0, 4);
    
    sortedData.forEach(item => {
        topWilayahBody.innerHTML += `
            <tr>
                <td><strong>${item.nama}</strong><br><small>${item.kabupaten}</small></td>
                <td>${item.siswa.toLocaleString('id-ID')} Siswa</td>
                <td><span class="status-badge success">Sangat Baik</span></td>
            </tr>
        `;
    });

    // C. Isi Activity Feed (Mockup Realistis)
    const activityContainer = document.getElementById('activity-container');
    activityContainer.innerHTML = '';
    const activities = [
        { icon: "fi-rr-check", color: "var(--success)", bg: "var(--success-light)", title: "Distribusi Berhasil", desc: `Kec. ${sortedData[0].nama} menyelesaikan pengiriman hari ini`, time: "10 menit yang lalu" },
        { icon: "fi-rr-camera", color: "var(--primary-blue)", bg: "var(--light-blue)", title: "Scan Gizi Baru", desc: "Menu Nasi Ayam di SDN 01 Wonosari terverifikasi AI", time: "25 menit yang lalu" },
        { icon: "fi-rr-exclamation", color: "var(--warning)", bg: "var(--warning-light)", title: "Stok Menipis", desc: "Kec. Seyegan membutuhkan restock beras gizi", time: "1 jam yang lalu" }
    ];

    activities.forEach(act => {
        activityContainer.innerHTML += `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${act.bg}; color: ${act.color};"><i class="${act.icon}"></i></div>
                <div class="activity-content">
                    <h4>${act.title}</h4>
                    <p>${act.desc}</p>
                    <div class="activity-time">${act.time}</div>
                </div>
            </div>
        `;
    });

    // D. Isi Tabel Monitoring Harian
    const dailyBody = document.getElementById('daily-monitoring-body');
    dailyBody.innerHTML = '';
    const focusWilayah = ["Sleman", "Bantul", "Yogyakarta", "Gunungkidul", "Kulon Progo"];
    const dailyMenus = ["Nasi Ayam + Sayur Sop", "Nasi Ikan + Buah", "Nasi Telur + Bayam", "Nasi Daging + Buncis", "Nasi Kuning Gizi"];

    focusWilayah.forEach((wil, index) => {
        dailyBody.innerHTML += `
            <tr>
                <td>02 Mei 2026</td>
                <td><strong>${wil}</strong></td>
                <td>${dailyMenus[index]}</td>
                <td>${(Math.floor(Math.random() * 2000) + 1000).toLocaleString('id-ID')}</td>
                <td><span class="status-badge success">Terkirim</span></td>
            </tr>
        `;
    });
}

// --- 3. FUNGSI RENDER CHARTS ---

function renderDashboardCharts() {
    // Line Chart (Disesuaikan skalanya dengan data DIY)
    const ctxLine = document.getElementById('lineChartDashboard').getContext('2d');
    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            datasets: [{
                label: 'Porsi Terdistribusi',
                data: [18500, 21000, 19500, 24000, 26000, 22000, 28580],
                borderColor: '#0056B3',
                backgroundColor: 'rgba(0, 86, 179, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } } 
        }
    });

    // Donut Chart
    const ctxDonut = document.getElementById('donutChartDashboard').getContext('2d');
    new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['Karbohidrat', 'Protein', 'Serat/Sayur'],
            datasets: [{
                data: [45, 35, 20],
                backgroundColor: ['#F59E0B', '#0056B3', '#059669'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '75%', 
            plugins: { legend: { position: 'bottom' } } 
        }
    });
}

// --- 4. INITIALIZE ---

document.addEventListener('DOMContentLoaded', async () => {
    // Muat Sidebar
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    
    // Set Menu Aktif
    const activeMenu = document.getElementById('nav-dashboard'); 
    if(activeMenu) activeMenu.classList.add('active');

    // Jalankan Logika Data & Chart
    initDashboardDinamis();
    renderDashboardCharts();
});