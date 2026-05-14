const icons = {
    ai: '<path d="M12 3l1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3z"/><path d="M5 14l.75 2.25L8 17l-2.25.75L5 20l-.75-2.25L2 17l2.25-.75L5 14z"/><path d="M18.5 13l.9 2.6L22 16.5l-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    box: '<path d="M21 8.5l-9-5-9 5 9 5 9-5z"/><path d="M3 8.5v7l9 5 9-5v-7"/><path d="M12 13.5v7"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 8h2a2 2 0 0 1 2 2v11"/><path d="M9 7h2"/><path d="M9 11h2"/><path d="M9 15h2"/><path d="M3 21h18"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>',
    cart: '<path d="M6 6h15l-1.5 8h-12L6 6z"/><path d="M6 6l-.5-3H3"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-7"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    kitchen: '<path d="M6 3v18"/><path d="M10 3v18"/><path d="M6 9h4"/><path d="M16 3v7a4 4 0 0 1-4 4"/><path d="M16 10v11"/>',
    package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7l8.7 5 8.7-5"/><path d="M12 22V12"/>',
    school: '<path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11.5V17c2 2 10 2 12 0v-5.5"/><path d="M22 9v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    sync: '<path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 16v5h5"/><path d="M3 12A9 9 0 0 1 18.3 5.6L21 8"/><path d="M21 8V3h-5"/>',
    truck: '<path d="M10 17H5a2 2 0 0 1-2-2V6h11v11"/><path d="M14 9h4l3 4v4h-7V9z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v14H5a2 2 0 0 1-2-2V7z"/><path d="M17 12h4v4h-4a2 2 0 0 1 0-4z"/><path d="M3 9h16"/>'
};

export function Icon(name, className = '') {
    const path = icons[name] || icons.grid;
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
