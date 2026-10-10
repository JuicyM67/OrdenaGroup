import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(ROOT, "project")

IMG = {
    "cover": "/_blob/8578e11a786bd9a75aab2a8ef69fc611",
    "staff1": "/_blob/a8ca03a095c088e1a9cc292d5d35b82f",
    "staff2": "/_blob/c437c85f987d319d29e1ba2d8f2bde67",
    "g1": "/_blob/947a284edf2443f13ce1fcc61f143dde",
    "g2": "/_blob/84ff1ad65b10c305b5a030037af585f9",
    "room": "/_blob/8ea4f29001507e56597f0aafa0e5e2d7",
    "esthetician": "/_blob/2ef851bb6194863d0b7f137b68c9805a",
    "smile": "/_blob/4dee5623709b61abeaa1819eaf2ee572",
}
INDUSTRIES = [
    ("Frisör", "/_blob/2f1f9571a0a465216f3beeb388167b58"),
    ("Barberare", "/_blob/b28bfe6c630330cd09cfcb92445072fb"),
    ("Naglar", "/_blob/020a20e2c52301925dbcb94f37f0e3c2"),
    ("Fransar & bryn", "/_blob/530912fc2f8ab6218c83e96ca4faddfe"),
    ("Hudvård", "/_blob/23d8387c09b4426f97072f3233a5932d"),
    ("Massage", "/_blob/95d2bab9d62b8b0f05d932e18e2f00bd"),
    ("Naprapat & fysio", "/_blob/8656dd1503c1487227c6da750585f212"),
    ("Yoga & pilates", "/_blob/c87278c9528ece55c7f24de9915ccc4b"),
    ("Tatuering", "/_blob/6b3618615fdc37734557975fc0f972a9"),
    ("Hundtrim", "/_blob/df81058b32dde0fdca2f472e241778dc"),
    ("Personlig träning", "/_blob/5a67e5445fa8a5a8e9ee2b5830d496e8"),
    ("Makeup", "/_blob/68253e5a8873173dbb87c138d0cf1ef5"),
]
LOGO = '<svg width="100%" height="100%" viewBox="0 0 160 160" role="img" aria-label="Salong Norrsken logotyp" style="display: block"><rect width="160" height="160" fill="#14213D"></rect><path d="M30 104C52 58 84 40 130 46" fill="none" stroke="#7CF2C4" stroke-width="9" stroke-linecap="round"></path><path d="M34 120C60 82 92 68 130 72" fill="none" stroke="#B49CFF" stroke-opacity=".8" stroke-width="7" stroke-linecap="round"></path><circle cx="116" cy="114" r="5" fill="#FFFFFF"></circle><circle cx="52" cy="48" r="3.5" fill="#FFFFFF" fill-opacity=".8"></circle></svg>'
ARROW_LIME = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E3F36B" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'
ARROW_INK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16161A" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'
CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="m5 12 5 5 9-10"></path></svg>'
STAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="{c}" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"></path></svg>'
BOLT = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="{c}" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"></path></svg>'
DISPLAY = "font-family: 'Bricolage Grotesque', sans-serif"

THEMES = {
    "P1": dict(name="Ljus premium", bg="#F4F4F0", fg="#16161A", muted="#5E5E66", card="#FFFFFF", card2="#FFFFFF", line="#EFEFEA",
               eyebrowBg="#E6E0F8", eyebrowFg="#4B3AA8", chipBg="#F4F4F0", glass="lg-light", dark=False),
    "P2": dict(name="Mörk lyx", bg="#111114", fg="#FFFFFF", muted="#B9B9C2", card="#1C1C22", card2="#2A2A31", line="#33333B",
               eyebrowBg="#2A2A31", eyebrowFg="#E3F36B", chipBg="#2A2A31", glass="lg-dark", dark=True),
    "P3": dict(name="Foto-berättelse", bg="#F4F4F0", fg="#16161A", muted="#5E5E66", card="#FFFFFF", card2="#FFFFFF", line="#EFEFEA",
               eyebrowBg="#FFFFFF", eyebrowFg="#16161A", chipBg="#F4F4F0", glass="lg-light", dark=False),
}

STYLE = """
body{margin:0}
a{color:inherit}a:hover{opacity:.88}
.lg-light{background:linear-gradient(135deg,rgba(255,255,255,.82) 0%,rgba(255,255,255,.58) 60%,rgba(255,255,255,.7) 100%);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);border:1px solid rgba(255,255,255,.75);box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 18px 50px rgba(22,22,26,.14);color:#16161A}
.lg-dark{background:linear-gradient(135deg,rgba(42,42,49,.72) 0%,rgba(28,28,34,.5) 100%);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 18px 50px rgba(0,0,0,.35);color:#FFFFFF}
details summary{list-style:none;cursor:pointer}
details summary::-webkit-details-marker{display:none}
details[open] .pg-chev{transform:rotate(180deg)}
.pg-chev{transition:transform .3s}
.pg-tile img{transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.pg-tile:hover img{transform:scale(1.05)}
@keyframes pg-pulse{0%,100%{box-shadow:0 0 0 0 rgba(227,243,107,.6)}50%{box-shadow:0 0 0 10px rgba(227,243,107,0)}}
.pg-pulse{animation:pg-pulse 2s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.pg-pulse{animation:none}.pg-tile img{transition:none}}
"""


