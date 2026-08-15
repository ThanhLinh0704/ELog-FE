async function run() {
  const loginRes = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@2025' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;

  const res = await fetch('http://localhost:8080/api/kpi/daily-trend?preset=LAST_30_DAYS', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
