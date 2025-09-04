import { spawn } from 'child_process';
import https from 'https';

// Start the wrangler server
console.log('🚀 Starting Wrangler server...');
const server = spawn('npx', ['wrangler', 'dev', '--local', '--show-interactive-dev-session=false'], {
  stdio: ['inherit', 'pipe', 'pipe']
});

// Wait for server to start
setTimeout(() => {
  console.log('🔍 Testing health endpoint...');

  const options = {
    hostname: '127.0.0.1',
    port: 8787,
    path: '/health',
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk.toString();
    });

    res.on('end', () => {
      console.log('Response:', data);
      server.kill();
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`Request failed: ${e.message}`);
    server.kill();
    process.exit(1);
  });

  req.end();
}, 5000);

// Handle server output
server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Ready on http://127.0.0.1:8787')) {
    console.log('✅ Server is ready!');
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});
