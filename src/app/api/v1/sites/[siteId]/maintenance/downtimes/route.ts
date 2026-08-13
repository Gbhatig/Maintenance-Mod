import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MachineStatus, FaultType, Severity } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;

    let targetSite = await prisma.site.findFirst({
      where: { OR: [{ id: siteId }, { code: siteId }] },
    });

    if (!targetSite) targetSite = await prisma.site.findFirst();
    if (!targetSite) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    const downtimes = await prisma.downtimeEvent.findMany({
      where: { siteId: targetSite.id },
      include: {
        department: true,
        faultNature: true,
        reportedBy: true,
        machines: {
          include: {
            machine: true,
          },
        },
        labels: true,
        workOrders: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json(downtimes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;
    const body = await request.json();

    let targetSite = await prisma.site.findFirst({
      where: { OR: [{ id: siteId }, { code: siteId }] },
    });

    if (!targetSite) targetSite = await prisma.site.findFirst();
    if (!targetSite) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    const sId = targetSite.id;
    const count = await prisma.downtimeEvent.count({ where: { siteId: sId } });
    const eventNumber = `DT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const {
      machineIds,
      departmentId,
      severity = Severity.MEDIUM,
      typeOfFault = FaultType.MACHINE,
      faultNatureId,
      reportedById,
      startTime,
      isPlanned = false,
      remarks,
      labels = [],
    } = body;

    if (!machineIds || !Array.isArray(machineIds) || machineIds.length === 0) {
      return NextResponse.json({ error: 'At least one machine must be selected' }, { status: 400 });
    }

    if (!departmentId || !faultNatureId || !reportedById) {
      return NextResponse.json({ error: 'Missing required downtime fields' }, { status: 400 });
    }

    // 1. Create Downtime Event with machine associations
    const downtimeEvent = await prisma.downtimeEvent.create({
      data: {
        siteId: sId,
        eventNumber,
        isPlanned,
        departmentId,
        severity,
        typeOfFault,
        faultNatureId,
        reportedById,
        startTime: startTime ? new Date(startTime) : new Date(),
        remarks,
        machines: {
          create: machineIds.map((mId: string) => ({
            machineId: mId,
          })),
        },
        labels: {
          create: labels.map((lbl: string) => ({
            labelName: lbl,
          })),
        },
      },
      include: {
        department: true,
        faultNature: true,
        reportedBy: true,
        machines: {
          include: { machine: true },
        },
        labels: true,
      },
    });

    // 2. Set status of linked machines to DOWN
    await prisma.machine.updateMany({
      where: { id: { in: machineIds } },
      data: { liveStatus: MachineStatus.DOWN },
    });

    return NextResponse.json(downtimeEvent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
