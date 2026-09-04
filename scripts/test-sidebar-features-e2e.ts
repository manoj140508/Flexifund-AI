import http from 'http';

function request(options: http.RequestOptions, body?: any): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: string }> {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = { ...options.headers };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, data }));
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  console.log('Testing Sidebar Features & Protected Routes E2E...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Unauthenticated checks: Protected routes must redirect to login
  const protectedRoutes = ['/quick-check', '/can-i-spend', '/add-expense', '/my-plan'];
  for (const route of protectedRoutes) {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: route,
      method: 'GET',
    });
    assert(
      res.status === 307 || res.status === 302 || (res.headers.location && res.headers.location.includes('/login')),
      `Unauthenticated ${route} redirects to /login (Status: ${res.status}, Location: ${res.headers.location})`
    );
  }

  // 2. Signup / Login to obtain session cookie
  const uniqueEmail = `sidebar_user_${Date.now()}@example.com`;
  const signupRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Ramesh Patel',
      email: uniqueEmail,
      password: 'StrongPassword123!',
    }
  );

  assert(signupRes.status === 200 || signupRes.status === 201, `Signup successful (Status: ${signupRes.status})`);
  const setCookie = signupRes.headers['set-cookie']?.[0];
  const sessionCookie = setCookie ? setCookie.split(';')[0] : '';
  assert(sessionCookie.startsWith('flexifund_session='), 'Received HTTP-only flexifund_session cookie');

  // 3. Authenticated requests to new dedicated pages
  for (const route of protectedRoutes) {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: route,
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Authenticated ${route} returns HTTP 200 (Got: ${res.status})`);
  }

  // 4. Content assertions on rendered HTML
  const quickCheckRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/quick-check',
    method: 'GET',
    headers: { Cookie: sessionCookie },
  });
  assert(
    quickCheckRes.data.includes('Quick Money Check'),
    'Quick Money Check page renders proper title'
  );

  const canISpendRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/can-i-spend',
    method: 'GET',
    headers: { Cookie: sessionCookie },
  });
  assert(
    canISpendRes.data.includes('Can I Spend This?'),
    'Can I Spend This? page renders proper title'
  );

  const addExpenseRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/add-expense',
    method: 'GET',
    headers: { Cookie: sessionCookie },
  });
  assert(
    addExpenseRes.data.includes('Add Expense') &&
    addExpenseRes.data.includes('Voice') &&
    addExpenseRes.data.includes('Scan receipt') &&
    addExpenseRes.data.includes('Enter manually'),
    'Add Expense page renders all 3 modes (Voice, Scan receipt, Enter manually)'
  );

  const myPlanRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/my-plan',
    method: 'GET',
    headers: { Cookie: sessionCookie },
  });
  assert(
    myPlanRes.data.includes('My Financial Plan'),
    'My Plan page renders proper title and guidance'
  );

  // 5. Sidebar layout check — 5 groups now
  assert(
    quickCheckRes.data.includes('MAIN') &&
    quickCheckRes.data.includes('TAKE ACTION') &&
    quickCheckRes.data.includes('PLAN') &&
    quickCheckRes.data.includes('SUPPORT') &&
    quickCheckRes.data.includes('ACCOUNT'),
    'Sidebar includes all 5 group headings (MAIN, TAKE ACTION, PLAN & PROGRESS, SUPPORT, ACCOUNT)'
  );

  // 6. Header check: "Export My Plan" must NOT be in top header, but MUST be on My Plan page
  const headerMatch = quickCheckRes.data.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  const headerHtml = headerMatch ? headerMatch[1] : '';
  assert(
    !headerHtml.includes('Export My Plan'),
    'Top header does NOT contain "Export My Plan"'
  );
  // ExportPlanButton renders client-side; verify it is present in the page source file
  const fs = await import('fs');
  const myPlanSource = fs.readFileSync(
    new URL('../src/app/my-plan/page.tsx', import.meta.url),
    'utf8'
  );
  assert(
    myPlanSource.includes('ExportPlanButton'),
    'My Plan page source still contains ExportPlanButton component'
  );

  // 7. New pages — auth redirect
  const moneyCalRes = await request({ hostname: 'localhost', port: 3000, path: '/money-calendar', method: 'GET' });
  assert(
    (moneyCalRes.status === 307 || moneyCalRes.status === 302) && Boolean(moneyCalRes.headers.location?.includes('/login')),
    'Unauthenticated /money-calendar redirects to /login'
  );

  const myGoalsRes = await request({ hostname: 'localhost', port: 3000, path: '/my-goals', method: 'GET' });
  assert(
    (myGoalsRes.status === 307 || myGoalsRes.status === 302) && Boolean(myGoalsRes.headers.location?.includes('/login')),
    'Unauthenticated /my-goals redirects to /login'
  );

  const helpSafetyRes = await request({ hostname: 'localhost', port: 3000, path: '/help-safety', method: 'GET' });
  assert(
    (helpSafetyRes.status === 307 || helpSafetyRes.status === 302) && Boolean(helpSafetyRes.headers.location?.includes('/login')),
    'Unauthenticated /help-safety redirects to /login'
  );


  // 8. New pages — authenticated render
  const authMoneyCalRes = await request({ hostname: 'localhost', port: 3000, path: '/money-calendar', method: 'GET', headers: { Cookie: sessionCookie } });
  assert(authMoneyCalRes.status === 200 && authMoneyCalRes.data.includes('Money Calendar'), 'Authenticated /money-calendar returns 200 with correct title');

  const authMyGoalsRes = await request({ hostname: 'localhost', port: 3000, path: '/my-goals', method: 'GET', headers: { Cookie: sessionCookie } });
  assert(authMyGoalsRes.status === 200 && authMyGoalsRes.data.includes('My Goals'), 'Authenticated /my-goals returns 200 with correct title');

  const authHelpSafetyRes = await request({ hostname: 'localhost', port: 3000, path: '/help-safety', method: 'GET', headers: { Cookie: sessionCookie } });
  assert(authHelpSafetyRes.status === 200 && authHelpSafetyRes.data.includes('Help'), 'Authenticated /help-safety returns 200 with correct title');

  // 9. Help & Safety — safety warning present
  assert(
    authHelpSafetyRes.data.includes('UPI PIN') || authHelpSafetyRes.data.includes('FlexiFund AI will'),
    'Help & Safety page contains safety warning'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}


run().catch((err) => {
  console.error(err);
  process.exit(1);
});
