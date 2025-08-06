// FULL app.js (All Features + Debug Logs)
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

console.log("Firebase initialized");

function showTab(tabName) {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => tab.style.display = "none");
  document.getElementById(tabName).style.display = "block";
}

onAuthStateChanged(auth, user => {
  if (user) {
    showTab("mainTabs");
    loadLoops();
    loadUserDisplay();
  } else {
    showTab("authTabs");
  }
});

window.login = () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  signInWithEmailAndPassword(auth, email, password)
    .catch(err => alert("Login failed: " + err.message));
};

window.register = () => {
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(userCred => {
      set(ref(db, `users/${userCred.user.uid}`), {
        email,
        joined: new Date().toISOString()
      });
    })
    .catch(err => alert("Registration failed: " + err.message));
};

window.logout = () => signOut(auth);

window.saveUserProfile = () => {
  const uid = auth.currentUser.uid;
  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePhoto").files[0];
  const userRef = ref(db, `users/${uid}`);

  if (file) {
    console.log("Uploading profile photo...");
    const photoRef = sRef(storage, `profiles/${uid}`);
    uploadBytes(photoRef, file)
      .then(() => getDownloadURL(photoRef))
      .then(url => {
        console.log("Got download URL:", url);
        return update(userRef, { username, photoURL: url });
      })
      .then(() => {
        alert("Profile saved with photo!");
        document.getElementById("userPhoto").src = photoURL;
        document.getElementById("headerPhoto").src = photoURL + `?t=${Date.now()}`;
        document.getElementById("headerUsername").textContent = username;
      })
      .catch(err => {
        console.error("Photo upload failed:", err);
        alert("Photo upload failed: " + err.message);
      });
  } else {
    update(userRef, { username }).then(() => {
      alert("Profile saved without photo.");
      document.getElementById("headerUsername").textContent = username;
    });
  }
};

function loadUserDisplay() {
  const uid = auth.currentUser.uid;
  const userRef = ref(db, `users/${uid}`);
  get(userRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log("User data loaded:", data);
      if (data.username) document.getElementById("headerUsername").textContent = data.username;
      if (data.photoURL) {
        document.getElementById("userPhoto").src = data.photoURL;
        document.getElementById("headerPhoto").src = data.photoURL + `?t=${Date.now()}`;
      }
    }
  });
}

window.savePreferences = () => {
  const uid = auth.currentUser.uid;
  const preferences = {
    climate: document.getElementById("climate").value,
    pace: document.getElementById("pace").value,
    budget: document.getElementById("budget").value,
    activities: document.getElementById("activities").value.split(',').map(a => a.trim())
  };
  update(ref(db, `users/${uid}/preferences`), preferences).then(() => alert("Preferences saved."));
};

window.createLoop = () => {
  const uid = auth.currentUser.uid;
  const loopData = {
    creator: uid,
    timestamp: Date.now(),
    participants: [uid]
  };
  push(ref(db, "loops"), loopData).then(() => alert("Loop created."));
};

function loadLoops() {
  onValue(ref(db, "loops"), snap => {
    const allLoops = document.getElementById("allLoops");
    allLoops.innerHTML = "";
    const loops = snap.val();
    for (let id in loops) {
      const loop = loops[id];
      const div = document.createElement("div");
      div.innerHTML = `<strong>Loop</strong> by ${getUsername(loop.creator)}<br>Participants: ${loop.participants.map(getUsername).join(", ")}<br><button onclick="joinLoop('${id}')">Join</button>`;
      allLoops.appendChild(div);
    }
  });
}

function getUsername(uid) {
  const userRef = ref(db, `users/${uid}`);
  return get(userRef).then(snap => {
    const data = snap.val();
    return data?.username || data?.email || "Unknown";
  });
}

window.joinLoop = id => {
  const uid = auth.currentUser.uid;
  const loopRef = ref(db, `loops/${id}`);
  get(loopRef).then(snap => {
    const loop = snap.val();
    if (loop.participants.includes(uid)) {
      alert("Already joined this loop.");
    } else {
      loop.participants.push(uid);
      update(loopRef, { participants: loop.participants });
    }
  });
};
