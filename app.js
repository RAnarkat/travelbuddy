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
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
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
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

function showTab(id) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("visible");
  });
  document.getElementById(id).classList.add("visible");

  if (id === "loopTab") {
    loadMyLoops();
    matchLoopsAI();
  } else if (id === "profileTab") {
    loadUserProfile();
  }
}

window.showTab = showTab;

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("authSection").classList.remove("visible");
    document.getElementById("loopTab").classList.add("visible");
    document.querySelector("nav").style.display = "flex";
    loadUserProfile();
  } else {
    document.getElementById("authSection").classList.add("visible");
    document.querySelector("nav").style.display = "none";
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("visible"));
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
  createUserWithEmailAndPassword(auth, email, password).then(userCred => {
    const uid = userCred.user.uid;
    set(ref(db, `users/${uid}`), {
      email,
      joined: new Date().toISOString()
    });
  }).catch(alert);
};

window.logout = () => {
  signOut(auth);
};

window.savePreferences = () => {
  const uid = auth.currentUser.uid;
  const prefRef = ref(db, `users/${uid}/preferences`);
  const preferences = {
    climate: document.getElementById("prefClimate").value,
    pace: document.getElementById("prefPace").value,
    budget: document.getElementById("prefBudget").value,
    activities: document.getElementById("prefActivities").value.split(",").map(s => s.trim().toLowerCase())
  };
  set(prefRef, preferences);
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
  const myList = document.getElementById("myLoops");
  myList.innerHTML = "";
  onValue(ref(db, "loops"), snapshot => {
    myList.innerHTML = "";
    snapshot.forEach(child => {
      const loop = child.val();
      if (loop.participants?.includes(uid)) {
        const li = document.createElement("li");
        li.textContent = `${loop.title} (${loop.location})`;
        myList.appendChild(li);
      }
    });
  });
};

window.matchLoopsAI = () => {
  const uid = auth.currentUser.uid;
  onValue(ref(db, `users/${uid}/preferences`), snapshot => {
    const prefs = snapshot.val();
    if (!prefs) return;

    const list = document.getElementById("matchedLoops");
    list.innerHTML = "";

    onValue(ref(db, "loops"), snap => {
      list.innerHTML = "";
      snap.forEach(child => {
        const loop = child.val();
        if ((loop.participants?.length || 0) >= loop.max) return;

        const common = loop.tags.filter(tag => prefs.activities.includes(tag));
        if (common.length > 0) {
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
  const uid = auth.currentUser.uid;
  const loopPath = `loops/${loopId}/participants`;
  onValue(ref(db, `loops/${loopId}`), snapshot => {
    const loop = snapshot.val();
    if (!loop || loop.participants?.includes(uid)) return;
    const updated = loop.participants || [];
    updated.push(uid);
    set(ref(db, loopPath), updated);
  }, { onlyOnce: true });
};

window.saveUserProfile = async () => {
  const uid = auth.currentUser.uid;
  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePhoto").files[0];

  const updates = { username };

  if (file) {
    const photoRef = storageRef(storage, `profile_photos/${uid}`);
    await uploadBytes(photoRef, file);
    const photoURL = await getDownloadURL(photoRef);
    updates.photoURL = photoURL;
  }

  update(ref(db, `users/${uid}`), updates);
};

window.loadUserProfile = () => {
  const uid = auth.currentUser.uid;
  onValue(ref(db, `users/${uid}`), snap => {
    const user = snap.val();
    if (!user) return;

    document.getElementById("username").value = user.username || "";
    if (user.photoURL) {
      const img = document.getElementById("userPhoto");
      if (img) {
        img.src = user.photoURL;
      } else {
        const newImg = document.createElement("img");
        newImg.src = user.photoURL;
        newImg.id = "userPhoto";
        document.querySelector("nav").appendChild(newImg);
      }
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
