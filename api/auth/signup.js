import { createSessionToken, hashPassword, setSessionCookie } from '../../lib/server/auth.js';
import { prisma } from '../../lib/server/db.js';
import { readJson, sendJson } from '../../lib/server/http.js';
import { assertSipagiPassword } from '../../lib/server/passwordPolicy.js';

function cleanText(value) {
  return String(value || '').trim();
}

function slugifySppgCode(name) {
  const slug = cleanText(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug.startsWith('sppg_') ? slug : `sppg_${slug || Date.now()}`;
}

async function uniqueSppgCode(name) {
  const base = slugifySppgCode(name);
  let code = base;
  let counter = 1;
  while (await prisma.sppgUnit.findUnique({ where: { code }, select: { id: true } })) {
    counter += 1;
    code = `${base}_${counter}`;
  }
  return code;
}

function validatePayload(payload) {
  const sppgName = cleanText(payload.sppgName);
  const headName = cleanText(payload.headName);
  const email = cleanText(payload.email).toLowerCase();
  const password = String(payload.password || '');
  const confirmPassword = String(payload.confirmPassword || '');
  const registrationToken = cleanText(payload.registrationToken);

  if (!/^SIPAGI-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(registrationToken)) throw new Error('Token pendaftaran belum valid.');
  if (sppgName.length < 3) throw new Error('Nama SPPG wajib diisi.');
  if (headName.length < 3) throw new Error('Nama penanggung jawab wajib diisi.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email belum valid.');
  if (password !== confirmPassword) throw new Error('Konfirmasi password tidak sama.');
  assertSipagiPassword(password, {
    sppgName,
    headName,
    email,
    region: payload.region,
    address: payload.address
  });

  return {
    sppgName,
    headName,
    email,
    password,
    region: cleanText(payload.region),
    address: cleanText(payload.address),
    phone: cleanText(payload.phone),
    registrationToken
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
    return;
  }

  try {
    const payload = validatePayload(await readJson(request));
    const existingUser = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
    if (existingUser) throw new Error('Email sudah terdaftar. Silakan masuk dengan akun tersebut.');

    const sppgCode = await uniqueSppgCode(payload.sppgName);
    const result = await prisma.$transaction(async (tx) => {
      await tx.role.upsert({
        where: { id: 'kepala_sppg' },
        update: { name: 'Kepala SPPG', status: 'active' },
        create: { id: 'kepala_sppg', name: 'Kepala SPPG', status: 'active' }
      });

      const sppg = await tx.sppgUnit.create({
        data: {
          code: sppgCode,
          name: payload.sppgName,
          region: payload.region || null,
          address: payload.address || null,
          status: 'active'
        }
      });

      const user = await tx.user.create({
        data: {
          sppgId: sppg.id,
          roleId: 'kepala_sppg',
          name: payload.headName,
          email: payload.email,
          phone: payload.phone || null,
          passwordHash: hashPassword(payload.password),
          status: 'active'
        }
      });

      await tx.userSppgAccess.create({
        data: {
          userId: user.id,
          sppgId: sppg.id,
          roleId: 'kepala_sppg',
          isDefault: true,
          status: 'active'
        }
      });

      await tx.auditLog.create({
        data: {
          sppgId: sppg.id,
          entityType: 'sppg_unit',
          entityId: sppg.id,
          action: 'sppg_signup',
          afterJson: { code: sppg.code, name: sppg.name, headUserId: user.id, registrationToken: payload.registrationToken },
          actorId: user.id
        }
      });

      return { sppg, user };
    });

    const token = createSessionToken({
      userId: result.user.id,
      roleId: 'kepala_sppg',
      sppgId: result.sppg.id
    });
    setSessionCookie(response, token);

    sendJson(response, 201, {
      ok: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        roleId: result.user.roleId,
        sppgId: result.sppg.id,
        sppgCode: result.sppg.code,
        sppgName: result.sppg.name
      },
      sppg: {
        id: result.sppg.id,
        code: result.sppg.code,
        name: result.sppg.name
      }
    });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message || 'Pendaftaran belum bisa diproses.' });
  }
}
