/**
 * kualitas.js - SIPAGI
 * Real-time AI Vision with Google Gemini 1.5 Flash (Fixed API Version)
 * Developer: Marchel Andrian Shevchenko (Chen)
 */

// --- 1. CONFIGURATION ---
const GEMINI_API_KEY = "AIzaSyDhYF-Wt_EK9vUymjmzEALQdqj00dmn9oI"; 
const GEMINI_MODEL = "gemini-2.5-flash"; // Pastikan string ini benar

async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = html;
    } catch (e) { console.error("Sidebar load error:", e); }
}

// --- 2. CAMERA ENGINE ---

window.initCamera = async () => {
    const video = document.getElementById('webcam-video');
    const placeholder = document.getElementById('camera-placeholder');
    const btnScan = document.getElementById('btn-scan-action');
    const statusBox = document.getElementById('ai-status-box');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Gunakan HTTPS atau Localhost untuk akses kamera.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: 1280, height: 720 }, 
            audio: false 
        });
        
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            video.play();
            if (video) video.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            if (btnScan) {
                btnScan.disabled = false;
                btnScan.style.opacity = "1";
            }
            if (statusBox) statusBox.innerHTML = `<p style="color:var(--success); font-weight:700;">✅ SIPAGI Sistem Audit Gizi Ready</p>`;
        };
    } catch (err) {
        console.error("Camera Access Error:", err);
        alert("Gagal akses kamera: " + err.message);
    }
};

window.captureAndAnalyze = async () => {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('capture-canvas');
    const context = canvas.getContext('2d');
    const scanLine = document.getElementById('ai-scan-line');
    const statusBox = document.getElementById('ai-status-box');
    const resultBox = document.getElementById('ai-result-box');

    if (!video || !video.srcObject || video.paused) {
        alert("Aktifkan kamera dulu, Chen!");
        return;
    }

    // Visual State
    if (scanLine) scanLine.style.display = 'block';
    if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.innerHTML = `<div class="ai-loader"></div><p>🤖 SIPAGI Sistem Audit Gizi sedang memproses citra...</p>`;
    }
    if (resultBox) resultBox.style.display = 'none';

    // Capture
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Gemini butuh base64 murni tanpa prefix
    const base64Data = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

    // API Call
    const analysis = await callGeminiVision(base64Data);
    if (scanLine) scanLine.style.display = 'none';

    if (analysis && !analysis.error) {
        if (statusBox) statusBox.style.display = 'none';
        if (resultBox) {
            resultBox.style.display = 'block';
            const isBesar = analysis.porsi.toLowerCase().includes("besar");
            const cap = isBesar ? 10000 : 8000;
            const isSafe = analysis.est_harga <= cap;

            resultBox.innerHTML = `
                <div style="text-align:center; margin-bottom:1.2rem;">
                    <span class="quality-tag ${analysis.skor >= 90 ? 'tag-safe' : 'tag-warn'}">
                        SKOR GIZI: ${analysis.skor}/100
                    </span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#f0f9ff; padding:1.25rem; border-radius:16px; border:1px solid #cfe2ff; font-size:0.85rem;">
                    <div><small>Menu Terdeteksi</small><br><strong>${analysis.menu}</strong></div>
                    <div><small>Tipe Porsi</small><br><strong>${analysis.porsi}</strong></div>
                    <div><small>Energi</small><br><strong>${analysis.kkal} kkal</strong></div>
                    <div><small>Protein</small><br><strong>${analysis.protein} g</strong></div>
                    <div style="grid-column: span 2; border-top:1px dashed #abc; padding-top:10px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                        <small>Estimasi HPP:</small>
                        <strong style="color:${isSafe ? '#166534' : '#991b1b'}; font-size:1.1rem;">Rp ${analysis.est_harga.toLocaleString('id-ID')}</strong>
                    </div>
                </div>
                <div style="margin-top:1rem; padding:1rem; background:#fff; border:1px solid #e2e8f0; border-radius:12px; font-size:0.8rem;">
                    <strong style="color:var(--primary-blue)">💡 Gemini Insight:</strong> ${analysis.insight}
                </div>
            `;
        }
    } else {
        if (statusBox) statusBox.innerHTML = `<p style="color:var(--danger)">❌ Gagal Audit: <br><small>${analysis?.error || 'Koneksi Terputus'}</small></p>`;
    }
};

