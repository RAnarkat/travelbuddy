// Firebase setup
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, set, push, onValue, get, update } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_lEYUVD1yP3vdde0JstOz4f3YhEbVaBk",
  authDomain: "loopmates-94b46.firebaseapp.com",
  databaseURL: "https://loopmates-94b46-default-rtdb.firebaseio.com",
  projectId: "loopmates-94b46",
  storageBucket: "loopmates-94b46.firebasestorage.app",
  messagingSenderId: "336997321934",
  appId: "1:336997321934:web:3ffd0f1dbf6b3930e0149f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const usernameInput = document.getElementById("username");
const climateInput = document.getElementById("climate");
const paceInput = document.getElementById("pace");
const budgetInput = document.getElementById("budget");
const activitiesInput = document.getElementById("activities");
const profilePhotoInput = document.getElementById("profilePhoto");
const userPhotoDisplay = document.getElementById("userPhoto");
const headerPhoto = document.getElementById("headerPhoto");
const headerUsername = document.getElementById("headerUsername");

function login() {
  signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value)
    .then(() => location.reload())
    .catch(error => alert(error.message));
}

function register() {
  createUserWithEmailAndPassword(auth, registerEmail.value, registerPassword.value)
    .then(userCredential => {
      const userId = userCredential.user.uid;
      const userRef = ref(database, 'users/' + userId);
      set(userRef, {
        email: registerEmail.value,
        joined: new Date().toISOString()
      }).then(() => location.reload());
    })
    .catch(error => alert(error.message));
}

function logout() {
  signOut(auth).then(() => location.reload());
}

function saveUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = ref(database, 'users/' + user.uid);
  const updates = { username: usernameInput.value };

  if (profilePhotoInput.files.length > 0) {
    const file = profilePhotoInput.files[0];
    const photoRef = storageRef(storage, 'profilePhotos/' + user.uid);
    uploadBytes(photoRef, file).then(() => {
      getDownloadURL(photoRef).then(url => {
        updates.photoURL = url;
        update(userRef, updates);
        userPhotoDisplay.src = url;
        headerPhoto.src = url;
      });
    });
  } else {
    update(userRef, updates);
  }
}

function savePreferences() {
  const user = auth.currentUser;
  if (!user) return;

  const preferencesRef = ref(database, 'users/' + user.uid + '/preferences');
  const preferences = {
    climate: climateInput.value,
    pace: paceInput.value,
    budget: budgetInput.value,
    activities: activitiesInput.value.split(',').map(a => a.trim())
  };
  set(preferencesRef, preferences);
}

function createLoop() {
  const user = auth.currentUser;
  if (!user) return;

  const loopsRef = ref(database, 'loops');
  const newLoopRef = push(loopsRef);
  set(newLoopRef, {
    creator: user.uid,
    participants: [user.uid]
  });
}

function displayAllLoops() {
  const loopsRef = ref(database, 'loops');
  const container = document.getElementById("allLoops");
  container.innerHTML = '';

  onValue(loopsRef, snapshot => {
    container.innerHTML = '';
    snapshot.forEach(child => {
      const loop = child.val();
      const loopDiv = document.createElement("div");
      loopDiv.innerHTML = `
        <p><strong>Loop</strong> by ${loop.creator}</p>
        <p>Participants: ${loop.participants?.join(', ')}</p>
        <button onclick="joinLoop('${child.key}')">Join</button>
        <hr>
      `;
      container.appendChild(loopDiv);
    });
  });
}

function joinLoop(loopId) {
  const user = auth.currentUser;
  if (!user) return;
  const participantsRef = ref(database, 'loops/' + loopId + '/participants');
  get(participantsRef).then(snapshot => {
    const current = snapshot.val() || [];
    if (!current.includes(user.uid)) {
      current.push(user.uid);
      set(participantsRef, current);
    }
  });
}

function displayMyLoops() {
  const user = auth.currentUser;
  if (!user) return;
  const container = document.getElementById("myLoops");
  const loopsRef = ref(database, 'loops');

  onValue(loopsRef, snapshot => {
    container.innerHTML = '';
    snapshot.forEach(child => {
      const loop = child.val();
      if (loop.creator === user.uid) {
        const div = document.createElement("div");
        div.textContent = `Loop ID: ${child.key}`;
        container.appendChild(div);
      }
    });
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    showTab("allLoopsTab");
    document.getElementById("authTabs").style.display = "none";
    const userRef = ref(database, 'users/' + user.uid);
    onValue(userRef, snapshot => {
      const data = snapshot.val();
      if (data?.username) headerUsername.textContent = data.username;
      if (data?.photoURL) headerPhoto.src = data.photoURL;
    });
    displayAllLoops();
    displayMyLoops();
  }
});

// Make functions accessible globally
window.login = login;
window.register = register;
window.logout = logout;
window.saveUserProfile = saveUserProfile;
window.savePreferences = savePreferences;
window.createLoop = createLoop;
window.joinLoop = joinLoop;
