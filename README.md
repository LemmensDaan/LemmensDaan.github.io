# lemmensdaan.github.io

Personal CV site: plain HTML, CSS and JS, no build step.

- Run locally: `npx serve` (or `python -m http.server 8000`) in this folder.
- CV: edit `cv.html`, then re-render `Daan-Lemmens-CV.pdf` (Edge/Chrome "print to PDF", A4, no headers).
- Contact and feedback forms post to [FormSubmit](https://formsubmit.co) and arrive by email.
- Favicons and the `og:image` share card are generated: `python tools/make-icons.py` (needs Pillow).
- SWN Builder media lives in `img/swn/`: `-thumb` files are the grid thumbnails, and `orbit.mp4`
  is the flythrough clip (the viewer plays any `.mp4`/`.webm` listed as a tile's `data-src`).
