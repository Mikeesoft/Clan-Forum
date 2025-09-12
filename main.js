// main.js (موديول - متكامل للتسجيل + لايك toggle + تعليقات subcollection)

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
  onSnapshot,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ====== تكوين Firebase (استبدل بالقيم الخاصة بمشروعك لو مختلفة) ====== */
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

/* ====== مراجع Firestore ====== */
const postRef = doc(db, "posts", "main-post"); // مستند رئيسي للبوست
const commentsCol = collection(db, "posts", "main-post", "comments"); // subcollection للتعليقات

/* ====== دالة إظهار أخطاء مبسطة على الصفحة (يساعد لو مش شايف الـ Console) ====== */
function showErrorOnPage(msg) {
  let el = document.getElementById("chatgpt-error-box");
  if (!el) {
    el = document.createElement("div");
    el.id = "chatgpt-error-box";
    Object.assign(el.style, {
      position: "fixed",
      left: "10px",
      bottom: "10px",
      background: "#f44336",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "8px",
      zIndex: 9999,
      boxShadow: "0 4px 14px rgba(0,0,0,0.25)"
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  setTimeout(() => { if (el) el.remove(); }, 6000);
}

/* ====== تأكيد وجود المستند الرئيسي ====== */
async function ensureDoc() {
  try {
    const snap = await getDoc(postRef);
    if (!snap.exists()) {
      await setDoc(postRef, { likes: 0, likedBy: [] });
    } else {
      // ضمان تواجد الحقول الأساسية
      const data = snap.data();
      const updates = {};
      if (typeof data.likes === "undefined") updates.likes = 0;
      if (!Array.isArray(data.likedBy)) updates.likedBy = [];
      if (Object.keys(updates).length) await updateDoc(postRef, updates);
    }
  } catch (err) {
    console.error("ensureDoc error:", err);
    showErrorOnPage("خطأ في الاتصال بقاعدة البيانات عند التهيئة.");
  }
}

/* ====== الاستماع للبوست (عدد اللايكات وحالة الزر) ====== */
function listenPost() {
  onSnapshot(postRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    likeCountSpan.textContent = data.likes ?? 0;

    const user = auth.currentUser;
    if (user && Array.isArray(data.likedBy)) {
      if (data.likedBy.includes(user.uid)) {
        likeBtn.classList.add("liked");
        likeBtn.setAttribute("aria-pressed", "true");
      } else {
        likeBtn.classList.remove("liked");
        likeBtn.setAttribute("aria-pressed", "false");
      }
    } else {
      likeBtn.classList.remove("liked");
      likeBtn.setAttribute("aria-pressed", "false");
    }
  }, (err) => {
    console.error("listenPost onSnapshot error:", err);
    showErrorOnPage("فشل استلام تحديثات اللايكات.");
  });
}

/* ====== وظيفة اللايك (toggle باستخدام transaction لسلامة التحديث) ====== */
if (likeBtn) {
  likeBtn.addEventListener("click", async () => {
    // نحتاج المستخدم مسجل
    if (!auth.currentUser) {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("Login required:", err);
        showErrorOnPage("يجب تسجيل الدخول أولاً.");
        return;
      }
    }

    const user = auth.currentUser;
    if (!user) return;

    likeBtn.disabled = true;

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(postRef);
        if (!snap.exists()) {
          // إذا المستند مش موجود، نعمله مع لايك واحد
          transaction.set(postRef, { likes: 1, likedBy: [user.uid] });
          return;
        }
        const data = snap.data();
        const likedBy = Array.isArray(data.likedBy) ? [...data.likedBy] : [];
        const already = likedBy.includes(user.uid);

        if (already) {
          // إلغاء الإعجاب
          const newLiked = likedBy.filter(id => id !== user.uid);
          const newLikes = Math.max((data.likes || 1) - 1, 0);
          transaction.update(postRef, { likedBy: newLiked, likes: newLikes });
        } else {
          // إضافة إعجاب
          likedBy.push(user.uid);
          const newLikes = (data.likes || 0) + 1;
          transaction.update(postRef, { likedBy: likedBy, likes: newLikes });
        }
      });
    } catch (err) {
      console.error("Error toggling like:", err);
      // أهم خطأ محتمل: permission-denied
      if (err && err.code && err.code.includes("permission")) {
        showErrorOnPage("صلاحيات Firestore تمنع التعديل — راجع قواعد الأمان.");
      } else {
        showErrorOnPage("حدث خطأ أثناء تغيير حالة الإعجاب.");
      }
    } finally {
      likeBtn.disabled = false;
    }
  });
}

/* ====== التعليقات (subcollection) ====== */
// الاستماع للتعليقات realtime
function listenComments() {
  const q = query(commentsCol, orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    commentsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("comment");

      const author = item.authorName || "عضو";
      let created = "";
      if (item.createdAt && typeof item.createdAt.toDate === "function") {
        created = item.createdAt.toDate().toLocaleString();
      }

      div.innerHTML = `<div class="comment-author">${escapeHtml(author)} ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}</div>
                       <div class="comment-text">${escapeHtml(item.text)}</div>`;
      commentsContainer.appendChild(div);
    });
  }, (err) => {
    console.error("خطأ في الاستماع للتعليقات:", err);
    showErrorOnPage("فشل استلام التعليقات — تفقد قواعد الأمان أو الاتصال.");
  });
}

// إضافة تعليق جديد (يفتح حقل الإدخال ويضيف عبر addDoc)
let commentsVisible = false;
commentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login required for commenting:", err);
      showErrorOnPage("يجب تسجيل الدخول للتعليق.");
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
      addBtn.disabled = true;

      try {
        const user = auth.currentUser;
        await addDoc(commentsCol, {
          authorName: user ? user.displayName || "عضو" : "عضو",
          authorId: user ? user.uid : null,
          text: txt,
          createdAt: serverTimestamp()
        });
        inputEl.value = "";
      } catch (err) {
        console.error("خطأ أثناء إضافة التعليق:", err);
        if (err.code && err.code.includes("permission")) {
          showErrorOnPage("صلاحيات Firestore تمنع إضافة التعليقات — راجع قواعد الأمان.");
        } else {
          showErrorOnPage("فشل إرسال التعليق.");
        }
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

/* ====== تسجيل الدخول / واجهة المستخدم ====== */
function bindAuthUI() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const name = escapeHtml(user.displayName || "مستخدم");
      const photo = user.photoURL ? `<img src="${user.photoURL}" alt="${name}" style="width:28px;height:28px;border-radius:50%;margin-inline-end:8px;">` : `<i class="fas fa-user-circle" style="margin-inline-end:8px;"></i>`;
      loginContainer.innerHTML = `
        <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
          ${photo}
          <span>${name}</span>
        </a>
        <button id="signOutBtn" class="auth-btn" title="تسجيل الخروج">خروج</button>
      `;
      const outBtn = document.getElementById("signOutBtn");
      if (outBtn) outBtn.onclick = () => signOut(auth);
    } else {
      loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
      const googleBtn = document.getElementById("googleLoginBtn");
      if (googleBtn) googleBtn.onclick = async () => {
        try { await signInWithPopup(auth, provider); } catch (e) { console.error("Login failed:", e); showErrorOnPage("فشل تسجيل الدخول."); }
      };
    }
  });
}

/* ====== دالة مساعدة لتجنّب XSS ====== */
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ====== init ====== */
(async function init() {
  await ensureDoc();
  listenPost();
  listenComments();
  bindAuthUI();
})();