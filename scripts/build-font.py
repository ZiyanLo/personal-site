#!/usr/bin/env python3
"""Rebuild or verify the CJK webfont against all HTML and translation strings."""
import argparse
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/fonts/ming-light-v7.woff2'
SOURCE_URL = ('https://raw.githubusercontent.com/adobe-fonts/source-han-serif/'
              '7889f11bf31170b5d092a083b357c8c8130f89e0/'
              'OTF/SimplifiedChinese/SourceHanSerifSC-ExtraLight.otf')

def cjk(code):
    return any(a <= code <= b for a, b in (
        (0x2E80, 0x303F), (0x3100, 0x31EF), (0x3400, 0x9FFF),
        (0xF900, 0xFAFF), (0xFF00, 0xFFEF), (0x20000, 0x2FA1F)))

def required():
    # Includes hidden sections, translated text and accessibility labels.
    text = (ROOT / 'index.html').read_text(encoding='utf-8')
    return {ord(char) for char in text if cjk(ord(char))}

def verify(font, codes):
    missing = sorted(codes - set(font.getBestCmap()))
    if missing:
        raise SystemExit('Missing glyphs: ' + ''.join(map(chr, missing)))
    print(f'Font coverage OK: {len(codes)} CJK characters')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Pinned Adobe source OTF; see SITE-SPEC.md')
    parser.add_argument('--check', action='store_true', help='Verify the committed font without rebuilding')
    args = parser.parse_args()
    codes = required()
    if args.check:
        verify(TTFont(OUTPUT), codes)
        return
    if not args.source:
        parser.error('--source is required for rebuilding')
    font = TTFont(args.source, recalcTimestamp=False)
    verify(font, codes)
    options = subset.Options()
    options.flavor = 'woff2'
    options.recalc_timestamp = False
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=codes)
    sub.subset(font)
    for record in font['name'].names:
        if record.nameID in (1, 3, 4, 6):
            value = 'ZYANMingExtraLight' if record.nameID == 6 else 'ZYAN Ming ExtraLight'
            record.string = value.encode(record.getEncoding())
    font.flavor = 'woff2'
    font.save(OUTPUT)
    verify(TTFont(OUTPUT), codes)
    print(f'Wrote {OUTPUT.name}: {OUTPUT.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
