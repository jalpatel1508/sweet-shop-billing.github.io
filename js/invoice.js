/* ═══════════════════════════════════════════════════════════
   Invoice rendering + PDF + print (landscape, 2048×2048 logo)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const money = n => "₹" + Number(round2(n)).toLocaleString("en-IN", {
    minimumFractionDigits: 0, maximumFractionDigits: 2
  });

  const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
    "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function two(n){ return n < 20 ? ONES[n] : TENS[(n/10)|0] + (n % 10 ? " " + ONES[n % 10] : ""); }
  function three(n){
    const h = (n/100)|0, r = n % 100;
    return (h ? ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? two(r) : "");
  }
  function amountInWords(num) {
    num = Math.round(num);
    if (num === 0) return "Zero Rupees Only";
    let crore = (num/10000000)|0; num %= 10000000;
    let lakh  = (num/100000)|0;   num %= 100000;
    let thou  = (num/1000)|0;     num %= 1000;
    let out = "";
    if (crore) out += three(crore) + " Crore ";
    if (lakh)  out += three(lakh)  + " Lakh ";
    if (thou)  out += three(thou)  + " Thousand ";
    if (num)   out += three(num);
    return out.trim() + " Rupees Only";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function fmtDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  }

  function buildHTML(bill, shop) {
    // 2048×2048 PNG: loading=eager + decoding=sync ensure html2canvas
    // never snapshots before the browser has finished decoding the bitmap.
    const logo = shop.logoUrl
      ? `<img src="${esc(shop.logoUrl)}" alt="" class="inv-logo" loading="eager" decoding="sync" width="2048" height="2048">`
      : "";

    const rows = bill.items.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="inv-item-gu">${esc(it.gu)}</div>
          <div class="inv-item-en">${esc(it.en)}</div>
        </td>
        <td class="num">${esc(it.weightLabel)}</td>
        <td class="num">${it.qty}</td>
        <td class="num">${money(it.unitPrice)}</td>
        <td class="num">${money(it.amount)}</td>
      </tr>`).join("");

    const discountRow = bill.discount > 0
      ? `<div class="r"><span>Discount</span><b>− ${money(bill.discount)}</b></div>` : "";

    const paid = bill.amountPaid != null ? Number(bill.amountPaid) : bill.total;
    const due  = bill.amountDue  != null ? Number(bill.amountDue)  : 0;
    let paymentBlock = "";
    if (due > 0) {
      paymentBlock = `
        <div class="r"><span>Paid</span><b>${money(paid)}</b></div>
        <div class="r due-line"><span>Due</span><b class="due-amount">${money(due)}</b></div>`;
    } else {
      paymentBlock = `<div class="r paid-line"><span>Paid in Full</span><b class="paid-amount">✓</b></div>`;
    }

    const custLine = bill.customer.name || bill.customer.phone ? `
      <div class="inv-cust">
        <span>ગ્રાહક / Customer</span>
        <b>${esc(bill.customer.name || "—")}</b>
        ${bill.customer.phone ? `<i>· ${esc(bill.customer.phone)}</i>` : ""}
      </div>` : "";

    return `
      <div class="inv-head">
        <div class="inv-head-left">
          ${logo ? `<div class="inv-logo-wrap">${logo}</div>` : ""}
          <div>
            <div class="inv-shop">${esc(shop.shopGu || shop.shopEn)}</div>
            ${shop.shopEn ? `<div class="inv-shop-en">${esc(shop.shopEn)}</div>` : ""}
            ${shop.address ? `<div class="inv-sub">${esc(shop.address)}</div>` : ""}
            ${shop.phone ? `<div class="inv-sub">Mob: ${esc(shop.phone)}</div>` : ""}
            ${shop.gst ? `<div class="inv-sub">GSTIN: ${esc(shop.gst)}</div>` : ""}
          </div>
        </div>
        <div class="inv-badge">BILL</div>
      </div>

      <div class="inv-meta">
        <div><span>Bill No</span><b>${esc(bill.billNo)}</b></div>
        <div><span>Date</span><b>${fmtDate(bill.date)}</b></div>
        <div><span>Time</span><b>${esc(bill.time)}</b></div>
        <div><span>Payment</span><b>${esc(bill.paymentMode)}</b></div>
      </div>

      ${custLine}

      <table class="inv-table">
        <thead>
          <tr>
            <th style="width:26px">#</th>
            <th>Item</th>
            <th class="num" style="width:62px">Weight</th>
            <th class="num" style="width:34px">Qty</th>
            <th class="num" style="width:62px">Rate</th>
            <th class="num" style="width:70px">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="inv-totals">
        <div class="r"><span>Subtotal</span><b>${money(bill.subtotal)}</b></div>
        ${discountRow}
        <div class="r grand"><span>કુલ / Total</span><b>${money(bill.total)}</b></div>
        ${paymentBlock}
      </div>
      <div class="inv-words">${esc(amountInWords(bill.total))}</div>

      <div class="inv-foot">
        <div class="inv-foot-note">${esc(shop.footer)}</div>
        <div class="inv-sign">Authorised Signatory</div>
      </div>`;
  }

  function render(bill, shop) {
    const el = document.getElementById("invoice");
    el.innerHTML = buildHTML(bill, shop);
    return el;
  }

  async function fontsReady() {
    try {
      await Promise.all([
        document.fonts.load("600 16px 'Noto Sans Gujarati'"),
        document.fonts.load("700 20px 'Noto Serif Gujarati'"),
        document.fonts.load("400 12px 'Inter'")
      ]);
      await document.fonts.ready;
    } catch {}
  }

  /** Wait for every <img> to finish loading AND decoding (critical for 2048×2048). */
  async function waitImages(root) {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(imgs.map(img => {
      const load = (img.complete && img.naturalWidth > 0)
        ? Promise.resolve()
        : new Promise(resolve => {
            img.onload = resolve;
            img.onerror = () => { img.style.display = "none"; resolve(); };
            setTimeout(resolve, 4000);
          });
      // Also wait for decode so html2canvas can draw the 2048px bitmap.
      const decode = (typeof img.decode === "function")
        ? img.decode().catch(() => {})
        : Promise.resolve();
      return Promise.all([load, decode]);
    }));
  }

  async function downloadPDF(bill, shop) {
    if (!window.html2canvas || !window.jspdf) throw new Error("PDF library not loaded");
    const el = render(bill, shop);
    await fontsReady();
    await waitImages(el);

    const canvas = await html2canvas(el, {
      scale: 2.5,                 // 2.5 is plenty for print + keeps file small even with 2048px logo
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight
    });

    const { jsPDF } = window.jspdf;
    // ── LANDSCAPE A5 ──────────────────────────────────────
    const pdf = new jsPDF({ unit: "mm", format: "a5", orientation: "landscape" });
    const pw = pdf.internal.pageSize.getWidth();   // ≈ 210 mm
    const ph = pdf.internal.pageSize.getHeight();  // ≈ 148 mm

    const ratio = canvas.height / canvas.width;
    let w = pw, h = w * ratio;
    if (h > ph) { h = ph; w = h / ratio; }

    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      (pw - w) / 2, (ph - h) / 2, w, h
    );
    pdf.save(`Bill-${bill.billNo}.pdf`);
  }

  async function print(bill, shop) {
    render(bill, shop);
    await fontsReady();
    await waitImages(document.getElementById("invoice"));
    await new Promise(r => setTimeout(r, 80));
    window.print();
  }

  window.Invoice = {
    buildHTML, render, downloadPDF, print, money, round2, amountInWords
  };
})();
