import { NextRequest, NextResponse } from 'next/server';
import { getStudentReviewData } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const reviewData = getStudentReviewData(studentId);

    return NextResponse.json({
      success: true,
      review: reviewData,
    });
  } catch (error: any) {
    console.error('Error fetching student review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch student review data' },
      { status: 500 }
    );
  }
}
