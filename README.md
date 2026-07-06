# 도엽이 포커

친구들끼리 쓰는 온라인 텍사스 홀덤 앱. 방 1개, 가상 칩, AI 승률/추천 표시.

## 구조

- `poker app/server/` — Node.js + TypeScript + Socket.IO 백엔드 (방 1개, 게임 상태 총괄)
- `poker app/app/` — Expo(React Native) 앱

## 로컬 개발

```bash
cd "poker app/server" && npm install && npm run dev   # http://localhost:4000
cd "poker app/app" && npm install && npm run web      # http://localhost:8082 (또는 npm start 로 Expo Go 연동)
```

앱 실행 후 "서버 주소" 입력칸에 서버 주소를 넣고 입장합니다.

## Render 배포

1. 이 저장소를 GitHub에 push
2. [Render 대시보드](https://dashboard.render.com) → New + → Blueprint → 이 저장소 선택
3. 루트의 `render.yaml`이 자동으로 `poker app/server/`를 Node 웹 서비스(무료 플랜)로 배포
4. 배포 완료 후 발급되는 `https://xxxx.onrender.com` 주소를 앱의 "서버 주소"에 입력

무료 플랜은 15분 미사용 시 슬립 상태가 되며, 재접속 시 몇 초 정도 깨어나는 시간이 걸립니다.
