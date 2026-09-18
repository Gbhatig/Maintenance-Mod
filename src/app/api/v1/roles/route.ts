import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');

    const where: any = { isDeleted: false };
    if (departmentId) where.departmentId = departmentId;

    const roles = await prisma.role.findMany({
      where,
      include: { department: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: roles });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