def eyebrow(t, label):
    return f'<span style="align-self: flex-start; font-size: 13px; font-weight: 700; letter-spacing: .08em; padding: 7px 12px; border-radius: 10px; background: {t["eyebrowBg"]}; color: {t["eyebrowFg"]}">{label}</span>'


def h2(t, html, size=56):
    return f'<h2 style="margin: 0; {DISPLAY}; font-size: {size}px; line-height: 1; font-weight: 600; letter-spacing: -0.03em; color: inherit">{html}</h2>'


def lime(text):
    return f'<span style="background: #E3F36B; color: #16161A; border-radius: 14px; padding: 0 10px">{text}</span>'


def cta(label, dark_btn=True):
    if dark_btn:
        return f'<a href="#" style="align-self: flex-start; height: 56px; padding: 0 8px 0 24px; border-radius: 28px; background: #16161A; color: #FFFFFF; font-weight: 700; font-size: 16px; text-decoration: none; display: flex; align-items: center; gap: 14px">{label}<span style="width: 40px; height: 40px; border-radius: 50%; background: #E3F36B; display: flex; align-items: center; justify-content: center">{ARROW_INK}</span></a>'
    return f'<a href="#" style="align-self: flex-start; height: 56px; padding: 0 8px 0 24px; border-radius: 28px; background: #E3F36B; color: #16161A; font-weight: 700; font-size: 16px; text-decoration: none; display: flex; align-items: center; gap: 14px">{label}<span style="width: 40px; height: 40px; border-radius: 50%; background: #16161A; display: flex; align-items: center; justify-content: center">{ARROW_LIME}</span></a>'


