// main.js (موديول - يتطلب <script type="module"> في الـ HTML)

// ===== استيراد Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    getFirestore, doc, getDoc, setDoc, updateDoc,
    arrayUnion, arrayRemove, increment, onSnapshot, serverTimestamp
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
const loginBtn = document.getElementById("googleLoginBtn");
const likeBtn = document.getElementById("likeBtn");
const likeCountSpan = document.getElementById("likeCount");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");

// ===== مرجع الوثيقة =====
const postRef = doc(db, "posts", "main-post");

// ===== تهيئة الوثيقة =====
async function ensureDoc() {
    const snap = await getDoc(postRef);
    if (!snap.exists()) {
        await setDoc(postRef, { likes: 0, likedBy: [], comments: [] });
    }
}

// ===== الاستماع للتغييرات =====
function listenPost() {
    onSnapshot(postRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        // تحديث عدد الإعجابات
        likeCountSpan.textContent = data.likes ?? 0;

        // تحديث حالة زر الإعجاب
        const user = auth.currentUser;
        likeBtn.classList.toggle("liked", user && data.likedBy?.includes(user.uid));

        // عرض التعليقات
        commentsContainer.querySelectorAll(".comment").forEach(el => el.remove()); // مسح التعليقات السابقة
        (data.comments || []).forEach(item => {
            const div = document.createElement("div");
            div.classList.add("comment");

            let author = "عضو";
            let createdText = "الآن";

            if (typeof item === "string") {
                div.innerHTML = `<div class="comment-author">${author}</div>
                                 <div class="comment-text">${escapeHtml(item)}</div>`;
            } else if (item?.text) {
                if (item.authorName) author = item.authorName;
                if (item.createdAt?.seconds) {
                    createdText = new Date(item.createdAt.seconds * 1000).toLocaleString();
                }
                div.innerHTML = `<div class="comment-author">${escapeHtml(author)} <span class="comment-time">• ${escapeHtml(createdText)}</span></div>
                                 <div class="comment-text">${escapeHtml(item.text)}</div>`;
            }

            commentsContainer.appendChild(div);
        });
    }, err => console.error("خطأ في الاستماع:", err));
}

// ===== تسجيل الدخول =====
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        try { await signInWithPopup(auth, provider); }
        catch (err) { console.error("فشل تسجيل الدخول:", err); }
    });
}

// ===== متابعة حالة الدخول =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginContainer.innerHTML = `
            <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
                <i class="fas fa-user-circle"></i>
                <span>${escapeHtml(user.displayName || "ملفي الشخصي")}</span>
            </a>
        `;
    } else {
        loginContainer.innerHTML = `<button id="googleLoginBtn" class="auth-btn"><i class="fab fa-google"></i> تسجيل الدخول</button>`;
        document.getElementById("googleLoginBtn")?.addEventListener("click", async () => {
            try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
        });
    }
});

// ===== زر الإعجاب =====
likeBtn.addEventListener("click", async () => {
    if (!auth.currentUser) {
        try { await signInWithPopup(auth, provider); } catch { return; }
    }
    const user = auth.currentUser;
    if (!user) return;

    const data = (await getDoc(postRef)).data();
    if (!data) return;

    if (data.likedBy?.includes(user.uid)) {
        await updateDoc(postRef, {
            likedBy: arrayRemove(user.uid),
            likes: increment(-1)
        });
    } else {
        await updateDoc(postRef, {
            likedBy: arrayUnion(user.uid),
            likes: increment(1)
        });
    }
});

// ===== التعليقات =====
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

        document.getElementById("addCommentBtn").addEventListener("click", async () => {
            const txt = document.getElementById("newCommentInput").value.trim();
            if (!txt) return alert("الرجاء كتابة تعليق!");

            const user = auth.currentUser;
            const newComment = {
                authorName: user?.displayName || "عضو",
                authorId: user?.uid || null,
                text: txt,
                createdAt: new Date() // يظهر فورًا
            };

            // إضافة التعليق فورًا للواجهة
            const div = document.createElement("div");
            div.classList.add("comment");
            div.innerHTML = `
                <div class="comment-author">${escapeHtml(newComment.authorName)} <span class="comment-time">• الآن</span></div>
                <div class="comment-text">${escapeHtml(newComment.text)}</div>
            `;
            commentsContainer.appendChild(div);

            // حفظ التعليق في Firebase
            document.getElementById("newCommentInput").value = "";
            try {
                await updateDoc(postRef, {
                    comments: arrayUnion({
                        ...newComment,
                        createdAt: serverTimestamp() // التاريخ الرسمي من السيرفر
                    })
                });
            } catch (e) {
                console.error("فشل إضافة التعليق:", e);
            }
        });
    } else {
        commentsContainer.querySelector(".comment-input-area")?.remove();
        commentsVisible = false;
    }
});

// ===== تشغيل =====
(async function init() {
    await ensureDoc();
    listenPost();
})();

// ===== حماية HTML =====
function escapeHtml(unsafe) {
    return String(unsafe ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}