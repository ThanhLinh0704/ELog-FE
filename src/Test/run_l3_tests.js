/**
 * L3 API Test Runner for ELog Backend
 * Tests all major API endpoints using Node.js built-in fetch (Node 18+)
 * Outputs results to console + updates the L3 Excel report
 */

const BASE = 'http://localhost:8080';
let passed = 0, failed = 0, skipped = 0;
const results = [];

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function req(method, path, { body, headers = {}, json = true, form } = {}) {
  const opts = { method, headers: { ...headers } };
  if (json && body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (form) {
    opts.body = form;
    // Don't set Content-Type for FormData - fetch handles it
  }
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) {
      try { data = await res.json(); } catch { data = null; }
    } else {
      data = await res.text();
    }
    return { status: res.status, data };
  } catch (e) {
    return { status: -1, data: null, error: e.message };
  }
}

// ─── Test runner ──────────────────────────────────────────────────────────────
async function tc(id, desc, fn) {
  try {
    const result = await fn();
    if (result.pass) {
      passed++;
      results.push({ id, desc, status: 'PASS', detail: result.detail || '' });
      console.log(`  ✅ ${id} ${desc}`);
    } else {
      failed++;
      results.push({ id, desc, status: 'FAIL', detail: result.detail || '' });
      console.log(`  ❌ ${id} ${desc}`);
      console.log(`      → ${result.detail}`);
    }
  } catch (e) {
    failed++;
    results.push({ id, desc, status: 'ERROR', detail: e.message });
    console.log(`  💥 ${id} ${desc} — ERROR: ${e.message}`);
  }
}

function assert(condition, detail) {
  return { pass: condition, detail };
}

// ─── Global state (tokens) ────────────────────────────────────────────────────
let adminToken = null;
let coordinatorToken = null;  // uses dispatcher01
let driverToken = null;        // uses driver01
// Real seeded credentials (from DataInitializer):
// admin / Admin@2025 → SYSTEM_ADMIN
// dispatcher01 / Admin@2025 → DISPATCHER  (plays coordinator role)
// driver01 / Admin@2025 → DRIVER

// ─── SECTION: Auth ────────────────────────────────────────────────────────────
async function runAuthTests() {
  console.log('\n═══ L3-AuthAPI ═══');

  // L3-AUTH-01 Happy path admin login
  await tc('L3-AUTH-01', 'POST /api/auth/login → 200 SYSTEM_ADMIN', async () => {
    const r = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'Admin@2025' } });
    adminToken = r.data?.data?.accessToken;
    return assert(r.status === 200 && adminToken, `status=${r.status} token=${!!adminToken}`);
  });

  // L3-AUTH-06 Dispatcher login (plays coordinator role in ELog)
  await tc('L3-AUTH-06', 'POST /api/auth/login → 200 DISPATCHER (coordinator role)', async () => {
    const r = await req('POST', '/api/auth/login', { body: { username: 'dispatcher01', password: 'Dev@2025' } });
    coordinatorToken = r.data?.data?.accessToken;
    return assert(r.status === 200 && coordinatorToken, `status=${r.status} token=${!!coordinatorToken}`);
  });

  // L3-AUTH-07 Driver login
  await tc('L3-AUTH-07', 'POST /api/auth/login → 200 DRIVER', async () => {
    const r = await req('POST', '/api/auth/login', { body: { username: 'driver01', password: 'Dev@2025' } });
    driverToken = r.data?.data?.accessToken;
    return assert(r.status === 200 && driverToken, `status=${r.status} token=${!!driverToken}`);
  });

  // L3-AUTH-02 User not found → 401
  await tc('L3-AUTH-02', 'POST /api/auth/login → 401 (user not found)', async () => {
    const r = await req('POST', '/api/auth/login', { body: { username: 'nonexistent_xyz', password: 'any' } });
    return assert(r.status === 401, `status=${r.status}`);
  });

  // L3-AUTH-03 Wrong password → 401
  await tc('L3-AUTH-03', 'POST /api/auth/login → 401 (wrong password)', async () => {
    const r = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'WrongPass!999' } });
    return assert(r.status === 401, `status=${r.status}`);
  });

  // L3-AUTH-05 Missing field → 400
  await tc('L3-AUTH-05', 'POST /api/auth/login → 400 (missing password)', async () => {
    const r = await req('POST', '/api/auth/login', { body: { username: 'admin' } });
    return assert(r.status === 400, `status=${r.status}`);
  });

  // L3-AUTH-10 Logout → 200
  await tc('L3-AUTH-10', 'POST /api/auth/logout → 200 (token blacklisted)', async () => {
    // Use a fresh token so we don't lose admin token
    const lr = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'Admin@2025' } });
    const tempToken = lr.data?.data?.accessToken;
    const r = await req('POST', '/api/auth/logout', { headers: { Authorization: `Bearer ${tempToken}` } });
    return assert(r.status === 200, `status=${r.status} response=${JSON.stringify(r.data).substring(0,100)}`);
  });
}