# ---------- 3. Showcase ----------
def showcase(t, key):
    browser = f'''<div style="position: absolute; left: 0; top: 0; width: 640px; border-radius: 22px; overflow: hidden; background: #FFFFFF; color: #16161A; box-shadow: 0 40px 90px rgba(22,22,26,.25)">
<div style="height: 40px; background: #F4F4F0; display: flex; align-items: center; gap: 8px; padding: 0 14px"><span style="width: 10px; height: 10px; border-radius: 50%; background: #E2E2DC"></span><span style="width: 10px; height: 10px; border-radius: 50%; background: #E2E2DC"></span><span style="width: 10px; height: 10px; border-radius: 50%; background: #E2E2DC"></span><span style="margin-left: 14px; flex: 1; height: 24px; border-radius: 12px; background: #FFFFFF; font-size: 12px; color: #5E5E66; display: flex; align-items: center; padding: 0 12px">bookingbuddy.se/salong-norrsken</span></div>
<div style="height: 170px; position: relative"><img src="{IMG['cover']}" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block"><span style="position: absolute; left: 22px; bottom: -30px; width: 68px; height: 68px; border-radius: 20px; overflow: hidden; border: 4px solid #FFFFFF; box-shadow: 0 8px 20px rgba(22,22,26,.2)">{LOGO}</span><span style="position: absolute; right: 16px; top: 14px; display: flex; gap: 6px"><span style="font-size: 11px; font-weight: 700; padding: 5px 9px; border-radius: 10px; background: rgba(255,255,255,.88)">Instagram</span><span style="font-size: 11px; font-weight: 700; padding: 5px 9px; border-radius: 10px; background: rgba(255,255,255,.88)">TikTok</span></span></div>
<div style="padding: 40px 22px 22px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px">
<div style="grid-column: span 3; display: flex; flex-direction: column; gap: 10px">
<span style="display: flex; flex-direction: column; gap: 2px"><b style="{DISPLAY}; font-size: 22px">Salong Norrsken</b><span style="font-size: 12px; color: #5E5E66; display: flex; align-items: center; gap: 6px">{STAR.format(c="#C77A1E")}<b style="color: #16161A">4,9</b> · 128 verifierade omdömen · Södermalm</span></span>
<div style="display: flex; gap: 6px; font-size: 12px; font-weight: 700"><span style="padding: 7px 12px; border-radius: 10px; background: #16161A; color: #FFFFFF">Tjänster</span><span style="padding: 7px 12px; border-radius: 10px; background: #F4F4F0">Personal</span><span style="padding: 7px 12px; border-radius: 10px; background: #F4F4F0">Omdömen</span></div>
<span style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 14px; background: #F4F4F0; font-size: 13px"><span><b>Klippning dam</b><span style="display: block; font-size: 11px; color: #5E5E66">45 min</span></span><span style="display: flex; align-items: center; gap: 10px"><b>650 kr</b><span style="padding: 6px 10px; border-radius: 10px; background: #16161A; color: #FFFFFF; font-size: 11px; font-weight: 700">Boka</span></span></span>
<span style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 14px; background: #F4F4F0; font-size: 13px"><span><b>Färgning + klipp</b><span style="display: block; font-size: 11px; color: #5E5E66">2 h</span></span><span style="display: flex; align-items: center; gap: 10px"><b>1 290 kr</b><span style="padding: 6px 10px; border-radius: 10px; background: #16161A; color: #FFFFFF; font-size: 11px; font-weight: 700">Boka</span></span></span>
</div>
<div style="grid-column: span 2; display: flex; flex-direction: column; gap: 10px">
<span style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 10px; border-radius: 14px; background: #E3F36B; color: #2F3310">{BOLT.format(s=12, c="currentColor")}Idag 16:30 · −25 %</span>
<span style="font-size: 11px; font-weight: 700; letter-spacing: .06em; color: #5E5E66">VÅRT TEAM</span>
<span style="display: flex; gap: 8px"><img src="{IMG['staff1']}" alt="" style="width: 44px; height: 44px; border-radius: 14px; object-fit: cover"><img src="{IMG['staff2']}" alt="" style="width: 44px; height: 44px; border-radius: 14px; object-fit: cover"><span style="width: 44px; height: 44px; border-radius: 14px; background: #E6E0F8; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center">+2</span></span>
<span style="font-size: 12px; color: #3E3E46; line-height: 1.4">"Precis den klippning jag ville ha."<b style="display: block; margin-top: 4px; color: #16161A">Sara L. · Verifierad</b></span>
</div>
</div>
</div>'''
    phone = f'''<div style="position: absolute; right: 0; bottom: 0; width: 250px; height: 500px; border-radius: 40px; background: #16161A; padding: 10px; box-sizing: border-box; box-shadow: 0 40px 90px rgba(22,22,26,.35)">
<div style="width: 100%; height: 100%; border-radius: 31px; overflow: hidden; background: #FFFFFF; color: #16161A; display: flex; flex-direction: column">
<div style="height: 150px; position: relative; flex: none"><img src="{IMG['cover']}" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block"><span style="position: absolute; left: 14px; bottom: -22px; width: 48px; height: 48px; border-radius: 15px; overflow: hidden; border: 3px solid #FFFFFF">{LOGO}</span></div>
<div style="padding: 30px 14px 14px; display: flex; flex-direction: column; gap: 8px">
<b style="{DISPLAY}; font-size: 17px">Salong Norrsken</b>
<span style="font-size: 11px; color: #5E5E66">★ 4,9 · Södermalm</span>
<span style="padding: 9px 10px; border-radius: 12px; background: #F4F4F0; font-size: 12px; display: flex; justify-content: space-between"><b>Klippning dam</b><b>650 kr</b></span>
<span style="padding: 9px 10px; border-radius: 12px; background: #F4F4F0; font-size: 12px; display: flex; justify-content: space-between"><b>Skägg & fade</b><b>395 kr</b></span>
<span style="padding: 9px 10px; border-radius: 12px; background: #F4F4F0; font-size: 12px; display: flex; justify-content: space-between"><b>Gellack</b><b>495 kr</b></span>
<span style="margin-top: 6px; height: 42px; border-radius: 14px; background: #16161A; color: #FFFFFF; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center">Boka tid</span>
</div></div></div>'''
    chips = ''.join(f'<span class="{t["glass"]}" style="padding: 10px 14px; border-radius: 16px; font-size: 14px; font-weight: 600">{c}</span>' for c in ["bookingbuddy.se/dittnamn", "Instagram, TikTok & Facebook", "Blixttider syns direkt", "Omdömen från riktiga kunder"])
    text = f'''<div style="display: flex; flex-direction: column; gap: 24px; max-width: 480px">
{eyebrow(t, "DIN BOKNINGSSIDA")}
{h2(t, "Snygg från<br>" + lime("första dagen."))}
<p style="margin: 0; font-size: 18px; line-height: 1.55; color: {t["muted"] if key != "P3" else "rgba(255,255,255,.9)"}">Bilder, tjänster, personal, omdömen och sociala medier på din egen adress. Kunderna bokar – och betalar – på under en minut, från mobilen eller datorn.</p>
<div style="display: flex; flex-wrap: wrap; gap: 8px">{chips}</div>
{cta("Se exempelsidan", dark_btn=not t["dark"] and key != "P3")}
</div>'''
    visual = f'<div style="position: relative; width: 700px; height: 600px; flex: none">{browser}{phone}</div>'
    if key == "P3":
        return f'''<section style="position: relative; overflow: hidden; color: #FFFFFF">
<img src="{IMG['room']}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(6px) brightness(.55); transform: scale(1.06)">
<div style="position: relative; padding: 120px 88px; display: flex; align-items: center; justify-content: space-between; gap: 60px">{text}{visual}</div>
</section>'''
    bg = t["bg"] if key == "P2" else "linear-gradient(180deg, #F4F4F0 0%, #ECE7FA 100%)"
    return f'<section style="background: {bg}; color: {t["fg"]}; padding: 120px 88px; display: flex; align-items: center; justify-content: space-between; gap: 60px">{text}{visual}</section>'


