import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WoStatus } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; woId: string } }
) {
  try {
    const { woId } = params;
    const body = await request.json();
    const { targetStatus, actualHours } = body;

    if (!targetStatus) {
      return NextResponse.json({ error: 'targetStatus is required' }, { status: 400 });
    }

    const wo = await prisma.workOrder.findUnique({
      where: { id: woId },
    });

    if (!wo) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Threshold Guard Rule: If moving to IN_PROGRESS, check approval
    if (targetStatus === WoStatus.IN_PROGRESS) {
      const needsApproval = wo.estimatedHours > 8.0 || wo.estimatedPartsCost > 500.0 || wo.requiresSupervisorApproval;
      if (needsApproval && !wo.approvedById) {
        return NextResponse.json(
          {
            error: 'Supervisor Approval Required',
            message: `Work Order exceeds supervisor threshold (${wo.estimatedHours} hrs / $${wo.estimatedPartsCost}). Must be approved by a Supervisor or Manager before starting work.`,
            requiresSupervisorApproval: true,
          },
          { status: 403 }
        );
      }
    }

    const updateData: any = { status: targetStatus };
    if (actualHours !== undefined) {
      updateData.actualHours = parseFloat(actualHours);
    }

    const updated = await prisma.workOrder.update({
      where: { id: woId },
      data: updateData,
      include: {
        downtimeEvent: { include: { machines: { include: { machine: true } } } },
        pmTemplate: { include: { machine: true } },
        createdBy: true,
        approvedBy: true,
        partsConsumed: { include: { part: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
