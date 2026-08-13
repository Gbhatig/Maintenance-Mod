import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enum string constants
const DeptCode = {
  ADMIN: 'ADMIN',
  PRODUCTION: 'PRODUCTION',
  MAINTENANCE: 'MAINTENANCE',
  QUALITY: 'QUALITY',
  PLANNING: 'PLANNING',
  PROCESS: 'PROCESS',
  PURCHASE: 'PURCHASE',
  SALES: 'SALES',
  IT: 'IT',
};

const RoleCode = {
  WORKER: 'WORKER',
  OPERATOR: 'OPERATOR',
  TECHNICIAN: 'TECHNICIAN',
  SUPERVISOR: 'SUPERVISOR',
  MANAGER: 'MANAGER',
  SUPPORT: 'SUPPORT',
  ADMIN: 'ADMIN',
  QUALITY: 'QUALITY',
  PLANNING: 'PLANNING',
  PROCESS: 'PROCESS',
};

const MachineCriticality = { A: 'A', B: 'B', C: 'C' };
const MachineStatus = { RUNNING: 'RUNNING', DOWN: 'DOWN', UNDER_MAINTENANCE: 'UNDER_MAINTENANCE' };
const Severity = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
const FaultType = { MAN: 'MAN', MACHINE: 'MACHINE', MATERIAL: 'MATERIAL', METHOD: 'METHOD' };
const WoType = { BREAKDOWN: 'BREAKDOWN', PREVENTIVE: 'PREVENTIVE', INSPECTION: 'INSPECTION', CALIBRATION: 'CALIBRATION' };
const WoPriority = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
const WoStatus = { DRAFT: 'DRAFT', OPEN: 'OPEN', ASSIGNED: 'ASSIGNED', IN_PROGRESS: 'IN_PROGRESS', ON_HOLD: 'ON_HOLD', COMPLETED: 'COMPLETED', CLOSED: 'CLOSED' };
const PmFrequencyType = { CALENDAR: 'CALENDAR', USAGE: 'USAGE' };
const PmFrequencyUnit = { DAYS: 'DAYS', WEEKS: 'WEEKS', MONTHS: 'MONTHS', HOURS: 'HOURS', CYCLES: 'CYCLES' };

