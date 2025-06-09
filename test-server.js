import http from 'http';

function testConnection(port) {
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Port ${port}: Status ${res.statusCode}`);
    res.on('data', (data) => {
      console.log(`✅ Port ${port}: Received data (${data.length} bytes)`);
    });
  });

  req.on('error', (err) => {
    console.log(`❌ Port ${port}: ${err.message}`);
  });

  req.setTimeout(5000, () => {
    console.log(`⏰ Port ${port}: Request timeout`);
    req.destroy();
  });

  req.end();
}

console.log('Testing server connectivity...');
testConnection(8888);
testConnection(9999);

setTimeout(() => {
  console.log('Test completed');
  process.exit(0);
}, 6000);