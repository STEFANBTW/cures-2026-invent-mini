"""
Simple CSS auditor: scans `style16.css` for potentially expensive selectors
and reports selectors that are long (many descendant levels) or include
universals or attribute selectors which may be slower.

Usage:
    python scripts/css_audit.py --file style16.css

This is advisory — run in your environment and inspect the output to decide
which selectors to simplify or refactor into classes.
"""
import argparse
import re

SELECTOR_SPLIT = re.compile(r',\s*(?![^()]*\))')


def score_selector(sel):
    # Heuristic score: number of parts and whether contains universal or child selectors
    parts = re.split(r'\s+', sel.strip())
    score = len(parts)
    if '*' in sel:
        score += 2
    if '>' in sel:
        score += 1
    if '[' in sel:
        score += 1
    return score, len(parts)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--file', default='style16.css')
    args = p.parse_args()

    try:
        with open(args.file, 'r', encoding='utf-8') as fh:
            css = fh.read()
    except FileNotFoundError:
        print('CSS file not found:', args.file)
        return

    # crude regex to find selectors before open brace
    pattern = re.compile(r'([^{]+)\{')
    candidates = pattern.findall(css)

    flagged = []
    for sel_group in candidates:
        for sel in SELECTOR_SPLIT.split(sel_group):
            s = sel.strip()
            if not s: continue
            score, parts = score_selector(s)
            if score >= 4 or parts >= 4:
                flagged.append((s, score, parts))

    print('\nPotentially expensive selectors (heuristic):\n')
    for s, score, parts in sorted(flagged, key=lambda x: (-x[1], -x[2]))[:50]:
        print(f'- {s}  (score={score}, parts={parts})')

    if not flagged:
        print('No obvious expensive selectors found by this heuristic.')

if __name__ == '__main__':
    main()
