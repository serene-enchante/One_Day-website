const app = document.getElementById("app");
const nav = document.getElementById("site-nav");
const navIndicator = nav.querySelector(".nav-indicator");
const menuToggle = document.getElementById("menu-toggle");
const header = document.getElementById("site-header");
let siteData = { settings: {}, articles: [] };
let isTicking = false;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
let articleKeyHandler = null;
let slideshowInterval = null;

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const cleanImageUrl = (url) => {
  if (!url) return "";
  return url.startsWith("/") ? url.slice(1) : url;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const markdownToHtml = (markdown) => {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const blocks = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(`<ul>${listBuffer.join("")}</ul>`);
      listBuffer = [];
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("- ")) {
      listBuffer.push(`<li>${line.trim().slice(2)}</li>`);
      return;
    }
    flushList();
    if (!line.trim()) {
      blocks.push("");
      return;
    }
    if (line.startsWith("### ")) {
      blocks.push(`<h3>${line.slice(4)}</h3>`);
    } else if (line.startsWith("## ")) {
      blocks.push(`<h2>${line.slice(3)}</h2>`);
    } else if (line.startsWith("# ")) {
      blocks.push(`<h1>${line.slice(2)}</h1>`);
    } else {
      blocks.push(`<p>${line}</p>`);
    }
  });

  flushList();

  return blocks
    .filter((block) => block !== "")
    .join("\n")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
};

const fetchData = async () => {
  const response = await fetch("data/articles.json");
  if (!response.ok) {
    throw new Error("Unable to load articles.");
  }
  siteData = await response.json();

  if (siteData.settings && siteData.settings.favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = cleanImageUrl(siteData.settings.favicon);
  }
};

const setActiveNav = (route) => {
  const links = nav.querySelectorAll("a");
  let activeLink = null;
  links.forEach((link) => {
    const target = link.dataset.route;
    const isActive = target === route;
    link.classList.toggle("active", isActive);
    if (isActive) {
      activeLink = link;
    }
  });
  if (activeLink) {
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    navIndicator.style.width = `${linkRect.width}px`;
    navIndicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
    navIndicator.style.opacity = "1";
  } else {
    navIndicator.style.opacity = "0";
  }
};

const buildHeroSection = ({
  title,
  subtitle,
  buttonText,
  buttonRoute,
  imageUrl,
  metaText,
  metaTop,
  alignEnd = false,
}) => {
  const hero = document.createElement("section");
  hero.className = `section hero-base hero-fold${alignEnd ? " hero-article" : ""}`;
  const normalizedUrl = imageUrl ? cleanImageUrl(imageUrl) : "";
  const bgStyle = imageUrl
    ? ` style="background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.95) 100%), url('${normalizedUrl}')"`
    : "";
  hero.innerHTML = `
    <div class="hero-bg-image"${bgStyle}></div>
    <div class="hero-noise-overlay"></div>
    <div class="hero-divider-line"></div>
    <div class="hero-content-inner ${alignEnd ? "article-hero-inner" : ""}">
      ${metaTop ? `<div class="article-meta-top">${metaTop}</div>` : ""}
      <h1>${title}</h1>
      ${subtitle ? `<p class="hero-subtitle">${subtitle}</p>` : ""}
      ${metaText ? `<div class="article-meta">${metaText}</div>` : ""}
      ${
        buttonText
          ? `<button class="button button-dark" data-link="${buttonRoute}"><span>${buttonText}</span></button>`
          : ""
      }
    </div>
  `;
  if (buttonText && buttonRoute) {
    const heroButton = hero.querySelector("button");
    heroButton.addEventListener("click", () => {
      location.hash = `#/${buttonRoute}`;
    });
  }
  return hero;
};

