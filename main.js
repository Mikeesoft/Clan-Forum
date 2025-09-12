// main.js (موديول - يتطلب <script type="module"> في الـ HTML)

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
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ======= تكوين Firebase ======= */
/* إذا كانت بياناتك مختلفة غيّرها هنا */
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

/* ======= مرجع الوثيقة في Firestore ======= */
const postRef = doc(db, "posts", "main-post"); // collection: posts , doc id: main-post

/* ======= تهيئة الوثيقة إذا مش موجودة ======= */
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    await setDoc(postRef, { likes: 0, likedBy: [], comments: [] });
  }
}

/* ======= دالة لربط زر تسجيل الدخول عند تغيّر الـ DOM داخل loginContainer ======= */
function bindAuthButtons() {
  // زر تسجيل الدخول (قد يظهر/يُعاد إنشاؤه من onAuthStateChanged)
  const googleBtn = document.getElementById("googleLoginBtn");
  if (googleBtn) {
    googleBtn.onclick = async () => {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("فشل تسجيل الدخول:", err);
        alert("حصل خطأ أثناء تسجيل الدخول.");
      }
    };
  }
  
  // زر الخروج لو ظهر
  const outBtn = document.getElementById("signOutBtn");
  if (outBtn) {
    outBtn.onclick = async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("خطأ في تسجيل الخروج:", err);
      }
    };
  }
}

/* ======= عرض البيانات عند التغيير (Realtime) ======= */
function listenPost() {
  onSnapshot(postRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    
    // تحديث عدد الإعجابات
    likeCountSpan.textContent = data.likes ?? 0;
    
    // تفعيل/تعطيل حالة الزر بناءً على ما إذا المستخدم ضاغط إعجاب أو لا
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
    
    // عرض التعليقات مع التحقق من الطابع الزمني بأمان
    commentsContainer.innerHTML = "";
    const comments = data.comments || [];
    comments.forEach(item => {
      const div = document.createElement("div");
      div.classList.add("comment");
      
      if (typeof item === "string") {
        div.innerHTML = `<div class="comment-author">عضو</div><div class="comment-text">${escapeHtml(item)}</div>`;
      } else if (typeof item === "object" && item.text) {
        const author = item.authorName || "عضو";
        
        // التعامل الآمن مع serverTimestamp
        let created = "";
        if (item.createdAt && typeof item.createdAt.toDate === "function") {
          created = item.createdAt.toDate().toLocaleString();
        } else if (item.createdAt && item.createdAt.seconds) {
          created = new Date(item.createdAt.seconds * 1000).toLocaleString();
        }
        
        div.innerHTML = `<div class="comment-author">${escapeHtml(author)} ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}</div>
                         <div class="comment-text">${escapeHtml(item.text)}</div>`;
      }
      
      commentsContainer.appendChild(div);
    });
  }, (err) => {
    console.error("خطأ في الاستماع لبيانات المنشور:", err);
  });
}

/* ======= تابع تسجيل الدخول: نعرض اسم المستخدم أو زر الدخول ======= */
onAuthStateChanged(auth, (user) => {
  if (user) {
    // عرض اسم المستخدم + صورة مصغرة + زر خروج
    const name = escapeHtml(user.displayName || "ملفي الشخصي");
    const photo = user.photoURL ? `<img src="${user.photoURL}" alt="${name}" style="width:28px;height:28px;border-radius:50%;margin-inline-end:8px;">` : `<i class="fas fa-user-circle" style="margin-inline-end:8px;"></i>`;
    
    loginContainer.innerHTML = `
      <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
        ${photo}
        <span>${name}</span>
      </a>
      <button id="signOutBtn" class="auth-btn" title="تسجيل الخروج">خروج</button>
    `;
    
    // حفظ اسم المستخدم محلياً (اختياري)
    try { localStorage.setItem("username", user.displayName || ""); } catch (e) { /* ignore */ }
    
  } else {
    loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
  }
  
  // بعد تغيير الـ innerHTML نربط الأزرار
  bindAuthButtons();
});

/* ======= وظيفة الإعجاب (باستخدام transaction لتجنب TOCTOU) ======= */
if (likeBtn) {
  likeBtn.addEventListener("click", async () => {
    // نطلب تسجيل الدخول أولاً لو مش مسجل
    if (!auth.currentUser) {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("Login required:", err);
        return;
      }
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    // تعطيل الزر أثناء العملية
    likeBtn.disabled = true;
    
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(postRef);
        if (!snap.exists()) {
          transaction.set(postRef, { likes: 1, likedBy: [user.uid], comments: [] });
          return;
        }
        
        const data = snap.data();
        const likedBy = Array.isArray(data.likedBy) ? [...data.likedBy] : [];
        const already = likedBy.includes(user.uid);
        
        if (already) {
          // إزالة
          const newLiked = likedBy.filter(id => id !== user.uid);
          const newLikes = (data.likes || 1) - 1;
          transaction.update(postRef, { likedBy: newLiked, likes: newLikes < 0 ? 0 : newLikes });
        } else {
          // إضافة
          likedBy.push(user.uid);
          const newLikes = (data.likes || 0) + 1;
          transaction.update(postRef, { likedBy: likedBy, likes: newLikes });
        }
      });
    } catch (err) {
      console.error("Error toggling like:", err);
      alert("فشل تغيير حالة الإعجاب — تأكد من الاتصال أو افتح Console.");
    } finally {
      likeBtn.disabled = false;
    }
  });
}

/* ======= وظيفة التعليقات (مع تحقّق وخطأ أفضل) ======= */
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
        // نضيف التعليق ككائن مع اسم المؤلف ووقت الخادم
        await updateDoc(postRef, {
          comments: [...((await getDoc(postRef)).data().comments || []), {
            authorName,
            authorId: user ? user.uid : null,
            text: txt,
            createdAt: serverTimestamp()
          }]
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

/* ======= تهيئة واستماع ======= */
(async function init() {
  await ensureDoc();
  listenPost();
  bindAuthButtons(); // ربط زر تسجيل الدخول عند التحميل في حال كان موجوداً
})();

/* ======= دالة مساعدة لتجنّب XSS عند إدراج نص من المستخدمين ======= */
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}