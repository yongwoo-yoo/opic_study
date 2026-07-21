# OPIC 스터디 프로젝트

## 개요
유튜브 OPIC 강의 스크립트 → 레슨 JSON 변환 → GitHub Pages 배포 자동화

## 일상 워크플로
1. 유튜브 OPIC 영상 시청 후 스크립트 복사
2. 이 프로젝트 디렉토리에서 `claude` 실행
3. 스크립트를 채팅창에 붙여넣고 `/add-lesson` 입력
4. Claude가 자동으로 정리·저장·배포
5. 휴대폰 브라우저에서 사이트 열어 노트 읽기 + 플래시카드 복습

## 사이트 URL
배포 후: https://<github-username>.github.io/opic_study/

## 파일 구조
- `docs/` — GitHub Pages 정적 사이트
- `docs/data/lessons/` — 날짜별 레슨 JSON
- `docs/data/index.json` — build-index.mjs가 자동 생성
- `scripts/build-index.mjs` — index.json 재생성 스크립트
- `.claude/skills/add-lesson/SKILL.md` — /add-lesson 스킬 정의

## 레슨 JSON 스키마
```json
{
  "date": "YYYY-MM-DD",
  "title": "레슨 제목",
  "summary": ["요약1"],
  "keyExpressions": [{"en": "표현", "ko": "뜻", "note": "뉘앙스"}],
  "cards": [{"id": "YYYY-MM-DD-1", "front": "한국어", "back": "영어", "example": "예문"}]
}
```

card `id`는 생성 후 절대 변경 금지 (localStorage SRS 진도가 id에 연결됨).
