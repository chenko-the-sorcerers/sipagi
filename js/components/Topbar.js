export function Topbar() {
    return `
        <div class="topbar">
            <div class="topbar-left">
                <h2 id="page-title">Dashboard</h2>
                <div class="breadcrumb">
                    <span>Home</span>
                    <span>/</span>
                    <span id="breadcrumb-text">Dashboard</span>
                </div>
            </div>
            <div class="topbar-right">
                <div class="search-box">
                    <i class="fi fi-rr-search"></i>
                    <input type="text" placeholder="Cari sekolah, menu, atau laporan...">
                </div>
                <button class="icon-btn">
                    <i class="fi fi-rr-bell"></i>
                    <span class="notification-badge">3</span>
                </button>
                <button class="icon-btn">
                    <i class="fi fi-rr-user"></i>
                </button>
            </div>
        </div>
    `;
}