/* ═══════════════════════════════════════════════════════════
   i18n — English (default) + Gujarati
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const STRINGS = {
    en: {
             deleteBill: "Delete",
      confirmDelete: "Delete this bill? This cannot be undone.",
      billDeleted: "Bill deleted",
      deleteFailed: "Delete failed",
      tabBill: "New Bill", tabHistory: "Bills", tabSummary: "Summary",
      searchItems: "Search item…", all: "All", mithai: "Mithai",
      farsan: "Farsan", dryfruit: "Dryfruit", noItems: "No items found",
      bill: "Bill", customer: "Customer", phone: "Phone",
      optional: "Optional", subtotal: "Subtotal", discount: "Discount",
      total: "Total", payment: "Payment", amountPaid: "Amount Paid",
      due: "Due", paid: "Paid", fullyPaid: "Fully Paid",
      partial: "Partial", unpaid: "Unpaid",
      cash: "Cash", upi: "UPI", card: "Card", credit: "Credit",
      save: "Save", print: "Print", savePdf: "Save + PDF",
      cartEmpty: "Tap a weight on any item",
      clearCart: "Clear the current bill?",
      historyTitle: "Bills",
      historySearch: "Search: name, phone, 11/11, 'today', 'yesterday'…",
      filterAll: "All", filterToday: "Today", filterYesterday: "Yesterday",
      filterWeek: "This Week", filterMonth: "This Month",
      syncCloud: "Sync from cloud", syncing: "Syncing…",
      syncDone: "Synced", noBills: "No bills found",
      billsFound: n => `${n} bill${n === 1 ? "" : "s"}`,
      items: n => `${n} item${n === 1 ? "" : "s"}`,
      viewPdf: "PDF", viewPrint: "Print",
      recordPayment: "Record Payment",
      markFullyPaid: "Mark as Fully Paid",
      paymentRecorded: "Payment recorded",
      amountReceivedNow: "Amount received now",
      alreadyPaid: "Already Paid", savePayment: "Save Payment",
      summaryTitle: "Summary", todaySales: "Today",
      weekSales: "This Week", monthSales: "This Month",
      allTimeSales: "All Time", totalBills: "Total Bills",
      avgBill: "Avg. Bill", monthlyBreakdown: "Month by Month",
      topCustomers: "Top Customers", noData: "No data yet",
      settings: "Settings", cancel: "Cancel",
      testConnection: "Test connection",
      billSaved: "Bill saved", billSavedCloud: "Bill saved & backed up",
      cloudPending: "Saved locally, cloud sync pending",
      syncFailed: "Sync failed", loading: "Loading…", error: "Something went wrong",
      shopDetails: "Shop details (printed on the bill)",
      cloudBackup: "GitHub cloud backup (optional but recommended)",
      logoUrl: "Logo URL",
      months: ["January","February","March","April","May","June",
               "July","August","September","October","November","December"]
    },
    gu: {
      tabBill: "નવું બિલ", tabHistory: "બિલ", tabSummary: "સારાંશ",
      searchItems: "વસ્તુ શોધો…", all: "બધું", mithai: "મિઠાઈ",
      farsan: "ફરસાણ", dryfruit: "ડ્રાયફ્રૂટ", noItems: "કોઈ વસ્તુ મળી નથી",
      bill: "બિલ", customer: "ગ્રાહકનું નામ", phone: "મોબાઈલ",
      optional: "વૈકલ્પિક", subtotal: "પેટા-સરવાળો", discount: "ડિસ્કાઉન્ટ",
      total: "કુલ", payment: "પેમેન્ટ", amountPaid: "ચૂકવેલ રકમ",
      due: "બાકી", paid: "ચૂકવેલ", fullyPaid: "પૂર્ણ ચૂકવેલ",
      partial: "આંશિક", unpaid: "બાકી",
      cash: "રોકડ", upi: "UPI", card: "કાર્ડ", credit: "ઉધાર",
      save: "સેવ", print: "પ્રિન્ટ", savePdf: "સેવ + PDF",
      cartEmpty: "ડાબી બાજુથી વસ્તુ ઉમેરો",
      clearCart: "બિલ ખાલી કરવું છે?",
      historyTitle: "બિલ",
      historySearch: "શોધો: નામ, ફોન, 11/11, 'આજે', 'ગઈકાલે'…",
      filterAll: "બધું", filterToday: "આજે", filterYesterday: "ગઈકાલે",
      filterWeek: "આ અઠવાડિયું", filterMonth: "આ મહિનો",
      syncCloud: "ક્લાઉડ સિંક", syncing: "સિંક થાય છે…",
      syncDone: "સિંક થયું", noBills: "કોઈ બિલ મળ્યું નથી",
      billsFound: n => `${n} બિલ`,
      items: n => `${n} વસ્તુ`,
      viewPdf: "PDF", viewPrint: "પ્રિન્ટ",
      recordPayment: "ચુકવણી નોંધો",
      markFullyPaid: "પૂર્ણ ચૂકવેલ તરીકે ચિહ્નિત કરો",
      paymentRecorded: "ચુકવણી નોંધાઈ",
      amountReceivedNow: "હવે મળેલ રકમ",
      alreadyPaid: "પહેલેથી ચૂકવેલ", savePayment: "ચુકવણી સેવ કરો",
      summaryTitle: "સારાંશ", todaySales: "આજે",
      weekSales: "આ અઠવાડિયું", monthSales: "આ મહિનો",
      allTimeSales: "કુલ", totalBills: "કુલ બિલ",
      avgBill: "સરેરાશ બિલ", monthlyBreakdown: "મહિના પ્રમાણે",
      topCustomers: "મુખ્ય ગ્રાહકો", noData: "હજી કોઈ માહિતી નથી",
      settings: "સેટિંગ્સ", cancel: "રદ કરો",
      testConnection: "કનેક્શન ચેક કરો",
      billSaved: "બિલ સેવ થયું", billSavedCloud: "બિલ સેવ થયું અને બેકઅપ થયું",
      cloudPending: "સેવ થયું, ક્લાઉડ સિંક બાકી",
      syncFailed: "સિંક નિષ્ફળ", loading: "લોડ થાય છે…", error: "ભૂલ આવી",
      shopDetails: "દુકાનની વિગતો (બિલ પર છપાય છે)",
      cloudBackup: "GitHub ક્લાઉડ બેકઅપ (વૈકલ્પિક પણ સલાહભર્યું)",
      logoUrl: "લોગો URL",
      months: ["જાન્યુઆરી","ફેબ્રુઆરી","માર્ચ","એપ્રિલ","મે","જૂન",
               "જુલાઈ","ઓગસ્ટ","સપ્ટેમ્બર","ઓક્ટોબર","નવેમ્બર","ડિસેમ્બર"]
    }
  };

  let current = localStorage.getItem("billing.lang") || "en";

  window.I18N = {
    get lang() { return current; },
    t(key, ...args) {
      const v = (STRINGS[current] || STRINGS.en)[key] ?? STRINGS.en[key] ?? key;
      return typeof v === "function" ? v(...args) : v;
    },
    set(lang) {
      if (!STRINGS[lang] || lang === current) return;
      current = lang;
      localStorage.setItem("billing.lang", lang);
      document.documentElement.lang = lang === "gu" ? "gu" : "en";
      apply();
    },
    toggle() { this.set(current === "en" ? "gu" : "en"); },
    months() { return STRINGS[current].months; },
    itemName(item) { return current === "gu" ? item.gu : item.en; },
    itemSub(item) { return current === "gu" ? item.en : item.gu; }
  };

  function apply() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = I18N.t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
      el.placeholder = I18N.t(el.dataset.i18nPh);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.title = I18N.t(el.dataset.i18nTitle);
    });
    const toggleBtn = document.getElementById("langToggle");
    if (toggleBtn) toggleBtn.textContent = current === "en" ? "ગુ" : "EN";
    window.dispatchEvent(new CustomEvent("languagechange"));
  }

  document.documentElement.lang = current === "gu" ? "gu" : "en";
  window.applyLanguage = apply;
})();
