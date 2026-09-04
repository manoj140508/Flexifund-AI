import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken } from '@/lib/auth/password';
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
