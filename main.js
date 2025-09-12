// main.js (موديول - يتطلب <script type="module"> في الـ HTML)

// ===== استيراد Firebase (v11 modular) =====
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
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ===== تكوين Firebase =====
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
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// ===== عناصر DOM =====
const loginContainer = document.getElementById("loginBtnContainer");
const likeBtn = document.getElementById("likeBtn");
const likeCountSpan = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");

// ===== مراجع Firestore =====
const postRef = doc(db, "posts", "main-post");
const commentsCol = collection(db, "posts", "main-post", "comments");

// ===== تأكيد وجود المستند الرئيسي =====
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    await setDoc(postRef, { likes: 0, likedBy: [] });
  }
}

// ===== الاستماع للبوست =====
function listenPost() {
  onSnapshot(postRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    
    likeCountSpan.textContent = data.likes ?? 0;
    
    const user = auth.currentUser;
    if (user && Array.isArray(data.likedBy)) {
      likeBtn.classList.toggle("liked", data.likedBy.includes(user.uid));
    } else {
      likeBtn.classList.remove("liked");
    }
  });
}

// ===== الاستماع للتعليقات =====
function listenComments() {
  const q = query(commentsCol, orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    commentsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("comment");
      
      const author = item.authorName || "عضو";
      const created = item.createdAt?.toDate().toLocaleString() || "";
      
      div.innerHTML = `
        <div class="comment-author">
          ${escapeHtml(author)} ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}
        </div>
        <div class="comment-text">${escapeHtml(item.text)}</div>
      `;
      commentsContainer.appendChild(div);
    });
  });
}

// ===== تسجيل الدخول =====
function bindAuthUI() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const name = escapeHtml(user.displayName || "مستخدم");
      loginContainer.innerHTML = `
        <a href="profile.html" class="nav-icon profile-icon">
          <i class="fas fa-user-circle"></i>
          <span>${name}</span>
        </a>
        <button id="signOutBtn" class="auth-btn">خروج</button>
      `;
      document.getElementById("signOutBtn").onclick = () => signOut(auth);
    } else {
      loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
      document.getElementById("googleLoginBtn").onclick = async () => {
        try { await signInWithPopup(auth, provider); } catch (e) { console.error("Login failed:", e); }
      };
    }
  });
}

// ===== زر الإعجاب =====
likeBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    try { await signInWithPopup(auth, provider); } catch { return; }
  }
  const user = auth.currentUser;
  if (!user) return;
  
  const snap = await getDoc(postRef);
  if (!snap.exists()) await setDoc(postRef, { likes: 0, likedBy: [] });
  
  const data = (await getDoc(postRef)).data();
  const already = (data.likedBy || []).includes(user.uid);
  
  if (already) {
    await updateDoc(postRef, { likedBy: arrayRemove(user.uid), likes: increment(-1) });
  } else {
    await updateDoc(postRef, { likedBy: arrayUnion(user.uid), likes: increment(1) });
  }
});

// ===== زر التعليق =====
let commentsVisible = false;
commentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    try { await signInWithPopup(auth, provider); } catch { return; }
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
      if (!txt) return alert("الرجاء كتابة تعليق!");
      
      const user = auth.currentUser;
      await addDoc(commentsCol, {
        authorName: user?.displayName || "عضو",
        authorId: user?.uid || null,
        text: txt,
        createdAt: serverTimestamp()
      });
      inputEl.value = "";
    });
  } else {
    const inputArea = commentsContainer.querySelector(".comment-input-area");
    if (inputArea) inputArea.remove();
    commentsVisible = false;
  }
});

// ===== init =====
(async function init() {
  await ensureDoc();
  listenPost();
  listenComments();
  bindAuthUI();
})();

// ===== escapeHtml =====
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}