async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        document.getElementById(containerId).innerHTML = await response.text();
    } catch (e) { console.error(e); }
}

// --- 1. DATA KECAMATAN SE-DIY ---
const kecamatanDIY = {
    "Sleman": ["Godean", "Depok", "Mlati", "Gamping", "Seyegan", "Ngaglik", "Kalasan", "Turi"],
    "Bantul": ["Bantul", "Sewon", "Kasihan", "Banguntapan", "Imogiri", "Piyungan", "Kretek"],
    "Yogyakarta": ["Gondokusuman", "Umbulharjo", "Danurejan", "Kraton", "Mantrijeron", "Jetis"],
    "Gunungkidul": ["Wonosari", "Playen", "Semanu", "Karangmojo", "Paliyan", "Semin"],
    "Kulon Progo": ["Wates", "Sentolo", "Pengasih", "Temon", "Galur", "Nanggulan"]
};

// --- 2. GENERATE 155 DATA SEKOLAH (Sesuai Permintaan) ---
let masterSekolah = [];
const kabupatens = Object.keys(kecamatanDIY);

function generate155Schools() {
    masterSekolah = [];
    for (let i = 1; i <= 155; i++) {
        const kab = kabupatens[i % kabupatens.length];
        const kecs = kecamatanDIY[kab];
        const kec = kecs[i % kecs.length];
        
        masterSekolah.push({
            id: i,
            nama: `SDN ${i.toString().padStart(3, '0')} ${kec}`,
            kabupaten: kab,
            kecamatan: kec,
            siswa: Math.floor(Math.random() * (200 - 80) + 100), // Rata-rata siswa per sekolah
            akr: ["A", "B", "C"][i % 3],
            status: i % 10 === 0 ? "Pending" : "Aktif" 
        });
    }
}

// --- 3. FUNGSI RENDER & STATS (SINKRON DENGAN DASHBOARD.JS) ---

function updateStats() {
    // Data Global se-DIY (Sesuai Dashboard.js)
    const globalTotalSekolah = 1554;
    const globalTotalSiswa = 15255;
    const globalAktif = 1398;
    const globalPending = 156;

    // Suntik data ke UI
    document.getElementById('stat-total-sekolah').innerText = globalTotalSekolah.toLocaleString('id-ID');
    document.getElementById('stat-aktif').innerText = globalAktif.toLocaleString('id-ID');
    document.getElementById('stat-pending').innerText = globalPending.toLocaleString('id-ID');
    document.getElementById('stat-total-siswa').innerText = globalTotalSiswa.toLocaleString('id-ID');
}

function renderTable(data) {
    const tbody = document.getElementById('table-body-sekolah');
    tbody.innerHTML = '';

    data.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${s.nama}</strong></td>
                <td>${s.kecamatan}, ${s.kabupaten}</td>
                <td>${s.siswa}</td>
                <td><span style="font-weight:700; color:var(--primary-blue)">${s.akr}</span></td>
                <td><span class="status-badge ${s.status === 'Aktif' ? 'success' : 'warning'}">${s.status}</span></td>
                <td>
                    <button class="icon-btn" onclick="alert('Detail ${s.nama}')"><i class="fi fi-rr-eye"></i></button>
                    <button class="icon-btn" style="color:var(--danger)" onclick="window.deleteSchool(${s.id})"><i class="fi fi-rr-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// --- 4. LOGIKA INTERAKSI ---

function handleFilters() {
    const filterKab = document.getElementById('filter-wilayah').value;
    const search = document.getElementById('search-sekolah').value.toLowerCase();

    const filtered = masterSekolah.filter(s => {
        const matchKab = (filterKab === "Semua" || s.kabupaten === filterKab);
        const matchSearch = s.nama.toLowerCase().includes(search);
        return matchKab && matchSearch;
    });

    renderTable(filtered);
    // Note: Statistik tetap menunjukkan angka global DIY sesuai permintaan "sinkron dashboard"
}

function setupModalDropdown() {
    const kabSelect = document.getElementById('in-kab');
    const kecSelect = document.getElementById('in-kec');

    kabSelect.addEventListener('change', () => {
        const selectedKab = kabSelect.value;
        kecSelect.innerHTML = '<option value="">Pilih Kecamatan</option>';
        
        if (selectedKab && kecamatanDIY[selectedKab]) {
            kecSelect.disabled = false;
            kecamatanDIY[selectedKab].forEach(kec => {
                kecSelect.innerHTML += `<option value="${kec}">${kec}</option>`;
            });
        } else {
            kecSelect.disabled = true;
        }
    });
}

// --- 5. EXPORT WINDOW FUNCTIONS ---

window.openAddSchoolModal = () => document.getElementById('addSchoolModal').classList.add('active');
window.closeAddSchoolModal = () => document.getElementById('addSchoolModal').classList.remove('active');

window.deleteSchool = (id) => {
    if(confirm("Hapus sekolah ini?")) {
        masterSekolah = masterSekolah.filter(s => s.id !== id);
        handleFilters();
    }
};

// --- 6. INITIALIZE ---

document.addEventListener('DOMContentLoaded', async () => {
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    const activeMenu = document.getElementById('nav-sekolah'); 
    if(activeMenu) activeMenu.classList.add('active');

    generate155Schools();
    updateStats(); // Munculkan angka 1.554 dan 15.255
    setupModalDropdown();

    document.getElementById('filter-wilayah').addEventListener('change', handleFilters);
    document.getElementById('search-sekolah').addEventListener('input', handleFilters);

    document.getElementById('form-tambah-sekolah').addEventListener('submit', (e) => {
        e.preventDefault();
        const newSchool = {
            id: Date.now(),
            nama: document.getElementById('in-nama').value,
            kabupaten: document.getElementById('in-kab').value,
            kecamatan: document.getElementById('in-kec').value,
            siswa: parseInt(document.getElementById('in-siswa').value),
            akr: document.getElementById('in-akreditasi').value,
            status: "Pending"
        };
        masterSekolah.unshift(newSchool);
        handleFilters();
        window.closeAddSchoolModal();
        e.target.reset();
    });

    handleFilters();
});