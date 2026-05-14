import { prisma } from './db.js';

export const resources = {
  sppg_units: { model: prisma.sppgUnit, scope: false },
  users: { model: prisma.user },
  roles: { model: prisma.role, scope: false },
  role_permissions: { model: prisma.rolePermission, scope: false },
  vendors: { model: prisma.vendor },
  items: { model: prisma.item },
  stock_batches: { model: prisma.stockBatch },
  stock_movements: { model: prisma.stockMovement },
  purchase_requests: { model: prisma.purchaseRequest },
  purchase_orders: { model: prisma.purchaseOrder },
  finance_transactions: { model: prisma.financeTransaction },
  assets: { model: prisma.asset },
  employees: { model: prisma.employee },
  staff_rosters: { model: prisma.staffRoster },
  schools: { model: prisma.school },
  recipes: { model: prisma.recipe },
  recipe_components: { model: prisma.recipeComponent },
  documents: { model: prisma.documentFile },
  audit_logs: { model: prisma.auditLog }
};

export function getResource(name) {
  return resources[name] || null;
}
