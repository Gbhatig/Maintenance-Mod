import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');

    const where: any = { isDeleted: false };
    if (siteId) where.siteId = siteId;

    const allMachines = await prisma.machine.findMany({
      where,
      include: {
        warehouse: true,
        productionParams: true,
        parameters: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build recursive nested tree array
    const buildTree = (parentId: string | null = null): any[] => {
      return allMachines
        .filter((m) => m.parentMachineId === parentId)
        .map((m) => ({
          id: m.id,
          name: m.name,
          level: m.level,
          path: m.path,
          warehouse_id: m.warehouseId,
          warehouse: m.warehouse,
          production_params: m.productionParams,
          parameters: m.parameters,
          children: buildTree(m.id),
        }));
    };

    const treeData = buildTree(null);

    return NextResponse.json({ data: treeData });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
