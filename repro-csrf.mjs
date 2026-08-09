import appModule from './artifacts/api-server/src/app.ts';
const app = appModule.default?.default ?? appModule.default ?? appModule;
const server = app.listen(0, '127.0.0.1', async () => {
  const address = server.address();
  if (typeof address === 'string' || !address) {
    console.error('failed to bind');
    process.exit(1);
  }
  const url = `http://127.0.0.1:${address.port}`;
  console.log('started', url);
  const res = await fetch(url + '/api/live-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: url,
      'X-Forwarded-Host': '127.0.0.1',
      'x-platform': 'web',
    },
    body: JSON.stringify({ content: 'test' }),
  });
  console.log('status', res.status);
  console.log('headers', Object.fromEntries(res.headers.entries()));
  console.log('body', await res.text());
  server.close();
});