const renderHero = () => {
  const slideshowArticles = siteData.articles.filter(
    (art) => art.main_image && art.slug !== "about-author"
  );

  const shuffled = [...slideshowArticles].sort(() => Math.random() - 0.5);

  const hero = document.createElement("section");
  hero.className = "section hero-base hero-fold";

  const slideshowContainer = document.createElement("div");
  slideshowContainer.className = "hero-slideshow-container";

  shuffled.forEach((art, idx) => {
    const slide = document.createElement("div");
    slide.className = `hero-slide${idx === 0 ? " active" : ""}`;
    const cleanImg = cleanImageUrl(art.main_image);
    if (idx === 0) {
      slide.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.95) 100%), url('${cleanImg}')`;
    } else {
      slide.dataset.bg = cleanImg;
    }
    slideshowContainer.appendChild(slide);
  });

  if (shuffled.length === 0) {
    const slide = document.createElement("div");
    slide.className = "hero-slide active";
    slide.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.95) 100%), url('images/bw.jpg')`;
    slideshowContainer.appendChild(slide);
  }

  hero.appendChild(slideshowContainer);

  const noiseOverlay = document.createElement("div");
  noiseOverlay.className = "hero-noise-overlay";
  hero.appendChild(noiseOverlay);

  const heroHeader = siteData.settings.hero_header || "Honor other's&nbsp;passions,<br />honor your own.";
  const heroSubtitle = siteData.settings.hero_subtitle || "A place to trade stories, celebrate creativity, and preserve the sparks that make us who we are.";

  const content = document.createElement("div");
  content.className = "hero-content-inner";
  content.innerHTML = `
    <h1>${heroHeader}</h1>
    <p>${heroSubtitle}</p>
    <button class="button button-dark" data-link="contact"><span>Share your story</span></button>
  `;
  content.querySelector("button").addEventListener("click", () => {
    location.hash = "#/contact";
  });
  hero.appendChild(content);

  const dividerLine = document.createElement("div");
  dividerLine.className = "hero-divider-line";
  hero.appendChild(dividerLine);

  const navOverlay = document.createElement("div");
  navOverlay.className = "hero-slideshow-nav";

  const infoSpan = document.createElement("span");
  infoSpan.className = "hero-slideshow-info";

  const dotsContainer = document.createElement("div");
  dotsContainer.className = "hero-slideshow-dots";

  shuffled.forEach((art, idx) => {
    const dot = document.createElement("span");
    dot.className = `hero-dot${idx === 0 ? " active" : ""}`;
    dot.dataset.index = idx;
    dotsContainer.appendChild(dot);
  });

  navOverlay.appendChild(infoSpan);
  navOverlay.appendChild(dotsContainer);
  hero.appendChild(navOverlay);

  let currentSlide = 0;

  const updateSlide = (nextIndex) => {
    const slides = slideshowContainer.querySelectorAll(".hero-slide");
    const dots = dotsContainer.querySelectorAll(".hero-dot");
    if (!slides.length || !dots.length) return;

    const nextSlideEl = slides[nextIndex];
    if (nextSlideEl.dataset.bg) {
      nextSlideEl.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.95) 100%), url('${nextSlideEl.dataset.bg}')`;
      delete nextSlideEl.dataset.bg;
    }

    const preloadIndex = (nextIndex + 1) % shuffled.length;
    const preloadSlideEl = slides[preloadIndex];
    if (preloadSlideEl && preloadSlideEl.dataset.bg) {
      preloadSlideEl.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.95) 100%), url('${preloadSlideEl.dataset.bg}')`;
      delete preloadSlideEl.dataset.bg;
    }

    slides[currentSlide].classList.remove("active");
    dots[currentSlide].classList.remove("active");

    currentSlide = nextIndex;

    slides[currentSlide].classList.add("active");
    dots[currentSlide].classList.add("active");

    const activeArt = shuffled[currentSlide];
    infoSpan.innerHTML = `showing image from <a href="#/article/${activeArt.slug}">${activeArt.title}</a>`;
  };

  if (shuffled.length > 0) {
    updateSlide(0);
    if (shuffled.length > 1) {
      const secondSlide = slideshowContainer.querySelectorAll(".hero-slide")[1];
      if (secondSlide && secondSlide.dataset.bg) {
        secondSlide.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0.95) 100%), url('${secondSlide.dataset.bg}')`;
        delete secondSlide.dataset.bg;
      }
    }
  } else {
    navOverlay.style.display = "none";
  }

  const startSlideshow = () => {
    slideshowInterval = setInterval(() => {
      const nextIdx = (currentSlide + 1) % shuffled.length;
      updateSlide(nextIdx);
    }, 10000);
  };

  dotsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("hero-dot")) {
      const targetIdx = parseInt(e.target.dataset.index);
      if (targetIdx !== currentSlide) {
        clearInterval(slideshowInterval);
        updateSlide(targetIdx);
        startSlideshow();
      }
    }
  });

  if (shuffled.length > 1) {
    startSlideshow();
  }

  return hero;
};

const renderAbout = () => {
  const authorArticle = siteData.articles.find((art) => art.slug === "about-author");
  const blurbText = authorArticle && authorArticle.hook
    ? authorArticle.hook
    : "A quick portrait of the storyteller behind One Day, the moments that shaped her, and the people she is honoring through every post.";

  const section = document.createElement("section");
  section.className = "section about-author";
  section.innerHTML = `
    <div>
      <h2>About the Author</h2>
      <p>${blurbText}</p>
      <button class="button button-light" data-link="about">Read More</button>
    </div>
    <div class="author-image" role="img" aria-label="Portrait of the author"></div>
  `;
  section.querySelector("button").addEventListener("click", () => {
    location.hash = "#/about";
  });
  return section;
};

const buildTile = (article, index) => {
  const template = document.getElementById("tile-template");
  const tile = template.content.firstElementChild.cloneNode(true);
  const imgUrl = cleanImageUrl(article.main_image);
  tile.querySelector(".tile-image").style.backgroundImage = `url(${imgUrl})`;
  tile.querySelector(".tile-date").textContent = formatDate(article.date);
  tile.querySelector(".tile-title").textContent = article.title;
  tile.querySelector(".tile-hook").textContent = article.hook || "";
  tile.style.animationDelay = `${index * 0.05}s`;
  tile.addEventListener("click", () => {
    location.hash = `#/article/${article.slug}`;
  });
  return tile;
};

