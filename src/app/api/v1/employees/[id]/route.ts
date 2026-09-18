import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      name,
      mobile,
      email,
      department_id,
      role_id,
      site_ids = [],
      warehouse_ids = [],
      landing_page = 'DEFAULT',
      status = 'ACTIVE',
    } = body;

    const fieldsErr: Record<string, string> = {};
    if (!name || !name.trim()) fieldsErr.name = 'Name is required';
    if (!department_id) fieldsErr.department_id = 'Department is required';
    if (!role_id) fieldsErr.role_id = 'Role is required';

    if (!mobile && !email) {
      fieldsErr.mobile = 'Either mobile or email is required';
      fieldsErr.email = 'Either mobile or email is required';
    }

    if (Object.keys(fieldsErr).length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'One or more fields are invalid.',
            fields: fieldsErr,
          },
        },
        { status: 400 }
      );
    }

    // Delete existing junction relations
    await prisma.employeeSite.deleteMany({ where: { employeeId: id } });
    await prisma.employeeWarehouse.deleteMany({ where: { employeeId: id } });

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name: name.trim(),
        mobile: mobile || null,
        email: email || null,
        departmentId: department_id,
        roleId: role_id,
        landingPage: landing_page,
        status,
        sites: {
          create: site_ids.map((sId: string) => ({ siteId: sId })),
        },
        warehouses: {
          create: warehouse_ids.map((wId: string) => ({ warehouseId: wId })),
        },
      },
      include: {
        department: true,
        role: true,
        sites: { include: { site: true } },
        warehouses: { include: { warehouse: true } },
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
    await prisma.employee.update({
      where: { id },
      data: { isDeleted: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
