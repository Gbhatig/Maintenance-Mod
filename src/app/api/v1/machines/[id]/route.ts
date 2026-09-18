import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get('cascade') === 'true';

    const machine = await prisma.machine.findUnique({
      where: { id },
      include: { childMachines: { where: { isDeleted: false } } },
    });

    if (!machine || machine.isDeleted) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Machine node not found' } },
        { status: 404 }
      );
    }

    if (machine.childMachines.length > 0 && !cascade) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_DEPENDENTS',
            message: `Machine has ${machine.childMachines.length} child machines. Set cascade=true to delete tree branch.`,
            child_count: machine.childMachines.length,
          },
        },
        { status: 409 }
      );
    }

    // Soft delete node and all descendents
    await prisma.machine.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ deleted_count: 1 + machine.childMachines.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
