export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface StoredUser extends AuthUser {
  passwordHash: string; // salt:scryptHash
}

export interface UserSession {
  token: string;
  userId: string;
  expiresAt: number; // epoch ms
  createdAt: number; // epoch ms
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}
