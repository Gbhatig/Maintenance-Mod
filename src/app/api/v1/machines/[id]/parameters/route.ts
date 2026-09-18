import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { parameters = [] } = body;

    const created = await Promise.all(
      parameters.map((p: any) =>
        prisma.machineParameter.create({
          data: {
            machineId: id,
            parameterName: p.parameter_name,
            minValue: p.min_value ? parseFloat(p.min_value) : null,
            maxValue: p.max_value ? parseFloat(p.max_value) : null,
            unit: p.unit || null,
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
