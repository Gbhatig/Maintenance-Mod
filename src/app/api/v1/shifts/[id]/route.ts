import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      site_id,
      name,
      start_time,
      end_time,
      break_minutes = 0,
      working_days = [1, 2, 3, 4, 5],
    } = body;

    const fieldsErr: Record<string, string> = {};
    if (!site_id) fieldsErr.site_id = 'Site is required';
    if (!name || !name.trim()) fieldsErr.name = 'Shift name is required';
    if (!start_time) fieldsErr.start_time = 'Start time is required';
    if (!end_time) fieldsErr.end_time = 'End time is required';

    if (start_time && end_time && start_time === end_time) {
      fieldsErr.end_time = 'Start and end time cannot be identical';
    }

    if (Object.keys(fieldsErr).length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'One or more fields are invalid.',
            fields: fieldsErr,
          },
        },
        { status: 400 }
      );
    }

    const startMins = parseTimeToMinutes(start_time);
    const endMins = parseTimeToMinutes(end_time);

    let isOvernight = false;
    let grossMinutes = 0;

    if (endMins > startMins) {
      isOvernight = false;
      grossMinutes = endMins - startMins;
    } else {
      isOvernight = true;
      grossMinutes = 1440 - startMins + endMins;
    }

    const bMins = Number(break_minutes) || 0;
    if (bMins >= grossMinutes) {
      return NextResponse.json(
        {
          error: {
            code: 'UNPROCESSABLE',
            message: 'Break minutes cannot be greater than or equal to total shift duration.',
          },
        },
        { status: 422 }
      );
    }

    const netMinutes = grossMinutes - bMins;

    await prisma.shiftWorkingDay.deleteMany({ where: { shiftId: id } });

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        siteId: site_id,
        name: name.trim(),
        startTime: start_time,
        endTime: end_time,
        isOvernight,
        breakMinutes: bMins,
        grossMinutes,
        netMinutes,
        workingDays: {
          create: working_days.map((day: number) => ({ dayOfWeek: day })),
        },
      },
      include: {
        site: true,
        workingDays: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.shift.update({
      where: { id },
      data: { isDeleted: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