const renderStoriesRow = () => {
  const section = document.createElement("section");
  section.className = "section";
  section.innerHTML = `
    <div class="stories-header">
      <h2>Our Stories</h2>
      <p>New voices, familiar feelings, and the textures of everyday wonder.</p>
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.className = "tile-row-wrapper";

  const row = document.createElement("div");
  row.className = "tile-row autoscroll";

  const articlesToRender = siteData.articles
    .filter((article) => article.slug !== "about-author")
    .slice(0, 6);

  // Render 4 sets of tiles to ensure infinite chaining on large screens
  for (let i = 0; i < 4; i++) {
    articlesToRender.forEach((article, index) => {
      row.appendChild(buildTile(article, index));
    });
  }

  wrapper.appendChild(row);

  const button = document.createElement("button");
  button.className = "button button-dark";
  button.innerHTML = "<span>View all articles</span>";
  button.addEventListener("click", () => {
    location.hash = "#/stories";
  });

  const buttonWrap = document.createElement("div");
  buttonWrap.className = "center-actions";
  buttonWrap.appendChild(button);

  section.appendChild(wrapper);
  section.appendChild(buttonWrap);
  return section;
};

const renderHome = () => {
  app.innerHTML = "";
  app.appendChild(renderHero());
  app.appendChild(renderAbout());
  app.appendChild(renderStoriesRow());
  updateHeroFold();
};

const renderStories = () => {
  app.innerHTML = "";
  const section = document.createElement("section");
  section.className = "section";
  section.innerHTML = `
    <div class="stories-header">
      <h2>Our Stories</h2>
      <p>Browse every shared moment, from quiet rituals to bold adventures.</p>
    </div>
  `;

  const controls = document.createElement("div");
  controls.className = "story-controls";
  controls.innerHTML = `
    <div></div>
    <input type="search" placeholder="Search stories" aria-label="Search stories" />
    <select aria-label="Sort stories">
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
      <option value="title">Title A-Z</option>
    </select>
  `;

  const grid = document.createElement("div");
  grid.className = "tile-grid";

  const renderGrid = (items) => {
    grid.innerHTML = "";
    items.forEach((article, index) => {
      grid.appendChild(buildTile(article, index));
    });
  };

  const filterStories = () => {
    const query = controls.querySelector("input").value.toLowerCase();
    const sort = controls.querySelector("select").value;
    let items = siteData.articles.filter(
      (article) => article.slug !== "about-author"
    );

    if (query) {
      items = items.filter((article) => {
        return (
          article.title.toLowerCase().includes(query) ||
          (article.theme || "").toLowerCase().includes(query) ||
          (article.hook || "").toLowerCase().includes(query)
        );
      });
    }

    if (sort === "newest") {
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sort === "oldest") {
      items.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    renderGrid(items);
  };

  controls.querySelector("input").addEventListener("input", filterStories);
  controls.querySelector("select").addEventListener("change", filterStories);

  section.appendChild(controls);
  section.appendChild(grid);
  app.appendChild(section);

  filterStories();
};

const renderContact = () => {
  app.innerHTML = "";
  const section = document.createElement("section");
  section.className = "section";
  section.innerHTML = `
    <div class="stories-header">
      <h2>Contact Us</h2>
      <p>Share your story or ask about collaborations.</p>
    </div>
    <form class="contact-form">
      <input type="text" name="name" placeholder="Your name" required />
      <input type="email" name="email" placeholder="Your email" required />
      <textarea name="message" rows="6" placeholder="Your message" required></textarea>
      <button class="button button-dark" type="submit"><span>Send message</span></button>
    </form>
  `;

  const form = section.querySelector(".contact-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector("button");
    const buttonSpan = button.querySelector("span");
    const originalText = buttonSpan.innerHTML;

    button.disabled = true;
    buttonSpan.innerHTML = "Sending...";

    const formData = new FormData(form);
    formData.append("access_key", "b90be0c8-eb8c-4a3f-ac54-1eb362d93cba");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.status === 200 && result.success) {
        form.innerHTML = `
          <div class="form-status success" style="text-align: center; padding: 40px 20px; animation: fadeIn 0.5s ease;">
            <div style="font-size: 3rem; margin-bottom: 20px; color: var(--od-yellow);">✓</div>
            <h3 style="font-family: 'Kingthings', serif; font-size: 1.8rem; color: var(--od-white); margin-bottom: 12px;">Message Sent!</h3>
            <p style="color: var(--od-light-grey); line-height: 1.6; max-width: 400px; margin: 0 auto;">Thank you for reaching out. We have received your message and will get back to you shortly.</p>
          </div>
        `;
      } else {
        throw new Error(result.message || "Something went wrong.");
      }
    } catch (error) {
      button.disabled = false;
      buttonSpan.innerHTML = originalText;
      alert(`Error: ${error.message}`);
    }
  });

  app.appendChild(section);
};

const renderArticle = (slug) => {
  const article = siteData.articles.find((item) => item.slug === slug);
  if (!article) {
    app.innerHTML = `<section class="section"><p>Article not found.</p></section>`;
    return;
  }
  app.innerHTML = "";

  const isAuthorPage = (slug === "about-author");

  const printIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="button-icon"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`;
  const shareIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="button-icon"><path d="M12 2l-4 4h3v6h2V6h3l-4-4zm6 10v8H6v-8H4v10h16V12h-2z"/></svg>`;

  const hero = buildHeroSection({
    title: article.header || article.title,
    subtitle: article.hook,
    metaTop: `${formatDate(article.date)} · ${article.theme}`,
    metaText: isAuthorPage
      ? `<button class="button button-dark button-inline" type="button" id="share-btn" aria-label="Share">${shareIcon}<span>Share</span></button>`
      : `<div class="article-meta-left"><div class="article-meta-arrows"><button class="article-hero-arrow" data-target="prev" aria-label="Previous article">&#8592;</button><button class="article-hero-arrow" data-target="next" aria-label="Next article">&#8594;</button></div></div><div class="article-meta-actions"><button class="button button-dark button-inline" type="button" id="print-poster-btn" aria-label="Print Poster">${printIcon}<span>Print Poster</span></button><button class="button button-dark button-inline" type="button" id="share-btn" aria-label="Share">${shareIcon}<span>Share</span></button></div>`,
    imageUrl: article.main_image,
    alignEnd: true,
  });

  const content = document.createElement("section");
  content.className = "section article-content";
  content.innerHTML = `
    <div class="article-body">${markdownToHtml(article.body)}</div>
  `;

  app.appendChild(hero);
  app.appendChild(content);

  const shareBtn = app.querySelector("#share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      showShareModal();
    });
  }

  if (!isAuthorPage) {
    const poster = document.createElement("section");
    poster.className = "poster-print";
    const imgUrl = cleanImageUrl(article.main_image);
    poster.innerHTML = `
      <img class="poster-image" src="${imgUrl}" alt="${article.title}" />
      <div class="poster-content">
        <h1>${article.header || article.title}</h1>
        <div class="poster-meta">${formatDate(article.date)} · ${article.theme}</div>
        <p class="poster-hook">${article.hook}</p>
        <div class="poster-body">${markdownToHtml(article.body)}</div>
        <div class="poster-qr-wrap">
          <div class="poster-qr" aria-label="QR code for this article"></div>
        </div>
      </div>
    `;
    app.appendChild(poster);

    const printButton = app.querySelector("#print-poster-btn");
    if (printButton) {
      printButton.addEventListener("click", () => {
        window.print();
      });
    }

    const qrTarget = `${location.origin}${location.pathname}${location.hash}`;
    renderPosterQr(poster.querySelector(".poster-qr"), qrTarget);

    const articleOrder = siteData.articles.filter(
      (item) => item.slug !== "about-author"
    );
    const currentIndex = articleOrder.findIndex((item) => item.slug === slug);
    const prevArticle = articleOrder[(currentIndex - 1 + articleOrder.length) % articleOrder.length];
    const nextArticle = articleOrder[(currentIndex + 1) % articleOrder.length];
    const arrowButtons = app.querySelectorAll(".article-hero-arrow");
    arrowButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.target === "prev" ? prevArticle.slug : nextArticle.slug;
        location.hash = `#/article/${target}`;
      });
    });

    if (articleKeyHandler) {
      window.removeEventListener("keydown", articleKeyHandler);
    }
    articleKeyHandler = (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      const isTypingTarget =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTypingTarget) return;
      if (event.key === "ArrowLeft") {
        location.hash = `#/article/${prevArticle.slug}`;
      }
      if (event.key === "ArrowRight") {
        location.hash = `#/article/${nextArticle.slug}`;
      }
    };
    window.addEventListener("keydown", articleKeyHandler);
  } else {
    if (articleKeyHandler) {
      window.removeEventListener("keydown", articleKeyHandler);
      articleKeyHandler = null;
    }
  }

  updateHeroFold();
};

