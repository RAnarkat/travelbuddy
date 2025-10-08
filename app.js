// ============================================================
// LoopMeets — Single Page App logic (Firebase + Router + SEO)
// Expanded, readable JS with comments
// ============================================================

// ---- Firebase (CDN ESM) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "AIzaSyC_lEYUVD1yP3vdde0JstOz4f3YhEbVaBk",
  authDomain: "loopmates-94b46.firebaseapp.com",
  databaseURL: "https://loopmates-94b46-default-rtdb.firebaseio.com",
  projectId: "loopmates-94b46",
  storageBucket: "loopmates-94b46.appspot.com",
  messagingSenderId: "336997321934",
  appId: "1:336997321934:web:3ffd0f1dbf6b3930e0149f"
};

// ---- Init Firebase ----
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);
const storage = getStorage(app);

// ---- DOM Refs (Pages) ----
const pages = {
  home:     document.getElementById("page-home"),
  about:    document.getElementById("page-about"),
  login:    document.getElementById("page-login"),
  register: document.getElementById("page-register"),
  all:      document.getElementById("page-all"),
  matched:  document.getElementById("page-matched"),
  my:       document.getElementById("page-my"),
  profile:  document.getElementById("page-profile"),
};

// ---- DOM Refs (Header/Nav) ----
const navSignedOut = document.getElementById("navSignedOut");
const navSignedIn  = document.getElementById("navSignedIn");
const logoutBtn    = document.getElementById("logoutBtn");

const chipPhoto = document.getElementById("chipPhoto");
const chipName  = document.getElementById("chipName");

// ---- DOM Refs (Auth Forms) ----
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn      = document.getElementById("loginBtn");

const regEmail      = document.getElementById("regEmail");
const regPassword   = document.getElementById("regPassword");
const regUsername   = document.getElementById("regUsername");
const regPhoto      = document.getElementById("regPhoto");
const regClimate    = document.getElementById("regClimate");
const regPace       = document.getElementById("regPace");
const regBudget     = document.getElementById("regBudget");
const regActivities = document.getElementById("regActivities");
const registerBtn   = document.getElementById("registerBtn");

// ---- DOM Refs (Profile) ----
const usernameInput     = document.getElementById("username");
const profilePhotoInput = document.getElementById("profilePhoto");
const userPhotoDisplay  = document.getElementById("userPhoto");
const saveProfileBtn    = document.getElementById("saveProfileBtn");

const climateInput   = document.getElementById("climate");
const paceInput      = document.getElementById("pace");
const budgetInput    = document.getElementById("budget");
const activitiesInput= document.getElementById("activities");
const savePrefsBtn   = document.getElementById("savePrefsBtn");

// ---- DOM Refs (Loops) ----
const allLoopsEl     = document.getElementById("allLoops");
const matchedLoopsEl = document.getElementById("matchedLoops");
const myLoopsEl      = document.getElementById("myLoops");

const openCreateLoop   = document.getElementById("openCreateLoop");
const createLoopForm   = document.getElementById("createLoopForm");
const submitCreateLoop = document.getElementById("submitCreateLoop");
const cancelCreateLoop = document.getElementById("cancelCreateLoop");

const loopTitle       = document.getElementById("loopTitle");
const loopCapacity    = document.getElementById("loopCapacity");
const loopLocation    = document.getElementById("loopLocation");
const loopStartAt     = document.getElementById("loopStartAt");
const loopDescription = document.getElementById("loopDescription");
const loopActivities  = document.getElementById("loopActivities");

