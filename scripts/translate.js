import fs from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import Groq from 'groq-sdk';

const SOURCE = 'resume.ko.json';
const TARGET = 'resume.en.json';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a professional resume translator specializing in Korean-to-English translation for senior software engineering roles.

Translate the provided Korean JSON Resume content to English according to these rules:

1. PRESERVE AS-IS (do NOT translate):
   - All JSON keys
   - basics.name — transliterate Hangul to romanized English (e.g. "유병우" → "Byungwoo Yoo")
   - basics.email, basics.phone, basics.url
   - work[].name — romanize Korean company names (e.g. "데이터라이즈" → "Datarize", "매스프레소" → "Mathpresso", "카사코리아" → "Kasa Korea", "버즈빌" → "Buzzvil", "네이버" → "NAVER", "인포뱅크" → "InfoBank", "도전하는사람들" → "DOSA")
   - education[].institution (e.g. "서울대학교" → "Seoul National University", "대원외국어고등학교" → "Daewon Foreign Language High School")
   - Technology/library names (Netty, Spring Boot, DDD, Clean Architecture, ML, etc.)
   - All dates, URLs, emails, usernames, profile network names
   - Numeric values and percentages

2. TRANSLATE (human-readable descriptive text):
   - basics.label
   - basics.summary
   - basics.location.city, basics.location.address
   - work[].position, work[].summary, work[].highlights[]
   - education[].area, education[].studyType
   - skills[].name (if it is a descriptive phrase like "리더십", not a brand/tech name)
   - skills[].level
   - projects[].description, projects[].highlights[]
   - awards[].title, awards[].summary
   - All other descriptive text fields

3. STYLE:
   - Concise, impactful resume English
   - Start highlights with strong action verbs (Led, Built, Designed, Implemented, Architected, Shipped, Reduced, Scaled, Drove, Owned, Mentored)
   - Preserve numbers, percentages, and dates exactly
   - Professional tone suitable for senior/executive engineering roles (CTO, VP of Engineering)
   - Products referenced by Korean name may include a short English gloss when helpful (e.g. "콴다 (QANDA)")

4. OUTPUT:
   - Return ONLY the translated JSON object
   - No markdown code fences, no explanation, no preamble, no trailing commentary
   - Exact same JSON structure and key names as input
   - Valid, parseable JSON`;

function parseArgs(argv) {
  const args = { force: false, diff: false, help: false };
  for (const a of argv.slice(2)) {
    if (a === '--force') args.force = true;
    else if (a === '--diff') args.diff = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Usage: npm run translate [-- <flags>]

Flags:
  --force    Overwrite existing ${TARGET}
  --diff     Print translated JSON to stdout without writing the file
  --help     Show this message`);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function stripCodeFence(text) {
  return text
    .replace(/^\s*```(?:json)?\s*\n/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

async function translate(groq, koJson) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Translate this Korean JSON Resume to English. Return JSON only.\n\n${JSON.stringify(koJson, null, 2)}`,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content ?? '';
  const cleaned = stripCodeFence(raw);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('\nGroq response was not valid JSON. Raw output:\n');
    console.error(raw);
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not set. Copy .env.example → .env and paste your key from https://console.groq.com/keys');
    process.exit(1);
  }

  const srcPath = path.resolve(SOURCE);
  const dstPath = path.resolve(TARGET);

  if (!(await fileExists(srcPath))) {
    console.error(`Source file not found: ${SOURCE}`);
    process.exit(1);
  }

  const exists = await fileExists(dstPath);
  if (exists && !args.force && !args.diff) {
    console.log(
      `${TARGET} already exists. Use --force to overwrite or --diff for a dry-run.`
    );
    return;
  }

  const koJson = JSON.parse(await fs.readFile(srcPath, 'utf-8'));
  const groq = new Groq({ apiKey });

  console.log(`Translating ${SOURCE} → English via Groq (${MODEL})...`);
  const enJson = await translate(groq, koJson);

  if (args.diff) {
    console.log('\n=== Translated JSON (dry-run) ===\n');
    console.log(JSON.stringify(enJson, null, 2));
    return;
  }

  await fs.writeFile(dstPath, JSON.stringify(enJson, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${TARGET}`);
}

main().catch((err) => {
  console.error('Translation failed:', err.message || err);
  process.exit(1);
});
