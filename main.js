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
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعداد Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// المراجع
const postRef = doc(db, "posts", "main-post");
const commentsCol = collection(db, "posts", "main-post", "comments");

const likeBtn = document.getElementById("likeBtn");
const likeCountEl = document.getElementById("likeCount");
const commentsContainer = document.getElementById("commentsContainer");
const commentBtn = document.getElementById("commentBtn");
const loginBtnContainer = document.getElementById("loginBtnContainer");
const googleLoginBtn = document.getElementById("googleLoginBtn");

// إنشاء المستند لو مش موجود
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    await setDoc(postRef, { likes: 0 });
  }
}

// ========== اللايكات ==========
function listenPost() {
  onSnapshot(postRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      likeCountEl.textContent = data.likes || 0;
    }
  });
}

likeBtn.addEventListener("click", async () => {
  try {
    await updateDoc(postRef, { likes: increment(1) });
  } catch (err) {
    console.error("خطأ أثناء تسجيل الإعجاب:", err);
  }
});

// ========== التعليقات ==========
function listenComments() {
  const q = query(commentsCol, orderBy("createdAt", "asc"));
  onSnapshot(
    q,
    (snapshot) => {
      commentsContainer.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const div = document.createElement("div");
        div.classList.add("comment");
        
        const author = item.authorName || "عضو";
        let created = "";
        if (item.createdAt && typeof item.createdAt.toDate === "function") {
          created = item.createdAt.toDate().toLocaleString();
        }
        
        div.innerHTML = `
          <div class="comment-author">
            ${escapeHtml(author)} 
            ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}
          </div>
          <div class="comment-text">${escapeHtml(item.text)}</div>
        `;
        commentsContainer.appendChild(div);
      });
    },
    (err) => {
      console.error("خطأ في الاستماع للتعليقات:", err);
    }
  );
}

function showCommentInput() {
  if (!auth.currentUser) {
    alert("يجب تسجيل الدخول للتعليق");
    return;
  }
  
  if (document.querySelector(".comment-input-area")) return;
  
  const inputDiv = document.createElement("div");
  inputDiv.classList.add("comment-input-area");
  
  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.placeholder = "اكتب تعليقك...";
  
  const addBtn = document.createElement("button");
  addBtn.textContent = "إضافة تعليق";
  
  addBtn.addEventListener("click", async () => {
    const txt = inputEl.value.trim();
    if (!txt) {
      alert("الرجاء كتابة تعليق!");
      return;
    }
    
    const user = auth.currentUser;
    const authorName = user ? user.displayName || "عضو" : "عضو";
    
    addBtn.disabled = true;
    try {
      await addDoc(commentsCol, {
        authorName,
        authorId: user ? user.uid : null,
        text: txt,
        createdAt: serverTimestamp(),
      });
      inputEl.value = "";
    } catch (err) {
      console.error("خطأ أثناء إضافة التعليق:", err);
      alert("فشل إرسال التعليق.");
    } finally {
      addBtn.disabled = false;
    }
  });
  
  inputDiv.appendChild(inputEl);
  inputDiv.appendChild(addBtn);
  commentsContainer.appendChild(inputDiv);
}

commentBtn.addEventListener("click", showCommentInput);

// ========== تسجيل الدخول ==========
function bindAuthButtons() {
  googleLoginBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("خطأ في تسجيل الدخول:", err);
      alert("فشل تسجيل الدخول!");
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtnContainer.innerHTML = `
      <div class="profile-info">
        <img src="${user.photoURL || "https://via.placeholder.com/40"}" alt="profile" class="profile-pic"/>
        <span>${user.displayName || "مستخدم"}</span>
        <button id="logoutBtn" class="auth-btn">تسجيل الخروج</button>
      </div>
    `;
    document.getElementById("logoutBtn").addEventListener("click", () => {
      signOut(auth);
    });
  } else {
    loginBtnContainer.innerHTML = "";
    loginBtnContainer.appendChild(googleLoginBtn);
  }
});

// ========== Utils ==========
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========== تهيئة ==========
(async function init() {
  await ensureDoc();
  listenPost();
  listenComments();
  bindAuthButtons();
})();