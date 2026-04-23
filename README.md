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

### 자동화된 플로우

`main` 에서 `resume.ko.json` 만 수정 → push 하면:

1. **Translate** workflow 가 `resume.en.json` 을 재생성해서 **PR 로 올림** (브랜치 `auto/translate`)
2. PR diff 에서 영문 번역을 검토/수정 후 **Merge**
3. Merge 가 **Deploy** workflow 를 트리거 → PDF + HTML 빌드 → [me.hovans.com](https://me.hovans.com) 배포 + `latest` Release 갱신

즉 GitHub 웹 UI 에서 `resume.ko.json` 편집 → commit → PR 머지만으로 이력서가 갱신된다. 로컬 번역 불필요.

> Deploy 는 `resume.*.json` 변경 시마다 트리거되므로, ko 만 먼저 push 되면 **이전 번역으로 배포 후**, PR 머지 시 **새 번역으로 재배포** 된다 (총 2회). 짧은 stale window 만 감수하면 됨.

### 최초 1회 설정

1. Repo Settings → **Pages** → Source = **GitHub Actions**
2. Custom domain = `me.hovans.com` (DNS 전파 후 Enforce HTTPS)
3. 도메인 관리자(가비아/Cloudflare 등)에 DNS CNAME 추가:
   - Type `CNAME`, Name `me`, Value `urunimi.github.io`
   - Cloudflare 는 Proxy OFF (DNS only)
4. Settings → **Secrets and variables → Actions** → `GROQ_API_KEY` 추가 (번역 workflow 용)
5. Settings → **Actions → General → Workflow permissions** → "Allow GitHub Actions to create and approve pull requests" 체크

## 스택

- [JSON Resume](https://jsonresume.org) 스키마
- [`jsonresume-theme-macchiato`](https://www.npmjs.com/package/jsonresume-theme-macchiato) 테마
- [Groq](https://console.groq.com) + `llama-3.3-70b-versatile` (번역)
- [Puppeteer](https://pptr.dev) (HTML → PDF)
