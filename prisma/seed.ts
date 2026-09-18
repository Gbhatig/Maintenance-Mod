import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Manufacturing Module Masters Foundation v2.0...');

  // 1. Sites
  const site1 = await prisma.site.upsert({
    where: { code: 'STE-0001' },
    update: {},
    create: {
      code: 'STE-0001',
      name: 'Transmission Tower Plant',
      address: 'Village Harbanspura, near Talwara road, Mandi',
      city: 'Adampur',
      state: 'Punjab',
      country: 'IN',
      gstNo: '03ABCDE1234F1Z5',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
  });

  const site2 = await prisma.site.upsert({
    where: { code: 'STE-0002' },
    update: {},
    create: {
      code: 'STE-0002',
      name: 'Pune Heavy Forging Plant',
      address: 'Chakan Industrial Area, Phase 2',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'IN',
      gstNo: '27ABCDE5678F1Z2',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
  });

  // 2. Warehouses
  const whFab = await prisma.warehouse.create({
    data: {
      siteId: site1.id,
      name: 'Fabrication Yard 1',
      type: 'FABRICATION',
    },
  });

  const whGalv = await prisma.warehouse.create({
    data: {
      siteId: site1.id,
      name: 'Galvanizing Bath Area',
      type: 'GALVANIZING',
    },
  });

  const whFg = await prisma.warehouse.create({
    data: {
      siteId: site1.id,
      name: 'Finished Goods Yard A',
      type: 'FG_YARD',
    },
  });

  const whRaw = await prisma.warehouse.create({
    data: {
      siteId: site1.id,
      name: 'Raw Materials Store',
      type: 'RAW_MATERIAL',
    },
  });

  // 3. Departments & Roles
  const deptAdmin = await prisma.department.upsert({
    where: { name: 'Administration' },
    update: {},
    create: { name: 'Administration' },
  });

  const deptProd = await prisma.department.upsert({
    where: { name: 'Production & Shopfloor' },
    update: {},
    create: { name: 'Production & Shopfloor' },
  });

  const deptMaint = await prisma.department.upsert({
    where: { name: 'Plant Maintenance' },
    update: {},
    create: { name: 'Plant Maintenance' },
  });

  const roleSuperAdmin = await prisma.role.upsert({
    where: { departmentId_name: { departmentId: deptAdmin.id, name: 'SUPER_ADMIN' } },
    update: {},
    create: {
      departmentId: deptAdmin.id,
      name: 'SUPER_ADMIN',
      permissionSet: JSON.stringify({ all: true }),
    },
  });

  const roleSiteAdmin = await prisma.role.upsert({
    where: { departmentId_name: { departmentId: deptAdmin.id, name: 'SITE_ADMIN' } },
    update: {},
    create: {
      departmentId: deptAdmin.id,
      name: 'SITE_ADMIN',
      permissionSet: JSON.stringify({ site_manage: true }),
    },
  });

  const roleSupervisor = await prisma.role.upsert({
    where: { departmentId_name: { departmentId: deptProd.id, name: 'PRODUCTION_SUPERVISOR' } },
    update: {},
    create: {
      departmentId: deptProd.id,
      name: 'PRODUCTION_SUPERVISOR',
      permissionSet: JSON.stringify({ shopfloor_manage: true }),
    },
  });

  const roleOperator = await prisma.role.upsert({
    where: { departmentId_name: { departmentId: deptProd.id, name: 'OPERATOR' } },
    update: {},
    create: {
      departmentId: deptProd.id,
      name: 'OPERATOR',
      permissionSet: JSON.stringify({ view: true }),
    },
  });

  // 4. Employees
  const emp1 = await prisma.employee.upsert({
    where: { empCode: 'EMP-0001' },
    update: {},
    create: {
      empCode: 'EMP-0001',
      name: 'Saurav Khari',
      mobile: '+919876543210',
      email: 'saurav.khari@transmissiontower.com',
      departmentId: deptAdmin.id,
      roleId: roleSuperAdmin.id,
      landingPage: 'MASTERS_SITES',
      sites: {
        create: [{ siteId: site1.id }, { siteId: site2.id }],
      },
      warehouses: {
        create: [{ warehouseId: whFab.id }, { warehouseId: whGalv.id }],
      },
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { empCode: 'EMP-0002' },
    update: {},
    create: {
      empCode: 'EMP-0002',
      name: 'Ramesh Kumar',
      mobile: '+919812345678',
      email: 'ramesh@transmissiontower.com',
      departmentId: deptProd.id,
      roleId: roleSupervisor.id,
      landingPage: 'MASTERS_MACHINES',
      sites: {
        create: [{ siteId: site1.id }],
      },
      warehouses: {
        create: [{ warehouseId: whFab.id }, { warehouseId: whFg.id }],
      },
    },
  });

  const emp3 = await prisma.employee.upsert({
    where: { empCode: 'EMP-0003' },
    update: {},
    create: {
      empCode: 'EMP-0003',
      name: 'Amit Verma',
      mobile: '+919823456789',
      email: 'amit.verma@transmissiontower.com',
      departmentId: deptMaint.id,
      roleId: roleOperator.id,
      landingPage: 'DEFAULT',
      sites: {
        create: [{ siteId: site1.id }],
      },
    },
  });

  // 5. Users
  const user1 = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      employeeId: emp1.id,
      passwordHash: '$2b$12$eX8zW1gC7yN1uV0.K1uB1.J0p4a0V6a5K8b7n6v5c4b3n2m1l0k9j', // dummy hash
    },
  });

  // 6. Shifts
  const shiftDay = await prisma.shift.upsert({
    where: { siteId_name: { siteId: site1.id, name: 'Day Shift A' } },
    update: {},
    create: {
      siteId: site1.id,
      name: 'Day Shift A',
      startTime: '08:00',
      endTime: '20:00',
      isOvernight: false,
      breakMinutes: 30,
      grossMinutes: 720,
      netMinutes: 690,
      workingDays: {
        create: [
          { dayOfWeek: 1 },
          { dayOfWeek: 2 },
          { dayOfWeek: 3 },
          { dayOfWeek: 4 },
          { dayOfWeek: 5 },
        ],
      },
    },
  });

  const shiftNight = await prisma.shift.upsert({
    where: { siteId_name: { siteId: site1.id, name: 'Night Shift B' } },
    update: {},
    create: {
      siteId: site1.id,
      name: 'Night Shift B',
      startTime: '20:00',
      endTime: '08:00',
      isOvernight: true,
      breakMinutes: 30,
      grossMinutes: 720,
      netMinutes: 690,
      workingDays: {
        create: [
          { dayOfWeek: 1 },
          { dayOfWeek: 2 },
          { dayOfWeek: 3 },
          { dayOfWeek: 4 },
          { dayOfWeek: 5 },
        ],
      },
    },
  });

  // 7. Machines (4-Level Tree)
  const line1 = await prisma.machine.create({
    data: {
      siteId: site1.id,
      warehouseId: whFab.id,
      name: 'Fabrication Line 1',
      level: 0,
      path: 'Fabrication Line 1',
      productionParams: {
        create: [{ metricName: 'units_per_hour', unit: 'pcs/hr' }],
      },
      parameters: {
        create: [{ parameterName: 'Rated Line Voltage', minValue: 400, maxValue: 440, unit: 'V' }],
      },
    },
  });

  const station1 = await prisma.machine.create({
    data: {
      siteId: site1.id,
      warehouseId: whFab.id,
      parentMachineId: line1.id,
      name: 'Cutting & Shearing Station',
      level: 1,
      path: 'Fabrication Line 1 / Cutting & Shearing Station',
    },
  });

  const shearA = await prisma.machine.create({
    data: {
      siteId: site1.id,
      warehouseId: whFab.id,
      parentMachineId: station1.id,
      name: 'Shear Machine A',
      level: 2,
      path: 'Fabrication Line 1 / Cutting & Shearing Station / Shear Machine A',
      productionParams: {
        create: [{ metricName: 'cuts_per_minute', unit: 'cuts/min' }],
      },
      parameters: {
        create: [{ parameterName: 'Hydraulic Pressure', minValue: 100, maxValue: 250, unit: 'bar' }],
      },
    },
  });

  const motor1 = await prisma.machine.create({
    data: {
      siteId: site1.id,
      warehouseId: whFab.id,
      parentMachineId: shearA.id,
      name: 'Hydraulic Shear Motor Unit',
      level: 3,
      path: 'Fabrication Line 1 / Cutting & Shearing Station / Shear Machine A / Hydraulic Shear Motor Unit',
    },
  });

  const galvLine = await prisma.machine.create({
    data: {
      siteId: site1.id,
      warehouseId: whGalv.id,
      name: 'Galvanizing Bath Line 1',
      level: 0,
      path: 'Galvanizing Bath Line 1',
    },
  });

  // 8. Audit Log Initial Entry
  await prisma.auditLog.create({
    data: {
      entityName: 'Site',
      entityId: site1.id,
      action: 'CREATE',
      actorId: user1.id,
      diff: JSON.stringify({ name: site1.name, code: site1.code }),
    },
  });

  console.log('Database seeding completed successfully for Masters Foundation v2.0!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
