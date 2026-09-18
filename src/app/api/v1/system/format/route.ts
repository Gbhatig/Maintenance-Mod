import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
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
    await prisma.warehouse.deleteMany();
    await prisma.site.deleteMany();

    return NextResponse.json({ message: 'All database entries wiped and formatted clean.' });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
