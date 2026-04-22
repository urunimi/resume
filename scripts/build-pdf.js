import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { getConfig, loadTheme, renderResumePage } from './render.js';

const OUTPUT_DIR = 'output';

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

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
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
      const page = await renderResumePage(browser, theme, resume);
      try {
        const outPath = path.resolve(OUTPUT_DIR, `resume-${lang}.pdf`);
        console.log(`Rendering ${lang} → ${path.relative(process.cwd(), outPath)}`);
        await page.pdf({ ...PDF_OPTIONS, path: outPath });
      } finally {
        await page.close();
      }
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
