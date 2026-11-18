// Toko Hazze — Tahap 8: Laporan (ringkasan periode, per periode, per aplikasi, per supplier, riwayat keuangan, export Excel).
(function () {
  const CSS = `
  .lap-sec{margin-bottom:16px}
  .lap-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px}
  .lap-head h3{margin:0}
  .lap-muted{color:var(--text-soft);font-size:14px}
  .lap-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
  .lap-chip{font:inherit;font-size:13px;font-weight:700;border:2px solid var(--blue);background:#fff;color:var(--text);border-radius:999px;padding:6px 12px;cursor:pointer}
  .lap-chip.active{background:var(--pink);border-color:var(--pink)}
  .lap-range{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
  .lap-range input{font:inherit;padding:6px 8px;border:2px solid var(--blue);border-radius:10px;background:#fff;color:var(--text)}
  .lap-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:14px}
  .lap-grid.three{grid-template-columns:1fr}
  @media (min-width:900px){.lap-grid{grid-template-columns:repeat(4,1fr)} .lap-grid.three{grid-template-columns:repeat(3,1fr)}}
  .lap-stat{border-radius:22px;padding:14px 16px;border:none;position:relative;box-shadow:0 7px 0 rgba(104,80,63,.16),0 16px 26px rgba(104,80,63,.16),inset 0 2px 0 rgba(255,255,255,.9),inset 0 -3px 0 rgba(104,80,63,.07);outline:2px dashed rgba(255,255,255,.85);outline-offset:-8px}
  .lap-stat.s-pink{background:linear-gradient(160deg,#fde9f5 0%,#f7d1e8 55%,#eebddc 100%)}
  .lap-stat.s-blue{background:linear-gradient(160deg,#d6f4ee 0%,#b1e5db 55%,#93d6c8 100%)}
  .lap-stat.s-butter{background:linear-gradient(160deg,#ebe6fa 0%,#d3cbf3 55%,#bfb4e8 100%)}
  .lap-stat.s-green{background:linear-gradient(160deg,#ffffff 0%,#fdf8f4 60%,#f5ebe3 100%)}
  .lap-stat .t{font-size:13px;font-weight:700}
  .lap-stat .v{font-weight:800;font-size:19px;margin-top:4px;word-break:break-word}
  .lap-stat .s{font-size:12px;opacity:.8;margin-top:4px}
  .lap-wrap{overflow-x:auto;margin-top:12px;padding-bottom:4px}
  .lap-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;background:#fff;border:2px dashed #d3cbf3;border-radius:18px;overflow:hidden;min-width:420px;box-shadow:0 7px 0 rgba(104,80,63,.12),0 14px 22px rgba(104,80,63,.12)}
  .lap-table th{background:var(--pink);color:var(--text);font-weight:700;text-align:left;padding:10px;white-space:nowrap}
  .lap-table td{padding:9px 10px;border-top:1px dashed #d3cbf3;vertical-align:top}
  .lap-table td.num,.lap-table th.num{text-align:right;white-space:nowrap}
  .lap-table tbody tr:nth-child(even) td{background:rgba(177,229,219,.18)}
  .lap-table tfoot td{font-weight:700;background:rgba(211,203,243,.45);border-top:2px dashed #d3cbf3}
  .lap-pos{color:#3f8a7a;font-weight:700}
  .lap-neg{color:#b4465f;font-weight:700}
  .lap-form{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
  @media (min-width:700px){.lap-form{grid-template-columns:1fr 1fr} .lap-form .full{grid-column:1/-1}}
  .lap-form label span{display:block;font-size:13px;font-weight:700;margin-bottom:4px}
  .lap-form input,.lap-form select{width:100%;padding:10px 12px;border:2px solid var(--blue);border-radius:12px;font:inherit;background:#fff;color:var(--text)}
  .lap-form input:focus,.lap-form select:focus{outline:none;border-color:var(--pink)}
  .lap-del{font:inherit;font-size:12px;font-weight:700;border:2px solid #f7d1e8;background:#fff;color:#b4465f;border-radius:999px;padding:4px 10px;cursor:pointer}
  .lap-msg{font-size:14px;margin:8px 0 0;color:#3f8a7a;font-weight:700}
  .lap-err{font-size:14px;margin:8px 0 0;color:#c0546f;font-weight:700}
  .lap-tools{display:flex;justify-content:flex-end;margin-top:6px}
  `;

  const PERIODS = [
    { id: "7", label: "7 hari" },
    { id: "30", label: "30 hari" },
    { id: "month", label: "Bulan ini" },
    { id: "last", label: "Bulan lalu" },
    { id: "year", label: "Tahun ini" },
    { id: "all", label: "Semua" },
    { id: "custom", label: "Rentang khusus" }
  ];
  const PAY = ["Lunas", "DP / Dibayar Sebagian", "Belum Lunas"];
  const KATEGORI = ["Iklan", "Langganan alat", "Biaya admin", "Bonus / Hadiah", "Lain-lain"];

  const state = {
    container: null,
    period: "month",
    from: "",
    to: "",
    orders: [],
    cash: [],
    msg: "",
    err: ""
  };

  // ---------- Utilitas ----------
  const sb = () => window.hazzeSb;
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const fmtDate = (s) => (s ? parseISO(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v) => Number(v) || 0;
  const signed = (n) => (n >= 0 ? "lap-pos" : "lap-neg");

  // Rentang tanggal sesuai periode yang dipilih
  function range() {
    const t = today();
    switch (state.period) {
      case "7":
        return { from: toISO(addDays(t, -6)), to: toISO(t), label: "7 hari terakhir" };
      case "30":
        return { from: toISO(addDays(t, -29)), to: toISO(t), label: "30 hari terakhir" };
      case "month":
        return { from: toISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: toISO(t), label: "Bulan ini" };
      case "last":
        return {
          from: toISO(new Date(t.getFullYear(), t.getMonth() - 1, 1)),
          to: toISO(new Date(t.getFullYear(), t.getMonth(), 0)),
          label: "Bulan lalu"
        };
      case "year":
        return { from: toISO(new Date(t.getFullYear(), 0, 1)), to: toISO(t), label: "Tahun ini" };
      case "custom":
        if (state.from && state.to) {
          return { from: state.from, to: state.to, label: `${fmtDate(state.from)} s/d ${fmtDate(state.to)}` };
        }
        return { from: "", to: "", label: "Pilih rentang tanggal" };
      default:
        return { from: "", to: "", label: "Semua waktu" };
    }
  }

  const inRange = (d, r) => !r.from || (d >= r.from && d <= r.to);

  // Rincian per bulan jika rentang panjang, agar tabel tetap terbaca
  function isMonthly(r) {
    if (state.period === "all" || state.period === "year") return true;
    if (!r.from || !r.to) return false;
    return Math.round((parseISO(r.to) - parseISO(r.from)) / 86400000) > 62;
  }

  function bucketKey(dateStr, monthly) {
    return monthly ? dateStr.slice(0, 7) : dateStr;
  }
  function bucketLabel(key, monthly) {
    if (monthly) return parseISO(key + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return fmtDate(key);
  }

  // Mengelompokkan transaksi dan menjumlahkan angkanya
  function group(list, keyFn) {
    const m = new Map();
    list.forEach((x) => {
      const k = keyFn(x);
      if (!m.has(k.key)) m.set(k.key, { key: k.key, label: k.label, count: 0, qty: 0, omzet: 0, modal: 0 });
      const g = m.get(k.key);
      g.count++;
      g.qty += num(x.quantity);
      g.omzet += num(x.total_sell);
      g.modal += num(x.total_cost);
    });
    return [...m.values()].map((g) => ({ ...g, untung: g.omzet - g.modal }));
  }

  // ---------- Data ----------
  async function loadAll() {
    const [o, c] = await Promise.all([
      sb().from("orders")
        .select("order_date,transaction_id,app_name,duration,quantity,supplier_name,total_sell,total_cost,payment_status,work_status,customers(name)")
        .neq("work_status", "Dibatalkan")
        .order("order_date", { ascending: false }),
      sb().from("cash_entries").select("*").order("entry_date", { ascending: false })
    ]);
    if (o.error) throw o.error;
    if (c.error) throw c.error;
    state.orders = o.data || [];
    state.cash = c.data || [];
  }

  // Semua angka laporan dihitung dari sini
  function compute() {
    const r = range();
    const orders = state.orders.filter((x) => x.order_date && inRange(x.order_date, r));
    const cash = state.cash.filter((x) => x.entry_date && inRange(x.entry_date, r));
    const monthly = isMonthly(r);

    const pay = { Lunas: 0, "DP / Dibayar Sebagian": 0, "Belum Lunas": 0 };
    let omzet = 0, modal = 0, qty = 0;
    orders.forEach((x) => {
      const s = num(x.total_sell);
      omzet += s;
      modal += num(x.total_cost);
      qty += num(x.quantity);
      pay[x.payment_status] = (pay[x.payment_status] || 0) + s;
    });

    const pemasukan = cash.filter((x) => x.kind === "pemasukan").reduce((a, x) => a + num(x.amount), 0);
    const pengeluaran = cash.filter((x) => x.kind === "pengeluaran").reduce((a, x) => a + num(x.amount), 0);
    const untung = omzet - modal;
    const bersih = untung + pemasukan - pengeluaran;

    const periode = group(orders, (x) => {
      const k = bucketKey(x.order_date, monthly);
      return { key: k, label: bucketLabel(k, monthly) };
    }).sort((a, b) => a.key.localeCompare(b.key));

    const apps = group(orders, (x) => ({ key: x.app_name, label: x.app_name }))
      .sort((a, b) => b.omzet - a.omzet);

    const supp = group(orders, (x) => {
      const n = x.supplier_name || "(tanpa supplier)";
      return { key: n, label: n };
    }).sort((a, b) => b.modal - a.modal);

    return { r, orders, cash, omzet, modal, qty, untung, pemasukan, pengeluaran, bersih, pay, periode, apps, supp, count: orders.length };
  }

  // ---------- Tampilan ----------
  const statCard = (cls, title, value, sub) =>
    `<div class="lap-stat ${cls}"><div class="t">${title}</div><div class="v">${value}</div><div class="s">${sub}</div></div>`;

  function table(heads, rows, foot) {
    const body = rows.length
      ? rows.join("")
      : `<tr><td colspan="${heads.length}" class="lap-muted">Belum ada data pada periode ini.</td></tr>`;
    const tfoot = foot ? `<tfoot><tr>${foot.map((f) => `<td class="${f.cls || ""}">${f.v}</td>`).join("")}</tr></tfoot>` : "";
    return `<div class="lap-wrap"><table class="lap-table">
      <thead><tr>${heads.map((h, i) => `<th class="${i > 0 && h.num ? "num" : ""}">${h.t || h}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>${tfoot}
    </table></div>`;
  }

  const groupRow = (g) => `<tr>
      <td>${esc(g.label)}</td>
      <td class="num">${g.count}</td>
      <td class="num">${g.qty}</td>
      <td class="num">${fmtRp(g.omzet)}</td>
      <td class="num">${fmtRp(g.modal)}</td>
      <td class="num ${signed(g.untung)}">${fmtRp(g.untung)}</td>
    </tr>`;

  const groupHeads = (first) => [
    first, { t: "Order", num: true }, { t: "Qty", num: true }, { t: "Omzet", num: true },
    { t: "Modal", num: true }, { t: "Untung", num: true }
  ];

  function groupFoot(list, label) {
    const t = list.reduce((a, g) => {
      a.count += g.count; a.qty += g.qty; a.omzet += g.omzet; a.modal += g.modal; a.untung += g.untung;
      return a;
    }, { count: 0, qty: 0, omzet: 0, modal: 0, untung: 0 });
    return [
      { v: label }, { v: t.count, cls: "num" }, { v: t.qty, cls: "num" }, { v: fmtRp(t.omzet), cls: "num" },
      { v: fmtRp(t.modal), cls: "num" }, { v: fmtRp(t.untung), cls: "num " + signed(t.untung) }
    ];
  }

  function render() {
    const c = state.container;
    if (!c) return;
    const d = compute();

    const chips = PERIODS.map((p) =>
      `<button class="lap-chip ${p.id === state.period ? "active" : ""}" data-period="${p.id}">${p.label}</button>`
    ).join("");

    const custom = state.period === "custom" ? `
      <div class="lap-range">
        <input type="date" name="from" value="${state.from}" />
        <span>s/d</span>
        <input type="date" name="to" value="${state.to}" />
      </div>` : "";

    const cashRows = d.cash.slice().sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || ""))
      .map((x) => `<tr>
        <td>${fmtDate(x.entry_date)}</td>
        <td>${x.kind === "pemasukan" ? "Pemasukan" : "Pengeluaran"}</td>
        <td>${esc(x.category)}</td>
        <td>${esc(x.note || "-")}</td>
        <td class="num ${x.kind === "pemasukan" ? "lap-pos" : "lap-neg"}">${fmtRp(x.amount)}</td>
        <td><button class="lap-del" type="button" data-del="${x.id}">Hapus</button></td>
      </tr>`);

    c.innerHTML = `
      <div class="card lap-sec">
        <div class="lap-head">
          <h3>Periode</h3>
          <span class="lap-muted">${esc(d.r.label)} · ${d.count} transaksi</span>
        </div>
        <div class="lap-chips">${chips}</div>
        ${custom}
        <div class="lap-tools"><button class="btn" id="lap-export" type="button">Export Excel</button></div>
      </div>

      <div class="lap-grid">
        ${statCard("s-pink", "Omzet", fmtRp(d.omzet), `${d.qty} unit terjual`)}
        ${statCard("s-blue", "Untung Kotor", fmtRp(d.untung), "Omzet dikurangi modal")}
        ${statCard("s-butter", "Total Modal", fmtRp(d.modal), "Dari transaksi periode ini")}
        ${statCard("s-green", "Untung Bersih", fmtRp(d.bersih), `Pemasukan ${fmtRp(d.pemasukan)} · pengeluaran ${fmtRp(d.pengeluaran)}`)}
      </div>

      <div class="lap-grid three">
        ${statCard("s-blue", "Sudah Lunas", fmtRp(d.pay["Lunas"]), "Pembayaran penuh")}
        ${statCard("s-pink", "DP / Sebagian", fmtRp(d.pay["DP / Dibayar Sebagian"]), "Baru dibayar sebagian")}
        ${statCard("s-butter", "Belum Lunas", fmtRp(d.pay["Belum Lunas"]), "Masih menunggu pembayaran")}
      </div>

      <div class="card lap-sec">
        <div class="lap-head"><h3>Rekap per Periode</h3><span class="lap-muted">${d.periode.length} periode</span></div>
        ${table(groupHeads("Periode"), d.periode.map(groupRow), groupFoot(d.periode, "Total"))}
      </div>

      <div class="card lap-sec">
        <div class="lap-head"><h3>Rekap per Aplikasi</h3><span class="lap-muted">${d.apps.length} aplikasi</span></div>
        ${table(groupHeads("Aplikasi"), d.apps.map(groupRow), groupFoot(d.apps, "Total"))}
      </div>

      <div class="card lap-sec">
        <div class="lap-head"><h3>Rekap per Supplier</h3><span class="lap-muted">${d.supp.length} supplier</span></div>
        ${table(
          [{ t: "Supplier" }, { t: "Transaksi", num: true }, { t: "Qty", num: true }, { t: "Total Modal", num: true }],
          d.supp.map((g) => `<tr>
            <td>${esc(g.label)}</td>
            <td class="num">${g.count}</td>
            <td class="num">${g.qty}</td>
            <td class="num">${fmtRp(g.modal)}</td>
          </tr>`),
          [{ v: "Total" }, { v: d.supp.reduce((a, g) => a + g.count, 0), cls: "num" },
            { v: d.supp.reduce((a, g) => a + g.qty, 0), cls: "num" },
            { v: fmtRp(d.supp.reduce((a, g) => a + g.modal, 0)), cls: "num" }]
        )}
      </div>

      <div class="card lap-sec">
        <div class="lap-head">
          <h3>Riwayat Keuangan</h3>
          <span class="lap-muted">Pemasukan lain dan pengeluaran di luar order</span>
        </div>
        <form id="lap-cash-form" class="lap-form">
          <label><span>Tanggal</span><input type="date" name="date" value="${toISO(today())}" required /></label>
          <label><span>Jenis</span>
            <select name="kind">
              <option value="pengeluaran">Pengeluaran</option>
              <option value="pemasukan">Pemasukan lain</option>
            </select>
          </label>
          <label class="full"><span>Kategori</span>
            <input name="category" list="lap-kat" placeholder="Pilih atau ketik sendiri" required />
            <datalist id="lap-kat">${KATEGORI.map((k) => `<option value="${esc(k)}"></option>`).join("")}</datalist>
          </label>
          <label><span>Jumlah (Rp)</span><input type="number" name="amount" min="1" step="1" required /></label>
          <label class="full"><span>Catatan</span><input name="note" placeholder="opsional" /></label>
          <div class="full"><button class="btn" id="lap-save" type="submit">Simpan catatan</button></div>
        </form>
        ${state.msg ? `<p class="lap-msg">${esc(state.msg)}</p>` : ""}
        ${state.err ? `<p class="lap-err">${esc(state.err)}</p>` : ""}
        ${table(
          [{ t: "Tanggal" }, { t: "Jenis" }, { t: "Kategori" }, { t: "Catatan" }, { t: "Jumlah", num: true }, { t: "" }],
          cashRows
        )}
      </div>`;
    restoreCashDraft();
  }

  // ---------- Export Excel ----------
  function exportExcel() {
    if (typeof XLSX === "undefined") {
      alert("Library Excel belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
      return;
    }
    const d = compute();
    const wb = XLSX.utils.book_new();

    // Lebar kolom disesuaikan dengan isi, supaya tulisan tidak terpotong
    const autoCols = (rows) => {
      const keys = Object.keys(rows[0] || {});
      return keys.map((k) => ({
        wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length), 10) + 2
      }));
    };
    const sheetOf = (rows) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = autoCols(rows);
      return ws;
    };

    const ringkas = [
      ["Laporan Toko Hazze"],
      ["Periode", d.r.label],
      [],
      ["Ringkasan", "Nilai"],
      ["Omzet", d.omzet],
      ["Total modal", d.modal],
      ["Untung kotor", d.untung],
      ["Pemasukan lain", d.pemasukan],
      ["Pengeluaran", d.pengeluaran],
      ["Untung bersih", d.bersih],
      [],
      ["Status pembayaran", "Nilai"],
      ["Lunas", d.pay["Lunas"]],
      ["DP / Dibayar Sebagian", d.pay["DP / Dibayar Sebagian"]],
      ["Belum Lunas", d.pay["Belum Lunas"]]
    ];
    const wsRingkas = XLSX.utils.aoa_to_sheet(ringkas);
    wsRingkas["!cols"] = [{ wch: 26 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsRingkas, "Ringkasan");

    const grup = (g, label) => g.map((x) => ({
      [label]: x.label, Order: x.count, Qty: x.qty, Omzet: x.omzet, Modal: x.modal, Untung: x.untung
    }));
    XLSX.utils.book_append_sheet(wb, sheetOf(grup(d.periode, "Periode")), "Per Periode");
    XLSX.utils.book_append_sheet(wb, sheetOf(grup(d.apps, "Aplikasi")), "Per Aplikasi");
    XLSX.utils.book_append_sheet(wb, sheetOf(d.supp.map((x) => ({
      Supplier: x.label, Transaksi: x.count, Qty: x.qty, "Total Modal": x.modal
    }))), "Per Supplier");

    const kas = d.cash.map((x) => ({
      Tanggal: x.entry_date,
      Jenis: x.kind === "pemasukan" ? "Pemasukan" : "Pengeluaran",
      Kategori: x.category,
      Catatan: x.note || "",
      Jumlah: num(x.amount)
    }));
    XLSX.utils.book_append_sheet(wb, sheetOf(kas), "Riwayat Keuangan");

    const detail = d.orders.map((x) => ({
      Tanggal: x.order_date,
      "ID Transaksi": x.transaction_id,
      Customer: x.customers?.name || "",
      Aplikasi: x.app_name,
      Durasi: x.duration,
      Jumlah: x.quantity,
      Supplier: x.supplier_name || "",
      "Harga Jual": num(x.total_sell),
      Modal: num(x.total_cost),
      Keuntungan: num(x.total_sell) - num(x.total_cost),
      "Status Pembayaran": x.payment_status,
      "Status Pengerjaan": x.work_status
    }));
    XLSX.utils.book_append_sheet(wb, sheetOf(detail), "Detail Transaksi");

    XLSX.writeFile(wb, `laporan-toko-hazze-${toISO(new Date())}.xlsx`);
  }

  // ---------- Draf formulir keuangan (lihat draft.js) ----------
  function saveCashDraft() {
    const f = state.container && state.container.querySelector("#lap-cash-form");
    if (f) window.hazzeDraft.save("cash", window.hazzeDraft.collect(f));
  }

  function restoreCashDraft() {
    const f = state.container && state.container.querySelector("#lap-cash-form");
    const d = window.hazzeDraft.load("cash");
    if (f && d) window.hazzeDraft.apply(f, d);
  }

  // ---------- Event ----------
  function bind(c) {
    if (c.dataset.bound) return;
    c.dataset.bound = "1";

    c.addEventListener("click", async (e) => {
      const p = e.target.closest("[data-period]");
      if (p) {
        state.period = p.dataset.period;
        state.msg = "";
        state.err = "";
        if (state.period === "custom" && !state.from) {
          const t = today();
          state.from = toISO(addDays(t, -29));
          state.to = toISO(t);
        }
        render();
        return;
      }
      if (e.target.closest("#lap-export")) { exportExcel(); return; }

      const del = e.target.closest("[data-del]");
      if (del) {
        if (!confirm("Hapus catatan keuangan ini?")) return;
        const { error } = await sb().from("cash_entries").delete().eq("id", del.dataset.del);
        if (error) { state.err = "Gagal menghapus: " + error.message; render(); return; }
        state.msg = "Catatan dihapus.";
        state.err = "";
        await loadAll();
        render();
      }
    });

    c.addEventListener("input", (e) => {
      if (e.target.form && e.target.form.id === "lap-cash-form") saveCashDraft();
    });
    c.addEventListener("change", (e) => {
      if (e.target.form && e.target.form.id === "lap-cash-form") saveCashDraft();
      const n = e.target.name;
      if (n === "from" || n === "to") {
        state[n] = e.target.value;
        render();
      }
    });

    c.addEventListener("submit", async (e) => {
      if (e.target.id !== "lap-cash-form") return;
      e.preventDefault();
      const f = e.target;
      const amount = Number(f.elements.amount.value);
      if (!amount || amount <= 0) {
        state.err = "Jumlah harus lebih dari 0.";
        state.msg = "";
        render();
        return;
      }
      const btn = f.querySelector("#lap-save");
      btn.disabled = true;
      const { error } = await sb().from("cash_entries").insert({
        entry_date: f.elements.date.value,
        kind: f.elements.kind.value,
        category: f.elements.category.value.trim(),
        amount,
        note: f.elements.note.value.trim() || null
      });
      btn.disabled = false;
      if (error) {
        state.err = "Gagal menyimpan: " + error.message;
        state.msg = "";
        render();
        return;
      }
      window.hazzeDraft.clear("cash");
      state.msg = "Catatan tersimpan.";
      state.err = "";
      await loadAll();
      render();
    });
  }

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("lap-style")) return;
    const s = document.createElement("style");
    s.id = "lap-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.renderLaporan = async function (container) {
    injectStyle();
    state.container = container;
    bind(container);
    container.innerHTML = `<p class="lap-muted" style="text-align:center;margin-top:24px">Memuat laporan...</p>`;
    try {
      await loadAll();
      render();
    } catch (err) {
      container.innerHTML = `<div class="card">
        <p>Laporan belum bisa dimuat.</p>
        <p class="lap-muted">${esc(err.message || err)}</p>
      </div>`;
    }
  };
})();
