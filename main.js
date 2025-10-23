// main.js (النسخة النهائية والمُدمجة)

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
  runTransaction,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  getDocs // 👈 تم إضافة getDocs لـ loadComments
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ====== تكوين Firebase (ضع هنا بيانات مشروعك الحقيقية) ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg", // ⚠️ استبدل هذا بـ API Key الحقيقي
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
// Chat: مجموعة الرسائل العامة
const chatMessagesCol = collection(db, "chats", "global", "messages");

/* ====== Toast Notification ====== */
function showToast(msg, type = "error") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`; // إضافة فئة النوع للتنسيق في CSS
  toast.textContent = msg;

  // لإضافة الحركة، نستخدم فئة 'entering'
  toast.style.opacity = "0";
  toast.style.position = "fixed"; // تم نقل بعض الستايلات التي كانت في JS لـ CSS

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("entering"), 50);

  setTimeout(() => {
    toast.classList.remove("entering");
    toast.classList.add("exiting");
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
    // التحقق من حالة الإعجاب للمستخدم الحالي
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
          // إلغاء الإعجاب
          tx.update(postRef, {
            likedBy: likedBy.filter(id => id !== user.uid),
            likes: Math.max((data.likes || 1) - 1, 0)
          });
        } else {
          // إضافة الإعجاب
          likedBy.push(user.uid);
          tx.update(postRef, {
            likedBy,
            likes: (data.likes || 0) + 1
          });
        }
      });
      // لا نحتاج لـ showToast لأن الـ onSnapshot سيحدث الواجهة
    } catch (e) {
      console.error(e);
      showToast("خطأ أثناء تحديث الإعجاب.");
    } finally {
      likeBtn.disabled = false;
    }
  });
}

/* ====== التعليقات مع Load More (مُعدّلة لاستخدام getDocs) ====== */
let lastVisible = null;
const COMMENTS_LIMIT = 3;

async function loadComments(initial = false) {
  // 1. نبحث عن زر "عرض المزيد" ونزيله إذا كان موجوداً قبل بدء عملية التحميل
  const existingLoadBtn = commentsContainer.querySelector(".load-more-btn");
  if (existingLoadBtn) {
    existingLoadBtn.remove();
  }

  let q = query(commentsCol, orderBy("createdAt", "asc"), limit(COMMENTS_LIMIT));
  if (lastVisible && !initial) {
    q = query(commentsCol, orderBy("createdAt", "asc"), startAfter(lastVisible), limit(COMMENTS_LIMIT));
  }

  try {
    // ⚠️ نستخدم getDocs لجلب البيانات لمرة واحدة (Load More)
    const snapshot = await getDocs(q);

    // إذا كانت أول عملية تحميل، نفرغ الحاوية
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
      // نضع التعليق قبل زر الـ Load More (إذا كان موجوداً)
      commentsContainer.appendChild(div);
    });

    // 2. إذا كان عدد النتائج مساوياً للحد الأقصى، نضيف زر "عرض المزيد"
    if (snapshot.size === COMMENTS_LIMIT) {
      const loadBtn = document.createElement("button");
      loadBtn.textContent = "عرض المزيد من التعليقات";
      loadBtn.className = "load-more-btn";
      loadBtn.onclick = () => loadComments(false);
      commentsContainer.appendChild(loadBtn);
    }
    
    // إذا كانت النتائج صفر وليست أول عملية تحميل، نعلم المستخدم
    if (snapshot.size === 0 && !initial) {
        showToast("لا توجد تعليقات إضافية.", "warning");
    }

  } catch (error) {
     console.error("Error loading comments:", error);
     showToast("فشل في تحميل التعليقات", "error");
  }
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

  // إذا كان صندوق الإدخال موجوداً بالفعل، لا نفعل شيئاً
  if (document.querySelector(".comment-input-area")) return;

  const inputArea = document.createElement("div");
  inputArea.className = "comment-input-area";
  inputArea.innerHTML = `
    <input type="text" id="newCommentInput" placeholder="اكتب تعليقك هنا..." />
    <button id="addCommentBtn">إضافة تعليق</button>
  `;
  // نضع صندوق التعليق في بداية الحاوية
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
      // نزيل صندوق الإدخال بعد الإرسال الناجح
      inputArea.remove();
      // نعيد تحميل التعليقات من البداية لرؤية التعليق الجديد
      lastVisible = null;
      loadComments(true); 
      
      showToast("تمت إضافة التعليق", "success");
    } catch {
      showToast("فشل إرسال التعليق");
    }
  };
});

/* ====== Auth UI (تسجيل الدخول/الخروج) ====== */
function bindAuthUI() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // المستخدم مسجل دخوله
      const name = escapeHtml(user.displayName || "مستخدم");
      const photo = user.photoURL
        ? `<img src="${user.photoURL}" alt="${name}" loading="lazy">` // إضافة loading="lazy" لتحسين الأداء
        : `<i class="fas fa-user-circle" style="margin-inline-end:8px; font-size: 28px;"></i>`;
      loginContainer.innerHTML = `
        <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
          ${photo}<span>${name.split(' ')[0]}</span>
        </a>
        <button id="signOutBtn" class="auth-btn">خروج</button>
      `;
      document.getElementById("signOutBtn").onclick = () => {
         signOut(auth);
         showToast("تم تسجيل الخروج بنجاح", "success");
      }
    } else {
      // المستخدم غير مسجل دخوله
      loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
      document.getElementById("googleLoginBtn").onclick = () => {
        signInWithPopup(auth, provider).then(() => {
            showToast("تم تسجيل الدخول بنجاح", "success");
        });
      };
    }
    // تحديث حالة زر الإعجاب عند تغيير المستخدم
    listenPost(); 
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
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

/* ====== Chat: حفظ وعرض الرسائل في Firestore (Realtime) ====== */

let unsubscribeChat = null;

function formatTime(ts) {
  try {
    if (!ts) return "";
    const d = ts.toDate();
    // تنسيق محلي جميل
    return d.toLocaleString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short"
    });
  } catch {
    return "";
  }
}

function renderMessage(docData, currentUid) {
  const authorId = docData.authorId || null;
  const isMe = currentUid && authorId === currentUid;
  // يمكن تغيير الأفاتار الافتراضي إذا لم يكن هناك photoURL
  const avatar = docData.avatar || (isMe ? "https://via.placeholder.com/36/3498db/ffffff?text=Me" : "https://via.placeholder.com/36/7f8c8d/ffffff?text=U");
  const name = docData.authorName || "عضو";
  const time = formatTime(docData.createdAt);
  const textHtml = linkify(escapeHtml(docData.text || ""));

  const msg = document.createElement("div");
  msg.className = `msg ${isMe ? "sent" : "received"}`;

  msg.innerHTML = `
    ${isMe ? `
      <div class="bubble">
        <div class="msg-meta"><span class="msg-author">${escapeHtml(name)}</span><span class="msg-time">${escapeHtml(time)}</span></div>
        <div class="msg-text">${textHtml}</div>
      </div>
      <div class="avatar"><img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" loading="lazy"></div>
    ` : `
      <div class="avatar"><img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" loading="lazy"></div>
      <div class="bubble">
        <div class="msg-meta"><span class="msg-author">${escapeHtml(name)}</span><span class="msg-time">${escapeHtml(time)}</span></div>
        <div class="msg-text">${textHtml}</div>
      </div>
    `}
  `;
  return msg;
}

function scrollChatToBottom() {
  // استخدام setTimeout لضمان اكتمال تحديث DOM قبل التمرير
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

async function bindChatRealtime() {
  // افصل أي مستمع قديم
  if (unsubscribeChat) unsubscribeChat();

  const q = query(chatMessagesCol, orderBy("createdAt", "asc"));
  unsubscribeChat = onSnapshot(q, (snapshot) => {
    // إفراغ الحاوية وإعادة عرض الكل (بسيط وواضح)
    const shouldScroll = chatMessages.scrollHeight - chatMessages.scrollTop < chatMessages.clientHeight + 50;

    chatMessages.innerHTML = "";
    const user = auth.currentUser;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const el = renderMessage(data, user?.uid);
      chatMessages.appendChild(el);
    });

    // التمرير للأسفل فقط إذا كان المستخدم قريباً من الأسفل
    if (shouldScroll) {
        scrollChatToBottom();
    }

  }, (err) => {
    console.error("chat snapshot error", err);
    showToast("فشل جلب محادثات الشات");
  });
}

/* ارسال رسالة الى Firestore */
async function sendChatMessage(text) {
  if (!text) return;
  if (!auth.currentUser) {
    try {
      await signInWithPopup(auth, provider);
    } catch {
      return showToast("يجب تسجيل الدخول لإرسال رسالة.");
    }
  }
  const user = auth.currentUser;
  if (!user) return;

  const payload = {
    text: text,
    authorName: user.displayName || "مستخدم",
    authorId: user.uid,
    avatar: user.photoURL || null,
    createdAt: serverTimestamp()
  };

  try {
    sendMsg.disabled = true;
    chatInput.disabled = true;
    await addDoc(chatMessagesCol, payload);
    // مسح حقل الإدخال مباشرةً بعد الإرسال الناجح
    chatInput.value = ""; 
  } catch (e) {
    console.error("send msg error", e);
    showToast("فشل إرسال الرسالة");
  } finally {
    sendMsg.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

/* ====== واجهة Chat: فتح/قفل + ربط الاحداث ====== */

// فتح/غلق النافذة (toggle)
chatBtn.addEventListener("click", () => {
  const isVisible = chatWindow.style.display === "flex";
  chatWindow.style.display = isVisible ? "none" : "flex";

  if (!isVisible) {
    // لو فتحنا الشات
    bindChatRealtime();
    chatInput.focus();
  } else {
    // لو أغلقنا الشات
    if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
  }
});

// غلق النافذة بزر ×
closeChat.addEventListener("click", () => {
  chatWindow.style.display = "none";
  if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
});

// إرسال رسالة بالزر
sendMsg.addEventListener("click", async () => {
  const txt = chatInput.value.trim();
  if (!txt) return;
  await sendChatMessage(txt);
});

// إرسال رسالة بالـ Enter
chatInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const txt = chatInput.value.trim();
    if (!txt) return;
    await sendChatMessage(txt);
  }
});

/* ====== init ====== */
(async function init() {
  await ensureDoc();
  // listenPost(); // تم نقلها داخل onAuthStateChanged
  bindAuthUI();
  // تحميل أول مجموعة من التعليقات
  loadComments(true); 
  
})();
