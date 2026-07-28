# 07.28(화) 프로젝트 — Global FX Daily

전 세계 통화의 환율을 매일 수집·누적하고 KRW 기준으로 비교하는 공개 환율 대시보드입니다.

**Live:** [https://global-fx-daily.kpc55.chatgpt.site](https://global-fx-daily.kpc55.chatgpt.site)

![Global FX Daily](public/og.png)

## 주요 기능

- Open Exchange Rates 기반 전 세계 172개 통화 조회
- 매일 오전 9시 5분(한국시간) 자동 환율 적재
- 당일 자동 적재 누락 시 수동 동기화
- USD·KRW 기준 환율 전환
- 전일 대비 변동률 및 기간별 추세
- 환율 계산기
- 통화명·통화코드 검색
- 날짜별 Excel 호환 CSV 다운로드
- Cloudflare D1 기반 일별 데이터 영구 보관
- 로그인 없는 공개 웹사이트

## 기술 구성

- Next.js 16 / React 19
- vinext / Vite
- Cloudflare Workers
- Cloudflare D1
- Drizzle ORM
- Open Exchange Rates API
- OpenAI Sites 배포

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

로컬 환경변수 파일 `.env.local`을 만들고 다음 값을 설정합니다.

```env
OPEN_EXCHANGE_RATES_APP_ID=YOUR_APP_ID
```

실제 App ID는 GitHub에 커밋하지 않습니다. `.env*` 파일은 `.gitignore`에 등록되어 있습니다.

## 검증

```bash
npm run lint
npm run build
```

## 문서

- [제품 요구사항](docs/PRD.md)
- [운영 및 API 가이드](docs/OPERATIONS.md)
- [2026-07-28 작업 내역](docs/CHANGELOG-2026-07-28.md)

## 주요 경로

```text
app/page.tsx                  대시보드 화면
app/globals.css               반응형 디자인
app/api/rates/route.ts        환율 조회 API
app/api/rates/sync/route.ts   당일 환율 동기화 API
app/api/rates/export/route.ts Excel 호환 CSV 다운로드 API
lib/rates.ts                  외부 API 수집 및 저장 로직
db/schema.ts                  D1 데이터베이스 스키마
drizzle/                      데이터베이스 마이그레이션
```

## 데이터 기준

- 자동 적재 시각: 매일 오전 9시 5분, Asia/Seoul
- 기준통화: API 원본은 USD
- KRW 환율: USD 기준 교차환율로 계산
- 무료 API 갱신 주기: 1시간
- 이미 저장된 당일 값은 수동 동기화로 덮어쓰지 않음

## 주의사항

표시되는 환율은 참고용 중간환율이며 은행·카드사·송금사의 실제 적용환율 및 수수료와 다를 수 있습니다.
