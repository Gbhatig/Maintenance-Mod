import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MachineStatus } from '@/lib/constants';

export async function PUT(
  request: NextRequest,
  { params }: { params: { siteId: string; downtimeId: string } }
) {
  try {
    const { downtimeId } = params;
    const body = await request.json().catch(() => ({}));

    const existing = await prisma.downtimeEvent.findUnique({
      where: { id: downtimeId },
      include: {
        machines: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Downtime event not found' }, { status: 404 });
    }

    const endTime = body.endTime ? new Date(body.endTime) : new Date();
    const startTime = new Date(existing.startTime);
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)));

    // 1. Close Downtime Event
    const updated = await prisma.downtimeEvent.update({
      where: { id: downtimeId },
      data: {
        endTime,
        durationMinutes,
      },
      include: {
        machines: { include: { machine: true } },
        department: true,
        faultNature: true,
      },
    });

    // 2. Check each machine to see if it has other active open downtime events
    const machineIds = existing.machines.map((dm) => dm.machineId);

    for (const mId of machineIds) {
      const otherOpenEvents = await prisma.downtimeEvent.count({
        where: {
          endTime: null,
          machines: {
            some: { machineId: mId },
          },
        },
      });

      if (otherOpenEvents === 0) {
        await prisma.machine.update({
          where: { id: mId },
          data: { liveStatus: MachineStatus.RUNNING },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
