import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const jobId = `job_${Math.random().toString(36).substring(2, 8)}`;
    return NextResponse.json(
      {
        job_id: jobId,
        status_url: `/api/v1/jobs/${jobId}`,
        message: 'Bulk employee import job created asynchronously',
      },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
