const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const contentDir = path.join(rootDir, "content");
const dataDir = path.join(rootDir, "data");
const outputPath = path.join(dataDir, "articles.json");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const parseFrontMatter = (raw) => {
  if (!raw.startsWith("---")) {
    return { frontMatter: {}, body: raw.trim() };
  }

  const sections = raw.split("---");
  const frontMatterBlock = sections[1] || "";
  const body = sections.slice(2).join("---").trim();
  const frontMatter = {};

  const lines = frontMatterBlock.split("\n");
  let lastKey = null;

  lines.forEach((line) => {
    // If the line starts with spaces or tabs, it is a continuation line
    if (/^\s+/.test(line)) {
      if (lastKey) {
        const cleanedPart = line.trim();
        frontMatter[lastKey] = (frontMatter[lastKey] + " " + cleanedPart).trim();
      }
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) return;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1) {
      const key = trimmed.slice(0, colonIndex).trim();
      const val = trimmed.slice(colonIndex + 1).trim();
      const cleanedVal = val.replace(/(^["']|["']$)/g, "");
      frontMatter[key] = cleanedVal;
      lastKey = key;
    }
  });

  return { frontMatter, body };
};

const loadMarkdownFiles = () => {
  if (!fs.existsSync(contentDir)) {
    return [];
  }
  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({
      file,
      path: path.join(contentDir, file),
    }));
};

const slugFromFile = (filename) => filename.replace(/\.md$/, "");

const main = () => {
  ensureDir(dataDir);
  const entries = loadMarkdownFiles();
  const articles = [];
  let settings = {};
  let homepage_hero = {};

  entries.forEach((entry) => {
    const raw = fs.readFileSync(entry.path, "utf8");
    const { frontMatter, body } = parseFrontMatter(raw);
    const slug = slugFromFile(entry.file);
    const type = (frontMatter.type || "article").toLowerCase();

    if (slug === "settings" || type === "settings") {
      settings = { ...frontMatter, body };
      return;
    }

    if (slug === "homepage-hero" || type === "homepage_hero") {
      homepage_hero = { ...frontMatter, body };
      return;
    }

    articles.push({
      slug,
      title: frontMatter.title || slug,
      header: frontMatter.header || frontMatter.title || slug,
      hook: frontMatter.hook || "",
      body,
      date: frontMatter.date || "",
      theme: frontMatter.theme || "",
      main_image: frontMatter.main_image || "",
    });
  });

  articles.sort((a, b) => new Date(b.date) - new Date(a.date));

  const payload = {
    generated_at: new Date().toISOString(),
    settings,
    homepage_hero,
    articles,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`Generated ${articles.length} articles.`);
};

main();
