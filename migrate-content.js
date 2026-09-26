const $ = (selector) => document.querySelector(selector);

function clean(value) {
  return String(value || "").trim();
}

function postToEntry(post) {
  return {
    id: clean(post.slug),
    title: clean(post.title),
    calendar_title: clean(post.calendar_title),
    post_title: clean(post.title),
    publication_date: clean(post.date),
    show_in_calendar: Boolean(clean(post.event_date)),
    show_in_posts: true,
    featured_post: post.featured === true || post.featured === "true" || post.featured === 1 || post.featured === "1",
    category: clean(post.category),
    post_summary: clean(post.excerpt),
    post_body: clean(post.body),
    post_image: clean(post.image),
    post_image_alt: clean(post.image_alt),
    source: clean(post.source),
    source_url: clean(post.source_url),
    event_date: clean(post.event_date),
    event_time: clean(post.event_time),
    event_type: clean(post.event_type),
    event_summary: clean(post.event_summary),
    event_details: clean(post.event_details),
    event_location: clean(post.event_location),
    address: clean(post.address),
    map_query: clean(post.map_query),
    venue_image: clean(post.venue_image),
    event_image: clean(post.event_image),
    event_image_alt: clean(post.event_image_alt),
    registration_url: clean(post.registration_url),
    published: post.published !== false && post.published !== "false" && post.published !== 0 && post.published !== "0",
  };
}

function eventToEntry(event) {
  return {
    id: clean(event.id),
    title: clean(event.title),
    calendar_title: clean(event.title),
    post_title: "",
    publication_date: "",
    show_in_calendar: true,
    show_in_posts: false,
    featured_post: false,
    category: "",
    post_summary: "",
    post_body: "",
    post_image: "",
    post_image_alt: "",
    source: "",
    source_url: "",
    event_date: clean(event.date),
    event_time: clean(event.time),
    event_type: clean(event.type),
    event_summary: clean(event.summary),
    event_details: clean(event.body),
    event_location: clean(event.location),
    address: clean(event.address),
    map_query: clean(event.map_query),
    venue_image: clean(event.venue_image),
    event_image: clean(event.event_image),
    event_image_alt: clean(event.event_image_alt),
    registration_url: clean(event.registration_url),
    published: event.published !== false && event.published !== "false" && event.published !== 0 && event.published !== "0",
  };
}

function mergeKnownPairs(posts, events) {
  const postMap = new Map(posts.map((post) => [clean(post.slug), postToEntry(post)]));
  const eventMap = new Map(events.map((event) => [clean(event.id), eventToEntry(event)]));
  const result = [];

  const recap = postMap.get("first-summit-community");
  const summit = eventMap.get("office-impact-summit-2026");
  if (recap && summit) {
    result.push({
      ...summit,
      title: summit.title,
      post_title: recap.post_title,
      publication_date: recap.publication_date,
      show_in_posts: true,
      featured_post: recap.featured_post,
      category: recap.category,
      post_summary: recap.post_summary,
      post_body: recap.post_body,
      post_image: recap.post_image,
      post_image_alt: recap.post_image_alt,
      source: recap.source,
      source_url: recap.source_url,
      address: summit.address || "Danzigerbocht 55, 1013 AM Amsterdam, Netherlands",
    });
    postMap.delete("first-summit-community");
    eventMap.delete("office-impact-summit-2026");
  }

  result.push(...postMap.values(), ...eventMap.values());
  result.sort((a, b) => {
    const aDate = a.publication_date || a.event_date || "";
    const bDate = b.publication_date || b.event_date || "";
    return bDate.localeCompare(aDate);
  });
  return result;
}

async function generate() {
  const status = $("#status");
  status.textContent = "Reading current posts.json and events.json...";

  try {
    const [postsResponse, eventsResponse] = await Promise.all([
      fetch("./content/posts.json", { cache: "no-store" }),
      fetch("./content/events.json", { cache: "no-store" }),
    ]);

    if (!postsResponse.ok) throw new Error(`posts.json: ${postsResponse.status}`);
    if (!eventsResponse.ok) throw new Error(`events.json: ${eventsResponse.status}`);

    const posts = await postsResponse.json();
    const events = await eventsResponse.json();
    const entries = mergeKnownPairs(Array.isArray(posts) ? posts : [], Array.isArray(events) ? events : []);
    const json = JSON.stringify(entries, null, 2) + "\n";

    $("#output").value = json;
    $("#download").disabled = false;
    $("#copy").disabled = false;
    status.textContent = `Generated ${entries.length} entries from ${posts.length} posts and ${events.length} events.`;

    window.generatedEntriesJson = json;
  } catch (error) {
    console.error(error);
    status.textContent = `Could not generate entries.json: ${error.message}`;
  }
}

function download() {
  const json = window.generatedEntriesJson;
  if (!json) return;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "entries.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyOutput() {
  const value = $("#output").value;
  if (!value) return;
  await navigator.clipboard.writeText(value);
  $("#status").textContent = "Copied entries.json to clipboard.";
}

$("#generate").addEventListener("click", generate);
$("#download").addEventListener("click", download);
$("#copy").addEventListener("click", copyOutput);
