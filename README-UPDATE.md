Office Impact update: story thumbnails + posts in calendar

Files to replace at repository root:
- app.js
- styles.css
- .pages.yml

1. Thumbnail support
Non-featured stories with an image render a 16:9 thumbnail on the homepage.
Featured first story keeps the large feature-image layout.
Story detail keeps the full-image contain behavior.

If the homepage still looks unchanged after replacing app.js and styles.css, the browser may be using cached static files. In index.html you can temporarily/version the references as:

<link rel="stylesheet" href="./styles.css?v=20260926-2">
<script src="./app.js?v=20260926-2" defer></script>

2. Post/event calendar integration
Posts now have optional Pages CMS fields:
- event_date
- event_time
- event_location
- event_type

If event_date is set, the post automatically appears in:
- the six-month calendar
- Upcoming/Past event list

Clicking that calendar/list item opens the post detail rather than duplicating the content in events.json.

Example post fields:

"event_date": "2026-10-22",
"event_time": "15:00-16:00 CET",
"event_location": "Online",
"event_type": "Webinar"

Leave event_date blank for normal posts; they stay out of the calendar.
