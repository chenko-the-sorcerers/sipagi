// import { Sidebar } from './components/Sidebar.js';
// import { Topbar } from './components/Topbar.js';
import { ScanModal } from './components/ScanModal.js';
import { Dashboard } from './pages/dashboard.js';

// --- Nanti uncomment (hilangkan //) baris di bawah ini saat file JS-nya sudah kamu buat! ---
// import { ProgramMBG } from './pages/ProgramMBG.js';
// import { Sekolah } from './pages/Sekolah.js';
// import { Penerima } from './pages/Penerima.js';
// import { Distribusi } from './pages/Distribusi.js';
// import { Kualitas } from './pages/Kualitas.js';
// import { MenuHarian } from './pages/MenuHarian.js';
// import { StatusKesehatan } from './pages/StatusKesehatan.js';
// import { LaporanHarian } from './pages/LaporanHarian.js';
// import { AnalisisData } from './pages/AnalisisData.js';
// import { ExportData } from './pages/ExportData.js';

// Objek untuk menyimpan judul halaman
const titles = {
    'dashboard': 'Dashboard',
    'program-mbg': 'Program MBG',
    'sekolah': 'Sekolah Penerima',
    'penerima': 'Penerima Manfaat',
    'distribusi': 'Distribusi Pangan',
    'kualitas': 'Kualitas Gizi',
    'menu-harian': 'Menu Harian',
    'status-kesehatan': 'Status Kesehatan',
    'laporan-harian': 'Laporan Harian',
    'analisis-data': 'Analisis Data',
    'export-data': 'Export Data'
};

// Fungsi untuk me-render kerangka utama aplikasi pertama kali
function renderApp() {
    const app = document.getElementById('app');
    
    // Render Layout Utama (Sidebar + Topbar + Container Halaman)
    app.innerHTML = `
        ${Sidebar()}
        <div class="main-content">
            ${Topbar()}
            <!-- Wadah dinamis untuk ganti-ganti halaman -->
            <div id="page-content">
                ${Dashboard()} 
            </div>
        </div>
    `;

    // Render Modal di luar layout utama agar tidak tertimpa
    const modalRoot = document.getElementById('modal-root');
    if(modalRoot) {
        modalRoot.innerHTML = ScanModal();
    }

    // Event listener untuk klik di luar kotak modal (agar modal tertutup)
    window.onclick = function(event) {
        const modal = document.getElementById('scanModal');
        if (event.target == modal) {
            closeScanModal();
        }
    }
}

// Fungsi routing untuk pindah halaman dari menu Sidebar
window.showSection = function(sectionId) {
    const pageContent = document.getElementById('page-content');

    // Logic untuk merender komponen JS sesuai section yang diklik
    switch (sectionId) {
        case 'dashboard':
            pageContent.innerHTML = Dashboard();
            break;
            
        /* --- UNCOMMENT KODE DI BAWAH INI SETELAH FILE HALAMANNYA KAMU BUAT ---
        case 'program-mbg':
            pageContent.innerHTML = ProgramMBG();
            break;
        case 'sekolah':
            pageContent.innerHTML = Sekolah();
            break;
        case 'penerima':
            pageContent.innerHTML = Penerima();
            break;
        case 'distribusi':
            pageContent.innerHTML = Distribusi();
            break;
        case 'kualitas':
            pageContent.innerHTML = Kualitas();
            break;
        case 'menu-harian':
            pageContent.innerHTML = MenuHarian();
            break;
        case 'status-kesehatan':
            pageContent.innerHTML = StatusKesehatan();
            break;
        case 'laporan-harian':
            pageContent.innerHTML = LaporanHarian();
            break;
        case 'analisis-data':
            pageContent.innerHTML = AnalisisData();
            break;
        case 'export-data':
            pageContent.innerHTML = ExportData();
            break;
        */
        
        default:
            // Tampilan "Placeholder" jika file halaman belum kamu buat
            pageContent.innerHTML = `
                <div class="content-section active" style="padding: 4rem 2rem; text-align: center;">
                    <i class="fi fi-rr-rocket-lunch" style="font-size: 4rem; color: var(--primary-blue);"></i>
                    <h2 style="margin-top: 1.5rem; color: var(--dark-blue);">Halaman ${titles[sectionId]}</h2>
                    <p style="color: var(--text-gray); margin-top: 0.5rem;">File komponen JS untuk halaman ini belum diaktifkan.</p>
                </div>
            `;
    }

    // 1. Update warna state aktif di Sidebar
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        // Cek jika atribut onclick milik tombol mengandung id halaman yang sedang dibuka
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(sectionId)) {
            item.classList.add('active');
        }
    });

    // 2. Update title dan breadcrumb di Topbar
    const pageTitle = titles[sectionId] || 'Dashboard';
    document.getElementById('page-title').innerText = pageTitle;
    document.getElementById('breadcrumb-text').innerText = pageTitle;
    
    // 3. Scroll kembali ke atas setiap kali ganti halaman
    window.scrollTo(0, 0);
}

// Global functions untuk membuka & menutup Modal
window.openScanModal = function() {
    const modal = document.getElementById('scanModal');
    if(modal) modal.classList.add('active');
}

window.closeScanModal = function() {
    const modal = document.getElementById('scanModal');
    if(modal) modal.classList.remove('active');
}

// Jalankan fungsi renderApp() saat seluruh HTML selesai dimuat browser
document.addEventListener('DOMContentLoaded', renderApp);