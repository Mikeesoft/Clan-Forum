/* main.js (النسخة النهائية والمُحسَّنة) */

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
  limitToLast, // ✅ تمت الإضافة: لجلب آخر الرسائل فقط
  startAfter,
  onSnapshot,
  serverTimestamp,
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ====== تكوين Firebase ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg", // ⚠️ تأكد من أن هذا هو المفتاح الصحيح
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

/* ====== تأكيد وجود المستند الرئيسي (Initialization) ====== */
async function ensureDoc() {
  const snap = await getDoc(postRef);
  if (!snap.exists()) {
    // لن يعمل هذا إلا إذا كان المستخدم Admin، لكنه إجراء وقائي جيد
    try {
        await setDoc(postRef, { likes: 0, likedBy: [] });
    } catch (e) {
        console.log("Document creation skipped (permission denied or exists).");
    }
  }
}

/* ====== الاستماع للبوست (Likes) ====== */
function listenPost() {
  onSnapshot(postRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    likeCountSpan.textContent = data.likes ?? 0;

    const user = auth.currentUser;
    if (user && Array.isArray(data.likedBy) && data.likedBy.includes(user.uid)) {
      likeBtn.classList.add("liked");
      likeBtn.querySelector("i").className = "fas fa-heart"; // قلب ممتلئ
    } else {
      likeBtn.classList.remove("liked");
      likeBtn.querySelector("i").className = "far fa-heart"; // قلب فارغ
    }
  }, (error) => {
      console.warn("Realtime listener warning:", error.code);
  });
}

/* ====== Toggle Like (Transaction) ====== */
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
           // في حال عدم وجود المستند، نحاول إنشاؤه (قد يفشل إذا لم يكن أدمن)
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
          showToast("تم إلغاء الإعجاب.", "warning"); // لون أصفر للتراجع
        } else {
          // إضافة الإعجاب
          likedBy.push(user.uid);
          tx.update(postRef, {
            likedBy,
            likes: (data.likes || 0) + 1
          });
          showToast("تم الإعجاب بالرسالة! ❤️", "success");
        }
      });
    } catch (e) {
      console.error(e);
      showToast("حدث خطأ. تأكد من اتصالك بالإنترنت.");
    } finally {
      likeBtn.disabled = false;
    }
  });
}

// =========================================================
// ====== التعليقات (Load More) ======
// =========================================================
let lastVisible = null;
const COMMENTS_LIMIT = 3;

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
        <div class="comment-author">
            <i class="fas fa-user-circle"></i> ${escapeHtml(author)} 
            ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}
        </div>
        <div class="comment-text">${linkify(escapeHtml(docData.text))}</div>
    `;
    return div;
}

async function loadComments(initial = false) {
  const existingLoadBtn = commentsContainer.querySelector(".load-more-btn");
  if (existingLoadBtn) existingLoadBtn.remove();
  
  if (initial) commentsContainer.innerHTML = "";

  let q = query(commentsCol, orderBy("createdAt", "asc"), limit(COMMENTS_LIMIT));
  if (lastVisible && !initial) {
    q = query(commentsCol, orderBy("createdAt", "asc"), startAfter(lastVisible), limit(COMMENTS_LIMIT));
  }

  try {
    const snapshot = await getDocs(q);
    
    snapshot.forEach(docSnap => {
        if (!initial) lastVisible = docSnap; 
        const item = docSnap.data();
        const el = createCommentElement(item);
        commentsContainer.appendChild(el); 
    });

    if (snapshot.size === COMMENTS_LIMIT) {
        lastVisible = snapshot.docs[snapshot.docs.length - 1]; 
        const loadBtn = document.createElement("button");
        loadBtn.innerHTML = '<i class="fas fa-chevron-down"></i> عرض المزيد';
        loadBtn.className = "load-more-btn";
        loadBtn.onclick = () => loadComments(false);
        commentsContainer.appendChild(loadBtn);
    } else if (snapshot.size === 0 && !initial) {
        showToast("لا توجد تعليقات إضافية.", "warning");
    }

  } catch (error) {
     console.error("Error loading comments:", error);
  }
}

commentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    try { 
      await signInWithPopup(auth, provider);
    } catch {
       return showToast("يجب تسجيل الدخول للتعليق."); 
    }
  }

  const existingInput = document.getElementById("newCommentInput");
  if (existingInput) {
    existingInput.focus();
    return;
  }
  
  const inputArea = document.createElement("div");
  inputArea.className = "comment-input-area";
  inputArea.innerHTML = `
    <input type="text" id="newCommentInput" placeholder="اكتب تعليقك هنا..." autocomplete="off"/>
    <button id="addCommentBtn"><i class="fas fa-paper-plane"></i></button>
  `;
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
      
      await addDoc(commentsCol, {
        authorName: user?.displayName || "عضو",
        authorId: user?.uid || null,
        text: txt,
        createdAt: serverTimestamp()
      });
      
      const newCommentEl = createCommentElement({
          authorName: user?.displayName || "عضو",
          text: txt,
          createdAt: new Date()
      });
      
      commentsContainer.insertBefore(newCommentEl, inputArea);
      inputArea.remove();
      showToast("تمت إضافة التعليق", "success");
      
    } catch (e) {
      console.error(e);
      showToast("فشل إرسال التعليق");
    } finally {
      if(inputField) inputField.disabled = false;
      if(sendButton) sendButton.disabled = false;
    }
  };
});

/* ====== Auth UI ====== */
function bindAuthUI() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const name = escapeHtml(user.displayName || "مستخدم");
      const photo = user.photoURL
        ? `<img src="${user.photoURL}" alt="${name}" class="profile-pic">` 
        : `<i class="fas fa-user-circle" style="font-size: 24px;"></i>`;
        
      loginContainer.innerHTML = `
        <div class="user-menu" style="display: flex; align-items: center; gap: 10px;">
            <a href="#profile" class="nav-icon profile-link" title="ملفي الشخصي">
            ${photo} <span class="username-display">${name.split(' ')[0]}</span>
            </a>
            <button id="signOutBtn" class="auth-btn logout" title="تسجيل الخروج"><i class="fas fa-sign-out-alt"></i></button>
        </div>
      `;
      document.getElementById("signOutBtn").onclick = () => {
         signOut(auth);
         showToast("إلى اللقاء! 👋", "success");
      }
    } else {
      loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> دخول</button>`;
      document.getElementById("googleLoginBtn").onclick = () => {
        signInWithPopup(auth, provider).catch((error) => {
            console.error(error);
            showToast("فشل تسجيل الدخول.", "error");
        });
      };
    }
    listenPost(); 
  });
}

