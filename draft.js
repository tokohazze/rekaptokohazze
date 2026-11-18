// Toko Hazze — penyimpanan draf formulir.
// Isian yang belum disimpan dicatat di browser, jadi tidak hilang saat pindah menu
// atau berpindah aplikasi. Draf dihapus setelah data berhasil disimpan.
(function () {
  const PREFIX = "hazze-draft:";

  function load(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(key, obj) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(obj));
    } catch (e) {
      // Penyimpanan penuh atau diblokir: formulir tetap bisa dipakai seperti biasa.
    }
  }

  function clear(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {
      // Diabaikan.
    }
  }

  // Mengambil semua isian yang punya atribut name.
  function collect(form) {
    const out = {};
    Array.from(form.elements).forEach((el) => {
      if (!el.name || ["submit", "button", "file", "password"].includes(el.type)) return;
      out[el.name] = el.value;
    });
    return out;
  }

  // Mengisi kembali nilai ke formulir (tanpa memicu event).
  function apply(form, obj) {
    if (!form || !obj) return;
    Array.from(form.elements).forEach((el) => {
      if (!el.name || !(el.name in obj)) return;
      if (["submit", "button", "file", "password"].includes(el.type)) return;
      el.value = obj[el.name];
    });
  }

  window.hazzeDraft = { load, save, clear, collect, apply };
})();
