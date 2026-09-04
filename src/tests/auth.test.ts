import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken } from '@/lib/auth/password';

// Hoist mock state so it is accessible inside vi.mock factory
const { mockUsers, mockSessions } = vi.hoisted(() => ({
  mockUsers: [] as any[],
  mockSessions: [] as any[],
}));

  vi.mock('@/lib/db', () => ({
    query: vi.fn(async (sql: string, params: any[] = []) => {
      const normalizedSql = sql.replace(/\s+/g, ' ');

      if (normalizedSql.includes('INSERT INTO users')) {
        const [id, fullName, email, passwordHash, createdAt] = params;
        const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          const err: any = new Error('duplicate key value violates unique constraint');
          err.code = '23505';
          throw err;
        }
        const user = { id, full_name: fullName, email, password_hash: passwordHash, created_at: createdAt };
        mockUsers.push(user);
        return { rows: [user] };
      }

      if (normalizedSql.includes('FROM users') && normalizedSql.includes('LOWER(email) = LOWER($1)')) {
        const email = params[0];
        const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        return { rows: user ? [user] : [] };
      }

      if (normalizedSql.includes('FROM users') && normalizedSql.includes('WHERE id = $1')) {
        const id = params[0];
        const user = mockUsers.find((u) => u.id === id);
        return { rows: user ? [user] : [] };
      }

      if (normalizedSql.includes('INSERT INTO sessions')) {
        const [token, userId, expiresAt, createdAt] = params;
        const session = { token, user_id: userId, expires_at: expiresAt, created_at: createdAt };
        mockSessions.push(session);
        return { rows: [session] };
      }

      if (normalizedSql.toUpperCase().startsWith('DELETE FROM SESSIONS')) {
        const token = params[0];
        const idx = mockSessions.findIndex((s) => s.token === token);
        if (idx >= 0) mockSessions.splice(idx, 1);
        return { rows: [] };
      }

      if (normalizedSql.toUpperCase().includes('SELECT TOKEN') && normalizedSql.toUpperCase().includes('FROM SESSIONS')) {
        const token = params[0];
        const now = Date.now();
        const session = mockSessions.find((s) => s.token === token && new Date(s.expires_at).getTime() > now);
        return { rows: session ? [session] : [] };
      }

      return { rows: [] };
    }),
    ensureSchema: vi.fn(async () => {}),
  }));

import {
  createUser,
  getUserByEmail,
  getUserById,
  createSession,
  getSession,
  deleteSession,
} from '@/lib/auth/store';

describe('Authentication & Password Security', () => {
  it('hashes passwords with a unique salt each time', () => {
    const password = 'mySecretPassword123';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    expect(hash1).not.toBe(password);
    expect(hash1).not.toBe(hash2); // Different salts
    expect(hash1.split(':')).toHaveLength(2);
  });

  it('verifies passwords correctly with scrypt and timing-safe comparison', () => {
    const password = 'DeliveryWorkerPass@2026';
    const storedHash = hashPassword(password);

    expect(verifyPassword(password, storedHash)).toBe(true);
    expect(verifyPassword('wrongPassword', storedHash)).toBe(false);
    expect(verifyPassword('', storedHash)).toBe(false);
    expect(verifyPassword(password, 'invalid-hash')).toBe(false);
  });

  it('generates random secure session tokens', () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    expect(token1).toHaveLength(64); // 32 bytes hex
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });
});

describe('Persistent Auth Store Operations', () => {
  const testEmail = `tester_${Date.now()}@example.com`;
  let createdUserId = '';

  it('creates an account and retrieves it by email and ID', async () => {
    const passwordHash = hashPassword('TestAccount@123');
    const user = await createUser({
      name: 'Ravi Kumar',
      email: testEmail,
      passwordHash,
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Ravi Kumar');
    expect(user.email).toBe(testEmail.toLowerCase());
    createdUserId = user.id;

    // Retrieve by email
    const fetchedByEmail = await getUserByEmail(testEmail);
    expect(fetchedByEmail).not.toBeNull();
    expect(fetchedByEmail?.id).toBe(user.id);
    expect(verifyPassword('TestAccount@123', fetchedByEmail!.passwordHash)).toBe(true);

    // Retrieve by ID
    const fetchedById = await getUserById(user.id);
    expect(fetchedById).not.toBeNull();
    expect(fetchedById?.email).toBe(testEmail.toLowerCase());
  });

  it('rejects duplicate email registrations', async () => {
    await expect(
      createUser({
        name: 'Another User',
        email: testEmail,
        passwordHash: hashPassword('anyPass123'),
      })
    ).rejects.toThrow('already exists');
  });

  it('creates, verifies, and terminates user sessions', async () => {
    const session = await createSession(createdUserId);
    expect(session.token).toBeDefined();
    expect(session.userId).toBe(createdUserId);
    expect(session.expiresAt).toBeGreaterThan(Date.now());

    // Look up session
    const activeSession = await getSession(session.token);
    expect(activeSession).not.toBeNull();
    expect(activeSession?.userId).toBe(createdUserId);

    // Terminate session (Logout)
    await deleteSession(session.token);
    const terminatedSession = await getSession(session.token);
    expect(terminatedSession).toBeNull();
  });
});
