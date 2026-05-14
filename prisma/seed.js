import { prisma } from '../lib/server/db.js';
import { hashPassword } from '../lib/server/auth.js';

const modules = [
  'dashboard',
  'planning',
  'purchasing',
  'inventory',
  'production',
  'qc_gizi',
  'packing',
  'distribution',
  'school_receipt',
  'finance',
  'hr',
  'supplier',
  'bgn',
  'reports',
  'settings'
];

const roles = [
  ['kepala_sppg', 'Kepala SPPG'],
  ['ahli_gizi', 'Ahli Gizi'],
  ['akuntan_pengadaan', 'Akuntan/Pengadaan'],
  ['asisten_distribusi', 'Asisten Lapangan/Distribusi'],
  ['produksi', 'Produksi'],
  ['pemorsian_packing', 'Pemorsian/Packing'],
  ['pencuci_kebersihan', 'Pencuci/Kebersihan'],
  ['sekolah', 'Sekolah'],
  ['bgn', 'BGN'],
  ['supplier', 'Supplier'],
  ['developer', 'Developer']
];

const sppgUnits = [
  ['sppg_nakala', 'SPPG Nakala Banguntapan', 'Bantul Timur', 'Jl. Wonosari KM 6, Banguntapan, Bantul'],
  ['sppg_merapi', 'SPPG Merapi Sleman', 'Sleman Utara', 'Jl. Kaliurang KM 12, Sleman'],
  ['sppg_progo', 'SPPG Progo Kulon', 'Kulon Progo', 'Jl. Wates KM 18, Kulon Progo'],
  ['sppg_mataram', 'SPPG Mataram Kota', 'Kota Yogyakarta', 'Jl. Mataram No. 24, Yogyakarta'],
  ['sppg_imogiri', 'SPPG Imogiri Bantul', 'Bantul Selatan', 'Jl. Imogiri Timur, Bantul']
];

const demoUsers = [
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

function permissionFor(roleId, moduleKey) {
  if (roleId === 'kepala_sppg' || roleId === 'developer') {
    return { canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true, canExport: true };
  }

  const readable = {
    ahli_gizi: ['dashboard', 'planning', 'inventory', 'production', 'qc_gizi', 'reports'],
    akuntan_pengadaan: ['dashboard', 'purchasing', 'inventory', 'finance', 'supplier', 'reports'],
    asisten_distribusi: ['dashboard', 'distribution', 'school_receipt', 'reports'],
    produksi: ['dashboard', 'production', 'inventory'],
    pemorsian_packing: ['dashboard', 'packing', 'school_receipt'],
    pencuci_kebersihan: ['dashboard', 'production', 'reports'],
    sekolah: ['school_receipt'],
    bgn: ['dashboard', 'bgn', 'reports'],
    supplier: ['supplier', 'purchasing']
  }[roleId] || [];

  const canWrite = ['ahli_gizi', 'akuntan_pengadaan', 'asisten_distribusi', 'produksi', 'pemorsian_packing'].includes(roleId);
  const canRead = readable.includes(moduleKey);

  return {
    canCreate: canRead && canWrite,
    canRead,
    canUpdate: canRead && canWrite,
    canDelete: false,
    canApprove: false,
    canExport: canRead
  };
}

async function main() {
  const sppgByCode = {};
  for (const [code, name, region, address] of sppgUnits) {
    sppgByCode[code] = await prisma.sppgUnit.upsert({
      where: { code },
      update: { name, region, address, status: 'active' },
      create: { code, name, region, address, status: 'active' }
    });
  }

  for (const [id, name] of roles) {
    await prisma.role.upsert({
      where: { id },
      update: { name, status: 'active' },
      create: { id, name, status: 'active' }
    });

    for (const moduleKey of modules) {
      await prisma.rolePermission.upsert({
        where: { roleId_moduleKey_pageKey: { roleId: id, moduleKey, pageKey: '' } },
        update: permissionFor(id, moduleKey),
        create: { roleId: id, moduleKey, pageKey: '', ...permissionFor(id, moduleKey) }
      });
    }
  }

  const passwordHash = hashPassword(process.env.SIPAGI_DEMO_PASSWORD || 'sipagi-demo');
  for (const [email, name, roleId, sppgCode] of demoUsers) {
    const sppg = sppgByCode[sppgCode];
    const user = await prisma.user.upsert({
      where: { email },
      update: { sppgId: sppg.id, roleId, name, status: 'active', passwordHash },
      create: { sppgId: sppg.id, roleId, name, email, passwordHash, status: 'active' }
    });

    await prisma.userSppgAccess.upsert({
      where: { userId_sppgId_roleId: { userId: user.id, sppgId: sppg.id, roleId } },
      update: { isDefault: true, status: 'active' },
      create: { userId: user.id, sppgId: sppg.id, roleId, isDefault: true, status: 'active' }
    });
  }

  console.log(JSON.stringify({ ok: true, sppg: sppgUnits.length, roles: roles.length, modules: modules.length, users: demoUsers.length }, null, 2));
}

await main();
