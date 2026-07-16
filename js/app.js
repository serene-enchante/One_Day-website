const app = document.getElementById("app");
const nav = document.getElementById("site-nav");
const navIndicator = nav.querySelector(".nav-indicator");
const menuToggle = document.getElementById("menu-toggle");
const header = document.getElementById("site-header");
let siteData = { settings: {}, articles: [] };
let isTicking = false;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
let articleKeyHandler = null;

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
  alignEnd = false,
}) => {
  const hero = document.createElement("section");
  hero.className = `section hero-base hero-fold${alignEnd ? " hero-article" : ""}`;
  if (imageUrl) {
    const normalizedUrl = cleanImageUrl(imageUrl);
    hero.style.backgroundImage = `linear-gradient(120deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('${normalizedUrl}')`;
  }
  hero.innerHTML = `
    <div class="${alignEnd ? "article-hero-inner" : ""}">
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
  return buildHeroSection({
    title: "Honor other's&nbsp;passions,<br />honor your own.",
    subtitle:
      "A place to trade stories, celebrate creativity, and preserve the sparks that make us who we are.",
    buttonText: "Share your story",
    buttonRoute: "contact",
  });
};

const renderAbout = () => {
  const section = document.createElement("section");
  section.className = "section about-author";
  section.innerHTML = `
    <div>
      <h2>About the Author</h2>
      <p>${
        siteData.settings.about_blurb ||
        "A quick portrait of the storyteller behind One Day, the moments that shaped her, and the people she is honoring through every post."
      }</p>
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

  const row = document.createElement("div");
  row.className = "tile-row";

  siteData.articles
    .filter((article) => article.slug !== "about-author")
    .slice(0, 6)
    .forEach((article, index) => {
      row.appendChild(buildTile(article, index));
    });

  const button = document.createElement("button");
  button.className = "button button-dark";
  button.innerHTML = "<span>View all articles</span>";
  button.addEventListener("click", () => {
    location.hash = "#/stories";
  });

  const buttonWrap = document.createElement("div");
  buttonWrap.className = "center-actions";
  buttonWrap.appendChild(button);

  section.appendChild(row);
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
  app.appendChild(section);
};

const renderArticle = (slug) => {
  const article = siteData.articles.find((item) => item.slug === slug);
  if (!article) {
    app.innerHTML = `<section class="section"><p>Article not found.</p></section>`;
    return;
  }
  app.innerHTML = "";
  const hero = buildHeroSection({
    title: article.header || article.title,
    subtitle: article.hook,
    metaText: `<div class="article-meta-left"><span>${formatDate(article.date)} · ${article.theme}</span><div class="article-meta-arrows"><button class="article-hero-arrow" data-target="prev" aria-label="Previous article">&#8592;</button><button class="article-hero-arrow" data-target="next" aria-label="Next article">&#8594;</button></div></div><button class="button button-dark button-inline" type="button"><span>Print Poster</span></button>`,
    imageUrl: article.main_image,
    alignEnd: true,
  });
  const content = document.createElement("section");
  content.className = "section article-content";
  content.innerHTML = `
    <div class="article-body">${markdownToHtml(article.body)}</div>
  `;
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
  app.appendChild(hero);
  app.appendChild(content);
  app.appendChild(poster);
  const printButton = app.querySelector(".button-inline");
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
  updateHeroFold();
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
    if (isIOS) {
      hero.style.setProperty("--hero-parallax", "0px");
      return;
    }
    const parallax = Math.min(Math.max(-rect.top, 0), height) * 0.2;
    hero.style.setProperty("--hero-parallax", `${parallax}px`);
  });
};
