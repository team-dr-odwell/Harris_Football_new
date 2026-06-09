# -*- coding: utf-8 -*-
import os
HERE = os.path.dirname(os.path.abspath(__file__))

def logo_box(x, y, w, h, label_dark=False):
    cx, cy = x + w/2, y + h/2
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="#fff6da" '
        f'fill-opacity="0.96" stroke="#c9a227" stroke-width="2" stroke-dasharray="5 3"/>'
        f'<text x="{cx}" y="{cy-2}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#9a7510">YOUR LOGO</text>'
        f'<text x="{cx}" y="{cy+8}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#9a7510">HERE</text>'
    )

def crest(cx, cy, s=8):
    # simplified club crest: gold shield + crown nub (representative, not exact)
    return (
        f'<path d="M{cx-s},{cy-s} L{cx+s},{cy-s} L{cx+s},{cy+s*0.3} '
        f'C{cx+s},{cy+s*1.1} {cx},{cy+s*1.6} {cx},{cy+s*1.6} '
        f'C{cx},{cy+s*1.6} {cx-s},{cy+s*1.1} {cx-s},{cy+s*0.3} Z" '
        f'fill="#d8a92a" stroke="#5e4708" stroke-width="0.7"/>'
        f'<rect x="{cx-s*0.7}" y="{cy-s*1.5}" width="{s*1.4}" height="{s*0.6}" rx="1" fill="#d8a92a"/>'
        f'<text x="{cx}" y="{cy+s*0.5}" text-anchor="middle" font-family="Arial" font-size="{s*0.7}" fill="#3a2e08" font-weight="bold">OWFC</text>'
    )

def chevron(cx, cy, c="#e6c24a", w=7):
    return f'<path d="M{cx-w},{cy} L{cx},{cy+w*0.8} L{cx+w},{cy} L{cx},{cy+w*0.3} Z" fill="{c}"/>'

SLEEVE_SHORT = ("M88 34 L70 40 L40 58 L52 84 L72 72 L62 172 C84 179 116 179 138 172 "
                "L128 72 L148 84 L160 58 L130 40 L112 34 C112 46 88 46 88 34 Z")

# ---------------- MATCH DAY SHIRT (white & grey, brushed centre, black/gold collar) ----------------
brush = "".join(
    f'<line x1="{100-w}" y1="{y}" x2="{100+w}" y2="{y}" stroke="#cfd3d8" stroke-width="2" stroke-linecap="round" opacity="0.8"/>'
    for y, w in [(80,12),(90,20),(98,9),(106,24),(114,14),(122,26),(130,11),(138,22),(146,16),(154,24),(162,12)]
)
SHIRT = f'''<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="{SLEEVE_SHORT}" fill="#ffffff" stroke="#9aa0a6" stroke-width="2" stroke-linejoin="round"/>
  {brush}
  <path d="M70 40 L40 58 L52 84 L72 72 Z" fill="#ffffff" stroke="#9aa0a6" stroke-width="2" stroke-linejoin="round"/>
  <path d="M130 40 L160 58 L148 84 L128 72 Z" fill="#ffffff" stroke="#9aa0a6" stroke-width="2" stroke-linejoin="round"/>
  {chevron(56,60,"#b9bec4",5)} {chevron(144,60,"#b9bec4",5)}
  <path d="M88 34 C88 48 112 48 112 34 C108 41 92 41 88 34 Z" fill="#15140f" stroke="#15140f" stroke-width="1"/>
  <path d="M90 36 C92 45 108 45 110 36" fill="none" stroke="#e6c24a" stroke-width="1.6"/>
  {crest(100,64,7)}
  {logo_box(72,104,56,32)}
</svg>'''

# ---------------- MATCH DAY TOP — 1/4 ZIP (black, BACK view, logo on back) ----------------
ZIP = f'''<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M86 36 L68 40 L44 56 L40 150 L62 152 L72 78 L64 176 C84 182 116 182 136 176 L128 78 L138 152 L160 150 L156 56 L132 40 L114 36 C114 46 86 46 86 36 Z"
        fill="#0c0c0c" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
  <path d="M68 44 L84 52" stroke="#8a8f98" stroke-width="1.4"/>
  <path d="M132 44 L116 52" stroke="#8a8f98" stroke-width="1.4"/>
  <path d="M86 36 C86 47 114 47 114 36 L110 32 L100 40 L90 32 Z" fill="#1c1c1c" stroke="#000" stroke-width="1.4"/>
  {logo_box(74,74,52,30)}
  <text x="100" y="192" text-anchor="middle" font-family="Arial" font-size="8" fill="#8a8f98">back view &#183; logo on back</text>
</svg>'''