// ---- Helpers ----
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>
       <rect width='100' height='100' fill='#e5e7eb'/>
       <circle cx='50' cy='38' r='18' fill='#cbd5e1'/>
       <rect x='20' y='62' width='60' height='26' rx='13' fill='#cbd5e1'/>
     </svg>`
  );

/** Safely sets an avatar image (fallback to default) */
function setAvatar(img, url) {
  if (!img) return;
  img.src = url || DEFAULT_AVATAR;
  img.onerror = () => (img.src = DEFAULT_AVATAR);
}

/** Show/hide navs depending on auth state */
function showNavForAuth(isAuthed) {
  if (isAuthed) {
    navSignedOut?.classList.add("hidden");
    navSignedIn?.classList.remove("hidden");
  } else {
    navSignedIn?.classList.add("hidden");
    navSignedOut?.classList.remove("hidden");
  }
}

/** Hide all pages */
function hideAllPages() {
  Object.values(pages).forEach(p => p?.classList.remove("active"));
}

// ---- Titles & Descriptions for SEO per route ----
const TITLES = {
  "#/home":    "LoopMeets — Connect. Travel. Belong.",
  "#/about":   "About LoopMeets & Roshni Anarkat • LoopMeets",
  "#/login":   "Login • LoopMeets",
  "#/register":"Create Account • LoopMeets",
  "#/all":     "All Loops • LoopMeets",
  "#/matched": "Matched Loops • LoopMeets",
  "#/my":      "My Loops • LoopMeets",
  "#/profile": "My Profile • LoopMeets",
};

const DESCRIPTIONS = {
  "#/home":    "Match with travelers who share your vibe. Create loops, join experiences, and meet your people.",
  "#/about":   "The story behind LoopMeets and founder Roshni Anarkat, plus how our matching works today and what’s next.",
  "#/login":   "Sign in to LoopMeets.",
  "#/register":"Create a LoopMeets account to find your travel loop.",
  "#/all":     "Browse all active loops on LoopMeets.",
  "#/matched": "See loops matched to your preferences.",
  "#/my":      "Loops you created or joined.",
  "#/profile": "Edit your LoopMeets profile and preferences.",
};

// Hard-coded production origin for SEO
const ORIGIN = "https://loopmeets.com";

/** Create or update a tag */
function ensureTag(selector, tagName, attrs = {}) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement(tagName);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/** Set SEO meta for a base route (ignore anchor after the base) */
function setMetaForRoute(hashRouteOnly) {
  const title = TITLES[hashRouteOnly] || "LoopMeets";
  const desc  = DESCRIPTIONS[hashRouteOnly] || DESCRIPTIONS["#/home"];

  // Pretty path mapping for canonical URLs
  const pathMap = {
    "#/home":    "/",
    "#/about":   "/about",
    "#/login":   "/login",
    "#/register":"/register",
    "#/all":     "/loops",
    "#/matched": "/matched",
    "#/my":      "/my",
    "#/profile": "/profile"
  };

  const prettyPath  = pathMap[hashRouteOnly] || "/";
  const canonicalUrl= ORIGIN + prettyPath;

  // Apply tags
  document.title = title;

  ensureTag('meta[name="description"]', 'meta', {
    name: 'description',
    content: desc
  });

  ensureTag('meta[property="og:title"]', 'meta', {
    property: 'og:title',
    content: title
  });

  ensureTag('meta[property="og:description"]', 'meta', {
    property: 'og:description',
    content: desc
  });

  ensureTag('meta[property="og:url"]', 'meta', {
    property: 'og:url',
    content: canonicalUrl
  });

  ensureTag('meta[name="twitter:title"]', 'meta', {
    name: 'twitter:title',
    content: title
  });

  ensureTag('meta[name="twitter:description"]', 'meta', {
    name: 'twitter:description',
    content: desc
  });

  ensureTag('link[rel="canonical"]', 'link', {
    rel: 'canonical',
    href: canonicalUrl
  });

  // Remove any previous structured data we added
  document.querySelectorAll('script[data-ld]').forEach(s => s.remove());

  // Structured data (Organization)
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "LoopMeets",
    "url": ORIGIN,
    "logo": ORIGIN + "/favicon.ico",
    "sameAs": []
  };

  // Structured data (Founder)
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Roshni Anarkat",
    "jobTitle": "Founder & CEO",
    "affiliation": {
      "@type": "Organization",
      "name": "LoopMeets",
      "url": ORIGIN
    },
    "url": canonicalUrl
  };

  const s1 = document.createElement('script');
  s1.type = 'application/ld+json';
  s1.dataset.ld = 'org';
  s1.textContent = JSON.stringify(orgLd);

  const s2 = document.createElement('script');
  s2.type = 'application/ld+json';
  s2.dataset.ld = 'person';
  s2.textContent = JSON.stringify(personLd);

  document.head.appendChild(s1);
  document.head.appendChild(s2);
}

/** Programmatic navigation */
function go(route) {
  if (location.hash !== route) {
    location.hash = route;
  }
  renderRoute();
}

/** Parse comma-separated activities to normalized array */
function readActivities(str) {
  return (str || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Matching score between profile prefs and loop prefs */
function scoreMatch(userPrefs, loopPrefs) {
  if (!userPrefs || !loopPrefs) return 0;

  let score = 0;

  if (userPrefs.climate && loopPrefs.climate && userPrefs.climate === loopPrefs.climate) score += 3;
  if (userPrefs.pace    && loopPrefs.pace    && userPrefs.pace    === loopPrefs.pace)    score += 3;
  if (userPrefs.budget  && loopPrefs.budget  && userPrefs.budget  === loopPrefs.budget)  score += 3;

  const ua = new Set((userPrefs.activities || []).map(a => a.toLowerCase()));
  const la = new Set((loopPrefs.activities || []).map(a => a.toLowerCase()));

  const inter = [...ua].filter(a => la.has(a)).length;
  const union = new Set([...ua, ...la]).size || 1;

  score += Math.round((inter / union) * 6);

  return score; // 0–15
}

/** Datetime utils */
function dateFromInput(val) {
  try { return val ? new Date(val).getTime() : null; }
  catch { return null; }
}

function fmtDate(ts) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString(); }
  catch { return "—"; }
}

/** Small user cache to reduce reads for creator usernames */
const userCache = new Map();
async function getUsername(uid) {
  if (userCache.has(uid)) return userCache.get(uid);
  const snap = await get(ref(db, `users/${uid}/username`));
  const name = snap.exists() ? snap.val() : uid;
  userCache.set(uid, name);
  return name;
}

/** Simple HTML escaper to prevent injection in loop cards */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[s]));
}

/** Loop card renderer */
function loopCard(loopId, loop, currentUserId) {
  const participants = loop.participants ? Object.keys(loop.participants) : [];
  const count        = participants.length;
  const cap          = loop.capacity || 0;
  const full         = cap && count >= cap;

  const prefs     = loop.loopPrefs || {};
  const prefsLine = [
    prefs.climate || "—",
    prefs.pace    || "—",
    prefs.budget  || "—",
    (prefs.activities || []).slice(0,3).join(", ") || "—"
  ].join(" • ");

  const acts     = (loop.activities || []).slice(0,4).join(", ");
  const canEdit  = loop.creator === currentUserId;

  const container = document.createElement("div");
  container.className = "loop";

  container.innerHTML = `
    <div class="row" style="justify-content:space-between;">
      <div><strong>${escapeHtml(loop.title || "Untitled Loop")}</strong></div>
      <span class="badge">${count}/${cap || "∞"} ${cap && full ? "<span class='full'>(Full)</span>" : ""}</span>
    </div>

    <div class="meta">
      By <span data-creator-name>${escapeHtml(loop.creatorUsername || loop.creator)}</span>
      • ${fmtDate(loop.startAt)}
    </div>

    <div>${escapeHtml(loop.description || "")}</div>

    <div class="meta">Location: ${escapeHtml(loop.location || "—")}</div>
    <div class="meta">Activities: ${escapeHtml(acts || "—")}</div>
    <div class="meta">Prefs: ${escapeHtml(prefsLine)}</div>

    <div class="actions" style="margin-top:.6rem;">
      <button data-join="${loopId}" type="button" ${full ? "disabled" : ""}>
        ${full ? "Full" : "Join"}
      </button>
      ${canEdit ? `<button data-edit="${loopId}" type="button">Edit</button>` : ""}
    </div>
  `;

  // Fill creator name if needed
  if (!loop.creatorUsername) {
    getUsername(loop.creator).then(name => {
      const span = container.querySelector("[data-creator-name]");
      if (span) span.textContent = name;
    });
  }

  return container;
}

// ---- Router (supports anchor like #/about#founder) ----
const ROUTES = {
  "#/home":    "home",
  "#/about":   "about",
  "#/login":   "login",
  "#/register":"register",
  "#/all":     "all",
  "#/matched": "matched",
  "#/my":      "my",
  "#/profile": "profile",
};

/** Render current route + optional in-page anchor scroll */
function renderRoute() {
  const full = location.hash || "#/home";

  // Find base route (before any extra "#anchor")
  const routeKey = Object.keys(ROUTES).find(r => full.startsWith(r)) || "#/home";

  // Toggle visible page
  hideAllPages();
  pages[ROUTES[routeKey]]?.classList.add("active");

  // Update SEO/meta for base route (ignore sub-anchor)
  setMetaForRoute(routeKey);

  // Footer year on home
  const yearEl = document.getElementById("yearNow");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Smooth-scroll to anchor if present (e.g., #/about#founder)
  const anchor = full.length > routeKey.length + 1 ? full.slice(routeKey.length + 1) : "";
  if (anchor) {
    const el = document.getElementById(anchor);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }

  // Compute matches when visiting matched page (requires user)
  if (routeKey === "#/matched" && auth.currentUser) {
    renderMatchedLoops(auth.currentUser.uid);
  }
}

// Listen to hash changes
window.addEventListener("hashchange", renderRoute);

// ---- Auth Actions ----
loginBtn?.addEventListener("click", async () => {
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginPassword.value
    );
    if (cred.user) {
      go("#/all");
    }
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

registerBtn?.addEventListener("click", async () => {
  try {
    const email    = regEmail.value.trim();
    const password = regPassword.value;
    const username = (regUsername.value || email.split("@")[0]).trim();

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;

    // Upload optional profile photo
    let photoURL = null;
    if (regPhoto.files && regPhoto.files.length > 0) {
      const file     = regPhoto.files[0];
      const photoRef = storageRef(storage, `profilePhotos/${uid}`);
      await uploadBytes(photoRef, file);
      photoURL = await getDownloadURL(photoRef);
    }

    // Initial preferences
    const preferences = {
      climate:    regClimate.value || null,
      pace:       regPace.value    || null,
      budget:     regBudget.value  || null,
      activities: readActivities(regActivities.value)
    };

    // Persist user record in Realtime DB
    await set(ref(db, `users/${uid}`), {
      email,
      username,
      photoURL,
      joined: new Date().toISOString(),
      preferences
    });

    // Sync Firebase Auth profile
    await updateProfile(cred.user, {
      displayName: username || null,
      photoURL:    photoURL || null
    });

    go("#/all");
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    go("#/home");
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

// ---- Profile & Preferences ----
saveProfileBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in.");

  try {
    const uid = user.uid;
    const userRef = ref(db, `users/${uid}`);

    const updates = {};
    const uname = (usernameInput?.value || "").trim();

    if (uname) {
      updates.username = uname;
    }

    // Optional photo upload
    let newPhotoURL = null;
    if (profilePhotoInput?.files && profilePhotoInput.files.length > 0) {
      const file = profilePhotoInput.files[0];
      const photoRef = storageRef(storage, `profilePhotos/${uid}`);
      await uploadBytes(photoRef, file);
      newPhotoURL = await getDownloadURL(photoRef);
      updates.photoURL = newPhotoURL;
    }

    // Update DB
    if (Object.keys(updates).length > 0) {
      await update(userRef, updates);
    }

    // Update Auth profile
    await updateProfile(user, {
      displayName: uname || user.displayName || null,
      photoURL:    newPhotoURL || user.photoURL || null
    });

    // Fresh read -> reflect immediately in UI
    const fresh = (await get(userRef)).val() || {};

    chipName.textContent = fresh.username || user.email || "User";
    setAvatar(chipPhoto,       fresh.photoURL || user.photoURL);
    setAvatar(userPhotoDisplay,fresh.photoURL || user.photoURL);

    alert("Profile saved.");
  } catch (e) {
    console.error(e);
    alert(cleanFirebaseError(e.message));
  }
});

savePrefsBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in.");

  try {
    const prefs = {
      climate:    climateInput.value   || null,
      pace:       paceInput.value      || null,
      budget:     budgetInput.value    || null,
      activities: readActivities(activitiesInput.value)
    };

    await set(ref(db, `users/${user.uid}/preferences`), prefs);

    alert("Preferences saved.");
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

// ---- Create Loop Form Behaviors ----
openCreateLoop?.addEventListener("click", () => {
  createLoopForm.classList.toggle("hidden");
});

cancelCreateLoop?.addEventListener("click", () => {
  createLoopForm.classList.add("hidden");

  loopTitle.value       = "";
  loopCapacity.value    = "4";
  loopLocation.value    = "";
  loopStartAt.value     = "";
  loopDescription.value = "";
  loopActivities.value  = "";
});

submitCreateLoop?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in.");

  const title        = (loopTitle.value || "").trim();
  const capacity     = Math.max(1, parseInt(loopCapacity.value || "1", 10));
  const locationText = (loopLocation.value || "").trim();
  const startAt      = dateFromInput(loopStartAt.value);
  const description  = (loopDescription.value || "").trim();
  const activities   = readActivities(loopActivities.value);

  if (!title) return alert("Please enter a title for your loop.");

  try {
    const uid      = user.uid;
    const userSnap = await get(ref(db, `users/${uid}`));
    const udata    = userSnap.val() || {};
    const loopPrefs= udata.preferences || null;

    const newRef = push(ref(db, "loops"));

    await set(newRef, {
      creator:          uid,
      creatorUsername:  udata.username || user.email || "User",
      createdAt:        Date.now(),
      participants:     { [uid]: true },
      loopPrefs,

      title,
      capacity,
      location:   locationText || null,
      startAt:    startAt || null,
      description:description || null,
      activities
    });

    // Reset + close
    cancelCreateLoop.click();

    alert("Loop created.");
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

// ---- Loop lists & actions ----
function bindLoopContainerEvents(container, currentUserId) {
  container.addEventListener("click", async (e) => {
    const joinBtn = e.target.closest("[data-join]");
    const editBtn = e.target.closest("[data-edit]");

    // Join loop
    if (joinBtn) {
      const loopId = joinBtn.getAttribute("data-join");

      try {
        const loopRef = ref(db, `loops/${loopId}`);
        const snap    = await get(loopRef);

        if (!snap.exists()) return;

        const loop = snap.val();

        const participants = loop.participants ? Object.keys(loop.participants) : [];
        const capacity     = loop.capacity || 0;
        const full         = capacity && participants.length >= capacity;

        if (full) return alert("This loop is full.");

        if (loop.participants && loop.participants[currentUserId]) {
          return alert("You already joined this loop.");
        }

        const pRef = ref(db, `loops/${loopId}/participants`);
        const curr = (await get(pRef)).val() || {};
        curr[currentUserId] = true;

        await set(pRef, curr);

        alert("Joined loop.");
      } catch (err) {
        alert(cleanFirebaseError(err.message));
      }
    }

    // Edit loop
    if (editBtn) {
      const loopId = editBtn.getAttribute("data-edit");

      try {
        const loopRef = ref(db, `loops/${loopId}`);
        const snap    = await get(loopRef);

        if (!snap.exists()) return;

        const loop = snap.val();

        if (loop.creator !== currentUserId) {
          return alert("Only the creator can edit this loop.");
        }

        const newTitle  = prompt("Update title:", loop.title || "");
        if (newTitle === null) return;

        const newDesc   = prompt("Update description:", loop.description || "");
        if (newDesc === null) return;

        const newCapStr = prompt("Update capacity (number):", String(loop.capacity || 4));
        if (newCapStr === null) return;

        const newCap = Math.max(1, parseInt(newCapStr, 10) || 1);

        await update(loopRef, {
          title:       (newTitle || "").trim() || "Untitled Loop",
          description: (newDesc  || "").trim(),
          capacity:    newCap
        });

        alert("Loop updated.");
      } catch (err) {
        alert(cleanFirebaseError(err.message));
      }
    }
  });
}

function renderAllLoops(currentUserId) {
  const loopsRef = ref(db, "loops");

  onValue(loopsRef, (snap) => {
    allLoopsEl.innerHTML = "";

    if (!snap.exists()) {
      allLoopsEl.innerHTML = `<p class="muted">No loops yet. Create the first one!</p>`;
      return;
    }

    const frag = document.createDocumentFragment();

    snap.forEach(child => {
      const loop = child.val();
      frag.appendChild(loopCard(child.key, loop, currentUserId));
    });

    allLoopsEl.appendChild(frag);
  }, (err) => {
    alert(cleanFirebaseError(err.message));
  });

  bindLoopContainerEvents(allLoopsEl, currentUserId);
}

function renderMyLoops(currentUserId) {
  const loopsRef = ref(db, "loops");

  onValue(loopsRef, (snap) => {
    myLoopsEl.innerHTML = "";

    if (!snap.exists()) {
      myLoopsEl.innerHTML = `<p class="muted">No loops yet.</p>`;
      return;
    }

    const frag = document.createDocumentFragment();

    snap.forEach(child => {
      const loop = child.val();

      const isCreator     = loop.creator === currentUserId;
      const isParticipant = loop.participants && !!loop.participants[currentUserId];

      if (isCreator || isParticipant) {
        frag.appendChild(loopCard(child.key, loop, currentUserId));
      }
    });

    myLoopsEl.appendChild(frag);
  }, (err) => {
    alert(cleanFirebaseError(err.message));
  });

  bindLoopContainerEvents(myLoopsEl, currentUserId);
}

async function renderMatchedLoops(currentUserId) {
  matchedLoopsEl.innerHTML = `<p class="muted">Loading matches…</p>`;

  const userSnap = await get(ref(db, `users/${currentUserId}`));
  const udata    = userSnap.val() || {};
  const myPrefs  = udata.preferences || null;

  const loopsSnap = await get(ref(db, "loops"));

  matchedLoopsEl.innerHTML = "";

  if (!loopsSnap.exists()) {
    matchedLoopsEl.innerHTML = `<p class="muted">No loops to match yet.</p>`;
    return;
  }

  const scored = [];

  loopsSnap.forEach(child => {
    const loop = child.val();
    if (loop.creator === currentUserId) return;

    const s = scoreMatch(myPrefs, loop.loopPrefs || null);
    scored.push({ id: child.key, loop, score: s });
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    matchedLoopsEl.innerHTML = `<p class="muted">No matches yet.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();

  scored.forEach(item => {
    const card   = loopCard(item.id, item.loop, currentUserId);
    const scoreP = document.createElement("p");
    scoreP.className = "meta";
    scoreP.textContent = `Match score: ${item.score}`;

    card.appendChild(scoreP);
    frag.appendChild(card);
  });

  matchedLoopsEl.appendChild(frag);

  bindLoopContainerEvents(matchedLoopsEl, currentUserId);
}

