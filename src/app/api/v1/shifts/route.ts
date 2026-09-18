import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');

    const where: any = { isDeleted: false };
    if (siteId) where.siteId = siteId;

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        site: true,
        workingDays: true,
      },
      orderBy: { name: 'asc' },
    });

    const data = shifts.map((s) => ({
      id: s.id,
      site_id: s.siteId,
      name: s.name,
      start_time: s.startTime,
      end_time: s.endTime,
      is_overnight: s.isOvernight,
      break_minutes: s.breakMinutes,
      gross_minutes: s.grossMinutes,
      net_minutes: s.netMinutes,
      working_days: s.workingDays.map((w) => w.dayOfWeek),
      site: s.site,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Section 4.4 Rule: Start and End time cannot be identical!
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

    // Time calculation
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

    const shift = await prisma.shift.create({
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

    return NextResponse.json(shift, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
