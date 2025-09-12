// members.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعداد فايربيز
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const loginContainer = document.getElementById("loginBtnContainer");
const membersList = document.getElementById("membersList");

// === تسجيل الدخول/الخروج في الهيدر ===
function bindAuthButtons() {
  const googleBtn = document.getElementById("googleLoginBtn");
  if (googleBtn) {
    googleBtn.onclick = async () => {
      await signInWithPopup(auth, provider);
    };
  }
  const outBtn = document.getElementById("signOutBtn");
  if (outBtn) {
    outBtn.onclick = async () => {
      await signOut(auth);
    };
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginContainer.innerHTML = `
      <span class="profile-icon">
        <img src="${user.photoURL}" alt="${user.displayName}">
        <span>${user.displayName}</span>
      </span>
      <button id="signOutBtn" class="auth-btn">خروج</button>
    `;
  } else {
    loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
  }
  bindAuthButtons();
});

// === تحميل الأعضاء من فايرستور ===
async function loadMembers() {
  const usersCol = collection(db, "users");
  const snapshot = await getDocs(usersCol);
  membersList.innerHTML = "";
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const memberCard = document.createElement("div");
    memberCard.classList.add("member-card");
    memberCard.innerHTML = `
      <img src="${data.photoURL || 'https://via.placeholder.com/50'}" alt="${data.displayName}" class="member-avatar">
      <div class="member-info">
        <h3>${data.displayName || "مستخدم مجهول"}</h3>
        <p>${data.email || ""}</p>
      </div>
    `;
    membersList.appendChild(memberCard);
  });
}

// === استدعاء عند تحميل الصفحة ===
loadMembers();