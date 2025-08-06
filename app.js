// FULL app.js with all previous functions + debug logs
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
  update,
  get
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

console.log("Firebase App initialized");

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
  signInWithEmailAndPassword(auth, email, password).catch(err => {
    console.error("Login failed:", err);
    alert(err.message);
  });
};

window.logout = () => {
  signOut(auth);
};

async function getUsername(uid) {
  try {
    const snap = await get(ref(db, `users/${uid}/username`));
    return snap.exists() ? snap.val() : "Unknown User";
  } catch (err) {
    console.error("Error getting username for", uid, err);
    return "Unknown User";
  }
}

window.completeRegistration = () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const username = document.getElementById("regUsername").value;
  const file = document.getElementById("regPhoto").files[0];
  const preferences = {
    climate: document.getElementById("regClimate").value,
    pace: document.getElementById("regPace").value,
    budget: document.getElementById("regBudget").value,
    activities: document.getElementById("regActivities").value.split(",").map(a => a.trim().toLowerCase())
  };

  createUserWithEmailAndPassword(auth, email, password).then(cred => {
    const uid = cred.user.uid;
    const userRef = ref(db, `users/${uid}`);
    const baseData = { email, username, joined: new Date().toISOString(), preferences };

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
  }).catch(err => {
    console.error("Registration failed:", err);
    alert(err.message);
  });
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
    uploadBytes(photoRef, file)
      .then(() => getDownloadURL(photoRef))
      .then(url => {
        update(userRef, { username, photoURL: url }).then(() => {
          alert("Profile saved!");
          document.getElementById("userPhoto").src = url;
          document.getElementById("headerPhoto").src = url + `?t=${Date.now()}`;
          document.getElementById("headerUsername").textContent = username;
        });
      })
      .catch(err => {
        console.error("Error uploading photo:", err);
        alert("Photo upload failed.");
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
    if (data) {
      document.getElementById("headerUsername").textContent = data.username || "";
      if (data.photoURL) {
        document.getElementById("headerPhoto").src = data.photoURL + `?t=${Date.now()}`;
      }
    }
  }, { onlyOnce: true });
}

window.createLoop = () => {
  const uid = auth.currentUser.uid;
  const loop = {
    title: document.getElementById("loopTitle").value,
    location: document.getElementById("loopLocation").value,
    max: parseInt(document.getElementById("loopMax").value),
    tags: document.getElementById("loopTags").value.split(",").map(t => t.trim().toLowerCase()),
    participants: [uid],
    creator: uid
  };
  push(ref(db, "loops"), loop);
};

window.loadAllLoops = () => {
  const list = document.getElementById("allLoops");
  list.innerHTML = "";
  onValue(ref(db, "loops"), async snap => {
    list.innerHTML = "";
    const promises = [];
    snap.forEach(child => {
      const loop = child.val();
      const key = child.key;
      promises.push(renderLoopItem(loop, key));
    });
    const items = await Promise.all(promises);
    items.forEach(li => list.appendChild(li));
  });
};

async function renderLoopItem(loop, key) {
  const li = document.createElement("li");
  const creatorName = await getUsername(loop.creator);
  const participantNames = await Promise.all((loop.participants || []).map(getUsername));
  li.innerHTML = `<strong>${loop.title}</strong> - ${loop.location}<br>Created by: ${creatorName}<br>Participants: ${participantNames.join(", ")}`;
  if ((loop.participants?.length || 0) >= loop.max) {
    li.innerHTML += "<br><em>All Booked</em>";
  } else if (!loop.participants.includes(auth.currentUser.uid)) {
    const btn = document.createElement("button");
    btn.textContent = "Join";
    btn.onclick = () => joinLoop(key);
    li.appendChild(btn);
  }
  return li;
}
