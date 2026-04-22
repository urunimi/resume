# resume

JSON Resume 기반 이력서 — 한국어 원본을 LLM으로 영문 자동 번역하고 PDF / HTML 로 빌드. `main` 에 push 하면 GitHub Actions 가 [me.hovans.com](https://me.hovans.com) 에 배포.

## 주요 명령어

```bash
make translate         # 한국어 → 영어 번역 (덮어쓰기, 변경 확인은 git diff)
make pdf               # PDFs → output/resume-{ko,en}.pdf
make html              # HTML → output/index.html, output/en/index.html, CNAME
make site              # PDFs + HTML 한 번에
make build             # 번역 + site
make clean             # output/, resume.en.json 삭제
make help              # 전체 타겟 목록
```

## 편집 규칙

- **`resume.ko.json` 만 직접 편집한다.** JSON Resume 스키마(https://jsonresume.org/schema) 기반
- `resume.en.json` 은 `make translate` 로 생성 (필요 시 미세 수정 가능)
- 테마는 `package.json` 의 `config.theme` 에서 변경 (또는 `make theme THEME=elegant`)
- Pages 도메인은 `config.site` 에서 변경

## 호스팅 / 릴리스

`main` 에 `resume.*.json` 또는 `scripts/**` 변경이 push 되면 GitHub Actions 가:

1. PDF + HTML 빌드
2. [me.hovans.com](https://me.hovans.com) (GitHub Pages) 배포
3. `latest` Release 의 PDF 첨부파일 갱신

### 최초 1회 설정

1. Repo Settings → **Pages** → Source = **GitHub Actions**
2. Custom domain = `me.hovans.com` (DNS 전파 후 Enforce HTTPS)
3. 도메인 관리자(가비아/Cloudflare 등)에 DNS CNAME 추가:
   - Type `CNAME`, Name `me`, Value `urunimi.github.io`
   - Cloudflare 는 Proxy OFF (DNS only)

## 스택

- [JSON Resume](https://jsonresume.org) 스키마
- [`jsonresume-theme-macchiato`](https://www.npmjs.com/package/jsonresume-theme-macchiato) 테마
- [Groq](https://console.groq.com) + `llama-3.3-70b-versatile` (번역)
- [Puppeteer](https://pptr.dev) (HTML → PDF)
