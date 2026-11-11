/* ═══════════════════════════════════════════════════════════
   Storage layer
   - Settings      → localStorage
   - Draft bill    → localStorage (survives reload/crash)
   - Saved bills   → localStorage + GitHub (outbox retry)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const K = {
    settings: "billing.settings.v1",
    draft: "billing.draft.v1",
    outbox: "billing.outbox.v1",
    seq: "billing.seq.v1",
    archive: "billing.archive.v1" // local mirror of saved bills (last 500)
  };

  const DEFAULT_SETTINGS = {
    shopGu: "શ્રી સ્વીટ માર્ટ",
    shopEn: "Shree Sweet Mart",
    address: "",
    phone: "",
    gst: "",
    footer: "મીઠાઈ ખરીદવા બદલ આભાર! · Thank you for your purchase",
    owner: "",
    repo: "",
    token: ""
  };

  /* ── low-level ─────────────────────────────────────────── */
  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error("localStorage write failed", e); return false; }
  }

  /* ── settings ──────────────────────────────────────────── */
  function getSettings() { return Object.assign({}, DEFAULT_SETTINGS, read(K.settings, {})); }
  function saveSettings(s) { write(K.settings, s); }
  function cloudEnabled(s) {
    s = s || getSettings();
    return !!(s.owner && s.repo && s.token);
  }

  /* ── draft ─────────────────────────────────────────────── */
  function getDraft() { return read(K.draft, null); }
  function saveDraft(d) { write(K.draft, d); }
  function clearDraft() { localStorage.removeItem(K.draft); }

  /* ── bill numbering ────────────────────────────────────── */
  /** Returns a stable sequence for a date, e.g. 2026-11-11 → 1,2,3… */
  function peekSeq(dateISO) {
    const map = read(K.seq, {});
    return (map[dateISO] || 0) + 1;
  }
  function commitSeq(dateISO) {
    const map = read(K.seq, {});
    map[dateISO] = (map[dateISO] || 0) + 1;
    write(K.seq, map);
    return map[dateISO];
  }
  function makeBillNo(dateISO, seq) {
    return `${dateISO.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`;
  }

  /* ── archive (local mirror) ────────────────────────────── */
  function archiveBill(bill) {
    const list = read(K.archive, []);
    list.unshift(bill);
    write(K.archive, list.slice(0, 500));
  }
  function getArchive() { return read(K.archive, []); }

  /* ── outbox ────────────────────────────────────────────── */
  function queueForCloud(bill) {
    const q = read(K.outbox, []);
    if (!q.some(b => b.billNo === bill.billNo)) q.push(bill);
    write(K.outbox, q);
    return q.length;
  }
  function getOutbox() { return read(K.outbox, []); }
  function removeFromOutbox(billNo) {
    write(K.outbox, getOutbox().filter(b => b.billNo !== billNo));
  }

  /* ── GitHub API ────────────────────────────────────────── */
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function billPath(bill) {
    const [y, m] = bill.date.split("-");
    return `bills/${y}/${m}/${bill.billNo}.json`;
  }

  async function githubPut(path, contentObj, message, settings) {
    const url = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        content: utf8ToBase64(JSON.stringify(contentObj, null, 2))
      })
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); if (j.message) msg = j.message; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  /** Push a bill to GitHub. Throws on failure. */
  async function pushBill(bill, settings) {
    settings = settings || getSettings();
    if (!cloudEnabled(settings)) throw new Error("Cloud backup not configured");
    return githubPut(billPath(bill), bill, `Bill ${bill.billNo}`, settings);
  }

  /** Verify repo + token by reading the repo root. */
  async function testConnection(settings) {
    settings = settings || getSettings();
    if (!cloudEnabled(settings)) throw new Error("Fill username, repo and token first");
    const url = `https://api.github.com/repos/${settings.owner}/${settings.repo}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: "application/vnd.github+json"
      }
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); if (j.message) msg = j.message; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  /** Try to flush every queued bill. Returns {ok, failed}. */
  async function flushOutbox(onProgress) {
    const settings = getSettings();
    if (!cloudEnabled(settings)) return { ok: 0, failed: getOutbox().length };
    const q = getOutbox();
    let ok = 0;
    for (const bill of q) {
      try {
        await pushBill(bill, settings);
        removeFromOutbox(bill.billNo);
        ok++;
        if (onProgress) onProgress(ok, q.length);
      } catch (e) {
        console.warn("outbox flush failed for", bill.billNo, e.message);
        break; // stop on first failure (likely network/token issue)
      }
    }
    return { ok, failed: getOutbox().length };
  }

  /* ── expose ────────────────────────────────────────────── */
  window.Store = {
    getSettings, saveSettings, cloudEnabled,
    getDraft, saveDraft, clearDraft,
    peekSeq, commitSeq, makeBillNo,
    archiveBill, getArchive,
    queueForCloud, getOutbox, removeFromOutbox, flushOutbox,
    pushBill, testConnection,
    billPath
  };
})();
