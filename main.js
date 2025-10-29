/* main.js (الكود النهائي المُحدَّث للمصادقة وللأداء) */

// استيراد Firebase (v11 modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect, // 💡 تحويل إلى Redirect للمصادقة الموثوقة على الهاتف
  getRedirectResult,  // 💡 لمعالجة النتيجة بعد إعادة التوجيه
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
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ====== تكوين Firebase (الرجاء استبدال هذا ببياناتك الحقيقية) ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg", // ✅ تم تصحيح تنسيق الفواصل
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
const chatMessagesCol = collection(db, "chats", "global", "messages");

/* ====== Toast Notification ====== */
function showToast(msg, type = "error") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;

  toast.style.opacity = "0";
  toast.style.position = "fixed";

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("entering"), 50);

  setTimeout(() => {
    toast.classList.remove("entering");
    toast.classList.add("exiting");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ====== Helpers (مساعدات) ====== */
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

function formatTime(ts) {
  try {
    if (!ts) return "";
    const d = ts.toDate();
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

/* ====== معالجة نتيجة إعادة التوجيه (Redirect Result Handler) ====== */
async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // تم تسجيل الدخول بنجاح بعد إعادة التوجيه
      showToast("تم تسجيل الدخول بنجاح", "success");
    }
  } catch (error) {
    console.error("Error during redirect result:", error);
    showToast("فشل معالجة تسجيل الدخول بعد التحويل.", "error");
  }
}

/* ====== تأكيد وجود المستند الرئيسي (Initialization) ====== */
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    await setDoc(postRef, { likes: 0, likedBy: [] });
  }
}

/* ====== الاستماع للبوست (Likes) ====== */
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

/* ====== Toggle Like (Transaction) ====== */
if (likeBtn) {
  likeBtn.addEventListener("click", async () => {
    if (!auth.currentUser) {
      // 💡 استخدام signInWithRedirect
      try { await signInWithRedirect(auth, provider); return; } 
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
          showToast("تم إلغاء الإعجاب.", "error");
        } else {
          // إضافة الإعجاب
          likedBy.push(user.uid);
          tx.update(postRef, {
            likedBy,
            likes: (data.likes || 0) + 1
          });
          showToast("تم الإعجاب بالرسالة بنجاح! ❤️", "success");
        }
      });
    } catch (e) {
      console.error(e);
      showToast("خطأ أثناء تحديث الإعجاب.");
    } finally {
      likeBtn.disabled = false;
    }
  });
}

// =========================================================
// ====== التعليقات (Load More) - وظيفة مُحسَّنة للـ DOM ======
// =========================================================
let lastVisible = null;
const COMMENTS_LIMIT = 3;

/**
 * دالة لإنشاء عنصر التعليق في DOM
 */
function createCommentElement(docData) {
    const div = document.createElement("div");
    div.classList.add("comment");
    const author = docData.authorName || "عضو";
    let created = "";
    if (docData.createdAt?.toDate) {
      created = docData.createdAt.toDate().toLocaleString();
    } else if (docData.createdAt instanceof Date) {
      created = docData.createdAt.toLocaleString();
    }
    

    div.innerHTML = `
        <div class="comment-author">${escapeHtml(author)} ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}</div>
        <div class="comment-text">${linkify(escapeHtml(docData.text))}</div>
    `;
    return div;
}


