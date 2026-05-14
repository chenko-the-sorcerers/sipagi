export const routeAliases = {
    dashboard: 'r-a91d0c',
    settings: 'r-b62f11',
    inventory: 'r-c83a42',
    purchasing: 'r-d04b73',
    finance: 'r-e25c94',
    hr: 'r-f46db5',
    operational: 'r-g67ec6',
    school: 'r-h88fd7',
    bgn: 'r-i09ae8',
    supplier: 'r-j20bf9',
    ai: 'r-k41c0a',
    nutritionist: 'r-l62d1b',
    reports: 'r-m83e2c',
    mbg: 'r-n04f3d',
    'dev-dashboard': 'r-o25a4e',
    distribution: 'r-p36b8a'
};

const reverseAliases = Object.fromEntries(Object.entries(routeAliases).map(([key, value]) => [value, key]));

export function encodeRoute(route = 'dashboard') {
    const [moduleId, subRoute = ''] = String(route || 'dashboard').split('/');
    const alias = routeAliases[moduleId] || moduleId;
    return subRoute ? `${alias}/${btoa(subRoute).replace(/=+$/g, '')}` : alias;
}

export function decodeRoute(route = 'dashboard') {
    const [moduleAlias, subAlias = ''] = String(route || 'dashboard').split('/');
    const moduleId = reverseAliases[moduleAlias] || moduleAlias || 'dashboard';
    let subRoute = subAlias;
    try {
        if (subAlias && !subAlias.includes('-')) subRoute = atob(subAlias.padEnd(Math.ceil(subAlias.length / 4) * 4, '='));
    } catch {
        subRoute = subAlias;
    }
    return subRoute ? `${moduleId}/${subRoute}` : moduleId;
}

export function setSecureHash(route) {
    window.location.hash = encodeRoute(route);
}
