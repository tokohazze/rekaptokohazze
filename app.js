// Toko Hazze — logika utama Tahap 1: login, sesi, logout, dan navigasi enam menu.
(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.HAZZE_CONFIG || {};
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("GANTI")) {
    showFatal("Konfigurasi Supabase belum diisi di js/config.js.");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.hazzeSb = sb; // dipakai oleh modul halaman (mis. dashboard.js)

  const $ = (sel) => document.querySelector(sel);
  const loginView = $("#login-view");
  const appView = $("#app-view");
  const loginForm = $("#login-form");
  const loginError = $("#login-error");
  const loginBtn = $("#login-btn");

  const MENUS = [
    { id: "dashboard", label: "Dashboard", icon: "🌸" },
    { id: "input-order", label: "Input Order", icon: "🎀" },
    { id: "rekap-order", label: "Rekap Order", icon: "📋" },
    { id: "kalender", label: "Kalender", icon: "🗓️" },
    { id: "supplier", label: "Supplier", icon: "🌷" },
    { id: "laporan", label: "Laporan", icon: "📊" },
    { id: "testimoni", label: "Testimoni", icon: "💬" }
  ];

  function showFatal(msg) {
    document.body.innerHTML =
      '<div style="padding:24px;font-family:sans-serif;color:#68503f">' + msg + "</div>";
  }

  // ---------- Navigasi ----------
  function buildNav() {
    const html = MENUS.map(
      (m) =>
        `<button class="nav-item" data-page="${m.id}"><span class="nav-icon">${m.icon}</span><span class="nav-label">${m.label}</span></button>`
    ).join("");
    $("#nav-desktop").innerHTML = html;
    $("#nav-mobile").innerHTML = html;
    document.querySelectorAll(".nav-item").forEach((btn) =>
      btn.addEventListener("click", () => go(btn.dataset.page))
    );
  }

  function go(pageId) {
    const menu = MENUS.find((m) => m.id === pageId) || MENUS[0];
    window.currentPage = menu.id; // dipakai modul yang memuat ulang data di latar belakang
    document.querySelectorAll(".nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.page === menu.id)
    );
    $("#page-title").textContent = menu.label;
    if (menu.id === "dashboard" && window.renderDashboard) {
      window.renderDashboard($("#page-body"));
    } else if (menu.id === "input-order" && window.renderInputOrder) {
      window.renderInputOrder($("#page-body"));
    } else if (menu.id === "rekap-order" && window.renderRekap) {
      window.renderRekap($("#page-body"));
    } else if (menu.id === "kalender" && window.renderKalender) {
      window.renderKalender($("#page-body"));
    } else if (menu.id === "supplier" && window.renderSupplier) {
      window.renderSupplier($("#page-body"));
    } else if (menu.id === "laporan" && window.renderLaporan) {
      window.renderLaporan($("#page-body"));
    } else if (menu.id === "testimoni" && window.renderTestimoni) {
      window.renderTestimoni($("#page-body"));
    } else {
      // Halaman lain masih kerangka. Isinya dibangun di tahap berikutnya.
      $("#page-body").innerHTML = `
        <div class="card placeholder">
          <div class="ornament">✿ ❀ ✿</div>
          <h2>${menu.label}</h2>
          <p>Halaman ini akan dibangun pada tahap berikutnya.</p>
        </div>`;
    }
    location.hash = menu.id;
  }

  function renderDate() {
    const el = $("#today-date");
    if (el) {
      el.textContent = new Date().toLocaleDateString("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
    }
  }

  // ---------- Sesi ----------
  function showLogin() {
    appView.hidden = true;
    loginView.hidden = false;
  }

  function showApp(user) {
    loginView.hidden = true;
    appView.hidden = false;
    $("#admin-email").textContent = user.email;
    renderDate();
    buildNav();
    const initial = (location.hash || "#dashboard").slice(1);
    go(MENUS.some((m) => m.id === initial) ? initial : "dashboard");
    if (window.refreshReminders) window.refreshReminders();
  }

  async function init() {
    const { data } = await sb.auth.getSession();
    if (data.session) showApp(data.session.user);
    else showLogin();

    sb.auth.onAuthStateChange((_event, session) => {
      if (session) showApp(session.user);
      else showLogin();
    });
  }

  // ---------- Login & logout ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    loginBtn.disabled = true;
    loginBtn.textContent = "Sedang masuk...";
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;

    const { error } = await sb.auth.signInWithPassword({ email, password });

    loginBtn.disabled = false;
    loginBtn.textContent = "Masuk";
    if (error) {
      loginError.textContent = "Email atau password salah. Silakan coba lagi.";
      $("#login-password").value = "";
    }
  });

  const btnProducts = $("#btn-products");
  if (btnProducts) {
    btnProducts.addEventListener("click", () => {
      window.currentPage = "produk";
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      $("#page-title").textContent = "Pengelolaan Produk";
      if (window.renderProducts) window.renderProducts($("#page-body"));
    });
  }

  document.querySelectorAll("[data-logout]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await sb.auth.signOut();
    })
  );

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (appView && !appView.hidden && MENUS.some((m) => m.id === id)) go(id);
  });

  init();
})();