async function loadComments(initial = false) {
  // 1. البحث عن زر "عرض المزيد" وإزالته
  const existingLoadBtn = commentsContainer.querySelector(".load-more-btn");
  if (existingLoadBtn) existingLoadBtn.remove();
  
  // ⚠️ إذا كانت أول عملية تحميل، نفرغ الحاوية
  if (initial) commentsContainer.innerHTML = "";

  let q = query(commentsCol, orderBy("createdAt", "asc"), limit(COMMENTS_LIMIT));
  if (lastVisible && !initial) {
    q = query(commentsCol, orderBy("createdAt", "asc"), startAfter(lastVisible), limit(COMMENTS_LIMIT));
  }

  try {
    const snapshot = await getDocs(q);
    
    // 2. إضافة التعليقات الجديدة إلى الواجهة
    snapshot.forEach(docSnap => {
        // تحديث آخر عنصر مرئي فقط إذا كنا نحمل من جديد وليس في أول عملية
        if (!initial) lastVisible = docSnap; 
        
        const item = docSnap.data();
        const el = createCommentElement(item);
        
        commentsContainer.appendChild(el); 
    });

    // 3. إعادة إضافة زر "عرض المزيد" إذا كانت النتائج بحجم الحد الأقصى
    if (snapshot.size === COMMENTS_LIMIT) {
        // نحدث lastVisible ليكون آخر مستند تم عرضه
        lastVisible = snapshot.docs[snapshot.docs.length - 1]; 
        
        const loadBtn = document.createElement("button");
        loadBtn.textContent = "عرض المزيد من التعليقات";
        loadBtn.className = "load-more-btn";
        loadBtn.onclick = () => loadComments(false);
        commentsContainer.appendChild(loadBtn);
    } else if (snapshot.size === 0 && !initial) {
        showToast("لا توجد تعليقات إضافية.", "warning");
    }

  } catch (error) {
     console.error("Error loading comments:", error);
     showToast("فشل في تحميل التعليقات", "error");
  }
}

/* ====== منع تكرار صندوق التعليق وإرساله ====== */
commentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    // 💡 استخدام signInWithRedirect
    try { 
      await signInWithRedirect(auth, provider);
      return;
    } catch (e) { 
      return showToast("يجب تسجيل الدخول للتعليق."); 
    }
  }

  // إذا كان صندوق الإدخال موجوداً بالفعل، نركز عليه ونخرج
  const existingInput = document.getElementById("newCommentInput");
  if (existingInput) {
    existingInput.focus();
    return;
  }
  
  const inputArea = document.createElement("div");
  inputArea.className = "comment-input-area";
  inputArea.innerHTML = `
    <input type="text" id="newCommentInput" placeholder="اكتب تعليقك هنا..." />
    <button id="addCommentBtn">إضافة تعليق</button>
  `;
  // نضع صندوق التعليق في بداية الحاوية
  commentsContainer.insertAdjacentElement("afterbegin", inputArea);
  document.getElementById("newCommentInput").focus();

  document.getElementById("addCommentBtn").onclick = async () => {
    const txt = document.getElementById("newCommentInput").value.trim();
    if (!txt) return showToast("الرجاء كتابة تعليق!");
    
    const inputField = document.getElementById("newCommentInput");
    const sendButton = document.getElementById("addCommentBtn");
    
    try {
      const user = auth.currentUser;
      inputField.disabled = true;
      sendButton.disabled = true;
      
      const newDocRef = await addDoc(commentsCol, {
        authorName: user?.displayName || "عضو",
        authorId: user?.uid || null,
        text: txt,
        createdAt: serverTimestamp()
      });
      
      // 💡 تحديث واجهة المستخدم فوراً (بدون انتظار تحميل Firestore)
      const newCommentEl = createCommentElement({
          authorName: user?.displayName || "عضو",
          text: txt,
          createdAt: new Date() // وقت محلي مؤقت
      });
      
      // نضع التعليق الجديد قبل صندوق الإدخال (لأنه في الأعلى)
      commentsContainer.insertBefore(newCommentEl, inputArea);
      
      // إزالة صندوق الإدخال بعد الإرسال الناجح
      inputArea.remove();
      
      showToast("تمت إضافة التعليق", "success");
      
    } catch (e) {
      console.error("Error adding comment:", e);
      showToast("فشل إرسال التعليق");
    } finally {
      inputField.disabled = false;
      sendButton.disabled = false;
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
        ? `<img src="${user.photoURL}" alt="${name}" loading="lazy">` 
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
      
      // 💡 التعديل هنا: استخدام signInWithRedirect
      document.getElementById("googleLoginBtn").onclick = () => {
        signInWithRedirect(auth, provider).catch((error) => {
            console.error("Authentication Error:", error);
            showToast("فشل تسجيل الدخول. (رمز الخطأ: " + (error.code || "غير معروف") + ")", "error");
        });
      };
    }
    // تحديث حالة زر الإعجاب عند تغيير المستخدم
    listenPost(); 
  });
}

