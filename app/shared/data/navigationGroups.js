export const navigationGroups = [
    {
        id: 'command',
        label: 'Workspace',
        modules: ['dashboard', 'settings', 'dev-dashboard', 'reports', 'ai']
    },
    {
        id: 'erp-core',
        label: 'Operasional Inti',
        modules: ['inventory', 'finance', 'hr']
    },
    {
        id: 'kitchen-flow',
        label: 'Dapur & Distribusi',
        modules: ['operational', 'nutritionist', 'distribution']
    },
    {
        id: 'stakeholder',
        label: 'Portal & Integrasi',
        modules: ['school', 'bgn', 'supplier']
    }
];

export const moduleIcons = {
    dashboard: 'grid',
    settings: 'user',
    mbg: 'building',
    'dev-dashboard': 'shield',
    reports: 'chart',
    ai: 'ai',
    inventory: 'box',
    purchasing: 'cart',
    finance: 'wallet',
    hr: 'users',
    operational: 'kitchen',
    nutritionist: 'shield',
    school: 'school',
    bgn: 'building',
    supplier: 'truck',
    distribution: 'truck'
};
