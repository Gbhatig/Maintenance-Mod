import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, code, city, state, country = 'IN', gst_no, address, status = 'ACTIVE' } = body;

    const fieldsErr: Record<string, string> = {};
    if (!name || !name.trim()) fieldsErr.name = 'Name is required';
    if (!city || !city.trim()) fieldsErr.city = 'City is required';
    if (!state || !state.trim()) fieldsErr.state = 'State is required';

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

    const updated = await prisma.site.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code || undefined,
        city: city.trim(),
        state: state.trim(),
        country: (country || 'IN').toUpperCase(),
        gstNo: gst_no || null,
        address: address || null,
        status,
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

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            warehouses: true,
            employees: true,
            machines: true,
          },
        },
      },
    });

    if (!site || site.isDeleted) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Site not found' } },
        { status: 404 }
      );
    }

    const warehousesCount = site._count.warehouses;
    const employeesCount = site._count.employees;
    const machinesCount = site._count.machines;

    if (warehousesCount > 0 || employeesCount > 0 || machinesCount > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_DEPENDENTS',
            message: `Site has ${warehousesCount} warehouses, ${employeesCount} employees, and ${machinesCount} machines assigned. Reassign or delete them before deleting this site.`,
            dependents: {
              warehouses: warehousesCount,
              employees: employeesCount,
              machines: machinesCount,
            },
          },
        },
        { status: 409 }
      );
    }

    // Soft delete
    await prisma.site.update({
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
