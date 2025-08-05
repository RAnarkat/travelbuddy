// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC_lEYUVD1yP3vdde0JstOz4f3YhEbVaBk",
  authDomain: "loopmates-94b46.firebaseapp.com",
  databaseURL: "https://loopmates-94b46-default-rtdb.firebaseio.com",
  projectId: "loopmates-94b46",
  storageBucket: "loopmates-94b46.appspot.com",
  messagingSenderId: "336997321934",
  appId: "1:336997321934:web:3ffd0f1dbf6b3930e0149f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);
const storage = getStorage(app);

window.showTab = (id) => {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("visible"));
  document.getElementById(id).classList.add("visible");

  if (id === "matchedTab") matchLoopsAI();
  if (id === "myLoopsTab") loadMyLoops();
  if (id === "loopTab") loadAllLoops();
  if (id === "profileTab") loadUserProfile();
};

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("authSection").classList.remove("visible");
    document.getElementById("navBar").style.display = "flex";
    document.getElementById("userDisplay").style.display = "flex";
    loadUserDisplay();
    showTab("loopTab");
  } else {
    document.getElementById("authSection").classList.add("visible");
    document.getElementById("navBar").style.display = "none";
    document.getElementById("userDisplay").style.display = "none";
    showTab("authSection");
  }
});

window.login = () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password).catch(alert);
};

window.logout = () => {
  signOut(auth);
};

window.completeRegistration = () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(auth, email, password).then(cred => {
    const uid = cred.user.uid;
    const userRef = ref(db, `users/${uid}`);
    const username = document.getElementById("regUsername").value;
    const file = document.getElementById("regPhoto").files[0];
    const preferences = {
      climate: document.getElementById("regClimate").value,
      pace: document.getElementById("regPace").value,
      budget: document.getElementById("regBudget").value,
      activities: document.getElementById("regActivities").value.split(",").map(a => a.trim().toLowerCase())
    };

    const baseData = {
      email,
      username,
      joined: new Date().toISOString(),
      preferences
    };

    if (file) {
      const photoRef = sRef(storage, `profiles/${uid}`);
      uploadBytes(photoRef, file).then(() => {
        getDownloadURL(photoRef).then(url => {
          baseData.photoURL = url;
          set(userRef, baseData).then(() => showTab("loopTab"));
        });
      });
    } else {
      set(userRef, baseData).then(() => showTab("loopTab"));
    }
  }).catch(alert);
};

window.savePreferences = () => {
  const uid = auth.currentUser.uid;
  const prefRef = ref(db, `users/${uid}/preferences`);
  const preferences = {
    climate: document.getElementById("prefClimate").value,
    pace: document.getElementById("prefPace").value,
    budget: document.getElementById("prefBudget").value,
    activities: document.getElementById("prefActivities").value.split(",").map(a => a.trim().toLowerCase())
  };
  set(prefRef, preferences).then(() => alert("Preferences saved!"));
};
window.saveUserProfile = () => {
  const uid = auth.currentUser.uid;
  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePhoto").files[0];
  const userRef = ref(db, `users/${uid}`);

  if (file) {
    const photoRef = sRef(storage, `profiles/${uid}`);
    uploadBytes(photoRef, file).then(() => {
      getDownloadURL(photoRef).then(url => {
        update(userRef, { username, photoURL: url }).then(() => {
          alert("Profile saved!");
          // Update DOM
          document.getElementById("userPhoto").src = url;
          document.getElementById("headerPhoto").src = url;
          document.getElementById("headerUsername").textContent = username;
        });
      });
    });
  } else {
    update(userRef, { username }).then(() => {
      alert("Profile saved!");
      document.getElementById("headerUsername").textContent = username;
    });
  }
};
function loadUserDisplay() {
  const uid = auth.currentUser.uid;
  const userRef = ref(db, `users/${uid}`);
  onValue(userRef, snap => {
    const data = snap.val();
    document.getElementById("headerUsername").textContent = data.username || "";
    if (data.photoURL) document.getElementById("headerPhoto").src = data.photoURL;
  });
}

