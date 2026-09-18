import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Wiping all previous entries from database...');

  // Delete in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.machineParameter.deleteMany();
  await prisma.machineProductionParam.deleteMany();
  await prisma.machineShiftAssignment.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.employeeShiftRoster.deleteMany();
  await prisma.shiftWorkingDay.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.employeeSite.deleteMany();
  await prisma.employeeWarehouse.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.site.deleteMany();

  // Create standard default departments and roles for clean user setup
  const deptAdmin = await prisma.department.create({ data: { name: 'Administration' } });
  const deptProd = await prisma.department.create({ data: { name: 'Production & Shopfloor' } });
  const deptMaint = await prisma.department.create({ data: { name: 'Plant Maintenance' } });

  await prisma.role.create({
    data: { departmentId: deptAdmin.id, name: 'SUPER_ADMIN', permissionSet: '{"all":true}' },
  });
  await prisma.role.create({
    data: { departmentId: deptAdmin.id, name: 'SITE_ADMIN', permissionSet: '{"site":true}' },
  });
  await prisma.role.create({
    data: { departmentId: deptProd.id, name: 'PRODUCTION_SUPERVISOR', permissionSet: '{"prod":true}' },
  });
  await prisma.role.create({
    data: { departmentId: deptProd.id, name: 'OPERATOR', permissionSet: '{"operator":true}' },
  });

  console.log('Database wiped clean! Ready for user entries.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
