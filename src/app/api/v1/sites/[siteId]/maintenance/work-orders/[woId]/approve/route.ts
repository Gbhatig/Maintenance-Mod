import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RoleCode } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; woId: string } }
) {
  try {
    const { siteId, woId } = params;
    const body = await request.json().catch(() => ({}));
    const { approverEmployeeId } = body;

    let targetSite = await prisma.site.findFirst({
      where: { OR: [{ id: siteId }, { code: siteId }] },
    });
    if (!targetSite) targetSite = await prisma.site.findFirst();

    // Verify approver employee exists and has SUPERVISOR or MANAGER role
    let approver = await prisma.employee.findFirst({
      where: {
        id: approverEmployeeId,
        siteId: targetSite?.id,
        role: { in: [RoleCode.SUPERVISOR, RoleCode.MANAGER] },
      },
    });

    // Fallback: if approver not specified, pick first supervisor/manager in site
    if (!approver) {
      approver = await prisma.employee.findFirst({
        where: {
          siteId: targetSite?.id,
          role: { in: [RoleCode.SUPERVISOR, RoleCode.MANAGER] },
        },
      });
    }

    if (!approver) {
      return NextResponse.json(
        { error: 'Valid Supervisor or Manager employee required for approval' },
        { status: 400 }
      );
    }

    const updated = await prisma.workOrder.update({
      where: { id: woId },
      data: {
        approvedById: approver.id,
        approvedAt: new Date(),
        requiresSupervisorApproval: false,
      },
      include: {
        approvedBy: true,
        createdBy: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