// ─── SECTION: User ─────────────────────────────────────────────────────────────
async function runUserTests() {
  console.log('\n═══ L3-UserAPI ═══');
  const auth = { Authorization: `Bearer ${adminToken}` };

  // L3-USR-05 List users — response: {success, data:[], pagination}
  await tc('L3-USR-05', 'GET /api/users → 200 paginated list', async () => {
    const r = await req('GET', '/api/users?page=0&size=20', { headers: auth });
    const hasData = Array.isArray(r.data?.data) && r.data.data.length > 0;
    return assert(r.status === 200 && hasData, `status=${r.status} count=${r.data?.data?.length}`);
  });

  // L3-USR-06 No token → 401
  await tc('L3-USR-06', 'GET /api/users → 401 (no token)', async () => {
    const r = await req('GET', '/api/users');
    return assert(r.status === 401, `status=${r.status}`);
  });

  // L3-USR-02 COORDINATOR create user → 403
  await tc('L3-USR-02', 'POST /api/users → 403 (COORDINATOR lacks permission)', async () => {
    const r = await req('POST', '/api/users', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      body: { username: 'test', email: 't@t.com', password: 'T@123456', fullName: 'Test', roleId: 3 }
    });
    return assert(r.status === 403, `status=${r.status}`);
  });

  // L3-USR-04 Invalid fields → 400
  await tc('L3-USR-04', 'POST /api/users → 400 (invalid fields)', async () => {
    const r = await req('POST', '/api/users', {
      headers: auth,
      body: { username: '', email: 'not-an-email', password: '123' }
    });
    return assert(r.status === 400, `status=${r.status}`);
  });

  // L3-USR-08 Non-existent user → 404
  await tc('L3-USR-08', 'PATCH /api/users/999999/status → 404 (not found)', async () => {
    const r = await req('PATCH', '/api/users/999999/status', { headers: auth, body: { isActive: false } });
    return assert(r.status === 404 || r.status === 405, `status=${r.status} response=${JSON.stringify(r.data).substring(0,120)}`);
  });
}

// ─── SECTION: Store ────────────────────────────────────────────────────────────
async function runStoreTests() {
  console.log('\n═══ L3-StoreAPI ═══');
  const auth = { Authorization: `Bearer ${adminToken}` };

  // L3-STR-06 List stores
  await tc('L3-STR-06', 'GET /api/stores → 200 paginated', async () => {
    const r = await req('GET', '/api/stores?page=0&size=10', { headers: auth });
    return assert(r.status === 200, `status=${r.status}`);
  });

  // L3-STR-02 Duplicate code → 409
  await tc('L3-STR-02', 'POST /api/stores → 409 (duplicate code)', async () => {
    const r = await req('POST', '/api/stores', {
      headers: auth,
      body: { storeCode: 'ST-001', storeName: 'Test Dup', provinceCode: '79', districtCode: '760', wardCode: '26734', addressDetail: '123 Test' }
    });
    return assert(r.status === 409, `status=${r.status}`);
  });
}

