import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const machines = await prisma.machine.findMany({
      where: { siteId: targetSite.id },
      include: {
        section: true,
        downtimeMachines: {
          include: {
            downtimeEvent: {
              include: {
                faultNature: true,
              },
            },
          },
        },
      },
    });

    const badActors = machines.map((mc) => {
      let totalDowntimeMinutes = 0;
      let failureCount = 0;
      let primaryFaultNature = 'General Mechanical Wear';

      mc.downtimeMachines.forEach((dm) => {
        const ev = dm.downtimeEvent;
        if (ev) {
          failureCount += 1;
          totalDowntimeMinutes += ev.durationMinutes || 60;
          if (ev.faultNature) {
            primaryFaultNature = ev.faultNature.name;
          }
        }
      });

      return {
        machineId: mc.id,
        code: mc.code,
        name: mc.name,
        sectionCode: mc.section?.code || 'N/A',
        criticality: mc.criticality,
        failureCount,
        totalDowntimeMinutes,
        totalDowntimeHours: Number((totalDowntimeMinutes / 60).toFixed(1)),
        primaryFaultNature,
      };
    });

    badActors.sort((a, b) => b.totalDowntimeMinutes - a.totalDowntimeMinutes);

    return NextResponse.json(badActors.slice(0, 10));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
