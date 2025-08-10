// استيراد Firebase
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
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// عناصر الـ DOM
const likeBtn = document.getElementById("likeBtn");
const likeCount = document.getElementById("likeCount");
const commentForm = document.getElementById("commentForm");
const commentInput = document.getElementById("commentInput");
const commentsList = document.getElementById("commentsList");

// معرف البوست الرئيسي
const postRef = doc(db, "posts", "main-post");

// ====== نظام الإعجابات ======
if (likeBtn) {
  likeBtn.addEventListener("click", async () => {
    if (!auth.currentUser) {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("فشل تسجيل الدخول (لا يوجد like):", err);
        alert("لا يمكن الإعجاب قبل تسجيل الدخول.");
        return;
      }
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(postRef);
        if (!snap.exists()) {
          transaction.set(postRef, { likes: 1, likedBy: [user.uid] });
          return;
        }
        
        const data = snap.data();
        const likedBy = Array.isArray(data.likedBy) ? data.likedBy.slice() : [];
        const likesNow = typeof data.likes === "number" ? data.likes : 0;
        const already = likedBy.includes(user.uid);
        
        if (already) {
          const newLikedBy = likedBy.filter(id => id !== user.uid);
          transaction.update(postRef, {
            likedBy: newLikedBy,
            likes: Math.max(0, likesNow - 1)
          });
        } else {
          likedBy.push(user.uid);
          transaction.update(postRef, {
            likedBy: likedBy,
            likes: likesNow + 1
          });
        }
      });
    } catch (err) {
      console.error("خطأ أثناء تحديث الإعجاب:", err);
      if (err.code && err.code.includes("permission")) {
        alert("لا تملك صلاحية تحديث الإعجاب — تأكد من قواعد Firestore.");
      }
    }
  });
  
  // متابعة تغييرات الإعجابات
  onSnapshot(postRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      likeCount.textContent = data.likes || 0;
    }
  });
}

// ====== نظام التعليقات ======
if (commentForm) {
  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("فشل تسجيل الدخول (لا يوجد تعليق):", err);
        alert("لا يمكن التعليق قبل تسجيل الدخول.");
        return;
      }
    }
    
    const user = auth.currentUser;
    const text = commentInput.value.trim();
    if (!text) return;
    
    try {
      await addDoc(collection(db, "comments"), {
        text: text,
        uid: user.uid,
        displayName: user.displayName || "مستخدم مجهول",
        createdAt: serverTimestamp()
      });
      commentInput.value = "";
    } catch (err) {
      console.error("خطأ أثناء إضافة التعليق:", err);
    }
  });
  
  // متابعة التعليقات وعرضها
  const q = query(collection(db, "comments"), orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    commentsList.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = `${data.displayName}: ${data.text}`;
      commentsList.appendChild(li);
    });
  });
}

// ====== متابعة حالة تسجيل الدخول ======
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("تم تسجيل الدخول:", user.displayName);
  } else {
    console.log("لم يتم تسجيل الدخول");
  }
});