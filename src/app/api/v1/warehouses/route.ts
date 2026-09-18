import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');

    const where: any = { isDeleted: false };
    if (siteId) where.siteId = siteId;

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: { site: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: warehouses });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { site_id, name, type = 'FABRICATION' } = body;

    if (!site_id || !name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'site_id and name are required' } },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        siteId: site_id,
        name: name.trim(),
        type,
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
