// main.js (موديول - يتطلب <script type="module"> في الـ HTML)

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
const loginBtn = document.getElementById("googleLoginBtn");
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
            } else {
                likeBtn.classList.remove("liked");
            }
        } else {
            // لو مش مسجل، نزيل حالة liked
            likeBtn.classList.remove("liked");
        }
        
        // عرض التعليقات (نراعي شكل العناصر لو كانت قديمة - مجرد نصوص - أو عناصر objects)
        commentsContainer.innerHTML = "";
        const comments = data.comments || [];
        comments.forEach(item => {
            const div = document.createElement("div");
            div.classList.add("comment");
            if (typeof item === "string") {
                // شكل قديم: مجرد نص
                div.innerHTML = `<div class="comment-author">عضو</div><div class="comment-text">${escapeHtml(item)}</div>`;
            } else if (typeof item === "object" && item.text) {
                const author = item.authorName || "عضو";
                const created = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString() : "";
                div.innerHTML = `<div class="comment-author">${escapeHtml(author)} ${created ? `<span class="comment-time">• ${escapeHtml(created)}</span>` : ""}</div>
                         <div class="comment-text">${escapeHtml(item.text)}</div>`;
            }
            commentsContainer.appendChild(div);
        });
    }, (err) => {
        console.error("خطأ في الاستماع لبيانات المنشور:", err);
    });
}

/* ======= تسجيل الدخول بزر جوجل ======= */
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        try {
            await signInWithPopup(auth, provider);
            // بعد تسجيل الدخول onAuthStateChanged سيخفي الزر تلقائياً
        } catch (err) {
            console.error("فشل تسجيل الدخول:", err);
            alert("حصل خطأ أثناء محاولة تسجيل الدخول. افتح Console لمزيد من التفاصيل.");
        }
    });
}

/* ======= متابعة حالة الدخول ======= */
onAuthStateChanged(auth, (user) => {
    if (user) {
        // عرض اسم المستخدم في الـ navbar بدل الزر
        loginContainer.innerHTML = `
      <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
        <i class="fas fa-user-circle"></i>
        <span>${escapeHtml(user.displayName || "ملفي الشخصي")}</span>
      </a>
    `;
    } else {
        // إرجاع زر تسجيل الدخول
        loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
        // ربط المستمع الجديد بالزر (لأننا استبدلنا الـ innerHTML)
        const newBtn = document.getElementById("googleLoginBtn");
        if (newBtn) {
            newBtn.addEventListener("click", async () => {
                try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
            });
        }
    }
});

/* ======= وظيفة الإعجاب (toggle) ======= */
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
    
    // قراءه سريعة لحالة الوثيقة ونتصرف بناءً عليها
    const snap = await getDoc(postRef);
    if (!snap.exists()) {
        await setDoc(postRef, { likes: 0, likedBy: [], comments: [] });
    }
    const data = (await getDoc(postRef)).data();
    const likedBy = data.likedBy || [];
    const already = likedBy.includes(user.uid);
    
    if (already) {
        // إزالة الإعجاب
        await updateDoc(postRef, {
            likedBy: arrayRemove(user.uid),
            likes: increment(-1)
        });
    } else {
        // إضافة إعجاب
        await updateDoc(postRef, {
            likedBy: arrayUnion(user.uid),
            likes: increment(1)
        });
    }
});

/* ======= وظيفة التعليقات (يظهر حقل إدخال داخل الصفحة) ======= */
let commentsVisible = false;
commentBtn.addEventListener("click", async () => {
    // نطلب تسجيل الدخول لو مش مسجل
    if (!auth.currentUser) {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("Login required for commenting:", err);
            return;
        }
    }
    
    if (!commentsVisible) {
        // إضافة منطقة الإدخال في أعلى قائمة التعليقات
        const inputArea = document.createElement("div");
        inputArea.classList.add("comment-input-area");
        inputArea.innerHTML = `
      <input type="text" id="newCommentInput" placeholder="اكتب تعليقك هنا..." />
      <button id="addCommentBtn">إضافة تعليق</button>
    `;
        // إدراج في أعلى الـ container
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
            
            // نضيف التعليق ككائن مع اسم المؤلف ووقت الخادم
            await updateDoc(postRef, {
                comments: arrayUnion({
                    authorName,
                    authorId: user ? user.uid : null,
                    text: txt,
                    createdAt: serverTimestamp()
                })
            });
            inputEl.value = "";
            // لا نحتاج لإعادة تحميل لأن onSnapshot سيحدّث الواجهة تلقائياً
        });
    } else {
        // إخفاء حقل الإدخال
        const inputArea = commentsContainer.querySelector(".comment-input-area");
        if (inputArea) inputArea.remove();
        commentsVisible = false;
    }
});

/* ======= تهيئة واستماع ======= */
(async function init() {
    await ensureDoc();
    listenPost();
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
// زر التعليق
const commentBtn = document.getElementById("commentBtn");

// زر إرسال التعليق
const postCommentBtn = document.getElementById("postCommentBtn");

// خانة إدخال التعليق
const commentInput = document.getElementById("commentInput");

commentBtn.addEventListener("click", () => {
    if (!auth.currentUser) {
        alert("🚫 يجب تسجيل الدخول قبل كتابة تعليق");
        return;
    }
    // إظهار حقل كتابة التعليق
    commentInput.style.display = "block";
    postCommentBtn.style.display = "inline-block";
});

postCommentBtn.addEventListener("click", async () => {
    const commentText = commentInput.value.trim();
    if (commentText === "") {
        alert("⚠️ لا يمكن إرسال تعليق فارغ");
        return;
    }

    try {
        // إضافة التعليق إلى Firestore
        await addDoc(collection(db, "comments"), {
            text: commentText,
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName,
            timestamp: serverTimestamp()
        });

        commentInput.value = "";
        alert("✅ تم إرسال التعليق بنجاح");
    } catch (error) {
        console.error("خطأ في إرسال التعليق:", error);
        alert("❌ حدث خطأ أثناء إرسال التعليق");
    }
});