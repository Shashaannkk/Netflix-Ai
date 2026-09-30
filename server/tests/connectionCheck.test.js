import http from 'http';

const checkEndpoint = (url) => {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ status: 0, error: 'Request timeout' });
    });
  });
};

const runDiagnostic = async () => {
  console.log('======================================================');
  console.log('🔍 RUNNING COMPREHENSIVE BACKEND DIAGNOSTIC TEST');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  // 1. Health Check Endpoint
  const healthRes = await checkEndpoint('http://localhost:5000/api/health');
  if (healthRes.status === 200 && healthRes.body?.success === true) {
    assert(true, 'HTTP API /api/health is reachable and returning 200 OK');
    console.log(`     DB Status reported: ${healthRes.body?.data?.database?.status}`);
  } else {
    assert(false, 'HTTP API /api/health is reachable', healthRes.error || `HTTP ${healthRes.status}`);
  }

  // 2. Root GET Endpoint
  const rootRes = await checkEndpoint('http://localhost:5000/');
  if (rootRes.status === 200 && rootRes.body?.status === 'online') {
    assert(true, 'Root GET / returns server status: online');
  } else {
    assert(false, 'Root GET / is reachable', rootRes.error || `HTTP ${rootRes.status}`);
  }

  // 3. Socket.IO Handshake Endpoint
  const socketRes = await checkEndpoint('http://localhost:5000/socket.io/?EIO=4&transport=polling');
  if (socketRes.status === 200 && typeof socketRes.body === 'string' && socketRes.body.includes('sid')) {
    assert(true, 'Socket.IO HTTP Handshake endpoint responded successfully');
  } else {
    assert(false, 'Socket.IO HTTP Handshake endpoint', socketRes.error || `HTTP ${socketRes.status}`);
  }

  console.log('\n======================================================');
  console.log(`📊 DIAGNOSTIC RESULTS: ${passed} Passed | ${failed} Failed`);
  console.log('======================================================');

  process.exit(failed > 0 ? 1 : 0);
};

runDiagnostic();
