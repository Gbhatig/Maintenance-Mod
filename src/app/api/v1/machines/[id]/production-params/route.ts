import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { params: productionParams = [] } = body;

    const created = await Promise.all(
      productionParams.map((p: any) =>
        prisma.machineProductionParam.create({
          data: {
            machineId: id,
            metricName: p.metric_name,
            unit: p.unit,
          },
        })
      )
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
