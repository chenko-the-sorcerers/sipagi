import { prisma } from '../../lib/server/db.js';
import { readJson, sendJson } from '../../lib/server/http.js';
import { requireApiAccess } from '../../lib/server/security.js';

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'ya', 'yes', 'aktif'].includes(String(value).toLowerCase());
}

function toFrontend(row) {
  return {
    permission_id: row.id,
    role_id: row.roleId,
    module_id: row.moduleKey,
    page_id: row.pageKey || '',
    can_create: row.canCreate,
    can_read: row.canRead,
    can_update: row.canUpdate,
    can_delete: row.canDelete,
    can_approve: row.canApprove,
    can_export: row.canExport
  };
}

function toPrisma(body) {
  return {
    roleId: body.roleId || body.role_id,
    moduleKey: body.moduleKey || body.module_id,
    pageKey: body.pageKey || body.page_id || '',
    canCreate: toBoolean(body.canCreate ?? body.can_create),
    canRead: toBoolean(body.canRead ?? body.can_read, true),
    canUpdate: toBoolean(body.canUpdate ?? body.can_update),
    canDelete: toBoolean(body.canDelete ?? body.can_delete),
    canApprove: toBoolean(body.canApprove ?? body.can_approve),
    canExport: toBoolean(body.canExport ?? body.can_export)
  };
}

export default async function handler(request, response) {
  try {
    const access = await requireApiAccess(request);

    if (request.method === 'GET') {
      const roleId = request.query.role_id || request.query.roleId;
      const where = roleId ? { roleId } : {};
      const rows = await prisma.rolePermission.findMany({ where, orderBy: [{ roleId: 'asc' }, { moduleKey: 'asc' }] });
      sendJson(response, 200, { ok: true, rows: rows.map(toFrontend) });
      return;
    }

    if (!access.apiKey && access.token.roleId !== 'kepala_sppg') {
      sendJson(response, 403, { ok: false, error: 'Hanya Kepala SPPG yang dapat mengubah permission' });
      return;
    }

    if (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT') {
      const body = await readJson(request);
      const data = toPrisma(body);
      const row = await prisma.rolePermission.upsert({
        where: { roleId_moduleKey_pageKey: { roleId: data.roleId, moduleKey: data.moduleKey, pageKey: data.pageKey } },
        update: data,
        create: data
      });

      await prisma.auditLog.create({
        data: {
          sppgId: access.token?.sppgId || null,
          entityType: 'role_permission',
          entityId: row.id,
          action: 'permission_upserted',
          afterJson: toFrontend(row),
          actorId: access.user?.id || 'api-key'
        }
      });

      sendJson(response, 200, { ok: true, row: toFrontend(row) });
      return;
    }

    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { ok: false, error: error.message });
  }
}
