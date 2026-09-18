import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username is required',
            fields: { username: 'Username is required' },
          },
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { username },
      include: {
        employee: {
          include: {
            role: true,
            sites: { include: { site: true } },
            warehouses: { include: { warehouse: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password',
          },
        },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const employee = user.employee;
    const siteIds = employee?.sites.map((s) => s.siteId) || [];
    const warehouseIds = employee?.warehouses.map((w) => w.warehouseId) || [];

    return NextResponse.json({
      data: {
        access_token: `mock_jwt_access_token_${user.id}`,
        refresh_token: `mock_jwt_refresh_token_${user.id}`,
        user: {
          id: user.id,
          username: user.username,
          employee_id: employee?.id,
          name: employee?.name,
          role: employee?.role.name,
          site_ids: siteIds,
          warehouse_ids: warehouseIds,
          landing_page: employee?.landingPage || 'DEFAULT',
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
