import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// إعداد Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
    authDomain: "clan-forum.firebaseapp.com",
    projectId: "clan-forum",
    storageBucket: "clan-forum.firebasestorage.app",
    messagingSenderId: "1011903491894",
    appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// معرف البوست
const postDocRef = doc(db, "posts", "main-post");
const commentsColRef = collection(postDocRef, "comments");

// تسجيل الدخول بجوجل
const provider = new GoogleAuthProvider();
document.getElementById("googleLoginBtn").addEventListener("click", () => {
    signInWithPopup(auth, provider);
});

// حالة تسجيل الدخول
let currentUser = null;
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById("loginBtnContainer").innerHTML = `<span>مرحبًا، ${user.displayName}</span>`;
    }
});

// زر الإعجاب
document.getElementById("likeBtn").addEventListener("click", async () => {
    await updateDoc(postDocRef, {
        likes: increment(1)
    });
});

// تحديث عداد الإعجابات مباشرة
onSnapshot(postDocRef, (docSnap) => {
    if (docSnap.exists()) {
        document.getElementById("likeCount").textContent = docSnap.data().likes || 0;
    }
});

// عرض التعليقات فورًا
const commentsContainer = document.getElementById("commentsContainer");
onSnapshot(commentsColRef, (snapshot) => {
    commentsContainer.innerHTML = "";
    snapshot.forEach((doc) => {
        const data = doc.data();
        const div = document.createElement("div");
        div.classList.add("comment");
        div.textContent = `${data.user}: ${data.text}`;
        commentsContainer.appendChild(div);
    });
});

// إضافة تعليق
document.getElementById("commentBtn").addEventListener("click", async () => {
    if (!currentUser) {
        alert("سجّل الدخول أولًا للتعليق");
        return;
    }
    const text = prompt("اكتب تعليقك:");
    if (text && text.trim() !== "") {
        await addDoc(commentsColRef, {
            user: currentUser.displayName || "مجهول",
            text: text.trim()
        });
    }
});