# ---------- 4. Features bento ----------
def bento(t, key):
    g = t["glass"] if key != "P1" else "lg-light"
    tile = lambda inner, span, extra="": f'<div class="{g}" style="grid-column: span {span}; border-radius: 28px; padding: 28px; display: flex; flex-direction: column; gap: 14px; {extra}">{inner}</div>'
    muted = "#3E3E46" if g == "lg-light" else "#D2D2D9"
    pay = tile(f'''<span style="font-size: 12px; font-weight: 700; letter-spacing: .08em; color: {muted}">BETALNING VID BOKNING</span>
<h3 style="margin: 0; {DISPLAY}; font-size: 30px; line-height: 1.05; font-weight: 600">Kunden betalar när hen bokar.</h3>
<p style="margin: 0; font-size: 15px; line-height: 1.5; color: {muted}">Kort eller Apple Pay – pengarna går direkt till ditt konto. Vid avbokning återbetalas allt automatiskt.</p>
<div style="margin-top: auto; display: flex; gap: 12px; align-items: stretch">
<div style="flex: 1; padding: 16px; border-radius: 20px; background: #FFFFFF; color: #16161A; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 10px 30px rgba(22,22,26,.08)"><span style="font-size: 12px; color: #5E5E66">Klippning dam · tor 14:30</span><b style="font-size: 18px">650 kr</b><span style="height: 40px; border-radius: 12px; background: #D5EEDC; color: #1F6B3A; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px">{CHECK.format(c="#1F6B3A")}Betald</span></div>
<div style="flex: 1; padding: 16px; border-radius: 20px; background: #16161A; color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between"><span style="font-size: 12px; color: #B9B9C2">Vår avgift</span><b style="{DISPLAY}; font-size: 40px; color: #E3F36B; line-height: 1">1 %</b><span style="font-size: 12px; color: #D2D2D9">per kortbetalning + Stripes avgift. Ingen provision på bokningar.</span></div>
</div>''', 6, "min-height: 380px")
    reviews = tile(f'''<span style="font-size: 12px; font-weight: 700; letter-spacing: .08em; color: {muted}">VERIFIERADE OMDÖMEN</span>
<span style="display: flex; align-items: baseline; gap: 10px"><b style="{DISPLAY}; font-size: 54px; line-height: 1">4,9</b><span style="display: flex; gap: 2px">{STAR.format(c="#C77A1E") * 5}</span></span>
<p style="margin: 0; font-size: 15px; line-height: 1.5; color: {muted}">Bara kunder med en genomförd bokning kan recensera. Du svarar offentligt – omdömena syns på din sida.</p>''', 3)
    flash = tile(f'''<span style="font-size: 12px; font-weight: 700; letter-spacing: .08em; color: {muted}">BLIXTTIDER & VÄNTELISTA</span>
<span class="pg-pulse" style="align-self: flex-start; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 16px; background: #E3F36B; color: #2F3310; font-weight: 700">{BOLT.format(s=16, c="currentColor")}Idag 16:30 · −25 %</span>
<p style="margin: 0; font-size: 15px; line-height: 1.5; color: {muted}">En avbokning blir en ny bokning: väntelistan får besked direkt och tomma luckor fylls med rabatt.</p>''', 3)
    small = lambda label, title, text: tile(f'<span style="font-size: 12px; font-weight: 700; letter-spacing: .08em; color: {muted}">{label}</span><b style="{DISPLAY}; font-size: 24px; line-height: 1.1">{title}</b><span style="font-size: 14px; line-height: 1.5; color: {muted}">{text}</span>', 2)
    rest = small("PÅMINNELSER", "Färre uteblivna besök", "SMS och e-post 24 h innan – automatiskt.") + small("KASSA & STATISTIK", "Koll på intäkterna", "Betalningar, beläggning och rapporter i realtid.") + small("MEDLEMMAR & UTSKICK", "Kunder som kommer tillbaka", "Rabatt för stamkunder och kampanjer till de som inte bokat på länge.")
    head = f'<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-bottom: 40px"><div style="display: flex; flex-direction: column; gap: 18px">{eyebrow(t, "FUNKTIONER")}{h2(t, "Allt som fyller kalendern.<br>" + lime("Inget onödigt."))}</div><p style="margin: 0; max-width: 380px; font-size: 17px; line-height: 1.55; color: {t["muted"] if key != "P3" else "rgba(255,255,255,.9)"}">Allt ingår från start. Du betalar för fler anställda och SMS – aldrig för funktioner.</p></div>'
    grid = f'<div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px"><div style="grid-column: span 6; display: grid">{pay.replace("grid-column: span 6; ", "")}</div><div style="grid-column: span 6; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px">{reviews}{flash}</div>{rest.replace("span 2", "span 4")}</div>'
    if key == "P3":
        return f'''<section style="position: relative; overflow: hidden; color: #FFFFFF; padding: 120px 88px">
<img src="{IMG['esthetician']}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(.45)">
<div style="position: relative">{head}{grid}</div></section>'''
    return f'<section style="background: {t["bg"]}; color: {t["fg"]}; padding: 120px 88px">{head}{grid}</section>'


