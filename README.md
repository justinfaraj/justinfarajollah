# justinfarajollah.com

Hand-written static site: `index.html`, `contact.html`, `404.html`, `styles.css`, `script.js`. No build step.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Clean URLs like `/contact` only resolve on GitHub Pages, so locally use `/contact.html`.

## Deploy

Hosted on GitHub Pages with the custom domain in `CNAME`. Merging to `main` publishes the site.
