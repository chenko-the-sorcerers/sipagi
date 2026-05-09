async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        document.getElementById(containerId).innerHTML = await response.text();
    } catch (e) { console.error(e); }
}

const kabupatenDIY = ["Sleman", "Bantul", "Yogyakarta", "Gunungkidul", "Kulon Progo"];
const kecamatanDIY = {
    "Sleman": ["Godean", "Depok", "Mlati"],
    "Bantul": ["Bantul", "Sewon", "Kasihan"],
    "Yogyakarta": ["Gondokusuman", "Umbulharjo", "Danurejan"],
    "Gunungkidul": ["Wonosari", "Playen"],
    "Kulon Progo": ["Wates", "Sentolo"]
};

// Titik Koordinat Dapur Pusat MBG (Contoh di sekitar Kota Yogyakarta)
const DAPUR_PUSAT = { lat: -7.801, lng: 110.364, nama: "Dapur Pusat MBG DIY" };

let masterDistribusi = [];
let map = null; 

// --- 1. GENERATE DATA (Termasuk Koordinat Sekolah) ---
function generateData() {
    masterDistribusi = [];
    for (let i = 1; i <= 155; i++) {
        const kab = kabupatenDIY[i % kabupatenDIY.length];
        const kec = kecamatanDIY[kab][i % kecamatanDIY[kab].length];
        
        // Proporsi Status: Terkirim(100), Dalam Perjalanan(40), Pending(15)
        const status = i <= 100 ? "Terkirim" : (i <= 140 ? "Dalam Perjalanan" : "Pending");
        
        // Sebar koordinat sekolah secara acak di sekitar DIY (radius ~15km dari pusat)
        const latOffset = (Math.random() - 0.5) * 0.3;
        const lngOffset = (Math.random() - 0.5) * 0.3;

        masterDistribusi.push({
            id: `R-${1000 + i}`,
            sekolah: `SDN ${i.toString().padStart(3, '0')} ${kec}`,
            kabupaten: kab,
            kecamatan: kec,
            porsi: Math.floor(Math.random() * 50) + 100,
            waktu: `08:${(i % 60).toString().padStart(2, '0')}`,
            status: status,
            lat: DAPUR_PUSAT.lat + latOffset,
            lng: DAPUR_PUSAT.lng + lngOffset
        });
    }
}

// --- 2. RENDER COMPONENTS ---

function renderProgressStats() {
    const terkirim = masterDistribusi.filter(d => d.status === "Terkirim").length;
    const otw = masterDistribusi.filter(d => d.status === "Dalam Perjalanan").length;
    const pending = masterDistribusi.filter(d => d.status === "Pending").length;
    const total = masterDistribusi.length;

    document.getElementById('progress-container').innerHTML = `
        <div class="progress-item">
            <div class="progress-header">
                <span class="progress-label">Terkirim</span>
                <span class="progress-value">${terkirim} Lokasi (${Math.round(terkirim/total*100)}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-fill success" style="width: ${(terkirim/total*100)}%"></div></div>
        </div>
        <div class="progress-item">
            <div class="progress-header">
                <span class="progress-label">Dalam Perjalanan</span>
                <span class="progress-value">${otw} Lokasi (${Math.round(otw/total*100)}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-fill warning" style="width: ${(otw/total*100)}%"></div></div>
        </div>
        <div class="progress-item">
            <div class="progress-header">
                <span class="progress-label">Belum Terkirim (Pending)</span>
                <span class="progress-value">${pending} Lokasi (${Math.round(pending/total*100)}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-fill danger" style="width: ${(pending/total*100)}%"></div></div>
        </div>
    `;
}

