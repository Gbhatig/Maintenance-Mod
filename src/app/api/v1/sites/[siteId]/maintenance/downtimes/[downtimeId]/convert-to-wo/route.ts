import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WoType, WoPriority, WoStatus } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; downtimeId: string } }
) {
  try {
    const { siteId, downtimeId } = params;
    const body = await request.json().catch(() => ({}));

    let targetSite = await prisma.site.findFirst({
      where: { OR: [{ id: siteId }, { code: siteId }] },
    });
    if (!targetSite) targetSite = await prisma.site.findFirst();
    if (!targetSite) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    const downtime = await prisma.downtimeEvent.findUnique({
      where: { id: downtimeId },
      include: { machines: { include: { machine: true } } },
    });

    if (!downtime) {
      return NextResponse.json({ error: 'Downtime event not found' }, { status: 404 });
    }

    const createdBy = await prisma.employee.findFirst({
      where: { siteId: targetSite.id },
    });

    if (!createdBy) {
      return NextResponse.json({ error: 'No employee available' }, { status: 400 });
    }

    const count = await prisma.workOrder.count({ where: { siteId: targetSite.id } });
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const estHours = body.estimatedHours || 5.0;
    const estPartsCost = body.estimatedPartsCost || 300.0;
    const requiresApproval = estHours > 8.0 || estPartsCost > 500.0;

    const wo = await prisma.workOrder.create({
      data: {
        siteId: targetSite.id,
        woNumber,
        woType: WoType.BREAKDOWN,
        priority: WoPriority.HIGH,
        status: WoStatus.OPEN,
        downtimeEventId: downtime.id,
        scheduledDate: new Date(),
        estimatedHours: estHours,
        estimatedPartsCost: estPartsCost,
        requiresSupervisorApproval: requiresApproval,
        createdById: createdBy.id,
      },
      include: {
        downtimeEvent: { include: { machines: { include: { machine: true } } } },
        createdBy: true,
      },
    });

    return NextResponse.json(wo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
