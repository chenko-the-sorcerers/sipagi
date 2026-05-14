import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../lib/server/auth.js';
import { upsertSheetRow } from '../app/shared/services/googleSheetsApi.js';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(rootDir, '.env'), 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) return;
      const [, key, value] = match;
      process.env[key] ||= value.replace(/^"|"$/g, '');
    });
  } catch {
    // .env optional, but GAS_ENDPOINT is required below.
  }
}

const authUsers = [
  ['kepala@sipagi.local', 'Kepala SPPG Demo', 'kepala_sppg', 'sppg_nakala'],
  ['ahli.gizi@sipagi.local', 'Ahli Gizi Demo', 'ahli_gizi', 'sppg_nakala'],
  ['pengadaan@sipagi.local', 'Pengadaan Demo', 'akuntan_pengadaan', 'sppg_nakala'],
  ['distribusi@sipagi.local', 'Distribusi Demo', 'asisten_distribusi', 'sppg_nakala'],
  ['produksi@sipagi.local', 'Produksi Demo', 'produksi', 'sppg_nakala'],
  ['packing@sipagi.local', 'Pemorsian Packing Demo', 'pemorsian_packing', 'sppg_nakala'],
  ['kebersihan@sipagi.local', 'Kebersihan Demo', 'pencuci_kebersihan', 'sppg_nakala'],
  ['sekolah@sipagi.local', 'Sekolah Demo', 'sekolah', 'sppg_nakala'],
  ['bgn@sipagi.local', 'BGN Demo', 'bgn', 'sppg_nakala'],
  ['supplier@sipagi.local', 'Supplier Demo', 'supplier', 'sppg_nakala'],
  ['developer@sipagi.local', 'Developer SIPAGI', 'developer', 'sppg_nakala'],
  ['kepala.merapi@sipagi.local', 'Kepala SPPG Merapi', 'kepala_sppg', 'sppg_merapi'],
  ['kepala.progo@sipagi.local', 'Kepala SPPG Progo', 'kepala_sppg', 'sppg_progo'],
  ['kepala.mataram@sipagi.local', 'Kepala SPPG Mataram', 'kepala_sppg', 'sppg_mataram'],
  ['kepala.imogiri@sipagi.local', 'Kepala SPPG Imogiri', 'kepala_sppg', 'sppg_imogiri']
];

await loadEnv();

const password = process.env.SIPAGI_DEMO_PASSWORD || '@Sipagi2026';
const row = {
  setting_id: 'setting_auth_demo_users',
  key: 'auth_demo_users',
  value: JSON.stringify(authUsers.map(([email, name, roleId, sppgId]) => ({
    id: `gas:${email}`,
    email,
    name,
    roleId,
    sppgId,
    passwordHash: hashPassword(password)
  }))),
  description: 'Fallback auth demo SIPAGI dari GAS settings',
  updated_at: new Date().toISOString(),
  updated_by: 'seed_gas_auth'
};

await upsertSheetRow('settings', row.setting_id, row, 'setting_id', 'seed_gas_auth');
console.log(JSON.stringify({ ok: true, users: authUsers.length, sheet: 'settings', key: row.key }, null, 2));
