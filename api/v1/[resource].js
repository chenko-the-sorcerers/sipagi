import { getResource } from '../../lib/server/resources.js';
import { getSppgId, readJson, sendJson } from '../../lib/server/http.js';
import { prisma } from '../../lib/server/db.js';
import { requireApiAccess } from '../../lib/server/security.js';

async function resolveSppgId(request) {
  const value = getSppgId(request, request.session?.token?.sppgId || request.session?.user?.sppgId || 'sppg_nakala');
  const sppg = await prisma.sppgUnit.findFirst({
    where: { OR: [{ id: value }, { code: value }] },
    select: { id: true, code: true }
  });
  return sppg || { id: value, code: value };
}

export default async function handler(request, response) {
  const resourceName = request.query.resource;
  const resource = getResource(resourceName);
  if (!resource) {
    sendJson(response, 404, { ok: false, error: `Resource ${resourceName} belum tersedia` });
    return;
  }

  try {
    const access = await requireApiAccess(request);
    request.session = access;
    const sppg = await resolveSppgId(request);
    const sppgId = sppg.id;

    if (request.method === 'GET') {
      const take = Math.min(Number(request.query.take || 100), 500);
      const skip = Number(request.query.skip || 0);
      const where = resource.scope === false ? {} : { sppgId };
      const rows = await resource.model.findMany({ where, take, skip });
      sendJson(response, 200, { ok: true, rows, meta: { resource: resourceName, take, skip, sppgId, sppgCode: sppg.code } });
      return;
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const data = resource.scope === false ? body : { ...body, sppgId: access.apiKey ? body.sppgId || sppgId : sppgId };
      const row = await resource.model.create({ data });
      sendJson(response, 201, { ok: true, row });
      return;
    }

    if (request.method === 'PATCH' || request.method === 'PUT') {
      const body = await readJson(request);
      const id = body.id || request.query.id;
      if (!id) throw new Error('id wajib diisi untuk update');
      const data = { ...body };
      delete data.id;
      delete data.sppgId;
      if (resource.scope !== false) {
        const existing = await resource.model.findFirst({ where: { id, sppgId }, select: { id: true } });
        if (!existing) throw new Error('Data tidak ditemukan untuk SPPG aktif');
      }
      const row = await resource.model.update({ where: { id }, data });
      sendJson(response, 200, { ok: true, row });
      return;
    }

    if (request.method === 'DELETE') {
      const id = request.query.id;
      if (!id) throw new Error('id wajib diisi untuk delete');
      if (resource.scope !== false) {
        const existing = await resource.model.findFirst({ where: { id, sppgId }, select: { id: true } });
        if (!existing) throw new Error('Data tidak ditemukan untuk SPPG aktif');
      }
      const row = await resource.model.delete({ where: { id } });
      sendJson(response, 200, { ok: true, row });
      return;
    }

    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message });
  }
}
