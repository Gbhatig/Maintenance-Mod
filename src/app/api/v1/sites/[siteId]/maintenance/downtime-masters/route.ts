import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;

    // Verify site or query default site
    let targetSite = await prisma.site.findFirst({
      where: { OR: [{ id: siteId }, { code: siteId }] },
    });

    if (!targetSite) {
      targetSite = await prisma.site.findFirst();
    }

    if (!targetSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const sId = targetSite.id;

    const [departments, faultNatures, sections, shifts, employees] = await Promise.all([
      prisma.department.findMany({ where: { siteId: sId } }),
      prisma.faultNature.findMany({ where: { siteId: sId } }),
      prisma.section.findMany({ where: { siteId: sId } }),
      prisma.shift.findMany({ where: { siteId: sId } }),
      prisma.employee.findMany({ where: { siteId: sId, isActive: true } }),
    ]);

    return NextResponse.json({
      site: targetSite,
      departments,
      faultNatures,
      sections,
      shifts,
      employees,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
