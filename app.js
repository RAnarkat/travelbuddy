// ---- Firebase (CDN ESM) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updatePassword
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

const headerPhoto = document.getElementById("headerPhoto");
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

// Loops
const createLoopBtn = document.getElementById("createLoopBtn");
const allLoopsEl = document.getElementById("allLoops");
const myLoopsEl = document.getElementById("myLoops");
const matchedLoopsEl = document.getElementById("matchedLoops");

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
  img.src = url || DEFAULT_AVATAR;
  img.onerror = () => (img.src = DEFAULT_AVATAR);
}

function showNavForAuth(isAuthed) {
  if (isAuthed) {
    navSignedOut.classList.add("hidden");
    navSignedIn.classList.remove("hidden");
  } else {
    navSignedIn.classList.add("hidden");
    navSignedOut.classList.remove("hidden");
  }
}

function hideAllPages() {
  Object.values(pages).forEach(p => p.classList.remove("active"));
}

function go(route) {
  // change hash without scrolling
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
  score += Math.round((inter / union) * 6); // up to 6 pts for activities

  return score; // max ~15
}

function loopCardHTML(id, loop, currentUserId) {
  const participants = loop.participants ? Object.keys(loop.participants) : [];
  const youTag = loop.creator === currentUserId ? " • You" : "";
  const prefs = loop.loopPrefs || {};
  const prefsLine = [
    prefs.climate || "—",
    prefs.pace || "—",
    prefs.budget || "—",
    (prefs.activities || []).slice(0,3).join(", ") || "—"
  ].join(" • ");

  return `
    <div class="loop">
      <div><strong>Loop</strong> by ${loop.creator}${youTag}</div>
      <div class="meta">Prefs: ${prefsLine}</div>
      <div class="meta">Participants: ${participants.length}</div>
      <div class="actions" style="margin-top:.6rem;">
        <button data-join="${id}" type="button">Join</button>
      </div>
    </div>
  `;
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

function renderRoute() {
  const hash = location.hash || "#/home";
  const pageKey = ROUTES[hash] || "home";
  hideAllPages();
  pages[pageKey].classList.add("active");
}

window.addEventListener("hashchange", renderRoute);

// ---- Auth Actions ----
loginBtn?.addEventListener("click", async () => {
  try {
    const cred = await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    if (cred.user) go("#/all");
  } catch (e) {
    alert(e.message);
  }
});

registerBtn?.addEventListener("click", async () => {
  try {
    // 1) Create auth user
    const email = regEmail.value.trim();
    const password = regPassword.value;
    const username = (regUsername.value || email.split("@")[0]).trim();

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // 2) Upload photo if chosen
    let photoURL = null;
    if (regPhoto.files && regPhoto.files.length > 0) {
      const file = regPhoto.files[0];
      const photoRef = storageRef(storage, `profilePhotos/${uid}`);
      await uploadBytes(photoRef, file);
      photoURL = await getDownloadURL(photoRef);
    }

    // 3) Save profile + preferences
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
    alert(e.message);
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    go("#/home");
  } catch (e) {
    alert(e.message);
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
      setAvatar(headerPhoto, url);
      setAvatar(chipPhoto, url);
      setAvatar(userPhotoDisplay, url);
    }

    if (Object.keys(updates).length > 0) {
      await update(userRef, updates);
    }

    alert("Profile saved.");
  } catch (e) {
    alert(e.message);
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
    alert(e.message);
  }
});

// ---- Loops ----
createLoopBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in.");

  try {
    const uid = user.uid;
    const userSnap = await get(ref(db, `users/${uid}`));
    const udata = userSnap.val() || {};
    const loopPrefs = udata.preferences || null; // snapshot user's prefs at creation

    const loopsRef = ref(db, "loops");
    const newRef = push(loopsRef);
    await set(newRef, {
      creator: uid,
      createdAt: Date.now(),
      participants: { [uid]: true },
      loopPrefs
    });

    alert("Loop created.");
  } catch (e) {
    alert(e.message);
  }
});

