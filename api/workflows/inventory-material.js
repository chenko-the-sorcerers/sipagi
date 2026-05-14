import { prisma } from '../../lib/server/db.js';
import { readJson, sendJson } from '../../lib/server/http.js';
import { requireApiAccess } from '../../lib/server/security.js';

const allowedActions = new Set(['save_draft', 'submit', 'approve', 'reject', 'request_revision', 'activate']);

function approvalPatch(action, note = '') {
  if (action === 'save_draft') return { status: 'draft', approvalStatus: 'draft' };
  if (action === 'submit') return { status: 'pending_approval', approvalStatus: 'submitted' };
  if (action === 'approve' || action === 'activate') return { status: 'active', approvalStatus: 'approved' };
  if (action === 'reject') return { status: 'rejected', approvalStatus: 'rejected' };
  if (action === 'request_revision') return { status: 'draft', approvalStatus: 'revision' };
  return {};
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
    return;
  }

  try {
    const access = await requireApiAccess(request);
    const body = await readJson(request);
    const action = body.action;
    if (!allowedActions.has(action)) throw new Error('Aksi workflow bahan tidak dikenal');
    if (['approve', 'reject', 'request_revision', 'activate'].includes(action) && !access.apiKey && access.token.roleId !== 'kepala_sppg') {
      sendJson(response, 403, { ok: false, error: 'Review bahan hanya dapat dilakukan Kepala SPPG' });
      return;
    }

    const item = await prisma.item.update({
      where: { id: body.itemId || body.id },
      data: {
        ...approvalPatch(action, body.note),
        approvedBy: ['approve', 'activate'].includes(action) ? access.user?.id || 'api-key' : undefined,
        updatedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        sppgId: item.sppgId,
        entityType: 'item',
        entityId: item.id,
        action: `inventory_material_${action}`,
        afterJson: { status: item.status, approvalStatus: item.approvalStatus, note: body.note || '' },
        actorId: access.user?.id || 'api-key'
      }
    });

    sendJson(response, 200, { ok: true, row: item });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { ok: false, error: error.message });
  }
}
