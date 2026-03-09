/*═══════════════════════════════════════════════
  Camera Dissection — Scroll-Driven JS
  Lenis + GSAP + Canvas frame rendering
  Optimized: single scroll handler, cached values
═══════════════════════════════════════════════*/
(function () {
  "use strict";

  const FRAME_COUNT = 121;
  const IMAGE_SCALE = 0.85;
  const FRAME_PATH = "frames/frame_";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const canvasWrap = document.getElementById("canvas-wrap");
  const heroSection = document.getElementById("hero");
  const scrollContainer = document.getElementById("scroll-container");
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPercent = document.getElementById("loader-percent");
  const darkOverlay = document.getElementById("dark-overlay");

  const frames = [];
  let currentFrame = 0;
  let bgColor = "#0a0a0a";
  let cachedDpr = window.devicePixelRatio || 1;
  let cachedCW = 0;
  let cachedCH = 0;

  /* ─── RESIZE CANVAS ─────────────────────── */
  function resizeCanvas() {
    cachedDpr = window.devicePixelRatio || 1;
    cachedCW = window.innerWidth;
    cachedCH = window.innerHeight;
    canvas.width = cachedCW * cachedDpr;
    canvas.height = cachedCH * cachedDpr;
    canvas.style.width = cachedCW + "px";
    canvas.style.height = cachedCH + "px";
    ctx.setTransform(cachedDpr, 0, 0, cachedDpr, 0, 0);
    if (frames[currentFrame]) drawFrame(currentFrame);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* ─── DRAW FRAME ────────────────────────── */
  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cachedCW / iw, cachedCH / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cachedCW - dw) / 2;
    const dy = (cachedCH - dh) / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cachedCW, cachedCH);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ─── SAMPLE BG COLOR (pre-cached) ─────── */
  const bgColorCache = {};
  function sampleBgColor(img, index) {
    if (bgColorCache[index]) {
      bgColor = bgColorCache[index];
      return;
    }
    const tmp = document.createElement("canvas");
    tmp.width = 1;
    tmp.height = 1;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(img, -2, -2, img.naturalWidth, img.naturalHeight);
    const d = tctx.getImageData(0, 0, 1, 1).data;
    bgColor = `rgb(${d[0]},${d[1]},${d[2]})`;
    bgColorCache[index] = bgColor;
  }

  /* ─── LOAD FRAMES ──────────────────────── */
  function loadFrames() {
    return new Promise((resolve) => {
      let loaded = 0;

      function onLoad() {
        loaded++;
        const pct = Math.round((loaded / FRAME_COUNT) * 100);
        loaderBar.style.width = pct + "%";
        loaderPercent.textContent = pct + "%";
        if (loaded === FRAME_COUNT) {
          // Pre-cache bg colors every 5 frames for smoother transitions
          for (let i = 0; i < FRAME_COUNT; i += 5) {
            if (frames[i]) sampleBgColor(frames[i], i);
          }
          resolve();
        }
      }

      // Load first 10 immediately
      for (let i = 0; i < Math.min(10, FRAME_COUNT); i++) {
        const img = new Image();
        img.onload = onLoad;
        img.onerror = onLoad;
        img.src = FRAME_PATH + String(i + 1).padStart(4, "0") + ".webp";
        frames[i] = img;
      }

      // Load rest after short delay
      setTimeout(() => {
        for (let i = 10; i < FRAME_COUNT; i++) {
          const img = new Image();
          img.onload = onLoad;
          img.onerror = onLoad;
          img.src = FRAME_PATH + String(i + 1).padStart(4, "0") + ".webp";
          frames[i] = img;
        }
      }, 50);
    });
  }

  /* ─── INIT ──────────────────────────────── */
  loadFrames().then(() => {
    sampleBgColor(frames[0], 0);
    drawFrame(0);
    loader.classList.add("done");
    setTimeout(initApp, 400);
  });

  function initApp() {
    initLenis();
    initHeroAnimation();
    positionSections();
    prepareSections();
    initMasterScroll();
  }

  /* ─── LENIS SMOOTH SCROLL ───────────────── */
  function initLenis() {
    const lenis = new Lenis({
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.8,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ─── HERO ENTRANCE ─────────────────────── */
  function initHeroAnimation() {
    const words = heroSection.querySelectorAll(".hero-heading span");
    const tagline = heroSection.querySelector(".hero-tagline");
    const label = heroSection.querySelector(".section-label");
    const indicator = heroSection.querySelector(".scroll-indicator");

    gsap.to(label, { opacity: 0.7, duration: 0.8, delay: 0.3 });
    gsap.to(words, {
      opacity: 1, y: 0,
      stagger: 0.15, duration: 1.0,
      ease: "power3.out", delay: 0.5,
    });
    gsap.fromTo(tagline,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, delay: 1.2, ease: "power2.out" }
    );
    gsap.fromTo(indicator,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, delay: 1.8 }
    );
  }

  /* ─── POSITION SECTIONS ─────────────────── */
  function positionSections() {
    const containerH = scrollContainer.offsetHeight;
    document.querySelectorAll(".scroll-section").forEach((sec) => {
      const enter = parseFloat(sec.dataset.enter) / 100;
      const leave = parseFloat(sec.dataset.leave) / 100;
      const mid = ((enter + leave) / 2) * containerH;
      sec.style.top = mid + "px";
      sec.style.transform = "translateY(-50%)";
      sec.style.willChange = "opacity";
    });
  }

  /* ─── PREPARE SECTION ANIMATIONS ────────── */
  const sectionData = [];

  function prepareSections() {
    document.querySelectorAll(".scroll-section").forEach((section) => {
      const type = section.dataset.animation;
      const persist = section.dataset.persist === "true";
      const enter = parseFloat(section.dataset.enter) / 100;
      const leave = parseFloat(section.dataset.leave) / 100;
      const children = section.querySelectorAll(
        ".section-label, .section-heading, .section-body, .section-note, .cta-button, .stat"
      );

      const tl = gsap.timeline({ paused: true });

      switch (type) {
        case "fade-up":
          tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
          break;
        case "slide-left":
          tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
          break;
        case "slide-right":
          tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
          break;
        case "scale-up":
          tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: "power2.out" });
          break;
        case "rotate-in":
          tl.from(children, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: "power3.out" });
          break;
        case "stagger-up":
          tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" });
          break;
        case "clip-reveal":
          tl.from(children, { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.2, ease: "power4.inOut" });
          break;
      }

      sectionData.push({
        section, tl, enter, leave, persist,
        played: false, persistPlayed: false,
      });
    });
  }

  /* ─── MASTER SCROLL — single handler ────── */
  function initMasterScroll() {
    // Gather marquee elements
    const marquees = [];
    document.querySelectorAll(".marquee-wrap").forEach((el) => {
      const speed = parseFloat(el.dataset.scrollSpeed) || -25;
      const text = el.querySelector(".marquee-text");
      marquees.push({ el, text, speed });
    });

    // Gather counter elements
    const counters = [];
    document.querySelectorAll(".stat-number").forEach((el) => {
      counters.push({
        el,
        target: parseFloat(el.dataset.value),
        decimals: parseInt(el.dataset.decimals || "0"),
        lastVal: -1,
      });
    });

    // Dark overlay config
    const overlayEnter = 0.34;
    const overlayLeave = 0.48;
    const fadeRange = 0.04;

    // Track last values to skip redundant DOM writes
    let lastHeroOpacity = -1;
    let lastClipRadius = -1;
    let lastOverlayOpacity = -1;
    let lastFrameIndex = -1;
    let pendingDraw = false;

    // ONE ScrollTrigger to rule them all
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
      onUpdate: (self) => {
        const p = self.progress;

        // ── 1. Hero fade ──
        const heroOp = Math.max(0, 1 - p * 15);
        if (heroOp !== lastHeroOpacity) {
          heroSection.style.opacity = heroOp;
          lastHeroOpacity = heroOp;
        }

        // ── 2. Canvas circle wipe ──
        const wipeP = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
        const radius = wipeP * 75;
        if (radius !== lastClipRadius) {
          canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
          lastClipRadius = radius;
        }

        // ── 3. Frame binding (forward then reverse) ──
        let frameProgress;
        if (p <= 0.5) {
          frameProgress = Math.min(p * 2, 1);
        } else {
          frameProgress = Math.max(0, 1 - (p - 0.5) * 2);
        }
        const index = Math.min(
          Math.floor(frameProgress * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (index !== lastFrameIndex) {
          currentFrame = index;
          lastFrameIndex = index;
          // Use cached bg color (every 5 frames for smooth transitions)
          const colorKey = Math.floor(index / 5) * 5;
          if (bgColorCache[colorKey]) bgColor = bgColorCache[colorKey];
          if (!pendingDraw) {
            pendingDraw = true;
            requestAnimationFrame(() => {
              drawFrame(currentFrame);
              pendingDraw = false;
            });
          }
        }

        // ── 4. Section animations with parallax depth ──
        for (let i = 0; i < sectionData.length; i++) {
          const s = sectionData[i];
          const inRange = p >= s.enter - 0.02 && p <= s.leave + 0.02;

          if (inRange && !s.played) {
            s.section.style.opacity = 1;
            s.section.classList.add("visible");
            s.tl.play();
            s.played = true;
            if (s.persist) s.persistPlayed = true;
          } else if (!inRange && s.played && !s.persistPlayed) {
            s.section.style.opacity = 0;
            s.section.classList.remove("visible");
            s.tl.reverse();
            s.played = false;
          }

          // Parallax micro-shift while in range
          if (s.played) {
            const mid = (s.enter + s.leave) / 2;
            const offset = (p - mid) * 40;
            const inner = s.section.querySelector(".section-inner");
            if (inner) inner.style.transform = "translateY(" + offset + "px)";
          }
        }

        // ── 5. Dark overlay ──
        let oOp = 0;
        if (p >= overlayEnter - fadeRange && p <= overlayEnter) {
          oOp = (p - (overlayEnter - fadeRange)) / fadeRange;
        } else if (p > overlayEnter && p < overlayLeave) {
          oOp = 0.9;
        } else if (p >= overlayLeave && p <= overlayLeave + fadeRange) {
          oOp = 0.9 * (1 - (p - overlayLeave) / fadeRange);
        }
        if (oOp !== lastOverlayOpacity) {
          darkOverlay.style.opacity = oOp;
          lastOverlayOpacity = oOp;
        }

        // ── 6. Marquee fade ──
        for (let i = 0; i < marquees.length; i++) {
          const m = marquees[i];
          let mOp = 0;
          if (p > 0.08 && p < 0.38) {
            mOp = Math.min(1, (p - 0.08) / 0.04);
          } else if (p >= 0.38 && p < 0.42) {
            mOp = Math.max(0, 1 - (p - 0.38) / 0.04);
          }
          m.el.style.opacity = mOp;
        }

        // ── 7. Counters ──
        if (p >= 0.32 && p <= 0.48) {
          const localP = Math.min(1, (p - 0.32) / 0.08);
          const eased = 1 - Math.pow(1 - localP, 3);
          for (let i = 0; i < counters.length; i++) {
            const c = counters[i];
            const val = c.decimals > 0
              ? (c.target * eased).toFixed(c.decimals)
              : Math.round(c.target * eased);
            if (val !== c.lastVal) {
              c.el.textContent = val;
              c.lastVal = val;
            }
          }
        }
      },
    });

    // Marquee horizontal movement (this one is fine as a separate GSAP tween)
    marquees.forEach((m) => {
      gsap.to(m.text, {
        xPercent: m.speed,
        ease: "none",
        scrollTrigger: {
          trigger: scrollContainer,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });
    });
  }
})();
