# Office Impact - unified Entries migration

This update replaces the separate Posts + Events content model with one `Entries` model.

## New production files

Replace/upload:

- `app.js`
- `styles.css`
- `.pages.yml`
- `content/entries.json`

Keep your current `content/people.json` and all media files.

## Important: preserve the exact current live content

The bundled `content/entries.json` is built from the latest content available in the working version plus the current workplace-stress webinar known from the site screenshots. The execution environment could not read the GitHub repository/raw JSON directly, so it cannot know filenames/fields that you changed manually in GitHub after that working version (especially the webinar image path).

For an exact migration of the current repository:

1. Before deleting `content/posts.json` or `content/events.json`, upload these temporary files to the repository root:
   - `migrate-content.html`
   - `migrate-content.js`
2. Wait for GitHub Pages to deploy.
3. Open `/OfficeImpact/migrate-content.html` on the live GitHub Pages site.
4. Click **Generate entries.json**.
5. Download the generated `entries.json`.
6. Upload it as `content/entries.json`, replacing the bundled version.
7. Upload the new `app.js`, `styles.css`, and `.pages.yml`.
8. Verify Calendar, Stories and People.
9. Delete `migrate-content.html`, `migrate-content.js`, `content/posts.json` and `content/events.json`.

The migration helper preserves current legacy post image paths, event fields, source links, map/address fields and booleans. It also merges the known Office Impact Summit event + recap post into one unified Entry.

## New Entry logic

- `show_in_calendar` controls Calendar visibility.
- `show_in_posts` controls Stories / Highlights visibility.
- `featured_post` controls featured Story treatment.
- `calendar_title` and `post_title` are independent, with `title` as fallback.
- Future/current events show venue, exact address, venue image, Google map and registration link when available.
- Past events hide map/address/venue image and instead show `event_image`, falling back to `post_image`.
- Posts and events can have separate summaries and full text while staying one content record.

## Media

Recommended folders remain:

- `media/stories/` - post images
- `media/events/` - venue and event photos
- `media/people/` - profile photos
- `media/brand/` - brand assets
