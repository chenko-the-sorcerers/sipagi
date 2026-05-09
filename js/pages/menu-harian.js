/**
 * menu-harian.js
 * Sistem Manajemen Menu Gizi SIPAGI 
 * Berbasis TKPI & Standar Harga MBG Nasional (Max 8k Porsi Kecil, 10k Porsi Besar)
 */

async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        document.getElementById(containerId).innerHTML = await response.text();
    } catch (e) {
        console.error("Gagal memuat komponen:", e);
    }
}

// --- 1. DATA REFERENSI (TKPI & HARGA MBG) ---

// Harga disesuaikan agar masuk budget MBG Nasional
const TKPI_BASE = {
    karbo: [
        { nama: "Nasi Putih", kkal: 130, prot: 2.4, harga_kecil: 1000, harga_besar: 1500 },
        { nama: "Nasi Merah", kkal: 110, prot: 2.8, harga_kecil: 1200, harga_besar: 1800 },
        { nama: "Ubi Jalar Rebus", kkal: 100, prot: 1.5, harga_kecil: 1000, harga_besar: 1500 },
        { nama: "Kentang Kukus", kkal: 87, prot: 1.9, harga_kecil: 1200, harga_besar: 1800 }
    ],
    hewani: [
        { nama: "Ayam Bakar", kkal: 167, prot: 24.5, harga_kecil: 3000, harga_besar: 4000 },
        { nama: "Ikan Pepes", kkal: 120, prot: 18.0, harga_kecil: 2500, harga_besar: 3500 },
        { nama: "Ayam Suwir", kkal: 150, prot: 20.0, harga_kecil: 2500, harga_besar: 3500 },
        { nama: "Telur Dadar Sayur", kkal: 95, prot: 7.5, harga_kecil: 2000, harga_besar: 3000 }
    ],
    sayur: [
        { nama: "Sayur Asem", kkal: 45, prot: 1.5, harga_kecil: 1000, harga_besar: 1200 },
        { nama: "Sayur Sop", kkal: 35, prot: 1.2, harga_kecil: 1000, harga_besar: 1200 },
        { nama: "Tumis Kangkung", kkal: 28, prot: 1.9, harga_kecil: 800, harga_besar: 1000 },
        { nama: "Capcay", kkal: 52, prot: 2.1, harga_kecil: 1200, harga_besar: 1500 }
    ],
    buah: [
        { nama: "Pisang Ambon", kkal: 92, prot: 1.1, harga_kecil: 1000, harga_besar: 1500 },
        { nama: "Jeruk Manis", kkal: 47, prot: 0.9, harga_kecil: 1500, harga_besar: 2000 },
        { nama: "Pepaya", kkal: 43, prot: 0.5, harga_kecil: 800, harga_besar: 1000 },
        { nama: "Semangka", kkal: 30, prot: 0.6, harga_kecil: 800, harga_besar: 1000 }
    ]
};

let masterMenu = [];

// --- 2. ENGINE GENERATOR (155 DATA) ---

function generate155Menus() {
    masterMenu = [];
    for (let i = 1; i <= 155; i++) {
        // Tentukan jenis porsi (50% Kecil untuk SD/PAUD, 50% Besar untuk SMP/SMA)
        const isPorsiBesar = i % 2 === 0; 
        const tipePorsi = isPorsiBesar ? "Besar (SMP)" : "Kecil (SD)";

        const k = TKPI_BASE.karbo[i % 4];
        const h = TKPI_BASE.hewani[i % 4];
        const s = TKPI_BASE.sayur[i % 4];
        const b = TKPI_BASE.buah[i % 4];
        
        // Kalkulasi Harga Berdasarkan Porsi
        let hargaBahan = 0;
        if (isPorsiBesar) {
            hargaBahan = k.harga_besar + h.harga_besar + s.harga_besar + b.harga_besar + 1000; // +1000 nabati/tahu
        } else {
            hargaBahan = k.harga_kecil + h.harga_kecil + s.harga_kecil + b.harga_kecil + 800; // +800 nabati/tahu
        }

        // Pastikan harga TIDAK MELEBIHI batas MBG (8k / 10k)
        let finalHarga = hargaBahan + 500; // +500 biaya bumbu/masak
        if (isPorsiBesar && finalHarga > 10000) finalHarga = 9800;
        if (!isPorsiBesar && finalHarga > 8000) finalHarga = 7800;

        const totalKkal = k.kkal + h.kkal + s.kkal + b.kkal + (isPorsiBesar ? 100 : 50); 
        const totalProt = (k.prot + h.prot + s.prot + b.prot + 4).toFixed(1); 

        masterMenu.push({
            id: i,
            nama: `Paket MBG ${tipePorsi} #${i.toString().padStart(3, '0')}`,
            tipe: tipePorsi,
            karbo: k.nama,
            hewani: h.nama,
            sayur: s.nama,
            buah: b.nama,
            nabati: "Tempe/Tahu",
            energi: totalKkal,
            protein: totalProt,
            harga: finalHarga,
            rating: (4.5 + (Math.random() * 0.5)).toFixed(1),
            status: "Approved"
        });
    }
}