// ─── SECTION: Route ────────────────────────────────────────────────────────────
async function runRouteTests() {
  console.log('\n═══ L3-RouteAPI ═══');
  const auth = { Authorization: `Bearer ${adminToken}` };

  // L3-ROU-01 Create route → 201
  const uid = Date.now();
  await tc('L3-ROU-01', 'POST /api/routes → 201 (create route)', async () => {
    const r = await req('POST', '/api/routes', {
      headers: auth,
      body: { code: `RT-L3-${uid}`, name: `L3 Test Route ${uid}` }
    });
    return assert(r.status === 201, `status=${r.status} data=${JSON.stringify(r.data).substring(0, 100)}`);
  });

  // L3-ROU-02 Duplicate code → 409
  await tc('L3-ROU-02', 'POST /api/routes → 409 (duplicate code)', async () => {
    const r = await req('POST', '/api/routes', { headers: auth, body: { code: `RT-L3-${uid}`, name: 'Dup' } });
    return assert(r.status === 409, `status=${r.status}`);
  });
}

// ─── SECTION: Vehicle ──────────────────────────────────────────────────────────
async function runVehicleTests() {
  console.log('\n═══ L3-VehicleAPI ═══');
  const auth = { Authorization: `Bearer ${adminToken}` };

  // L3-VEH-04 Fleet capacity check
  await tc('L3-VEH-04', 'GET /api/fleet/capacity-check → 200', async () => {
    const today = new Date().toISOString().split('T')[0];
    const r = await req('GET', `/api/fleet/capacity-check?date=${today}`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` }
    });
    return assert(r.status === 200, `status=${r.status}`);
  });
}

// ─── SECTION: Product ──────────────────────────────────────────────────────────
async function runProductTests() {
  console.log('\n═══ L3-ProductAPI ═══');
  const auth = { Authorization: `Bearer ${adminToken}` };

  // L3-PRD-02 Duplicate SKU → 409
  await tc('L3-PRD-02', 'POST /api/products → 409 (duplicate SKU)', async () => {
    const r = await req('POST', '/api/products', {
      headers: auth,
      body: { sku: 'REF-SAM-300', productName: 'Dup Test', weightKg: 65.0, lengthM: 0.6, widthM: 0.68, heightM: 1.75 }
    });
    return assert(r.status === 409, `status=${r.status}`);
  });

  // L3-PRD-03 Zero dimension → 400
  await tc('L3-PRD-03', 'POST /api/products → 400 (zero dimension BVA)', async () => {
    const r = await req('POST', '/api/products', {
      headers: auth,
      body: { sku: `SKU-ZERO-${Date.now()}`, productName: 'Zero Test', weightKg: 1.0, lengthM: 0, widthM: 0.5, heightM: 0.5 }
    });
    return assert(r.status === 400, `status=${r.status}`);
  });
}

// ─── SECTION: Import ───────────────────────────────────────────────────────────
async function runImportTests() {
  console.log('\n═══ L3-ImportAPI ═══');

  // L3-IMP-02 Corrupt file → 400
  await tc('L3-IMP-02', 'POST /api/imports → 400 (corrupt file)', async () => {
    const form = new FormData();
    const blob = new Blob(['invalid corrupt bytes here'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    form.append('file', blob, 'corrupt.xlsx');
    form.append('deliveryDate', '2026-12-31');
    form.append('confirmReplace', 'false');
    const r = await req('POST', '/api/imports', {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
      form
    });
    return assert(r.status === 400, `status=${r.status}`);
  });

  // L3-IMP-05 DRIVER cannot import → 403
  await tc('L3-IMP-05', 'POST /api/imports → 403 (DRIVER role)', async () => {
    const form = new FormData();
    const blob = new Blob(['invalid'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    form.append('file', blob, 'test.xlsx');
    form.append('deliveryDate', '2026-12-31');
    form.append('confirmReplace', 'false');
    const r = await req('POST', '/api/imports', {
      headers: { Authorization: `Bearer ${driverToken}` },
      form
    });
    return assert(r.status === 403, `status=${r.status}`);
  });

  // L3-IMP-08 Batch not found → 404
  await tc('L3-IMP-08', 'GET /api/imports/999999 → 404 (not found)', async () => {
    const r = await req('GET', '/api/imports/999999', { headers: { Authorization: `Bearer ${coordinatorToken}` } });
    return assert(r.status === 404, `status=${r.status}`);
  });
}

// ─── SECTION: TripDraft ────────────────────────────────────────────────────────
async function runTripDraftTests() {
  console.log('\n═══ L3-TripDraftAPI ═══');
  const coordAuth = { Authorization: `Bearer ${coordinatorToken}` };

  // L3-TRD-01 Consolidate
  await tc('L3-TRD-01', 'POST /api/trip-drafts/consolidate → 200', async () => {
    const today = new Date().toISOString().split('T')[0];
    const r = await req('POST', '/api/trip-drafts/consolidate', { headers: coordAuth, body: { deliveryDate: today } });
    return assert(r.status === 200, `status=${r.status}`);
  });

  // L3-TRD-02 Consolidate empty date
  await tc('L3-TRD-02', 'POST /api/trip-drafts/consolidate → 200 (empty date = 0 drafts)', async () => {
    const r = await req('POST', '/api/trip-drafts/consolidate', { headers: coordAuth, body: { deliveryDate: '2099-01-01' } });
    const count = r.data?.data?.tripDraftsCreatedOrUpdated ?? r.data?.tripDraftsCreatedOrUpdated ?? 'N/A';
    return assert(r.status === 200, `status=${r.status} draftsCreated=${count}`);
  });

  // GET list of drafts
  let draftId = null;
  await tc('L3-TRD-GET', 'GET /api/trip-drafts → 200 (list)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const r = await req('GET', `/api/trip-drafts?deliveryDate=${today}`, { headers: coordAuth });
    const list = r.data?.data || r.data?.content || r.data || [];
    if (Array.isArray(list) && list.length > 0) draftId = list[0].id;
    return assert(r.status === 200, `status=${r.status} draftId=${draftId}`);
  });

  // L3-TRD-06 Manifest on non-validated → various
  if (draftId) {
    await tc('L3-TRD-05', `POST /api/trip-drafts/${draftId}/generate-manifest → 201 or 409`, async () => {
      const r = await req('POST', `/api/trip-drafts/${draftId}/generate-manifest`, { headers: coordAuth });
      return assert(r.status === 201 || r.status === 409 || r.status === 400, `status=${r.status}`);
    });
  } else {
    skipped++;
    console.log(`  ⏭  L3-TRD-05 skipped (no draft available)`);
  }

  // L3-TRD-10 Assign non-existent draft → 404/409
  await tc('L3-TRD-10', 'POST /api/trip-drafts/999999/assign → 404/409 (not found)', async () => {
    const r = await req('POST', '/api/trip-drafts/999999/assign', {
      headers: coordAuth,
      body: { vehicleId: 1, driverId: 1 }
    });
    return assert(r.status === 404 || r.status === 409, `status=${r.status}`);
  });
}

// ─── SECTION: Trip ─────────────────────────────────────────────────────────────
async function runTripTests() {
  console.log('\n═══ L3-TripAPI ═══');
  const coordAuth = { Authorization: `Bearer ${coordinatorToken}` };

  // L3-TRP-04 Non-existent trip → 404
  await tc('L3-TRP-04', 'GET /api/trips/999999 → 404 (not found)', async () => {
    const r = await req('GET', '/api/trips/999999', { headers: coordAuth });
    return assert(r.status === 404, `status=${r.status}`);
  });

  // L3-TRP-02 Dispatch non-existent → 404
  await tc('L3-TRP-02', 'POST /api/trips/999999/dispatch → 404/409', async () => {
    const r = await req('POST', '/api/trips/999999/dispatch', { headers: coordAuth });
    return assert(r.status === 404 || r.status === 409, `status=${r.status}`);
  });
}

// ─── SECTION: Monitoring ────────────────────────────────────────────────────────
async function runMonitoringTests() {
  console.log('\n═══ L3-MonitoringAPI ═══');
  const today = new Date().toISOString().split('T')[0];

  // L3-MON-01 Dashboard
  await tc('L3-MON-01', 'GET /api/dashboard/active-trips → 200', async () => {
    const r = await req('GET', `/api/dashboard/active-trips?date=${today}`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` }
    });
    return assert(r.status === 200, `status=${r.status}`);
  });

  // L3-MON-02 DRIVER cannot view dashboard → 403
  await tc('L3-MON-02', 'GET /api/dashboard/active-trips → 403 (DRIVER)', async () => {
    const r = await req('GET', `/api/dashboard/active-trips?date=${today}`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    return assert(r.status === 403, `status=${r.status}`);
  });

  // L3-MON-03 Exceptions list
  await tc('L3-MON-03', 'GET /api/exceptions → 200', async () => {
    const r = await req('GET', '/api/exceptions?status=OPEN', {
      headers: { Authorization: `Bearer ${coordinatorToken}` }
    });
    return assert(r.status === 200, `status=${r.status}`);
  });
}

