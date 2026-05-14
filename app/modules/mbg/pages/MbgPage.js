import { LoadingCard, showDetailModal } from '../../../shared/components/ModuleComponents.js';
import { getMbgState, getMbgSummary, humanLabel } from '../services/mbgApi.js';

const pageState = {
    loading: true,
    error: '',
    state: {}
};

const structure = [
    ['Operasional Harian', ['Rencana Menu', 'Produksi Harian', 'Distribusi MBG', 'Absensi Penerima Manfaat']],
    ['Inventory Dapur', ['Master Bahan Baku', 'Kebutuhan Bahan Harian', 'Penerimaan Bahan Baku', 'Penyimpanan Bahan', 'Pengeluaran ke Produksi', 'Kartu Stok Bahan', 'Stok Opname', 'Food Waste']],
    ['Keuangan SPPG', ['RAB Harian', 'Pengajuan Dana', 'Kas Kecil / Petty Cash', 'Pembayaran Supplier', 'Bukti Pengeluaran', 'Rekonsiliasi VA', 'Laporan Keuangan']],
    ['Supplier Lokal', ['Daftar Supplier', 'Survei Harga Pasar', 'Perbandingan Harga', 'Riwayat Pembelian']],
    ['Compliance', ['Checklist Penerimaan Bahan', 'Monitor Suhu', 'Bank Sampel', 'Sanitasi', 'Audit Trail']],
    ['Laporan', ['Laporan Harian SPPG', 'Laporan 2 Mingguan', 'Laporan Bulanan', 'Laporan Stok', 'Laporan Biaya per Porsi', 'Laporan Selisih / Waste']]
];

const lpjChecklist = [
    'Profil SPPG dan lokasi kegiatan',
    'Sasaran penerima manfaat per periode',
    'Struktur organisasi SPPG',
    'Jadwal operasional dapur',
    'RAB bahan baku harian',
    'RAB operasional',
    'RAB sewa fasilitas',
    'Realisasi penggunaan anggaran',
    'Keterangan penggunaan anggaran',
    'Berita acara pengalihan sisa dana',
    'Surat pernyataan tanggung jawab',
    'Lampiran foto menu, kwitansi, absensi gaji, SPM, dan dokumentasi distribusi'
];

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function money(value) {
    return Number(value || 0).toLocaleString('id-ID');
}

function pct(value, total) {
    if (!total) return '0%';
    return `${Math.round((Number(value || 0) / Number(total || 1)) * 100)}%`;
}

function renderStats() {
    const summary = getMbgSummary(pageState.state);
    const cards = [
        ['Target Porsi', summary.target || summary.beneficiaries, `${summary.schools} sekolah terdaftar`],
        ['Porsi Terkirim', summary.delivered, `${pct(summary.delivered, summary.target)} dari target`],
        ['Realisasi Dana', `Rp ${money(summary.actual)}`, `Sisa Rp ${money(summary.remaining)}`],
        ['Food Waste', `Rp ${money(summary.waste)}`, `${summary.incidentsOpen} insiden aktif`]
    ];
    return `<div class="erp-grid">${cards.map(([label, value, note]) => `<button class="erp-card sipagi-clickable" data-mbg-summary="${esc(label)}" type="button"><div class="erp-stat-label">${esc(label)}</div><div class="erp-stat-value">${esc(value)}</div><div class="erp-stat-note">${esc(note)}</div></button>`).join('')}</div>`;
}

function renderStructure() {
    return `
        <div class="mbg-module-grid">
            ${structure.map(([title, items]) => `
                <section class="erp-card">
                    <div class="product-module-head">
                        <h3>${esc(title)}</h3>
                        <span class="erp-status safe">Aktif</span>
                    </div>
                    <div class="mbg-pill-list">
                        ${items.map((item) => `<button class="mbg-pill sipagi-clickable" data-mbg-node="${esc(title)}" data-mbg-item="${esc(item)}" type="button">${esc(item)}</button>`).join('')}
                    </div>
                </section>
            `).join('')}
        </div>
    `;
}

function renderLpjPanel() {
    const lpj = pageState.state.lpj || {};
    return `
        <section class="erp-card module-card-gap">
            <div class="product-module-head">
                <div>
                    <div class="erp-stat-label">Template LPJ</div>
                    <h3>${esc(lpj.title || 'LPJ Periode MBG')}</h3>
                    <p class="erp-muted">${esc(lpj.period || 'Periode belum diisi')}</p>
                </div>
                <button class="erp-btn" data-mbg-detail="lpj" type="button">Detail LPJ</button>
            </div>
            <div class="mbg-lpj-grid">
                <div><span>Penerimaan</span><strong>Rp ${money(lpj.total_requested)}</strong></div>
                <div><span>Pengeluaran</span><strong>Rp ${money(lpj.total_realized)}</strong></div>
                <div><span>Sisa Dana</span><strong>Rp ${money(lpj.remaining_fund)}</strong></div>
                <div><span>Penerima Aktif</span><strong>${money(lpj.current_beneficiaries)}</strong></div>
            </div>
            <div class="mbg-checklist">
                ${lpjChecklist.map((item, index) => `<button class="mbg-check-item" data-mbg-check="${index}" type="button"><span>${index + 1}</span>${esc(item)}</button>`).join('')}
            </div>
        </section>
    `;
}

