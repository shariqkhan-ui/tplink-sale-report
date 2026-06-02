// Daily TP-Link Router "Overall Funnel Status" report.
// Pulls live metrics from Supabase, renders the HTML, screenshots it, and posts
// the image to Slack. Runs at 9 AM IST via GitHub Actions.
const fs = require("fs");
const puppeteer = require("puppeteer");
const { buildReportHtml } = require("./report-template");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// YYYY-MM-DD of a UTC ISO timestamp, in IST.
function istDate(iso) {
  if (!iso) return null;
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
function istNow() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

async function fetchAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

function fmtDateLabel(ymd) {
  const d = new Date(ymd + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function fmtMonthLabel(ymd) {
  const d = new Date(ymd + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

async function main() {
  // Reporting window: "as of yesterday" (IST). Daily = yesterday; MTD = first of
  // yesterday's month .. yesterday inclusive.
  const today = istNow();
  const yIST = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yDay = yIST.toISOString().slice(0, 10);
  const mStart = yDay.slice(0, 8) + "01";

  const inRange = (d) => d && d >= mStart && d <= yDay;
  const onDay = (d) => d === yDay;

  const [partners, orders] = await Promise.all([
    fetchAll("tplink_partners"),
    fetchAll("tplink_orders"),
  ]);

  const oDay = (o) => istDate(o.created_at);
  const num = (n) => Number(n || 0);

  const m = {
    leadsToday: partners.filter((p) => onDay(istDate(p.created_at))).length,
    leadsMTD: partners.filter((p) => inRange(istDate(p.created_at))).length,
    ordersToday: orders.filter((o) => onDay(oDay(o))).length,
    ordersMTD: orders.filter((o) => inRange(oDay(o))).length,
    ordersQtyToday: orders.filter((o) => onDay(oDay(o))).reduce((s, o) => s + num(o.quantity), 0),
    ordersQtyMTD: orders.filter((o) => inRange(oDay(o))).reduce((s, o) => s + num(o.quantity), 0),
    amountToday: orders.filter((o) => onDay(oDay(o))).reduce((s, o) => s + num(o.total_amount), 0),
    amountMTD: orders.filter((o) => inRange(oDay(o))).reduce((s, o) => s + num(o.total_amount), 0),
    dispatchedToday: orders.filter((o) => onDay(istDate(o.dispatched_at))).length,
    dispatchedMTD: orders.filter((o) => inRange(istDate(o.dispatched_at))).length,
    pendingDispatch: orders.filter((o) => o.status === "parked").length,
    deliveredToday: orders.filter((o) => onDay(o.delivered_date)).length,
    deliveredMTD: orders.filter((o) => inRange(o.delivered_date)).length,
    pendingDelivery: orders.filter((o) => o.status === "dispatched").length,
  };

  const html = buildReportHtml(m, fmtDateLabel(yDay), fmtMonthLabel(yDay));
  fs.writeFileSync("report.html", html, "utf8");

  // Screenshot the card.
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 920, height: 900, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  const card = await page.$(".card");
  await card.screenshot({ path: "report.png" });
  await browser.close();
  console.log("report.png written for", yDay, JSON.stringify(m));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
