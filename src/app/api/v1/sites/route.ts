import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '25', 10);
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc';

    const qCity = searchParams.get('q_city');
    const qName = searchParams.get('q_name');

    const whereClause: any = { isDeleted: false };
    if (qCity) whereClause.city = { contains: qCity };
    if (qName) whereClause.name = { contains: qName };

    const total = await prisma.site.count({ where: whereClause });
    const sites = await prisma.site.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortDir },
      include: {
        warehouses: { where: { isDeleted: false } },
        _count: {
          select: {
            warehouses: true,
            employees: true,
            machines: true,
          },
        },
      },
    });

    const data = sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      address: s.address,
      city: s.city,
      state: s.state,
      country: s.country,
      gst_no: s.gstNo,
      timezone: s.timezone,
      status: s.status,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      warehouses_count: s._count.warehouses,
      employees_count: s._count.employees,
      machines_count: s._count.machines,
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
    const { name, address, city, state, country = 'IN', gst_no } = body;

    // Field Validation
    const fieldsErr: Record<string, string> = {};
    if (!name || !name.trim()) fieldsErr.name = 'Name is required';
    if (!city || !city.trim()) fieldsErr.city = 'City is required';
    if (!state || !state.trim()) fieldsErr.state = 'State is required';
    if (!country || country.length !== 2) fieldsErr.country = 'Must be a valid ISO-3166 alpha-2 code';

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

    // Check case-insensitive duplicate name
    const existing = await prisma.site.findFirst({
      where: {
        name: { equals: name.trim() },
        isDeleted: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE',
            message: 'A site with this name already exists.',
          },
        },
        { status: 409 }
      );
    }

    // Generate site code STE-000X
    const count = await prisma.site.count();
    const code = `STE-${String(count + 1).padStart(4, '0')}`;

    const site = await prisma.site.create({
      data: {
        code,
        name: name.trim(),
        address,
        city,
        state,
        country: country.toUpperCase(),
        gstNo: gst_no,
      },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
