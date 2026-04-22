import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { getConfig, loadTheme, renderResumePage } from './render.js';

const OUTPUT_DIR = 'output';

const LANG_LABELS = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };

const SITE_NAV_CSS = `
.site-nav {
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 4px;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(6px);
  padding: 6px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 0.02em;
}
.site-nav a {
  color: #333;
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 4px;
  transition: background 0.15s ease;
}
.site-nav a:hover {
  background: #f0f0f0;
}
.site-nav a.active {
  background: #222;
  color: #fff;
}
.site-nav .divider {
  width: 1px;
  height: 16px;
  background: #ddd;
  margin: 0 4px;
}
@media print {
  .site-nav { display: none !important; }
}
@media (max-width: 640px) {
  .site-nav { top: 8px; right: 8px; padding: 4px 6px; font-size: 11px; }
}
`;

function parseArgs(argv) {
  const args = { langs: null, help: false };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--lang') {
      args.langs = [rest[++i]];
    } else if (a.startsWith('--lang=')) {
      args.langs = [a.slice('--lang='.length)];
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: npm run build:html [-- <flags>]

Flags:
  --lang <ko|en>    Build only the specified language (default: all configured)
  --help            Show this message`);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function pathForLang(lang, defaultLang) {
  return lang === defaultLang ? '/' : `/${lang}/`;
}

function metaFromResume(resume) {
  const name = resume.basics?.name || '';
  const label = resume.basics?.label || '';
  const summary = (resume.basics?.summary || '').replace(/\s+/g, ' ').trim();
  const title = label ? `${name} — ${label}` : name;
  const description = summary.length > 200 ? summary.slice(0, 197) + '…' : summary;
  return { title, description };
}

async function writeFileMk(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

async function injectSiteChrome(page, { lang, languages, defaultLang, title, description }) {
  await page.evaluate((opts) => {
    const { lang, nav, css, title, description } = opts;

    document.documentElement.lang = lang;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const m = document.createElement('meta');
      m.name = 'viewport';
      m.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(m);
    }

    if (title) {
      let t = document.querySelector('title');
      if (!t) {
        t = document.createElement('title');
        document.head.appendChild(t);
      }
      t.textContent = title;

      const ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.content = title;
      document.head.appendChild(ogTitle);
    }

    if (description) {
      const md = document.createElement('meta');
      md.name = 'description';
      md.content = description;
      document.head.appendChild(md);

      const ogd = document.createElement('meta');
      ogd.setAttribute('property', 'og:description');
      ogd.content = description;
      document.head.appendChild(ogd);
    }

    const ogType = document.createElement('meta');
    ogType.setAttribute('property', 'og:type');
    ogType.content = 'profile';
    document.head.appendChild(ogType);

    document.body.insertAdjacentHTML('afterbegin', nav);
  }, {
    lang,
    css: SITE_NAV_CSS,
    title,
    description,
    nav: buildNavHtml({ lang, languages, defaultLang }),
  });
}

function buildNavHtml({ lang, languages, defaultLang }) {
  const links = languages.map((l) => {
    const href = pathForLang(l, defaultLang);
    const label = LANG_LABELS[l] || l.toUpperCase();
    const cls = l === lang ? ' class="active"' : '';
    return `<a href="${href}"${cls}>${label}</a>`;
  }).join('');
  const pdfHref = `/resume-${lang}.pdf`;
  return `<nav class="site-nav">${links}<span class="divider"></span><a href="${pdfHref}" download>PDF ↓</a></nav>`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const { theme: themeName, languages, site } = getConfig();
  const langs = args.langs ?? languages;
  const defaultLang = languages[0];

  const resumes = [];
  for (const lang of langs) {
    const src = path.resolve(`resume.${lang}.json`);
    if (!(await fileExists(src))) {
      console.warn(`Skipping ${lang}: ${src} not found.`);
      continue;
    }
    resumes.push({ lang, src });
  }

  if (resumes.length === 0) {
    console.error('No resume JSON files found for the requested languages.');
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Loading theme: ${themeName}`);
  const theme = await loadTheme(themeName);

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const { lang, src } of resumes) {
      const resume = JSON.parse(await fs.readFile(src, 'utf-8'));
      const { title, description } = metaFromResume(resume);
      const page = await renderResumePage(browser, theme, resume);
      try {
        await injectSiteChrome(page, { lang, languages, defaultLang, title, description });
        const html = await page.content();
        const outPath = lang === defaultLang
          ? path.resolve(OUTPUT_DIR, 'index.html')
          : path.resolve(OUTPUT_DIR, lang, 'index.html');
        console.log(`Rendering ${lang} → ${path.relative(process.cwd(), outPath)}`);
        await writeFileMk(outPath, html);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (site) {
    const cnamePath = path.resolve(OUTPUT_DIR, 'CNAME');
    await fs.writeFile(cnamePath, `${site}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), cnamePath)} (${site})`);
  }

  const nojekyllPath = path.resolve(OUTPUT_DIR, '.nojekyll');
  await fs.writeFile(nojekyllPath, '');

  console.log('Done.');
}

main().catch((err) => {
  console.error('HTML build failed:', err.message || err);
  process.exit(1);
});
