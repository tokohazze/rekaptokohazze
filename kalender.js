// Toko Hazze — Tahap 6: Kalender Pengingat (kalender bulanan, lonceng pengingat, status otomatis).
(function () {
  const CSS = `
  .cal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
  .cal-head h3{margin:0;text-align:center;flex:1}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
  .dow{text-align:center;font-size:12px;font-weight:700;color:var(--text-soft);padding:4px 0}
  .cell{border:none;border-radius:12px;min-height:50px;padding:6px 4px;font:inherit;font-size:14px;font-weight:700;color:var(--text);cursor:pointer;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:#fff;border:2px solid transparent}
  .cell.empty{background:transparent;cursor:default}
  .cell em{font-style:normal;font-size:11px;background:#fff;border-radius:999px;padding:0 6px;color:var(--text)}
  .cell.green{background:var(--green)}
  .cell.butter{background:var(--butter)}
  .cell.pink{background:var(--pink)}
  .cell.grey{background:#ece6e2;color:#68503f}
  .cell.today{border-color:var(--pink-deep)}
  .cell.sel{box-shadow:0 0 0 3px var(--blue) inset}
  .legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;margin-top:12px;color:var(--text-soft)}
  .legend span{display:inline-flex;align-items:center;gap:4px}
  .legend i{display:inline-block;width:14px;height:14px;border-radius:4px}
  .day-card{margin-top:14px}
  .item{background:var(--cream);border-radius:14px;padding:12px;margin-bottom:8px;font-size:14px}
  .item b{font-family:var(--font-body);font-size:16px}
  .item .rem{font-weight:700;margin-top:4px}
  .muted{color:var(--text-soft);font-size:14px}
  .chip{font:inherit;font-size:13px;font-weight:700;border:2px solid var(--blue);background:#fff;color:var(--text);border-radius:999px;padding:6px 12px;cursor:pointer}
  .btn{font:inherit;font-weight:700;border:none;border-radius:999px;padding:9px 16px;cursor:pointer;background:var(--pink);color:var(--text);box-shadow:var(--shadow);font-size:14px}
  .btn-ghost{background:var(--white)}
  .bell{background:none;border:none;cursor:pointer;position:relative;font-size:20px;padding:0 4px}
  .bell-count{position:absolute;top:-4px;right:-6px;background:var(--pink-deep);color:#fff;font-size:11px;font-weight:700;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px}
  .overlay{position:fixed;inset:0;background:rgba(114,36,110,.35);display:grid;place-items:center;padding:16px;z-index:60}
  .modal{background:var(--white);border-radius:24px;padding:20px;max-width:480px;width:100%;max-height:85vh;overflow:auto;box-shadow:var(--shadow);border:2px dashed var(--pink)}
  .modal h3{margin-bottom:10px}
  .group-title{font-family:var(--font-body);color:var(--pink-deep);margin:12px 0 6px;font-size:15px}
  .note{text-align:center;padding:20px}
  `;

  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  const state = {
    container: null,
    rows: [],
    y: new Date().getFullYear(),
    m: new Date().getMonth(),
    selected: null
  };

  const sb = () => window.hazzeSb;
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const fmtDate = (s) => (s ? parseISO(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const varLabel = (v) => v || "Standar";
  const diffDays = (exp) => Math.round((parseISO(exp) - today()) / 86400000);

  // ---------- Data ----------
  // Layanan yang sudah lewat tanggal expired diberi status Expired, dan yang masih berlaku diberi status Aktif.
  // Riwayat transaksi tidak dihapus.
  async function syncStatuses() {
    const t = toISO(today());
    await sb().from("orders").update({ service_status: "Expired" })
      .lt("expired_date", t).neq("service_status", "Expired").neq("service_status", "Garansi");
    await sb().from("orders").update({ service_status: "Aktif" })
      .gte("expired_date", t).neq("service_status", "Aktif").neq("service_status", "Garansi");
  }

  async function loadOrders() {
    const { data, error } = await sb()
      .from("orders")
      .select("id,transaction_id,activation_date,expired_date,app_name,variant,duration,service_status,work_status,customers(name,phone)")
      .neq("work_status", "Dibatalkan")
      .not("expired_date", "is", null);
    if (error) throw error;
    state.rows = data || [];
  }

  // Kategori pengingat: 3 hari lagi, besok, hari ini, dan sudah expired (7 hari terakhir).
  function reminderGroups() {
    const g = { tigaHari: [], besok: [], hariIni: [], sudahLewat: [] };
    state.rows.forEach((x) => {
      if (x.service_status === "Garansi") return; // masa aktif sedang ditahan
      const d = diffDays(x.expired_date);
      if (d === 3) g.tigaHari.push(x);
      else if (d === 1) g.besok.push(x);
      else if (d === 0) g.hariIni.push(x);
      else if (d < 0 && d >= -7) g.sudahLewat.push(x);
    });
    return g;
  }

  function reminderCount() {
    const g = reminderGroups();
    return g.tigaHari.length + g.besok.length + g.hariIni.length + g.sudahLewat.length;
  }

  // ---------- Kalender ----------
  function dayClass(d, t) {
    const diff = Math.round((d - t) / 86400000);
    if (diff < 0) return "grey";
    if (diff === 0) return "pink";
    if (diff <= 3) return "butter";
    return "green";
  }

  function monthCells(y, m) {
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // minggu mulai Senin
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  function itemsOn(iso) {
    return state.rows.filter((x) => x.expired_date === iso);
  }

  function itemHtml(x) {
    const d = diffDays(x.expired_date);
    const rem = d < 0 ? `Sudah expired ${-d} hari lalu` : d === 0 ? "Expired hari ini" : `Sisa ${d} hari`;
    return `
      <div class="item">
        <b>${esc(x.customers?.name || "-")}</b>
        <div>${esc(x.customers?.phone || "")}</div>
        <div>${esc(x.app_name)} · ${esc(varLabel(x.variant))} · ${esc(x.duration)}</div>
        <div class="muted">Aktivasi ${fmtDate(x.activation_date)} · Expired ${fmtDate(x.expired_date)}</div>
        <div class="rem">${rem} · ${x.service_status === "Garansi" ? "Dalam garansi" : x.service_status === "Expired" || d < 0 ? "Expired" : "Aktif"}</div>
      </div>`;
  }

  function renderCalendar() {
    const c = state.container;
    if (!c) return;
    const t = today();
    const cells = monthCells(state.y, state.m);
    const byDate = {};
    state.rows.forEach((x) => { (byDate[x.expired_date] = byDate[x.expired_date] || []).push(x); });

    const cellHtml = (d) => {
      if (!d) return `<div class="cell empty"></div>`;
      const iso = toISO(d);
      const n = (byDate[iso] || []).length;
      const isToday = toISO(d) === toISO(t);
      const cls = [n ? dayClass(d, t) : "", isToday ? "today" : "", state.selected === iso ? "sel" : ""].join(" ");
      return `<button class="cell ${cls}" data-date="${iso}" type="button">
        <span>${d.getDate()}</span>${n ? `<em>${n}</em>` : ""}
      </button>`;
    };

    const sel = state.selected;
    const selItems = sel ? itemsOn(sel) : [];

    c.innerHTML = `
      <div class="card">
        <div class="cal-head">
          <button class="chip" data-nav="-1" type="button">‹</button>
          <h3>${MONTHS[state.m]} ${state.y}</h3>
          <button class="chip" data-nav="1" type="button">›</button>
        </div>
        <div style="text-align:center;margin-bottom:10px">
          <button class="chip" data-today type="button">Hari ini</button>
        </div>
        <div class="cal-grid">
          ${DOW.map((d) => `<div class="dow">${d}</div>`).join("")}
          ${cells.map(cellHtml).join("")}
        </div>
        <div class="legend">
          <span><i style="background:var(--green)"></i>Masih aktif</span>
          <span><i style="background:var(--butter)"></i>Akan expired (3 hari)</span>
          <span><i style="background:var(--pink)"></i>Expired hari ini</span>
          <span><i style="background:#ece6e2"></i>Sudah expired</span>
        </div>
      </div>

      <div class="card day-card">
        <h3>${sel ? fmtDate(sel) : "Pilih tanggal"}</h3>
        ${!sel ? `<p class="muted">Klik tanggal di kalender untuk melihat customer yang expired pada hari itu.</p>`
          : selItems.length === 0 ? `<p class="muted">Tidak ada layanan yang expired pada tanggal ini.</p>`
          : selItems.map(itemHtml).join("")}
      </div>`;
  }

  // ---------- Lonceng pengingat ----------
  function updateBell() {
    const el = document.getElementById("bell-count");
    if (!el) return;
    const n = reminderCount();
    el.textContent = n > 99 ? "99+" : String(n);
    el.hidden = n === 0;
  }

  function notifSupported() {
    return "Notification" in window;
  }

  function maybeBrowserNotify() {
    if (!notifSupported() || Notification.permission !== "granted") return;
    const n = reminderCount();
    if (!n) return;
    const key = "hazze-notif-" + toISO(today());
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch (e) { /* abaikan jika penyimpanan lokal diblokir */ }
    new Notification("Toko Hazze ✿", { body: `Ada ${n} layanan yang perlu diperhatikan hari ini.` });
  }

  function groupHtml(title, list) {
    if (!list.length) return "";
    return `<div class="group-title">${title} (${list.length})</div>` +
      list.map((x) => `
        <div class="item">
          <b>${esc(x.customers?.name || "-")}</b> · ${esc(x.customers?.phone || "")}
          <div>${esc(x.app_name)} · ${esc(varLabel(x.variant))} · expired ${fmtDate(x.expired_date)}</div>
        </div>`).join("");
  }

  function openBell() {
    const g = reminderGroups();
    const total = reminderCount();
    const notifBtn = notifSupported() && Notification.permission !== "granted"
      ? `<button class="btn" id="btn-notif" type="button">Aktifkan notifikasi browser</button>`
      : (notifSupported() && Notification.permission === "granted"
          ? `<p class="muted">Notifikasi browser sudah aktif. Pengingat muncul saat website dibuka.</p>` : "");
    const wrap = document.createElement("div");
    wrap.className = "overlay";
    wrap.id = "bell-overlay";
    wrap.innerHTML = `
      <div class="modal" role="dialog">
        <h3>Pengingat Layanan</h3>
        ${total === 0 ? `<p class="muted">Tidak ada pengingat saat ini. ✿</p>` : ""}
        ${groupHtml("3 hari lagi expired", g.tigaHari)}
        ${groupHtml("Expired besok", g.besok)}
        ${groupHtml("Expired hari ini", g.hariIni)}
        ${groupHtml("Sudah expired (7 hari terakhir)", g.sudahLewat)}
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          ${notifBtn}
          <button class="btn btn-ghost" id="btn-bell-close" type="button">Tutup</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }

  function closeBell() {
    const el = document.getElementById("bell-overlay");
    if (el) el.remove();
  }

  // ---------- Event ----------
  function onClick(e) {
    const t = e.target;
    const nav = t.closest("[data-nav]");
    if (nav) {
      state.m += Number(nav.dataset.nav);
      if (state.m < 0) { state.m = 11; state.y--; }
      if (state.m > 11) { state.m = 0; state.y++; }
      renderCalendar();
      return;
    }
    if (t.closest("[data-today]")) {
      const now = today();
      state.y = now.getFullYear();
      state.m = now.getMonth();
      state.selected = toISO(now);
      renderCalendar();
      return;
    }
    const cell = t.closest("[data-date]");
    if (cell) {
      state.selected = cell.dataset.date;
      renderCalendar();
    }
  }

  // Lonceng dan tombol di dalam panel pengingat dipasang sekali di dokumen.
  document.addEventListener("click", async (e) => {
    if (e.target.closest("#btn-bell")) {
      try { await loadOrders(); } catch (err) { /* tampilkan data terakhir */ }
      openBell();
      return;
    }
    if (e.target.closest("#btn-bell-close") || e.target.id === "bell-overlay") {
      closeBell();
      return;
    }
    if (e.target.closest("#btn-notif")) {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        new Notification("Toko Hazze ✿", { body: "Notifikasi aktif. Pengingat akan muncul saat website dibuka." });
      }
      closeBell();
      openBell();
    }
  });

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("kal-style")) return;
    const s = document.createElement("style");
    s.id = "kal-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Dipanggil saat login: perbarui status, hitung pengingat, dan tampilkan notifikasi (sekali sehari).
  window.refreshReminders = async function () {
    try {
      await syncStatuses();
      await loadOrders();
      updateBell();
      maybeBrowserNotify();
    } catch (err) {
      console.warn("Pengingat belum bisa diperbarui:", err.message || err);
    }
  };

  window.renderKalender = function (container) {
    injectStyle();
    state.container = container;
    if (!container.dataset.kalBound) {
      container.addEventListener("click", onClick);
      container.dataset.kalBound = "1";
    }
    if (!state.selected) state.selected = toISO(today());
    container.innerHTML = `<p class="muted note">Memuat kalender...</p>`;
    loadOrders()
      .then(() => { renderCalendar(); updateBell(); })
      .catch((err) => {
        container.innerHTML = `<div class="card note"><p>Kalender belum bisa dimuat.</p>
          <p class="muted">${esc(err.message || err)}</p></div>`;
      });
  };
})();