// ---- Auth state & data wiring ----
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Signed in
    showNavForAuth(true);

    const userRef = ref(db, `users/${user.uid}`);

    // Live user record hydration
    onValue(userRef, (snap) => {
      const data = snap.val() || {};

      chipName.textContent = data.username || user.email || "User";

      setAvatar(chipPhoto,       data.photoURL || user.photoURL);
      setAvatar(userPhotoDisplay,data.photoURL || user.photoURL);

      // hydrate fields each login
      if (usernameInput) usernameInput.value = data.username || "";

      const prefs = data.preferences || {};
      if (climateInput)   climateInput.value    = prefs.climate || "";
      if (paceInput)      paceInput.value       = prefs.pace    || "";
      if (budgetInput)    budgetInput.value     = prefs.budget  || "";
      if (activitiesInput)activitiesInput.value = (prefs.activities || []).join(", ");
    });

    // Live lists
    renderAllLoops(user.uid);
    renderMyLoops(user.uid);

    // Do not auto-redirect away from current route; re-render to apply meta/title
    renderRoute();

  } else {
    // Signed out
    showNavForAuth(false);

    chipName.textContent = "Guest";
    setAvatar(chipPhoto, null);
    setAvatar(userPhotoDisplay, null);

    if (!location.hash) location.hash = "#/home";
    renderRoute();
  }
});

// ---- Error helper ----
function cleanFirebaseError(msg) {
  const map = [
    [/auth\/invalid-credential/i,   "Invalid email or password."],
    [/auth\/email-already-in-use/i, "This email is already in use."],
    [/auth\/weak-password/i,        "Please use a stronger password."],
    [/permission-denied/i,          "You don’t have permission to perform this action."]
  ];

  for (const [re, text] of map) {
    if (re.test(msg)) return text;
  }
  return msg;
}

// ---- Initial render ----
renderRoute();
