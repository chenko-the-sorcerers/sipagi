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
    await loadComponent('../components/sidebar.html', 'sidebar-container');
    const activeMenu = document.getElementById('nav-analisis-data'); 
    if(activeMenu) activeMenu.classList.add('active');
});