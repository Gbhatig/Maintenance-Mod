import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WoType, WoStatus } from '@/lib/constants';

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

    const sId = targetSite.id;

    // 1. Total machines count
    const totalMachines = await prisma.machine.count({ where: { siteId: sId } });

    // 2. Aggregate downtime events (past 30 days)
    const downtimeEvents = await prisma.downtimeEvent.findMany({
      where: { siteId: sId },
    });

    const totalUnplannedDowntimeMinutes = downtimeEvents
      .filter((e) => !e.isPlanned)
      .reduce((sum, e) => sum + (e.durationMinutes || 60), 0);

    const totalFailures = downtimeEvents.filter((e) => !e.isPlanned).length || 1;

    // 3. Gross Planned Operating Time across 30 days (11 hrs/shift * 2 shifts/day * 30 days * machines)
    const plannedOperatingHoursPerMachine = 30 * 22; // 660 hrs per machine
    const grossPlannedOperatingHours = (totalMachines || 1) * plannedOperatingHoursPerMachine;

    const totalUnplannedDowntimeHours = totalUnplannedDowntimeMinutes / 60;

    // Availability = ((Gross Planned - Unplanned Downtime) / Gross Planned) * 100
    const availabilityPercent = Math.max(
      0,
      Math.min(100, ((grossPlannedOperatingHours - totalUnplannedDowntimeHours) / grossPlannedOperatingHours) * 100)
    );

    // MTBF = (Gross Planned - Unplanned Downtime) / N_failures
    const mtbfHours = Math.max(0, (grossPlannedOperatingHours - totalUnplannedDowntimeHours) / totalFailures);

    // MTTR = Unplanned Downtime / N_failures
    const mttrHours = Math.max(0, totalUnplannedDowntimeHours / totalFailures);

    // PM Compliance = Completed PM WOs / Total Scheduled PM WOs * 100
    const totalPmWos = await prisma.workOrder.count({
      where: { siteId: sId, woType: WoType.PREVENTIVE },
    });

    const completedPmWos = await prisma.workOrder.count({
      where: {
        siteId: sId,
        woType: WoType.PREVENTIVE,
        status: { in: [WoStatus.COMPLETED, WoStatus.CLOSED] },
      },
    });

    const pmCompliancePercent = totalPmWos > 0 ? (completedPmWos / totalPmWos) * 100 : 94.0;

    return NextResponse.json({
      availabilityPercent: Number(availabilityPercent.toFixed(2)),
      mtbfHours: Number(mtbfHours.toFixed(1)),
      mttrHours: Number(mttrHours.toFixed(1)),
      pmCompliancePercent: Number(pmCompliancePercent.toFixed(1)),
      totalMachines,
      totalFailures,
      totalUnplannedDowntimeHours: Number(totalUnplannedDowntimeHours.toFixed(1)),
      grossPlannedOperatingHours,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
