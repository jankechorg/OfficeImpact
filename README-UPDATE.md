# Office Impact story-image update

Replace `app.js` and `styles.css` in the repository root.

Replace `.pages.yml` only if you want the complete current CMS configuration included here. It contains:
- story image + image alt text
- event address + venue image + map override
- media subfolder defaults for stories, events and people

The `media/*/.gitkeep` files simply create the optional subfolders in Git. Existing images can remain where they are; no migration is required.

## Behaviour
- Published posts are ordered with featured posts first, then newest date.
- The newest featured post is the large first homepage highlight.
- Its image is shown on the homepage when supplied.
- Any post image is shown in the story detail popup.
- Existing posts without images continue to work.
- A missing/broken story image is removed gracefully.
