import { getSheetRows } from '../app/shared/services/googleSheetsApi.js';
import { prisma } from '../lib/server/db.js';

const sheetPlan = ['sppg_units', 'roles', 'role_permissions', 'vendors', 'items', 'schools'];

async function main() {
  const job = await prisma.importJob.create({
    data: { source: 'gas', status: 'running', summary: { sheets: sheetPlan } }
  });

  const summary = {};
  try {
    for (const sheet of sheetPlan) {
      const payload = await getSheetRows(sheet);
      summary[sheet] = { read: payload.rows?.length || 0, imported: 0, note: 'mapping belum diaktifkan' };
    }
    await prisma.importJob.update({ where: { id: job.id }, data: { status: 'completed', summary, endedAt: new Date() } });
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  } catch (error) {
    await prisma.importJob.update({ where: { id: job.id }, data: { status: 'failed', summary: { ...summary, error: error.message }, endedAt: new Date() } });
    throw error;
  }
}

await main();
