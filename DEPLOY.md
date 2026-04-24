# Deploy naar Netlify + toevoegen aan iPhone home screen

## 1 · Site uploaden naar Netlify (sleep-en-droppen)

1. Ga naar **https://app.netlify.com/drop**
2. Sleep de hele map `C:\PreBilt\prebilt_demo_v2` in het grijze vak
   (of ZIP de map eerst, sleep de ZIP)
3. Netlify bouwt en geeft je een URL zoals `https://brave-elephant-a1b2c3.netlify.app`
4. Klik **Site settings** → **Change site name** en maak er bijv.
   `prebilt-quinaptis-demo` van  →  `https://prebilt-quinaptis-demo.netlify.app`

Klaar. De site is publiek bereikbaar.

## 2 · App-icoon op iPhone home screen

1. Open de Netlify-URL in **Safari** (niet Chrome — Safari is vereist op iOS)
2. Tik op het **deel-icoon** onderaan (vierkant met pijltje omhoog)
3. Scrol naar beneden → **"Zet op beginscherm"** / **"Add to Home Screen"**
4. Je ziet de voorvertoning: **navy vierkant met gouden Quinaptis-Q** +
   titel **"PreBilt"**
5. Tik **"Voeg toe"** / **"Add"**
6. Het icoon verschijnt op je home screen. Tik erop → de demo opent **fullscreen**,
   zonder Safari-adresbalk (dankzij `apple-mobile-web-app-capable`)

## 3 · Wat zit er in de deploy

```
prebilt_demo_v2/
  index.html              ← de site
  style.css
  app.js
  manifest.json           ← PWA-manifest (Android / Chrome install)
  netlify.toml            ← caching headers
  assets/
    quinaptis-logo.png    ← volledige logo (in header)
    icon-180.png          ← apple-touch-icon (iPhone/iPad home screen)
    icon-192.png          ← PWA middel
    icon-512.png          ← PWA splash / install
    icon-32.png           ← favicon desktop
    icon-16.png           ← favicon klein
  _build_icons.py         ← script om iconen opnieuw te genereren
```

Bestanden die beginnen met `_` (zoals `_build_icons.py`, `_q_source.png`) mogen
in de Netlify-deploy blijven staan — ze doen geen kwaad maar je mag ze ook
weghalen voor een schonere deploy.

## 4 · Toekomstige updates

Als je iets verandert aan de site:
- **Netlify drop**: sleep gewoon opnieuw de map — hij overschrijft de oude versie
- **Netlify dashboard**: je kunt ook deploys via Git koppelen voor auto-updates

## 5 · Op iPhone: home-screen icoon updaten

iOS cachet de app-icons agressief. Als je het icoon wijzigt:
1. Verwijder het bestaande icoon van je home screen (houd vast → X)
2. Safari: **Instellingen → Safari → Wis geschiedenis en websitedata**
3. Voeg opnieuw toe via "Zet op beginscherm"
