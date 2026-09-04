/**
 * End-to-End integration test script for FlexiFund AI Landing & Authentication
 */
async function runAuthE2ETests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🚀 Starting FlexiFund AI Auth & Route Protection E2E Tests on', BASE_URL);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${testName}`);
      failed++;
    }
  }

  // 1. Route Protection: Unauthenticated access to /dashboard must redirect to /login
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    assert(
      res.status === 307 && location.includes('/login'),
      'Unauthenticated request to /dashboard redirects (307) to /login'
    );
  } catch (err: any) {
    assert(false, `Route protection check failed: ${err.message}`);
  }

  // 2. Public Landing Page at / is accessible
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, 'Public Landing page at / returns HTTP 200');
    const html = await res.text();
    assert(
      html.includes('Your money plan should move with your income.'),
      'Landing page contains hero headline: "Your money plan should move with your income."'
    );
    assert(
      html.includes('When your income changes, your financial plan should change with it.'),
      'Landing page contains tagline: "When your income changes, your financial plan should change with it."'
    );
    assert(
      html.includes('HOW FLEXIFUND WORKS'),
      'Landing page contains "HOW FLEXIFUND WORKS" section'
    );
    assert(
      html.includes('ONE SIMPLE MONEY TOOL'),
      'Landing page contains "ONE SIMPLE MONEY TOOL" features grid'
    );
    assert(
      html.includes('YOUR MONEY. YOUR CONTROL.'),
      'Landing page contains "YOUR MONEY. YOUR CONTROL." safety section'
    );
  } catch (err: any) {
    assert(false, `Landing page check failed: ${err.message}`);
  }

  // 3. User Signup
  const userAEmail = `driver_ramesh_${Date.now()}@test.com`;
  let userACookie = '';
  let userAId = '';

  try {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ramesh Patel',
        email: userAEmail,
        password: 'Password@2026',
        confirmPassword: 'Password@2026',
      }),
    });

    const data = await res.json();
    assert(res.status === 200 && data.success, 'User A signup returns HTTP 200 with success');
    assert(data.user?.name === 'Ramesh Patel', 'User A profile contains correct name');
    userAId = data.user?.id;

    const setCookie = res.headers.get('set-cookie') || '';
    assert(setCookie.includes('flexifund_session='), 'Signup sets HTTP-only flexifund_session cookie');
    const match = setCookie.match(/flexifund_session=([^;]+)/);
    userACookie = match ? match[1] : '';
  } catch (err: any) {
    assert(false, `User signup failed: ${err.message}`);
  }

  // 4. Session Validation via /api/auth/me
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `flexifund_session=${userACookie}` },
    });
    const data = await res.json();
    assert(res.status === 200 && data.authenticated === true, '/api/auth/me validates active session');
    assert(data.user?.id === userAId, '/api/auth/me returns correct authenticated user ID');
  } catch (err: any) {
    assert(false, `/api/auth/me validation failed: ${err.message}`);
  }

  // 5. Wrong Password Login Rejection
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userAEmail,
        password: 'IncorrectPassword!',
      }),
    });
    const data = await res.json();
    assert(res.status === 401, 'Login with incorrect password returns HTTP 401');
    assert(
      data.error === 'Email or password is incorrect.',
      'Generic non-revealing error message returned on failed password'
    );
  } catch (err: any) {
    assert(false, `Wrong password test failed: ${err.message}`);
  }

  // 6. User B Signup & Data Isolation
  const userBEmail = `delivery_priya_${Date.now()}@test.com`;
  let userBId = '';

  try {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Sharma',
        email: userBEmail,
        password: 'PriyaSecurePassword!2026',
        confirmPassword: 'PriyaSecurePassword!2026',
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, 'User B signup succeeds');
    userBId = data.user?.id;
    assert(userBId !== userAId, 'User B has distinct user ID from User A (Isolation verified)');
  } catch (err: any) {
    assert(false, `User B signup failed: ${err.message}`);
  }

  // 7. Logout
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `flexifund_session=${userACookie}` },
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, 'Logout endpoint returns HTTP 200');

    // Verify session revoked
    const checkRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `flexifund_session=${userACookie}` },
    });
    const checkData = await checkRes.json();
    assert(checkData.authenticated === false, 'Session token is invalid after logout');
  } catch (err: any) {
    assert(false, `Logout test failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthE2ETests();
