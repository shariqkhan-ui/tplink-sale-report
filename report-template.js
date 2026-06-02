// Shared HTML builder for the daily TP-Link Router Sale report.
// Used by both the preview script and the live cron generator.

const ACCENT = "#E5178F";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

/**
 * metrics shape:
 * {
 *   leadsToday, leadsMTD,
 *   ordersToday, ordersQtyToday, ordersMTD, ordersQtyMTD,
 *   amountToday, amountMTD,
 *   dispatchedToday, dispatchedMTD, pendingDispatch,
 *   deliveredToday, deliveredMTD, pendingDelivery
 * }
 * reportDateLabel: e.g. "01 Jun 2026" (yesterday)
 * monthLabel: e.g. "Jun 2026"
 */
function buildReportHtml(metrics, reportDateLabel, monthLabel) {
  const m = metrics;

  const row = (label, today, mtd, extra = "") => `
    <tr>
      <td class="label">${label}</td>
      <td class="num">${today}${extra ? `<span class="sub">${extra}</span>` : ""}</td>
      <td class="num mtd">${mtd}</td>
    </tr>`;

  const pendingRow = (label, value, tone) => `
    <tr class="pending ${tone}">
      <td class="label">${label}</td>
      <td class="num pending-val" colspan="2">${value}</td>
    </tr>`;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Roboto, Arial, sans-serif; background: #eef0f3; padding: 28px; }
  .card { width: 860px; background: #fff; border-radius: 16px; overflow: hidden;
          box-shadow: 0 8px 28px rgba(0,0,0,.10); margin: 0 auto; }
  .head { background: ${ACCENT}; color: #fff; padding: 22px 28px; }
  .head h1 { font-size: 22px; font-weight: 700; letter-spacing: .2px; }
  .head .sub { font-size: 14px; opacity: .92; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .6px;
             color: #8a8f98; padding: 14px 28px 8px; }
  thead th.num { text-align: right; }
  tbody td { padding: 13px 28px; font-size: 15px; border-top: 1px solid #f0f1f3; }
  td.label { color: #3a3f47; font-weight: 500; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: #1a1a1a; }
  td.num.mtd { color: ${ACCENT}; }
  td.num .sub { display: block; font-size: 11px; font-weight: 500; color: #8a8f98; }
  .section td { background: #fafafa; font-size: 12px; text-transform: uppercase; letter-spacing: .8px;
                color: #b0b4ba; font-weight: 700; padding: 9px 28px; border-top: 1px solid #f0f1f3; }
  tr.pending .label { font-weight: 600; }
  tr.pending .pending-val { color: #fff; text-align: right; border-radius: 0; }
  tr.pending.warn .pending-val { color: #b45309; }
  tr.pending.warn .label { color: #b45309; }
  tr.pending.info .pending-val { color: #0369a1; }
  tr.pending.info .label { color: #0369a1; }
  .foot { padding: 14px 28px; font-size: 12px; color: #9aa0a6; background: #fafafa;
          border-top: 1px solid #f0f1f3; display:flex; justify-content: space-between; }
</style></head>
<body>
  <div class="card">
    <div class="head">
      <h1>TP-Link Routers &mdash; Overall Funnel Status</h1>
      <div class="sub">As of ${reportDateLabel}</div>
    </div>
    <table>
      <thead>
        <tr><th>Metric</th><th class="num">${reportDateLabel}</th><th class="num">MTD (${monthLabel})</th></tr>
      </thead>
      <tbody>
        <tr class="section"><td colspan="3">Funnel</td></tr>
        ${row("Leads created", m.leadsToday, m.leadsMTD)}
        ${row("Orders created", m.ordersToday, m.ordersMTD)}
        ${row("Routers sold", m.ordersQtyToday, m.ordersQtyMTD)}
        ${row("Amount received", inr(m.amountToday), inr(m.amountMTD))}

        <tr class="section"><td colspan="3">Dispatch</td></tr>
        ${row("Orders dispatched", m.dispatchedToday, m.dispatchedMTD)}
        ${pendingRow("Pending for dispatch", m.pendingDispatch, "warn")}

        <tr class="section"><td colspan="3">Delivery</td></tr>
        ${row("Orders delivered", m.deliveredToday, m.deliveredMTD)}
        ${pendingRow("Pending delivery", m.pendingDelivery, "info")}
      </tbody>
    </table>
    <div class="foot">
      <span>Wiom &middot; TP-Link Routers Sale Portal</span>
      <span>Auto-generated daily at 9:00 AM IST</span>
    </div>
  </div>
</body></html>`;
}

module.exports = { buildReportHtml, inr };
