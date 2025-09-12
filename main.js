// main.js (نسخة نهائية - تسجيل + لايك toggle + تعليقات + شات متزامن)

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
  runTransaction,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ====== تكوين Firebase ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

/* ====== تهيئة Firebase ====== */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

/* ====== عناصر DOM ====== */
const loginContainer = document.getElementById("loginBtnContainer");
const likeBtn = document.getElementById("likeBtn");
const likeCountSpan = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");
const chatBtn = document.getElementById("chatBtn");
const chatWindow = document.getElementById("chatWindow");
const closeChat = document.getElementById("closeChat");
const sendMsg = document.getElementById("sendMsg");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

/* ====== مراجع Firestore ====== */
const postRef = doc(db, "posts", "main-post");
const commentsCol = collection(db, "posts", "main-post", "comments");
const messagesCol = collection(db, "messages");

/* ====== Toast Notification ====== */
function showToast(msg, type = "error") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: type === "error" ? "#e74c3c" : "#2ecc71",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 9999,
    opacity: "0",
    transition: "opacity 0.3s ease"
  });
  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "1"), 50);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ====== تأكيد وجود المستند الرئيسي ====== */
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    await setDoc(postRef, { likes: 0, likedBy: [] });
  }
}

/* ====== الاستماع للبوست ====== */
function listenPost() {
  onSnapshot(postRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    likeCountSpan.textContent = data.likes ?? 0;

    const user = auth.currentUser;
    if (user && Array.isArray(data.likedBy) && data.likedBy.includes(user.uid)) {
      likeBtn.classList.add("liked");
    } else {
      likeBtn.classList.remove("liked");
    }
  }, () => showToast("فشل استلام تحديثات اللايكات"));
}

/* ====== Toggle Like ====== */
if (likeBtn) {
  likeBtn.addEventListener("click", async () => {
    if (!auth.currentUser) {
      try { await signInWithPopup(auth, provider); } 
      catch { return showToast("يجب تسجيل الدخول أولاً."); }
    }
    const user = auth.currentUser;
    if (!user) return;
    likeBtn.disabled = true;

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(postRef);
        if (!snap.exists()) {
          tx.set(postRef, { likes: 1, likedBy: [user.uid] });
          return;
        }
        const data = snap.data();
        const likedBy = Array.isArray(data.likedBy) ? [...data.likedBy] : [];
        if (likedBy.includes(user.uid)) {
          tx.update(postRef, {
            likedBy: likedBy.filter(id => id !== user.uid),
            likes: Math.max((data.likes || 1) - 1, 0)
          });
        } else {
          likedBy.push(user.uid);
          tx.update(postRef, {
            likedBy,
            likes: (data.likes || 0) + 1
          });
        }
      });
    } catch {
      showToast("خطأ أثناء تحديث الإعجاب.");
    } finally {
      likeBtn.disabled = false;
    }
  });
}

/* ====== التعليقات مع Load More ====== */
let lastVisible = null;
const COMMENTS_LIMIT = 2;

async function loadComments(initial = false) {
  let q = query(commentsCol, orderBy("createdAt", "asc"), limit(COMMENTS_LIMIT));
  if (lastVisible && !initial) {
    q = query(commentsCol, orderBy("createdAt", "asc"), startAfter(lastVisible), limit(COMMENTS_LIMIT));
  }

  onSnapshot(q, (snapshot) => {
    if (initial) commentsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      lastVisible = docSnap;
      const item = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("comment");
      const author = item.authorName || "عضو";
      let created = "";
      if (item.createdAt?.toDate) created = item.createdAt.toDate().toLocaleString();

      div.innerHTML = `
        <div class="comment-author">${escapeHtml(author)} ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}</div>
        <div class="comment-text">${linkify(escapeHtml(item.text))}</div>
      `;
      commentsContainer.appendChild(div);
    });

    if (snapshot.size === COMMENTS_LIMIT) {
      const loadBtn = document.createElement("button");
      loadBtn.textContent = "عرض المزيد";
      loadBtn.className = "load-more-btn";
      loadBtn.onclick = () => loadComments(false);
      commentsContainer.appendChild(loadBtn);
    }
  });
}

