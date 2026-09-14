"""Normalize downloaded VTT captions and report playlist coverage (stdlib only)."""

import html
import json
from pathlib import Path
import re
import sys


def read_cues(path):
    previous = []
    for block in re.split(r'\n\s*\n', path.read_text(encoding='utf-8-sig')):
        lines = block.splitlines()
        timing = next((i for i, line in enumerate(lines) if '-->' in line), None)
        if timing is None:
            continue
        timestamp = lines[timing].split()[0]
        words = html.unescape(re.sub(r'<[^>]*>', '', ' '.join(lines[timing + 1:]))).split()
        # Automatic captions repeat the previous cue as a rolling prefix.
        overlap = 0
        for size in range(min(len(previous), len(words)), 0, -1):
            if previous[-size:] == words[:size]:
                overlap = size
                break
        if words[overlap:]:
            yield timestamp, ' '.join(words[overlap:])
        previous = words


def main(directory):
    playlist = json.loads((directory / 'playlist.json').read_text())
    rows = []
    available = 0
    for index, entry in enumerate(playlist['entries'], 1):
        video_id = entry['id']
        prefix = f'{index:03d}-{video_id}'
        files = sorted(directory.glob(f'{prefix}.*.vtt'))
        valid = []
        for path in files:
            cues = list(read_cues(path))
            if cues:
                path.with_suffix('.txt').write_text(
                    '\n'.join(f'[{time}] {line}' for time, line in cues) + '\n',
                    encoding='utf-8')
                valid.append(path.name[len(prefix) + 1:-4])
        available += bool(valid)
        title = entry.get('title', video_id).replace('|', '\\|')
        rows.append(f'| {index:02d} | [{title}](https://www.youtube.com/watch?v={video_id}) | '
                    f'{", ".join(valid) or "미확보"} |')
    report = [
        '# IH 재생목록 자막 확보 현황', '',
        f'영상 {len(rows)}편 중 유효한 자막 확보: {available}편.', '',
        '원본은 `.vtt`, 시간표시와 롤링 중복을 정리한 읽기용 사본은 `.txt`입니다.',
        '자동 생성/자동 번역 자막은 오인식이 있을 수 있습니다. 특정 번역 언어의 실패와 영상 전체의 자막 미확보를 구분합니다.',
        '이 파일은 로컬 자막 존재 여부를 보고하며, 자막 내용의 정확성을 보증하지 않습니다.', '',
        '| 순번 | 영상 | 확보 언어 |', '|---|---|---|', *rows, '',
    ]
    (directory / 'MANIFEST.md').write_text('\n'.join(report), encoding='utf-8')
    print(f'{available}/{len(rows)} videos have readable captions')


if __name__ == '__main__':
    main(Path(sys.argv[1] if len(sys.argv) > 1 else 'transcripts/ih-playlist'))
