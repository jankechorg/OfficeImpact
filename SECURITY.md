# Security notes

This site has a deliberately small attack surface: it is a static GitHub Pages site with no backend, database, user accounts or runtime secrets.

## Accounts and permissions

- Keep the repository dedicated to Office Impact.
- Restrict the Pages CMS GitHub App to this repository only.
- Use individual Pages CMS collaborator accounts; do not share passwords.
- Require 2FA or passkeys for GitHub owners and administrators.
- Remove editor access promptly when someone leaves the organisation.
- Keep at least two trusted technical administrators for recovery.

## Publishing model

A Pages CMS save writes to `main`, which makes it a publishing credential. Only invite people who should be able to update the public website.

Git history provides rollback, but it does not provide approval before publishing. If the organisation later needs an editorial approval workflow, move CMS changes to a review branch / pull-request workflow or use a CMS with draft/publish roles.

## Public data warning

Everything committed to this public repository should be treated as public, including records with `published: false`.

Do not store:

- private or embargoed drafts;
- private email addresses or phone numbers;
- internal notes;
- private meeting or event links;
- credentials, tokens or API keys;
- confidential documents.

## Content sanitisation

Article and event bodies are edited as rich text. Before rendering, `app.js` parses the HTML and keeps only a limited set of formatting elements. Scripts, embeds, forms, SVG and other active content are discarded, and attributes are removed except for validated links.

This is defence in depth in addition to the site's Content Security Policy.

## URLs

External links stored in CMS fields are rendered only if they use HTTPS. Invalid or non-HTTPS URLs are ignored by the frontend.

## Content Security Policy

`index.html` uses a restrictive CSP:

- scripts only from the same origin;
- images only from the same origin or data URLs;
- network requests only to the same origin;
- no frames, plugins, media or web workers;
- no forms;
- no base URL override.

Inline CSS is allowed because the subtle pointer-tilt effect updates CSS custom properties dynamically. Inline JavaScript remains prohibited.

## GitHub Pages and domain

When a custom domain is connected:

- verify the domain in the owning GitHub organisation/account;
- enable `Enforce HTTPS`;
- avoid wildcard DNS records unless they are genuinely required;
- remove stale DNS records when changing hosting providers.

## Images and privacy

Use approved images. Phone photos can contain EXIF metadata, including device information and sometimes location. Remove unnecessary metadata before publishing sensitive images.

## Incident recovery

If incorrect or malicious content is published:

1. revoke the compromised Pages CMS / GitHub access;
2. revert the offending Git commit;
3. verify Pages has redeployed the reverted version;
4. review recent Git commits and Pages CMS collaborators;
5. rotate any credentials if a secret was accidentally committed.

If a secret was committed to a public repository, reverting the commit alone is not enough. Revoke/rotate the secret immediately because Git history may still expose it.
