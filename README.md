# DAILO — DAY IN LIFE.EXE

> 내가 찍고, 내가 말하고, AI가 편집하는 Retro OS AI 브이로그 앱.

DAILO는 바쁜 직장인과 N잡러가 짧은 일상 영상을 세로형 브이로그로 정리하는 모바일 중심 PWA입니다. iPhone, Galaxy, PC에서 같은 URL로 실행됩니다.

## 지금 동작하는 MVP

- 복수 영상 업로드와 대표 프레임 썸네일 자동 생성
- 썸네일 선택 후 실제 영상 재생 미리보기
- 촬영 시간 정렬, 활동·무드·에너지·베스트 구간 제안
- 클립 순서, 구간, 속도, 원본 음량, 자막, 팝업, 전환 편집
- `USER VOICE ONLY` 마이크 녹음과 브라우저 음성 인식 자막
- IndexedDB 원본 보관과 프로젝트 자동 저장/복구
- 9:16 합성, 원본 오디오+내 음성 믹스, MP4/WebM 내보내기
- Archive/Profile, 설치형 PWA, GitHub Pages 자동 배포

## 실행

```bash
npm install
npm run dev
```

검증:

```bash
npm run lint
npm test
npm run build
```

## 기기별 참고

- iPhone: Safari에서 실행 후 공유 메뉴의 **홈 화면에 추가**를 사용합니다.
- Galaxy: Chrome 메뉴의 **앱 설치**를 사용합니다.
- PC: Chrome, Edge, Safari에서 실행하거나 주소창의 설치 버튼을 사용합니다.
- 마이크와 PWA는 HTTPS 또는 localhost에서 동작합니다.
- 실시간 음성 인식은 브라우저 지원 여부에 따라 제공됩니다. 미지원 브라우저에서도 녹음 저장과 자막 직접 편집은 가능합니다.

상세 설계는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고하세요.