const showShareModal = () => {
  const existing = document.querySelector(".share-modal-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "share-modal-overlay";
  overlay.innerHTML = `
    <div class="share-modal-card">
      <button class="share-modal-close" aria-label="Close modal">&times;</button>
      <h3 class="share-modal-title">Share</h3>
      <div class="share-modal-qr-container"></div>
      <p class="share-modal-url-text">${location.href}</p>
      <button class="button button-dark share-modal-copy-btn"><span>Copy Link</span></button>
    </div>
  `;

  const closeBtn = overlay.querySelector(".share-modal-close");
  const closeModal = () => {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 300);
  };
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  const copyBtn = overlay.querySelector(".share-modal-copy-btn");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(location.href).then(() => {
      const span = copyBtn.querySelector("span");
      const originalText = span.innerHTML;
      span.innerHTML = "Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        span.innerHTML = originalText;
        copyBtn.classList.remove("copied");
      }, 2000);
    });
  });

  document.body.appendChild(overlay);

  const qrContainer = overlay.querySelector(".share-modal-qr-container");
  if (typeof QRCodeStyling !== "undefined") {
    const qr = new QRCodeStyling({
      width: 200,
      height: 200,
      type: "canvas",
      data: location.href,
      qrOptions: {
        errorCorrectionLevel: "H",
      },
      dotsOptions: {
        color: "#ffae00",
        type: "rounded",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#ffae00",
      },
      cornersDotOptions: {
        type: "dot",
        color: "#ffae00",
      },
      backgroundOptions: {
        color: "rgba(0, 0, 0, 0)",
      },
    });
    qr.append(qrContainer);
  }

  requestAnimationFrame(() => {
    overlay.classList.add("active");
  });
};