# ---------- 5. How customers book ----------
def howto(t, key):
    steps = [("01", "Väljer tjänst", "Med bild, pris och längd"), ("02", "Väljer tid", "Bara tider som faktiskt är lediga"), ("03", "Fyller i uppgifter", "Namn och telefon – inget konto krävs"), ("04", "Betalar och är bokad", "Bekräftelse direkt via SMS och e-post")]
    rows = ''.join(f'<div style="display: flex; align-items: center; gap: 16px; padding: 16px 18px; border-radius: 20px; background: {t["card"]}; {"border: 1px solid " + t["line"] + ";" if not t["dark"] else ""}"><span style="width: 44px; height: 44px; border-radius: 14px; background: {"#E3F36B" if i == 3 else t["chipBg"]}; color: #16161A; font-weight: 700; display: flex; align-items: center; justify-content: center; {"color: #FFFFFF;" if t["dark"] and i != 3 else ""}">{n}</span><span style="display: flex; flex-direction: column"><b style="font-size: 17px">{a}</b><span style="font-size: 13px; color: {t["muted"]}">{b}</span></span></div>' for i, (n, a, b) in enumerate(steps))
    phone = f'''<div style="width: 300px; height: 600px; border-radius: 46px; background: #16161A; padding: 12px; box-sizing: border-box; box-shadow: 0 40px 90px rgba(22,22,26,.3)">
<div style="width: 100%; height: 100%; border-radius: 35px; background: #FFFFFF; color: #16161A; padding: 26px 18px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px">
<span style="font-size: 12px; font-weight: 700; color: #5E5E66">STEG 3 AV 4</span>
<b style="{DISPLAY}; font-size: 22px">Dina uppgifter</b>
<span style="padding: 12px; border-radius: 14px; background: #F4F4F0; font-size: 13px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 11px; color: #5E5E66">Klippning dam · tor 16 okt</span><b>14:30 med Ida · 650 kr</b></span>
<label style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600">Namn<span style="height: 44px; border-radius: 12px; border: 2px solid #16161A; padding: 0 12px; display: flex; align-items: center; font-size: 14px; font-weight: 500">Elsa Lindqvist</span></label>
<label style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600">Mobilnummer<span style="height: 44px; border-radius: 12px; background: #F4F4F0; padding: 0 12px; display: flex; align-items: center; font-size: 14px; font-weight: 500">070-123 45 67</span></label>
<span style="font-size: 11px; color: #5E5E66; line-height: 1.4">Vi skickar en bekräftelse och en påminnelse dagen innan.</span>
<span style="margin-top: auto; height: 50px; border-radius: 16px; background: #16161A; color: #FFFFFF; font-weight: 700; display: flex; align-items: center; justify-content: center">Betala 650 kr och boka</span>
</div></div>'''
    bg = t["bg"] if key != "P1" else "#FFFFFF"
    return f'''<section style="background: {bg}; color: {t["fg"]}; padding: 120px 88px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 80px; align-items: center">
<div style="display: flex; flex-direction: column; gap: 22px">{eyebrow(t, "SÅ BOKAR DINA KUNDER")}{h2(t, "Bokat på<br>" + lime("under en minut."))}<p style="margin: 0; font-size: 18px; line-height: 1.55; color: {t["muted"]}">Inga appar, inga konton, inga samtal. Kunden klickar på din länk – från Instagram, Google eller ett SMS – och är klar.</p><div style="display: flex; flex-direction: column; gap: 10px">{rows}</div></div>
<div style="display: flex; justify-content: center; position: relative">{phone}<span class="lg-light" style="position: absolute; right: 60px; top: 60px; padding: 12px 14px; border-radius: 18px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px">{CHECK.format(c="#1F6B3A")}Bekräftelse skickad</span></div>
</section>'''


