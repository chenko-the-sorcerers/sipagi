import { accessMatrix, productModules, userRoles } from '../data/productCatalog.js?v=settings-module-20260511';
import { listRows, upsertRow, useNeonApi } from '../services/sipagiDataClient.js';

export const dashboardRoleStorageKey = 'sipagi.dashboard.role';
export const permissionStorageKey = 'sipagi.role.permissions.v1';
export const permissionTargetRoleStorageKey = 'sipagi.permission.targetRole';

export const permissionActions = [
    { key: 'can_create', label: 'Tambah' },
    { key: 'can_read', label: 'Buka' },
    { key: 'can_update', label: 'Ubah' },
    { key: 'can_delete', label: 'Hapus' },
    { key: 'can_approve', label: 'Setuju' },
    { key: 'can_export', label: 'Export' }
];

const kepalaRoleId = 'kepala_sppg';
const developerRoleId = 'developer';
const actionKeys = permissionActions.map((action) => action.key);
const roleAliases = {
    admin_pengadaan_keuangan: 'pengadaan',
    akuntan_pengadaan: 'pengadaan',
    asisten_distribusi: 'distribusi'
};

export function toCatalogRoleId(roleId = kepalaRoleId) {
    const normalized = String(roleId || kepalaRoleId).replaceAll('-', '_');
    return roleAliases[normalized] || normalized;
}

export function toDashboardRoleId(roleId = kepalaRoleId) {
    return String(roleId || kepalaRoleId).replaceAll('_', '-');
}

export function getActiveRoleId() {
    try {
        return localStorage.getItem(dashboardRoleStorageKey) || 'kepala-sppg';
    } catch {
        return 'kepala-sppg';
    }
}

export function setActiveRoleId(roleId) {
    try {
        localStorage.setItem(dashboardRoleStorageKey, roleId);
    } catch {
        // Non-blocking UI preference.
    }
}

export function getRoleLabel(roleId) {
    const catalogRoleId = toCatalogRoleId(roleId);
    return userRoles.find((role) => role.id === catalogRoleId)?.name || catalogRoleId;
}

function rolesForModule(moduleId) {
    return accessMatrix.find((entry) => entry.moduleId === moduleId)?.roles || [];
}

function booleanValue(value, fallback = false) {
    if (value === undefined || value === null || value === '') return Boolean(fallback);
    if (typeof value === 'boolean') return value;
    const text = String(value).trim().toLowerCase();
    return ['true', '1', 'yes', 'ya', 'y', 'aktif', 'open', 'terbuka'].includes(text);
}

function basePermissionFor(roleId, moduleId) {
    const catalogRoleId = toCatalogRoleId(roleId);
    const isDeveloper = catalogRoleId === developerRoleId;
    const canRead = isDeveloper || moduleId === 'dashboard' || catalogRoleId === kepalaRoleId || rolesForModule(moduleId).includes(catalogRoleId);
    const isKepala = catalogRoleId === kepalaRoleId;
    const hasFullControl = isKepala || isDeveloper;

    return {
        role_id: catalogRoleId,
        module_id: moduleId,
        can_create: hasFullControl || (canRead && ['inventory', 'purchasing', 'operational', 'school', 'supplier'].includes(moduleId)),
        can_read: canRead,
        can_update: hasFullControl || (canRead && !['dashboard', 'dev-dashboard', 'bgn', 'reports', 'ai'].includes(moduleId)),
        can_delete: hasFullControl,
        can_approve: hasFullControl || (canRead && ['purchasing', 'finance', 'operational', 'nutritionist'].includes(moduleId)),
        can_export: hasFullControl || (canRead && ['inventory', 'purchasing', 'finance', 'operational', 'school', 'bgn', 'reports'].includes(moduleId))
    };
}

export function getDefaultPermissions() {
    return userRoles.flatMap((role) => productModules.map((module) => basePermissionFor(role.id, module.id)));
}

function normalizePermission(permission) {
    const roleId = permission.role_id || permission.roleId;
    const moduleId = permission.module_id || permission.moduleKey;
    const fallback = basePermissionFor(roleId, moduleId);
    return actionKeys.reduce((normalized, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        normalized[key] = booleanValue(permission[key] ?? permission[camelKey], fallback[key]);
        return normalized;
    }, {
        role_id: toCatalogRoleId(roleId),
        module_id: moduleId
    });
}

