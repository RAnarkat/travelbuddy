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

const showTab = (id) => {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("visible"));
  document.getElementById(id).classList.add("visible");
};

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("navBar").style.display = "flex";
    showTab("loopTab");
    loadLoops();
    loadMyLoops();
    matchLoopsAI();
    loadUserProfile();
  } else {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("navBar").style.display = "none";
    showTab("authSection");
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
  createUserWithEmailAndPassword(auth, email, password).then(cred => {
    const userRef = ref(db, `users/${cred.user.uid}`);
    set(userRef, {
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

window.saveUserProfile = () => {
  const uid = auth.currentUser.uid;
  const username = document.getElementById("username").value;
  const photo = document.getElementById("profilePhoto").files[0];
  if (photo) {
    const photoRef = storageRef(storage, `profiles/${uid}`);
    uploadBytes(photoRef, photo).then(() => {
      getDownloadURL(photoRef).then(url => {
        update(ref(db, `users/${uid}`), { username, photoURL: url });
        document.getElementById("userPhoto").src = url;
      });
    });
  } else {
    update(ref(db, `users/${uid}`), { username });
  }
};

window.loadUserProfile = () => {
  const uid = auth.currentUser.uid;
  onValue(ref(db, `users/${uid}`), snap => {
    const user = snap.val();
    if (user) {
      document.getElementById("username").value = user.username || "";
      document.getElementById("userPhoto").src = user.photoURL || "";
      if (user.preferences) {
        document.getElementById("prefClimate").value = user.preferences.climate || "";
        document.getElementById("prefPace").value = user.preferences.pace || "";
        document.getElementById("prefBudget").value = user.preferences.budget || "";
        document.getElementById("prefActivities").value = user.preferences.activities?.join(", ") || "";
      }
    }
  });
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

window.loadLoops = () => {
  const list = document.getElementById("allLoops");
  list.innerHTML = "";
  onValue(ref(db, "loops"), snapshot => {
    list.innerHTML = "";
    snapshot.forEach(child => {
      const loop = child.val();
      const li = document.createElement("li");
      li.textContent = `${loop.title} (${loop.location})`;
      list.appendChild(li);
    });
  });
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
  const loopRef = ref(db, `loops/${loopId}`);
  onValue(loopRef, snap => {
    const loop = snap.val();
    if (!loop || loop.participants?.includes(auth.currentUser.uid)) return;
    const updated = loop.participants || [];
    updated.push(auth.currentUser.uid);
    set(ref(db, `loops/${loopId}/participants`), updated);
  }, { onlyOnce: true });
};
