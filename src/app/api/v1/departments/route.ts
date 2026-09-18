import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { isDeleted: false },
      include: {
        roles: { where: { isDeleted: false } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: departments });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
