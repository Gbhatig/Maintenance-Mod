import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; woId: string } }
) {
  try {
    const { woId } = params;
    const body = await request.json();
    const { partId, quantityConsumed } = body;

    if (!partId || !quantityConsumed || quantityConsumed <= 0) {
      return NextResponse.json({ error: 'partId and valid quantityConsumed are required' }, { status: 400 });
    }

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }

    const totalCost = part.unitCost * quantityConsumed;

    // 1. Create WorkOrderPart record
    const woPart = await prisma.workOrderPart.create({
      data: {
        workOrderId: woId,
        partId,
        quantityConsumed,
        totalCost,
      },
    });

    // 2. Deduct inventory quantityOnHand
    await prisma.part.update({
      where: { id: partId },
      data: {
        quantityOnHand: { decrement: quantityConsumed },
      },
    });

    // 3. Update WorkOrder actualPartsCost
    const wo = await prisma.workOrder.update({
      where: { id: woId },
      data: {
        actualPartsCost: { increment: totalCost },
      },
      include: {
        partsConsumed: { include: { part: true } },
      },
    });

    return NextResponse.json({ woPart, workOrder: wo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
