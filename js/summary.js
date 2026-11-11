/* ═══════════════════════════════════════════════════════════
   Sales summary / dashboard
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $ = s => document.querySelector(s);
  const money = Invoice.money;
  const todayISO = () => {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  function weekStartISO() {
    const d = new Date(); const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    const p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function monthStartISO() {
    const d = new Date(), p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
  }

  function aggregate(bills) {
    const today = todayISO(), week = weekStartISO(), month = monthStartISO();
    const stats = {
      today: { sales: 0, count: 0 }, week: { sales: 0, count: 0 },
      month: { sales: 0, count: 0 }, all: { sales: 0, count: 0 }
    };
    const byMonth = new Map();
    const byCustomer = new Map();

    for (const b of bills) {
      stats.all.sales += b.total; stats.all.count++;
      if (b.date === today) { stats.today.sales += b.total; stats.today.count++; }
      if (b.date >= week) { stats.week.sales += b.total; stats.week.count++; }
      if (b.date >= month) { stats.month.sales += b.total; stats.month.count++; }

      const ym = b.date.slice(0, 7);
      if (!byMonth.has(ym)) byMonth.set(ym, { sales: 0, count: 0 });
      const m = byMonth.get(ym); m.sales += b.total; m.count++;

      const name = (b.customer?.name || "").trim();
      const phone = (b.customer?.phone || "").trim();
      const key = name || phone || "__walkin__";
      if (!byCustomer.has(key)) byCustomer.set(key, { name: name || (phone ? phone : "Walk-in"), phone, sales: 0, count: 0 });
      const c = byCustomer.get(key); c.sales += b.total; c.count++;
    }
    return { stats, byMonth, byCustomer };
  }

  function render() {
    const bills = Store.getArchive();
    const { stats, byMonth, byCustomer } = aggregate(bills);
    const months = I18N.months();

    // cards
    const cards = [
      { key: "todaySales", s: stats.today },
      { key: "weekSales", s: stats.week },
      { key: "monthSales", s: stats.month },
      { key: "allTimeSales", s: stats.all }
    ];
    $("#summaryCards").innerHTML = cards.map(c => `
      <div class="summary-card">
        <h4>${I18N.t(c.key)}</h4>
        <div class="amt">${money(c.s.sales)}</div>
        <div class="meta">${I18N.t("billsFound", c.s.count)}</div>
      </div>`).join("");

    // monthly table
    const sorted = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    if (!sorted.length) {
      $("#monthlyTable").innerHTML = `<p class="empty-state" style="padding:20px;text-align:center;">${I18N.t("noData")}</p>`;
    } else {
      $("#monthlyTable").innerHTML = `
        <div class="mt-row head"><div>Month</div><div class="count">Bills</div><div class="sales">Sales</div></div>
        ${sorted.map(([ym, v]) => {
          const [y, m] = ym.split("-");
          return `<div class="mt-row">
            <div class="month">${months[Number(m) - 1]} ${y}</div>
            <div class="count">${v.count}</div>
            <div class="sales">${money(v.sales)}</div>
          </div>`;
        }).join("")}`;
    }

    // top customers
    const topCust = Array.from(byCustomer.values())
      .filter(c => c.name !== "Walk-in" || c.phone)
      .sort((a, b) => b.sales - a.sales).slice(0, 10);
    if (!topCust.length) {
      $("#topCustomers").innerHTML = `<p class="empty-state" style="padding:20px;text-align:center;">${I18N.t("noData")}</p>`;
    } else {
      $("#topCustomers").innerHTML = `
        <div class="tc-list">
          ${topCust.map(c => `
            <div class="tc-row">
              <div class="name">${escapeHtml(c.name)}${c.phone ? ` <span style="color:var(--muted);font-size:11.5px">· ${c.phone}</span>` : ""}</div>
              <div class="bills">${c.count}</div>
              <div class="amount">${money(c.sales)}</div>
            </div>`).join("")}
        </div>`;
    }
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  window.SummaryView = { render };
})();
