// Toko Hazze — Tahap 2: Dashboard (statistik dan grafik dari database).
(function () {
  const CSS = `
  .stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
  @media (min-width:900px){.stat-grid{grid-template-columns:repeat(4,1fr)}}
  .stat{border-radius:22px;padding:16px;border:none;position:relative;box-shadow:0 7px 0 rgba(104,80,63,.16),0 16px 26px rgba(104,80,63,.16),inset 0 2px 0 rgba(255,255,255,.9),inset 0 -3px 0 rgba(104,80,63,.07);outline:2px dashed rgba(255,255,255,.85);outline-offset:-8px}
  .s-pink{background:linear-gradient(160deg,#fde9f5 0%,#f7d1e8 55%,#eebddc 100%)}
  .s-blue{background:linear-gradient(160deg,#d6f4ee 0%,#b1e5db 55%,#93d6c8 100%)}
  .s-butter{background:linear-gradient(160deg,#ebe6fa 0%,#d3cbf3 55%,#bfb4e8 100%)}
  .s-green{background:linear-gradient(160deg,#ffffff 0%,#fdf8f4 60%,#f5ebe3 100%)}
  .s-icon{font-size:22px}
  .s-title{font-size:13px;font-weight:700;margin-top:6px}
  .s-value{font-family:var(--font-body);font-weight:800;font-size:20px;margin-top:2px;word-break:break-word}
  .s-sub{font-size:12px;opacity:.8;margin-top:4px}
  .active-card{margin-bottom:16px}
  .chart-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px}
  .chart-head h3{margin:0}
  .chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
  .chip{font:inherit;font-size:13px;font-weight:700;border:2px solid var(--blue);background:#fff;color:var(--text);border-radius:999px;padding:6px 12px;cursor:pointer}
  .chip.active{background:var(--pink);border-color:var(--pink-deep)}
  .range-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
  .range-row input{font:inherit;padding:6px 8px;border:2px solid var(--blue);border-radius:10px}
  .totals{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;margin:8px 0 12px}
  .totals b{font-family:var(--font-body);font-size:17px;color:var(--pink-deep)}
  .totals .green{color:var(--green-deep)}
  .chart-box{position:relative;height:260px}
  .muted{color:var(--text-soft);font-size:14px}
  .note{text-align:center;margin-top:10px}
  `;

  const PERIODS = [
    { id: "week", label: "Mingguan" },
    { id: "month", label: "Bulanan" },
    { id: "six", label: "Enam bulan" },
    { id: "custom", label: "Rentang khusus" }
  ];
  const ACTIVE_STATUS = ["Menunggu", "Diproses", "Pending"];

  const state = {
    container: null,
    period: "week",
    from: "",
    to: "",
    orders: [],
    expenses: []
  };

  // ---------- Utilitas tanggal (waktu lokal, format YYYY-MM-DD) ----------
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

  function currentRange() {
    const t = today();
    if (state.period === "week") return { from: toISO(addDays(t, -6)), to: toISO(t), label: "7 hari terakhir" };
    if (state.period === "month") return { from: toISO(addDays(t, -29)), to: toISO(t), label: "30 hari terakhir" };
    if (state.period === "six") {
      const first = new Date(t.getFullYear(), t.getMonth() - 5, 1);
      return { from: toISO(first), to: toISO(t), label: "6 bulan terakhir" };
    }
    if (state.from && state.to) return { from: state.from, to: state.to, label: `${state.from} s/d ${state.to}` };
    return { from: "", to: "", label: "Pilih rentang tanggal" };
  }

  // Jika rentang lebih dari 62 hari, grafik dibuat per bulan agar tetap terbaca.
  function makeBuckets(from, to) {
    if (!from || !to) return { keys: [], monthly: false };
    const a = parseISO(from), b = parseISO(to);
    const days = Math.round((b - a) / 86400000);
    const monthly = state.period === "six" || days > 62;
    const keys = [];
    if (monthly) {
      let y = a.getFullYear(), m = a.getMonth();
      while (y < b.getFullYear() || (y === b.getFullYear() && m <= b.getMonth())) {
        const label = new Date(y, m, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
        keys.push({ key: `${y}-${pad(m + 1)}`, label });
        m++;
        if (m > 11) { m = 0; y++; }
      }
    } else {
      for (let d = new Date(a); d <= b; d = addDays(d, 1)) {
        keys.push({ key: toISO(d), label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` });
      }
    }
    return { keys, monthly };
  }

  // ---------- Data ----------
  async function load() {
    const sb = window.hazzeSb;
    const [o, e] = await Promise.all([
      sb.from("orders")
        .select("order_date,quantity,total_sell,total_cost,work_status,payment_status")
        .neq("work_status", "Dibatalkan"),
      sb.from("cash_entries").select("entry_date,kind,amount")
    ]);
    if (o.error) throw o.error;
    if (e.error) throw e.error;
    state.orders = o.data || [];
    state.expenses = e.data || [];
  }

  // ---------- Tampilan ----------
  function statCard(cls, icon, title, value, sub) {
    return `<div class="stat ${cls}">
      <div class="s-icon">${icon}</div>
      <div class="s-title">${title}</div>
      <div class="s-value">${value}</div>
      <div class="s-sub">${sub}</div>
    </div>`;
  }

  function render() {
    const c = state.container;
    if (!c) return;
    const r = currentRange();
    const orders = state.orders;

    let sold = 0, omzet = 0, omzetLunas = 0, modal = 0, active = 0;
    orders.forEach((x) => {
      const s = Number(x.total_sell) || 0;
      const m = Number(x.total_cost) || 0;
      sold += Number(x.quantity) || 0;
      omzet += s;
      modal += m;
      if (x.payment_status === "Lunas") omzetLunas += s;
      if (ACTIVE_STATUS.includes(x.work_status)) active++;
    });
    const pengeluaran = state.expenses
      .filter((x) => x.kind === "pengeluaran")
      .reduce((a, x) => a + (Number(x.amount) || 0), 0);
    const pemasukan = state.expenses
      .filter((x) => x.kind === "pemasukan")
      .reduce((a, x) => a + (Number(x.amount) || 0), 0);
    const bersih = omzet - modal + pemasukan - pengeluaran;

    // Data grafik
    const { keys, monthly } = makeBuckets(r.from, r.to);
    const map = {};
    keys.forEach((k) => (map[k.key] = { omzet: 0, untung: 0 }));
    orders.forEach((x) => {
      if (!x.order_date) return;
      const k = monthly ? x.order_date.slice(0, 7) : x.order_date;
      if (!map[k]) return;
      const s = Number(x.total_sell) || 0;
      const m = Number(x.total_cost) || 0;
      map[k].omzet += s;
      map[k].untung += s - m;
    });
    const pOmzet = keys.reduce((a, k) => a + map[k.key].omzet, 0);
    const pUntung = keys.reduce((a, k) => a + map[k.key].untung, 0);

    c.innerHTML = `
      <div class="stat-grid">
        ${statCard("s-pink", "🌸", "Produk Terjual", `${sold} unit`, "Sepanjang waktu")}
        ${statCard("s-blue", "💌", "Total Omzet", fmtRp(omzet), `Sudah lunas: ${fmtRp(omzetLunas)}`)}
        ${statCard("s-butter", "🧺", "Total Modal", fmtRp(modal), "Dari semua transaksi")}
        ${statCard("s-green", "🎀", "Total Bersih", fmtRp(bersih), `Pengeluaran: ${fmtRp(pengeluaran)}`)}
      </div>

      <div class="card active-card">
        <div class="muted">Order yang masih aktif (menunggu, diproses, atau pending)</div>
        <div class="s-value">${active} order</div>
      </div>

      <div class="card">
        <div class="chart-head">
          <h3>Grafik Penjualan</h3>
          <span class="muted">${r.label}</span>
        </div>

        <div class="chip-row">
          ${PERIODS.map((p) =>
            `<button class="chip ${p.id === state.period ? "active" : ""}" data-period="${p.id}">${p.label}</button>`
          ).join("")}
        </div>

        ${state.period === "custom" ? `
        <div class="range-row">
          <input type="date" id="range-from" value="${state.from}" />
          <span>s/d</span>
          <input type="date" id="range-to" value="${state.to}" />
          <button class="chip" id="range-apply">Terapkan</button>
        </div>` : ""}

        <div class="totals">
          <span>Omzet: <b>${fmtRp(pOmzet)}</b></span>
          <span>Keuntungan (kotor): <b class="green">${fmtRp(pUntung)}</b></span>
        </div>

        <div class="chart-box"><canvas id="sales-chart"></canvas></div>

        ${orders.length === 0
          ? `<p class="muted note">🌷 Belum ada transaksi. Grafik akan terisi setelah Input Order dibuat.</p>`
          : ""}
      </div>`;

    // Event tombol periode
    c.querySelectorAll("[data-period]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.period = btn.dataset.period;
        if (state.period === "custom" && !state.from) {
          const t = today();
          state.from = toISO(addDays(t, -29));
          state.to = toISO(t);
        }
        render();
      })
    );

    const apply = c.querySelector("#range-apply");
    if (apply) {
      apply.addEventListener("click", () => {
        const f = c.querySelector("#range-from").value;
        const t = c.querySelector("#range-to").value;
        if (!f || !t || f > t) {
          alert("Pilih tanggal awal dan akhir dengan benar (awal tidak boleh setelah akhir).");
          return;
        }
        state.from = f;
        state.to = t;
        render();
      });
    }

    drawChart(c, keys, map);
  }

  let chart = null;
  function drawChart(c, keys, map) {
    const canvas = c.querySelector("#sales-chart");
    if (chart) { chart.destroy(); chart = null; }
    if (!canvas || !window.Chart) return;
    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: keys.map((k) => k.label),
        datasets: [
          {
            label: "Omzet",
            data: keys.map((k) => map[k.key].omzet),
            borderColor: "#68503f",
            backgroundColor: "rgba(247,209,232,0.6)",
            tension: 0.35,
            fill: true
          },
          {
            label: "Keuntungan (kotor)",
            data: keys.map((k) => map[k.key].untung),
            borderColor: "#8fd3c1",
            backgroundColor: "rgba(177,229,219,0.5)",
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: {
          y: { ticks: { callback: (v) => "Rp " + Number(v).toLocaleString("id-ID") } }
        }
      }
    });
  }

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("dash-style")) return;
    const s = document.createElement("style");
    s.id = "dash-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Hanya menulis ke layar jika halaman Dashboard masih terbuka.
  // Tanpa pengecekan ini, data yang selesai dimuat terlambat bisa menimpa halaman lain (mis. Input Order).
  const onDashboard = () => window.currentPage === "dashboard" && !!state.container;

  async function loadAndRender() {
    if (!onDashboard()) return;
    try {
      await load();
      if (!onDashboard()) return;
      render();
    } catch (err) {
      if (onDashboard()) {
        state.container.innerHTML = `<div class="card note">
          <p>Data dashboard belum bisa dimuat.</p>
          <p class="muted">${err.message || err}</p>
        </div>`;
      }
    }
  }

  window.renderDashboard = function (container) {
    injectStyle();
    state.container = container;
    container.innerHTML = `<p class="muted note">Memuat data...</p>`;
    loadAndRender();
  };

  // Perbarui otomatis setiap 60 detik selama halaman dashboard sedang terbuka.
  setInterval(() => {
    if (onDashboard()) loadAndRender();
  }, 60000);
})();
