# Gireesh — Cinematic Portfolio

A scroll-driven designer portfolio told as one continuous film:

1. **Opening** — three-card layout; click the centre card to open the reel.
2. **Reel** — the showreel expands to full screen; work cards orbit anticlockwise (drag to spin).
3. **Design universe** — a perspective tunnel, a glass crystal, and robot and human hands drawn from halftone dots.
4. **Explosion** — the particles re-form into the designer's portrait.
5. **Capabilities** — skills ride real glass shards toward the screen.
6. **Camera** — a camera is lit from darkness, its REC light triggers a red projector beam.
7. **Studio** — contact page with live clock, dot-matrix monogram, rotating work ring and profile card.

## Run locally

Any static server works:

```bash
python -m http.server 8765
```

Then open http://localhost:8765. Opening `index.html` directly also works (an internet connection is needed for fonts and the animation libraries).

## Edit your details

Name, role, email, handle, X link, wordmark and monogram live in the `CONFIG` block at the top of `js/main.js`.

## Stack

Plain HTML/CSS/JS · [GSAP](https://gsap.com) · [Lenis](https://lenis.darkroom.engineering) · [three.js](https://threejs.org) (loaded from CDNs, no build step).
