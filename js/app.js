/* ═══════════════════════════════════════════════════════════
   App — bill tab, cart, tabs, i18n wiring
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const round2 = Invoice.round2;
  const money = Invoice.money;

  const todayISO = () => {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const nowTime = () => {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);

  const state = {
    cart: [], customer: { name: "", phone: "" },
    discount: 0, payment: "Cash", date: todayISO(), billNo: "",
    cat: "all", query: "", activeTab: "bill"
  };
  let settings = Store.getSettings();

  const unitPriceFor = (item, grams) =>
    item.p[grams] != null ? item.p[grams] : round2((item.p[1000] * grams) / 1000);
  const gramsLabel = g => (g >= 1000 && g % 1000 === 0) ? `${g / 1000} kg` : `${g} g`;
  const lineAmount = l => round2(unitPriceFor(ITEMS_BY_ID[l.itemId], l.grams) * l.qty);

  function totals() {
    const subtotal = round2(state.cart.reduce((s, l) => s + lineAmount(l), 0));
    const discount = Math.min(Math.max(0, Number(state.discount) || 0), subtotal);
    return { subtotal, discount, total: round2(subtotal - discount) };
  }

  /** Compute paid / due from the amountPaid input (empty = fully paid). */
  function computePayment() {
    const t = totals();
    const raw = String($("#amountPaid")?.value || "").trim();
    let paid;
    if (raw === "") paid = t.total;
    else paid = Math.max(0, Math.min(t.total, Number(raw) || 0));
    return { total: t.total, paid: round2(paid), due: round2(t.total - paid) };
  }

  function ensureBillNo() {
    if (!state.billNo) state.billNo = Store.makeBillNo(state.date, Store.peekSeq(state.date));
  }

  function addToCart(itemId, grams) {
    const ex = state.cart.find(l => l.itemId === itemId && l.grams === grams);
    if (ex) ex.qty += 1;
    else state.cart.push({ uid: uid(), itemId, grams, qty: 1 });
    persistDraft(); renderCart(); pulseItem(itemId);
  }
  function removeLine(id) {
    state.cart = state.cart.filter(l => l.uid !== id);
    persistDraft(); renderCart();
  }
  function setLineGrams(id, g) {
    const l = state.cart.find(x => x.uid === id); if (l) { l.grams = g; persistDraft(); renderCart(); }
  }
  function setLineQty(id, q) {
    const l = state.cart.find(x => x.uid === id); if (!l) return;
    q = Math.max(1, Math.min(999, Math.floor(Number(q) || 1)));
    l.qty = q; persistDraft(); renderCart();
  }
  function clearBill(resetNo = true) {
    state.cart = []; state.customer = { name: "", phone: "" };
    state.discount = 0; state.payment = "Cash";
    if (resetNo) state.billNo = "";
    Store.clearDraft(); renderCart();
    $("#custName").value = ""; $("#custPhone").value = ""; $("#discount").value = 0;
    $("#amountPaid").value = "";
    $$("#payPills .pill").forEach(p => p.classList.toggle("is-active", p.dataset.pay === "Cash"));
    ensureBillNo(); renderBillMeta();
  }

  function persistDraft() {
    Store.saveDraft({
      cart: state.cart, customer: state.customer, discount: state.discount,
      payment: state.payment, date: state.date, billNo: state.billNo,
      amountPaidRaw: $("#amountPaid")?.value || ""
    });
  }
  function restoreDraft() {
    const d = Store.getDraft();
    if (!d || !Array.isArray(d.cart)) return false;
    state.cart = d.cart.filter(l => ITEMS_BY_ID[l.itemId]);
    state.customer = d.customer || { name: "", phone: "" };
    state.discount = Number(d.discount) || 0;
    state.payment = d.payment || "Cash";
    state.date = d.date || todayISO();
    state.billNo = d.billNo || "";
    if (d.amountPaidRaw) $("#amountPaid").value = d.amountPaidRaw;
    return state.cart.length > 0;
  }

  function filteredItems() {
    const q = state.query.trim().toLowerCase();
    return SHOP_ITEMS.filter(it => {
      if (state.cat !== "all" && it.cat !== state.cat) return false;
      if (!q) return true;
      return it.gu.includes(state.query.trim()) || it.en.toLowerCase().includes(q);
    });
  }
  function renderCatalog() {
    const grid = $("#itemGrid");
    const items = filteredItems();
    grid.innerHTML = items.map(it => {
      const packs = PACK_SIZES.map(p => `
        <button class="pack-btn" data-add="${it.id}" data-grams="${p.grams}">
          <span class="pb-size">${p.short}</span>
          <span class="pb-price">${it.p[p.grams]}</span>
        </button>`).join("");
      const inCart = state.cart.some(l => l.itemId === it.id);
      return `<article class="item-card${inCart ? " is-added" : ""}" data-item="${it.id}">
        <div>
          <div class="item-name">${I18N.itemName(it)}</div>
          <div class="item-sub">${I18N.itemSub(it)}</div>
        </div>
        <div class="item-rate">1 kg <b>${money(it.p[1000])}</b></div>
        <div class="pack-row">${packs}</div>
      </article>`;
    }).join("");
    $("#catalogEmpty").hidden = items.length > 0;
    $("#searchClear").hidden = !state.query;
    updateChipCounts();
  }
  function updateChipCounts() {
    const counts = { all: SHOP_ITEMS.length, mithai: 0, farsan: 0, dryfruit: 0 };
    SHOP_ITEMS.forEach(i => counts[i.cat]++);
    $$(".chip-count").forEach(el => el.textContent = counts[el.dataset.count] ?? "");
  }
  function pulseItem(itemId) {
    const card = $(`.item-card[data-item="${itemId}"]`); if (!card) return;
    card.classList.add("is-added");
    card.animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }], { duration: 220, easing: "ease-out" });
  }

  function renderCart() {
    $("#cartLines").innerHTML = state.cart.map(l => {
      const it = ITEMS_BY_ID[l.itemId];
      const opts = PACK_SIZES.map(p => `<option value="${p.grams}"${p.grams === l.grams ? " selected" : ""}>${p.short}</option>`).join("");
      const custom = !PACK_SIZES.some(p => p.grams === l.grams) ? `<option value="${l.grams}" selected>${l.grams}g</option>` : "";
      return `<li class="line" data-uid="${l.uid}">
        <div class="line-name">${I18N.itemName(it)}<div class="item-sub">${I18N.itemSub(it)}</div></div>
        <div class="line-amount">${money(lineAmount(l))}</div>
        <div class="line-controls">
          <select class="line-weight" data-uid="${l.uid}">${custom}${opts}</select>
          <div class="qty">
            <button data-qty="-1" data-uid="${l.uid}">−</button>
            <input type="number" value="${l.qty}" min="1" max="999" data-qtyinput="${l.uid}">
            <button data-qty="1" data-uid="${l.uid}">+</button>
          </div>
          <button class="line-remove" data-remove="${l.uid}">✕</button>
        </div>
      </li>`;
    }).join("");
    $("#cartEmpty").hidden = state.cart.length > 0;

    const t = totals();
    $("#subtotalVal").textContent = money(t.subtotal);
    $("#totalVal").textContent = money(t.total);
    $("#totalWords").textContent = state.cart.length ? Invoice.amountInWords(t.total) : "";
    const count = state.cart.reduce((s, l) => s + l.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartTotalMini").textContent = money(t.total);

    // Due display
    const pay = computePayment();
    const dueRow = $("#dueRow");
    if (state.cart.length && pay.due > 0) {
      dueRow.hidden = false;
      $("#dueVal").textContent = money(pay.due);
    } else {
      dueRow.hidden = true;
    }

    $$(".item-card").forEach(c => {
      const id = Number(c.dataset.item);
      c.classList.toggle("is-added", state.cart.some(l => l.itemId === id));
    });
    renderBillMeta();
  }
  function renderBillMeta() {
    ensureBillNo();
    $("#billNoLabel").textContent = "#" + state.billNo;
  }

  function buildBill() {
    const t = totals();
    const pay = computePayment();
    return {
      billNo: state.billNo, date: state.date, time: nowTime(),
      customer: { name: state.customer.name.trim(), phone: state.customer.phone.trim() },
      items: state.cart.map(l => {
        const it = ITEMS_BY_ID[l.itemId];
        return {
          itemId: it.id, gu: it.gu, en: it.en,
          grams: l.grams, weightLabel: gramsLabel(l.grams), qty: l.qty,
          unitPrice: unitPriceFor(it, l.grams), amount: lineAmount(l)
        };
      }),
      subtotal: t.subtotal, discount: t.discount, total: t.total,
      amountPaid: pay.paid,
      amountDue: pay.due,
      paymentStatus: pay.due === 0 ? "paid" : (pay.paid > 0 ? "partial" : "due"),
      paymentMode: state.payment, createdAt: new Date().toISOString(), appVersion: "2.1.0"
    };
  }

  async function saveBill() {
    if (!state.cart.length) { toast("Cart is empty", "err"); return; }
    const btn = $("#btnSave"); btn.disabled = true;
    const orig = btn.textContent; btn.textContent = "…";
    try {
      const bill = buildBill();
      Store.archiveBill(bill);
      Store.commitSeq(state.date);
      try { await Invoice.downloadPDF(bill, settings); }
      catch (e) { toast("PDF failed (bill still saved)", "err"); }
      if (Store.cloudEnabled(settings)) {
        try {
          await Store.pushBill(bill, settings);
          toast(I18N.t("billSavedCloud"), "ok");
          setSyncState("ok", "Cloud backup active");
        } catch (e) {
          Store.queueForCloud(bill);
          toast(I18N.t("cloudPending"), "info", 4200);
          setSyncState("pending", e.message);
        }
      } else toast(I18N.t("billSaved"), "ok");
      clearBill(true); renderCatalog();
      if (state.activeTab === "history") HistoryView.render();
      if (state.activeTab === "summary") SummaryView.render();
      $("#custName").focus();
    } catch (e) {
      console.error(e); toast("Error: " + e.message, "err", 5000);
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  }

  async function printBill() {
    if (!state.cart.length) { toast("Cart is empty", "err"); return; }
    try { await Invoice.print(buildBill(), settings); }
    catch { toast("Print failed", "err"); }
  }

  function toast(msg, type = "info", ms = 3200) {
    const stack = $("#toastStack");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const icon = type === "ok" ? "✓" : type === "err" ? "!" : "•";
    el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add("is-out"); setTimeout(() => el.remove(), 220); }, ms);
  }

  function setSyncState(s, title) {
    const dot = $("#syncDot"); dot.dataset.state = s; dot.title = title || s;
  }
  function refreshSyncState() {
    if (!Store.cloudEnabled(settings)) { setSyncState("", "Cloud off"); return; }
    const pending = Store.getOutbox().length;
    if (pending) setSyncState("pending", `${pending} pending`);
    else setSyncState("ok", "Cloud active");
  }

  function switchTab(tab) {
    state.activeTab = tab;
    $$("#mainTabs .tab").forEach(t => t.classList.toggle("is-active", t.dataset.tab === tab));
    $$(".tab-view").forEach(v => {
      const show = v.dataset.view === tab;
      if (show) v.removeAttribute("hidden"); else v.setAttribute("hidden", "");
    });
    if (tab === "history") { HistoryView.render(); HistoryView.maybeAutoSync(); }
    if (tab === "summary") SummaryView.render();
  }

  function openSettings() {
    settings = Store.getSettings();
    $("#setShopGu").value = settings.shopGu; $("#setShopEn").value = settings.shopEn;
    $("#setAddress").value = settings.address; $("#setPhone").value = settings.phone;
    $("#setGst").value = settings.gst; $("#setFooter").value = settings.footer;
    $("#setLogoUrl").value = settings.logoUrl || "";
    $("#setOwner").value = settings.owner; $("#setRepo").value = settings.repo;
    $("#setToken").value = settings.token;
    $("#settingsStatus").textContent = ""; $("#settingsStatus").className = "settings-status";
    $("#settingsModal").hidden = false;
    setTimeout(() => $("#setShopGu").focus(), 50);
  }
  function closeSettings() { $("#settingsModal").hidden = true; }
  function saveSettingsFromForm() {
    settings = {
      shopGu: $("#setShopGu").value.trim(), shopEn: $("#setShopEn").value.trim(),
      address: $("#setAddress").value.trim(), phone: $("#setPhone").value.trim(),
      gst: $("#setGst").value.trim(), footer: $("#setFooter").value.trim(),
      logoUrl: $("#setLogoUrl").value.trim(),
      owner: $("#setOwner").value.trim(), repo: $("#setRepo").value.trim(),
      token: $("#setToken").value.trim()
    };
    Store.saveSettings(settings); applyShopToHeader(); closeSettings();
    toast(I18N.t("save"), "ok"); refreshSyncState();
    Store.flushOutbox().then(r => { if (r.ok) refreshSyncState(); });
  }
  function applyShopToHeader() {
    const name = I18N.lang === "gu" ? (settings.shopGu || settings.shopEn) : (settings.shopEn || settings.shopGu);
    $("#shopNameDisplay").textContent = name || "Billing";
    $("#brandMark").textContent = (name || "S").trim().charAt(0).toUpperCase();
    const meta = [I18N.lang === "gu" ? settings.shopEn : settings.shopGu, settings.phone].filter(Boolean).join(" · ") || "Billing";
    $("#shopMetaDisplay").textContent = meta;
    document.title = `${name || "Billing"}`;
  }
  async function testCloud() {
    const st = $("#settingsStatus");
    const draft = { owner: $("#setOwner").value.trim(), repo: $("#setRepo").value.trim(), token: $("#setToken").value.trim() };
    if (!draft.owner || !draft.repo || !draft.token) {
      st.textContent = "Fill all three fields"; st.className = "settings-status err"; return;
    }
    st.textContent = "Checking…"; st.className = "settings-status";
    try {
      const repo = await Store.testConnection(draft);
      st.textContent = `✓ Connected to ${repo.full_name} (${repo.private ? "private" : "public"})`;
      st.className = "settings-status ok";
    } catch (e) {
      st.textContent = "✕ " + e.message; st.className = "settings-status err";
    }
  }

  function bind() {
    $("#mainTabs").addEventListener("click", e => {
      const t = e.target.closest(".tab"); if (t) switchTab(t.dataset.tab);
    });
    $("#langToggle").addEventListener("click", () => I18N.toggle());
    window.addEventListener("languagechange", () => {
      applyLanguage(); applyShopToHeader();
      renderCatalog(); renderCart();
      if (state.activeTab === "history") HistoryView.render();
      if (state.activeTab === "summary") SummaryView.render();
    });
    $("#itemGrid").addEventListener("click", e => {
      const b = e.target.closest("[data-add]");
      if (b) addToCart(Number(b.dataset.add), Number(b.dataset.grams));
    });
    let t;
    $("#search").addEventListener("input", e => {
      clearTimeout(t);
      const v = e.target.value;
      t = setTimeout(() => { state.query = v; renderCatalog(); }, 110);
    });
    $("#searchClear").addEventListener("click", () => {
      $("#search").value = ""; state.query = ""; renderCatalog(); $("#search").focus();
    });
    $("#catChips").addEventListener("click", e => {
      const c = e.target.closest(".chip"); if (!c) return;
      state.cat = c.dataset.cat;
      $$("#catChips .chip").forEach(x => x.classList.toggle("is-active", x === c));
      renderCatalog();
    });
    $("#cartLines").addEventListener("click", e => {
      const rm = e.target.closest("[data-remove]"); if (rm) return removeLine(rm.dataset.remove);
      const qb = e.target.closest("[data-qty]");
      if (qb) {
        const l = state.cart.find(x => x.uid === qb.dataset.uid);
        if (l) setLineQty(qb.dataset.uid, l.qty + Number(qb.dataset.qty));
      }
    });
    $("#cartLines").addEventListener("change", e => {
      if (e.target.matches(".line-weight")) setLineGrams(e.target.dataset.uid, Number(e.target.value));
    });
    $("#cartLines").addEventListener("input", e => {
      if (e.target.matches("[data-qtyinput]") && e.target.value !== "")
        setLineQty(e.target.dataset.qtyinput, e.target.value);
    });
    $("#custName").addEventListener("input", e => { state.customer.name = e.target.value; persistDraft(); });
    $("#custPhone").addEventListener("input", e => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      state.customer.phone = e.target.value; persistDraft();
    });
    $("#discount").addEventListener("input", e => {
      state.discount = Number(e.target.value) || 0; persistDraft();
      renderCart();
    });
    $("#amountPaid").addEventListener("input", () => {
      persistDraft();
      const pay = computePayment();
      const dueRow = $("#dueRow");
      if (state.cart.length && pay.due > 0) {
        dueRow.hidden = false;
        $("#dueVal").textContent = money(pay.due);
      } else {
        dueRow.hidden = true;
      }
    });
    $("#payPills").addEventListener("click", e => {
      const p = e.target.closest(".pill"); if (!p) return;
      state.payment = p.dataset.pay;
      $$("#payPills .pill").forEach(x => x.classList.toggle("is-active", x === p));
      persistDraft();
    });
    $("#btnSave").addEventListener("click", saveBill);
    $("#btnPrint").addEventListener("click", printBill);
    $("#btnClear").addEventListener("click", () => {
      if (state.cart.length && !confirm(I18N.t("clearCart"))) return;
      clearBill(true); renderCatalog();
    });
    $("#cartToggle").addEventListener("click", () => {
      const open = $("#cart").classList.toggle("is-open");
      $("#cartToggle").setAttribute("aria-expanded", open);
    });
    $("#btnSettings").addEventListener("click", openSettings);
    $$("#settingsModal [data-close]").forEach(el => el.addEventListener("click", closeSettings));
    $("#btnSaveSettings").addEventListener("click", saveSettingsFromForm);
    $("#btnTestCloud").addEventListener("click", testCloud);
    document.addEventListener("keydown", e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === "Escape") {
        if (!$("#settingsModal").hidden) closeSettings();
        else $("#cart").classList.remove("is-open");
      }
      if (typing) return;
      if (e.key === "/") { e.preventDefault(); (state.activeTab === "history" ? $("#historySearch") : $("#search")).focus(); }
      if (e.key === "s" || e.key === "S") { e.preventDefault(); openSettings(); }
      if (e.key === "1") switchTab("bill");
      if (e.key === "2") switchTab("history");
      if (e.key === "3") switchTab("summary");
    });
    window.addEventListener("online", () => {
      Store.flushOutbox().then(r => {
        if (r.ok) { refreshSyncState(); toast("Synced", "ok"); }
      });
    });
  }

  function boot() {
    applyLanguage();
    applyShopToHeader();

    if (restoreDraft()) {
      $("#custName").value = state.customer.name;
      $("#custPhone").value = state.customer.phone;
      $("#discount").value = state.discount;
      $$("#payPills .pill").forEach(p => p.classList.toggle("is-active", p.dataset.pay === state.payment));
      toast("Draft restored", "info");
    }
    ensureBillNo();
    renderCatalog(); renderCart();
    bind();
    HistoryView.bind();
    refreshSyncState();
    Store.flushOutbox().then(r => { if (r.ok) refreshSyncState(); });
    setInterval(() => {
      const t = todayISO();
      if (t !== state.date && !state.cart.length) {
        state.date = t; state.billNo = ""; ensureBillNo(); renderBillMeta();
      }
    }, 60_000);
  }

  window.App = { toast, refreshSyncState, switchTab };
  document.addEventListener("DOMContentLoaded", boot);
})();