// --- 3. STATS & SUMMARY ---

function updateStats() {
    const totalHarga = masterMenu.reduce((s, v) => s + v.harga, 0);
    const avgHarga = Math.floor(totalHarga / masterMenu.length);

    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 4) {
        // Update Rata-rata Harga ke UI
        statValues[1].innerText = `Rp ${avgHarga.toLocaleString('id-ID')}`;
    }
}

// --- 4. CALENDAR ENGINE (MEI 2026) ---

function renderMayCalendar() {
    const calendar = document.getElementById('calendar-may');
    const labels = calendar.querySelectorAll('.cal-day-label');
    calendar.innerHTML = '';
    labels.forEach(l => calendar.appendChild(l));

    // 1 Mei 2026 jatuh pada hari JUMAT (Indeks 5)
    for (let i = 0; i < 5; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-date empty';
        calendar.appendChild(emptyDiv);
    }

    for (let d = 1; d <= 31; d++) {
        const menu = masterMenu[d - 1]; 
        const dayOfWeek = (d + 4) % 7; 
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = d === 2; // Simulasi 2 Mei 2026

        const dateDiv = document.createElement('div');
        dateDiv.className = `cal-date ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`;
        dateDiv.onclick = () => window.viewDetail(menu.id);
        
        // Bedakan warna harga berdasarkan ukuran porsi (Biru untuk Besar, Hijau untuk Kecil)
        const priceColor = menu.tipe.includes("Besar") ? "#0056B3" : "#059669";

        dateDiv.innerHTML = `
            <div>
                <div class="date-num">${d}</div>
                <div class="date-menu">${menu.hewani} + ${menu.sayur}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="price-tag" style="color:${priceColor};">Rp${Math.round(menu.harga/1000)}k</div>
                <span class="tkpi-badge">${menu.tipe.includes("Besar") ? "SMP" : "SD"}</span>
            </div>
        `;
        calendar.appendChild(dateDiv);
    }
}

// --- 5. TABLE DATABASE RENDER ---