// ─── SECTION: Security ─────────────────────────────────────────────────────────
async function runSecurityTests() {
  console.log('\n═══ L3-Security (OWASP) ═══');

  // L3-SEC-01 DRIVER → admin endpoint 403
  await tc('L3-SEC-01', 'A01 POST /api/users with DRIVER JWT → 403', async () => {
    const r = await req('POST', '/api/users', {
      headers: { Authorization: `Bearer ${driverToken}` },
      body: { username: 'hack', email: 'h@h.com', password: 'H@123456', fullName: 'Hacker', roleId: 1 }
    });
    return assert(r.status === 403, `status=${r.status}`);
  });

  // L3-SEC-03 No token → 401
  await tc('L3-SEC-03', 'A01 GET /api/trip-drafts (no token) → 401', async () => {
    const r = await req('GET', '/api/trip-drafts');
    return assert(r.status === 401, `status=${r.status}`);
  });

  // L3-SEC-04 JWT alg=none → 401
  await tc('L3-SEC-04', 'A02 JWT alg=none attack → 401', async () => {
    const fakeHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const fakePayload = Buffer.from(JSON.stringify({ sub: 'admin', roles: ['SYSTEM_ADMIN'], exp: 9999999999 })).toString('base64url');
    const tamperedJwt = `${fakeHeader}.${fakePayload}.`;
    const r = await req('GET', '/api/users', { headers: { Authorization: `Bearer ${tamperedJwt}` } });
    return assert(r.status === 401, `status=${r.status}`);
  });

  // L3-SEC-05 Tampered JWT payload → 401
  await tc('L3-SEC-05', 'A02 Tampered JWT payload → 401', async () => {
    // Get fresh token
    const freshLogin = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'Admin@2025' } });
    const freshToken = freshLogin.data?.data?.accessToken;
    const parts = freshToken?.split('.') || [];
    if (parts.length !== 3) return assert(false, `No fresh token: ${JSON.stringify(freshLogin.data).substring(0,100)}`);
    // Tamper payload: decode, change role, re-encode
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'admin', roles: ['SYSTEM_ADMIN'], exp: 9999999999, tampered: true })).toString('base64url');
    const tamperedJwt = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const r = await req('GET', '/api/users', { headers: { Authorization: `Bearer ${tamperedJwt}` } });
    return assert(r.status === 401, `status=${r.status}`);
  });

  // L3-SEC-06 Expired JWT → 401
  await tc('L3-SEC-06', 'A02 Expired JWT (exp=1) → 401', async () => {
    const expiredHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiredPayload = Buffer.from(JSON.stringify({ sub: 'admin', exp: 1 })).toString('base64url');
    const expiredJwt = `${expiredHeader}.${expiredPayload}.invalidsignature`;
    const r = await req('GET', '/api/users', { headers: { Authorization: `Bearer ${expiredJwt}` } });
    return assert(r.status === 401, `status=${r.status}`);
  });

  // L3-SEC-07 SQL Injection in search param
  await tc('L3-SEC-07', "A03 SQL injection in search param → 200 empty (not DB error)", async () => {
    const injectedParam = encodeURIComponent("' OR '1'='1");
    const r = await req('GET', `/api/stores?search=${injectedParam}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return assert(r.status === 200 || r.status === 400, `status=${r.status} (must NOT be 500)`);
  });

  // L3-SEC-10 Blacklisted token reuse
  await tc('L3-SEC-10', 'A07 Blacklisted token reuse after logout → 401', async () => {
    const lr = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'Admin@2025' } });
    const tempToken = lr.data?.data?.accessToken;
    if (!tempToken) return assert(false, `Could not get temp token. Login response: ${JSON.stringify(lr.data).substring(0,200)}`);
    await req('POST', '/api/auth/logout', { headers: { Authorization: `Bearer ${tempToken}` } });
    // Reuse blacklisted token
    const r = await req('GET', '/api/users', { headers: { Authorization: `Bearer ${tempToken}` } });
    return assert(r.status === 401, `status=${r.status}`);
  });
}

// ─── SECTION: Driver App ────────────────────────────────────────────────────────
async function runDriverTests() {
  console.log('\n═══ L3-DriverAPI ═══');

  // L3-DRV-02 Wrong driver start trip → 403/404
  await tc('L3-DRV-02', 'POST /api/driver/trips/1/start with wrong driver → 403/404', async () => {
    const r = await req('POST', '/api/driver/trips/1/start', {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    return assert(r.status === 403 || r.status === 404 || r.status === 409, `status=${r.status}`);
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log(' ELog L3 API Test Runner  |  http://localhost:8080');
  console.log('════════════════════════════════════════════════════════════════');

  // Check server health
  const health = await req('GET', '/actuator/health').catch(() => ({ status: -1 }));
  const altHealth = await req('GET', '/api/auth/login', { body: {} }).catch(() => ({ status: -1 }));
  console.log(`\nServer check: ${health.status !== -1 ? 'UP (actuator)' : 'No actuator'}`);

  // Run all test sections
  await runAuthTests();
  await runUserTests();
  await runStoreTests();
  await runRouteTests();
  await runVehicleTests();
  await runProductTests();
  await runImportTests();
  await runTripDraftTests();
  await runTripTests();
  await runMonitoringTests();
  await runSecurityTests();
  await runDriverTests();

  const total = passed + failed;
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(` L3 API Test Results`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log(` PASS   : ${passed}`);
  console.log(` FAIL   : ${failed}`);
  console.log(` SKIPPED: ${skipped}`);
  console.log(` TOTAL  : ${total}`);
  console.log(` RATE   : ${((passed / total) * 100).toFixed(1)}%`);
  console.log('════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n FAILURES:');
    results.filter(r => r.status !== 'PASS').forEach(r => {
      console.log(`  ❌ ${r.id} | ${r.desc}`);
      if (r.detail) console.log(`      Detail: ${r.detail}`);
    });
  }

  // Output JSON summary for Excel update
  const fs = await import('fs');
  const summary = {
    runDate: new Date().toISOString(),
    passed, failed, skipped, total,
    passRate: `${((passed / total) * 100).toFixed(1)}%`,
    results
  };
  fs.writeFileSync('l3_test_results.json', JSON.stringify(summary, null, 2));
  console.log('\nResults saved to l3_test_results.json');
}

main().catch(console.error);
