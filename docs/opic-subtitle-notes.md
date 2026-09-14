# IH 자막 — 활용 표현과 전략 출처

확보일: 2026-09-14. [재생목록](https://www.youtube.com/playlist?list=PL9Ieg7fw1BJJjZLZDllOPO8ekhiruPmXe)의 당시 제목은 **IH 영상 몰아보기**, 영상 수는 **31편**입니다.

## 1. 확보 결과와 파일 위치

- **31/31편에 유효한 VTT 자막 파일을 확보했습니다.** 모든 영상에 `ko` 자막이 있습니다. 한국어 원문 자동 인식·영어에서 한국어로의 번역·제공 자막은 영상마다 다릅니다.
- 1~3번 영상의 영어 자막과 4번의 `ko-en` 번역 트랙은 HTTP 429로 받지 못했습니다. 다른 트랙을 확보했으므로 영상 자체가 빠진 것은 아닙니다.
- 원본: `transcripts/ih-playlist/NNN-영상ID.언어.vtt`
- 읽기용: 같은 이름의 `.txt`. 시간 표시를 유지하고 연속 자막에 겹쳐 나오는 단어를 줄였습니다. 원본 VTT는 수정하지 않았습니다.
- 영상·트랙별 목록: `transcripts/ih-playlist/MANIFEST.md`. 당시 영상 목록은 `playlist.json`, 영상 정보는 `*.info.json`, 다운로드 로그는 `download.log`입니다.
- 읽기용 사본 재생성: `python3 scripts/prepare-transcripts.py`

`transcripts/`는 기존 `.gitignore`에 따라 Git에서 제외됩니다. 전체 자막은 로컬 참고 자료이고, 이 문서와 [질문 분류표](opic-question-map.md), [개인 답변집](opic-personal-workbook.md)은 저장소에서 관리할 수 있는 정리본입니다.

자막 확보와 정확한 받아쓰기는 다릅니다. 일부 자동 자막은 한국어와 영어가 섞이는 구간에서 오인식이 심합니다. 아래 표현은 영어 형태와 주변 설명을 확인할 수 있는 구간에서 골랐습니다. 시간을 누르면 원영상으로 이동할 수 있습니다. **31편 전체를 정밀 교정한 전사본은 아닙니다.**

## 2. 실제 답변에 넣은 표현

영어 답변 전체는 사용자의 메모를 재작성한 것이며 강사의 답변을 복사한 것이 아닙니다. E번호는 **표현·패턴의 출처**입니다. 해당 표현이 포함된 개인 답변의 경험까지 영상에서 나온다는 뜻은 아닙니다.

| ID | 자막 표현 | 뜻과 쓰임 | 확인한 구간 | 개인 답변 적용 |
|---|---|---|---|---|
| E01 | wind down and relax | 긴장을 풀고 쉬다. 휴식의 이유·효과 | [04번 03:14](https://www.youtube.com/watch?v=1HN93-WqAds&t=194s) | D02·H01·P03 |
| E02 | whenever | ~할 때마다. 실제 반복되는 행동에 사용 | [04번 06:42](https://www.youtube.com/watch?v=1HN93-WqAds&t=402s) | D01 |
| E03 | Overall, … | 전체적으로 정리하며 마무리 | [04번 08:33](https://www.youtube.com/watch?v=1HN93-WqAds&t=513s) | D01·D08·D09·P02·P05 |
| E04 | I'm such a … | 내 성향을 강조. 자막의 foodie를 coffee person으로 응용 | [20번 03:50](https://www.youtube.com/watch?v=RdN-vwCsxIA&t=230s) | D01·D08 |
| E05 | The main thing is … | 핵심을 강조. 과거 경험에서는 was로 변형 가능 | [31번 03:25](https://www.youtube.com/watch?v=dKVqQtrhvds&t=205s) | 친구의 꾸준함·러닝·은행·예약 등 |
| E06 | helps me unwind | 긴장을 푸는 데 도움이 된다 | [31번 03:29](https://www.youtube.com/watch?v=dKVqQtrhvds&t=209s) | C03에서 helps me unwind로 연결 |
| E07 | recharge me | 기운을 되찾게 해 준다 | [31번 02:44](https://www.youtube.com/watch?v=dKVqQtrhvds&t=164s) | 선택 표현: 주말 차·음악 답변에 “Those quiet weekends recharge me.” |
| E08 | clear my head | 복잡한 머릿속을 정리하다 | [31번 08:13](https://www.youtube.com/watch?v=dKVqQtrhvds&t=493s) | D02·H01·H03 |
| E09 | If I'm honest, … | 솔직한 내 취향·어려움을 밝힐 때 | [31번 07:45](https://www.youtube.com/watch?v=dKVqQtrhvds&t=465s) | D04·D10·H03 |
| E10 | Put simply, … | 앞의 내용을 간단히 표현하거나 핵심 제시 | [31번 04:11](https://www.youtube.com/watch?v=dKVqQtrhvds&t=251s) | D03·D07·H08·C02 |
| E11 | I thought to myself, … | 당시 생각을 직접화법으로 표현 | [07번 05:35~05:51](https://www.youtube.com/watch?v=fyrLr4OLlu8&t=335s) | P02의 선택적 재구성 문장 |
| E12 | I couldn't believe … | 믿기 어려울 만큼 놀란 이유 설명 | [07번 05:56](https://www.youtube.com/watch?v=fyrLr4OLlu8&t=356s) | P01·P02 |
| E13 | These days, … | 요즘의 상태·행동으로 시작. in these days로 쓰지 않기 | [15번 05:46~05:53](https://www.youtube.com/watch?v=rED8gQsF46I&t=346s) | H04·H07·C01·C02 |
| E14 | What am I trying to say? … Anyway, … | 말이 꼬였을 때 잠깐 멈추고 다시 시작 | [11번 07:41~08:11](https://www.youtube.com/watch?v=rYIXHW37Cts&t=461s) | 복구용 선택 표현. 모든 답변에 외워 넣지 않기 |

E11의 직접화법은 기억에 맞는 생각을 짧게 표현하는 장치입니다. 원래 없던 직원의 친절한 말이나 상대방의 감정을 실제로 들은 것처럼 추가하지 않습니다.

`I was relieved`, `Something else came up`, `in real time`, `sticks to his routine` 등은 기존 사용자 이야기와 자연스러운 영어 재작성에서 사용한 표현입니다. 이번 자막에서 골랐다는 E표시는 붙이지 않았습니다. `The main thing is`처럼 같은 패턴이 여러 답변에 나오는 것은 연습 부담을 줄이기 위한 선택이며, 실제 말하기에서는 필요할 때만 사용합니다.

## 3. 전략을 답변에 적용한 근거

| 전략 | 확인 구간 | 적용 방식 |
|---|---|---|
| 묘사는 한 가지 핵심에 집중하고 그 느낌을 설명 | [04번 02:27~03:07](https://www.youtube.com/watch?v=1HN93-WqAds&t=147s) | D01은 부엌의 커피·차, D04는 친구의 꾸준함에 집중 |
| 과거 경험 MP에서 왜 그런 감정인지 초반에 설명 | [19번 02:45~03:53](https://www.youtube.com/watch?v=3eSHVbGMfSQ&t=165s) | P01에서 해외 구매라 수리가 어려울 것 같았다는 이유를 MP에 배치 |
| Habit은 행동 중심의 간단한 MP도 가능 | [20번 01:52~02:58](https://www.youtube.com/watch?v=RdN-vwCsxIA&t=112s) | 강의와 별개로 이번 자료는 사용자 요청에 따라 What → Why → Feeling으로 통일 |
| Habit의 Quick Comparison은 짧은 과거·현재 비교 | [20번 06:02~07:54](https://www.youtube.com/watch?v=RdN-vwCsxIA&t=362s) | H01에 필요할 때 C03의 과거·현재를 1~2문장만 덧붙이기 |
| Habit 중 긴 과거 사건으로 빠지지 않기 | [20번 09:30~09:50](https://www.youtube.com/watch?v=RdN-vwCsxIA&t=570s) | 음악 상점에서의 사건(P03)과 주말 습관(H01)을 분리 |
| 짧은 직접화법으로 사건을 구체화 | [07번 05:32~06:06](https://www.youtube.com/watch?v=fyrLr4OLlu8&t=332s) | P02의 당시 생각을 선택 문장으로 제공하고 재구성임을 표시 |
| 복잡한 질문에서도 설명의 초점 유지 | [15번 03:07~04:23](https://www.youtube.com/watch?v=rED8gQsF46I&t=187s) | 질문의 필수 조건은 확인하되 본문에서 여러 무관한 소재를 섞지 않기 |

강의에는 등급에 대한 강사의 조언이 포함되어 있습니다. 여기서는 그것을 공식 채점 규칙이나 특정 표현의 가산점으로 단정하지 않고, 문맥에 맞는 표현·명확한 전개·구체적인 감정을 연습하는 데 사용했습니다.

## 4. 기존 초안에서 바꾼 부분

| 기존 방식 | 이번 정리 |
|---|---|
| 모든 주제에 필러와 Overall을 일괄 추가 | 의미가 있는 곳에만 표현을 넣고 마무리를 다양화 |
| 집·계절에서 여러 정보를 먼저 나열 | 첫 세 문장에 대상·이유·감정을 제시 |
| 명상 음악의 습관과 첫 계기가 한 답변에 혼합 | D02 특징 / H01 습관 / P03 계기 / C03 변화로 분리 |
| 버스·은행 답변이 과거부터 시작 | 현재 MP → 과거 → 현재의 차이로 재구성 |
| 공원→캠핑, 콘서트→상점 음악, 가구→이어폰으로 무조건 치환 | 질문의 장소·대상·사건 조건이 맞을 때만 사용 |
| 카페의 국내외 로스터리 원두를 한국산 원두처럼 번역 | roasters in Korea and abroad로 명확화 |
| 여러 주제의 미준비를 바로 스킵 추천 | 실제 정보가 필요한 질문으로 표시하고 D/H/P/C 작성 틀 제공 |
| 제주·옷 취향 등 기존 영어 초안의 내용을 모두 사용자 확정 사실로 취급 | 원래 한글 메모와 구분하여 확인용으로 표시 |

## 5. 다시 자막을 받을 때

`yt-dlp`가 설치된 환경에서 저장소 루트 기준입니다. 아래 명령은 영상 파일을 받지 않고 공개 자막과 메타데이터를 저장합니다. 실행 시점에 재생목록 순서가 달라질 수 있으므로 새 수집은 별도 폴더를 권합니다.

```bash
yt-dlp --flat-playlist --dump-single-json \
  'https://www.youtube.com/playlist?list=PL9Ieg7fw1BJJjZLZDllOPO8ekhiruPmXe' \
  > transcripts/ih-playlist/playlist.json

yt-dlp --yes-playlist --skip-download \
  --write-subs --write-auto-subs --sub-langs 'ko.*,en.*' \
  --sub-format vtt --write-info-json --ignore-errors --no-overwrites \
  --sleep-subtitles 3 --sleep-requests 1 \
  -o 'transcripts/ih-playlist/%(playlist_index)03d-%(id)s.%(ext)s' \
  'https://www.youtube.com/playlist?list=PL9Ieg7fw1BJJjZLZDllOPO8ekhiruPmXe'

python3 scripts/prepare-transcripts.py
```

현재 확보된 자료를 보는 데 재다운로드는 필요 없습니다. 정상적으로 받은 트랙이 있는지 MANIFEST에서 먼저 확인합니다.