# ---------- 6. For whom ----------
def forwho(t, key):
    if key == "P3":
        tiles = ''.join(f'<a href="#" class="pg-tile" style="position: relative; display: block; border-radius: 24px; overflow: hidden; height: {300 if i % 3 == 0 else 220}px; text-decoration: none"><img src="{src}" alt="{name}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover"><span class="lg-light" style="position: absolute; left: 12px; bottom: 12px; padding: 8px 12px; border-radius: 14px; font-size: 14px; font-weight: 700">{name}</span></a>' for i, (name, src) in enumerate(INDUSTRIES))
        cols = ''.join(f'<div style="display: flex; flex-direction: column; gap: 14px">{"".join(tiles.split("</a>")[j] + "</a>" for j in range(c, 12, 4))}</div>' for c in range(4))
        body = f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: start">{cols}</div>'
    else:
        g = t["glass"]
        body = '<div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px">' + ''.join(f'<a href="#" class="pg-tile" style="position: relative; display: block; border-radius: 22px; overflow: hidden; height: 200px; text-decoration: none"><img src="{src}" alt="{name}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover"><span class="{g}" style="position: absolute; left: 10px; right: 10px; bottom: 10px; padding: 9px 12px; border-radius: 14px; font-size: 13px; font-weight: 700">{name}</span></a>' for name, src in INDUSTRIES) + '</div>'
    return f'''<section style="background: {t["bg"]}; color: {t["fg"]}; padding: 120px 88px; display: flex; flex-direction: column; gap: 40px">
<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px"><div style="display: flex; flex-direction: column; gap: 18px">{eyebrow(t, "FÖR VEM")}{h2(t, "För alla som<br>" + lime("jobbar med tider."))}</div><p style="margin: 0; max-width: 400px; font-size: 17px; line-height: 1.55; color: {t["muted"]}">Från ensam frisör till klinik med tio behandlare. Samma enkla system – anpassat efter din bransch.</p></div>
{body}</section>'''


# ---------- 7. Pricing ----------
def pricing(t, key):
    plans = [
        ("Gratis", "0 kr", ["1 anställd", "Din bokningssida", "Onlinebokning dygnet runt", "Påminnelser via e-post"], False),
        ("Starta", "299 kr", ["1 anställd", "SMS-påminnelser (50/mån)", "Väntelista", "Betalning vid bokning"], False),
        ("Team", "499 kr", ["Upp till 3 anställda", "150 SMS/mån", "Blixttider", "Medlemmar & utskick", "Rapporter"], True),
        ("Företag", "799 kr", ["Upp till 10 anställda", "300 SMS/mån", "Allt i Team", "Prioriterad support"], False),
    ]
    dark = t["dark"]
    cards = ""
    for name, price, feats, hot in plans:
        bg = "#16161A" if hot and not dark else ("#E3F36B" if hot and dark else t["card"])
        fg = "#FFFFFF" if hot and not dark else ("#16161A" if hot and dark else t["fg"])
        priceC = "#E3F36B" if hot and not dark else fg
        chk = "#E3F36B" if hot and not dark else ("#16161A" if hot and dark else ("#E3F36B" if dark else "#16161A"))
        btnBg = "#E3F36B" if hot and not dark else ("#16161A" if hot and dark else ("#2A2A31" if dark else "#F4F4F0"))
        btnFg = "#16161A" if hot and not dark else ("#FFFFFF" if hot and dark else fg)
        badge = f'<span style="position: absolute; top: -12px; right: 20px; font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 10px; background: {"#E3F36B" if not dark else "#FFFFFF"}; color: #16161A; transform: rotate(3deg)">Mest vald</span>' if hot else ""
        fl = ''.join(f'<li style="display: flex; gap: 10px; align-items: center">{CHECK.format(c=chk)}{f}</li>' for f in feats)
        cards += f'''<div style="position: relative; border-radius: 28px; padding: 28px; background: {bg}; color: {fg}; display: flex; flex-direction: column; gap: 18px; {"border: 1px solid " + t["line"] + ";" if not hot and not dark else ""} {"box-shadow: 0 30px 70px rgba(22,22,26,.25);" if hot else ""}">{badge}
<b style="font-size: 18px">{name}</b><span style="display: flex; align-items: baseline; gap: 6px"><b style="{DISPLAY}; font-size: 44px; line-height: 1; color: {priceC}">{price}</b><span style="font-size: 14px; opacity: .7">/mån</span></span>
<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 14px">{fl}</ul>
<a href="#" style="margin-top: auto; height: 50px; border-radius: 16px; background: {btnBg}; color: {btnFg}; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center">Välj {name}</a></div>'''
    return f'''<section style="background: {t["bg"] if key != "P3" else "#FFFFFF"}; color: {t["fg"]}; padding: 120px 88px; display: flex; flex-direction: column; gap: 36px">
<div style="display: flex; flex-direction: column; gap: 16px; align-items: center; text-align: center">{eyebrow(t, "PRISER")}{h2(t, "Enkla priser.<br>" + lime("Ingen provision."))}<p style="margin: 0; font-size: 17px; color: {t["muted"]}">Per månad, exkl. moms. 30 dagars provperiod på betalplanerna. Ingen bindningstid.</p></div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: stretch">{cards}</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">
<div style="border-radius: 22px; padding: 20px 24px; background: {t["card"]}; {"border: 1px solid " + t["line"] + ";" if not dark else ""} display: flex; align-items: center; gap: 16px"><b style="{DISPLAY}; font-size: 30px">1 %</b><span style="font-size: 14px; line-height: 1.45; color: {t["muted"]}">per kortbetalning + Stripes avgift när kunden betalar online. Ingen provision på bokningar – någonsin.</span></div>
<div style="border-radius: 22px; padding: 20px 24px; background: #E3F36B; color: #16161A; display: flex; align-items: center; gap: 16px"><b style="{DISPLAY}; font-size: 30px">½</b><span style="font-size: 14px; line-height: 1.45"><b>Grundarplanen:</b> de första företagen som ansluter sig betalar halva priset – för alltid.</span></div>
</div></section>'''


