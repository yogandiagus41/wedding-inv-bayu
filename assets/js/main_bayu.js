(function () {
  "use strict";

  // ===== PENGATURAN =====
  var WEDDING_DATE = new Date("2026-12-11T08:00:00+07:00");
  var PHOTO_DIR = "assets/img/bayu/galery/";
  var PHOTO_COUNT = 6; // Contoh 6 foto dahulu agar ringan saat testing
  // =====================

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var html = document.documentElement;
  var body = document.body;
  var book = $("#book");
  var main = $("#main");
  var dots = $("#dots");

  // ---------- Nama tamu: ?to=Budi+Santoso ----------
  var to = new URLSearchParams(location.search).get("to");
  if (to && $("#guest")) $("#guest").textContent = to;

  // ---------- Hitung mundur ----------
  function pad(n) { return String(n).padStart(2, "0"); }

  function tick() {
    var s = Math.max(0, Math.floor((WEDDING_DATE - new Date()) / 1000));
    if ($("#cd")) $("#cd").textContent = pad(Math.floor(s / 86400));
    if ($("#ch")) $("#ch").textContent = pad(Math.floor(s % 86400 / 3600));
    if ($("#cm")) $("#cm").textContent = pad(Math.floor(s % 3600 / 60));
    if ($("#cs")) $("#cs").textContent = pad(s % 60);
  }

  tick();
  setInterval(tick, 1000);

  // ---------- Galeri: 6 foto contoh, ukuran bervariasi ----------
  var gallery = $("#gallery");
  var photos = [];
  var wideAt = { 1: true, 4: true }; // Foto 1 dan 4 full-width

  if (gallery) {
    gallery.innerHTML = "";

    for (var i = 1; i <= PHOTO_COUNT; i++) {
      var src = PHOTO_DIR + i + ".jpg";
      photos.push(src);

      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile" + (wideAt[i] ? " wide" : "");
      tile.setAttribute("aria-label", "Buka foto " + i);
      tile.dataset.i = i - 1;

      var img = document.createElement("img");
      img.src = src;
      img.alt = "Foto galeri " + i;
      img.loading = "lazy";
      img.decoding = "async";
      img.onerror = function () {
        console.error("Foto galeri gagal dimuat:", this.src);
      };

      tile.appendChild(img);
      gallery.appendChild(tile);
    }
  }

  // ---------- Lightbox ----------
  var lb = $("#lb");
  var lbImg = $("#lbImg");
  var lbCount = $("#lbCount");
  var cur = 0;
  var lastFocus = null;

  function showPhoto(n) {
    if (!photos.length || !lbImg || !lbCount) return;
    cur = (n + photos.length) % photos.length;
    lbImg.src = photos[cur];
    lbImg.alt = "Foto galeri " + (cur + 1);
    lbCount.textContent = (cur + 1) + " / " + photos.length;
  }

  function openLightbox(n) {
    if (!lb) return;
    lastFocus = document.activeElement;
    showPhoto(n);
    lb.hidden = false;
    var closeButton = $(".lb-close");
    if (closeButton) closeButton.focus();
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (gallery) {
    gallery.addEventListener("click", function (e) {
      var tile = e.target.closest(".tile");
      if (tile) openLightbox(Number(tile.dataset.i));
    });
  }

  if ($(".lb-close")) $(".lb-close").addEventListener("click", closeLightbox);
  if ($(".lb-prev")) $(".lb-prev").addEventListener("click", function () { showPhoto(cur - 1); });
  if ($(".lb-next")) $(".lb-next").addEventListener("click", function () { showPhoto(cur + 1); });

  if (lb) {
    lb.addEventListener("click", function (e) {
      if (e.target === lb) closeLightbox();
    });

    var touchX = null;
    lb.addEventListener("touchstart", function (e) {
      if (e.touches.length) touchX = e.touches[0].clientX;
    }, { passive: true });

    lb.addEventListener("touchend", function (e) {
      if (touchX === null || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) showPhoto(cur + (dx < 0 ? 1 : -1));
    });
  }

  document.addEventListener("keydown", function (e) {
    if (lb && !lb.hidden) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showPhoto(cur - 1);
      if (e.key === "ArrowRight") showPhoto(cur + 1);
    }
    if (giftModal && !giftModal.hidden && e.key === "Escape") closeGiftModal();
  });

  // ---------- Salin teks ----------
  function copyText(text, button) {
    var label = button ? $("span", button) : null;
    var oldText = label ? label.textContent : "";

    function showResult(message) {
      if (!label) return;
      label.textContent = message;
      setTimeout(function () { label.textContent = oldText; }, 1800);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showResult("Tersalin");
      }).catch(function () {
        showResult("Salin manual");
      });
    } else {
      var temp = document.createElement("textarea");
      temp.value = text;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      try {
        var ok = document.execCommand("copy");
        showResult(ok ? "Tersalin" : "Salin manual");
      } catch (err) {
        showResult("Salin manual");
      }
      temp.remove();
    }
  }

  $$("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = $(button.dataset.copy);
      if (target) copyText(target.textContent.trim(), button);
    });
  });

  // ---------- Modal Wedding Gift ----------
  var giftModal = $("#giftModal");
  var giftTitle = $("#giftModalTitle");
  var giftDescription = $("#giftModalDescription");
  var giftValue = $("#giftValue");
  var giftExtra = $("#giftExtra");
  var giftCopy = $("#giftCopy");
  var giftLastFocus = null;

  // Ganti data contoh ini dengan data rekening dan alamat lengkap yang benar.
  var giftData = {
    rekening: {
      title: "Nomor Rekening",
      description: "Transfer hadiah untuk:",
      value: "0000000000",
      extra: "Bank [Nama Bank] · a.n. Shania [Nama Lengkap]"
    },
    alamat: {
      title: "Alamat",
      description: "Alamat lokasi acara:",
      value: "Ciketing Asem, Mustikajaya, Kota Bekasi",
      extra: "Silakan ganti dengan alamat lengkap jika diperlukan."
    }
  };

  function openGiftModal(type, button) {
    if (!giftModal || !giftData[type]) return;
    giftLastFocus = button || document.activeElement;
    var data = giftData[type];

    giftTitle.textContent = data.title;
    giftDescription.textContent = data.description;
    giftValue.textContent = data.value;
    giftExtra.textContent = data.extra;
    giftCopy.hidden = false;
    giftCopy.dataset.copyValue = data.value;
    giftCopy.querySelector("span").textContent = type === "rekening" ? "Salin nomor rekening" : "Salin alamat";
    giftModal.hidden = false;
    giftCopy.focus();
  }

  function closeGiftModal() {
    if (!giftModal) return;
    giftModal.hidden = true;
    if (giftLastFocus && giftLastFocus.focus) giftLastFocus.focus();
  }

  $$("[data-gift]").forEach(function (button) {
    button.addEventListener("click", function () {
      openGiftModal(button.dataset.gift, button);
    });
  });

  if ($(".gift-modal-close")) {
    $(".gift-modal-close").addEventListener("click", closeGiftModal);
  }

  if (giftModal) {
    giftModal.addEventListener("click", function (e) {
      if (e.target === giftModal) closeGiftModal();
    });
  }

  if (giftCopy) {
    giftCopy.addEventListener("click", function () {
      copyText(giftCopy.dataset.copyValue || "", giftCopy);
    });
  }

  // ---------- Animasi per layar + indikator ----------
  var screens = $$(".screen");

  screens.forEach(function (screen, idx) {
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", screen.dataset.title || "Bagian " + (idx + 1));
    button.addEventListener("click", function () {
      screen.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
    if (dots) dots.appendChild(button);
  });

  var dotBtns = dots ? $$("button", dots) : [];

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle("in", entry.isIntersecting);
      if (entry.isIntersecting) {
        dotBtns.forEach(function (dot, i) {
          dot.classList.toggle("on", screens[i] === entry.target);
        });
      }
    });
  }, { threshold: 0.5 });

  function startObserving() {
    screens.forEach(function (screen) { io.observe(screen); });
  }

  // ---------- Buka undangan ----------
  var opened = false;

  function finishOpen() {
    if (book) book.hidden = true;
    html.classList.remove("locked");
    body.classList.remove("locked");
    if (main) main.inert = false;
    if (dots) dots.hidden = false;
    window.scrollTo(0, 0);
  }

  var openButton = $("#open");
  if (openButton) {
    openButton.addEventListener("click", function () {
      if (opened) return;
      opened = true;
      if (book) book.classList.add("open");

      if (reduce) {
        startObserving();
        finishOpen();
        return;
      }

      setTimeout(function () {
        if (main) main.inert = false;
        startObserving();
      }, 600);
      setTimeout(finishOpen, 2000);
    });
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
})();
