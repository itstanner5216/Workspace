import https from 'https';

const options = {
  hostname: '127.0.0.1',
  port: 8787,
  path: '/health',
  method: 'GET',
  headers: {
    'User-Agent': 'TestScript/1.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk.toString();
  });

  res.on('end', () => {
    console.log('Response:', data);
    console.log('Request completed');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
