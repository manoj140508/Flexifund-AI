import { StoredUser, AuthUser, UserSession } from '@/domain/auth';
import { generateSessionToken } from './password';
import { query } from '@/lib/db';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const normalized = email.trim().toLowerCase();
  const res = await query(
    `SELECT id, full_name, email, password_hash, created_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [normalized]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  const res = await query(
    `SELECT id, full_name, email, password_hash, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<AuthUser> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();

  try {
    const res = await query(
      `INSERT INTO users (id, full_name, email, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, created_at`,
      [id, input.name.trim(), normalizedEmail, input.passwordHash, now]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.full_name,
      email: row.email,
      createdAt: new Date(row.created_at).toISOString(),
    };
  } catch (err: any) {
    if (
      err.code === '23505' ||
      err.message?.includes('duplicate key') ||
      err.message?.includes('unique constraint') ||
      err.message?.includes('already exists')
    ) {
      throw new Error('An account with this email already exists.');
    }
    throw err;
  }
}

export async function createSession(userId: string): Promise<UserSession> {
  const token = generateSessionToken();
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  await query(
    `INSERT INTO sessions (token, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [token, userId, new Date(expiresAt), new Date(now)]
  );

  return {
    token,
    userId,
    createdAt: now,
    expiresAt,
  };
}

export async function getSession(token: string): Promise<UserSession | null> {
  if (!token) return null;

  const res = await query(
    `SELECT token, user_id, expires_at, created_at
     FROM sessions
     WHERE token = $1 AND expires_at > NOW()
     LIMIT 1`,
    [token]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  return {
    token: row.token,
    userId: row.user_id,
    createdAt: new Date(row.created_at).getTime(),
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await query(`DELETE FROM sessions WHERE token = $1`, [token]);
}
