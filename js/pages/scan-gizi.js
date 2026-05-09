async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        document.getElementById(containerId).innerHTML = await response.text();
    } catch (error) {
        console.error(`Gagal memuat ${url}:`, error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Muat Sidebar
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    
    // Karena ini halaman khusus, kita hilangkan status aktif dari menu utama (atau set ke menu dashboard)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // 2. Logika UI AI Scanner
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const btnAnalyze = document.getElementById('btn-analyze');
    const dropZone = document.getElementById('drop-zone');
    const aiLoading = document.getElementById('ai-loading');
    const aiResult = document.getElementById('ai-result');

    // Menangani saat gambar dipilih
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                previewImage.src = event.target.result;
                previewImage.style.display = 'block'; // Tampilkan gambar
                btnAnalyze.style.display = 'flex'; // Munculkan tombol proses
                
                // Reset area hasil
                aiResult.style.display = 'none';
                aiResult.innerHTML = ''; 
            }
            reader.readAsDataURL(file);
        }
    });

    // Simulasi Proses AI (Nanti hubungkan ke API Vision aslimu di sini)
    btnAnalyze.addEventListener('click', () => {
        // Sembunyikan tombol, tampilkan loading spinner
        btnAnalyze.style.display = 'none';
        aiLoading.style.display = 'flex';
        aiResult.style.display = 'none';

        // Simulasi delay AI (3 detik)
        setTimeout(() => {
            aiLoading.style.display = 'none';
            
            // Render UI Hasil (Memakai desain HTML modal kamu sebelumnya)
            aiResult.innerHTML = `
                <div style="background: var(--bg-light); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--primary-blue);">
                    <h3 style="font-family: 'Outfit'; font-weight: 700; color: var(--dark-blue); margin-bottom: 0.5rem;">
                        Nasi Ayam Suwir + Sayur Asem
                    </h3>
                    <p style="color: var(--text-gray); font-size: 0.85rem;">Confidence Score: <strong>98.5%</strong></p>
                </div>

                <div class="nutrition-card" style="margin-bottom: 1rem;">
                    <h4>🔥 Kandungan Terdeteksi</h4>
                    <div class="nutrition-item">
                        <span class="nutrition-label">Total Kalori</span>
                        <span class="nutrition-value">450 kkal</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-label">Protein</span>
                        <span class="nutrition-value">18g (16%)</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-label">Karbohidrat</span>
                        <span class="nutrition-value">62g (55%)</span>
                    </div>
                </div>

                <div style="padding: 1rem; background: var(--success-light); border-radius: 8px; border-left: 4px solid var(--success); margin-bottom: 1.5rem;">
                    <p style="color: var(--success); font-weight: 700;">✓ LOLOS STANDAR GIZI</p>
                </div>

                <button class="btn btn-primary" style="width: 100%; justify-content: center;">Simpan ke Database</button>
            `;
            aiResult.style.display = 'block';

        }, 3000);
    });
});