# lemmensdaan.github.io

Personal CV site: plain HTML, CSS and JS, no build step.

- Run locally: `npx serve` (or `python -m http.server 8000`) in this folder.
- CV: edit `cv.html`, then re-render `Daan-Lemmens-CV.pdf` (Edge/Chrome "print to PDF", A4, no headers,
  background graphics on - the navy sidebar is a printed background).
- The "Download CV" buttons stay a joke until every achievement is unlocked; the Completionist tile
  swaps them for a real link to `Daan-Lemmens-CV.pdf`, so the draft can still be reviewed.
- Contact and feedback forms post to [FormSubmit](https://formsubmit.co) and arrive by email.
- Favicons and the `og:image` share card are generated: `python tools/make-icons.py` (needs Pillow).
- SWN Builder media lives in `img/swn/`: `-thumb` files are the grid thumbnails, and `orbit.mp4`
  is the flythrough clip (the viewer plays any `.mp4`/`.webm` listed as a tile's `data-src`).
- Plain mode: the "Plain CV" button in the header drops the starfield, astronaut, achievements and
  animation, leaving the content. It sets `html.plain` and remembers the choice in `localStorage`
  (`dl-plain`), read back by the inline script in `<head>` so there is no flash on a return visit.
- SWN Builder's first tile plays `img/swn/demo.gif` (the 30s walkthrough). Drop the gif in under that
  name and it works; until then the tile removes itself the first time it is opened. The strip shows a
  normal webp thumbnail for it, so the gif only downloads when someone clicks.
- `404.html` is served by GitHub Pages for any unknown path, so its links and assets use absolute
  paths (`/css/style.css`, `/`). It carries its own trimmed starfield rather than loading `main.js`, and writes the "Off the map"
  achievement straight into the shared `dl-achievements` localStorage key.
- The telemetry line under the astronaut reads two public, key-less feeds: NOAA SWPC
  (`/products/summary/solar-wind-speed.json` and `/products/noaa-planetary-k-index.json`) and
  `api.wheretheiss.at`; no key or proxy is involved. A feed that never answers says "could not
  connect" in its own line rather than disappearing; the station one in particular drops calls.
  A single missed refresh keeps the last reading (3 in a row for the ISS, 2 for solar wind).
