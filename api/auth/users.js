import { requireSession, hashPassword } from '../../lib/server/auth.js';
import { prisma } from '../../lib/server/db.js';
import { readJson, sendJson } from '../../lib/server/http.js';
import { assertSipagiPassword } from '../../lib/server/passwordPolicy.js';

const ROLE_LABELS = {
  ahli_gizi: 'Ahli Gizi',
  akuntan_pengadaan: 'Akuntan / Pengadaan',
  asisten_distribusi: 'Asisten Lapangan / Distribusi',
  produksi: 'Produksi',
  pemorsian_packing: 'Pemorsian / Packing',
  pencuci_kebersihan: 'Pencuci / Kebersihan',
  sekolah: 'Sekolah',
  supplier: 'Supplier'
};

function clean(value) {
  return String(value || '').trim();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    roleId: user.roleId,
    roleName: user.role?.name || ROLE_LABELS[user.roleId] || user.roleId,
    status: user.status,
    createdAt: user.createdAt
  };
}

async function listUsers(request, response) {
  const session = await requireSession(request);
  const sppgId = session.user.sppgId || session.token.sppgId;
  const users = await prisma.user.findMany({
    where: { sppgId, status: { not: 'deleted' } },
    include: { role: true },
    orderBy: { createdAt: 'asc' }
  });
  sendJson(response, 200, { ok: true, rows: users.map(publicUser), limit: 3 });
}

async function createRoleUser(request, response) {
  const session = await requireSession(request);
  const sppgId = session.user.sppgId || session.token.sppgId;
  if (session.user.roleId !== 'kepala_sppg') {
    sendJson(response, 403, { ok: false, error: 'Hanya Kepala SPPG yang dapat menambah akun role.' });
    return;
  }

  const payload = await readJson(request);
  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const roleId = clean(payload.roleId);
  const password = String(payload.password || '');

  if (!name) throw new Error('Nama akun wajib diisi.');
  if (!ROLE_LABELS[roleId]) throw new Error('Role belum valid.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email belum valid.');

  const sppg = await prisma.sppgUnit.findUnique({ where: { id: sppgId } });
  assertSipagiPassword(password, {
    name,
    email,
    sppgName: sppg?.name,
    region: sppg?.region,
    address: sppg?.address
  });

  const additionalCount = await prisma.user.count({
    where: { sppgId, roleId: { not: 'kepala_sppg' }, status: { not: 'deleted' } }
  });
  if (additionalCount >= 3) {
    sendJson(response, 409, { ok: false, error: 'Maksimal 3 akun role tambahan untuk fase ini.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    sendJson(response, 409, { ok: false, error: 'Email sudah terdaftar.' });
    return;
  }

  const user = await prisma.$transaction(async (tx) => {
    await tx.role.upsert({
      where: { id: roleId },
      update: { name: ROLE_LABELS[roleId], status: 'active' },
      create: { id: roleId, name: ROLE_LABELS[roleId], status: 'active' }
    });

    const created = await tx.user.create({
      data: {
        sppgId,
        roleId,
        name,
        email,
        phone: clean(payload.phone) || null,
        passwordHash: hashPassword(password),
        status: 'active'
      },
      include: { role: true }
    });

    await tx.userSppgAccess.create({
      data: {
        userId: created.id,
        sppgId,
        roleId,
        isDefault: true,
        status: 'active'
      }
    });

    await tx.auditLog.create({
      data: {
        sppgId,
        entityType: 'user',
        entityId: created.id,
        action: 'create_role_user',
        afterJson: { email, roleId },
        actorId: session.user.id
      }
    });

    return created;
  });

  sendJson(response, 201, { ok: true, user: publicUser(user) });
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') return listUsers(request, response);
    if (request.method === 'POST') return createRoleUser(request, response);
    sendJson(response, 405, { ok: false, error: 'Method tidak didukung' });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { ok: false, error: error.message || 'Akun belum bisa diproses.' });
  }
}
