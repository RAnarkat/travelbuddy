// ---- Firebase (CDN ESM) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getDatabase, ref, set, push, onValue, get, update
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ---- Config ----
const firebaseConfig = {
  apiKey: "AIzaSyC_lEYUVD1yP3vdde0JstOz4f3YhEbVaBk",
  authDomain: "loopmates-94b46.firebaseapp.com",
  databaseURL: "https://loopmates-94b46-default-rtdb.firebaseio.com",
  projectId: "loopmates-94b46",
  storageBucket: "loopmates-94b46.appspot.com",
  messagingSenderId: "336997321934",
  appId: "1:336997321934:web:3ffd0f1dbf6b3930e0149f"
};

// ---- Init ----
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// ---- DOM refs ----
const pages = {
  home: document.getElementById("page-home"),
  login: document.getElementById("page-login"),
  register: document.getElementById("page-register"),
  all: document.getElementById("page-all"),
  matched: document.getElementById("page-matched"),
  my: document.getElementById("page-my"),
  profile: document.getElementById("page-profile"),
};

const navSignedOut = document.getElementById("navSignedOut");
const navSignedIn = document.getElementById("navSignedIn");
const logoutBtn = document.getElementById("logoutBtn");

const chipPhoto = document.getElementById("chipPhoto");
const chipName = document.getElementById("chipName");

// Login
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

// Register
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const regUsername = document.getElementById("regUsername");
const regPhoto = document.getElementById("regPhoto");
const regClimate = document.getElementById("regClimate");
const regPace = document.getElementById("regPace");
const regBudget = document.getElementById("regBudget");
const regActivities = document.getElementById("regActivities");
const registerBtn = document.getElementById("registerBtn");

// Profile
const usernameInput = document.getElementById("username");
const profilePhotoInput = document.getElementById("profilePhoto");
const userPhotoDisplay = document.getElementById("userPhoto");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const climateInput = document.getElementById("climate");
const paceInput = document.getElementById("pace");
const budgetInput = document.getElementById("budget");
const activitiesInput = document.getElementById("activities");
const savePrefsBtn = document.getElementById("savePrefsBtn");

// Loops page + form
const allLoopsEl = document.getElementById("allLoops");
const matchedLoopsEl = document.getElementById("matchedLoops");
const myLoopsEl = document.getElementById("myLoops");

const openCreateLoop = document.getElementById("openCreateLoop");
const createLoopForm = document.getElementById("createLoopForm");
const submitCreateLoop = document.getElementById("submitCreateLoop");
const cancelCreateLoop = document.getElementById("cancelCreateLoop");

const loopTitle = document.getElementById("loopTitle");
const loopCapacity = document.getElementById("loopCapacity");
const loopLocation = document.getElementById("loopLocation");
const loopStartAt = document.getElementById("loopStartAt");
const loopDescription = document.getElementById("loopDescription");
const loopActivities = document.getElementById("loopActivities");

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

function setAvatar(img, url) {
  if (!img) return;
  img.src = url || DEFAULT_AVATAR;
  img.onerror = () => (img.src = DEFAULT_AVATAR);
}

function showNavForAuth(isAuthed) {
  if (isAuthed) {
    navSignedOut?.classList.add("hidden");
    navSignedIn?.classList.remove("hidden");
  } else {
    navSignedIn?.classList.add("hidden");
    navSignedOut?.classList.remove("hidden");
  }
}

function hideAllPages() {
  Object.values(pages).forEach(p => p?.classList.remove("active"));
}

const TITLES = {
  "#/home": "LoopMeets — Connect. Travel. Belong.",
  "#/login": "Login • LoopMeets",
  "#/register": "Create Account • LoopMeets",
  "#/all": "All Loops • LoopMeets",
  "#/matched": "Matched Loops • LoopMeets",
  "#/my": "My Loops • LoopMeets",
  "#/profile": "My Profile • LoopMeets",
};

function setDocTitle(hash) {
  document.title = TITLES[hash] || "LoopMeets";
}

function go(route) {
  if (location.hash !== route) location.hash = route;
  renderRoute();
}

