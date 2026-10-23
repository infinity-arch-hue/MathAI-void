import { NextRequest, NextResponse } from 'next/server';
import {
  findUserByEmailOrId,
  registerUser,
  updateUserQualification,
  updateStudentClassId,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
      const { identifier, password } = body;
      if (!identifier || !password) {
        return NextResponse.json({ error: 'Identifier (email or ID) and password are required' }, { status: 400 });
      }

      const user = findUserByEmailOrId(identifier);
      if (!user) {
        return NextResponse.json({ error: 'User not found with this email or ID' }, { status: 404 });
      }

      if (user.passwordHash && user.passwordHash !== password) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      const { passwordHash: _, ...safeUser } = user;
      return NextResponse.json({ success: true, user: safeUser });
    }

    if (action === 'register') {
      const {
        name,
        age,
        email,
        password,
        confirmPassword,
        role,
        educationLevel,
        standard,
        classId,
      } = body;

      if (!name || !email || !password || !confirmPassword || !role) {
        return NextResponse.json({ error: 'All registration credentials are required' }, { status: 400 });
      }

      if (password !== confirmPassword) {
        return NextResponse.json({ error: 'Password and confirmation password do not match' }, { status: 400 });
      }

      if (role === 'student' && !educationLevel) {
        return NextResponse.json({ error: 'Please specify School or College for student account' }, { status: 400 });
      }

      if (role === 'student' && educationLevel === 'school' && (!standard || standard < 1 || standard > 12)) {
        return NextResponse.json({ error: 'School students must select a standard from 1 to 12' }, { status: 400 });
      }

      const res = registerUser({
        name,
        age: Number(age) || 16,
        email,
        password,
        role,
        educationLevel: role === 'student' ? educationLevel : 'none',
        standard: role === 'student' && educationLevel === 'school' ? Number(standard) : undefined,
        classId: role === 'student' ? classId : undefined,
      });

      if (!res.success || !res.user) {
        return NextResponse.json({ error: res.error || 'Failed to register' }, { status: 400 });
      }

      const { passwordHash: _, ...safeUser } = res.user;
      return NextResponse.json({ success: true, user: safeUser });
    }

    if (action === 'update-qualification') {
      const { userId, password, educationLevel, standard } = body;
      if (!userId || !password || !educationLevel) {
        return NextResponse.json({ error: 'User ID, password, and qualification are required' }, { status: 400 });
      }

      const res = updateUserQualification(userId, password, {
        educationLevel,
        standard: educationLevel === 'school' ? Number(standard) : undefined,
      });

      if (!res.success || !res.user) {
        return NextResponse.json({ error: res.error || 'Failed to update qualification' }, { status: 400 });
      }

      const { passwordHash: _, ...safeUser } = res.user;
      return NextResponse.json({ success: true, user: safeUser });
    }

    if (action === 'join-class') {
      const { userId, classId } = body;
      if (!userId || !classId) {
        return NextResponse.json({ error: 'User ID and Class ID are required' }, { status: 400 });
      }

      const res = updateStudentClassId(userId, classId);
      if (!res.success || !res.user) {
        return NextResponse.json({ error: res.error || 'Failed to join class' }, { status: 400 });
      }

      const { passwordHash: _, ...safeUser } = res.user;
      return NextResponse.json({ success: true, user: safeUser });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
