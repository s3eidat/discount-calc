/* Discount Calc — money in integer cents; each step rounds to the cent like a till does. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var KEY = "discount.v1";
  var IDS = ["price", "d1", "d2", "tax", "r-was", "r-now", "c-unit", "a-p", "a-q", "b-p", "b-q"];
  var st = { d1t: "pct", d2t: "pct", text: "" };

  function num(v) {
    v = String(v == null ? "" : v)
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; })
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x6F0; })
      .replace(/٫/g, ".").replace(/[,\s_٬%]/g, "");
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(v) ? parseFloat(v) : NaN;
  }
  function opt(v) { return String(v).trim() ? num(v) : 0; }

  // Apply one discount (percent or fixed amount) to `c` cents; never below 0.
  function applyDiscount(c, value, type) {
    var off = type === "amt" ? Math.round(value * 100) : Math.round(c * value / 100);
    return Math.max(0, c - Math.max(0, off));
  }
  function sale(price, d1, t1, d2, t2, taxPct) {
    var p = Math.round(price * 100), a = applyDiscount(p, d1, t1), b = applyDiscount(a, d2, t2), tax = Math.round(b * taxPct / 100);
    return { price: p, off1: p - a, off2: a - b, net: b, tax: tax, final: b + tax, saved: p - b, effPct: p ? (p - b) / p * 100 : 0 };
  }
  function reversePct(was, now) { return was > 0 ? (was - now) / was * 100 : NaN; }
  function unitPrice(price, qty) { return qty > 0 ? price / qty : NaN; }

  function money(c) { return (c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(v) { return Number(v.toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%"; }
  function up(v) { return Number(v.toPrecision(6)).toLocaleString(undefined, { maximumFractionDigits: 4 }); }

  function row(label, value, cls) { return '<div class="' + (cls || "") + '"><dt>' + S3.esc(label) + "</dt><dd>" + S3.esc(value) + "</dd></div>"; }

  function renderSale() {
    var price = num($("#price").value), d1 = opt($("#d1").value), d2 = opt($("#d2").value), taxPct = opt($("#tax").value), hero = $("#hero");
    if (!(price > 0) || !(d1 >= 0) || !(d2 >= 0) || !(taxPct >= 0)) {
      hero.innerHTML = "<b>—</b><span>" + ($("#price").value.trim() && !(price > 0) ? "Enter a price above 0." : "Enter the original price.") + "</span>";
      $("#receipt").innerHTML = ""; $("#insight").hidden = true; st.text = ""; return;
    }
    if ((st.d1t === "pct" && d1 > 100) || (st.d2t === "pct" && d2 > 100)) {
      hero.innerHTML = "<b>—</b><span>A percent discount can't be more than 100%.</span>"; $("#receipt").innerHTML = ""; $("#insight").hidden = true; st.text = ""; return;
    }
    var r = sale(price, d1, st.d1t, d2, st.d2t, taxPct);
    hero.innerHTML = "<b>" + S3.esc(money(r.final)) + "</b><span>you pay" + (r.tax ? " incl. " + S3.esc(money(r.tax)) + " tax" : "") +
      " · you save <b class=\"inline\">" + S3.esc(money(r.saved)) + "</b> (" + S3.esc(pct(r.effPct)) + ") · was <s>" + S3.esc(money(r.price + Math.round(r.price * taxPct / 100))) + "</s></span>";
    var lab1 = st.d1t === "pct" ? "Discount " + pct(d1) : "Discount", lab2 = st.d2t === "pct" ? "Extra " + pct(d2) : "Extra discount";
    $("#receipt").innerHTML = row("Original price", money(r.price)) +
      (r.off1 ? row(lab1, "−" + money(r.off1), "neg") : "") + (r.off2 ? row(lab2, "−" + money(r.off2), "neg") : "") +
      (r.tax ? row("Price after discounts", money(r.net)) + row("Tax / VAT " + pct(taxPct), "+" + money(r.tax)) : "") +
      row("You pay", money(r.final));
    var ins = $("#insight");
    if (r.off1 && r.off2 && st.d1t === "pct" && st.d2t === "pct") {
      ins.hidden = false;
      ins.innerHTML = "Stacked discounts multiply: " + S3.esc(pct(d1)) + " then " + S3.esc(pct(d2)) + " is <b>" + S3.esc(pct(r.effPct)) + " off</b> in total, not " + S3.esc(pct(d1 + d2)) + ".";
    } else ins.hidden = true;
    st.text = "Original " + money(r.price) + (r.off1 ? ", " + lab1 + " −" + money(r.off1) : "") + (r.off2 ? ", " + lab2 + " −" + money(r.off2) : "") +
      (r.tax ? ", tax +" + money(r.tax) : "") + "\nYou pay " + money(r.final) + " (save " + money(r.saved) + ", " + pct(r.effPct) + ")";
  }

  function renderReverse() {
    var was = num($("#r-was").value), now = num($("#r-now").value), box = $("#r-res");
    if (!(was > 0) || !(now >= 0)) { box.innerHTML = "Enter both prices to see the discount."; return; }
    var p = reversePct(was, now);
    box.innerHTML = p >= 0 ? "<b>" + S3.esc(pct(p)) + "</b>off · you save " + S3.esc(money(Math.round((was - now) * 100))) :
      '<b class="bad">+' + S3.esc(pct(-p)) + "</b>that's a price increase of " + S3.esc(money(Math.round((now - was) * 100)));
  }

  function renderCompare() {
    var u = $("#c-unit").value.trim() || "unit", ap = num($("#a-p").value), aq = num($("#a-q").value), bp = num($("#b-p").value), bq = num($("#b-q").value), box = $("#c-res");
    var ua = unitPrice(ap, aq), ub = unitPrice(bp, bq);
    $("#deal-a").classList.remove("win"); $("#deal-b").classList.remove("win");
    if (!(ap >= 0) || !(bp >= 0) || !isFinite(ua) || !isFinite(ub)) { box.textContent = "Enter a price and amount for both deals (e.g. 4.50 for 500 g)."; return; }
    box.innerHTML = "";
    if (Math.abs(ua - ub) < 1e-12) { box.textContent = "Same price per " + u + ": " + up(ua) + "."; return; }
    var win = ua < ub ? "A" : "B", lo = Math.min(ua, ub), hi = Math.max(ua, ub);
    $(win === "A" ? "#deal-a" : "#deal-b").classList.add("win");
    box.appendChild(S3.h("b", { text: "Deal " + win }));
    box.appendChild(document.createTextNode("is " + pct((hi - lo) / hi * 100) + " cheaper per " + u + " (A: " + up(ua) + ", B: " + up(ub) + " per " + u + ")"));
  }

  function renderAll() {
    var s = { d1t: st.d1t, d2t: st.d2t };
    IDS.forEach(function (id) { s[id] = $("#" + id).value; });
    S3.store(KEY, s);
    renderSale(); renderReverse(); renderCompare();
  }

  function seg(el, key) {
    $$("button", el).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === st[key]));
      b.addEventListener("click", function () {
        st[key] = b.dataset.v;
        $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        renderAll();
      });
    });
  }

  // ---------- wiring ----------
  var sv = S3.store(KEY) || {};
  var defaults = { price: "120", d1: "25", d2: "", tax: "", "r-was": "80", "r-now": "60", "c-unit": "kg", "a-p": "4.50", "a-q": "0.5", "b-p": "7.20", "b-q": "1" };
  IDS.forEach(function (id) { $("#" + id).value = sv[id] != null ? sv[id] : defaults[id]; $("#" + id).addEventListener("input", renderAll); });
  st.d1t = sv.d1t === "amt" ? "amt" : "pct"; st.d2t = sv.d2t === "amt" ? "amt" : "pct";
  seg($("#d1t"), "d1t"); seg($("#d2t"), "d2t");
  $("#copy").addEventListener("click", function () {
    if (!st.text) return S3.toast("Enter a price first", "error");
    S3.copy(st.text); S3.done();
  });
  renderAll();

  window.S3_DEMO = function () {
    $("#price").value = "249.99"; $("#d1").value = "30"; $("#d2").value = "10"; $("#tax").value = "16";
    $("#d1t button[data-v=pct]").click(); $("#d2t button[data-v=pct]").click();
  };

  window.S3_SELFTEST = function () {
    var a = sale(100, 20, "pct", 10, "pct", 0), b = sale(100, 20, "pct", 10, "pct", 16), c = sale(80, 15, "amt", 0, "pct", 0);
    var d = sale(10, 25, "amt", 0, "pct", 0), e = sale(19.99, 15, "pct", 0, "pct", 0);
    return a.final === 7200 && Number(a.effPct.toFixed(6)) === 28 && b.final === 8352 && b.tax === 1152 && c.final === 6500 &&
      d.final === 0 && e.final === 1699 && e.off1 === 300 &&               // 15% of 19.99 = 2.9985 → 3.00
      reversePct(80, 60) === 25 && reversePct(50, 60) === -20 && isNaN(reversePct(0, 5)) &&
      unitPrice(4.5, 0.5) === 9 && unitPrice(7.2, 1) === 7.2 && isNaN(unitPrice(5, 0)) && num("1,299.50") === 1299.5;
  };
})();
