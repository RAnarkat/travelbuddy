// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

const showTab = (id) => {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("visible"));
  document.getElementById(id).classList.add("visible");
  if (id === "loopTab") {
    loadMyLoops();
    matchLoopsAI();
  }
  if (id === "profileTab") {
    loadUserProfile();
  }
};

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("authSection").classList.remove("visible");
    document.querySelector("nav").style.display = "flex";
    showTab("loopTab");
  } else {
    document.getElementById("authSection").classList.add("visible");
    document.querySelector("nav").style.display = "none";
  }
});

window.login = () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password).catch(alert);
};

window.signup = () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(cred => {
      const userRef = ref(db, `users/${cred.user.uid}`);
      set(userRef, {
        email,
        joined: new Date().toISOString()
      });
    })
    .catch(alert);
};

window.logout = () => {
  signOut(auth);
};

window.savePreferences = () => {
  const uid = auth.currentUser.uid;
  const preferences = {
    climate: document.getElementById("prefClimate").value,
    pace: document.getElementById("prefPace").value,
    budget: document.getElementById("prefBudget").value,
    activities: document.getElementById("prefActivities").value.split(",").map(s => s.trim().toLowerCase())
  };
  update(ref(db, `users/${uid}`), { preferences });
};

window.saveUserProfile = () => {
  const uid = auth.currentUser.uid;
  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePhoto").files[0];
  const reader = new FileReader();

  reader.onload = () => {
    const photoURL = reader.result;
    update(ref(db, `users/${uid}`), {
      username,
      photoURL
    });
  };

  if (file) {
    reader.readAsDataURL(file);
  } else {
    update(ref(db, `users/${uid}`), { username });
  }
};

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

window.loadMyLoops = () => {
  const uid = auth.currentUser.uid;
  const list = document.getElementById("myLoops");
  list.innerHTML = "";
  onValue(ref(db, "loops"), snapshot => {
    list.innerHTML = "";
    snapshot.forEach(child => {
      const loop = child.val();
      if (loop.participants?.includes(uid)) {
        const li = document.createElement("li");
        li.textContent = `${loop.title} (${loop.location})`;
        list.appendChild(li);
      }
    });
  });
};

window.matchLoopsAI = () => {
  const uid = auth.currentUser.uid;
  onValue(ref(db, `users/${uid}/preferences`), snap => {
    const prefs = snap.val();
    if (!prefs) return;

    const list = document.getElementById("matchedLoops");
    list.innerHTML = "";

    onValue(ref(db, "loops"), snapshot => {
      list.innerHTML = "";
      snapshot.forEach(child => {
        const loop = child.val();
        if ((loop.participants?.length || 0) >= loop.max) return;

        const match = loop.tags.some(tag => prefs.activities.includes(tag));
        if (match) {
          const li = document.createElement("li");
          li.textContent = `${loop.title} - ${loop.location}`;
          const btn = document.createElement("button");
          btn.textContent = "Join";
          btn.onclick = () => joinLoop(child.key);
          li.appendChild(btn);
          list.appendChild(li);
        }
      });
    });
  });
};

const joinLoop = (loopId) => {
  const loopRef = ref(db, `loops/${loopId}`);
  onValue(loopRef, snap => {
    const loop = snap.val();
    if (!loop || loop.participants?.includes(auth.currentUser.uid)) return;
    const updated = loop.participants || [];
    updated.push(auth.currentUser.uid);
    update(loopRef, { participants: updated });
  }, { onlyOnce: true });
};

window.loadUserProfile = () => {
  const uid = auth.currentUser.uid;
  onValue(ref(db, `users/${uid}`), snap => {
    const user = snap.val();
    if (!user) return;

    document.getElementById("username").value = user.username || "";
    if (user.photoURL) {
      const img = document.getElementById("userPhoto");
      if (img) img.src = user.photoURL;
    }

    const prefsDiv = document.getElementById("userPrefs");
    prefsDiv.innerHTML = "";
    if (user.preferences) {
      Object.entries(user.preferences).forEach(([key, val]) => {
        const p = document.createElement("p");
        p.textContent = `${key}: ${Array.isArray(val) ? val.join(", ") : val}`;
        prefsDiv.appendChild(p);
      });
    }
  });
};