# ---------------- TRAINING KIT 1 — TAG TEE (black graffiti print) + SHORTS, logo front ----------------
import math
tags = ""
spots = [(78,86,18,-12),(120,80,12,8),(95,120,22,-6),(118,128,12,10),(78,150,16,-14),
         (122,150,14,6),(100,160,20,0),(84,118,12,-20),(128,108,12,14),(96,98,12,6)]
for (x,y,sz,rot) in spots:
    tags += (f'<text x="{x}" y="{y}" font-family="Arial Black,Arial" font-size="{sz}" fill="#6e7278" '
             f'opacity="0.5" transform="rotate({rot} {x} {y})" font-weight="900">OWAC</text>')
TEE = f'''<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="teebody"><path d="M84 20 L68 25 L44 40 L54 62 L72 52 L64 128 C82 134 118 134 136 128 L128 52 L146 62 L156 40 L132 25 L116 20 C116 31 84 31 84 20 Z"/></clipPath></defs>
  <path d="M84 20 L68 25 L44 40 L54 62 L72 52 L64 128 C82 134 118 134 136 128 L128 52 L146 62 L156 40 L132 25 L116 20 C116 31 84 31 84 20 Z"
        fill="#0c0c0c" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
  <g clip-path="url(#teebody)">{tags}</g>
  {chevron(60,40,"#e6c24a",6)} {chevron(140,40,"#e6c24a",6)}
  <path d="M84 20 C84 31 116 31 116 20 C112 26 88 26 84 20 Z" fill="#1c1c1c" stroke="#000" stroke-width="1.2"/>
  {crest(100,44,6)}
  {logo_box(78,62,44,26)}
  <!-- shorts -->
  <path d="M62 142 L138 142 L138 152 L106 152 L100 186 L84 186 L80 158 L76 186 L60 186 L62 152 Z"
        fill="#111" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
  <rect x="62" y="142" width="76" height="6" fill="#000"/>
  {chevron(128,160,"#e6c24a",5)}
</svg>'''

# ---------------- TRAINING KIT 2 — FULL-ZIP HOODIE (black, hood, silver zip, logo front) ----------------
HOODIE = f'''<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- hood -->
  <path d="M74 42 C68 18 132 18 126 42 C112 33 88 33 74 42 Z" fill="#000" stroke="#000" stroke-width="2"/>
  <!-- body -->
  <path d="M80 42 L60 46 L40 64 L52 88 L70 76 L64 176 C84 182 116 182 136 176 L130 76 L148 88 L160 64 L140 46 L120 42 C118 56 82 56 80 42 Z"
        fill="#0c0c0c" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
  <!-- shoulder piping -->
  <path d="M64 52 L82 60" stroke="#8a8f98" stroke-width="1.3"/>
  <path d="M136 52 L118 60" stroke="#8a8f98" stroke-width="1.3"/>
  <!-- centre silver zip -->
  <line x1="100" y1="46" x2="100" y2="176" stroke="#b8bdc4" stroke-width="2.4"/>
  <rect x="97" y="60" width="6" height="9" rx="1.5" fill="#cfd3d8"/>
  <!-- neck rib -->
  <path d="M80 42 C84 58 116 58 120 42 C112 52 88 52 80 42 Z" fill="#1c1c1c" stroke="#000" stroke-width="1.2"/>
  <!-- drawcords -->
  <line x1="94" y1="50" x2="93" y2="72" stroke="#cfd3d8" stroke-width="1.8"/>
  <line x1="106" y1="50" x2="107" y2="72" stroke="#cfd3d8" stroke-width="1.8"/>
  {crest(123,84,6)}
  {chevron(80,80,"#ffffff",5)}
  {logo_box(60,96,40,24)}
  <!-- side zip pockets -->
  <line x1="74" y1="120" x2="70" y2="150" stroke="#5a5e64" stroke-width="1.6"/>
  <line x1="126" y1="120" x2="130" y2="150" stroke="#5a5e64" stroke-width="1.6"/>
</svg>'''

with open(os.path.join(HERE, "sponsorship.html"), encoding="utf-8") as f:
    html = f.read()
html = (html.replace("__SHIRT__", SHIRT).replace("__ZIP__", ZIP)
            .replace("__TEE__", TEE).replace("__HOODIE__", HOODIE))
out_html = os.path.join(HERE, "sponsorship_final.html")
with open(out_html, "w", encoding="utf-8") as f:
    f.write(html)

from weasyprint import HTML
pdf_path = os.path.join(HERE, "OWFC-Harris-U11-Sponsorship-2026-27.pdf")
HTML(out_html).write_pdf(pdf_path)
print("WROTE", pdf_path)
