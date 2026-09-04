import fs from 'fs/promises';
import path from 'path';
import { StoredUser, AuthUser, UserSession } from '@/domain/auth';
import { generateSessionToken } from './password';

interface AuthDatabaseSchema {
  users: StoredUser[];
  sessions: UserSession[];
}

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'auth-store.json');
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let isInitialized = false;

async function ensureStore(): Promise<void> {
  if (isInitialized) return;

  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      // Create empty database file if it does not exist
      const initialData: AuthDatabaseSchema = { users: [], sessions: [] };
      await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    }
    isInitialized = true;
  } catch (err) {
    console.error('Failed to initialize auth store directory:', err);
  }
}

async function readStore(): Promise<AuthDatabaseSchema> {
  await ensureStore();
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { users: [], sessions: [] };
  }
}

async function writeStore(data: AuthDatabaseSchema): Promise<void> {
  await ensureStore();
  const tmpFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmpFile, DB_FILE);
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const data = await readStore();
  const normalized = email.trim().toLowerCase();
  const user = data.users.find((u) => u.email.toLowerCase() === normalized);
  return user || null;
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  const data = await readStore();
  const user = data.users.find((u) => u.id === id);
  return user || null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<AuthUser> {
  const data = await readStore();
  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = data.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const newUser: StoredUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };

  data.users.push(newUser);
  await writeStore(data);

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    createdAt: newUser.createdAt,
  };
}

export async function createSession(userId: string): Promise<UserSession> {
  const data = await readStore();
  const now = Date.now();

  const newSession: UserSession = {
    token: generateSessionToken(),
    userId,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  // Keep active sessions and prune expired
  data.sessions = data.sessions.filter((s) => s.expiresAt > now);
  data.sessions.push(newSession);
  await writeStore(data);

  return newSession;
}

export async function getSession(token: string): Promise<UserSession | null> {
  if (!token) return null;
  const data = await readStore();
  const now = Date.now();

  const session = data.sessions.find((s) => s.token === token && s.expiresAt > now);
  return session || null;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const data = await readStore();
  data.sessions = data.sessions.filter((s) => s.token !== token);
  await writeStore(data);
}