// =========================================================
// ====== Chat: حفظ وعرض الرسائل في Firestore (Realtime) ======
// =========================================================

let unsubscribeChat = null;

function renderMessage(docData, currentUid, docId) {
  const authorId = docData.authorId || null;
  const isMe = currentUid && authorId === currentUid;
  const avatar = docData.avatar || (isMe ? "https://via.placeholder.com/36/3498db/ffffff?text=Me" : "https://via.placeholder.com/36/7f8c8d/ffffff?text=U");
  const name = docData.authorName || "عضو";
  const time = formatTime(docData.createdAt);
  const textHtml = linkify(escapeHtml(docData.text || ""));

  const msg = document.createElement("div");
  msg.className = `msg ${isMe ? "sent" : "received"}`;
  msg.setAttribute('data-doc-id', docId); 
  
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
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

async function bindChatRealtime() {
  // افصل أي مستمع قديم
  if (unsubscribeChat) unsubscribeChat();

  const q = query(chatMessagesCol, orderBy("createdAt", "asc"));
  // 💡 استخدام snapshot.docChanges() لتحسين الأداء
  unsubscribeChat = onSnapshot(q, (snapshot) => {
    
    const shouldScroll = chatMessages.scrollHeight - chatMessages.scrollTop < chatMessages.clientHeight + 100;

    const user = auth.currentUser;
    const currentUid = user?.uid;

    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const docId = change.doc.id;
      const existingEl = chatMessages.querySelector(`[data-doc-id="${docId}"]`);

      if (change.type === "added") {
        // إضافة رسالة جديدة
        const el = renderMessage(data, currentUid, docId);
        
        chatMessages.appendChild(el);
        
        // التمرير للأسفل إذا كانت رسالة جديدة وأنت قريب من الأسفل
        if (shouldScroll || change.doc.isEqual(snapshot.docs[snapshot.docs.length - 1])) {
            scrollChatToBottom();
        }
        
      } else if (change.type === "modified") {
        // تحديث رسالة موجودة
        if (existingEl) {
          const newEl = renderMessage(data, currentUid, docId);
          chatMessages.replaceChild(newEl, existingEl);
        }
      } else if (change.type === "removed") {
        // حذف رسالة
        if (existingEl) {
          existingEl.remove();
        }
      }
    });

  }, (err) => {
    console.error("chat snapshot error", err);
    showToast("فشل جلب محادثات الشات");
  });
}

/* ارسال رسالة الى Firestore */
async function sendChatMessage(text) {
  if (!text) return;
  if (!auth.currentUser) {
    // 💡 استخدام signInWithRedirect
    try {
      await signInWithRedirect(auth, provider);
      return;
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
    // مسح حقل الإدخال مباشرةً
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
  
  if (!isVisible) {
    // لو فتحنا الشات
    chatWindow.style.display = "flex";
    bindChatRealtime();
    chatInput.focus();
    chatBtn.style.display = 'none';
  } else {
    // لو أغلقنا الشات
    chatWindow.style.display = "none";
    if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
    chatBtn.style.display = 'flex';
  }
});

// غلق النافذة بزر ×
closeChat.addEventListener("click", () => {
  chatWindow.style.display = "none";
  if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
  chatBtn.style.display = 'flex';
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
  // 💡 1. معالجة نتيجة إعادة التوجيه في البداية (لتلقي نتيجة تسجيل الدخول)
  await handleRedirectResult(); 

  // 2. ضمان وجود المستند الرئيسي
  await ensureDoc();
  
  // 3. ربط واجهة المصادقة
  bindAuthUI();
  
  // 4. تحميل أول مجموعة من التعليقات
  loadComments(true); 
  
})();
