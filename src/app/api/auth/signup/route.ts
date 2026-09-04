import { NextRequest, NextResponse } from 'next/server';
import { createUser, createSession } from '@/lib/auth/store';
import { hashPassword } from '@/lib/auth/password';
import { getSessionCookieOptions } from '@/lib/auth/cookie';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please enter your full name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match. Please try again.' },
        { status: 400 }
      );
    }

    // Hash password & store user
    const passwordHash = hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    // Create session
    const session = await createSession(user.id);

    // Build response with session cookie
    const response = NextResponse.json({
      success: true,
      user,
    });

    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, session.token, cookieOpts);

    return response;
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err.message || 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
