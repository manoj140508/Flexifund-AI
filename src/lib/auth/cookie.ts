export const SESSION_COOKIE_NAME = 'flexifund_session';
export const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  };
}
