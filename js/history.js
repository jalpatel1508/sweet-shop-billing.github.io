/* ═══════════════════════════════════════════════════════════
   Bills history + search
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = Invoice.money;
  const todayISO = () => {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const shiftDay = n => {
    const d = new Date(); d.setDate(d.getDate() + n);
    const p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const state = { query: "", filter: "all", expanded: new Set() };

  /* ── date helpers ─────────────────────────────────────── */
  function weekStartISO() {
    const d = new Date(); const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    const p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function monthStartISO() {
    const d = new Date();
    const p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
  }

  /* ── parse search query ───────────────────────────────── */
  function parseQuery(raw) {
    const q = raw.trim().toLowerCase();
    if (!q) return { type: "all" };

    // "today" / "yesterday" / "week" / "month" / "year"
    if (q === "today" || q === "આજે") return { type: "range", from: todayISO(), to: todayISO() };
    if (q === "yesterday" || q === "ગઈકાલે") { const y = shiftDay(-1); return { type: "range", from: y, to: y }; }
    if (q === "week" || q === "this week" || q === "આ અઠવાડિયું") return { type: "range", from: weekStartISO(), to: todayISO() };
    if (q === "month" || q === "this month" || q === "આ મહિનો") return { type: "range", from: monthStartISO(), to: todayISO() };

    // date formats: 11/11, 11-11, 2026-11-11, 11/11/2026
    const dateMatch = q.match(/^(\d{1,4})[-\/](\d{1,2})(?:[-\/](\d{1,4}))?$/);
    if (dateMatch) {
      let [, a, b, c] = dateMatch;
      if (c) {
        // 11/11/2026 (dd/mm/yyyy) or 2026/11/11 (yyyy/mm/dd)
        if (a.length === 4) return { type: "range", from: `${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}`, to: `${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}` };
        return { type: "range", from: `${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`, to: `${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}` };
      }
      // dd/mm or mm/dd without year — assume current year
      const year = new Date().getFullYear();
      const dd = a.padStart(2, "0"), mm = b.padStart(2, "0");
      return { type: "range", from: `${year}-${mm}-${dd}`, to: `${year}-${mm}-${dd}` };
    }

    // month names
    const months = I18N.months().map(m => m.toLowerCase());
    for (let i = 0; i < months.length; i++) {
      if (q === months[i] || q === months[i].slice(0, 3)) {
        const y = new Date().getFullYear();
        return { type: "range", from: `${y}-${String(i + 1).padStart(2, "0")}-01`, to: `${y}-${String(i + 1).padStart(2, "0")}-31` };
      }
    }

    // fallback: text
    return { type: "text", q };
  }

  /* ── filter bills ─────────────────────────────────────── */
  function filterBills(bills) {
    let out = bills.slice();

    // filter chip
    if (state.filter === "today") out = out.filter(b => b.date === todayISO());
    else if (state.filter === "yesterday") out = out.filter(b => b.date === shiftDay(-1));
    else if (state.filter === "week") out = out.filter(b => b.date >= weekStartISO() && b.date <= todayISO());
    else if (state.filter === "month") out = out.filter(b => b.date >= monthStartISO() && b.date <= todayISO());

    // query
    const p = parseQuery(state.query);
    if (p.type === "range") out = out.filter(b => b.date >= p.from && b.date <= p.to);
    else if (p.type === "text") {
      const t = p.q;
      out = out.filter(b =>
        (b.billNo || "").toLowerCase().includes(t) ||
        (b.customer?.name || "").toLowerCase().includes(t) ||
        (b.customer?.phone || "").includes(t) ||
        b.items.some(it => it.gu.includes(t) || (it.en || "").toLowerCase().includes(t))
      );
    }
    return out;
  }

  /* ── render one row ───────────────────────────────────── */
  function renderRow(bill) {
    const isOpen = state.expanded.has(bill.billNo);
    const itemsCount = bill.items.reduce((s, i) => s + i.qty, 0);
    const dateStr = new Date(bill.date + "T" + (bill.time || "00:00")).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const itemsHtml = bill.items.map(it => `
      <li>
        <div class="hr-item-name">
          <b>${I18N.lang === "gu" ? it.gu : (it.en || it.gu)}</b>
          <span>${it.weightLabel} × ${it.qty}</span>
        </div>
        <div class="hr-item-amt">${money(it.amount)}</div>
      </li>`).join("");
    return `
      <div class="history-row${isOpen ? " expanded" : ""}" data-bill="${bill.billNo}">
        <div class="hr-head">
          <div class="hr-top">
            <span class="hr-bill">#${bill.billNo}</span>
            <span class="hr-date">${dateStr} · ${bill.time || ""}</span>
          </div>
          <div class="hr-amount">${money(bill.total)}</div>
          <div class="hr-sub">
            ${bill.customer?.name ? `<span class="hr-cust">${escapeHtml(bill.customer.name)}</span>` : ""}
            ${bill.customer?.phone ? `<span class="hr-phone">${escapeHtml(bill.customer.phone)}</span>` : ""}
            <span class="hr-items">${I18N.t("items", itemsCount)}</span>
          </div>
          <svg class="hr-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        ${isOpen ? `
          <div class="hr-body">
            <ul class="hr-items-list">${itemsHtml}</ul>
            <div class="hr-totals">
              <span>Sub: ${money(bill.subtotal)}</span>
              ${bill.discount > 0 ? `<span>Disc: −${money(bill.discount)}</span>` : ""}
              <span>Total: <b>${money(bill.total)}</b></span>
            </div>
            <div class="hr-actions">
              <button class="btn btn-outline btn-sm" data-action="pdf" data-bill="${bill.billNo}">${I18N.t("viewPdf")}</button>
              <button class="btn btn-outline btn-sm" data-action="print" data-bill="${bill.billNo}">${I18N.t("viewPrint")}</button>
            </div>
          </div>` : ""}
      </div>`;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ── render list ──────────────────────────────────────── */
  function renderList() {
    const all = Store.getArchive();
    const filtered = filterBills(all);
    const list = $("#historyList");
    const meta = $("#historyMeta");
    const empty = $("#historyEmpty");

    meta.textContent = filtered.length ? `${I18N.t("billsFound", filtered.length)} · ${money(filtered.reduce((s, b) => s + b.total, 0))}` : "";
    list.innerHTML = filtered.map(renderRow).join("");
    empty.hidden = filtered.length > 0;
  }

  /* ── events ───────────────────────────────────────────── */
  function bind() {
    const searchEl = $("#historySearch");
    let timer;
    searchEl.addEventListener("input", e => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.query = e.target.value;
        renderList();
      }, 130);
    });

    $("#historyChips").addEventListener("click", e => {
      const chip = e.target.closest(".chip"); if (!chip) return;
      state.filter = chip.dataset.filter;
      $$("#historyChips .chip").forEach(c => c.classList.toggle("is-active", c === chip));
      renderList();
    });

    $("#historyList").addEventListener("click", e => {
      const actionBtn = e.target.closest("[data-action]");
      if (actionBtn) {
        e.stopPropagation();
        const bill = Store.getArchive().find(b => b.billNo === actionBtn.dataset.bill);
        if (!bill) return;
        if (actionBtn.dataset.action === "pdf") Invoice.downloadPDF(bill, Store.getSettings());
        else if (actionBtn.dataset.action === "print") Invoice.print(bill, Store.getSettings());
        return;
      }
      const row = e.target.closest(".history-row"); if (!row) return;
      const bn = row.dataset.bill;
      if (state.expanded.has(bn)) state.expanded.delete(bn); else state.expanded.add(bn);
      renderList();
    });

    $("#btnSyncCloud").addEventListener("click", syncCloud);

    window.addEventListener("languagechange", renderList);
  }

  /* ── sync from GitHub ─────────────────────────────────── */
  async function syncCloud() {
    const btn = $("#btnSyncCloud");
    if (!Store.cloudEnabled()) {
      App.toast("Configure GitHub in settings first", "err");
      return;
    }
    btn.disabled = true;
    const original = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span>${I18N.t("syncing")}`;
    try {
      const bills = await Store.fetchAllBills((done, total) => {
        btn.innerHTML = `<span class="spinner"></span>${done}/${total}`;
      });
      Store.mergeArchive(bills);
      renderList();
      App.toast(`${I18N.t("syncDone")} · ${I18N.t("billsFound", bills.length)}`, "ok");
      App.refreshSyncState();
    } catch (e) {
      App.toast(`${I18N.t("syncFailed")}: ${e.message}`, "err", 5000);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  async function maybeAutoSync() {
    if (!Store.shouldSync()) return;
    try {
      const bills = await Store.fetchAllBills();
      Store.mergeArchive(bills);
      renderList();
      App.refreshSyncState();
    } catch (e) { /* silent */ }
  }

  window.HistoryView = {
    render: renderList,
    bind,
    syncCloud,
    maybeAutoSync,
    renderList
  };
})();
