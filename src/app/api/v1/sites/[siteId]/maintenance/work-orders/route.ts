import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WoType, WoPriority, WoStatus } from '@/lib/constants';

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

    const workOrders = await prisma.workOrder.findMany({
      where: { siteId: targetSite.id },
      include: {
        downtimeEvent: {
          include: { machines: { include: { machine: true } } },
        },
        pmTemplate: {
          include: { machine: true },
        },
        createdBy: true,
        approvedBy: true,
        partsConsumed: {
          include: { part: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(workOrders);
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

    const count = await prisma.workOrder.count({ where: { siteId: targetSite.id } });
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const estHours = body.estimatedHours || 2.0;
    const estPartsCost = body.estimatedPartsCost || 100.0;
    const requiresApproval = estHours > 8.0 || estPartsCost > 500.0;

    const createdBy = await prisma.employee.findFirst({
      where: { siteId: targetSite.id },
    });

    if (!createdBy) return NextResponse.json({ error: 'No employee found' }, { status: 400 });

    const wo = await prisma.workOrder.create({
      data: {
        siteId: targetSite.id,
        woNumber,
        woType: body.woType || WoType.PREVENTIVE,
        priority: body.priority || WoPriority.MEDIUM,
        status: WoStatus.DRAFT,
        downtimeEventId: body.downtimeEventId || null,
        pmTemplateId: body.pmTemplateId || null,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
        estimatedHours: estHours,
        estimatedPartsCost: estPartsCost,
        requiresSupervisorApproval: requiresApproval,
        createdById: createdBy.id,
      },
      include: {
        createdBy: true,
      },
    });

    return NextResponse.json(wo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
