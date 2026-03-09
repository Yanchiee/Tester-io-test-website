/*═══════════════════════════════════════════════
  Camera Dissection — Scroll-Driven JS
  Lenis + GSAP + Canvas frame rendering
═══════════════════════════════════════════════*/
(function () {
  "use strict";

  const FRAME_COUNT = 121;
  const FRAME_SPEED = 2.0;
  const IMAGE_SCALE = 0.85;
  const FRAME_PATH = "frames/frame_";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
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
  let isMobile = window.innerWidth < 768;

  /* ─── RESIZE CANVAS ─────────────────────── */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
    isMobile = window.innerWidth < 768;
    if (frames[currentFrame]) drawFrame(currentFrame);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* ─── DRAW FRAME ────────────────────────── */
  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fullDpr = window.devicePixelRatio || 1;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ─── SAMPLE BG COLOR ───────────────────── */
  function sampleBgColor(img) {
    const tmp = document.createElement("canvas");
    tmp.width = img.naturalWidth;
    tmp.height = img.naturalHeight;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(img, 0, 0);
    const d = tctx.getImageData(2, 2, 1, 1).data;
    bgColor = `rgb(${d[0]},${d[1]},${d[2]})`;
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
        if (loaded % 20 === 0 && frames[loaded - 1]) sampleBgColor(frames[loaded - 1]);
        if (loaded === FRAME_COUNT) resolve();
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
    sampleBgColor(frames[0]);
    drawFrame(0);
    loader.classList.add("done");
    setTimeout(initApp, 400);
  });

  function initApp() {
    initLenis();
    initHeroAnimation();
    initHeroTransition();
    positionSections();
    initSectionAnimations();
    initDarkOverlay(0.54, 0.70);
    initMarquee();
    initCounters();
  }

  /* ─── LENIS SMOOTH SCROLL ───────────────── */
  function initLenis() {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
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

  /* ─── HERO → CANVAS TRANSITION ──────────── */
  function initHeroTransition() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        // Hero fades out
        heroSection.style.opacity = Math.max(0, 1 - p * 15);
        // Canvas reveals via circle wipe
        const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
        const radius = wipeProgress * 75;
        canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
      },
    });

    // Frame-to-scroll binding
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
        const index = Math.min(
          Math.floor(accelerated * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (index !== currentFrame) {
          currentFrame = index;
          if (index % 20 === 0 && frames[index]) sampleBgColor(frames[index]);
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      },
    });
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
    });
  }

  /* ─── SECTION ANIMATIONS ────────────────── */
  function initSectionAnimations() {
    document.querySelectorAll(".scroll-section").forEach((sec) => {
      setupSectionAnimation(sec);
    });
  }

  function setupSectionAnimation(section) {
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

    let played = false;
    let persistPlayed = false;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: false,
      onUpdate: (self) => {
        const p = self.progress;
        const inRange = p >= enter - 0.02 && p <= leave + 0.02;

        if (inRange && !played) {
          section.style.opacity = 1;
          section.classList.add("visible");
          tl.play();
          played = true;
          if (persist) persistPlayed = true;
        } else if (!inRange && played && !persistPlayed) {
          section.style.opacity = 0;
          section.classList.remove("visible");
          tl.reverse();
          played = false;
        }
      },
    });
  }

  /* ─── DARK OVERLAY ──────────────────────── */
  function initDarkOverlay(enter, leave) {
    const fadeRange = 0.04;
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let opacity = 0;
        if (p >= enter - fadeRange && p <= enter) {
          opacity = (p - (enter - fadeRange)) / fadeRange;
        } else if (p > enter && p < leave) {
          opacity = 0.9;
        } else if (p >= leave && p <= leave + fadeRange) {
          opacity = 0.9 * (1 - (p - leave) / fadeRange);
        }
        darkOverlay.style.opacity = opacity;
      },
    });
  }

  /* ─── MARQUEE ───────────────────────────── */
  function initMarquee() {
    document.querySelectorAll(".marquee-wrap").forEach((el) => {
      const speed = parseFloat(el.dataset.scrollSpeed) || -25;
      const text = el.querySelector(".marquee-text");

      gsap.to(text, {
        xPercent: speed,
        ease: "none",
        scrollTrigger: {
          trigger: scrollContainer,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      // Fade marquee in/out
      ScrollTrigger.create({
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          // Show marquee between 15% and 80%
          if (p > 0.12 && p < 0.52) {
            el.style.opacity = Math.min(1, (p - 0.12) / 0.04);
          } else if (p >= 0.52 && p < 0.56) {
            el.style.opacity = Math.max(0, 1 - (p - 0.52) / 0.04);
          } else {
            el.style.opacity = 0;
          }
        },
      });
    });
  }

  /* ─── COUNTER ANIMATIONS ────────────────── */
  function initCounters() {
    document.querySelectorAll(".stat-number").forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || "0");
      const obj = { val: 0 };

      ScrollTrigger.create({
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          // Animate when stats section is visible (54-70%)
          if (p >= 0.52 && p <= 0.72) {
            const localP = Math.min(1, (p - 0.52) / 0.08);
            const eased = 1 - Math.pow(1 - localP, 3);
            const val = target * eased;
            el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val);
          }
        },
      });
    });
  }
})();
