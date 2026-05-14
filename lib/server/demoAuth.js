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

export function findDemoAuthUser(email, password) {
  const expectedPassword = process.env.SIPAGI_DEMO_PASSWORD || '@Sipagi2026';
  if (password !== expectedPassword) return null;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const row = demoUsers.find(([demoEmail]) => demoEmail === normalizedEmail);
  if (!row) return null;
  const [userEmail, name, roleId, sppgId] = row;
  return {
    id: `demo:${userEmail}`,
    name,
    email: userEmail,
    roleId,
    sppgId,
    provider: 'demo'
  };
}
