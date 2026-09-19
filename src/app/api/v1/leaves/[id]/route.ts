import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, approved_by } = body;

    if (!status || !['APPROVED', 'REJECTED', 'PENDING', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Valid status is required' } },
        { status: 400 }
      );
    }

    const updated = await prisma.employeeLeave.update({
      where: { id },
      data: {
        status,
        approvedBy: approved_by || null,
      },
      include: {
        employee: true,
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
    await prisma.employeeLeave.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
