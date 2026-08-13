import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WoType, WoPriority, WoStatus } from '@/lib/constants';

export async function POST(
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

    const sId = targetSite.id;
    const pmTemplates = await prisma.pmTemplate.findMany({
      where: { siteId: sId, isActive: true },
      include: { machine: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const generatedSchedules: any[] = [];
    const createdWorkOrders: any[] = [];

    const defaultEmployee = await prisma.employee.findFirst({ where: { siteId: sId } });

    for (const tmpl of pmTemplates) {
      // Check if schedule cycle exists for today
      const existing = await prisma.pmSchedule.findFirst({
        where: {
          siteId: sId,
          pmTemplateId: tmpl.id,
          scheduledDueDate: today,
        },
      });

      if (!existing) {
        // Create Work Order
        const count = await prisma.workOrder.count({ where: { siteId: sId } });
        const woNumber = `WO-PM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        const wo = await prisma.workOrder.create({
          data: {
            siteId: sId,
            woNumber,
            woType: WoType.PREVENTIVE,
            priority: WoPriority.MEDIUM,
            status: WoStatus.OPEN,
            pmTemplateId: tmpl.id,
            scheduledDate: today,
            estimatedHours: tmpl.estimatedDurationHours,
            createdById: defaultEmployee?.id || '',
          },
        });
        createdWorkOrders.push(wo);

        const schedule = await prisma.pmSchedule.create({
          data: {
            siteId: sId,
            pmTemplateId: tmpl.id,
            scheduledDueDate: today,
            status: 'GENERATED',
            workOrderId: wo.id,
            generatedAt: new Date(),
          },
        });
        generatedSchedules.push(schedule);
      }
    }

    return NextResponse.json({
      message: 'PM Scheduler execution completed idempotently',
      processedTemplates: pmTemplates.length,
      newSchedulesCreated: generatedSchedules.length,
      newWorkOrdersCreated: createdWorkOrders.length,
      schedules: generatedSchedules,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
