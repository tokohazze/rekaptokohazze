// Toko Hazze — Testimoni: pasang tangkapan layar ke template bolong, lalu unduh sebagai gambar. Draf teks disimpan di browser.
(function () {
  const CSS = `
  .testi-grid{display:grid;grid-template-columns:1fr;gap:14px}
  @media (min-width:900px){.testi-grid{grid-template-columns:1.1fr 1fr}}
  .testi-sec{margin-bottom:0}
  .testi-sec h3{margin-bottom:8px}
  .testi-muted{color:var(--text-soft);font-size:13px;margin:6px 0}
  .testi-canvas-wrap{border-radius:16px;overflow:hidden;background:repeating-conic-gradient(#f3eef8 0% 25%,#fff 0% 50%) 50% / 24px 24px;border:2px dashed #d3cbf3;margin-top:10px}
  .testi-canvas-wrap canvas{display:block;width:100%;height:auto}
  .testi-row{display:grid;gap:6px;margin-top:10px}
  .testi-row label{font-size:13px;font-weight:700}
  .testi-row input[type=range]{width:100%;accent-color:var(--pink-deep)}
  .testi-file{display:block;margin-top:8px;font:inherit;font-size:14px}
  .testi-form{display:grid;gap:10px}
  .testi-form label span{display:block;font-size:13px;font-weight:700;margin-bottom:4px}
  .testi-form input,.testi-form select,.testi-form textarea{width:100%;padding:10px 12px;border:2px solid var(--blue);border-radius:12px;font:inherit;background:#fff;color:var(--text)}
  .testi-form textarea{min-height:90px;resize:vertical}
  .testi-list{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:10px}
  .testi-item{border:2px dashed #d3cbf3;border-radius:16px;padding:10px 12px;background:var(--cream)}
  .testi-item b{font-size:15px}
  .testi-item p{margin:4px 0;font-size:14px;white-space:pre-wrap}
  .testi-item .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
  .testi-chip{font:inherit;font-size:12px;font-weight:700;border:2px solid var(--blue);background:#fff;color:var(--text);border-radius:999px;padding:4px 10px;cursor:pointer}
  .testi-chip.danger{border-color:#f7d1e8;color:#b4465f}
  .testi-err{color:#c0546f;font-size:14px;font-weight:700;margin:6px 0 0}
  .testi-ok{color:#3f8a7a;font-size:14px;font-weight:700;margin:6px 0 0}
  `;

  const DB_NAME = "hazze-testi";
  const DB_STORE = "files";
  const DRAFT_KEY = "hazze-testi-drafts";

  const state = {
    container: null,
    tpl: null,        // gambar template (bolong)
    hole: null,       // area bolong dalam piksel template
    shot: null,       // tangkapan layar / foto testimoni
    zoom: 1,
    dx: 0,
    dy: 0,
    msg: "",
    err: ""
  };

  // ---------- Penyimpanan template (IndexedDB, bisa menyimpan file gambar) ----------
  function openDb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(DB_STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(key) {
    try {
      const db = await openDb();
      return await new Promise((res, rej) => {
        const q = db.transaction(DB_STORE).objectStore(DB_STORE).get(key);
        q.onsuccess = () => res(q.result || null);
        q.onerror = () => rej(q.error);
      });
    } catch (e) {
      return null;
    }
  }
  async function idbPut(key, value) {
    const db = await openDb();
    return new Promise((res, rej) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  // ---------- Gambar ----------
  function loadImage(blob) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("Gambar tidak bisa dibaca. Pakai file PNG atau JPG."));
      img.src = URL.createObjectURL(blob);
    });
  }

  // Mencari area bolong: piksel transparan yang tidak terhubung dengan tepi gambar
  function findHole(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const isClear = (i) => data[i * 4 + 3] < 128;

    const outside = new Uint8Array(w * h);
    const stack = [];
    const push = (i) => {
      if (!outside[i] && isClear(i)) { outside[i] = 1; stack.push(i); }
    };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop();
      const x = i % w, y = (i - x) / w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }

    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < w * h; i++) {
      if (outside[i] || !isClear(i)) continue;
      const x = i % w, y = (i - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 < 0) return { x: 0, y: 0, w, h };
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  // Menggambar: tangkapan layar di belakang, template di atas
  function compose(canvas) {
    const t = state.tpl;
    canvas.width = t.naturalWidth;
    canvas.height = t.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.shot) {
      const h = state.hole;
      const s = state.shot;
      const cover = Math.max(h.w / s.naturalWidth, h.h / s.naturalHeight) * state.zoom;
      const dw = s.naturalWidth * cover;
      const dh = s.naturalHeight * cover;
      const maxX = Math.max(0, (dw - h.w) / 2);
      const maxY = Math.max(0, (dh - h.h) / 2);
      const cx = h.x + h.w / 2 + (state.dx / 100) * maxX;
      const cy = h.y + h.h / 2 + (state.dy / 100) * maxY;
      ctx.save();
      ctx.beginPath();
      ctx.rect(h.x, h.y, h.w, h.h);
      ctx.clip();
      ctx.drawImage(s, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    }
    ctx.drawImage(t, 0, 0);
  }

  function drawPreview() {
    const c = state.container && state.container.querySelector("#testi-canvas");
    if (c && state.tpl) compose(c);
  }

  function downloadPng() {
    if (!state.tpl) return;
    const c = document.createElement("canvas");
    compose(c);
    c.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `testimoni-hazze-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  // ---------- Draf teks ----------
  function readDrafts() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function writeDrafts(list) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(list));
    } catch (e) {
      state.err = "Penyimpanan browser penuh. Hapus draf lama dulu.";
    }
  }
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");

  // ---------- Tampilan ----------
  function render() {
    const c = state.container;
    if (!c) return;
    const drafts = readDrafts();
    const today = new Date();
    const tgl = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const tplInfo = state.tpl
      ? `<p class="testi-muted">Template tersimpan. Area bolong terdeteksi otomatis.</p>`
      : `<p class="testi-muted">Belum ada template. Upload gambar PNG yang punya area bolong (transparan). Template hanya perlu diupload sekali.</p>`;

    c.innerHTML = `
      <div class="testi-grid">
        <div class="card testi-sec">
          <h3>Buat Testimoni</h3>
          <label class="testi-muted">1. ${state.tpl ? "Ganti template (opsional, kalau mau ganti)" : "Upload template (sekali saja)"}
            <input class="testi-file" type="file" name="tpl" accept="image/png,image/webp,image/jpeg" />
          </label>
          ${tplInfo}
          <label class="testi-muted">2. Upload tangkapan layar atau foto testimoni
            <input class="testi-file" type="file" name="shot" accept="image/*" ${state.tpl ? "" : "disabled"} />
          </label>
          ${state.tpl ? `
          <div class="testi-row">
            <label>Perbesar: <span id="zoom-val">${Math.round(state.zoom * 100)}%</span>
              <input type="range" name="zoom" min="100" max="300" value="${Math.round(state.zoom * 100)}" /></label>
            <label>Geser kiri-kanan
              <input type="range" name="dx" min="-100" max="100" value="${state.dx}" /></label>
            <label>Geser atas-bawah
              <input type="range" name="dy" min="-100" max="100" value="${state.dy}" /></label>
          </div>
          <div class="testi-canvas-wrap"><canvas id="testi-canvas"></canvas></div>
          <div class="form-actions"><button class="btn" id="testi-download" type="button" ${state.shot ? "" : "disabled"}>Unduh gambar</button></div>
          ${state.shot ? "" : `<p class="testi-muted">Upload tangkapan layar dulu untuk melihat hasilnya.</p>`}
          ` : `<div class="testi-canvas-wrap" style="padding:30px;text-align:center"><span class="testi-muted">Pratinjau muncul di sini setelah template diupload.</span></div>`}
          ${state.msg ? `<p class="testi-ok">${esc(state.msg)}</p>` : ""}
          ${state.err ? `<p class="testi-err">${esc(state.err)}</p>` : ""}
        </div>

        <div class="card testi-sec">
          <h3>Draf Testimoni</h3>
          <p class="testi-muted">Catatan teks tersimpan di browser ini. Gambarnya diunduh dan disimpan sendiri.</p>
          <form id="testi-draft-form" class="testi-form">
            <label><span>Nama customer</span><input name="nama" required /></label>
            <label><span>Aplikasi</span><input name="aplikasi" placeholder="contoh: Netflix" /></label>
            <label><span>Rating</span>
              <select name="rating">
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★ (4)</option>
                <option value="3">★★★ (3)</option>
              </select>
            </label>
            <label><span>Tanggal</span><input type="date" name="tanggal" value="${tgl}" /></label>
            <label><span>Isi testimoni</span><textarea name="isi" required></textarea></label>
            <div><button class="btn" type="submit">Simpan draf</button></div>
          </form>
          <ul class="testi-list">
            ${drafts.length === 0 ? `<li class="testi-muted">Belum ada draf.</li>` : drafts.map((d) => `
              <li class="testi-item">
                <b>${esc(d.nama)}</b> · ${esc(d.aplikasi || "-")} · ${"★".repeat(Number(d.rating) || 0)}
                <div class="testi-muted">${fmtDate(d.tanggal)}</div>
                <p>${esc(d.isi)}</p>
                <div class="acts">
                  <button class="testi-chip" type="button" data-act="pakai" data-id="${d.id}">Pakai draf ini</button>
                  <button class="testi-chip danger" type="button" data-act="hapus" data-id="${d.id}">Hapus</button>
                </div>
              </li>`).join("")}
          </ul>
        </div>
      </div>`;

    drawPreview();
  }

  // ---------- Event ----------
  function bind(c) {
    if (c.dataset.testiBound) return;
    c.dataset.testiBound = "1";

    c.addEventListener("change", async (e) => {
      const el = e.target;
      if (el.type === "file" && el.name === "tpl" && el.files[0]) {
        try {
          const file = el.files[0];
          await idbPut("template", file);
          state.tpl = await loadImage(file);
          state.hole = findHole(state.tpl);
          state.msg = "Template tersimpan.";
          state.err = "";
        } catch (ex) {
          state.err = ex.message || String(ex);
        }
        render();
      } else if (el.type === "file" && el.name === "shot" && el.files[0]) {
        try {
          state.shot = await loadImage(el.files[0]);
          state.msg = "";
          state.err = "";
        } catch (ex) {
          state.err = ex.message || String(ex);
        }
        render();
      }
    });

    c.addEventListener("input", (e) => {
      const el = e.target;
      if (el.type !== "range") return;
      if (el.name === "zoom") {
        state.zoom = Number(el.value) / 100;
        const v = c.querySelector("#zoom-val");
        if (v) v.textContent = `${el.value}%`;
      } else if (el.name === "dx") {
        state.dx = Number(el.value);
      } else if (el.name === "dy") {
        state.dy = Number(el.value);
      }
      drawPreview();
    });

    c.addEventListener("click", (e) => {
      if (e.target.closest("#testi-download")) { downloadPng(); return; }
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const list = readDrafts();
      if (btn.dataset.act === "hapus") {
        if (!confirm("Hapus draf ini?")) return;
        writeDrafts(list.filter((d) => d.id !== id));
        state.msg = "Draf dihapus.";
        render();
      } else if (btn.dataset.act === "pakai") {
        const d = list.find((x) => x.id === id);
        const f = c.querySelector("#testi-draft-form");
        if (d && f) {
          f.elements.nama.value = d.nama;
          f.elements.aplikasi.value = d.aplikasi || "";
          f.elements.rating.value = String(d.rating);
          f.elements.tanggal.value = d.tanggal || "";
          f.elements.isi.value = d.isi;
          f.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });

    c.addEventListener("submit", (e) => {
      if (e.target.id !== "testi-draft-form") return;
      e.preventDefault();
      const f = e.target;
      const nama = f.elements.nama.value.trim();
      const isi = f.elements.isi.value.trim();
      if (!nama || !isi) { state.err = "Nama dan isi testimoni wajib diisi."; render(); return; }
      const list = readDrafts();
      list.unshift({
        id: Date.now(),
        nama,
        aplikasi: f.elements.aplikasi.value.trim(),
        rating: Number(f.elements.rating.value),
        tanggal: f.elements.tanggal.value,
        isi
      });
      writeDrafts(list);
      state.msg = "Draf tersimpan.";
      state.err = "";
      render();
    });
  }

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("testi-style")) return;
    const s = document.createElement("style");
    s.id = "testi-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.renderTestimoni = async function (container) {
    injectStyle();
    state.container = container;
    bind(container);
    if (!state.tpl) {
      const blob = await idbGet("template");
      if (blob) {
        try {
          state.tpl = await loadImage(blob);
          state.hole = findHole(state.tpl);
        } catch (e) {
          state.tpl = null;
        }
      }
    }
    render();
  };
})();
