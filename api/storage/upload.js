import { prisma } from '../../lib/server/db.js';
import { sendJson } from '../../lib/server/http.js';
import { requireApiAccess } from '../../lib/server/security.js';
import { uploadDocument } from '../../lib/server/storage.js';

export const config = {
  api: {
    bodyParser: false
  }
};

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
    return;
  }

  try {
    const access = await requireApiAccess(request);
    const bytes = await readBody(request);
    const sppgId = request.headers['x-sppg-id'] || access.token?.sppgId || 'sppg_nakala';
    const moduleKey = request.headers['x-module-key'] || 'general';
    const entityType = request.headers['x-entity-type'] || 'document';
    const entityId = request.headers['x-entity-id'] || 'unassigned';
    const fileName = request.headers['x-file-name'] || 'upload.bin';
    const mimeType = request.headers['content-type'] || 'application/octet-stream';

    const uploaded = await uploadDocument({ sppgId, moduleKey, entityType, entityId, fileName, mimeType, bytes });
    const row = await prisma.documentFile.create({
      data: {
        sppgId,
        moduleKey,
        entityType,
        entityId,
        fileName,
        mimeType,
        storageKey: uploaded.storageKey,
        createdBy: access.user?.id || 'api-key'
      }
    });

    sendJson(response, 201, { ok: true, row });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { ok: false, error: error.message });
  }
}