function readActivities(str) {
  return (str || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

// Simple preference match scoring
function scoreMatch(userPrefs, loopPrefs) {
  if (!userPrefs || !loopPrefs) return 0;
  let score = 0;

  if (userPrefs.climate && loopPrefs.climate && userPrefs.climate === loopPrefs.climate) score += 3;
  if (userPrefs.pace && loopPrefs.pace && userPrefs.pace === loopPrefs.pace) score += 3;
  if (userPrefs.budget && loopPrefs.budget && userPrefs.budget === loopPrefs.budget) score += 3;

  const ua = new Set((userPrefs.activities || []).map(a => a.toLowerCase()));
  const la = new Set((loopPrefs.activities || []).map(a => a.toLowerCase()));
  const inter = [...ua].filter(a => la.has(a)).length;
  const union = new Set([...ua, ...la]).size || 1;
  score += Math.round((inter / union) * 6); // up to 6 pts

  return score; // max ~15
}

function dateFromInput(val) {
  try { return val ? new Date(val).getTime() : null; } catch { return null; }
}

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch { return "—"; }
}

// cache of usernames to avoid N calls
const userCache = new Map();
async function getUsername(uid) {
  if (userCache.has(uid)) return userCache.get(uid);
  const snap = await get(ref(db, `users/${uid}/username`));
  const name = snap.exists() ? snap.val() : uid;
  userCache.set(uid, name);
  return name;
}

// Basic XSS-safety for dynamic text
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[s]));
}

function loopCard(loopId, loop, currentUserId) {
  const participants = loop.participants ? Object.keys(loop.participants) : [];
  theCountFix: {
    // Keep original logic but ensure numeric display consistency
  }
  const count = participants.length;
  const cap = loop.capacity || 0;
  const full = cap && count >= cap;

  const prefs = loop.loopPrefs || {};
  const prefsLine = [
    prefs.climate || "—",
    prefs.pace || "—",
    prefs.budget || "—",
    (prefs.activities || []).slice(0,3).join(", ") || "—"
  ].join(" • ");

  const acts = (loop.activities || []).slice(0,4).join(", ");

  const canEdit = loop.creator === currentUserId;

  const container = document.createElement("div");
  container.className = "loop";
  container.innerHTML = `
    <div class="row" style="justify-content:space-between;">
      <div><strong>${escapeHtml(loop.title || "Untitled Loop")}</strong></div>
      <span class="badge">${count}/${cap || "∞"} ${cap && full ? "<span class='full'>(Full)</span>" : ""}</span>
    </div>
    <div class="meta">By <span data-creator-name>${escapeHtml(loop.creatorUsername || loop.creator)}</span> • ${fmtDate(loop.startAt)}</div>
    <div>${escapeHtml(loop.description || "")}</div>
    <div class="meta">Location: ${escapeHtml(loop.location || "—")}</div>
    <div class="meta">Activities: ${escapeHtml(acts || "—")}</div>
    <div class="meta">Prefs: ${escapeHtml(prefsLine)}</div>
    <div class="actions" style="margin-top:.6rem;">
      <button data-join="${loopId}" type="button" ${full ? "disabled" : ""}>${full ? "Full" : "Join"}</button>
      ${canEdit ? `<button data-edit="${loopId}" type="button">Edit</button>` : ""}
    </div>
  `;
  // fill creator name from users if missing
  if (!loop.creatorUsername) {
    getUsername(loop.creator).then(name => {
      const span = container.querySelector("[data-creator-name]");
      if (span) span.textContent = name;
    });
  }
  return container;
}

// ---- Router ----
const ROUTES = {
  "#/home": "home",
  "#/login": "login",
  "#/register": "register",
  "#/all": "all",
  "#/matched": "matched",
  "#/my": "my",
  "#/profile": "profile",
};

let pendingScrollTarget = null;

function renderRoute() {
  const hash = location.hash || "#/home";
  const pageKey = ROUTES[hash] || "home";
  hideAllPages();
  pages[pageKey]?.classList.add("active");
  setDocTitle(hash);

  // Update footer year (home)
  const yearEl = document.getElementById("yearNow");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // If we navigated with an intention to scroll (e.g., About)
  if (pendingScrollTarget && pageKey === "home") {
    const el = document.getElementById(pendingScrollTarget);
    if (el) {
      // small delay to ensure layout is painted
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    }
    pendingScrollTarget = null;
  }
}