async function callGeminiVision(base64Data) {
    const prompt = `Analisis citra piring Makan Bergizi Gratis (MBG) ini. Berikan JSON murni tanpa markdown: { "menu": string, "porsi": "Kecil/Besar", "kkal": number, "protein": number, "est_harga": number, "skor": number, "insight": string }. Standar: Kecil SD (max 8rb), Besar SMP (max 10rb).`;

    // FIXED URL STRUCTURE
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                    ]
                }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            return { error: err.error.message };
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        return JSON.parse(textResponse);
    } catch (e) {
        return { error: "Gagal terhubung ke API Gemini." };
    }
}

// --- 3. DASHBOARD LOGIC (155 SEKOLAH) ---

let qualityLogs = [];
function initDashboard() {
    qualityLogs = [];
    const kab = ["Sleman", "Bantul", "Yogyakarta", "Gunungkidul", "Kulon Progo"];
    for (let i = 1; i <= 155; i++) {
        qualityLogs.push({
            id: i,
            sekolah: `SDN ${i.toString().padStart(3, '0')} ${kab[i % 5]}`,
            kabupaten: kab[i % 5],
            tipe: (i % 2 === 0) ? "Besar" : "Kecil",
            skor: 82 + (i % 18),
            status: "Sesuai",
            tanggal: "02 Mei 2026"
        });
    }

    const miniTable = document.getElementById('quality-mini-table');
    if (miniTable) {
        miniTable.innerHTML = qualityLogs.slice(0, 15).map(log => `
            <tr>
                <td><strong>${log.sekolah}</strong></td>
                <td>${log.skor}</td>
                <td><span class="quality-tag tag-safe">Baik</span></td>
            </tr>
        `).join('');
    }

    const mainTable = document.getElementById('quality-table-body');
    if (mainTable) renderQualityTable(qualityLogs);
}

function renderQualityTable(data) {
    const tbody = document.getElementById('quality-table-body');
    if (!tbody) return;
    tbody.innerHTML = data.slice(0, 15).map(item => `
        <tr>
            <td>${item.tanggal}</td>
            <td><strong>${item.sekolah}</strong></td>
            <td>Porsi ${item.tipe}</td>
            <td>${item.skor}</td>
            <td><span class="quality-tag tag-safe">${item.status}</span></td>
            <td><button class="icon-btn" onclick="window.viewDetail(${item.id})"><i class="fi fi-rr-eye"></i></button></td>
        </tr>
    `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Sidebar ID nav-kualitas sesuai permintaan
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    const activeNav = document.getElementById('nav-kualitas');
    if (activeNav) activeNav.classList.add('active');

    initDashboard();
    
    // Donut Chart
    const ctx = document.getElementById('qualityPieChart');
    if (ctx) {
        new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: { 
                labels: ['Layak', 'Review'], 
                datasets: [{ 
                    data: [142, 13], 
                    backgroundColor: ['#059669', '#F59E0B'],
                    borderWidth: 0 
                }] 
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
        });
    }

    const filterKab = document.getElementById('filter-kabupaten');
    if (filterKab) {
        filterKab.addEventListener('change', (e) => {
            const val = e.target.value;
            const filtered = val === "Semua" ? qualityLogs : qualityLogs.filter(log => log.kabupaten === val);
            renderQualityTable(filtered);
        });
    }
});

window.viewDetail = (id) => {
    const item = qualityLogs.find(d => d.id === id);
    if (!item) return;
    const modal = document.getElementById('analysisModal');
    if (modal) {
        document.getElementById('analysis-detail-content').innerHTML = `
            <p><strong>Sekolah:</strong> ${item.sekolah}</p>
            <p><strong>Skor:</strong> ${item.skor}/100</p>
            <p><strong>Wilayah:</strong> ${item.kabupaten}</p>
        `;
        modal.classList.add('active');
    }
};

window.closeModal = () => {
    const modal = document.getElementById('analysisModal');
    if (modal) modal.classList.remove('active');
};