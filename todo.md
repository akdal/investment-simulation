# Project Tasks (TODO)

## Project Setup
- [x] Initialize Vite + React project
- [x] Configure Tailwind CSS (v4)
- [x] Set up base UI components (Button, Input, Card, Label)
- [x] Set up icons (Lucide React)

## Core Logic
- [x] Define TypeScript interfaces (Round, Investor, Investment)
- [x] Implement Cap Table calculation engine (`calculateCapTable`, `calculateRoundMetrics`)
- [x] Handle data persistence (LocalStorage) in App.tsx

## UI Implementation
- [x] Create Main Layout (App.tsx)
- [x] Create RoundColumn component
- [x] Implement "Add Round" feature
- [x] Implement "Add Investor" (New & Existing)
- [x] Implement inline input for adding investors (UX improvement)
- [x] Implement Cap Table Summary Sidebar
- [x] Add "Edit Round Name" (inline Input in CardHeader)
- [x] Add "Delete Investment" from round (removeInvestment 함수)

## Current Sprint - 우선순위 순

### P1: Cap Table 지분율 표시 ✅
- [x] Cap Table Sidebar에 지분율(%) 계산 및 표시
- [x] 총 발행주식수 표시

### P2: UI Polish - 숫자 포맷팅 ✅
- [x] Input 필드 숫자 포맷팅 (쉼표 구분)
- [x] Amount 필드 빈값일 때 "0" 대신 placeholder 표시
- [x] Share Price, Post-Money 등 통화 단위 일관성 (₩ 표시)

### P3: Secondary 거래 UI 구현 ✅
- [x] Investment에 "Secondary" 토글 버튼 추가
- [x] Secondary일 때 Seller 선택 드롭다운 표시
- [x] Secondary 거래 시 Shares 직접 입력 가능
- [x] Secondary 거래 계산 로직 검증 (calc.ts에서 이미 처리됨)

### P4: 기존 투자자 선택 UX 개선 ✅
- [x] prompt() 대신 드롭다운으로 변경
- [x] 이미 추가된 투자자 필터링 (중복 방지)

## 완료된 추가 작업

### localStorage 개선 ✅
- [x] 초기 로드 완료 후에만 저장하도록 수정 (데이터 덮어쓰기 방지)
- [x] isInitialized ref 사용하여 로드/저장 분리

### UI 한글화 ✅
- [x] 모든 UI 텍스트 한글로 변경
- [x] 라운드 이름 기본값 한글화 (창업, 2차 투자, ...)
- [x] 투자 용어 한글화 (신주 발행, 구주 매매, 등)

### 다중 시뮬레이션 지원 ✅
- [x] Simulation 타입 추가 (id, name, rounds, investors, timestamps)
- [x] 상단 시뮬레이션 선택 바 UI 구현
- [x] 시뮬레이션 생성/삭제/선택 기능
- [x] 시뮬레이션 이름 더블클릭으로 변경
- [x] localStorage 구조 변경 (simulations, current-simulation-id)
- [x] 자동 저장 및 마지막 수정 시간 표시

### 입력 로직 변경 ✅
- [x] 라운드별 "주당 발행가격" 직접 입력으로 변경
- [x] 투자자별 "주식수" 입력 → "투자금" 자동 계산
- [x] 프리머니 = 주당 가격 × 기존 주식수 (자동 계산)
- [x] 구주 매매는 주식수 & 거래금액 둘 다 입력 가능

### 저장 기능 개선 ✅
- [x] 저장 버튼 추가 (상단 바)
- [x] 자동 저장 (디바운스 300ms)
- [x] 저장 상태 표시 ("저장 중...", "저장됨")
- [x] 마지막 수정 시간 표시

### UI 대폭 개편 ✅
- [x] 입력 패널과 데이터 테이블 분리
- [x] 왼쪽: RoundEditor (라운드 선택 시 표시)
- [x] 오른쪽: RoundTable (컴팩트한 지분 테이블)
- [x] 상단에 라운드 요약 카드 (주당가격, 투자금, 포스트머니)
- [x] 투자자를 행(row)으로 배치, 라운드별 지분 변화 추적
- [x] 지분율 + 주식수 + 보유가치 표시
- [x] 신규 투자자 "NEW" 배지 표시

## Backlog (Future)
- [ ] Reset 다이얼로그 커스텀 스타일링
- [ ] Export to Excel/PDF
- [ ] Complex convertible notes (SAFE/KISS)
- [ ] Employee Option Pool management
