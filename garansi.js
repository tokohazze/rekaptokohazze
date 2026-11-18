// Toko Hazze — Garansi akun: menghentikan masa aktif sementara, lalu menambah tanggal expired saat garansi selesai.
(function () {
  const CSS = `
  .gar-box{margin-top:16px;padding:14px;border-radius:18px;background:var(--cream);border:2px dashed #d3cbf3}
  .gar-box h4{font-family:var(--font-display);margin:0 0 8px;font-size:17px}
  .gar-form{display:grid;gap:8px;margin-top:6px}
  .gar-form label span{display:block;font-size:13px;font-weight:700;margin-bottom:4px}
  .gar-form input{width:100%;padding:10px 12px;border:2px solid var(--blue);border-radius:12px;font:inherit;background:#fff;color:var(--text)}
  .gar-form .chip{justify-self:start}
  .gar-muted{font-size:13px;color:var(--text-soft);margin:6px 0}
  .gar-warn{font-size:14px;font-weight:700;color:#b4465f;margin:6px 0}
  .gar-err{font-size:14px;color:#c0546f;margin:6px 0 0;min-height:4px}
  .gar-list{margin:4px 0 0;padding-left:18px;font-size:13px}
  `;

  // Batas garansi: 3 x 24 jam
  const MAX_JAM = 72;
  const MAX_HARI = MAX_JAM / 24;

  const state = { rows: [], busy: false };
  const sb = () => window.hazzeSb;
  const pad = (n) => String(n).padStart(2, "0");
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const addDaysISO = (dateStr, n) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const x = new Date(y, m - 1, d + n);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  };
  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const jamSejak = (iso) => (Date.now() - new Date(iso).getTime()) / 3600000;

  // ---------- Data ----------
  async function load() {
    const { data, error } = await sb().from("warranties").select("*").order("started_at", { ascending: false });
    if (error) {
      // Tabel garansi belum dibuat di Supabase. Fitur lain tetap bisa dipakai.
      state.rows = [];
      state.missing = true;
      return;
    }
    state.missing = false;
    state.rows = data || [];
  }

  async function startGaransi(orderId, reason) {
    if (!reason) throw new Error("Isi alasan atau masalah akun terlebih dahulu.");
    const { error: e1 } = await sb().from("warranties").insert({ order_id: orderId, reason });
    if (e1) throw e1;
    const { error: e2 } = await sb().from("orders").update({ service_status: "Garansi" }).eq("id", orderId);
    if (e2) throw e2;
  }

  async function finishGaransi(warrantyId, days, result) {
    if (!(days >= 0) || !Number.isInteger(days)) throw new Error("Jumlah hari harus bilangan bulat, 0 atau lebih.");
    const w = state.rows.find((x) => x.id === warrantyId);
    if (!w) throw new Error("Data garansi tidak ditemukan. Muat ulang halaman.");

    const reason = result ? `${w.reason || ""} | Hasil: ${result}`.replace(/^ \| /, "") : w.reason;
    const { error: e1 } = await sb().from("warranties")
      .update({ ended_at: new Date().toISOString(), days_added: days, reason })
      .eq("id", warrantyId);
    if (e1) throw e1;

    // Tanggal expired ditambah sejumlah hari garansi, lalu status layanan disesuaikan.
    const { data: ord, error: e2 } = await sb().from("orders").select("expired_date").eq("id", w.order_id).single();
    if (e2) throw e2;
    const newExp = addDaysISO(ord.expired_date, days);
    const status = newExp < todayISO() ? "Expired" : "Aktif";
    const { error: e3 } = await sb().from("orders")
      .update({ expired_date: newExp, service_status: status })
      .eq("id", w.order_id);
    if (e3) throw e3;
  }

  // ---------- Tampilan (dipasang di jendela Detail Transaksi) ----------
  function sectionHtml(order) {
    if (state.missing) {
      return `<div class="gar-box"><h4>Garansi</h4>
        <p class="gar-warn">Tabel garansi belum dibuat di Supabase. Jalankan sql/garansi.sql dulu.</p></div>`;
    }
    const list = state.rows.filter((w) => w.order_id === order.id);
    const aktif = list.find((w) => !w.ended_at);
    let body;

    if (aktif) {
      const jam = jamSejak(aktif.started_at);
      const usulan = Math.min(Math.ceil(jam / 24), MAX_HARI);
      body = `
        <p>Garansi berjalan sejak <b>${fmtDT(aktif.started_at)}</b> (sudah ${Math.floor(jam)} jam).</p>
        ${jam > MAX_JAM ? `<p class="gar-warn">Sudah melewati batas garansi ${MAX_HARI}×24 jam.</p>` : ""}
        <p class="gar-muted">Masa aktif layanan ditahan sementara. Tanggal expired akan ditambah setelah garansi selesai.</p>
        <form class="gar-form" data-gar-form="finish" data-id="${aktif.id}">
          <label><span>Jumlah hari yang ditambahkan</span>
            <input type="number" name="days" min="0" step="1" value="${usulan}" required /></label>
          <label><span>Hasil penanganan (opsional)</span>
            <input name="result" placeholder="contoh: akun sudah normal kembali" /></label>
          <button class="chip" type="submit">Selesaikan Garansi</button>
        </form>`;
    } else {
      body = `
        <form class="gar-form" data-gar-form="start" data-id="${order.id}">
          <label><span>Masalah akun</span>
            <input name="reason" required placeholder="contoh: akun tidak bisa login" /></label>
          <button class="chip" type="submit">Mulai Garansi</button>
        </form>
        <p class="gar-muted">Masa aktif berhenti selama garansi berjalan, maksimal ${MAX_HARI}×24 jam.</p>`;
    }

    const riwayat = list.filter((w) => w.ended_at).map((w) => `<li>
        ${fmtDT(w.started_at)} s/d ${fmtDT(w.ended_at)} · +${w.days_added} hari
        ${w.reason ? `· ${esc(w.reason)}` : ""}
      </li>`).join("");

    return `<div class="gar-box">
      <h4>Garansi</h4>
      ${body}
      ${riwayat ? `<p class="gar-muted">Riwayat garansi:</p><ul class="gar-list">${riwayat}</ul>` : ""}
      <p class="gar-err" data-gar-err></p>
    </div>`;
  }

  // ---------- Event ----------
  document.addEventListener("submit", async (e) => {
    const f = e.target;
    const kind = f.dataset && f.dataset.garForm;
    if (!kind) return;
    e.preventDefault();
    if (state.busy) return;
    state.busy = true;
    const err = f.closest(".gar-box").querySelector("[data-gar-err]");
    err.textContent = "";
    try {
      if (kind === "start") {
        await startGaransi(f.dataset.id, f.elements.reason.value.trim());
      } else {
        await finishGaransi(f.dataset.id, Number(f.elements.days.value), f.elements.result.value.trim());
      }
      await load();
      if (window.hazzeRefresh) await window.hazzeRefresh();
    } catch (ex) {
      err.textContent = "Gagal: " + (ex.message || ex);
    } finally {
      state.busy = false;
    }
  });

  // ---------- Gaya ----------
  const s = document.createElement("style");
  s.id = "gar-style";
  s.textContent = CSS;
  document.head.appendChild(s);

  window.hazzeGaransi = { load, sectionHtml, MAX_JAM, MAX_HARI };
})();