export function getRolePermissions() {
    const defaults = getDefaultPermissions();

    try {
        const parsed = JSON.parse(localStorage.getItem(permissionStorageKey) || '[]');
        if (!Array.isArray(parsed) || parsed.length === 0) return defaults;

        const overrides = new Map(parsed.map((permission) => {
            const normalized = normalizePermission(permission);
            return [`${normalized.role_id}:${normalized.module_id}`, normalized];
        }));

        return defaults.map((permission) => overrides.get(`${permission.role_id}:${permission.module_id}`) || permission);
    } catch {
        return defaults;
    }
}

export function saveRolePermissions(permissions) {
    try {
        localStorage.setItem(permissionStorageKey, JSON.stringify(permissions.map(normalizePermission)));
    } catch {
        // Permission edits still work for the active render even if persistence is blocked.
    }
}

export async function loadRolePermissionsFromGas() {
    const result = await listRows(useNeonApi() ? 'workflows/role-permissions' : 'role_permissions');
    const rows = Array.isArray(result.rows) ? result.rows : [];
    if (!rows.length) return getRolePermissions();

    saveRolePermissions(rows.filter((row) => row.role_id && row.module_id).map(normalizePermission));
    return getRolePermissions();
}

export async function syncRolePermissionsToGas(roleId = '') {
    const catalogRoleId = roleId ? toCatalogRoleId(roleId) : '';
    const permissions = getRolePermissions()
        .filter((permission) => !catalogRoleId || permission.role_id === catalogRoleId)
        .map((permission) => ({
            permission_id: `${permission.role_id}_${permission.module_id}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            role_id: permission.role_id,
            module_id: permission.module_id,
            can_create: permission.can_create,
            can_read: permission.can_read,
            can_update: permission.can_update,
            can_delete: permission.can_delete,
            can_approve: permission.can_approve,
            can_export: permission.can_export
        }));

    for (const permission of permissions) {
        await upsertRow(useNeonApi() ? 'workflows/role-permissions' : 'role_permissions', permission.permission_id, permission, 'permission_id', kepalaRoleId);
    }

    return permissions;
}

export const loadRolePermissionsFromApi = loadRolePermissionsFromGas;
export const syncRolePermissionsToApi = syncRolePermissionsToGas;

export function resetRolePermissions() {
    const defaults = getDefaultPermissions();
    saveRolePermissions(defaults);
    return defaults;
}

export function getPermission(roleId, moduleId) {
    const catalogRoleId = toCatalogRoleId(roleId);
    return getRolePermissions().find((permission) => (
        permission.role_id === catalogRoleId && permission.module_id === moduleId
    )) || basePermissionFor(catalogRoleId, moduleId);
}

export function updatePermission(roleId, moduleId, actionKey, enabled) {
    if (!actionKeys.includes(actionKey)) return getRolePermissions();
    if (moduleId === 'dashboard' && actionKey === 'can_read' && !enabled) return getRolePermissions();

    const catalogRoleId = toCatalogRoleId(roleId);
    const permissions = getRolePermissions().map((permission) => {
        if (permission.role_id !== catalogRoleId || permission.module_id !== moduleId) return permission;

        const next = { ...permission, [actionKey]: Boolean(enabled) };
        if (actionKey !== 'can_read' && enabled) next.can_read = true;
        if (actionKey === 'can_read' && !enabled) {
            actionKeys.forEach((key) => {
                next[key] = false;
            });
        }
        return next;
    });

    saveRolePermissions(permissions);
    return permissions;
}

export function setRoleModuleOpen(roleId, moduleId, isOpen) {
    return updatePermission(roleId, moduleId, 'can_read', isOpen);
}

export function roleCanAccess(roleId, moduleId) {
    if (moduleId === 'dashboard') return true;
    return Boolean(getPermission(roleId, moduleId).can_read);
}

export function getVisibleModulesForRole(roleId) {
    const catalogRoleId = toCatalogRoleId(roleId);
    return productModules.filter((module) => {
        if (module.id === 'dashboard') return true;
        if (module.id === 'dev-dashboard') return catalogRoleId === developerRoleId && roleCanAccess(catalogRoleId, module.id);
        return roleCanAccess(catalogRoleId, module.id);
    });
}

export function getTargetPermissionRoleId() {
    try {
        return toCatalogRoleId(localStorage.getItem(permissionTargetRoleStorageKey) || 'ahli_gizi');
    } catch {
        return 'ahli_gizi';
    }
}

export function setTargetPermissionRoleId(roleId) {
    try {
        localStorage.setItem(permissionTargetRoleStorageKey, toCatalogRoleId(roleId));
    } catch {
        // Non-critical UI preference.
    }
}
