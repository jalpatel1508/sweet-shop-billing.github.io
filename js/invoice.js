/* ═══════════════════════════════════════════════════════════
   Invoice rendering + PDF + print (auto-height A5-width)
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

  /* ── invoice HTML (unchanged, no logo) ─────────────────── */
  function buildHTML(bill, shop) {
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

  /* ── measure the rendered invoice and return mm height ─── */
  function measureHeightMm(el) {
    // 96 CSS px = 1 inch = 25.4 mm
    const px = el.scrollHeight;
    const mm = px * 25.4 / 96;
    // +2mm safety buffer so nothing gets clipped
    return Math.ceil(mm) + 2;
  }

  /* ═════════════════════════════════════════════════════════
     PDF — auto-height, A5 width, portrait
     ═════════════════════════════════════════════════════════ */
  async function downloadPDF(bill, shop) {
    if (!window.html2canvas || !window.jspdf) throw new Error("PDF library not loaded");

    const el = render(bill, shop);
    await fontsReady();
    await new Promise(r => setTimeout(r, 60));   // let layout settle

    const A5_WIDTH_MM = 148;
    const heightMm = measureHeightMm(el);

    // Very long bills → lower the pixel scale so the canvas never blows up
    const MAX_CANVAS_PX = 12000;
    const scale = Math.max(1.5, Math.min(3, MAX_CANVAS_PX / el.scrollHeight));

    const canvas = await html2canvas(el, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight
    });

    const { jsPDF } = window.jspdf;

    // ── Custom page: 148mm wide × exact content height ───
    const pdf = new jsPDF({
      unit: "mm",
      format: [A5_WIDTH_MM, heightMm],
      orientation: "portrait"
    });

    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    // Full-bleed image — fills the page exactly
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.94),
      "JPEG",
      0, 0, pw, ph
    );

    pdf.save(`Bill-${bill.billNo}.pdf`);
  }

  /* ═════════════════════════════════════════════════════════
     PRINT — auto-height via dynamically injected @page
     ═════════════════════════════════════════════════════════ */
  async function print(bill, shop) {
    render(bill, shop);
    await fontsReady();
    await new Promise(r => setTimeout(r, 80));

    const el = document.getElementById("invoice");
    const A5_WIDTH_MM = 148;
    const heightMm = measureHeightMm(el);

    // Inject (or update) a dynamic @page rule.
    // Because it's added AFTER styles.css, it wins in the cascade.
    let styleEl = document.getElementById("dynamic-print-page");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-print-page";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent =
      `@media print { @page { size: ${A5_WIDTH_MM}mm ${heightMm}mm; margin: 0; } }`;

    // Two animation frames → ensures layout & @page recalc before print dialog opens
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    window.print();
  }

  window.Invoice = {
    buildHTML, render, downloadPDF, print, money, round2, amountInWords
  };
})();
