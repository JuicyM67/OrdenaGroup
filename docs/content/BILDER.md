# Bilder på sitio-webben

Fotografier används sparsamt (WP-hemsida v2, punkt 8): en bakgrund i CTA-bandet och en i den
stora bentogrid-rutan på startsidan. Alla är fria att använda kommersiellt (Unsplash-licens,
https://unsplash.com/license), hämtade via Unsplashs publika `napi`-sökning, nedskalade och
konverterade till webp (`cwebp`) för att hålla sig under 250 kB. Källfilerna ligger i
`public/images/sitio/`.

| Fil | Användning | Fotograf | Källa |
|---|---|---|---|
| `cta-barberia.webp` | Bakgrund, CTA-bandet (alla sitio-sidor), mörk overlay `bg-ink/70` | Barney Goodman | https://unsplash.com/photos/an-empty-barbershop-interior-with-several-chairs-and-mirrors-AXurvQTtO3Y |
| `bento-salon.webp` | Bakgrund, den stora rutan i bentogridet på startsidan ("Todo lo que necesitas"), mörk overlay `bg-ink/75` | Giorgio Trovato | https://unsplash.com/photos/black-and-silver-office-rolling-chair-beside-mirror-gI9rvJK61L8 |

Båda bilderna visar tomma lokaler (inga personer i fokus, inga igenkännbara ansikten).
`cta-barberia.webp` har en riktig `alt` (`sitio.cta.fondoAlt`, es-CL/sv-SE) eftersom bilden
syns stort och ensam i CTA-bandet; `bento-salon.webp` är rent dekorativ (`alt=""`) eftersom
den delar rutan med en egen rubrik/text som redan bär informationen.
