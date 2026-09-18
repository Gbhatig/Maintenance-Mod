import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '25', 10);
    const qName = searchParams.get('q_name');
    const qDept = searchParams.get('q_dept');

    const where: any = { isDeleted: false };
    if (qName) where.name = { contains: qName };
    if (qDept) where.department = { name: { contains: qDept } };

    const total = await prisma.employee.count({ where });
    const employees = await prisma.employee.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        department: true,
        role: true,
        sites: { include: { site: true } },
        warehouses: { include: { warehouse: true } },
      },
    });

    const data = employees.map((e) => ({
      id: e.id,
      emp_code: e.empCode,
      name: e.name,
      mobile: e.mobile,
      email: e.email,
      department: e.department,
      role: e.role,
      landing_page: e.landingPage,
      status: e.status,
      sites: e.sites.map((s) => s.site),
      warehouses: e.warehouses.map((w) => w.warehouse),
      created_at: e.createdAt,
    }));

    return NextResponse.json({
      data,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    });
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
    const {
      name,
      mobile,
      email,
      department_id,
      role_id,
      site_ids = [],
      warehouse_ids = [],
      landing_page = 'DEFAULT',
    } = body;

    const fieldsErr: Record<string, string> = {};
    if (!name || !name.trim()) fieldsErr.name = 'Name is required';
    if (!department_id) fieldsErr.department_id = 'Department is required';
    if (!role_id) fieldsErr.role_id = 'Role is required';

    // CONSTRAINT chk_contact_present: Either mobile or email required!
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

    // Generate emp_code EMP-00XX
    const count = await prisma.employee.count();
    const empCode = `EMP-${String(count + 1).padStart(4, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        empCode,
        name: name.trim(),
        mobile: mobile || null,
        email: email || null,
        departmentId: department_id,
        roleId: role_id,
        landingPage: landing_page,
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

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