# ---------- 8. FAQ ----------
def faq(t, key):
    qs = [
        ("Vad kostar kortbetalningar?", "Vi tar ingen provision på bokningar. När en kund betalar med kort tar vi 1 % och Stripe sin vanliga avgift. Pengarna går direkt till ditt eget Stripe-konto."),
        ("Hur flyttar jag från mitt nuvarande system?", "Klistra in länken till din nuvarande bokningssida, så läser vi in tjänster, priser, öppettider och personal. Du granskar och importerar – det tar ett par minuter."),
        ("Var lagras min och mina kunders data?", "Inom EU. Du kan exportera eller radera data när du vill, och kunderna kan själva begära sina uppgifter."),
        ("Finns det bindningstid?", "Nej. Du kan byta plan eller avsluta när du vill."),
        ("Hur fungerar omdömena?", "Efter varje genomförd bokning får kunden en länk och kan betygsätta besöket. Bara riktiga kunder kan recensera, och du kan svara offentligt."),
        ("Behöver jag installera något?", "Nej. Allt fungerar i webbläsaren, på mobilen och datorn."),
        ("Hjälper ni mig att komma igång?", "Ja – med importen är du igång på några minuter, och vår support svarar på svenska."),
    ]
    items = ''.join(f'<details {"open" if i == 0 else ""} style="border-top: 1px solid {t["line"]}; padding: 20px 4px"><summary style="display: flex; justify-content: space-between; align-items: center; gap: 20px; font-size: 18px; font-weight: 700">{q}<span class="pg-chev" style="width: 36px; height: 36px; border-radius: 12px; background: {t["chipBg"]}; display: flex; align-items: center; justify-content: center; flex: none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></span></summary><p style="margin: 12px 0 0; max-width: 760px; font-size: 16px; line-height: 1.6; color: {t["muted"]}">{a}</p></details>' for i, (q, a) in enumerate(qs))
    return f'''<section style="background: {t["bg"]}; color: {t["fg"]}; padding: 120px 88px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 40px">
<div style="grid-column: span 4; display: flex; flex-direction: column; gap: 18px">{eyebrow(t, "FRÅGOR & SVAR")}{h2(t, "Bra att veta.", 52)}<p style="margin: 0; font-size: 16px; line-height: 1.55; color: {t["muted"]}">Hittar du inte svaret? Skriv till oss – vi svarar på svenska.</p></div>
<div style="grid-column: span 8">{items}</div></section>'''


# ---------- 9. Final CTA ----------
def final(t, key):
    form = f'''<form class="lg-light" style="display: flex; gap: 6px; padding: 6px; border-radius: 30px; max-width: 520px">
<label for="cta-email-{key}" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Din e-post</label>
<input id="cta-email-{key}" type="email" placeholder="Din e-postadress" style="flex: 1; min-width: 0; height: 52px; border: 0; border-radius: 26px; padding: 0 20px; font: inherit; font-size: 16px; background: #FFFFFF; color: #16161A">
<button type="button" style="height: 52px; padding: 0 22px; border: 0; border-radius: 26px; background: #E3F36B; color: #16161A; font: inherit; font-weight: 700; font-size: 16px">Skapa gratis konto</button></form>'''
    trust = '<div style="display: flex; gap: 18px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.92)"><span>Betalningar via Stripe</span><span>·</span><span>Data lagras i EU</span><span>·</span><span>Support på svenska</span></div>'
    return f'''<section style="background: {t["bg"]}; padding: 0 88px 120px">
<div style="position: relative; border-radius: 36px; overflow: hidden; color: #FFFFFF; padding: 90px 72px; min-height: 380px; box-sizing: border-box">
<img src="{IMG['room']}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1)">
<div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(28,24,22,.82) 0%, rgba(28,24,22,.5) 45%, rgba(28,24,22,0) 75%)"></div>
<div style="position: relative; display: flex; flex-direction: column; gap: 22px; max-width: 600px">
<h2 style="margin: 0; {DISPLAY}; font-size: 60px; line-height: 1; font-weight: 600; letter-spacing: -0.03em">Redo att fylla<br>{lime("kalendern?")}</h2>
<p style="margin: 0; font-size: 18px; line-height: 1.5; color: rgba(255,255,255,.9)">Skapa din bokningssida på fem minuter – gratis för en person, utan kort.</p>
{form}{trust}</div></div></section>'''


