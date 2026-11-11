/* ═══════════════════════════════════════════════════════════
   Bills history + search + record payments
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
  let currentPayBill = null;

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

  function parseQuery(raw) {
    const q = raw.trim().toLowerCase();
    if (!q) return { type: "all" };
    if (q === "today" || q === "આજે") return { type: "range", from: todayISO(), to: todayISO() };
    if (q === "yesterday" || q === "ગઈકાલે") { const y = shiftDay(-1); return { type: "range", from: y, to: y }; }
    if (q === "week" || q === "this week" || q === "આ અઠવાડિયું") return { type: "range", from: weekStartISO(), to: todayISO() };
    if (q === "month" || q === "this month" || q === "આ મહિનો") return { type: "range", from: monthStartISO(), to: todayISO() };

    const dateMatch = q.match(/^(\d{1,4})[-\/](\d{1,2})(?:[-\/](\d{1,4}))?$/);
    if (dateMatch) {
      let [, a, b, c] = dateMatch;
      if (c) {
        if (a.length === 4) return { type: "range", from: `${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}`, to: `${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}` };
        return { type: "range", from: `${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`, to: `${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}` };
      }
      const year = new Date().getFullYear();
      const dd = a.padStart(2, "0"), mm = b.padStart(2, "0");
      return { type: "range", from: `${year}-${mm}-${dd}`, to: `${year}-${mm}-${dd}` };
    }
    const months = I18N.months().map(m => m.toLowerCase());
    for (let i = 0; i < months.length; i++) {
      if (q === months[i] || q === months[i].slice(0, 3)) {
        const y = new Date().getFullYear();
        return { type: "range", from: `${y}-${String(i + 1).padStart(2, "0")}-01`, to: `${y}-${String(i + 1).padStart(2, "0")}-31` };
      }
    }
    return { type: "text", q };
  }

  function filterBills(bills) {
    let out = bills.slice();
    if (state.filter === "today") out = out.filter(b => b.date === todayISO());
    else if (state.filter === "yesterday") out = out.filter(b => b.date === shiftDay(-1));
    else if (state.filter === "week") out = out.filter(b => b.date >= weekStartISO() && b.date <= todayISO());
    else if (state.filter === "month") out = out.filter(b => b.date >= monthStartISO() && b.date <= todayISO());

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

  /** Payment status helpers with backward compat */
  function paymentOf(bill) {
    const paid = bill.amountPaid != null ? Number(bill.amountPaid) : Number(bill.total);
    const due  = bill.amountDue  != null ? Number(bill.amountDue)  : 0;
    let status = bill.paymentStatus;
    if (!status) status = due === 0 ? "paid" : (paid > 0 ? "partial" : "due");
    return { paid, due, status };
  }
  function paymentBadge(bill) {
    const p = paymentOf(bill);
    if (p.status === "paid" || p.due === 0) return `<span class="pay-badge paid" title="Fully paid">✓ ${I18N.t("paid")}</span>`;
    if (p.paid > 0) return `<span class="pay-badge partial" title="Partially paid">${I18N.t("due")} ${money(p.due)}</span>`;
    return `<span class="pay-badge due" title="Unpaid">${I18N.t("unpaid")} ${money(p.due)}</span>`;
  }

  function renderRow(bill) {
    const isOpen = state.expanded.has(bill.billNo);
    const itemsCount = bill.items.reduce((s, i) => s + i.qty, 0);
    const dateStr = new Date(bill.date + "T" + (bill.time || "00:00")).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const p = paymentOf(bill);
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
            ${paymentBadge(bill)}
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
              ${p.due > 0 ? `<span class="due-amount">Paid: ${money(p.paid)} · Due: <b>${money(p.due)}</b></span>` : `<span class="paid-amount">✓ Fully Paid</span>`}
            </div>
                        <div class="hr-actions">
              <button class="btn btn-outline btn-sm" data-action="pdf" data-bill="${bill.billNo}">${I18N.t("viewPdf")}</button>
              <button class="btn btn-outline btn-sm" data-action="print" data-bill="${bill.billNo}">${I18N.t("viewPrint")}</button>
              ${p.due > 0 ? `<button class="btn btn-primary btn-sm" data-action="pay" data-bill="${bill.billNo}">+ ${I18N.t("recordPayment")}</button>` : ""}
              <button class="btn btn-danger-ghost btn-sm hr-delete-btn" data-action="delete" data-bill="${bill.billNo}">${I18N.t("deleteBill")}</button>
            </div>
          </div>` : ""}
      </div>`;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderList() {
    const all = Store.getArchive();
    const filtered = filterBills(all);
    const list = $("#historyList");
    const meta = $("#historyMeta");
    const empty = $("#historyEmpty");

    const totalAmt = filtered.reduce((s, b) => s + b.total, 0);
    const totalDue = filtered.reduce((s, b) => {
      const p = paymentOf(b); return s + p.due;
    }, 0);
    let metaText = filtered.length
      ? `${I18N.t("billsFound", filtered.length)} · ${money(totalAmt)}`
      : "";
    if (filtered.length && totalDue > 0) metaText += ` · ${I18N.t("due")}: ${money(totalDue)}`;
    meta.textContent = metaText;

    list.innerHTML = filtered.map(renderRow).join("");
    empty.hidden = filtered.length > 0;
  }

  /* ── payment modal ────────────────────────────────────── */
  function openPaymentModal(billNo) {
    const bill = Store.getArchive().find(b => b.billNo === billNo);
    if (!bill) return;
    currentPayBill = bill;
    const p = paymentOf(bill);
    $("#payBillNo").textContent = "#" + bill.billNo;
    $("#payTotal").textContent = money(bill.total);
    $("#payAlready").textContent = money(p.paid);
    $("#payDue").textContent = money(p.due);
    $("#payAmount").value = "";
    $("#payAmount").max = p.due;
    $("#paymentModal").hidden = false;
    setTimeout(() => $("#payAmount").focus(), 50);
  }
  function closePaymentModal() {
    $("#paymentModal").hidden = true;
    currentPayBill = null;
  }
  async function savePayment() {
    if (!currentPayBill) return;
    const amt = Number($("#payAmount").value) || 0;
    if (amt <= 0) { App.toast("Enter an amount", "err"); return; }
    await recordPayment(currentPayBill, amt);
    closePaymentModal();
  }
  async function recordPayment(bill, amount) {
    const p = paymentOf(bill);
    const newPaid = Math.min(bill.total, p.paid + amount);
    const newDue = Math.max(0, bill.total - newPaid);
    bill.amountPaid = newPaid;
    bill.amountDue = newDue;
    bill.paymentStatus = newDue === 0 ? "paid" : (newPaid > 0 ? "partial" : "due");
    bill.payments = [...(bill.payments || []), { date: new Date().toISOString(), amount }];
    bill.updatedAt = new Date().toISOString();

    Store.archiveBill(bill);

    const settings = Store.getSettings();
    if (Store.cloudEnabled(settings)) {
      try {
        await Store.pushBill(bill, settings);
        App.toast(I18N.t("paymentRecorded") + " · synced", "ok");
      } catch (e) {
        Store.queueForCloud(bill);
        App.toast(I18N.t("paymentRecorded") + " (cloud pending)", "info");
      }
    } else {
      App.toast(I18N.t("paymentRecorded"), "ok");
    }
    renderList();
    App.refreshSyncState();
  }

  function bind() {
    const searchEl = $("#historySearch");
    let timer;
    searchEl.addEventListener("input", e => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.query = e.target.value; renderList(); }, 130);
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
        const bn = actionBtn.dataset.bill;
        const bill = Store.getArchive().find(b => b.billNo === bn);
        if (!bill) return;
        const act = actionBtn.dataset.action;
        if (act === "pdf") Invoice.downloadPDF(bill, Store.getSettings());
        else if (act === "print") Invoice.print(bill, Store.getSettings());
        else if (act === "pay") openPaymentModal(bn);
        return;
      }
      const row = e.target.closest(".history-row"); if (!row) return;
      const bn = row.dataset.bill;
      if (state.expanded.has(bn)) state.expanded.delete(bn); else state.expanded.add(bn);
      renderList();
    });

    $("#btnSyncCloud").addEventListener("click", syncCloud);

    // payment modal
    $$("#paymentModal [data-close-pay]").forEach(el => el.addEventListener("click", closePaymentModal));
    $("#btnPaySave").addEventListener("click", savePayment);
    $("#btnPayFull").addEventListener("click", () => {
      if (!currentPayBill) return;
      const p = paymentOf(currentPayBill);
      $("#payAmount").value = p.due;
    });

    window.addEventListener("languagechange", renderList);
  }

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
    } catch (e) {}
  }

  window.HistoryView = { render: renderList, bind, syncCloud, maybeAutoSync, renderList };
})();
