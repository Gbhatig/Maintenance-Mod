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

    if (!targetSite) {
      targetSite = await prisma.site.findFirst();
    }

    if (!targetSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const machines = await prisma.machine.findMany({
      where: { siteId: targetSite.id },
      include: {
        section: true,
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(machines);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
