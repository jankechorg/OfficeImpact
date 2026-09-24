const state = {
  posts: [],
  events: [],
  people: [],
  calendarDate: null,
  eventView: "upcoming",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const siteBase = new URL("./", window.location.href);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
let revealObserver = null;

function parseDate(value) {
  return new Date(`${value}T12:00:00`);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function startOfMonth(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfMonth(date) {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addMonths(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat("en-GB", {
    day: options.day || "numeric",
    month: options.month || "long",
    year: options.year || "numeric",
  }).format(parseDate(value));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function safeExternalUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function safeRichLinkUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("#")) return raw;

  try {
    const url = new URL(raw, window.location.href);
    if (url.origin === window.location.origin) return url.href;
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function sanitizeRichText(value = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${String(value || "")}</body>`, "text/html");
  const root = doc.body;
  const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "H3", "H4", "BLOCKQUOTE", "A"]);
  const dropWithContent = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "FORM", "INPUT", "TEXTAREA", "BUTTON"]);

  $$('*', root).forEach((element) => {
    const tag = element.tagName;

    if (dropWithContent.has(tag)) {
      element.remove();
      return;
    }

    if (!allowedTags.has(tag)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    const originalHref = tag === "A" ? element.getAttribute("href") || "" : "";
    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));

    if (tag === "A") {
      const href = safeRichLinkUrl(originalHref);
      if (href) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
  });

  return root.innerHTML;
}

function assetUrl(value) {
  const raw = typeof value === "string"
    ? value.trim()
    : String(value?.src || value?.url || value?.path || "").trim();

  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return "";
  if (raw.includes("..")) return "";

  let normalized = raw.replace(/^\.\//, "").replace(/^\//, "");
  normalized = normalized.replace(/^public\/office-impact\//, "");
  normalized = normalized.replace(/^examples\/office-impact\//, "");
  normalized = normalized.replace(/^office-impact\//, "");
  normalized = normalized.replace(/^public\//, "");

  if (!normalized.startsWith("media/")) {
    normalized = `media/${normalized.replace(/^media\//, "")}`;
  }

  try {
    return new URL(normalized, siteBase).href;
  } catch {
    return "";
  }
}

async function loadJson(path) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function init() {
  try {
    const [posts, events, people] = await Promise.all([
      loadJson("./content/posts.json"),
      loadJson("./content/events.json"),
      loadJson("./content/people.json"),
    ]);

    state.posts = posts
      .filter((item) => item.published !== false)
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));

    state.events = events
      .filter((item) => item.published !== false)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    state.people = people.filter((item) => item.published !== false);
    state.calendarDate = startOfMonth(startOfToday());

    renderCalendar();
    renderEvents();
    renderStories();
    renderPeople();
    setupMotion();
  } catch (error) {
    console.error(error);
    showLoadErrors();
  }
}

function showLoadErrors() {
  const message = `<div class="error-box"><strong>Content could not be loaded.</strong><br>Please refresh the page or try again shortly.</div>`;
  $("#calendarGrid").innerHTML = message;
  $("#eventList").innerHTML = message;
  $("#storyGrid").innerHTML = message;
  $("#peopleGrid").innerHTML = message;
}

function renderCalendar() {
  const today = startOfToday();
  const currentMonth = startOfMonth(today);
  const firstMonth = startOfMonth(state.calendarDate || currentMonth);
  const months = Array.from({ length: 6 }, (_, index) => addMonths(firstMonth, index));
  const lastMonth = months[months.length - 1];

  const firstLabel = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(firstMonth);
  const lastLabel = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(lastMonth);
  const rangeLabel = firstMonth.getFullYear() === lastMonth.getFullYear()
    ? `${firstLabel} - ${lastLabel} ${lastMonth.getFullYear()}`
    : `${firstLabel} ${firstMonth.getFullYear()} - ${lastLabel} ${lastMonth.getFullYear()}`;

  $("#calendarLabel").textContent = rangeLabel;

  const prev = $("#calendarPrev");
  const next = $("#calendarNext");
  const atCurrentWindow = firstMonth <= currentMonth;
  prev.disabled = atCurrentWindow;
  prev.setAttribute("aria-label", "Previous six months");
  next.setAttribute("aria-label", "Next six months");
  prev.title = "Previous six months";
  next.title = "Next six months";

  const futureEvents = state.events.filter((event) => parseDate(event.date) >= today);

  const tiles = months.map((monthDate, index) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(monthStart).toUpperCase();
    const monthLong = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(monthStart);
    const monthEvents = futureEvents.filter((event) => {
      const eventDate = parseDate(event.date);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });

    const ids = monthEvents.map((event) => event.id).join("|");
    const count = monthEvents.length;
    const countText = count ? `${count} event${count === 1 ? "" : "s"}` : "No events";
    const dateText = count
      ? monthEvents.slice(0, 3).map((event) => parseDate(event.date).getDate()).join(" · ") + (count > 3 ? ` +${count - 3}` : "")
      : "-";
    const delayClass = `reveal-delay-${(index % 4) + 1}`;

    if (count) {
      return `
        <button class="month-tile tilt-card reveal ${delayClass} has-events" type="button" data-month-events="${escapeHtml(ids)}" data-month-name="${escapeHtml(monthLong)}" aria-label="${escapeHtml(monthLong)} ${monthStart.getFullYear()}, ${escapeHtml(countText)}">
          <span class="month-tile__name">${escapeHtml(monthShort)}</span>
          <span class="month-tile__count">${escapeHtml(countText)}</span>
          <span class="month-tile__days">${escapeHtml(dateText)}</span>
        </button>`;
    }

    return `
      <div class="month-tile reveal ${delayClass}" aria-label="${escapeHtml(monthLong)} ${monthStart.getFullYear()}, no events">
        <span class="month-tile__name">${escapeHtml(monthShort)}</span>
        <span class="month-tile__count">No events</span>
        <span class="month-tile__days">-</span>
      </div>`;
  }).join("");

  $("#calendarGrid").innerHTML = `<div class="month-overview" aria-label="Six month event overview">${tiles}</div>`;

  $$("[data-month-events]", $("#calendarGrid")).forEach((button) => {
    button.addEventListener("click", () => {
      const ids = (button.dataset.monthEvents || "").split("|").filter(Boolean);
      if (ids.length === 1) openEvent(ids[0]);
      else if (ids.length > 1) openEventChoices(ids, `in ${button.dataset.monthName}`);
    });
  });

  registerDynamicMotion($("#calendarGrid"));
}

function renderEvents() {
  const container = $("#eventList");
  const heading = $("#eventListHeading");
  const today = startOfToday();

  const upcoming = state.events
    .filter((event) => parseDate(event.date) >= today)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  const past = state.events
    .filter((event) => parseDate(event.date) < today)
    .sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const showingPast = state.eventView === "past";
  const visibleEvents = showingPast ? past : upcoming;

  heading.innerHTML = `
    <div class="event-view-toggle" role="group" aria-label="Choose events to display">
      <button class="event-view-toggle__button${!showingPast ? " is-active" : ""}" type="button" data-event-view="upcoming" aria-pressed="${String(!showingPast)}">Upcoming</button>
      <button class="event-view-toggle__button${showingPast ? " is-active" : ""}" type="button" data-event-view="past" aria-pressed="${String(showingPast)}">Past</button>
    </div>
    <span class="event-view-count">${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"}</span>`;

  $$('[data-event-view]', heading).forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.dataset.eventView;
      if (!nextView || nextView === state.eventView) return;
      state.eventView = nextView;
      renderEvents();
    });
  });

  if (!visibleEvents.length) {
    container.innerHTML = `
      <div class="event-item event-item--empty reveal">
        <div class="event-info">
          <h3>${showingPast ? "No past events yet" : "No upcoming events yet"}</h3>
          <p>${showingPast ? "Previous gatherings will appear here." : "New events will be announced here."}</p>
        </div>
      </div>`;
    registerDynamicMotion(container);
    return;
  }

  container.innerHTML = visibleEvents.map((event, index) => {
    const date = parseDate(event.date);
    const day = date.getDate();
    const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
    const year = date.getFullYear();
    const metaParts = [event.time, event.location].filter(Boolean);
    if (showingPast || year !== today.getFullYear()) metaParts.unshift(String(year));
    const delayClass = `reveal-delay-${(index % 4) + 1}`;

    return `
      <article class="event-item event-item--clickable reveal ${delayClass}" data-event="${escapeHtml(event.id)}" role="button" tabindex="0" aria-label="Open ${escapeHtml(event.title)}">
        <div class="event-date"><strong>${day}</strong><span>${escapeHtml(month)}</span></div>
        <div class="event-info">
          <h3>${escapeHtml(event.title)}</h3>
          <p>${escapeHtml(metaParts.join(" · "))}</p>
        </div>
        <span class="event-open" aria-hidden="true">&nearr;</span>
      </article>`;
  }).join("");

  $$('[data-event]', container).forEach((item) => {
    const open = () => openEvent(item.dataset.event);
    item.addEventListener("click", open);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });

  registerDynamicMotion(container);
}