const renderPosterQr = (container, value) => {
  if (!container || typeof QRCodeStyling === "undefined") return;
  container.innerHTML = "";
  const qr = new QRCodeStyling({
    width: 140,
    height: 140,
    type: "canvas",
    data: value,
    qrOptions: {
      errorCorrectionLevel: "M",
    },
    dotsOptions: {
      color: "rgba(255, 255, 255, 0.6)",
      type: "rounded",
    },
    cornersSquareOptions: {
      type: "extra-rounded",
      color: "rgba(255, 255, 255, 0.6)",
    },
    cornersDotOptions: {
      type: "dot",
      color: "rgba(255, 255, 255, 0.6)",
    },
    backgroundOptions: {
      color: "rgba(0, 0, 0, 0)",
    },
  });
  qr.append(container);
};

const handleRoute = () => {
  const hash = location.hash.replace("#", "");
  const parts = hash.split("/").filter(Boolean);
  const route = parts[0] || "/";

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  if (slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
  }

  const isArticlePage = (route === "article" || route === "about" || route === "/" || route === "home");
  header.classList.toggle("header-gradient", isArticlePage);

  if (route === "/" || route === "home") {
    setActiveNav("/");
    renderHome();
  } else if (route === "stories") {
    setActiveNav("stories");
    renderStories();
  } else if (route === "about") {
    setActiveNav("about");
    renderArticle("about-author");
  } else if (route === "contact") {
    setActiveNav("contact");
    renderContact();
  } else if (route === "article" && parts[1]) {
    setActiveNav("");
    renderArticle(parts[1]);
  } else {
    setActiveNav("");
    app.innerHTML = `<section class="section"><p>Page not found.</p></section>`;
  }
};