/* ====== منع تكرار صندوق التعليق ====== */
commentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    try { 
      await signInWithPopup(auth, provider); 
    } catch { 
      return showToast("يجب تسجيل الدخول للتعليق."); 
    }
  }

  if (document.querySelector(".comment-input-area")) return;

  const inputArea = document.createElement("div");
  inputArea.className = "comment-input-area";
  inputArea.innerHTML = `
    <input type="text" id="newCommentInput" placeholder="اكتب تعليقك هنا..." />
    <button id="addCommentBtn">إضافة تعليق</button>
  `;
  commentsContainer.insertAdjacentElement("afterbegin", inputArea);

  document.getElementById("addCommentBtn").onclick = async () => {
    const txt = document.getElementById("newCommentInput").value.trim();
    if (!txt) return showToast("الرجاء كتابة تعليق!");
    try {
      const user = auth.currentUser;
      await addDoc(commentsCol, {
        authorName: user?.displayName || "عضو",
        authorId: user?.uid || null,
        text: txt,
        createdAt: serverTimestamp()
      });
      document.getElementById("newCommentInput").value = "";
      showToast("تمت إضافة التعليق", "success");
    } catch {
      showToast("فشل إرسال التعليق");
    }
  };
});

/* ====== Auth UI ====== */
function bindAuthUI() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const name = escapeHtml(user.displayName || "مستخدم");
      const photo = user.photoURL
        ? `<img src="${user.photoURL}" alt="${name}" style="width:28px;height:28px;border-radius:50%;margin-inline-end:8px;">`
        : `<i class="fas fa-user-circle" style="margin-inline-end:8px;"></i>`;
      loginContainer.innerHTML = `
        <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
          ${photo}<span>${name}</span>
        </a>
        <button id="signOutBtn" class="auth-btn">خروج</button>
      `;
      document.getElementById("signOutBtn").onclick = () => signOut(auth);
    } else {
      loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
      document.getElementById("googleLoginBtn").onclick = () => signInWithPopup(auth, provider);
    }
  });
}

/* ====== Helpers ====== */
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank">${url}</a>`);
}

/* ====== Chat ====== */
chatBtn.addEventListener("click", () => {
  chatWindow.style.display =
    chatWindow.style.display === "flex" ? "none" : "flex";
});
closeChat.addEventListener("click", () => {
  chatWindow.style.display = "none";
});

function addMessage(text, type = "sent", avatar = "user.jpg") {
  const msg = document.createElement("div");
  msg.classList.add("msg", type);

  msg.innerHTML = `
    ${type === "received" ? `<div class="avatar"><img src="${avatar}" alt=""></div>` : ""}
    <div class="bubble">${text}</div>
    ${type === "sent" ? `<div class="avatar"><img src="${avatar}" alt=""></div>` : ""}
  `;

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(text) {
  if (!auth.currentUser) {
    try { await signInWithPopup(auth, provider); }
    catch { return showToast("سجّل دخولك أولاً"); }
  }

  const user = auth.currentUser;
  await addDoc(messagesCol, {
    text,
    userId: user.uid,
    userName: user.displayName || "عضو",
    userPhoto: user.photoURL || "user.jpg",
    createdAt: serverTimestamp()
  });
}

sendMsg.addEventListener("click", () => {
  const txt = chatInput.value.trim();
  if (!txt) return;
  sendMessage(txt);
  chatInput.value = "";
});
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMsg.click();
  }
});

function listenMessages() {
  const q = query(messagesCol, orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const currentUser = auth.currentUser?.uid;
      const type = msg.userId === currentUser ? "sent" : "received";
      const avatar = msg.userPhoto || "user.jpg";
      addMessage(escapeHtml(msg.text), type, avatar);
    });
  });
}

/* ====== init ====== */
(async function init() {
  await ensureDoc();
  listenPost();
  bindAuthUI();
  loadComments(true);
  listenMessages();
})();