function renderOperationalTimeline() {
    const schedule = [
        ['Persiapan Bahan Baku', '18.00 - 01.00 WIB'],
        ['Pengolahan Makanan', '01.00 - 08.00 WIB'],
        ['Pemorsian', '03.00 - 10.00 WIB'],
        ['Distribusi', '07.00 - 14.00 WIB'],
        ['Pencucian Ompreng', '14.00 - 21.00 WIB']
    ];
    return `<section class="erp-card module-card-gap"><h3>Jadwal Operasional Dapur</h3><div class="mbg-timeline">${schedule.map(([name, time]) => `<button class="mbg-timeline-row sipagi-clickable" data-mbg-schedule="${esc(name)}" type="button"><span>${esc(time)}</span><strong>${esc(name)}</strong></button>`).join('')}</div></section>`;
}

function renderTables() {
    const daily = (pageState.state.dailyReports || []).slice(0, 8).map((row) => `<tr class="sipagi-clickable" data-mbg-report="${esc(row.report_id)}"><td>${esc(row.report_date)}</td><td>${money(row.target_portion)}</td><td>${money(row.delivered_portion)}</td><td>${esc(humanLabel(row.status))}</td></tr>`).join('');
    const budgets = (pageState.state.budgets || []).slice(0, 8).map((row) => `<tr class="sipagi-clickable" data-mbg-budget="${esc(row.budget_id)}"><td>${esc(humanLabel(row.module))}</td><td>${esc(row.period)}</td><td>Rp ${money(row.budget_amount)}</td><td>Rp ${money(row.actual_amount)}</td></tr>`).join('');
    return `
        <div class="grid gap-5 lg:grid-cols-2 module-card-gap">
            <section class="erp-card"><h3>Laporan Harian SPPG</h3><div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>Tanggal</th><th>Target</th><th>Terkirim</th><th>Status</th></tr></thead><tbody>${daily || '<tr><td colspan="4">Belum ada laporan harian.</td></tr>'}</tbody></table></div></section>
            <section class="erp-card"><h3>RAB dan Realisasi</h3><div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>Komponen</th><th>Periode</th><th>RAB</th><th>Realisasi</th></tr></thead><tbody>${budgets || '<tr><td colspan="4">Belum ada data anggaran.</td></tr>'}</tbody></table></div></section>
        </div>
    `;
}

function openNodeDetail(title, item) {
    showDetailModal({
        title: item,
        subtitle: title,
        rows: [
            ['Status', 'Siap dikembangkan'],
            ['Sumber data', 'Sheet operasional SIPAGI'],
            ['Nama tampilan', humanLabel(item)],
            ['Aksi berikutnya', 'CRUD, lampiran, dan audit trail mengikuti permission role']
        ]
    });
}

function openLpjDetail() {
    const lpj = pageState.state.lpj || {};
    showDetailModal({
        title: lpj.title || 'LPJ Periode MBG',
        subtitle: lpj.period || 'Periode belum diisi',
        rows: [
            ['Nomor dokumen', esc(lpj.document_number)],
            ['Total penerimaan', `Rp ${money(lpj.total_requested)}`],
            ['Total pengeluaran', `Rp ${money(lpj.total_realized)}`],
            ['Sisa dana', `Rp ${money(lpj.remaining_fund)}`],
            ['Bahan baku', `Rp ${money(lpj.raw_material_realized)}`],
            ['Operasional', `Rp ${money(lpj.operational_realized)}`],
            ['Sewa fasilitas', `Rp ${money(lpj.rent_realized)}`],
            ['Lampiran wajib', 'Foto menu, kwitansi, rekap absen gaji, SPM, foto distribusi']
        ]
    });
}

function renderMbgContent() {
    const root = document.getElementById('mbg-root');
    if (!root) return;
    if (pageState.loading) {
        root.innerHTML = LoadingCard({ title: 'Memuat Dashboard MBG dari Data', text: 'Mengambil operasional, inventori, keuangan, supplier, compliance, dan LPJ...' });
        return;
    }
    if (pageState.error) {
        root.innerHTML = `<div class="erp-card inventory-error"><h3>Dashboard MBG tidak bisa dimuat</h3><p>${esc(pageState.error)}</p><button class="erp-btn primary" data-action="refresh-mbg" type="button">Coba Lagi</button></div>`;
        return;
    }
    root.innerHTML = `${renderStats()}${renderStructure()}${renderLpjPanel()}${renderOperationalTimeline()}${renderTables()}`;
}

async function loadMbg() {
    pageState.loading = true;
    pageState.error = '';
    renderMbgContent();
    try {
        pageState.state = await getMbgState();
    } catch (error) {
        pageState.error = error.message;
    } finally {
        pageState.loading = false;
        renderMbgContent();
    }
}

function bindMbgEvents() {
    document.addEventListener('click', async (event) => {
        if (!document.getElementById('mbg-root')) return;
        const refresh = event.target.closest('[data-action="refresh-mbg"]');
        if (refresh) await loadMbg();
        const node = event.target.closest('[data-mbg-node]');
        if (node) openNodeDetail(node.dataset.mbgNode, node.dataset.mbgItem);
        const lpj = event.target.closest('[data-mbg-detail="lpj"]');
        if (lpj) openLpjDetail();
        const check = event.target.closest('[data-mbg-check]');
        if (check) openNodeDetail('Checklist LPJ', lpjChecklist[Number(check.dataset.mbgCheck)]);
        const schedule = event.target.closest('[data-mbg-schedule]');
        if (schedule) openNodeDetail('Jadwal Operasional Dapur', schedule.dataset.mbgSchedule);
    });
}

let eventsBound = false;

export function MbgPage() {
    return '<div id="mbg-root"></div>';
}

export function initMbgPage() {
    if (!eventsBound) {
        bindMbgEvents();
        eventsBound = true;
    }
    loadMbg();
}

