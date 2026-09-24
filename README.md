# Office Impact Community website

Static, CMS-editable website for Office Impact Community.

## Architecture

- Static HTML/CSS/JavaScript only - no server, database, Node, Bun or build step.
- GitHub Pages hosts the site.
- Pages CMS edits `content/posts.json`, `content/events.json`, `content/people.json` and images in `media/`.
- Every Pages CMS save creates a Git commit. GitHub Pages republishes the repository automatically.

## Repository structure

```text
.
|-- .pages.yml
|-- .nojekyll
|-- index.html
|-- styles.css
|-- app.js
|-- content/
|   |-- posts.json
|   |-- events.json
|   `-- people.json
|-- media/
|   |-- office-impact-logo.jpg
|   `-- office-impact-hero.jpg
|-- README.md
`-- SECURITY.md
```

## GitHub Pages setup

1. Create a new public GitHub repository dedicated to Office Impact.
2. Upload all files from this package to the repository root.
3. In GitHub, open `Settings -> Pages`.
4. Select `Deploy from a branch`.
5. Choose `main` and `/ (root)`.
6. Save. No GitHub Actions workflow is needed for this static site.
7. When a custom domain is ready, add it in `Settings -> Pages` and enable `Enforce HTTPS` after the certificate is issued.

This repository is intentionally simpler than the previous Lovable/Vite deployment. There is no package manager and therefore no JavaScript dependency supply chain for the public site.

## Pages CMS setup

1. Sign in to Pages CMS with the technical GitHub account.
2. Install the Pages CMS GitHub App for this repository only.
3. Open the repository and select `main`.
4. Pages CMS reads `.pages.yml` automatically.
5. Invite the nonprofit's content editors as Pages CMS collaborators by email.

Editors will see:

- Posts
- Events
- People
- Media uploads

They do not need to edit HTML, CSS or JavaScript.

## Calendar and events

The calendar shows the current month plus the next five months. It only shows upcoming events. The arrows browse future six-month windows; the back arrow never goes earlier than the current month.

Below the calendar, visitors can switch between:

- Upcoming events
- Past events

Clicking an event opens its full details.

## Motion and interaction

The site includes deliberately subtle motion:

- a short Office Impact logo transition when navigating between main sections;
- light 3D pointer tilt on selected cards on desktop;
- scroll-based reveal/staggering;
- a very small hero-image parallax effect;
- a compact sticky-header shadow while scrolling.

All motion is disabled or reduced automatically when the visitor has `prefers-reduced-motion` enabled. Pointer tilt is only enabled on devices with a precise mouse/trackpad pointer.

## Security changes included

- Strict Content Security Policy in `index.html`.
- External CMS URLs are accepted only when they use HTTPS.
- CMS rich HTML is sanitised before it is inserted into a dialog.
- Raw HTML/source switching is disabled in Pages CMS rich-text fields.
- Profile images are restricted to local repository media; remote image URLs are rejected by the frontend.
- External links use `noopener noreferrer`.
- No credentials or API keys are required in the frontend.
- No third-party JavaScript libraries or CDNs are loaded.
- `.nojekyll` keeps GitHub Pages deployment predictable.

See `SECURITY.md` for operational recommendations and limitations.

## Important: hidden content is not private

The repository is public and JSON files are directly downloadable. Setting `published: false` only hides an item from the website UI.

Never store confidential drafts, private contact details, private event links, internal notes or other sensitive information in this repository.

## Local preview

Do not open `index.html` directly from the filesystem because the browser may block JSON loading.

From the repository folder run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Content ownership

Before publishing a person's photo, bio or profile information, make sure the organisation has permission to publish it. Prefer approved profile photos and remove unnecessary metadata from uploaded images.
