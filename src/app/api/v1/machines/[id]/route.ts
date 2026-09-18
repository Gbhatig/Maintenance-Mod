import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, warehouse_id, parent_machine_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Machine name is required' } },
        { status: 400 }
      );
    }

    const current = await prisma.machine.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Machine not found' } },
        { status: 404 }
      );
    }

    let parentPath = '';
    let level = 0;

    if (parent_machine_id) {
      const parent = await prisma.machine.findUnique({ where: { id: parent_machine_id } });
      if (parent) {
        parentPath = parent.path;
        level = parent.level + 1;
      }
    }

    const nodeName = name.trim();
    const fullPath = parentPath ? `${parentPath} / ${nodeName}` : nodeName;

    const updated = await prisma.machine.update({
      where: { id },
      data: {
        name: nodeName,
        warehouseId: warehouse_id || null,
        parentMachineId: parent_machine_id || null,
        level,
        path: fullPath,
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
