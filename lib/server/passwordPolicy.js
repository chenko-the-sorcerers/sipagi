function clean(value) {
  return String(value || '').trim();
}

function normalizeToken(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function validateSipagiPassword(password, context = {}) {
  const value = String(password || '');
  const errors = [];

  if (value.length < 8) errors.push('minimal 8 karakter');
  if (!/[A-Z]/.test(value)) errors.push('minimal 1 huruf kapital');
  if (!/[0-9]/.test(value)) errors.push('minimal 1 angka');
  if (!/[^A-Za-z0-9]/.test(value)) errors.push('minimal 1 simbol');

  const normalizedPassword = normalizeToken(value).replace(/\s+/g, '');
  const protectedValues = [
    context.sppgName,
    context.region,
    context.address,
    context.headName,
    context.name,
    context.email?.split('@')[0]
  ];
  const protectedTokens = protectedValues
    .flatMap((item) => normalizeToken(item).split(/\s+/))
    .filter((token) => token.length >= 4);

  const matchedToken = protectedTokens.find((token) => normalizedPassword.includes(token));
  if (matchedToken) errors.push('tidak boleh mengandung nama SPPG, wilayah, alamat, nama kepala SPPG, atau email');

  return {
    ok: errors.length === 0,
    errors,
    strength: errors.length === 0 ? 'secure' : value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value) ? 'normal' : 'weak'
  };
}

export function assertSipagiPassword(password, context = {}) {
  const result = validateSipagiPassword(password, context);
  if (!result.ok) {
    throw new Error(`Password belum aman: ${result.errors.join(', ')}.`);
  }
  return result;
}