function bindJoinButtons(rootEl, currentUserId) {
  rootEl.querySelectorAll("[data-join]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const loopId = btn.getAttribute("data-join");
      try {
        const pRef = ref(db, `loops/${loopId}/participants`);
        const snap = await get(pRef);
        const curr = snap.val() || {};
        if (!curr[currentUserId]) {
          curr[currentUserId] = true;
          await set(pRef, curr);
        }
        alert("Joined loop.");
      } catch (e) {
        alert(e.message);
      }
    });
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
    snap.forEach(child => {
      const loop = child.val();
      const html = loopCardHTML(child.key, loop, currentUserId);
      const holder = document.createElement("div");
      holder.innerHTML = html;
      allLoopsEl.appendChild(holder);
    });
    bindJoinButtons(allLoopsEl, currentUserId);
  }, (err) => alert(err.message));
}

function renderMyLoops(currentUserId) {
  const loopsRef = ref(db, "loops");
  onValue(loopsRef, (snap) => {
    myLoopsEl.innerHTML = "";
    if (!snap.exists()) {
      myLoopsEl.innerHTML = `<p class="muted">No loops yet.</p>`;
      return;
    }
    snap.forEach(child => {
      const loop = child.val();
      const isCreator = loop.creator === currentUserId;
      const isParticipant = loop.participants && !!loop.participants[currentUserId];
      if (isCreator || isParticipant) {
        const html = loopCardHTML(child.key, loop, currentUserId);
        const holder = document.createElement("div");
        holder.innerHTML = html;
        myLoopsEl.appendChild(holder);
      }
    });
    bindJoinButtons(myLoopsEl, currentUserId);
  }, (err) => alert(err.message));
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

  // score loops
  const scored = [];
  loopsSnap.forEach(child => {
    const loop = child.val();
    if (loop.creator === currentUserId) return; // exclude own loop from “matched”
    const s = scoreMatch(myPrefs, loop.loopPrefs || null);
    scored.push({ id: child.key, loop, score: s });
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    matchedLoopsEl.innerHTML = `<p class="muted">No matches yet.</p>`;
    return;
  }

  scored.forEach(item => {
    const html = loopCardHTML(item.id, item.loop, currentUserId);
    const holder = document.createElement("div");
    holder.innerHTML = html;
    // add score line
    const scoreP = document.createElement("p");
    scoreP.className = "muted";
    scoreP.textContent = `Match score: ${item.score}`;
    holder.firstElementChild.appendChild(scoreP);
    matchedLoopsEl.appendChild(holder);
  });

  bindJoinButtons(matchedLoopsEl, currentUserId);
}

// ---- Auth state & data wiring ----
onAuthStateChanged(auth, (user) => {
  if (user) {
    showNavForAuth(true);

    const userRef = ref(db, `users/${user.uid}`);
    onValue(userRef, (snap) => {
      const data = snap.val() || {};
      chipName.textContent = data.username || user.email || "User";
      setAvatar(headerPhoto, data.photoURL);
      setAvatar(chipPhoto, data.photoURL);
      setAvatar(userPhotoDisplay, data.photoURL);

      // hydrate profile fields
      usernameInput.value = data.username || "";
      const prefs = data.preferences || {};
      climateInput.value = prefs.climate || "";
      paceInput.value = prefs.pace || "";
      budgetInput.value = prefs.budget || "";
      activitiesInput.value = (prefs.activities || []).join(", ");
    });

    // live lists
    renderAllLoops(user.uid);
    renderMyLoops(user.uid);

    // route guard: signed-in default to All
    const hash = location.hash || "#/all";
    if (!["#/all", "#/matched", "#/my", "#/profile"].includes(hash)) {
      go("#/all");
    } else {
      renderRoute();
    }

    // when entering matched page, compute matches
    window.addEventListener("hashchange", () => {
      if (location.hash === "#/matched") {
        renderMatchedLoops(user.uid);
      }
    });
    if (location.hash === "#/matched") renderMatchedLoops(user.uid);

  } else {
    showNavForAuth(false);
    chipName.textContent = "Guest";
    setAvatar(headerPhoto, null);
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

// initial route paint
renderRoute();
