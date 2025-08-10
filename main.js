// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// عناصر HTML
const likeBtn = document.getElementById("likeBtn");
const likeCount = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");
const loginBtnContainer = document.getElementById("loginBtnContainer");

// تسجيل الدخول بجوجل
function loginWithGoogle() {
  signInWithPopup(auth, provider).catch(err => console.error(err));
}

// تسجيل الخروج
function logoutUser() {
  signOut(auth).catch(err => console.error(err));
}

// تحديث واجهة المستخدم
onAuthStateChanged(auth, user => {
  if (user) {
    loginBtnContainer.innerHTML = `
      <span>مرحباً، ${user.displayName}</span>
      <button id="logoutBtn" class="auth-btn">تسجيل الخروج</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
  } else {
    loginBtnContainer.innerHTML = `
      <button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>
    `;
    document.getElementById("googleLoginBtn").addEventListener("click", loginWithGoogle);
  }
});

// مرجع المنشور
const postRef = doc(db, "adminPost", "mainPost");

// زر الإعجاب
likeBtn.addEventListener("click", async () => {
  await updateDoc(postRef, { likes: increment(1) });
});

// عرض الإعجابات مباشرة
onSnapshot(postRef, (docSnap) => {
  if (docSnap.exists()) {
    likeCount.textContent = docSnap.data().likes || 0;
    displayComments(docSnap.data().comments || []);
  }
});

// إضافة تعليق
commentBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("سجل الدخول أولاً قبل التعليق");
    return;
  }
  const commentText = prompt("أدخل تعليقك:");
  if (commentText && commentText.trim() !== "") {
    await updateDoc(postRef, {
      comments: arrayUnion({
        name: user.displayName,
        text: commentText.trim(),
        time: new Date().toISOString()
      })
    });
  }
});

// عرض التعليقات
function displayComments(comments) {
  commentsContainer.innerHTML = comments
    .map(c => `<p><strong>${c.name}:</strong> ${c.text}</p>`)
    .join("");
}