// استيراد Firebase (v11 modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot as onCollectionSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- إعدادات Firebase (حط بيانات مشروعك هنا) ---
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};
// --- تهيئة Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// --- عناصر DOM ---
const loginBtnContainer = document.getElementById("loginBtnContainer");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const likeBtn = document.getElementById("likeBtn");
const likeCount = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");

// --- مرجع البوست الرئيسي ---
const postRef = doc(db, "posts", "main-post");

// --- تأكد إن البوست موجود ---
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    await setDoc(postRef, { likes: 0 });
  }
}

// --- استماع لعدد اللايكات Realtime ---
function listenPost() {
  onSnapshot(postRef, (snap) => {
    if (snap.exists()) {
      likeCount.textContent = snap.data().likes || 0;
    }
  });
}

// --- تحديث اللايكات ---
likeBtn.addEventListener("click", async () => {
  try {
    await updateDoc(postRef, { likes: increment(1) });
  } catch (err) {
    console.error("خطأ في اللايك:", err);
  }
});

// --- مرجع للتعليقات (subcollection) ---
const commentsRef = collection(db, "posts", "main-post", "comments");

// --- إظهار التعليقات Realtime ---
function listenComments() {
  const q = query(commentsRef, orderBy("createdAt", "asc"));
  onCollectionSnapshot(q, (snapshot) => {
    commentsContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const c = doc.data();
      const div = document.createElement("div");
      div.classList.add("comment");
      
      const createdAt = c.createdAt?.toDate ?
        c.createdAt.toDate().toLocaleString() :
        "";
      
      div.innerHTML = `
        <div class="comment-author">
          ${escapeHtml(c.authorName || "عضو")}
          ${createdAt ? `<span class="comment-time">• ${escapeHtml(createdAt)}</span>` : ""}
        </div>
        <div class="comment-text">${escapeHtml(c.text)}</div>
      `;
      commentsContainer.appendChild(div);
    });
  }, (err) => {
    console.error("خطأ في الاستماع للتعليقات:", err);
  });
}

// --- إدخال تعليق جديد ---
let commentsVisible = false;
commentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login required for commenting:", err);
      return;
    }
  }
  
  if (!commentsVisible) {
    const inputArea = document.createElement("div");
    inputArea.classList.add("comment-input-area");
    inputArea.innerHTML = `
      <input type="text" id="newCommentInput" placeholder="اكتب تعليقك هنا..." />
      <button id="addCommentBtn">إضافة تعليق</button>
    `;
    commentsContainer.insertAdjacentElement("afterbegin", inputArea);
    commentsVisible = true;
    
    const addBtn = document.getElementById("addCommentBtn");
    const inputEl = document.getElementById("newCommentInput");
    
    addBtn.addEventListener("click", async () => {
      const txt = inputEl.value.trim();
      if (!txt) {
        alert("الرجاء كتابة تعليق!");
        return;
      }
      
      const user = auth.currentUser;
      const authorName = user ? (user.displayName || "عضو") : "عضو";
      
      addBtn.disabled = true;
      try {
        await addDoc(commentsRef, {
          authorName,
          authorId: user ? user.uid : null,
          text: txt,
          createdAt: serverTimestamp()
        });
        inputEl.value = "";
      } catch (err) {
        console.error("خطأ أثناء إضافة التعليق:", err);
        alert("فشل إرسال التعليق. حاول مرة أخرى.");
      } finally {
        addBtn.disabled = false;
      }
    });
  } else {
    const inputArea = commentsContainer.querySelector(".comment-input-area");
    if (inputArea) inputArea.remove();
    commentsVisible = false;
  }
});

// --- تسجيل الدخول والخروج ---
function bindAuthButtons() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginBtnContainer.innerHTML = `
        <span class="welcome">مرحبًا، ${user.displayName || "عضو"}</span>
        <button id="logoutBtn" class="auth-btn"><i class="fas fa-sign-out-alt"></i> تسجيل الخروج</button>
      `;
      document.getElementById("logoutBtn").addEventListener("click", () => {
        signOut(auth);
      });
    } else {
      loginBtnContainer.innerHTML = `
        <button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>
      `;
      document.getElementById("googleLoginBtn").addEventListener("click", () => {
        signInWithPopup(auth, provider).catch((err) =>
          console.error("Login failed:", err)
        );
      });
    }
  });
}

// --- حماية من XSS ---
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- البداية ---
(async function init() {
  await ensureDoc(); // يتأكد من وجود البوست
  listenPost(); // اللايكات realtime
  listenComments(); // التعليقات realtime
  bindAuthButtons(); // تسجيل الدخول
})();