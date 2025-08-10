// Firebase config
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعداد Firebase
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

// عناصر HTML
const googleLoginBtn = document.getElementById("googleLoginBtn");
const loginBtnContainer = document.getElementById("loginBtnContainer");
const likeBtn = document.getElementById("likeBtn");
const likeCountEl = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");

let currentUserName = null;

// تسجيل الدخول بجوجل
googleLoginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("خطأ في تسجيل الدخول:", err);
  }
});

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserName = user.displayName;
    loginBtnContainer.innerHTML = `<span>مرحبًا، ${currentUserName}</span>`;
  } else {
    currentUserName = null;
    loginBtnContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
  }
});

// 🔹 الإعجابات
const likeDocRef = doc(db, "likes", "mainMessage");

async function initLikes() {
  const snap = await getDoc(likeDocRef);
  if (!snap.exists()) {
    await setDoc(likeDocRef, { count: 0 });
  }
}

likeBtn.addEventListener("click", async () => {
  await updateDoc(likeDocRef, { count: increment(1) });
});

// تحديث فوري لعدد الإعجابات
onSnapshot(likeDocRef, (docSnap) => {
  if (docSnap.exists()) {
    likeCountEl.textContent = docSnap.data().count || 0;
  }
});

// 🔹 التعليقات
const commentsRef = collection(db, "comments");
const q = query(commentsRef, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  commentsContainer.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const commentEl = document.createElement("div");
    commentEl.className = "comment";
    commentEl.textContent = `${data.username || "مجهول"}: ${data.text}`;
    commentsContainer.appendChild(commentEl);
  });
});

commentBtn.addEventListener("click", async () => {
  const text = prompt("اكتب تعليقك هنا:");
  if (text && text.trim() !== "") {
    await addDoc(commentsRef, {
      text: text.trim(),
      username: currentUserName || "مجهول",
      createdAt: serverTimestamp()
    });
  }
});

// بدء تشغيل الإعجابات
initLikes();