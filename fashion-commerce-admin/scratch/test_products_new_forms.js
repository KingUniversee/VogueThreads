async function check() {
  const base = 'http://localhost:3000';
  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@voguethreads.in', password: 'admin@123' })
  });
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];
  const res = await fetch(base + '/products/new', {
    headers: { Cookie: cookie }
  });
  console.log('/products/new status:', res.status);
  const html = await res.text();
  console.log('HTML contains "Color × Size Variant Matrix":', html.includes('Color × Size Variant Matrix'));
  const formCount = (html.match(/<form/gi) || []).length;
  console.log('Total <form> tags in /products/new rendered HTML:', formCount);
}
check().catch(console.error);