# ---------- 10. Footer ----------
def footer(t, key):
    col = lambda title, links: f'<div style="display: flex; flex-direction: column; gap: 12px"><b style="font-size: 14px; color: #FFFFFF">{title}</b>' + ''.join(f'<a href="#" style="font-size: 14px; color: #B9B9C2; text-decoration: none">{l}</a>' for l in links) + '</div>'
    return f'''<footer style="background: #111114; color: #FFFFFF; padding: 80px 88px 40px; display: flex; flex-direction: column; gap: 48px">
<div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 32px">
<div style="grid-column: span 4; display: flex; flex-direction: column; gap: 16px"><span style="{DISPLAY}; font-weight: 700; font-size: 26px">Booking <span style="background: #E3F36B; color: #16161A; border-radius: 8px; padding: 0 6px">Buddy</span></span><span style="font-size: 15px; color: #B9B9C2; line-height: 1.5">Bokningssystemet som fyller kalendern – och kassan.</span>
<div class="lg-dark" style="margin-top: 8px; padding: 14px 16px; border-radius: 18px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 11px; font-weight: 700; letter-spacing: .08em; color: #E3F36B">PARTNER</span><span style="font-size: 14px"><b>Stampello</b> – digitalt stämpelkort för dina stamkunder</span></div></div>
<div style="grid-column: span 2">{col("Produkt", ["Funktioner", "Priser", "Smärtfri flytt", "Blixttider", "Exempelsida"])}</div>
<div style="grid-column: span 2">{col("Branscher", ["Frisörer", "Barberare", "Hud & skönhet", "Naprapat & fysio"])}</div>
<div style="grid-column: span 2">{col("Företaget", ["Om oss", "Villkor", "Integritet", "Biträdesavtal"])}</div>
<div style="grid-column: span 2; display: flex; flex-direction: column; gap: 12px"><b style="font-size: 14px">Kontakt</b><a href="#" style="font-size: 14px; color: #B9B9C2; text-decoration: none">[e-postadress]</a><span style="font-size: 14px; color: #B9B9C2">Org.nr [ORG.NR]</span><span style="font-size: 14px; color: #B9B9C2">Stockholm, Sverige</span></div>
</div>
<div style="border-top: 1px solid #2A2A31; padding-top: 24px; display: flex; justify-content: space-between; font-size: 13px; color: #8E8E97"><span>© 2026 Booking Buddy</span><span>Betalningar via Stripe · Data lagras i EU</span></div>
</footer>'''


def page(key):
    t = THEMES[key]
    sections = [showcase(t, key), bento(t, key), howto(t, key), forwho(t, key), pricing(t, key), faq(t, key), final(t, key), footer(t, key)]
    body = "\n".join(sections)
    return f'''<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>Startsida – förslag {key[-1]} ({t["name"]})</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&amp;family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<style>{STYLE}</style>
</helmet>
<div style="width: 1440px; background: {t["bg"]}; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: {t["fg"]}">
<dc-import name="Konv1" hint-size="1440px,900px"></dc-import>
<div style="background: #F4F4F0"><dc-import name="Flytt" hint-size="1440px,820px"></dc-import></div>
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":{H}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''


H = 9200
c = json.load(open(os.path.join(PROJ, "canvas.json")))
for i, key in enumerate(["P1", "P2", "P3"]):
    name = f"Sida{key}.dc.html"
    open(os.path.join(PROJ, name), "w").write(page(key))
    c["boards"][name] = {"x": i * 1560, "y": 22400, "w": 1440, "h": H, "title": f"Förslag {i + 1} · {THEMES[key]['name']}", "is_interactive": True}
    if name not in c["order"]:
        c["order"].append(name)
c["notes"]["t8"] = {"x": 0, "y": 22100, "text": "Hela startsidan – tre förslag", "kind": "title1", "maxW": 4560}
json.dump(c, open(os.path.join(PROJ, "canvas.json"), "w"), ensure_ascii=False)
print("ok")
