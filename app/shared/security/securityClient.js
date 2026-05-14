export function installClientSecurityGuards() {
    const blockedKeys = new Set(['F12']);
    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
    document.addEventListener('keydown', (event) => {
        const key = event.key;
        const combo = (event.metaKey || event.ctrlKey) && event.shiftKey && ['I', 'J', 'C'].includes(key.toUpperCase());
        const sourceCombo = (event.metaKey || event.ctrlKey) && ['U', 'S'].includes(key.toUpperCase());
        if (blockedKeys.has(key) || combo || sourceCombo) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}
