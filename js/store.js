/* ═══════════════════════════════════════════════════════════
   Storage layer + GitHub sync (with SHA-based updates)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const K = {
    settings: "billing.settings.v1", draft: "billing.draft.v1",
    outbox: "billing.outbox.v1", seq: "billing.seq.v1",
    archive: "billing.archive.v2", lastSync: "billing.lastSync.v1"
  };
  const ARCHIVE_MAX = 2000;
  const SYNC_TTL_MS = 5 * 60 * 1000;

  const DEFAULT_SETTINGS = {
    shopGu: "શ્રી સ્વીટ માર્ટ", shopEn: "Shree Sweet Mart",
    address: "", phone: "", gst: "", footer: "Thank you for your purchase!",
    logoUrl: "1794383228911.png",
    owner: "", repo: "", token: ""
  };

  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.error(e); return false; } };

  const getSettings = () => Object.assign({}, DEFAULT_SETTINGS, read(K.settings, {}));
  const saveSettings = s => write(K.settings, s);
  const cloudEnabled = s => {
    s = s || getSettings();
    return !!(s.owner && s.repo && s.token);
  };

  const getDraft = () => read(K.draft, null);
  const saveDraft = d => write(K.draft, d);
  const clearDraft = () => localStorage.removeItem(K.draft);

  const peekSeq = dateISO => ((read(K.seq, {}))[dateISO] || 0) + 1;
  const commitSeq = dateISO => {
    const m = read(K.seq, {}); m[dateISO] = (m[dateISO] || 0) + 1; write(K.seq, m);
    return m[dateISO];
  };
  const makeBillNo = (dateISO, seq) =>
    `${dateISO.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`;

  const getArchive = () => read(K.archive, []);
  function archiveBill(bill) {
    let list = read(K.archive, []);
    const i = list.findIndex(b => b.billNo === bill.billNo);
    if (i >= 0) list[i] = bill;
    else list.unshift(bill);
    if (list.length > ARCHIVE_MAX) list = list.slice(0, ARCHIVE_MAX);
    if (!write(K.archive, list)) {
      list = list.slice(0, Math.max(200, list.length - 500));
      write(K.archive, list);
    }
  }
  function mergeArchive(bills) {
    const map = new Map();
    for (const b of getArchive()) map.set(b.billNo, b);
    for (const b of bills) if (!map.has(b.billNo)) map.set(b.billNo, b);
    const list = Array.from(map.values()).sort((a, b) =>
      (b.date + b.time).localeCompare(a.date + a.time));
    write(K.archive, list.slice(0, ARCHIVE_MAX));
    return list.slice(0, ARCHIVE_MAX);
  }

  function queueForCloud(bill) {
    const q = read(K.outbox, []);
    if (!q.some(b => b.billNo === bill.billNo)) q.push(bill);
    write(K.outbox, q);
    return q.length;
  }
  const getOutbox = () => read(K.outbox, []);
  const removeFromOutbox = bn =>
    write(K.outbox, getOutbox().filter(b => b.billNo !== bn));

  const utf8ToBase64 = str => {
    const bytes = new TextEncoder().encode(str);
    let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };
  const billPath = bill => {
    const [y, m] = bill.date.split("-");
    return `bills/${y}/${m}/${bill.billNo}.json`;
  };

  async function ghHeaders(settings) {
    return {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    };
  }

  /** Push (create OR update) a bill. Handles SHA automatically. */
  async function pushBill(bill, settings) {
    settings = settings || getSettings();
    if (!cloudEnabled(settings)) throw new Error("Cloud backup not configured");
    const path = billPath(bill);
    const url = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`;

    // Check if exists to get SHA
    let sha = null;
    try {
      const check = await fetch(url, { headers: await ghHeaders(settings) });
      if (check.ok) {
        const info = await check.json();
        sha = info.sha;
      }
    } catch {}

    const body = {
      message: sha ? `Update ${bill.billNo}` : `Bill ${bill.billNo}`,
      content: utf8ToBase64(JSON.stringify(bill, null, 2))
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: "PUT",
      headers: await ghHeaders(settings),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); if (j.message) msg = j.message; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  async function testConnection(settings) {
    settings = settings || getSettings();
    if (!cloudEnabled(settings)) throw new Error("Fill username, repo and token first");
    const res = await fetch(
      `https://api.github.com/repos/${settings.owner}/${settings.repo}`,
      { headers: await ghHeaders(settings) });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); if (j.message) msg = j.message; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }
  /** Delete a bill from both local archive and GitHub. */
  async function deleteBill(bill, settings) {
    settings = settings || getSettings();

    // ── Cloud first (safer: if this fails, bill stays intact) ──
    if (cloudEnabled(settings)) {
      const path = billPath(bill);
      const url = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`;

      // 1. Get SHA (required by GitHub DELETE)
      const check = await fetch(url, { headers: await ghHeaders(settings) });
      if (check.status === 404) {
        // already gone from cloud — safe to clean local
      } else if (!check.ok) {
        throw new Error(`GitHub ${check.status} — cannot verify bill`);
      } else {
        const info = await check.json();
        const res = await fetch(url, {
          method: "DELETE",
          headers: await ghHeaders(settings),
          body: JSON.stringify({
            message: `Delete bill ${bill.billNo}`,
            sha: info.sha
          })
        });
        if (!res.ok) {
          let msg = `GitHub ${res.status}`;
          try { const j = await res.json(); if (j.message) msg = j.message; } catch {}
          throw new Error(msg);
        }
      }
    }

    // ── Local cleanup ──
    const list = read(K.archive, []).filter(b => b.billNo !== bill.billNo);
    write(K.archive, list);
    removeFromOutbox(bill.billNo);

    return { ok: true };
  }

  async function flushOutbox(onProgress) {
    const settings = getSettings();
    if (!cloudEnabled(settings)) return { ok: 0, failed: getOutbox().length };
    const q = getOutbox(); let ok = 0;
    for (const bill of q) {
      try {
        await pushBill(bill, settings);
        removeFromOutbox(bill.billNo); ok++;
        if (onProgress) onProgress(ok, q.length);
      } catch { break; }
    }
    return { ok, failed: getOutbox().length };
  }

  async function ghList(url, settings) {
    const res = await fetch(url, { headers: await ghHeaders(settings) });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  async function fetchBillFromUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  async function fetchAllBills(onProgress) {
    const settings = getSettings();
    if (!cloudEnabled(settings)) throw new Error("Cloud backup not configured");
    const root = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents`;
    const years = await ghList(`${root}/bills`, settings);
    const yearFolders = years.filter(f => f.type === "dir");
    const all = []; let done = 0; let total = 0;
    const monthFolders = [];
    for (const y of yearFolders) {
      const months = await ghList(`${root}/bills/${y.name}`, settings);
      for (const m of months.filter(f => f.type === "dir")) {
        const files = await ghList(`${root}/bills/${y.name}/${m.name}`, settings);
        const json = files.filter(f => f.name.endsWith(".json"));
        total += json.length;
        monthFolders.push({ year: y.name, month: m.name, files: json });
      }
    }
    for (const mf of monthFolders) {
      for (const file of mf.files) {
        try { all.push(await fetchBillFromUrl(file.download_url)); }
        catch (e) { console.warn("skip", file.name, e); }
        done++;
        if (onProgress) onProgress(done, total);
      }
    }
    write(K.lastSync, Date.now());
    return all;
  }

  const lastSyncAgo = () => { const t = read(K.lastSync, 0); return t ? Date.now() - t : Infinity; };
  const shouldSync = () => cloudEnabled() && lastSyncAgo() > SYNC_TTL_MS;

    window.Store = {
    getSettings, saveSettings, cloudEnabled,
    getDraft, saveDraft, clearDraft,
    peekSeq, commitSeq, makeBillNo,
    archiveBill, mergeArchive, getArchive,
    queueForCloud, getOutbox, removeFromOutbox, flushOutbox,
    pushBill, deleteBill, testConnection, fetchAllBills,
    shouldSync, lastSyncAgo, billPath
  };
})();
