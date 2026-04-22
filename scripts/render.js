import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

export const DEFAULT_THEME = 'jsonresume-theme-macchiato';
export const DEFAULT_LANGS = ['ko', 'en'];

export function getConfig() {
  const cfg = pkg.config || {};
  return {
    theme: cfg.theme || DEFAULT_THEME,
    languages: Array.isArray(cfg.languages) && cfg.languages.length ? cfg.languages : DEFAULT_LANGS,
    site: cfg.site || null,
  };
}

export async function loadTheme(name) {
  const mod = await import(name);
  const theme = mod.default ?? mod;
  if (typeof theme.render !== 'function') {
    throw new Error(`Theme "${name}" does not export a render() function`);
  }
  return theme;
}

export function adaptResumeForThemes(resume) {
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

// NOTE on macchiato class names (they're inverted from visual position):
//   .left-column  = <aside> with About/Skills/Education/Languages — visually on the RIGHT
//   .right-column = main content (Work/Volunteer/Publications)    — visually on the LEFT
export const PRINT_OVERRIDE_CSS = `
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

async function applyDomTransforms(page, adapted) {
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
  }, adapted);
}

export async function renderResumePage(browser, theme, resume) {
  const adapted = adaptResumeForThemes(resume);
  const html = await theme.render(adapted);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: PRINT_OVERRIDE_CSS });
  await applyDomTransforms(page, adapted);
  return page;
}