function renderTable(data) {
    const tbody = document.getElementById('db-menu-body');
    tbody.innerHTML = '';

    data.slice(0, 15).forEach(m => {
        const isBesar = m.tipe.includes("Besar");
        const priceColor = isBesar ? "#0056B3" : "#059669";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${m.id.toString().padStart(3, '0')}</td>
            <td>
                <strong>${m.nama}</strong><br>
                <span class="tkpi-badge" style="margin-top:2px; background:${isBesar ? '#e0e7ff' : '#dcfce7'}; color:${isBesar ? '#4338ca' : '#166534'};">
                    ${isBesar ? 'Max Rp 10.000' : 'Max Rp 8.000'}
                </span>
            </td>
            <td style="font-size: 0.8rem; color: var(--text-gray);">
                ${m.karbo}, ${m.hewani}, ${m.sayur}, ${m.buah}
            </td>
            <td><strong>${m.energi}</strong> <small>kkal</small></td>
            <td class="price-tag" style="color:${priceColor};">Rp ${m.harga.toLocaleString('id-ID')}</td>
            <td>
                <button class="icon-btn" onclick="window.viewDetail(${m.id})"><i class="fi fi-rr-eye"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 6. MODAL INTERACTION ---

window.openAddMenuModal = () => document.getElementById('addMenuModal').classList.add('active');
window.closeAddMenuModal = () => document.getElementById('addMenuModal').classList.remove('active');

window.viewDetail = (id) => {
    const m = masterMenu.find(item => item.id === id);
    if (!m) return;

    const isBesar = m.tipe.includes("Besar");

    document.getElementById('detailMenuModal').classList.add('active');
    document.getElementById('detail-info').innerHTML = `
        <h3 style="font-family:'Outfit'; color:var(--dark-blue); margin-bottom:0.5rem;">${m.nama}</h3>
        <p class="tkpi-badge" style="font-size:0.8rem;">Target: ${isBesar ? 'Siswa SMP/SMA (Max 10k)' : 'Siswa PAUD/SD (Max 8k)'}</p>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:left; background:#f0f9ff; padding:1.25rem; border-radius:16px; margin:1.5rem 0;">
            <div><small style="color:var(--primary-blue); font-weight:700;">KARBOHIDRAT</small><br><strong>${m.karbo}</strong></div>
            <div><small style="color:#7c3aed; font-weight:700;">LAUK HEWANI</small><br><strong>${m.hewani}</strong></div>
            <div><small style="color:#059669; font-weight:700;">SAYURAN</small><br><strong>${m.sayur}</strong></div>
            <div><small style="color:#f59e0b; font-weight:700;">BUAH SEGAR</small><br><strong>${m.buah}</strong></div>
            <div style="grid-column: span 2; border-top: 1px dashed #cfe2ff; padding-top: 10px; margin-top: 5px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small>Estimasi HPP (Harga Pokok Porsi):</small>
                    <strong class="price-tag" style="font-size:1.2rem; color:${isBesar ? '#0056B3' : '#059669'};">
                        Rp ${m.harga.toLocaleString('id-ID')}
                    </strong>
                </div>
            </div>
        </div>

        <div style="display:flex; justify-content:space-around; padding-bottom:1rem;">
            <div style="text-align:center;"><strong>${m.energi}</strong><br><small>Energi (TKPI)</small></div>
            <div style="text-align:center;"><strong>${m.protein}g</strong><br><small>Protein</small></div>
            <div style="text-align:center;"><strong>${m.rating}</strong><br><small>Rating</small></div>
        </div>
    `;
};

window.closeDetailModal = () => document.getElementById('detailMenuModal').classList.remove('active');

// --- 7. CHART LOGIC ---

function renderNutritionChart() {
    const ctx = document.getElementById('nutritionDonutChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Karbohidrat', 'Protein', 'Lemak', 'Serat'],
            datasets: [{
                data: [55, 25, 15, 5],
                backgroundColor: ['#0056B3', '#7C3AED', '#F59E0B', '#059669'],
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

// --- 8. INITIALIZE ---

document.addEventListener('DOMContentLoaded', async () => {
    // Muat Sidebar
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    const activeMenu = document.getElementById('nav-menu-harian'); 
    if (activeMenu) activeMenu.classList.add('active');

    // Jalankan Sistem Utama
    generate155Menus();
    updateStats();
    renderMayCalendar();
    renderTable(masterMenu);
    renderNutritionChart();

    // Event Pencarian Database
    document.getElementById('search-db').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = masterMenu.filter(m => 
            m.nama.toLowerCase().includes(val) || 
            m.hewani.toLowerCase().includes(val) ||
            m.karbo.toLowerCase().includes(val)
        );
        renderTable(filtered);
    });

    // Form Submit (Simulasi Tambah Data)
    document.getElementById('form-tambah-menu').addEventListener('submit', (e) => {
        e.preventDefault();
        const newMenu = {
            id: masterMenu.length + 1,
            nama: document.getElementById('m-nama').value,
            tipe: "Kecil (SD)", // Default saat nambah manual
            karbo: document.getElementById('m-karbo-name').value,
            hewani: document.getElementById('m-hewani').value,
            sayur: document.getElementById('m-sayur').value,
            buah: "Pisang (Default)",
            energi: 400,
            protein: 20,
            harga: 7500, // Harga default masuk limit porsi kecil
            rating: "5.0",
            status: "Approved"
        };
        masterMenu.unshift(newMenu);
        renderTable(masterMenu);
        updateStats();
        window.closeAddMenuModal();
        alert("Menu berhasil ditambahkan! Harga di-set maksimal Rp 8.000 (Porsi Kecil).");
        e.target.reset();
    });
});