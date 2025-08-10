// استيراد Firebase (v11)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// إعدادات Firebase الخاصة بك
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
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// المتغيرات
const likeBtn = document.getElementById("likeBtn");
const likeCountEl = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");
const loginBtnContainer = document.getElementById("loginBtnContainer");

let currentUser = null;
const postId = "main-post";
const postRef = doc(db, "posts", postId);

// تسجيل الدخول بجوجل
document.getElementById("googleLoginBtn")?.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(console.error);
});

// التحقق من تسجيل الدخول
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

// عرض البيانات لحظيًا
onSnapshot(postRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    likeCountEl.textContent = data.likes?.length || 0;
    commentsContainer.innerHTML = "";
    (data.comments || []).forEach(c => {
      const div = document.createElement("div");
      div.classList.add("comment");
      div.innerHTML = `<strong>${c.user}</strong>: ${c.text}`;
      commentsContainer.appendChild(div);
    });
  } else {
    // إنشاء المستند لو مش موجود
    setDoc(postRef, { likes: [], comments: [] });
  }
});

// الإعجاب
likeBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("سجّل الدخول أولاً.");
    return;
  }
  const snap = await getDoc(postRef);
  if (snap.exists()) {
    const likes = snap.data().likes || [];
    if (!likes.includes(currentUser.uid)) {
      await updateDoc(postRef, {
        likes: arrayUnion(currentUser.uid)
      });
    }
  }
});

// التعليق
commentBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("سجّل الدخول أولاً.");
    return;
  }
  const text = prompt("اكتب تعليقك:");
  if (text && text.trim()) {
    await updateDoc(postRef, {
      comments: arrayUnion({
        user: currentUser.displayName,
        text: text.trim(),
        time: Date.now()
      })
    });
  }
});