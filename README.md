# resume

JSON Resume 기반 이력서 — 한국어 원본을 LLM으로 영문 자동 번역하고 PDF로 빌드. 태그 push 하면 GitHub Release에 PDF 첨부.

## 사전 준비

- Node.js 20+
- [Groq API key](https://console.groq.com/keys) (무료)

```bash
cp .env.example .env
# .env 를 열어 GROQ_API_KEY=... 채우기
make install
```

## 주요 명령어

```bash
make translate         # 한국어 → 영어 번역 (덮어쓰기, 변경 확인은 git diff)
make pdf               # ko/en 둘 다 PDF 빌드 → output/
make build             # 번역 + PDF 한 번에
make clean             # output/, resume.en.json 삭제
make help              # 전체 타겟 목록
```

## 편집 규칙

- **`resume.ko.json` 만 직접 편집한다.** JSON Resume 스키마(https://jsonresume.org/schema) 기반
- `resume.en.json` 은 `make translate` 로 생성 (필요 시 미세 수정 가능)
- 테마는 `package.json` 의 `config.theme` 에서 변경

## 릴리스

`v*` 패턴의 태그를 push 하면 GitHub Actions 가 PDF를 빌드해서 Release 에 첨부한다.

```bash
make release VERSION=v0.1.0
# 또는 직접:
git tag v0.1.0 && git push origin v0.1.0
```

## 스택

- [JSON Resume](https://jsonresume.org) 스키마
- [`jsonresume-theme-even`](https://github.com/rbardini/jsonresume-theme-even) 테마
- [Groq](https://console.groq.com) + `llama-3.3-70b-versatile` (번역)
- [Puppeteer](https://pptr.dev) (HTML → PDF)