function renderTable(data) {
    const tbody = document.getElementById('table-body-distribusi');
    tbody.innerHTML = '';
    data.forEach(d => {
        const badge = d.status === "Terkirim" ? "success" : (d.status === "Dalam Perjalanan" ? "warning" : "danger");
        const row = document.createElement('tr');
        row.className = 'clickable-row';
        row.onclick = () => window.openRouteModal(d.id);
        
        row.innerHTML = `
            <td><strong>#${d.id}</strong></td>
            <td>${d.sekolah}</td>
            <td>${d.kecamatan}, ${d.kabupaten}</td>
            <td>${d.porsi} Porsi</td>
            <td>${d.status === 'Terkirim' ? d.waktu : '--:--'}</td>
            <td><span class="status-badge ${badge}">${d.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function renderDistributionChart() {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    const dataValues = kabupatenDIY.map(kab => 
        masterDistribusi.filter(d => d.kabupaten === kab).reduce((sum, item) => sum + item.porsi, 0)
    );

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: kabupatenDIY,
            datasets: [{ label: 'Porsi Dialokasikan', data: dataValues, backgroundColor: '#0056B3', borderRadius: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// --- 3. MAP & MODAL JOURNEY LOGIC ---

window.openRouteModal = (id) => {
    const data = masterDistribusi.find(d => d.id === id);
    document.getElementById('routeModal').classList.add('active');
    document.getElementById('modalTitle').innerText = `Perjalanan Rute #${data.id}`;
    document.getElementById('modalSchoolInfo').innerHTML = `
        <strong>Tujuan: ${data.sekolah}</strong><br>
        Kecamatan: ${data.kecamatan}, Kab. ${data.kabupaten}<br>
        Muatan: <strong style="color:var(--primary-blue)">${data.porsi} Porsi</strong> Makan Siang
    `;

    // A. Render Timeline berdasarkan Status
    const timeline = document.getElementById('journeyTimeline');
    let step3Status = "pending", step4Status = "pending";
    let step3Time = "--:--", step4Time = "--:--";

    if (data.status === "Dalam Perjalanan") {
        step3Status = "active"; // Pulse Animation Hijau/Kuning
        step3Time = "07:30";
    } else if (data.status === "Terkirim") {
        step3Status = "completed";
        step4Status = "completed";
        step3Time = "07:30";
        step4Time = data.waktu;
    }

    timeline.innerHTML = `
        <div class="timeline-item completed">
            <div class="timeline-dot"></div>
            <div class="timeline-content"><h4>Dapur Pusat (Persiapan)</h4><p>06:30 WIB</p></div>
        </div>
        <div class="timeline-item completed">
            <div class="timeline-dot"></div>
            <div class="timeline-content"><h4>Armada Berangkat</h4><p>07:00 WIB</p></div>
        </div>
        <div class="timeline-item ${step3Status}">
            <div class="timeline-dot"></div>
            <div class="timeline-content"><h4>Dalam Perjalanan (GPS Aktif)</h4><p>${step3Time} WIB</p></div>
        </div>
        <div class="timeline-item ${step4Status}">
            <div class="timeline-dot"></div>
            <div class="timeline-content"><h4>Tiba di Sekolah Tujuan</h4><p>${step4Time} WIB</p></div>
        </div>
    `;

    // B. Leaflet Map Initialization dengan Garis Rute (Polyline)
    setTimeout(() => {
        if (map) map.remove(); 
        
        map = L.map('routeMap').setView([DAPUR_PUSAT.lat, DAPUR_PUSAT.lng], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // Marker Dapur Pusat
        const dapurIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', iconSize: [32, 32] });
        L.marker([DAPUR_PUSAT.lat, DAPUR_PUSAT.lng], {icon: dapurIcon}).addTo(map).bindPopup("<b>Dapur Pusat MBG</b>").openPopup();

        // Marker Sekolah Tujuan
        const sekolahIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/167/167707.png', iconSize: [32, 32] });
        L.marker([data.lat, data.lng], {icon: sekolahIcon}).addTo(map).bindPopup(`<b>${data.sekolah}</b>`);

        // Gambar Garis Rute (Polyline)
        const latlngs = [
            [DAPUR_PUSAT.lat, DAPUR_PUSAT.lng],
            [data.lat, data.lng]
        ];
        
        const polyline = L.polyline(latlngs, {color: '#0056B3', weight: 4, dashArray: '10, 10'}).addTo(map);
        
        // Auto-zoom agar kedua titik terlihat
        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }, 300); // Timeout agar CSS Modal selesai dirender sebelum peta di-load
};

window.closeRouteModal = () => document.getElementById('routeModal').classList.remove('active');

// --- 4. INITIALIZE ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    const activeMenu = document.getElementById('nav-distribusi');
    if(activeMenu) activeMenu.classList.add('active');

    generateData();
    renderProgressStats(); // Isi data progress bar status
    renderTable(masterDistribusi);
    renderDistributionChart();

    // Setup Filter Dropdown
    const filter = document.getElementById('filter-kabupaten');
    kabupatenDIY.forEach(kab => {
        const opt = document.createElement('option');
        opt.value = kab; opt.innerText = kab;
        filter.appendChild(opt);
    });

    filter.onchange = (e) => {
        const val = e.target.value;
        const filtered = val === "Semua" ? masterDistribusi : masterDistribusi.filter(d => d.kabupaten === val);
        renderTable(filtered);
    };

    document.getElementById('search-distribusi').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = masterDistribusi.filter(d => d.sekolah.toLowerCase().includes(val) || d.id.toLowerCase().includes(val));
        renderTable(filtered);
    });
});