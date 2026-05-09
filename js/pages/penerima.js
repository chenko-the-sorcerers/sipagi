async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        document.getElementById(containerId).innerHTML = await response.text();
    } catch (e) { console.error(e); }
}

const kecamatanDIY = {
    "Sleman": ["Godean", "Depok", "Mlati", "Gamping", "Seyegan", "Ngaglik", "Kalasan", "Turi"],
    "Bantul": ["Bantul", "Sewon", "Kasihan", "Banguntapan", "Imogiri", "Piyungan", "Kretek"],
    "Yogyakarta": ["Gondokusuman", "Umbulharjo", "Danurejan", "Kraton", "Mantrijeron", "Jetis"],
    "Gunungkidul": ["Wonosari", "Playen", "Semanu", "Karangmojo", "Paliyan", "Semin"],
    "Kulon Progo": ["Wates", "Sentolo", "Pengasih", "Temon", "Galur", "Nanggulan"]
};

// --- GENERATE 155 DATA SISWA ---
let masterSiswa = [];
const kabupatens = Object.keys(kecamatanDIY);
const namaDummies = ["Budi Santoso", "Siti Aminah", "Eko Prasetyo", "Dewi Lestari", "Andi Wijaya", "Rina Kartika", "Guruh Putra", "Maya Sari", "Fajar Ramadhan", "Putri Utami"];

function generate155Students() {
    masterSiswa = [];
    for (let i = 1; i <= 155; i++) {
        const kab = kabupatens[i % kabupatens.length];
        const kecs = kecamatanDIY[kab];
        const kec = kecs[i % kecs.length];
        const nama = namaDummies[i % namaDummies.length] + " " + String.fromCharCode(65 + (i % 26));
        
        masterSiswa.push({
            id: i,
            nama: nama,
            nisn: "009" + Math.floor(1000000 + Math.random() * 9000000),
            sekolah: `SDN ${Math.floor(Math.random() * 10) + 1} ${kec}`,
            kelas: Math.floor(Math.random() * 6) + 1,
            kabupaten: kab,
            kecamatan: kec
        });
    }
}

// --- FUNGSI RENDER ---

function updateStats() {
    // Sinkronisasi data global se-DIY dari Dashboard
    const globalTotalSiswa = 15255;
    const laki = 7500;
    const perempuan = 7755;

    document.getElementById('stat-total-siswa').innerText = globalTotalSiswa.toLocaleString('id-ID');
    document.getElementById('stat-laki').innerText = laki.toLocaleString('id-ID');
    document.getElementById('stat-perempuan').innerText = perempuan.toLocaleString('id-ID');
}

function renderTable(data) {
    const tbody = document.getElementById('table-body-siswa');
    tbody.innerHTML = '';

    data.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${s.nama}</strong></td>
                <td>${s.nisn}</td>
                <td>${s.sekolah}</td>
                <td>Kelas ${s.kelas}</td>
                <td>${s.kecamatan}, ${s.kabupaten}</td>
                <td>
                    <button class="icon-btn" onclick="alert('Detail profil ${s.nama}')"><i class="fi fi-rr-user"></i></button>
                    <button class="icon-btn" style="color:var(--danger)" onclick="window.deleteSiswa(${s.id})"><i class="fi fi-rr-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function handleFilters() {
    const filterKab = document.getElementById('filter-wilayah').value;
    const search = document.getElementById('search-siswa').value.toLowerCase();

    const filtered = masterSiswa.filter(s => {
        const matchKab = (filterKab === "Semua" || s.kabupaten === filterKab);
        const matchSearch = s.nama.toLowerCase().includes(search) || s.nisn.includes(search);
        return matchKab && matchSearch;
    });

    renderTable(filtered);
}

// Dropdown Dinamis di Modal
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

// --- GLOBAL FUNCTIONS ---
window.openAddSiswaModal = () => document.getElementById('addSiswaModal').classList.add('active');
window.closeAddSiswaModal = () => document.getElementById('addSiswaModal').classList.remove('active');

window.deleteSiswa = (id) => {
    if(confirm("Hapus data siswa ini?")) {
        masterSiswa = masterSiswa.filter(s => s.id !== id);
        handleFilters();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    const activeMenu = document.getElementById('nav-penerima'); 
    if(activeMenu) activeMenu.classList.add('active');

    generate155Students();
    updateStats();
    setupModalDropdown();

    document.getElementById('filter-wilayah').addEventListener('change', handleFilters);
    document.getElementById('search-siswa').addEventListener('input', handleFilters);

    document.getElementById('form-tambah-siswa').addEventListener('submit', (e) => {
        e.preventDefault();
        const newSiswa = {
            id: Date.now(),
            nama: document.getElementById('in-nama').value,
            nisn: document.getElementById('in-nisn').value,
            sekolah: document.getElementById('in-sekolah').value,
            kelas: document.getElementById('in-kelas').value,
            kabupaten: document.getElementById('in-kab').value,
            kecamatan: document.getElementById('in-kec').value
        };
        masterSiswa.unshift(newSiswa);
        handleFilters();
        window.closeAddSiswaModal();
        e.target.reset();
    });

    handleFilters();
});