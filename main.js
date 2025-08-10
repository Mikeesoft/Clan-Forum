// استيراد Firebase (v11 modular)
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
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ======= تكوين Firebase ======= */
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

/* ======= عناصر الـ DOM ======= */
const loginContainer = document.getElementById("loginBtnContainer");
const likeBtn = document.getElementById("likeBtn");
const likeCountSpan = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");

/* ======= مرجع الوثيقة ======= */
const postRef = doc(db, "posts", "main-post");

/* ======= تهيئة الوثيقة إذا مش موجودة ======= */
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    await setDoc(postRef, { likes: 0, likedBy: [], comments: [] });
  }
}

/* ======= عرض البيانات لحظيًا ======= */
function listenPost() {
  onSnapshot(postRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    
    // تحديث الإعجابات
    likeCountSpan.textContent = data.likes ?? 0;
    
    const user = auth.currentUser;
    if (user && Array.isArray(data.likedBy) && data.likedBy.includes(user.uid)) {
      likeBtn.classList.add("liked");
    } else {
      likeBtn.classList.remove("liked");
    }
    
    // عرض التعليقات
    commentsContainer.innerHTML = "";
    (data.comments || []).forEach(item => {
      const div = document.createElement("div");
      div.classList.add("comment");
      if (typeof item === "object" && item.text) {
        const author = item.authorName || "عضو";
        const created = item.createdAt?.seconds ?
          new Date(item.createdAt.seconds * 1000).toLocaleString() :
          "";
        div.innerHTML = `
          <div class="comment-author">${escapeHtml(author)} 
            ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}
          </div>
          <div class="comment-text">${escapeHtml(item.text)}</div>
        `;
      }
      commentsContainer.appendChild(div);
    });
  });
}

/* ======= تسجيل الدخول ======= */
function renderLoginButton() {
  loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
  document.getElementById("googleLoginBtn").addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(console.error);
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginContainer.innerHTML = `
      <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
        <i class="fas fa-user-circle"></i>
        <span>${escapeHtml(user.displayName || "ملفي الشخصي")}</span>
      </a>
    `;
  } else {
    renderLoginButton();
  }
});

/* ======= الإعجاب ======= */
likeBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    await signInWithPopup(auth, provider).catch(console.error);
    if (!auth.currentUser) return;
  }
  
  const data = (await getDoc(postRef)).data();
  const likedBy = data.likedBy || [];
  const alreadyLiked = likedBy.includes(auth.currentUser.uid);
  
  if (alreadyLiked) {
    await updateDoc(postRef, {
      likedBy: arrayRemove(auth.currentUser.uid),
      likes: increment(-1)
    });
  } else {
    await updateDoc(postRef, {
      likedBy: arrayUnion(auth.currentUser.uid),
      likes: increment(1)
    });
  }
});

/* ======= التعليقات ======= */
let inputVisible = false;
commentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    await signInWithPopup(auth, provider).catch(console.error);
    if (!auth.currentUser) return;
  }
  
  if (!inputVisible) {
    const inputArea = document.createElement("div");
    inputArea.classList.add("comment-input-area");
    inputArea.innerHTML = `
      <input type="text" id="newCommentInput" placeholder="اكتب تعليقك..." />
      <button id="addCommentBtn">إضافة</button>
    `;
    commentsContainer.insertAdjacentElement("afterbegin", inputArea);
    inputVisible = true;
    
    document.getElementById("addCommentBtn").addEventListener("click", async () => {
      const txt = document.getElementById("newCommentInput").value.trim();
      if (!txt) return;
      
      await updateDoc(postRef, {
        comments: arrayUnion({
          authorName: auth.currentUser.displayName || "عضو",
          authorId: auth.currentUser.uid,
          text: txt,
          createdAt: serverTimestamp()
        })
      });
      document.getElementById("newCommentInput").value = "";
    });
  } else {
    document.querySelector(".comment-input-area")?.remove();
    inputVisible = false;
  }
});

/* ======= تشغيل ======= */
(async function init() {
  await ensureDoc();
  listenPost();
})();

/* ======= حماية النصوص من XSS ======= */
function escapeHtml(unsafe) {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}