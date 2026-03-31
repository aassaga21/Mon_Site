// Active link in navbar depending on current page
(() => {
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a => {
    if (a.getAttribute("href").toLowerCase() === path) a.classList.add("active");
  });
})();

// Simple "mailto" handler for contact form (no backend needed)
function sendMail(e){
  e.preventDefault();
  const name = document.getElementById("name")?.value?.trim() || "";
  const email = document.getElementById("email")?.value?.trim() || "";
  const message = document.getElementById("message")?.value?.trim() || "";

  const subject = encodeURIComponent(`Contact Portfolio — ${name || "Nouveau message"}`);
  const body = encodeURIComponent(
`Nom: ${name}
Email: ${email}

Message:
${message}`
  );

  // TODO: remplace par ton email
  const to = "ton.email@example.com";
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

// ===== Carousel Projects =====
(() => {
  const track = document.getElementById("carouselTrack");
  const dotsWrap = document.getElementById("carouselDots");
  const prev = document.getElementById("btnPrev");
  const next = document.getElementById("btnNext");

  if (!track || !dotsWrap || !prev || !next) return;

  const slides = Array.from(track.querySelectorAll(".carousel-slide"));
  let index = 0;

  // Combien de slides visibles selon CSS (1 sur mobile, 2 sur desktop)
  const visibleCount = () => window.matchMedia("(min-width: 1000px)").matches ? 2 : 1;

  const makeDots = () => {
    dotsWrap.innerHTML = "";
    const pages = Math.ceil(slides.length / visibleCount());
    for (let i = 0; i < pages; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "carousel-dot";
      b.setAttribute("aria-label", `Aller à la page ${i + 1}`);
      b.addEventListener("click", () => {
        index = i * visibleCount();
        update();
      });
      dotsWrap.appendChild(b);
    }
  };

  const setActiveDot = () => {
    const dots = Array.from(dotsWrap.querySelectorAll(".carousel-dot"));
    const page = Math.floor(index / visibleCount());
    dots.forEach((d, i) => d.classList.toggle("is-active", i === page));
  };

  const clampIndex = () => {
    const max = Math.max(0, slides.length - visibleCount());
    if (index < 0) index = max;
    if (index > max) index = 0;
  };

  const update = () => {
    clampIndex();

    // largeur d’un slide = largeur viewport (1) ou moitié (2)
    const slideWidth = slides[0].getBoundingClientRect().width + 18; // + gap
    track.style.transform = `translateX(${-index * slideWidth}px)`;

    setActiveDot();
  };

  prev.addEventListener("click", () => {
    index -= visibleCount();
    update();
  });

  next.addEventListener("click", () => {
    index += visibleCount();
    update();
  });

  // Clavier (accessibilité)
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { index -= visibleCount(); update(); }
    if (e.key === "ArrowRight") { index += visibleCount(); update(); }
  });

  // Init + resize
  makeDots();
  update();
  window.addEventListener("resize", () => {
    makeDots();
    update();
  });
})();
