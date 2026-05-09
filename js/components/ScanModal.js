export function ScanModal() {
    return `
        <div id="scanModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Hasil Scan Gizi Makanan</h2>
                    <button class="close-btn" onclick="closeScanModal()">×</button>
                </div>
                
                <div style="background: var(--bg-light); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-family: 'Outfit'; font-weight: 700; color: var(--dark-blue); margin-bottom: 1rem;">
                        📸 Nasi Ayam Suwir + Sayur Asem
                    </h3>
                    <p style="color: var(--text-gray); margin-bottom: 1rem;">
                        <strong>Waktu Scan:</strong> 20 April 2026, 08:30 WIB | <strong>Lokasi:</strong> SDN 01 Depok
                    </p>
                </div>

                <div class="nutrition-grid">
                    <div class="nutrition-card">
                        <h4>📊 Informasi Umum</h4>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Berat Porsi</span>
                            <span class="nutrition-value">350g</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Total Kalori</span>
                            <span class="nutrition-value">450 kkal</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Kategori</span>
                            <span class="nutrition-value">Makanan Utama</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Status Gizi</span>
                            <span class="nutrition-value" style="color: var(--success);">✓ Sesuai Standar</span>
                        </div>
                    </div>

                    <div class="nutrition-card">
                        <h4>🥗 Komposisi Bahan</h4>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Nasi Putih</span>
                            <span class="nutrition-value">200g</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Ayam Suwir</span>
                            <span class="nutrition-value">80g</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Sayur Asem</span>
                            <span class="nutrition-value">70g</span>
                        </div>
                    </div>

                    <div class="nutrition-card">
                        <h4>🔥 Kandungan Kalori & Makronutrien</h4>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Protein</span>
                            <span class="nutrition-value">18g (16%)</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Karbohidrat</span>
                            <span class="nutrition-value">62g (55%)</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Lemak</span>
                            <span class="nutrition-value">12g (24%)</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Serat</span>
                            <span class="nutrition-value">3g</span>
                        </div>
                    </div>

                    <div class="nutrition-card">
                        <h4>💊 Vitamin & Mineral</h4>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Vitamin A</span>
                            <span class="nutrition-value">450 IU</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Vitamin C</span>
                            <span class="nutrition-value">12mg</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Kalsium</span>
                            <span class="nutrition-value">85mg</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Zat Besi</span>
                            <span class="nutrition-value">2.5mg</span>
                        </div>
                    </div>

                    <div class="nutrition-card">
                        <h4>✅ Standar Pemenuhan Gizi</h4>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Target Protein</span>
                            <span class="nutrition-value">15-20g ✓</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Target Kalori</span>
                            <span class="nutrition-value">400-500 kkal ✓</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Target Serat</span>
                            <span class="nutrition-value">2-5g ✓</span>
                        </div>
                    </div>

                    <div class="nutrition-card">
                        <h4>📋 Rekomendasi & Catatan</h4>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Tingkat Keseimbangan</span>
                            <span class="nutrition-value" style="color: var(--success);">Seimbang</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Kelayakan Distribusi</span>
                            <span class="nutrition-value" style="color: var(--success);">Layak</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Catatan</span>
                            <span class="nutrition-value">Menu berkualitas tinggi, cocok untuk anak sekolah</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 1.5rem; padding: 1rem; background: var(--success-light); border-radius: 8px; border-left: 4px solid var(--success);">
                    <p style="color: var(--success); font-weight: 700;">
                        ✓ HASIL SCAN: LOLOS STANDAR GIZI
                    </p>
                    <p style="color: var(--text-gray); font-size: 0.9rem; margin-top: 0.5rem;">
                        Menu ini telah memenuhi semua standar nutrisi yang ditetapkan dan siap untuk didistribusikan kepada siswa penerima manfaat.
                    </p>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
                    <button class="btn btn-outline" onclick="closeScanModal()">Tutup</button>
                    <button class="btn btn-primary">Setujui & Distribusikan</button>
                </div>
            </div>
        </div>
    `;
}