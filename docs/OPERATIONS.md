# 운영 및 API 가이드

## 운영 주소

- 공개 사이트: https://global-fx-daily.kpc55.chatgpt.site
- 로그인 없이 누구나 링크로 접속할 수 있다.

## 환경변수

운영 서버에는 다음 환경변수가 비밀값으로 등록되어야 한다.

```env
OPEN_EXCHANGE_RATES_APP_ID=YOUR_APP_ID
```

실제 값은 소스코드, README, 커밋 기록에 포함하지 않는다.

## 자동 적재

- 실행 시각: 매일 오전 9시 5분
- 시간대: Asia/Seoul
- 호출: `POST /api/rates/sync?source=scheduled`
- 일시적 실패 시 1분 간격으로 최대 3회 재시도
- 이미 당일 데이터가 존재하면 기존 값을 유지하고 종료

자동 실행 일정은 Codex 작업의 `Global FX Daily 환율 적재` 자동화에서 관리한다.

## 수동 적재

사이트 상단의 `당일 환율 동기화` 버튼이 다음 API를 호출한다.

```http
POST /api/rates/sync
```

동작 조건:

- 한국시간 오전 9시 5분 이전에는 저장하지 않는다.
- 자동 적재가 완료된 날에는 기존 값을 반환한다.
- 당일 데이터가 없을 때만 API 최신값을 저장한다.

## 조회 API

```http
GET /api/rates?days=30&currencies=KRW,EUR,JPY,CNY,GBP,AUD,CAD,USD
```

주요 응답:

- `latestDate`: 최신 저장 기준일
- `previousDate`: 직전 저장 기준일
- `latest`: 최신일 전체 환율
- `previous`: 전일 전체 환율
- `history`: 선택 통화의 기간별 이력
- `stats`: 누적 기준일 및 통화 수

## 다운로드 API

```http
GET /api/rates/export?date=2026-07-28
```

Excel에서 바로 열 수 있는 UTF-8 CSV를 반환한다.

포함 항목:

- 기준일과 전일 기준일
- 통화코드와 기준통화
- USD 기준 환율
- 오늘·전일 KRW 환율
- 변동액과 변동률
- 수집시각과 데이터 출처

## 데이터베이스

### daily_rates

일별 통화 환율을 저장한다.

### sync_runs

자동·수동 동기화 실행 기록을 저장한다.

## 장애 확인 순서

1. 운영 환경변수 등록 여부 확인
2. `/api/rates/sync` 응답 상태 확인
3. Open Exchange Rates 사용량 및 요금제 확인
4. D1 마이그레이션 적용 여부 확인
5. 최근 Worker 오류 로그 확인

## 배포 전 검증

```bash
npm run lint
npm run build
```
