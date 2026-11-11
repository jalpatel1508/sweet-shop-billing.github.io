/* ═══════════════════════════════════════════════════════════
   App logic
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const round2 = Invoice.round2;
  const money  = Invoice.money;

  /* ── helpers ───────────────────────────────────────────── */
  const todayISO = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const nowTime = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);

  /* ── state ─────────────────────────────────────────────── */
  const state = {
    cart: [],                 // {uid, itemId, grams, qty}
    customer: { name: "", phone: "" },
    discount: 0,
    payment: "Cash",
    date: todayISO(),
    billNo: "",
    cat: "all",
    query: ""
  };

  let settings = Store.getSettings();

  /* ── bill number ───────────────────────────────────────── */
  function ensureBillNo() {
    if (!state.billNo) {
      state.billNo = Store.makeBillNo(state.date, Store.peekSeq(state.date));
    }
    return state.billNo;
  }

  /* ── pricing ───────────────────────────────────────────── */
  function unitPriceFor(item, grams) {
    if (item.p[grams] != null) return item.p[grams];
    return round2((item.p[1000] * grams) / 1000); // custom weight
  }
  function gramsLabel(grams) {
    if (grams >= 1000 && grams % 1000 === 0) return `${grams / 1000} કિલો`;
    return `${grams} ગ્રામ`;
  }
  function lineAmount(line) {
    const item = ITEMS_BY_ID[line.itemId];
    return round2(unitPriceFor(item, line.grams) * line.qty);
  }
  function totals() {
    const subtotal = round2(state.cart.reduce((s, l) => s + lineAmount(l), 0));
    const discount = Math.min(Math.max(0, Number(state.discount) || 0), subtotal);
    return { subtotal, discount, total: round2(subtotal - discount) };
  }

  /* ── cart mutations ────────────────────────────────────── */
  function addToCart(itemId, grams) {
    const existing = state.cart.find(l => l.itemId === itemId && l.grams === grams);
    if (existing) existing.qty += 1;
    else state.cart.push({ uid: uid(), itemId, grams, qty: 1 });
    persistDraft();
    renderCart();
    pulseItem(itemId);
  }
  function removeLine(uid) {
    state.cart = state.cart.filter(l => l.uid !== uid);
    persistDraft(); renderCart();
  }
  function setLineGrams(uid, grams) {
    const l = state.cart.find(x => x.uid === uid);
    if (l) { l.grams = grams; persistDraft(); renderCart(); }
  }
  function setLineQty(uid, qty) {
    const l = state.cart.find(x => x.uid === uid);
    if (!l) return;
    qty = Math.max(1, Math.min(999, Math.floor(Number(qty) || 1)));
    l.qty = qty; persistDraft(); renderCart();
  }
  function clearBill(resetNumber = true) {
    state.cart = [];
    state.customer = { name: "", phone: "" };
    state.discount = 0;
    state.payment = "Cash";
    if (resetNumber) state.billNo = "";
    Store.clearDraft();
    renderCart();
    $('#custName').value = "";
    $('#custPhone').value = "";
    $('#discount').value = 0;
    $$('#payPills .pill').forEach(p => p.classList.toggle('is-active', p.dataset.pay === "Cash"));
    ensureBillNo();
    renderBillMeta();
  }

  /* ── draft persistence ─────────────────────────────────── */
  function persistDraft() {
    Store.saveDraft({
      cart: state.cart, customer: state.customer, discount: state.discount,
      payment: state.payment, date: state.date, billNo: state.billNo
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
    return state.cart.length > 0;
  }

  /* ── render: catalog ───────────────────────────────────── */
  function filteredItems() {
    const q = state.query.trim().toLowerCase();
    return SHOP_ITEMS.filter(it => {
      if (state.cat !== "all" && it.cat !== state.cat) return false;
      if (!q) return true;
      return it.gu.includes(state.query.trim())
          || it.en.toLowerCase().includes(q);
    });
  }

  function renderCatalog() {
    const grid = $('#itemGrid');
    const items = filteredItems();
    grid.innerHTML = items.map(it => {
      const packs = PACK_SIZES.map(p => {
        const price = it.p[p.grams];
        return `<button class="pack-btn" data-add="${it.id}" data-grams="${p.grams}" title="${it.en} · ${p.short}">
                  <span class="pb-size">${p.short}</span>
                  <span class="pb-price">${price}</span>
                </button>`;
      }).join("");
      const inCart = state.cart.some(l => l.itemId === it.id);
      return `<article class="item-card${inCart ? " is-added" : ""}" data-item="${it.id}">
        <div>
          <div class="item-name">${it.gu}</div>
          <div class="item-sub">${it.en}</div>
        </div>
        <div class="item-rate">1 કિલો <b>${money(it.p[1000])}</b></div>
        <div class="pack-row">${packs}</div>
      </article>`;
    }).join("");

    $('#catalogEmpty').hidden = items.length > 0;
    $('#searchClear').hidden = !state.query;
    updateChipCounts();
  }

  function updateChipCounts() {
    const counts = { all: SHOP_ITEMS.length, mithai: 0, farsan: 0, dryfruit: 0 };
    SHOP_ITEMS.forEach(i => counts[i.cat]++);
    $$('.chip-count').forEach(el => {
      el.textContent = counts[el.dataset.count] ?? "";
    });
  }

  function pulseItem(itemId) {
    const card = $(`.item-card[data-item="${itemId}"]`);
    if (!card) return;
    card.classList.add('is-added');
    card.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }],
      { duration: 220, easing: "ease-out" }
    );
  }

  /* ── render: cart ──────────────────────────────────────── */
  function renderCart() {
    const list = $('#cartLines');
    list.innerHTML = state.cart.map(l => {
      const item = ITEMS_BY_ID[l.itemId];
      const amount = lineAmount(l);
      const opts = PACK_SIZES.map(p =>
        `<option value="${p.grams}"${p.grams === l.grams ? " selected" : ""}>${p.short}</option>`
      ).join("");
      const custom = !PACK_SIZES.some(p => p.grams === l.grams)
        ? `<option value="${l.grams}" selected>${l.grams}g</option>` : "";
      return `<li class="line" data-uid="${l.uid}">
        <div class="line-name">${item.gu}<div class="item-sub">${item.en}</div></div>
        <div class="line-amount">${money(amount)}</div>
        <div class="line-controls">
          <select class="line-weight" data-uid="${l.uid}" aria-label="Weight">${custom}${opts}</select>
          <div class="qty">
            <button data-qty="-1" data-uid="${l.uid}" aria-label="Decrease">−</button>
            <input type="number" value="${l.qty}" min="1" max="999" data-qtyinput="${l.uid}" aria-label="Quantity">
            <button data-qty="1" data-uid="${l.uid}" aria-label="Increase">+</button>
          </div>
          <button class="line-remove" data-remove="${l.uid}" aria-label="Remove">✕</button>
        </div>
      </li>`;
    }).join("");

    const empty = state.cart.length === 0;
    $('#cartEmpty').hidden = !empty;

    const t = totals();
    $('#subtotalVal').textContent = money(t.subtotal);
    $('#totalVal').textContent = money(t.total);
    $('#totalWords').textContent = state.cart.length ? Invoice.amountInWords(t.total) : "";

    const count = state.cart.reduce((s, l) => s + l.qty, 0);
    $('#cartCount').textContent = count;
    $('#cartTotalMini').textContent = money(t.total);

    // keep card "added" rings accurate
    $$('.item-card').forEach(c => {
      const id = Number(c.dataset.item);
      c.classList.toggle('is-added', state.cart.some(l => l.itemId === id));
    });

    renderBillMeta();
  }

  function renderBillMeta() {
    ensureBillNo();
    $('#billNoLabel').textContent = "#" + state.billNo;
  }

  /* ── build bill object ─────────────────────────────────── */
  function buildBill() {
    const t = totals();
    return {
      billNo: state.billNo,
      date: state.date,
      time: nowTime(),
      customer: { name: state.customer.name.trim(), phone: state.customer.phone.trim() },
      items: state.cart.map(l => {
        const item = ITEMS_BY_ID[l.itemId];
        return {
          itemId: item.id,
          gu: item.gu,
          en: item.en,
          grams: l.grams,
          weightLabel: gramsLabel(l.grams),
          qty: l.qty,
          unitPrice: unitPriceFor(item, l.grams),
          amount: lineAmount(l)
        };
      }),
      subtotal: t.subtotal,
      discount: t.discount,
      total: t.total,
      paymentMode: state.payment,
      createdAt: new Date().toISOString(),
      appVersion: "1.0.0"
    };
  }

  /* ── toasts ────────────────────────────────────────────── */
  function toast(msg, type = "info", ms = 3200) {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === "ok" ? "✓" : type === "err" ? "!" : "•";
    el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 220);
    }, ms);
  }

  /* ── cloud status dot ──────────────────────────────────── */
  function setSyncState(s, title) {
    const dot = $('#syncDot');
    dot.dataset.state = s;
    dot.title = title || s;
  }
  async function refreshSyncState() {
    if (!Store.cloudEnabled(settings)) {
      setSyncState("", "Cloud backup off — bills saved on this device only");
      return;
    }
    const pending = Store.getOutbox().length;
    if (pending) { setSyncState("pending", `${pending} bill(s) waiting to sync`); return; }
    setSyncState("ok", "Cloud backup active");
  }

  /* ═════════════════════════════════════════════════════════
     ACTIONS
     ═════════════════════════════════════════════════════════ */
  async function saveBill() {
    if (state.cart.length === 0) { toast("પહેલા વસ્તુ ઉમેરો · Cart is empty", "err"); return; }

    const btn = $('#btnSave');
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = "સેવ થાય છે…";

    try {
      const bill = buildBill();

      // 1. always archive locally first (never lose a bill)
      Store.archiveBill(bill);
      Store.commitSeq(state.date);

      // 2. PDF
      try {
        await Invoice.downloadPDF(bill, settings);
      } catch (e) {
        console.error(e);
        toast("PDF બન્યું નહીં · PDF failed (bill still saved)", "err");
      }

      // 3. cloud
      if (Store.cloudEnabled(settings)) {
        try {
          await Store.pushBill(bill, settings);
          toast(`બિલ ${bill.billNo} સેવ થયું · Saved & backed up`, "ok");
          setSyncState("ok", "Cloud backup active");
        } catch (e) {
          Store.queueForCloud(bill);
          toast(`સેવ થયું, પણ ક્લાઉડ સિંક બાકી · Saved locally, cloud sync pending`, "info", 4200);
          setSyncState("pending", e.message);
        }
      } else {
        toast(`બિલ ${bill.billNo} સેવ થયું · Saved on device`, "ok");
      }

      // 4. reset for next bill
      clearBill(true);
      renderCatalog();
      $('#custName').focus();

    } catch (e) {
      console.error(e);
      toast("ભૂલ આવી · Something went wrong: " + e.message, "err", 5000);
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  async function printBill() {
    if (state.cart.length === 0) { toast("બિલ ખાલી છે · Cart is empty", "err"); return; }
    try { await Invoice.print(buildBill(), settings); }
    catch (e) { toast("પ્રિન્ટ થયું નહીં · Print failed", "err"); }
  }

  /* ═════════════════════════════════════════════════════════
     SETTINGS MODAL
     ═════════════════════════════════════════════════════════ */
  function openSettings() {
    settings = Store.getSettings();
    $('#setShopGu').value  = settings.shopGu;
    $('#setShopEn').value  = settings.shopEn;
    $('#setAddress').value = settings.address;
    $('#setPhone').value   = settings.phone;
    $('#setGst').value     = settings.gst;
    $('#setFooter').value  = settings.footer;
    $('#setOwner').value   = settings.owner;
    $('#setRepo').value    = settings.repo;
    $('#setToken').value   = settings.token;
    $('#settingsStatus').textContent = "";
    $('#settingsStatus').className = "settings-status";
    $('#settingsModal').hidden = false;
    setTimeout(() => $('#setShopGu').focus(), 50);
  }
  function closeSettings() { $('#settingsModal').hidden = true; }

  function saveSettingsFromForm() {
    settings = {
      shopGu:  $('#setShopGu').value.trim(),
      shopEn:  $('#setShopEn').value.trim(),
      address: $('#setAddress').value.trim(),
      phone:   $('#setPhone').value.trim(),
      gst:     $('#setGst').value.trim(),
      footer:  $('#setFooter').value.trim(),
      owner:   $('#setOwner').value.trim(),
      repo:    $('#setRepo').value.trim(),
      token:   $('#setToken').value.trim()
    };
    Store.saveSettings(settings);
    applyShopToHeader();
    closeSettings();
    toast("સેટિંગ્સ સેવ થઈ · Settings saved", "ok");
    refreshSyncState();
    Store.flushOutbox().then(r => { if (r.ok) refreshSyncState(); });
  }

  function applyShopToHeader() {
    const name = settings.shopGu || settings.shopEn || "બિલિંગ";
    $('#shopNameDisplay').textContent = name;
    $('#brandMark').textContent = (settings.shopGu || "શ").trim().charAt(0);
    const meta = [settings.shopEn, settings.phone].filter(Boolean).join(" · ") || "Billing";
    $('#shopMetaDisplay').textContent = meta;
    document.title = `${name} · બિલિંગ`;
  }

  async function testCloud() {
    const status = $('#settingsStatus');
    const draft = {
      owner: $('#setOwner').value.trim(),
      repo:  $('#setRepo').value.trim(),
      token: $('#setToken').value.trim()
    };
    if (!draft.owner || !draft.repo || !draft.token) {
      status.textContent = "બધા ખાનાં ભરો · Fill all three fields";
      status.className = "settings-status err";
      return;
    }
    status.textContent = "ચેક થાય છે…";
    status.className = "settings-status";
    try {
      const repo = await Store.testConnection(draft);
      status.textContent = `✓ Connected to ${repo.full_name} (${repo.private ? "private" : "public"})`;
      status.className = "settings-status ok";
    } catch (e) {
      status.textContent = "✕ " + e.message;
      status.className = "settings-status err";
    }
  }

  /* ═════════════════════════════════════════════════════════
     EVENT WIRING
     ═════════════════════════════════════════════════════════ */
  function bind() {

    /* --- catalog: add to cart --- */
    $('#itemGrid').addEventListener('click', e => {
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      addToCart(Number(btn.dataset.add), Number(btn.dataset.grams));
    });

    /* --- search --- */
    let searchTimer;
    $('#search').addEventListener('input', e => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => {
        state.query = v;
        renderCatalog();
      }, 110);
    });
    $('#searchClear').addEventListener('click', () => {
      $('#search').value = ""; state.query = ""; renderCatalog(); $('#search').focus();
    });

    /* --- category chips --- */
    $('#catChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.cat = chip.dataset.cat;
      $$('#catChips .chip').forEach(c => c.classList.toggle('is-active', c === chip));
      renderCatalog();
    });

    /* --- cart line events (delegated) --- */
    $('#cartLines').addEventListener('click', e => {
      const rm = e.target.closest('[data-remove]');
      if (rm) { removeLine(rm.dataset.remove); return; }

      const qb = e.target.closest('[data-qty]');
      if (qb) {
        const uid = qb.dataset.uid;
        const line = state.cart.find(l => l.uid === uid);
        if (!line) return;
        setLineQty(uid, line.qty + Number(qb.dataset.qty));
      }
    });
    $('#cartLines').addEventListener('change', e => {
      if (e.target.matches('.line-weight')) {
        setLineGrams(e.target.dataset.uid, Number(e.target.value));
      }
    });
    $('#cartLines').addEventListener('input', e => {
      if (e.target.matches('[data-qtyinput]')) {
        const v = e.target.value;
        if (v === "") return;
        setLineQty(e.target.dataset.qtyinput, v);
      }
    });

    /* --- customer + discount --- */
    $('#custName').addEventListener('input', e => {
      state.customer.name = e.target.value; persistDraft();
    });
    $('#custPhone').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      state.customer.phone = e.target.value; persistDraft();
    });
    $('#discount').addEventListener('input', e => {
      state.discount = Number(e.target.value) || 0;
      persistDraft();
      const t = totals();
      $('#subtotalVal').textContent = money(t.subtotal);
      $('#totalVal').textContent = money(t.total);
      $('#totalWords').textContent = Invoice.amountInWords(t.total);
      $('#cartTotalMini').textContent = money(t.total);
    });

    /* --- payment pills --- */
    $('#payPills').addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      state.payment = pill.dataset.pay;
      $$('#payPills .pill').forEach(p => p.classList.toggle('is-active', p === pill));
      persistDraft();
    });

    /* --- action buttons --- */
    $('#btnSave').addEventListener('click', saveBill);
    $('#btnPrint').addEventListener('click', printBill);
    $('#btnClear').addEventListener('click', () => {
      if (state.cart.length && !confirm("બિલ ખાલી કરવું છે? · Clear the current bill?")) return;
      clearBill(true); renderCatalog();
    });

    /* --- mobile cart sheet --- */
    $('#cartToggle').addEventListener('click', () => {
      const cart = $('#cart');
      const open = cart.classList.toggle('is-open');
      $('#cartToggle').setAttribute('aria-expanded', open);
    });

    /* --- settings --- */
    $('#btnSettings').addEventListener('click', openSettings);
    $$('#settingsModal [data-close]').forEach(el => el.addEventListener('click', closeSettings));
    $('#btnSaveSettings').addEventListener('click', saveSettingsFromForm);
    $('#btnTestCloud').addEventListener('click', testCloud);

    /* --- keyboard shortcuts --- */
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === "Escape") {
        if (!$('#settingsModal').hidden) closeSettings();
        else $('#cart').classList.remove('is-open');
      }
      if (typing) return;
      if (e.key === "/") { e.preventDefault(); $('#search').focus(); }
      if (e.key === "s" || e.key === "S") { e.preventDefault(); openSettings(); }
      if (e.key === "p" || e.key === "P") { e.preventDefault(); printBill(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); saveBill(); }
    });

    /* --- online/offline --- */
    window.addEventListener("online", () => {
      Store.flushOutbox().then(r => { if (r.ok) { refreshSyncState(); toast("ક્લાઉડ સિંક થયું · Synced", "ok"); } });
    });
  }

  /* ═════════════════════════════════════════════════════════
     BOOT
     ═════════════════════════════════════════════════════════ */
  function boot() {
    applyShopToHeader();

    if (restoreDraft()) {
      $('#custName').value = state.customer.name;
      $('#custPhone').value = state.customer.phone;
      $('#discount').value = state.discount;
      $$('#payPills .pill').forEach(p => p.classList.toggle('is-active', p.dataset.pay === state.payment));
      toast("અધૂરું બિલ પાછું લાવ્યું · Draft restored", "info");
    }

    ensureBillNo();
    renderCatalog();
    renderCart();
    bind();
    refreshSyncState();

    // retry pending cloud sync in the background
    Store.flushOutbox().then(r => { if (r.ok) refreshSyncState(); });

    // re-check bill number if the day rolls over while the app is open
    setInterval(() => {
      const t = todayISO();
      if (t !== state.date && state.cart.length === 0) {
        state.date = t; state.billNo = ""; ensureBillNo(); renderBillMeta();
      }
    }, 60_000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
