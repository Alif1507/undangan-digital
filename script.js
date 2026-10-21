(function () {
  "use strict";

  const data = window.EVENT || {};
  const card = document.getElementById("card");
  const invitation = document.getElementById("invitation");
  const interior = document.getElementById("interior");
  const toggle = document.getElementById("toggleInvitation");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Isi data acara ---------- */
  document.querySelectorAll("[data-field]").forEach((el) => {
    const v = data[el.dataset.field];
    if (v !== undefined) el.textContent = v;
  });
  const mapLink = document.getElementById("locationLink");
  if (data.mapUrl) mapLink.href = data.mapUrl;
  else { mapLink.removeAttribute("href"); mapLink.setAttribute("aria-disabled", "true"); }
  document.title = "Undangan — " + (data.names || "Botanical Slate");

  /* ---------- Ilustrasi botanical (SVG dekoratif) ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const W = 600, H = 220;
  const LEAF = ["#3e5550", "#4d6a64", "#2f4540", "#6b8a82"];
  const PETAL = ["#f5f2ec", "#efe6df", "#e2c9c8", "#ecdcd8"];

  function rng(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function leaf(g, r, x, y, angle, len) {
    const w = len * 0.2;
    el("path", {
      d: `M0 0 C ${w} ${-len * .3}, ${w * .8} ${-len * .75}, 0 ${-len} C ${-w * .8} ${-len * .75}, ${-w} ${-len * .3}, 0 0Z`,
      fill: LEAF[Math.floor(r() * LEAF.length)],
      opacity: (0.78 + r() * 0.22).toFixed(2),
      transform: `translate(${x} ${y}) rotate(${angle})`
    }, g);
  }
  function flower(g, r, x, y, size) {
    const f = el("g", { transform: `translate(${x} ${y}) rotate(${r() * 360})` }, g);
    const tint = PETAL[Math.floor(r() * PETAL.length)];
    [[9, 1], [7, .72], [5, .45]].forEach(([n, k], ring) => {
      for (let i = 0; i < n; i++) {
        el("ellipse", {
          cx: 0, cy: -size * .5 * k, rx: size * .34 * k + 2, ry: size * .5 * k + 2,
          fill: ring === 2 ? "#e2c9c8" : tint,
          stroke: "rgba(52,78,88,.14)", "stroke-width": .8,
          transform: `rotate(${(360 / n) * i + ring * 17})`
        }, f);
      }
    });
    el("circle", { r: size * .1, fill: "#c7b7a1" }, f);
  }
  function buildFloral(svg) {
    const r = rng(Number(svg.dataset.seed) || 1);
    const small = svg.dataset.count === "small";
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMax meet");
    const g = el("g", {}, svg);
    const leaves = small ? 18 : 34;
    for (let i = 0; i < leaves; i++) {
      leaf(g, r, r() * W, H + 8, -75 + r() * 150, 60 + r() * 90);
    }
    const spots = small ? [.2, .55, .85] : [.1, .28, .5, .7, .9];
    spots.forEach((p) => flower(g, r, p * W + (r() - .5) * 30, H - 38 - r() * 44, 28 + r() * 14));
    for (let i = 0; i < (small ? 6 : 12); i++) {
      leaf(g, r, r() * W, H + 6, -60 + r() * 120, 28 + r() * 36);
    }
  }
  document.querySelectorAll("svg.floral").forEach(buildFloral);

  /* ---------- Buka / tutup ---------- */
  let isOpen = false;
  let closedHeight = 0;
  let busy = false;

  function measureClosed() {
    card.style.height = "";
    closedHeight = card.offsetHeight;
  }
  function openHeight() {
    interior.style.minHeight = closedHeight + "px";
    return Math.max(interior.offsetHeight, closedHeight);
  }

  function setState(open) {
    if (busy) return;
    busy = true;
    toggle.disabled = true;
    isOpen = open;

    if (open) {
      measureClosed();
      card.style.height = closedHeight + "px";
      void card.offsetHeight; // reflow agar transisi tinggi berjalan
      card.style.height = openHeight() + "px";
    } else {
      card.style.height = card.offsetHeight + "px";
      void card.offsetHeight;
      card.style.height = closedHeight + "px";
    }

    invitation.classList.toggle("is-open", open);
    interior.inert = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Tutup Undangan" : "Buka Undangan";

    const wait = reduceMotion.matches ? 350 : 1150;
    setTimeout(() => {
      busy = false;
      toggle.disabled = false;
      if (!open) card.style.height = "";
    }, wait);
  }

  // Kelas is-open dipasang pada .invitation; samakan selector CSS lewat kartu
  card.classList.add("card--js");
  const observer = new MutationObserver(() => card.classList.toggle("is-open", invitation.classList.contains("is-open")));
  observer.observe(invitation, { attributes: true, attributeFilter: ["class"] });

  toggle.addEventListener("click", () => setState(!isOpen));

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isOpen) {
        const prev = card.style.transition;
        card.style.transition = "none";
        card.style.height = "";
        closedHeight = card.offsetHeight;
        card.style.height = openHeight() + "px";
        void card.offsetHeight;
        card.style.transition = prev;
      }
    }, 120);
  });

  /* ---------- RSVP (demo lokal) ---------- */
  const form = document.getElementById("rsvpForm");
  const status = document.getElementById("formStatus");
  const nameInput = document.getElementById("guestName");
  const attendance = document.getElementById("attendance");
  const count = document.getElementById("guestCount");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    let valid = true;
    nameInput.setAttribute("aria-invalid", String(!name));
    attendance.setAttribute("aria-invalid", String(!attendance.value));
    if (!name || !attendance.value) valid = false;

    const n = count.value ? Number(count.value) : null;
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 10)) {
      count.setAttribute("aria-invalid", "true");
      valid = false;
    } else count.setAttribute("aria-invalid", "false");

    if (!valid) {
      status.textContent = "Mohon lengkapi nama, kehadiran, dan jumlah tamu (1–10) dengan benar.";
      return;
    }
    const entry = { name, attendance: attendance.value, count: n, at: new Date().toISOString() };
    try {
      const list = JSON.parse(localStorage.getItem("rsvp-demo") || "[]");
      list.push(entry);
      localStorage.setItem("rsvp-demo", JSON.stringify(list));
    } catch (_) { /* penyimpanan tidak tersedia */ }
    status.textContent = `Terima kasih, ${name}. (Mode demo: konfirmasi hanya tersimpan di browser ini, belum dikirim ke server.)`;
    form.reset();
  });

  /* ---------- Musik ---------- */
  const audio = document.getElementById("bgm");
  const audioBtn = document.getElementById("audioToggle");
  audio.volume = typeof data.musicVolume === "number" ? data.musicVolume : 0.5; // 50%

  function setPlaying(playing) {
    audioBtn.setAttribute("aria-pressed", String(playing));
    audioBtn.setAttribute("aria-label", playing ? "Hentikan musik" : "Putar musik");
  }
  function startMusic() {
    if (!data.musicSrc) return;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  if (data.musicSrc) {
    audio.src = data.musicSrc;
    audio.preload = "auto";
    audioBtn.hidden = false;
    audio.addEventListener("error", () => { audioBtn.hidden = true; }); // file tidak ditemukan
    audioBtn.addEventListener("click", () => {
      if (audio.paused) startMusic(); else { audio.pause(); setPlaying(false); }
    });
  }

  /* ---------- Opening ---------- */
  const splash = document.getElementById("splash");
  const enterBtn = document.getElementById("enterBtn");
  enterBtn.focus({ preventScroll: true });
  enterBtn.addEventListener("click", () => {
    startMusic(); // klik = interaksi pengguna, jadi autoplay diizinkan browser
    splash.classList.add("is-leaving");
    document.body.classList.remove("splash-active");
    setTimeout(() => { splash.hidden = true; toggle.focus({ preventScroll: true }); }, 1050);
  });
})();