window.addEventListener("hashchange", renderRoute);

// Wire "About" links in both navs to anchor-scroll to the founder section
function bindAboutLinks() {
  const handler = (e) => {
    e.preventDefault();
    pendingScrollTarget = "about";
    // Always route to home first, then smooth scroll
    if ((location.hash || "#/home") !== "#/home") {
      go("#/home");
    } else {
      // already on home, just scroll
      const el = document.getElementById("about");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  document.querySelectorAll(".nav-about").forEach(a => {
    a.removeEventListener("click", handler); // idempotent
    a.addEventListener("click", handler);
  });
}
bindAboutLinks();

// ---- Auth Actions ----
loginBtn?.addEventListener("click", async () => {
  try {
    const cred = await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    if (cred.user) go("#/all");
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

registerBtn?.addEventListener("click", async () => {
  try {
    const email = regEmail.value.trim();
    const password = regPassword.value;
    const username = (regUsername.value || email.split("@")[0]).trim();

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    let photoURL = null;
    if (regPhoto.files && regPhoto.files.length > 0) {
      const file = regPhoto.files[0];
      const photoRef = storageRef(storage, `profilePhotos/${uid}`);
      await uploadBytes(photoRef, file);
      photoURL = await getDownloadURL(photoRef);
    }

    const preferences = {
      climate: regClimate.value || null,
      pace: regPace.value || null,
      budget: regBudget.value || null,
      activities: readActivities(regActivities.value)
    };

    await set(ref(db, `users/${uid}`), {
      email,
      username,
      photoURL,
      joined: new Date().toISOString(),
      preferences
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

// ---- Profile / Prefs ----
saveProfileBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in.");

  try {
    const uid = user.uid;
    const userRef = ref(db, `users/${uid}`);

    const updates = {};
    const uname = (usernameInput.value || "").trim();
    if (uname) updates.username = uname;

    if (profilePhotoInput.files && profilePhotoInput.files.length > 0) {
      const file = profilePhotoInput.files[0];
      const photoRef = storageRef(storage, `profilePhotos/${uid}`);
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      updates.photoURL = url;
      setAvatar(chipPhoto, url);
      setAvatar(userPhotoDisplay, url);
    }

    if (Object.keys(updates).length > 0) {
      await update(userRef, updates);
    }

    alert("Profile saved.");
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

savePrefsBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in.");

  try {
    const prefs = {
      climate: climateInput.value || null,
      pace: paceInput.value || null,
      budget: budgetInput.value || null,
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
  loopTitle.value = "";
  loopCapacity.value = "4";
  loopLocation.value = "";
  loopStartAt.value = "";
  loopDescription.value = "";
  loopActivities.value = "";
});

submitCreateLoop?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in.");

  const title = (loopTitle.value || "").trim();
  const capacity = Math.max(1, parseInt(loopCapacity.value || "1", 10));
  const locationText = (loopLocation.value || "").trim();
  const startAt = dateFromInput(loopStartAt.value);
  const description = (loopDescription.value || "").trim();
  const activities = readActivities(loopActivities.value);

  if (!title) return alert("Please enter a title for your loop.");

  try {
    const uid = user.uid;
    const userSnap = await get(ref(db, `users/${uid}`));
    const udata = userSnap.val() || {};
    const loopPrefs = udata.preferences || null;

    const newRef = push(ref(db, "loops"));
    await set(newRef, {
      creator: uid,
      creatorUsername: udata.username || user.email || "User",
      createdAt: Date.now(),
      participants: { [uid]: true },
      loopPrefs,
      // new details:
      title,
      capacity,
      location: locationText || null,
      startAt: startAt || null,
      description: description || null,
      activities
    });

    // reset form
    cancelCreateLoop.click();
    alert("Loop created.");
  } catch (e) {
    alert(cleanFirebaseError(e.message));
  }
});

// ---- Loop Lists & Actions ----
function bindLoopContainerEvents(container, currentUserId) {
  container.addEventListener("click", async (e) => {
    const joinBtn = e.target.closest("[data-join]");
    const editBtn = e.target.closest("[data-edit]");

    if (joinBtn) {
      const loopId = joinBtn.getAttribute("data-join");
      try {
        const loopRef = ref(db, `loops/${loopId}`);
        const snap = await get(loopRef);
        if (!snap.exists()) return;

        const loop = snap.val();
        const participants = loop.participants ? Object.keys(loop.participants) : [];
        const capacity = loop.capacity || 0;
        const full = capacity && participants.length >= capacity;

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

    if (editBtn) {
      const loopId = editBtn.getAttribute("data-edit");
      try {
        const loopRef = ref(db, `loops/${loopId}`);
        const snap = await get(loopRef);
        if (!snap.exists()) return;
        const loop = snap.val();
        if (loop.creator !== currentUserId) return alert("Only the creator can edit this loop.");

        // Quick edit prompts (simple + fast)
        const newTitle = prompt("Update title:", loop.title || "");
        if (newTitle === null) return; // cancel
        const newDesc = prompt("Update description:", loop.description || "");
        if (newDesc === null) return;
        const newCapStr = prompt("Update capacity (number):", String(loop.capacity || 4));
        if (newCapStr === null) return;

        const newCap = Math.max(1, parseInt(newCapStr, 10) || 1);
        await update(loopRef, {
          title: newTitle.trim() || "Untitled Loop",
          description: (newDesc || "").trim(),
          capacity: newCap
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
  }, (err) => alert(cleanFirebaseError(err.message)));
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
      const isCreator = loop.creator === currentUserId;
      const isParticipant = loop.participants && !!loop.participants[currentUserId];
      if (isCreator || isParticipant) {
        frag.appendChild(loopCard(child.key, loop, currentUserId));
      }
    });
    myLoopsEl.appendChild(frag);
  }, (err) => alert(cleanFirebaseError(err.message)));
  bindLoopContainerEvents(myLoopsEl, currentUserId);
}

async function renderMatchedLoops(currentUserId) {
  matchedLoopsEl.innerHTML = `<p class="muted">Loading matches…</p>`;

  const userSnap = await get(ref(db, `users/${currentUserId}`));
  const udata = userSnap.val() || {};
  const myPrefs = udata.preferences || null;

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
    const card = loopCard(item.id, item.loop, currentUserId);
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
    showNavForAuth(true);

    const userRef = ref(db, `users/${user.uid}`);
    onValue(userRef, (snap) => {
      const data = snap.val() || {};
      chipName.textContent = data.username || user.email || "User";
      setAvatar(chipPhoto, data.photoURL);
      setAvatar(userPhotoDisplay, data.photoURL);
    });

    // live lists
    renderAllLoops(user.uid);
    renderMyLoops(user.uid);

    // route guard: signed-in default to All
    const hash = location.hash || "#/all";
    if (!["#/all", "#/matched", "#/my", "#/profile", "#/home"].includes(hash)) {
      go("#/all");
    } else {
      renderRoute();
    }

    // recompute matches when visiting matched page
    window.addEventListener("hashchange", () => {
      if (location.hash === "#/matched") {
        renderMatchedLoops(user.uid);
      }
    });
    if (location.hash === "#/matched") renderMatchedLoops(user.uid);

  } else {
    showNavForAuth(false);
    chipName.textContent = "Guest";
    setAvatar(chipPhoto, null);
    setAvatar(userPhotoDisplay, null);

    // signed-out default to Home
    const hash = location.hash || "#/home";
    if (!["#/home", "#/login", "#/register"].includes(hash)) {
      go("#/home");
    } else {
      renderRoute();
    }
  }
});

// ---- Utilities ----
function cleanFirebaseError(msg) {
  const map = [
    [/auth\/invalid-credential/i, "Invalid email or password."],
    [/auth\/email-already-in-use/i, "This email is already in use."],
    [/auth\/weak-password/i, "Please use a stronger password."],
    [/permission-denied/i, "You don’t have permission to perform this action."],
  ];
  for (const [re, text] of map) if (re.test(msg)) return text;
  return msg;
}

// initial route paint
renderRoute();