window.createLoop = () => {
  const uid = auth.currentUser.uid;
  const loop = {
    title: document.getElementById("loopTitle").value,
    location: document.getElementById("loopLocation").value,
    max: parseInt(document.getElementById("loopMax").value),
    tags: document.getElementById("loopTags").value.split(",").map(t => t.trim().toLowerCase()),
    participants: [uid]
  };
  push(ref(db, "loops"), loop);
};

window.loadAllLoops = () => {
  const list = document.getElementById("allLoops");
  list.innerHTML = "";
  onValue(ref(db, "loops"), snap => {
    list.innerHTML = "";
    snap.forEach(child => {
      const loop = child.val();
      const li = document.createElement("li");
      li.textContent = `${loop.title} - ${loop.location}`;
      if ((loop.participants?.length || 0) >= loop.max) {
        li.textContent += " (All Booked)";
      } else {
        const btn = document.createElement("button");
        btn.textContent = "Join";
        btn.onclick = () => joinLoop(child.key);
        li.appendChild(btn);
      }
      list.appendChild(li);
    });
  });
};

const joinLoop = (loopId) => {
  const uid = auth.currentUser.uid;
  const loopRef = ref(db, `loops/${loopId}`);
  onValue(loopRef, snap => {
    const loop = snap.val();
    if (!loop || loop.participants?.includes(uid)) return;
    const updated = loop.participants || [];
    updated.push(uid);
    set(ref(db, `loops/${loopId}/participants`), updated);
  }, { onlyOnce: true });
};

window.loadMyLoops = () => {
  const uid = auth.currentUser.uid;
  const list = document.getElementById("myLoops");
  list.innerHTML = "";
  onValue(ref(db, "loops"), snap => {
    list.innerHTML = "";
    snap.forEach(child => {
      const loop = child.val();
      if (loop.participants?.includes(uid)) {
        const li = document.createElement("li");
        li.textContent = `${loop.title} - ${loop.location}`;
        list.appendChild(li);
      }
    });
  });
};
window.loadUserProfile = () => {
  const uid = auth.currentUser.uid;
  const userRef = ref(db, `users/${uid}`);
  onValue(userRef, snap => {
    const data = snap.val();
    document.getElementById("username").value = data.username || "";
    if (data.photoURL) document.getElementById("userPhoto").src = data.photoURL;
    if (data.preferences) {
      document.getElementById("prefClimate").value = data.preferences.climate || "";
      document.getElementById("prefPace").value = data.preferences.pace || "";
      document.getElementById("prefBudget").value = data.preferences.budget || "";
      document.getElementById("prefActivities").value = data.preferences.activities?.join(", ") || "";
    }
  });
};

// Utility function to score how well a loop matches preferences
function scoreMatch(loop, prefs) {
  let score = 0;

  if (loop.tags && prefs.activities) {
    const activityMatch = loop.tags.filter(tag => prefs.activities.includes(tag)).length;
    score += activityMatch * 3; // Strong weight
  }

  if (prefs.climate && loop.tags?.includes(prefs.climate)) score += 2;
  if (prefs.pace && loop.tags?.includes(prefs.pace)) score += 2;
  if (prefs.budget && loop.tags?.includes(prefs.budget)) score += 1;

  return score;
}

// AI Matching based on scoring
window.matchLoopsAI = () => {
  const uid = auth.currentUser.uid;
  onValue(ref(db, `users/${uid}/preferences`), snapshot => {
    const prefs = snapshot.val();
    if (!prefs) return;

    const list = document.getElementById("matchedLoops");
    list.innerHTML = "";

    onValue(ref(db, "loops"), snap => {
      const scoredLoops = [];

      snap.forEach(child => {
        const loop = child.val();
        if ((loop.participants?.length || 0) >= loop.max) return;

        const score = scoreMatch(loop, prefs);
        if (score > 0) {
          scoredLoops.push({ key: child.key, loop, score });
        }
      });

      scoredLoops.sort((a, b) => b.score - a.score);

      scoredLoops.forEach(({ key, loop, score }) => {
        const li = document.createElement("li");
        li.textContent = `${loop.title} - ${loop.location} (Score: ${score})`;
        const btn = document.createElement("button");
        btn.textContent = "Join";
        btn.onclick = () => joinLoop(key);
        li.appendChild(btn);
        list.appendChild(li);
      });
    });
  });
};
