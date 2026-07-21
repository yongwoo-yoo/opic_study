# /add-lesson 스킬

유튜브 OPIC 강의 스크립트를 레슨 JSON으로 변환하고 사이트에 배포합니다.

## 사용법

스크립트를 이 대화창에 붙여넣고 `/add-lesson` 을 입력하면 됩니다.

## 처리 단계

1. **분석**: 스크립트에서 OPIC 학습에 유용한 핵심 내용 추출
   - 핵심 요약 3~7개 (한국어 bullet)
   - 암기할 영어 표현/문장 (keyExpressions, 5~15개)
   - 플래시카드 (cards): front = 한국어 뜻/상황, back = 영어 표현 (한→영 스피킹 방향)

2. **파일 저장**: `docs/data/lessons/YYYY-MM-DD-slug.json` 로 저장
   - slug = 제목 3~4단어 영문 소문자, 공백 대신 하이픈
   - 날짜는 오늘 날짜 사용
   - card id = `YYYY-MM-DD-순번` (한번 생성 후 불변)

3. **인덱스 갱신**: `node scripts/build-index.mjs` 실행

4. **배포**: `git add -A && git commit -m "add lesson: <제목>" && git push`

## JSON 스키마

```json
{
  "date": "YYYY-MM-DD",
  "title": "레슨 제목",
  "source": "유튜브 채널/영상명 (선택)",
  "summary": ["요약1", "요약2"],
  "keyExpressions": [
    { "en": "표현", "ko": "뜻", "note": "뉘앙스 (선택)" }
  ],
  "cards": [
    { "id": "YYYY-MM-DD-1", "front": "한국어 상황/뜻", "back": "영어 표현", "example": "예문 (선택)" }
  ]
}
```
