import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        role: true,
        leaves: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Employee not found' } },
        { status: 404 }
      );
    }

    const totalApprovedDays = employee.leaves
      .filter((l) => l.status === 'APPROVED')
      .reduce((sum, l) => sum + l.totalDays, 0);

    const totalPendingDays = employee.leaves
      .filter((l) => l.status === 'PENDING')
      .reduce((sum, l) => sum + l.totalDays, 0);

    return NextResponse.json({
      employee_id: employee.id,
      employee_name: employee.name,
      emp_code: employee.empCode,
      summary: {
        casual_allowance: 12,
        sick_allowance: 8,
        approved_days: totalApprovedDays,
        pending_days: totalPendingDays,
      },
      leaves: employee.leaves.map((l) => ({
        id: l.id,
        leave_type: l.leaveType,
        start_date: l.startDate.toISOString().split('T')[0],
        end_date: l.endDate.toISOString().split('T')[0],
        total_days: l.totalDays,
        reason: l.reason,
        status: l.status,
        created_at: l.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
