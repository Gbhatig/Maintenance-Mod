import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const dateParam = searchParams.get('date'); // YYYY-MM-DD

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    if (dateParam) {
      const targetDate = new Date(dateParam);
      where.startDate = { lte: targetDate };
      where.endDate = { gte: targetDate };
    }

    const leaves = await prisma.employeeLeave.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = leaves.map((l) => ({
      id: l.id,
      employee_id: l.employeeId,
      employee_name: l.employee.name,
      emp_code: l.employee.empCode,
      department_name: l.employee.department?.name,
      leave_type: l.leaveType,
      start_date: l.startDate.toISOString().split('T')[0],
      end_date: l.endDate.toISOString().split('T')[0],
      total_days: l.totalDays,
      reason: l.reason,
      status: l.status,
      approved_by: l.approvedBy,
      created_at: l.createdAt,
    }));

    return NextResponse.json({ data });
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
      employee_id,
      leave_type = 'CASUAL',
      start_date,
      end_date,
      reason,
      status = 'PENDING',
      approved_by,
    } = body;

    const fieldsErr: Record<string, string> = {};
    if (!employee_id) fieldsErr.employee_id = 'Employee is required';
    if (!start_date) fieldsErr.start_date = 'Start date is required';
    if (!end_date) fieldsErr.end_date = 'End date is required';

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

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'End date cannot be before start date.',
            fields: { end_date: 'End date cannot be before start date' },
          },
        },
        { status: 400 }
      );
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.employeeLeave.create({
      data: {
        employeeId: employee_id,
        leaveType: leave_type,
        startDate: start,
        endDate: end,
        totalDays,
        reason: reason || (status === 'APPROVED' ? 'Directly assigned by Admin for date' : ''),
        status,
        approvedBy: approved_by || (status === 'APPROVED' ? 'Admin' : null),
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
