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

  frontMatterBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      frontMatter[key.trim()] = rest.join(":").trim();
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

  entries.forEach((entry) => {
    const raw = fs.readFileSync(entry.path, "utf8");
    const { frontMatter, body } = parseFrontMatter(raw);
    const slug = slugFromFile(entry.file);
    const type = (frontMatter.type || "article").toLowerCase();

    if (type === "settings") {
      settings = { ...frontMatter, body };
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
    articles,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`Generated ${articles.length} articles.`);
};

main();
