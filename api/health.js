import { prisma } from '../lib/server/db.js';
import { sendJson } from '../lib/server/http.js';

export default async function handler(request, response) {
  try {
    await prisma.$queryRaw`select 1`;
    sendJson(response, 200, { ok: true, service: 'sipagi-api', database: 'connected' });
  } catch (error) {
    sendJson(response, 503, { ok: false, service: 'sipagi-api', error: error.message });
  }
}