// =========================================================
// ====== Chat: Realtime ======
// =========================================================

let unsubscribeChat = null;

function renderMessage(docData, currentUid, docId) {
  const authorId = docData.authorId || null;
  const isMe = currentUid && authorId === currentUid;
  const avatar = docData.avatar || "https://via.placeholder.com/36/cccccc/ffffff?text=User";
  const name = docData.authorName || "عضو";
  const time = formatTime(docData.createdAt);
  const textHtml = linkify(escapeHtml(docData.text || ""));

  const msg = document.createElement("div");
  msg.className = `msg ${isMe ? "sent" : "received"}`;
  msg.setAttribute('data-doc-id', docId);
  
  msg.innerHTML = `
    ${isMe ? `
      <div class="bubble">
        <div class="msg-text">${textHtml}</div>
        <div class="msg-meta"><span class="msg-time">${escapeHtml(time)}</span></div>
      </div>
    ` : `
      <div class="avatar"><img src="${escapeHtml(avatar)}" alt="img" loading="lazy"></div>
      <div class="bubble">
        <div class="msg-meta"><span class="msg-author">${escapeHtml(name)}</span></div>
        <div class="msg-text">${textHtml}</div>
        <div class="msg-meta" style="text-align:left"><span class="msg-time">${escapeHtml(time)}</span></div>
      </div>
    `}
  `;
  return msg;
}

function scrollChatToBottom() {
  if(chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function bindChatRealtime() {
  if (unsubscribeChat) unsubscribeChat();

  // ✅ التحسين: جلب آخر 50 رسالة فقط مرتبة زمنياً
  const q = query(chatMessagesCol, orderBy("createdAt", "asc"), limitToLast(50));
  
  unsubscribeChat = onSnapshot(q, (snapshot) => {
    const user = auth.currentUser;
    const currentUid = user?.uid;
    const isAtBottom = (chatMessages.scrollHeight - chatMessages.scrollTop) <= (chatMessages.clientHeight + 150);

    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const docId = change.doc.id;
      const existingEl = chatMessages.querySelector(`[data-doc-id="${docId}"]`);

      if (change.type === "added") {
        const el = renderMessage(data, currentUid, docId);
        chatMessages.appendChild(el);
      } else if (change.type === "modified" && existingEl) {
        const newEl = renderMessage(data, currentUid, docId);
        chatMessages.replaceChild(newEl, existingEl);
      } else if (change.type === "removed" && existingEl) {
        existingEl.remove();
      }
    });

    // تمرير تلقائي إذا كانت الرسالة جديدة أو المستخدم في الأسفل
    if (isAtBottom || snapshot.docChanges().some(c => c.type === 'added')) {
        scrollChatToBottom();
    }

  }, (err) => {
    console.error("Chat Error:", err);
    // تجاهل أخطاء الصلاحيات الصامتة لتجنب إزعاج المستخدم
    if (err.code !== 'permission-denied') {
        showToast("فشل الاتصال بالشات");
    }
  });
}

async function sendChatMessage(text) {
  if (!text) return;
  if (!auth.currentUser) {
    try { await signInWithPopup(auth, provider); } catch { return; }
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
    chatInput.value = ""; 
    chatInput.focus();
  } catch (e) {
    console.error(e);
    showToast("فشل الإرسال");
  } finally {
    sendMsg.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

/* ====== Chat UI Events ====== */
chatBtn.addEventListener("click", () => {
  chatWindow.style.display = "flex";
  chatBtn.style.display = 'none';
  bindChatRealtime();
  setTimeout(scrollChatToBottom, 200); // تمرير بعد فتح النافذة
});

closeChat.addEventListener("click", () => {
  chatWindow.style.display = "none";
  chatBtn.style.display = 'flex';
  if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
});

sendMsg.addEventListener("click", async () => {
  const txt = chatInput.value.trim();
  if (!txt) return;
  await sendChatMessage(txt);
});

chatInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const txt = chatInput.value.trim();
    if (!txt) return;
    await sendChatMessage(txt);
  }
});

/* ====== التشغيل (Init) ====== */
(async function init() {
  await ensureDoc();
  bindAuthUI();
  loadComments(true); 
})();