function renderStories() {
  const container = $("#storyGrid");
  if (!state.posts.length) {
    container.innerHTML = `<div class="error-box">No published stories yet.</div>`;
    return;
  }

  container.innerHTML = state.posts.slice(0, 6).map((post, index) => `
    <article class="story-card tilt-card reveal reveal-delay-${(index % 4) + 1}">
      <div class="story-card__meta"><span>${escapeHtml(post.category || "Update")}</span><span>${escapeHtml(formatDate(post.date, { day: "2-digit", month: "short", year: "numeric" }))}</span></div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.excerpt || "")}</p>
      <div class="story-card__footer">
        <span>${post.source === "LinkedIn" ? "LinkedIn highlight" : "Community story"}</span>
        <button type="button" data-post="${escapeHtml(post.slug)}">Read &rarr;</button>
      </div>
    </article>`).join("");

  $$('[data-post]', container).forEach((button) => {
    button.addEventListener("click", () => openPost(button.dataset.post));
  });

  registerDynamicMotion(container);
}

function renderPeople() {
  const container = $("#peopleGrid");
  if (!state.people.length) {
    container.innerHTML = `<div class="error-box">No people added yet.</div>`;
    return;
  }

  container.innerHTML = state.people.map((person, index) => {
    const image = assetUrl(person.image);
    const linkedin = safeExternalUrl(person.linkedin_url);
    return `
      <article class="person-card person-card--interactive tilt-card reveal reveal-delay-${(index % 4) + 1}" data-person-index="${index}" role="button" tabindex="0" aria-label="Open profile for ${escapeHtml(person.name)}">
        <div class="person-avatar">
          <span>${escapeHtml(initials(person.name))}</span>
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(person.name)}" loading="lazy">` : ""}
        </div>
        <div class="person-copy">
          <h3>${escapeHtml(person.name)}</h3>
          <div class="role">${escapeHtml([person.role, person.organization].filter(Boolean).join(" · "))}</div>
          <p>${escapeHtml(person.bio || "")}</p>
          <div class="person-actions">
            <span class="profile-link">View profile &rarr;</span>
            ${linkedin ? `<a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn &nearr;</a>` : ""}
          </div>
        </div>
      </article>`;
  }).join("");

  $$(".person-avatar img", container).forEach((img) => {
    img.addEventListener("error", () => img.remove());
  });

  $$('[data-person-index]', container).forEach((card) => {
    const open = () => openPerson(Number(card.dataset.personIndex));
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      open();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });

  registerDynamicMotion(container);
}

function openEventChoices(ids, contextLabel = "this period") {
  const events = ids
    .map((id) => state.events.find((event) => event.id === id))
    .filter(Boolean)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  if (!events.length) return;
  if (events.length === 1) {
    openEvent(events[0].id);
    return;
  }

  openDialog(`
    <div class="dialog-body">
      <span class="section-kicker">Events</span>
      <h2>${events.length} events ${escapeHtml(contextLabel)}</h2>
      <div class="dialog-event-list">
        ${events.map((event) => `
          <button class="dialog-event-choice" type="button" data-dialog-event="${escapeHtml(event.id)}">
            <span>${escapeHtml(formatDate(event.date, { day: "2-digit", month: "short", year: "numeric" }))}</span>
            <strong>${escapeHtml(event.title)}</strong>
            <small>${escapeHtml([event.time, event.location].filter(Boolean).join(" · "))}</small>
          </button>`).join("")}
      </div>
    </div>`);

  $$('[data-dialog-event]', $("#dialogContent")).forEach((button) => {
    button.addEventListener("click", () => openEvent(button.dataset.dialogEvent));
  });
}

function openPerson(index) {
  const person = state.people[index];
  if (!person) return;

  const image = assetUrl(person.image);
  const role = [person.role, person.organization].filter(Boolean).join(" · ");
  const linkedin = safeExternalUrl(person.linkedin_url);

  openDialog(`
    <div class="dialog-body person-dialog">
      <div class="person-dialog__header">
        <div class="person-dialog__avatar">
          <span>${escapeHtml(initials(person.name))}</span>
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(person.name)}">` : ""}
        </div>
        <div>
          <span class="section-kicker">Community profile</span>
          <h2>${escapeHtml(person.name)}</h2>
          ${role ? `<div class="dialog-meta"><span>${escapeHtml(role)}</span></div>` : ""}
        </div>
      </div>
      <div class="dialog-copy">${person.bio ? `<p>${escapeHtml(person.bio)}</p>` : "<p>Profile details will be added soon.</p>"}</div>
      ${linkedin ? `<a class="dialog-source" href="${escapeHtml(linkedin)}" target="_blank" rel="noopener noreferrer">View LinkedIn profile &nearr;</a>` : ""}
    </div>`);

  const imageElement = $(".person-dialog__avatar img", $("#dialogContent"));
  if (imageElement) imageElement.addEventListener("error", () => imageElement.remove());
}

function openPost(slug) {
  const post = state.posts.find((item) => item.slug === slug);
  if (!post) return;

  const sourceUrl = safeExternalUrl(post.source_url);
  const body = post.body
    ? sanitizeRichText(post.body)
    : `<p>${escapeHtml(post.excerpt || "")}</p>`;

  openDialog(`
    <div class="dialog-body">
      <span class="section-kicker">${escapeHtml(post.category || "Story")}</span>
      <h2>${escapeHtml(post.title)}</h2>
      <div class="dialog-meta"><span>${escapeHtml(formatDate(post.date))}</span>${post.source ? `<span>· ${escapeHtml(post.source)}</span>` : ""}</div>
      <div class="dialog-copy">${body}</div>
      ${sourceUrl ? `<a class="dialog-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">View original ${escapeHtml(post.source || "source")} &nearr;</a>` : ""}
    </div>`);
}

function openEvent(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;

  const registrationUrl = safeExternalUrl(event.registration_url);
  const body = event.body
    ? sanitizeRichText(event.body)
    : `<p>${escapeHtml(event.summary || "")}</p>`;
  const meta = [event.time, event.location].filter(Boolean).join(" · ");

  openDialog(`
    <div class="dialog-body">
      <span class="section-kicker">${escapeHtml(event.type || "Community event")}</span>
      <h2>${escapeHtml(event.title)}</h2>
      <div class="dialog-meta"><span>${escapeHtml(formatDate(event.date))}</span>${meta ? `<span>· ${escapeHtml(meta)}</span>` : ""}</div>
      <div class="dialog-copy">${body}</div>
      ${registrationUrl ? `<a class="dialog-source" href="${escapeHtml(registrationUrl)}" target="_blank" rel="noopener noreferrer">Event details / registration &nearr;</a>` : ""}
    </div>`);
}

function openDialog(html) {
  const dialog = $("#contentDialog");
  $("#dialogContent").innerHTML = html;
  if (typeof dialog.showModal === "function") dialog.showModal();
}

function setupMotion() {
  setupHeaderMotion();
  setupNavigationTransition();

  if (prefersReducedMotion.matches) return;

  document.documentElement.classList.add("motion-ready");

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, {
    rootMargin: "0px 0px -7% 0px",
    threshold: 0.08,
  });

  $$(".hero-copy, .hero-photo, .manifesto-grid, .section-heading, .join-card").forEach((element, index) => {
    element.classList.add("reveal", `reveal-delay-${(index % 3) + 1}`);
  });

  registerDynamicMotion(document);
  setupHeroParallax();
}

function registerDynamicMotion(root) {
  if (!root) return;

  if (revealObserver && !prefersReducedMotion.matches) {
    $$(".reveal", root).forEach((element) => {
      if (!element.dataset.revealReady) {
        element.dataset.revealReady = "true";
        revealObserver.observe(element);
      }
    });
  }

  if (finePointer.matches && !prefersReducedMotion.matches) {
    $$(".tilt-card", root).forEach((card) => setupTiltCard(card));
  }
}

function setupTiltCard(card) {
  if (card.dataset.tiltReady) return;
  card.dataset.tiltReady = "true";

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 3.6;
    const rotateX = (0.5 - y) * 3.0;
    card.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
  });

  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  });
}

function setupHeaderMotion() {
  const header = $(".site-header");
  let ticking = false;

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  update();
}

function setupHeroParallax() {
  const image = $(".hero-photo img");
  if (!image) return;
  let ticking = false;

  const update = () => {
    const offset = Math.min(window.scrollY * 0.035, 16);
    image.style.setProperty("--hero-shift", `${offset.toFixed(1)}px`);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
}

function setupNavigationTransition() {
  const overlay = $("#navTransition");
  if (!overlay) return;

  $$(".main-nav a[href^='#'], .hero-actions a[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const selector = link.getAttribute("href");
      const target = selector ? $(selector) : null;
      if (!target) return;

      $(".site-header").classList.remove("is-open");
      $(".menu-button").setAttribute("aria-expanded", "false");

      if (prefersReducedMotion.matches) return;

      event.preventDefault();
      overlay.classList.add("is-active");
      overlay.setAttribute("aria-hidden", "false");

      window.setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", selector);
      }, 170);

      window.setTimeout(() => {
        overlay.classList.remove("is-active");
        overlay.setAttribute("aria-hidden", "true");
      }, 520);
    });
  });
}

$("#dialogClose").addEventListener("click", () => $("#contentDialog").close());
$("#contentDialog").addEventListener("click", (event) => {
  if (event.target === $("#contentDialog")) $("#contentDialog").close();
});

$("#calendarPrev").addEventListener("click", () => {
  const currentMonth = startOfMonth(startOfToday());
  const nextDate = addMonths(startOfMonth(state.calendarDate || currentMonth), -6);
  state.calendarDate = nextDate < currentMonth ? currentMonth : nextDate;
  renderCalendar();
});

$("#calendarNext").addEventListener("click", () => {
  state.calendarDate = addMonths(startOfMonth(state.calendarDate || startOfToday()), 6);
  renderCalendar();
});

$(".menu-button").addEventListener("click", () => {
  const header = $(".site-header");
  const isOpen = header.classList.toggle("is-open");
  $(".menu-button").setAttribute("aria-expanded", String(isOpen));
});

init();
