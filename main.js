import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// عناصر DOM
const loginBtn = document.getElementById("googleLoginBtn");
const commentBtn = document.getElementById("commentBtn");
const commentsContainer = document.getElementById("commentsContainer");

let currentUser = null;

// تسجيل الدخول
loginBtn.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        console.log("✅ تسجيل الدخول ناجح:", result.user.displayName);
    } catch (error) {
        console.error("❌ خطأ أثناء تسجيل الدخول:", error);
        alert("فشل تسجيل الدخول: " + error.message);
    }
});

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginBtn.textContent = `مرحباً، ${user.displayName}`;
        loginBtn.disabled = true;
    } else {
        currentUser = null;
        loginBtn.textContent = "تسجيل الدخول";
        loginBtn.disabled = false;
    }
});

// إضافة تعليق
commentBtn.addEventListener("click", async () => {
    if (!currentUser) {
        alert("⚠️ يجب تسجيل الدخول قبل إضافة تعليق.");
        return;
    }
    
    const commentText = prompt("أدخل تعليقك:");
    if (!commentText) {
        alert("⚠️ التعليق فارغ.");
        return;
    }
    
    try {
        const postRef = doc(db, "posts", "main-post");
        const postSnap = await getDoc(postRef);
        
        if (!postSnap.exists()) {
            console.log("ℹ️ إنشاء مستند جديد للمنشور.");
            await setDoc(postRef, { comments: [] });
        }
        
        await updateDoc(postRef, {
            comments: arrayUnion({
                text: commentText,
                user: currentUser.displayName,
                uid: currentUser.uid,
                timestamp: new Date()
            })
        });
        
        console.log("✅ تم إضافة التعليق بنجاح!");
        alert("✅ تم إضافة التعليق بنجاح!");
        displayComments();
        
    } catch (error) {
        console.error("❌ خطأ أثناء إضافة التعليق:", error);
        alert("❌ حدث خطأ أثناء إضافة التعليق: " + error.message);
    }
});

// عرض التعليقات
async function displayComments() {
    try {
        const postRef = doc(db, "posts", "main-post");
        const postSnap = await getDoc(postRef);
        
        commentsContainer.innerHTML = "";
        
        if (postSnap.exists()) {
            const comments = postSnap.data().comments || [];
            comments.forEach((c) => {
                const div = document.createElement("div");
                div.className = "comment";
                div.textContent = `${c.user}: ${c.text}`;
                commentsContainer.appendChild(div);
            });
        }
    } catch (error) {
        console.error("❌ خطأ أثناء تحميل التعليقات:", error);
    }
}

displayComments();