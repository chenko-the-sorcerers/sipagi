import { prisma } from '../../lib/server/db.js';
import { readJson, sendJson } from '../../lib/server/http.js';
import { requireApiAccess } from '../../lib/server/security.js';

const entities = {
  purchase_request: prisma.purchaseRequest,
  purchase_order: prisma.purchaseOrder
};

const statusByAction = {
  submit: 'submitted',
  approve: 'approved',
  reject: 'rejected',
  cancel: 'cancelled'
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
    return;
  }

  try {
    const access = await requireApiAccess(request);
    const body = await readJson(request);
    const model = entities[body.entityType];
    const status = statusByAction[body.action];
    if (!model || !status) throw new Error('Workflow pengadaan tidak dikenal');
    if (['approve', 'reject'].includes(body.action) && !access.apiKey && access.token.roleId !== 'kepala_sppg') {
      sendJson(response, 403, { ok: false, error: 'Approval pengadaan hanya dapat dilakukan Kepala SPPG' });
      return;
    }

    const data = { status };
    if (body.entityType === 'purchase_request' && status === 'approved') data.approvedBy = access.user?.id || 'api-key';

    const row = await model.update({
      where: { id: body.id },
      data
    });

    await prisma.auditLog.create({
      data: {
        sppgId: row.sppgId,
        entityType: body.entityType,
        entityId: row.id,
        action: `procurement_${body.action}`,
        afterJson: { status, note: body.note || '' },
        actorId: access.user?.id || 'api-key'
      }
    });

    sendJson(response, 200, { ok: true, row });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { ok: false, error: error.message });
  }
}