async function main() {
  console.log('Seeding Discrete Manufacturing ERP - Maintenance Module Database...');

  // 1. Site
  const site = await prisma.site.upsert({
    where: { code: 'PUNE-PLANT-01' },
    update: {},
    create: {
      code: 'PUNE-PLANT-01',
      name: 'Pune Heavy Forging & Machining Plant',
    },
  });

  // 2. Departments
  const deptData = [
    { code: DeptCode.ADMIN, name: 'Administration' },
    { code: DeptCode.PRODUCTION, name: 'Production & Shopfloor' },
    { code: DeptCode.MAINTENANCE, name: 'Plant Maintenance' },
    { code: DeptCode.QUALITY, name: 'Quality Assurance' },
    { code: DeptCode.PLANNING, name: 'Production Planning' },
    { code: DeptCode.PROCESS, name: 'Process Engineering' },
    { code: DeptCode.PURCHASE, name: 'Purchase & Stores' },
    { code: DeptCode.SALES, name: 'Sales & Dispatch' },
    { code: DeptCode.IT, name: 'Information Technology' },
  ];

  const depts: Record<string, any> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { siteId_code: { siteId: site.id, code: d.code } },
      update: {},
      create: { siteId: site.id, code: d.code, name: d.name },
    });
    depts[d.code] = dept;
  }

  // 3. Sections
  const secPreMach = await prisma.section.upsert({
    where: { siteId_code: { siteId: site.id, code: 'SEC-PRE-MACH' } },
    update: {},
    create: { siteId: site.id, code: 'SEC-PRE-MACH', name: 'Pre-Machining & Roughing' },
  });

  const secFinMach = await prisma.section.upsert({
    where: { siteId_code: { siteId: site.id, code: 'SEC-FIN-MACH' } },
    update: {},
    create: { siteId: site.id, code: 'SEC-FIN-MACH', name: 'Final Machining & Finishing' },
  });

  // 4. Shifts
  const shiftA = await prisma.shift.upsert({
    where: { siteId_sectionId_name: { siteId: site.id, sectionId: secPreMach.id, name: 'Shift-A' } },
    update: {},
    create: {
      siteId: site.id,
      sectionId: secPreMach.id,
      name: 'Shift-A',
      startTime: '08:00',
      endTime: '20:00',
      durationHours: 12.0,
      breakDurationMinutes: 60,
      isOvernight: false,
    },
  });

  const shiftB = await prisma.shift.upsert({
    where: { siteId_sectionId_name: { siteId: site.id, sectionId: secPreMach.id, name: 'Shift-B' } },
    update: {},
    create: {
      siteId: site.id,
      sectionId: secPreMach.id,
      name: 'Shift-B',
      startTime: '20:00',
      endTime: '08:00',
      durationHours: 12.0,
      breakDurationMinutes: 60,
      isOvernight: true,
    },
  });

  // 5. Fault Natures
  const fnData = [
    { code: 'FN-ELEC-SPK', name: 'Electrical Voltage Surge & Sparking', desc: 'Control panel voltage fluctuation' },
    { code: 'FN-MECH-BRG', name: 'Spindle Bearing Overheating & Seizure', desc: 'Excessive vibration or friction' },
    { code: 'FN-HYD-LAK', name: 'Hydraulic Hose Leakage & Pressure Drop', desc: 'Fluid leak causing clamp loss' },
    { code: 'FN-TOOL-WEAR', name: 'Tool Holder Misalignment & Tip Chipping', desc: 'Tool wear beyond tolerance' },
    { code: 'FN-COOL-PMP', name: 'Coolant Pump Motor Failure', desc: 'Thermal overload tripped' },
  ];

  const faultNatures: any[] = [];
  for (const fn of fnData) {
    const item = await prisma.faultNature.upsert({
      where: { siteId_code: { siteId: site.id, code: fn.code } },
      update: {},
      create: { siteId: site.id, code: fn.code, name: fn.name, description: fn.desc },
    });
    faultNatures.push(item);
  }

  // 6. Employees (20 total)
  const empList = [
    { code: 'EMP-101', fn: 'Rajesh', ln: 'Sharma', role: RoleCode.MANAGER, dept: DeptCode.MAINTENANCE, email: 'r.sharma@puneplant.com' },
    { code: 'EMP-102', fn: 'Amit', ln: 'Verma', role: RoleCode.SUPERVISOR, dept: DeptCode.MAINTENANCE, email: 'a.verma@puneplant.com' },
    { code: 'EMP-103', fn: 'Suresh', ln: 'Patil', role: RoleCode.TECHNICIAN, dept: DeptCode.MAINTENANCE, email: 's.patil@puneplant.com' },
    { code: 'EMP-104', fn: 'Vikas', ln: 'Kulkarni', role: RoleCode.TECHNICIAN, dept: DeptCode.MAINTENANCE, email: 'v.kulkarni@puneplant.com' },
    { code: 'EMP-105', fn: 'Ramesh', ln: 'Pawar', role: RoleCode.OPERATOR, dept: DeptCode.PRODUCTION, email: 'r.pawar@puneplant.com' },
    { code: 'EMP-106', fn: 'Manoj', ln: 'Deshmukh', role: RoleCode.OPERATOR, dept: DeptCode.PRODUCTION, email: 'm.deshmukh@puneplant.com' },
    { code: 'EMP-107', fn: 'Ganesh', ln: 'Shinde', role: RoleCode.OPERATOR, dept: DeptCode.PRODUCTION, email: 'g.shinde@puneplant.com' },
    { code: 'EMP-108', fn: 'Pravin', ln: 'Jadhav', role: RoleCode.OPERATOR, dept: DeptCode.PRODUCTION, email: 'p.jadhav@puneplant.com' },
    { code: 'EMP-109', fn: 'Sunil', ln: 'More', role: RoleCode.OPERATOR, dept: DeptCode.PRODUCTION, email: 's.more@puneplant.com' },
    { code: 'EMP-110', fn: 'Sachin', ln: 'Kadam', role: RoleCode.OPERATOR, dept: DeptCode.PRODUCTION, email: 's.kadam@puneplant.com' },
    { code: 'EMP-111', fn: 'Dinesh', ln: 'Chavan', role: RoleCode.WORKER, dept: DeptCode.PRODUCTION, email: 'd.chavan@puneplant.com' },
    { code: 'EMP-112', fn: 'Nilesh', ln: 'Bhosale', role: RoleCode.WORKER, dept: DeptCode.PRODUCTION, email: 'n.bhosale@puneplant.com' },
    { code: 'EMP-113', fn: 'Rahul', ln: 'Gaikwad', role: RoleCode.QUALITY, dept: DeptCode.QUALITY, email: 'r.gaikwad@puneplant.com' },
    { code: 'EMP-114', fn: 'Sanjay', ln: 'Mane', role: RoleCode.SUPERVISOR, dept: DeptCode.QUALITY, email: 's.mane@puneplant.com' },
    { code: 'EMP-115', fn: 'Prashant', ln: 'Salunkhe', role: RoleCode.PLANNING, dept: DeptCode.PLANNING, email: 'p.salunkhe@puneplant.com' },
    { code: 'EMP-116', fn: 'Vijay', ln: 'Thorat', role: RoleCode.PROCESS, dept: DeptCode.PROCESS, email: 'v.thorat@puneplant.com' },
    { code: 'EMP-117', fn: 'Anil', ln: 'Jagtap', role: RoleCode.SUPPORT, dept: DeptCode.PURCHASE, email: 'a.jagtap@puneplant.com' },
    { code: 'EMP-118', fn: 'Kiran', ln: 'Wagh', role: RoleCode.SUPPORT, dept: DeptCode.SALES, email: 'k.wagh@puneplant.com' },
    { code: 'EMP-119', fn: 'Santosh', ln: 'Shelke', role: RoleCode.SUPPORT, dept: DeptCode.IT, email: 's.shelke@puneplant.com' },
    { code: 'EMP-120', fn: 'Deepak', ln: 'Nalawade', role: RoleCode.ADMIN, dept: DeptCode.ADMIN, email: 'd.nalawade@puneplant.com' },
  ];

  const employees: any[] = [];
  for (const e of empList) {
    const emp = await prisma.employee.upsert({
      where: { siteId_employeeCode: { siteId: site.id, employeeCode: e.code } },
      update: {},
      create: {
        siteId: site.id,
        departmentId: depts[e.dept].id,
        employeeCode: e.code,
        firstName: e.fn,
        lastName: e.ln,
        email: e.email,
        role: e.role,
      },
    });
    employees.push(emp);
  }

  // 7. Machines (12 Machines)
  const mcList = [
    { code: 'P/M CNC-1', name: 'Pre-Machining CNC Lathe 01', crit: MachineCriticality.A, sec: secPreMach.id, status: MachineStatus.DOWN },
    { code: 'P/M CNC-2', name: 'Pre-Machining CNC Lathe 02', crit: MachineCriticality.A, sec: secPreMach.id, status: MachineStatus.RUNNING },
    { code: 'P/M CNC-3', name: 'Pre-Machining CNC Lathe 03', crit: MachineCriticality.B, sec: secPreMach.id, status: MachineStatus.RUNNING },
    { code: 'P/M CNC-4', name: 'Pre-Machining CNC Lathe 04', crit: MachineCriticality.B, sec: secPreMach.id, status: MachineStatus.RUNNING },
    { code: 'P/M CNC-5', name: 'Pre-Machining CNC Lathe 05', crit: MachineCriticality.B, sec: secPreMach.id, status: MachineStatus.RUNNING },
    { code: 'P/M CNC-6', name: 'Pre-Machining CNC Lathe 06', crit: MachineCriticality.C, sec: secPreMach.id, status: MachineStatus.RUNNING },
    { code: 'P/M CNC-7', name: 'Final Machining VMC 07', crit: MachineCriticality.A, sec: secFinMach.id, status: MachineStatus.DOWN },
    { code: 'P/M CNC-8', name: 'Final Machining VMC 08', crit: MachineCriticality.A, sec: secFinMach.id, status: MachineStatus.RUNNING },
    { code: 'P/M CNC-9', name: 'Final Machining VMC 09', crit: MachineCriticality.B, sec: secFinMach.id, status: MachineStatus.RUNNING },
    { code: 'Drill-15', name: 'Multi-Spindle Gang Drill 15', crit: MachineCriticality.C, sec: secPreMach.id, status: MachineStatus.RUNNING },
    { code: 'Drill-16', name: 'Radial Heavy Drilling Press 16', crit: MachineCriticality.C, sec: secPreMach.id, status: MachineStatus.RUNNING },
    { code: 'Milling-01', name: 'Universal Horizontal Miller 01', crit: MachineCriticality.B, sec: secFinMach.id, status: MachineStatus.UNDER_MAINTENANCE },
  ];

  const machines: any[] = [];
  for (const m of mcList) {
    const mc = await prisma.machine.upsert({
      where: { siteId_code: { siteId: site.id, code: m.code } },
      update: { liveStatus: m.status },
      create: {
        siteId: site.id,
        sectionId: m.sec,
        code: m.code,
        name: m.name,
        criticality: m.crit,
        make: 'Haas / DMG Mori',
        model: 'VF-4SS',
        serialNumber: `SN-${m.code}-2023`,
        commissioningDate: new Date('2022-04-15'),
        liveStatus: m.status,
      },
    });
    machines.push(mc);
  }

  // 8. Parts Inventory
  const partList = [
    { num: 'PART-BRG-6208', name: 'High-Precision Spindle Bearing 6208-2RS', cost: 125.00, qty: 14, min: 5 },
    { num: 'PART-HYD-SEAL', name: 'Viton Hydraulic Cylinder Seal Kit', cost: 45.00, qty: 30, min: 10 },
    { num: 'PART-PMP-1HP', name: 'Coolant Submersible Motor 1HP 415V', cost: 280.00, qty: 4, min: 2 },
    { num: 'PART-TOOL-HLD', name: 'BT40 ER32 Tool Holder Assembly', cost: 195.00, qty: 10, min: 4 },
    { num: 'PART-FLT-ELEC', name: '3-Phase Line Noise Filter 50A', cost: 85.00, qty: 8, min: 3 },
  ];

  for (const p of partList) {
    await prisma.part.upsert({
      where: { siteId_partNumber: { siteId: site.id, partNumber: p.num } },
      update: {},
      create: {
        siteId: site.id,
        partNumber: p.num,
        name: p.name,
        unitCost: p.cost,
        quantityOnHand: p.qty,
        minStockLevel: p.min,
      },
    });
  }

  // 9. PM Templates
  const pm1 = await prisma.pmTemplate.upsert({
    where: { siteId_code: { siteId: site.id, code: 'PM-CNC-MONTHLY' } },
    update: {},
    create: {
      siteId: site.id,
      code: 'PM-CNC-MONTHLY',
      title: 'Monthly CNC Spindle Alignment & Lube Checklist',
      machineId: machines[0].id,
      frequencyType: PmFrequencyType.CALENDAR,
      frequencyValue: 1,
      frequencyUnit: PmFrequencyUnit.MONTHS,
      estimatedDurationHours: 3.5,
      requiredRole: RoleCode.TECHNICIAN,
    },
  });

  // 10. Downtime Events (30 events)
  console.log('Generating 30 seed downtime events...');
  const now = new Date();
  const downtimeEvents: any[] = [];

  for (let i = 1; i <= 30; i++) {
    const eventNum = `DT-2026-${String(i).padStart(4, '0')}`;
    const mc = machines[(i - 1) % machines.length];
    const fn = faultNatures[(i - 1) % faultNatures.length];

    const daysAgo = 30 - i;
    const start = new Date(now.getTime() - (daysAgo * 24 * 3600 * 1000) - (i * 3600 * 1000));
    const isClosed = i !== 1 && i !== 7;
    const end = isClosed ? new Date(start.getTime() + (45 + (i * 12)) * 60 * 1000) : null;
    const duration = isClosed ? (45 + (i * 12)) : null;

    const event = await prisma.downtimeEvent.upsert({
      where: { siteId_eventNumber: { siteId: site.id, eventNumber: eventNum } },
      update: {},
      create: {
        siteId: site.id,
        eventNumber: eventNum,
        isPlanned: i % 5 === 0,
        departmentId: depts[DeptCode.PRODUCTION].id,
        severity: i % 4 === 0 ? Severity.CRITICAL : i % 3 === 0 ? Severity.HIGH : Severity.MEDIUM,
        typeOfFault: i % 2 === 0 ? FaultType.MACHINE : FaultType.MAN,
        faultNatureId: fn.id,
        faultCode: fn.code,
        reportedById: employees[i % employees.length].id,
        startTime: start,
        endTime: end,
        durationMinutes: duration,
        shiftId: shiftA.id,
        remarks: `Automated breakdown event #${i} on machine ${mc.code}`,
        machines: {
          create: [{ machineId: mc.id }],
        },
        labels: {
          create: [{ labelName: 'HYDRAULICS' }, { labelName: 'PRODUCTION_STOP' }],
        },
      },
    });
    downtimeEvents.push(event);
  }

  // 11. Work Orders (10 work orders)
  console.log('Generating 10 seed work orders...');
  const woStatuses = [
    WoStatus.DRAFT,
    WoStatus.OPEN,
    WoStatus.ASSIGNED,
    WoStatus.IN_PROGRESS,
    WoStatus.ON_HOLD,
    WoStatus.COMPLETED,
    WoStatus.CLOSED,
    WoStatus.IN_PROGRESS,
    WoStatus.ASSIGNED,
    WoStatus.CLOSED,
  ];

  for (let j = 1; j <= 10; j++) {
    const woNum = `WO-2026-${String(j).padStart(4, '0')}`;
    const status = woStatuses[j - 1];
    const isPm = j % 3 === 0;

    await prisma.workOrder.upsert({
      where: { siteId_woNumber: { siteId: site.id, woNumber: woNum } },
      update: {},
      create: {
        siteId: site.id,
        woNumber: woNum,
        woType: isPm ? WoType.PREVENTIVE : WoType.BREAKDOWN,
        priority: j % 2 === 0 ? WoPriority.HIGH : WoPriority.MEDIUM,
        status: status,
        downtimeEventId: isPm ? null : downtimeEvents[j - 1]?.id,
        pmTemplateId: isPm ? pm1.id : null,
        scheduledDate: new Date(),
        estimatedHours: 4.5 + j,
        actualHours: status === WoStatus.COMPLETED || status === WoStatus.CLOSED ? 5.0 + j : 0.0,
        estimatedPartsCost: 150.0 + (j * 40),
        actualPartsCost: status === WoStatus.COMPLETED || status === WoStatus.CLOSED ? 160.0 + (j * 40) : 0.0,
        requiresSupervisorApproval: (4.5 + j > 8.0) || (150.0 + (j * 40) > 500.0),
        createdById: employees[0].id,
      },
    });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