const init = async () => {
  await fetchData();
  handleRoute();
  window.addEventListener("hashchange", handleRoute);
};

menuToggle.addEventListener("click", () => {
  nav.classList.toggle("open");
  menuToggle.classList.toggle("open");
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle.classList.remove("open");
  });
});

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
  if (!isTicking) {
    window.requestAnimationFrame(() => {
      updateHeroFold();
      isTicking = false;
    });
    isTicking = true;
  }
});

init().catch((error) => {
  app.innerHTML = `<section class="section"><p>${error.message}</p></section>`;
});

window.addEventListener("resize", () => {
  const activeLink = nav.querySelector("a.active");
  if (activeLink) {
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    navIndicator.style.width = `${linkRect.width}px`;
    navIndicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
  }
  updateHeroFold();
});

const updateHeroFold = () => {
  const heroes = document.querySelectorAll(".hero-fold");
  if (!heroes.length) return;
  heroes.forEach((hero) => {
    const rect = hero.getBoundingClientRect();
    const height = hero.offsetHeight || 1;
    const travel = Math.min(Math.max(-rect.top, 0), height * 0.6);
    const progress = Math.min(travel / (height * 0.6), 1);
    const notch = (progress * 8).toFixed(2);
    hero.style.setProperty("--hero-notch", `${notch}%`);

    const divider = hero.querySelector(".hero-divider-line");
    if (divider) {
      divider.style.opacity = Math.max(0, Math.min(1, (progress - 0.05) * 4)).toFixed(2);
    }

    const nav = hero.querySelector(".hero-slideshow-nav");
    if (nav) {
      const opacity = Math.max(0, 1 - window.scrollY / 150);
      nav.style.opacity = opacity;
      nav.style.pointerEvents = opacity === 0 ? "none" : "auto";
    }

    if (isIOS) {
      hero.style.setProperty("--hero-parallax", "0px");
      return;
    }
    const parallax = Math.min(Math.max(-rect.top, 0), height) * 0.2;
    hero.style.setProperty("--hero-parallax", `${parallax}px`);
  });
};
