/**
 * The free-tier dashboard, served as a single self-contained HTML string. Kept
 * as a TS module (not a .html file) so it ships intact through `tsc` with no
 * asset-copy build step. Vanilla JS — no framework, no external requests.
 */
export const DASHBOARD_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spend Sentinel</title>
<style>
  :root {
    --bg: #0f172a; --card: #1e293b; --fg: #e2e8f0; --muted: #94a3b8;
    --accent: #38bdf8; --warn: #fbbf24; --danger: #f87171; --ok: #34d399;
    --border: #334155;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f8fafc; --card:#fff; --fg:#0f172a; --muted:#64748b; --border:#e2e8f0; }
  }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         background: var(--bg); color: var(--fg); }
  header { padding: 20px 24px; border-bottom: 1px solid var(--border); display:flex; align-items:baseline; gap:12px; }
  header h1 { font-size: 20px; margin:0; }
  header .tag { color: var(--muted); font-size: 13px; }
  main { max-width: 1000px; margin: 0 auto; padding: 24px; }
  .kpis { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:24px; }
  .card { background: var(--card); border:1px solid var(--border); border-radius:12px; padding:18px; }
  .kpi .label { color: var(--muted); font-size: 13px; }
  .kpi .value { font-size: 26px; font-weight: 650; margin-top:6px; }
  h2 { font-size: 15px; color: var(--muted); text-transform: uppercase; letter-spacing:.04em; margin: 24px 0 12px; }
  table { width:100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align:left; padding: 10px 12px; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 600; }
  .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; }
  .pill.overdue { background: color-mix(in srgb, var(--danger) 25%, transparent); color: var(--danger); }
  .pill.soon { background: color-mix(in srgb, var(--warn) 25%, transparent); color: var(--warn); }
  .pill.ok { background: color-mix(in srgb, var(--ok) 22%, transparent); color: var(--ok); }
  .empty { color: var(--muted); padding: 16px 0; }
  .err { color: var(--danger); }
</style>
</head>
<body>
<header>
  <h1>🛡️ Spend Sentinel</h1>
  <span class="tag">Free tier · local dashboard</span>
</header>
<main>
  <div class="kpis" id="kpis"></div>
  <h2>Upcoming renewals (next 30 days)</h2>
  <div class="card"><table id="renewals"><tbody></tbody></table><div class="empty" id="renewals-empty" hidden>No renewals in the next 30 days ✅</div></div>
  <h2>All subscriptions</h2>
  <div class="card"><table id="subs"><thead><tr>
    <th>Vendor</th><th>Plan</th><th>Cost</th><th>Monthly</th><th>Cycle</th><th>Dept</th><th>Status</th><th>Renews</th>
  </tr></thead><tbody></tbody></table><div class="empty" id="subs-empty" hidden>No subscriptions yet.</div></div>
</main>
<script>
const $ = (s) => document.querySelector(s);
// Escape ALL dynamic values before interpolation — vendor/plan/department are
// user-controlled, so raw insertion would be a stored-XSS sink.
function esc(v){ return String(v).replace(/[&<>"']/g, (c) => (
  { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
)); }
async function j(url){ const r = await fetch(url); if(!r.ok) throw new Error(url+' -> '+r.status); return r.json(); }
function kpi(label, value){ return '<div class="card kpi"><div class="label">'+esc(label)+'</div><div class="value">'+esc(value)+'</div></div>'; }
function renewalPill(r){
  if(r.overdue) return '<span class="pill overdue">Overdue '+esc(-r.daysUntil)+'d</span>';
  if(r.daysUntil<=7) return '<span class="pill soon">'+esc(r.daysUntil)+'d</span>';
  return '<span class="pill ok">'+esc(r.daysUntil)+'d</span>';
}
async function load(){
  try{
    const [sum, subs, ren] = await Promise.all([ j('/api/dashboard'), j('/api/subscriptions'), j('/api/renewals?within=30') ]);
    $('#kpis').innerHTML =
      kpi('Monthly run-rate', sum.totalMonthly.formatted) +
      kpi('Annual run-rate', sum.totalAnnual.formatted) +
      kpi('Active', sum.activeCount) +
      kpi('Renewals ≤30d', ren.length);

    const rb = $('#renewals tbody'); rb.innerHTML='';
    $('#renewals-empty').hidden = ren.length>0;
    for(const r of ren){ const s=r.subscription;
      rb.insertAdjacentHTML('beforeend','<tr><td>'+esc(s.vendor)+'</td><td>'+esc(s.cost.formatted)+'</td><td>'+esc(s.renewalDate)+'</td><td>'+renewalPill(r)+'</td><td>'+(s.autoRenew?'auto':'manual')+'</td></tr>');
    }
    if(ren.length){ rb.insertAdjacentHTML('afterbegin','<tr><th>Vendor</th><th>Cost</th><th>Renews</th><th>In</th><th>Mode</th></tr>'); }

    const tb = $('#subs tbody'); tb.innerHTML='';
    $('#subs-empty').hidden = subs.length>0;
    for(const s of subs){
      tb.insertAdjacentHTML('beforeend','<tr><td>'+esc(s.vendor)+'</td><td>'+esc(s.plan||'—')+'</td><td>'+esc(s.cost.formatted)+'</td><td>'+esc(s.monthlyEquivalent.formatted)+'</td><td>'+esc(s.billingCycle)+'</td><td>'+esc(s.department||'—')+'</td><td>'+esc(s.status)+'</td><td>'+esc(s.renewalDate)+'</td></tr>');
    }
  }catch(e){ $('#kpis').innerHTML = '<div class="card err">Failed to load: '+esc(e.message)+'</div>'; }
}
load();
</script>
</body>
</html>`;
