const ngrok = require('ngrok');

(async () => {
  try {
    const url = await ngrok.connect({
      proto: 'http',
      addr: 5173,
      // bind_tls: true,  // Force HTTPS
    });
    console.log(`\n✓ Tunnel ready: ${url}\n`);
    console.log(`Frontend: ${url}`);
    console.log(`Backend proxy: ${url}/api (if needed)\n`);
    console.log('Open on phone: ' + url);
    console.log('\nPress Ctrl+C to stop.\n');
  } catch (err) {
    console.error('ngrok failed:', err);
    process.exit(1);
  }
})();
