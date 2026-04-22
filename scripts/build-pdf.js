import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const OUTPUT_DIR = 'output';
const DEFAULT_THEME = 'jsonresume-theme-even';
const DEFAULT_LANGS = ['ko', 'en'];

const PDF_OPTIONS = {
  format: 'A4',
  margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
  printBackground: true,
};

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
  console.log(`Usage: npm run build:pdf [-- <flags>]

Flags:
  --lang <ko|en>    Build only the specified language (default: all configured)
  --help            Show this message`);
}

function getConfig() {
  const cfg = pkg.config || {};
  return {
    theme: cfg.theme || DEFAULT_THEME,
    languages: Array.isArray(cfg.languages) && cfg.languages.length ? cfg.languages : DEFAULT_LANGS,
  };
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function adaptResumeForThemes(resume) {
  const r = structuredClone(resume);
  if (r.basics && r.basics.url && !r.basics.website) {
    r.basics.website = r.basics.url;
  }
  for (const w of r.work ?? []) {
    if (w.name && !w.company) w.company = w.name;
    if (w.url && !w.website) w.website = w.url;
  }
  for (const v of r.volunteer ?? []) {
    if (v.organization && !v.company) v.company = v.organization;
    if (v.url && !v.website) v.website = v.url;
  }
  for (const e of r.education ?? []) {
    if (e.url && !e.website) e.website = e.url;
  }
  return r;
}

async function loadTheme(name) {
  const mod = await import(name);
  const theme = mod.default ?? mod;
  if (typeof theme.render !== 'function') {
    throw new Error(`Theme "${name}" does not export a render() function`);
  }
  return theme;
}

// NOTE on macchiato class names (they're inverted from visual position):
//   .left-column  = <aside> with About/Skills/Education/Languages — visually on the RIGHT
//   .right-column = main content (Work/Volunteer/Publications)    — visually on the LEFT
const PRINT_OVERRIDE_CSS = `
  /* Match Summary's full-width horizontal extent by zeroing resume-content padding */
  .page .resume-header,
  .page .resume-content {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  /* Switch two-column layout from floats to flexbox so main column
     never spills into sidebar width after the sidebar ends */
  .resume-content {
    display: flex !important;
    flex-direction: row-reverse;
    align-items: flex-start;
    gap: 20px;
  }
  .left-column {
    float: none !important;
    flex: 0 0 160px !important;
    margin: 0 !important;
  }
  .right-column {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    overflow: visible !important;
  }
  /* Summary → resume-content gap */
  .summary-container.top-summary {
    margin-bottom: 15px;
  }
  /* Education: stack name/date vertically with tight gap
     (inherits align-items: flex-start from base .section-header) */
  .education-container .section-header {
    flex-direction: column !important;
    justify-content: flex-start !important;
    gap: 0 !important;
  }
  /* Respect \\n in education area/studyType as line breaks */
  .education-container .item h4 {
    white-space: pre-line;
  }
  /* Skills: skills-container lacks .container class, so replicate its padding */
  .skills-container {
    padding-top: 20px;
  }
  .skills-container > section.container {
    padding-top: 0 !important;
  }
  .skills-container > section + section {
    margin-top: 12px;
  }
  /* Skill category (리더십) → bold like 데이터라이즈/서울대학교, no keyline */
  .skills-container > section > .title h3 {
    font-weight: 700;
  }
  .skills-container > section > .title .keyline {
    display: none;
  }
  /* Skill level (Expert) → h5.italic date style (11px italic light, no capitalize) */
  .skills-container > section > h4.bold.capitalize {
    font-weight: 300 !important;
    font-style: italic;
    font-size: 11px !important;
    text-transform: none !important;
  }
  .section-header {
    display: flex !important;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .section-header .pull-left {
    float: none !important;
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .section-header .pull-right {
    float: none !important;
    flex: 0 0 auto;
    white-space: nowrap;
  }
  @media print {
    .container, .work-container { page-break-inside: auto !important; }
    .work-container .item, .item { page-break-inside: avoid; }
  }
`;

async function renderPdf(browser, html, resume, outPath) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.addStyleTag({ content: PRINT_OVERRIDE_CSS });
    await page.evaluate((resume) => {
      const resumeContent = document.querySelector('.resume-content');
      const sidebar = document.querySelector('.left-column');
      const summary = document.querySelector('.summary-container');
      if (summary && resumeContent?.parentNode) {
        summary.classList.add('top-summary');
        resumeContent.parentNode.insertBefore(summary, resumeContent);
      }
      const education = document.querySelector('.education-container');
      const languages = document.querySelector('.languages-container');
      if (education) {
        if (languages?.parentNode) {
          languages.parentNode.insertBefore(education, languages);
        } else if (sidebar) {
          sidebar.appendChild(education);
        }
      }
      const skills = document.querySelector('.skills-container');
      if (skills && !skills.querySelector(':scope > .title')) {
        const title = document.createElement('div');
        title.className = 'title';
        title.innerHTML = '<h3>Skills</h3><div class="keyline"></div>';
        skills.insertBefore(title, skills.firstChild);
      }
      // Replace each item's title with a plain hyperlink (name → url),
      // overwriting any theme-provided wrapper (including volunteer's "∙ URL" sublink).
      const linkify = (containerSel, items, nameKey) => {
        const container = document.querySelector(containerSel);
        if (!container || !Array.isArray(items)) return;
        const itemEls = container.querySelectorAll(':scope > section.item');
        itemEls.forEach((el, i) => {
          const entry = items[i];
          if (!entry?.url || !entry[nameKey]) return;
          const target = el.querySelector('.section-header .pull-left');
          if (!target) return;
          const a = document.createElement('a');
          a.href = entry.url;
          a.target = '_blank';
          a.textContent = entry[nameKey];
          target.replaceChildren(a);
        });
      };
      linkify('.work-container', resume.work, 'name');
      linkify('.volunteer-container', resume.volunteer, 'organization');
      linkify('.education-container', resume.education, 'institution');
      linkify('.publications-container', resume.publications, 'name');
    }, resume);
    await page.pdf({ ...PDF_OPTIONS, path: outPath });
  } finally {
    await page.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const { theme: themeName, languages } = getConfig();
  const langs = args.langs ?? languages;

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
      const html = await theme.render(adaptResumeForThemes(resume));
      const outPath = path.resolve(OUTPUT_DIR, `resume-${lang}.pdf`);
      console.log(`Rendering ${lang} → ${path.relative(process.cwd(), outPath)}`);
      await renderPdf(browser, html, adaptResumeForThemes(resume), outPath);
    }
  } finally {
    await browser.close();
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('PDF build failed:', err.message || err);
  process.exit(1);
});
