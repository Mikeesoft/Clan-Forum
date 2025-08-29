// استيراد Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// تسجيل الدخول
const loginBtnContainer = document.getElementById("loginBtnContainer");
const provider = new GoogleAuthProvider();

document.getElementById("googleLoginBtn").addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(console.error);
});

// متابعة حالة تسجيل الدخول
let currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginBtnContainer.innerHTML = `<span>مرحبًا، ${user.displayName}</span>`;
  } else {
    currentUser = null;
    loginBtnContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
    document.getElementById("googleLoginBtn").addEventListener("click", () => {
      signInWithPopup(auth, provider).catch(console.error);
    });
  }
});

// إضافة تعليق
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");

commentBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("يجب تسجيل الدخول أولاً");
    return;
  }

  const commentText = prompt("اكتب تعليقك:");
  if (!commentText) return;

  try {
    await addDoc(collection(db, "comments"), {
      text: commentText,
      user: currentUser.displayName,
      uid: currentUser.uid,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("خطأ في إضافة التعليق:", err);
  }
});

// عرض التعليقات لحظيًا
const q = query(collection(db, "comments"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  commentsContainer.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<strong>${data.user}:</strong> ${data.text}`;
    commentsContainer.appendChild(div);
  });
});