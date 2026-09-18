import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { site_id, warehouse_id, nodes = [] } = body;

    if (!site_id || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'site_id and nodes array are required' } },
        { status: 400 }
      );
    }

    // Map temp_id to created real UUID
    const idMap: Record<string, { id: string; name: string; path: string; level: number }> = {};
    const createdList: any[] = [];

    // Sort nodes so parents are created before children
    const processNode = async (node: any) => {
      let parentId: string | null = null;
      let parentPath = '';
      let level = 0;

      if (node.parent_temp_id && idMap[node.parent_temp_id]) {
        const p = idMap[node.parent_temp_id];
        parentId = p.id;
        parentPath = p.path;
        level = p.level + 1;
      }

      const nodeName = node.name.trim();
      const fullPath = parentPath ? `${parentPath} / ${nodeName}` : nodeName;

      const created = await prisma.machine.create({
        data: {
          siteId: site_id,
          warehouseId: warehouse_id || null,
          parentMachineId: parentId,
          name: nodeName,
          level,
          path: fullPath,
        },
      });

      idMap[node.temp_id] = { id: created.id, name: created.name, path: created.path, level: created.level };
      createdList.push({ temp_id: node.temp_id, id: created.id, name: created.name, path: created.path });
    };

    // Sequential resolution
    for (const node of nodes) {
      await processNode(node);
    }

    return NextResponse.json({ created: createdList }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
