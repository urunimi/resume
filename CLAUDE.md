# Resume Project

JSON Resume 기반 이력서 프로젝트. 한국어 원본을 관리하고 Groq API (무료, Llama 3.3 70B)로 영문 번역.

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
