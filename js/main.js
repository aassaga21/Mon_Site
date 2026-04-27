// ── Hide Google Translate toolbar (injected as iframe + inline body.style.top) ──
(function(){
  function hideGTBar(){
    // Hide the injected iframe banner
    document.querySelectorAll('.goog-te-banner-frame, #goog-gt-tt, .goog-te-spinner-pos').forEach(function(el){
      el.style.setProperty('display','none','important');
      el.style.setProperty('height','0','important');
    });
    // Reset body top that GT sets as inline style
    if(document.body && document.body.style.top && document.body.style.top !== '0px'){
      document.body.style.top = '0px';
    }
  }
  // Watch for GT DOM injections
  new MutationObserver(hideGTBar).observe(document.documentElement, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['style','class']
  });
  window.addEventListener('load', hideGTBar);
})();

// ── Theme toggle (dark / light) ──
(function(){
  var btn  = document.getElementById('themeBtn');
  var icon = document.getElementById('themeIcon');

  function applyTheme(light){
    document.body.classList.toggle('light', light);
    if(icon) icon.textContent = light ? '🌙' : '☀️';
  }

  // Restore saved preference on every page load
  applyTheme(localStorage.getItem('theme') === 'light');

  if(btn) btn.addEventListener('click', function(){
    var isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if(icon) icon.textContent = isLight ? '🌙' : '☀️';
  });
})();

// ── Language selector (Google Translate widget — in-page, no popup) ──
(function(){
  var btn   = document.getElementById('translateBtn');
  var panel = document.getElementById('langPanel');
  if(!btn || !panel) return;

  btn.addEventListener('click', function(e){
    e.stopPropagation();
    panel.classList.toggle('open');
  });

  document.addEventListener('click', function(){
    panel.classList.remove('open');
  });
  panel.addEventListener('click', function(e){ e.stopPropagation(); });

  panel.querySelectorAll('.lang-opt').forEach(function(b){
    b.addEventListener('click', function(){
      var lang = b.getAttribute('data-lang');
      doTranslate(lang);
      panel.classList.remove('open');
    });
  });
})();

function doTranslate(lang){
  if(lang === 'fr'){
    // Restore original: clear the googtrans cookie then reload
    var exp = new Date(0).toUTCString();
    document.cookie = 'googtrans=; expires=' + exp + '; path=/';
    document.cookie = 'googtrans=; expires=' + exp + '; domain=' + location.hostname + '; path=/';
    window.location.reload();
    return;
  }
  var combo = document.querySelector('.goog-te-combo');
  if(combo){
    combo.value = lang;
    combo.dispatchEvent(new Event('change'));
  }
}

// ── Active link in navbar depending on current page
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
