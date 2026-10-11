# Resume Project

JSON Resume 기반 이력서 프로젝트. 한국어 원본을 관리하고 Groq API (무료, Llama 3.3 70B)로 영문 번역.

## 작업 원칙

> Source: https://github.com/forrestchang/andrej-karpathy-skills (CLAUDE.md, copied)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 구조
- `resume.ko.json` — 한국어 원본 (JSON Resume 스키마)
- `resume.en.json` — 영어 번역본 (scripts/translate.js로 생성)
- `scripts/translate.js` — Groq API 번역 (`GROQ_API_KEY` 필요, https://console.groq.com/keys)
- `scripts/build-pdf.js` — PDF 생성 (puppeteer)

## 주요 명령어
- `npm run translate` — 한국어 → 영어 번역
- `npm run translate -- --force` — 기존 번역 덮어쓰기
- `npm run translate -- --diff` — dry-run (번역 결과만 stdout)
- `npm run build:pdf` — PDF 생성 (ko, en 모두)
- `npm run build:pdf -- --lang en` — 특정 언어만
- `npm run build` — 번역 + PDF 한번에

## 규칙
- `resume.ko.json`만 직접 편집할 것
- `resume.en.json`은 translate 후 수동 미세조정 가능
- 고유명사(회사명, 기술명)는 번역하지 않음
- 테마는 `package.json`의 `config.theme`에서 변경
- `v*` 태그 push 시 GitHub Actions가 자동으로 Release에 PDF 첨부
