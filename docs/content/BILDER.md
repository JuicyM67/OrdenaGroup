# Bilder på sitio-webben

Fotografier används sparsamt (WP-hemsida v2, punkt 8): en bakgrund i den stora bentogrid-rutan
på startsidan. Fri att använda kommersiellt (Unsplash-licens, https://unsplash.com/license),
hämtad via Unsplashs publika `napi`-sökning, nedskalad och konverterad till webp (`cwebp`) för
att hålla sig under 250 kB. Källfilen ligger i `public/images/sitio/`.

| Fil | Användning | Fotograf | Källa |
|---|---|---|---|
| `bento-salon.webp` | Bakgrund, den stora rutan i bentogridet på startsidan ("Todo lo que necesitas"), mörk overlay `bg-ink/75` | Giorgio Trovato | https://unsplash.com/photos/black-and-silver-office-rolling-chair-beside-mirror-gI9rvJK61L8 |

Bilden visar en tom lokal (inga personer i fokus, inga igenkännbara ansikten), rent dekorativ
(`alt=""`) eftersom den delar rutan med en egen rubrik/text som redan bär informationen.

`cta-barberia.webp` togs bort ur CTA-bandet (retro 2026-09-28, punkt 4): den ersattes av en
telefonmockup byggd av tokens/komponenter i stället för ett foto, se `cta-band.tsx`. Strängen
`sitio.cta.fondoAlt` (es-CL/sv-SE) används inte längre av något — kvar i i18n tills
copywriter-es-cl städar bort den (utanför det här arbetspaketets ägarskap).
| `hero-salong.webp` | Heron (bento), fotorutan | se källa | https://unsplash.com/photos/a-hair-salon-with-chairs-and-a-mirror-DUvovc88OfE |
