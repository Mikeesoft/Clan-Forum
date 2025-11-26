/* main.js - منطق التطبيق */

// استيراد Firebase (نفس المكتبات السابقة)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعدادات Firebase (نفسها الخاصة بك)
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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* ====== 1. التحكم في التنقل (Navigation Logic) ====== */
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page-view');
const mainHeader = document.getElementById('mainHeader');

// التنقل عبر الشريط السفلي
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // 1. تحديث الأيقونات النشطة
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // 2. إظهار الصفحة المطلوبة
        const targetId = item.getAttribute('data-target');
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // 3. إخفاء/إظهار الهيدر العلوي (يظهر فقط في الرئيسية)
        if (targetId === 'feed-page') {
            mainHeader.style.display = 'flex';
        } else {
            mainHeader.style.display = 'none';
        }
    });
});

/* ====== 2. إدارة المستخدم (User & Menu) ====== */
const menuUserProfile = document.getElementById('menuUserProfile');
const menuLoginBtn = document.getElementById('menuLoginBtn');
const menuLogoutBtn = document.getElementById('menuLogoutBtn');

// مراقبة حالة المستخدم
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // المستخدم مسجل دخوله
        const userRef = doc(db, "users", user.uid);
        let stars = 0;
        
        // محاولة جلب النجوم من القاعدة
        try {
            const snap = await getDoc(userRef);
            if(snap.exists()) stars = snap.data().stars || 0;
        } catch(e) {}

        // تحديث واجهة "المزيد" بشكل البروفايل (زي الصورة الأخيرة)
        menuUserProfile.innerHTML = `
            <img src="${user.photoURL}" style="width:60px; height:60px; border-radius:50%; border:2px solid #333;">
            <div style="flex:1;">
                <h3 style="color:#fff; margin:0;">${user.displayName}</h3>
                <span style="color:#aaa; font-size:0.85rem;">@${user.uid.substring(0,8)}...</span>
                <div class="menu-stats">
                    <div class="stat-tag"><i class="fas fa-star" style="color:#f1c40f"></i> ${stars}</div>
                    <div class="stat-tag"><i class="fas fa-gem" style="color:#3498db"></i> 0</div>
                </div>
            </div>
            <a href="profile.html" style="color:#aaa;"><i class="fas fa-chevron-left"></i></a>
        `;
        
        menuLogoutBtn.style.display = 'flex'; // إظهار زر الخروج
        
        // تفعيل زر الخروج
        menuLogoutBtn.onclick = () => signOut(auth);

    } else {
        // المستخدم زائر
        menuUserProfile.innerHTML = `
             <div style="padding:20px; width:100%; text-align:center;">
                 <p style="color:#aaa; margin-bottom:10px;">سجل دخولك لتتفاعل وتجمع النجوم!</p>
                 <button id="menuLoginBtnInternal" class="app-btn" style="width:100%">تسجيل الدخول / إنشاء حساب</button>
            </div>
        `;
        document.getElementById('menuLoginBtnInternal').onclick = () => signInWithPopup(auth, provider);
        menuLogoutBtn.style.display = 'none';
    }
});

/* ====== 3. نافذة النشر (Create Post Modal) ====== */
const addPostFab = document.getElementById('addPostFab');
const createPostModal = document.getElementById('createPostModal');
const closePostModal = document.getElementById('closePostModal');
const publishPostBtn = document.getElementById('publishPostBtn');
const postContentInput = document.getElementById('postContentInput');

// فتح النافذة
addPostFab.addEventListener('click', () => {
    if(!auth.currentUser) return alert("يجب تسجيل الدخول للنشر!");
    createPostModal.style.display = 'flex';
    postContentInput.focus();
});

// إغلاق النافذة
closePostModal.addEventListener('click', () => {
    createPostModal.style.display = 'none';
});

// نشر البوست
publishPostBtn.addEventListener('click', async () => {
    const text = postContentInput.value.trim();
    if (!text) return;

    publishPostBtn.disabled = true;
    publishPostBtn.textContent = "جاري النشر...";

    try {
        await addDoc(collection(db, "posts"), {
            text: text,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName,
            authorAvatar: auth.currentUser.photoURL,
            createdAt: serverTimestamp(),
            likes: 0
        });
        createPostModal.style.display = 'none';
        postContentInput.value = "";
        // هنا ممكن تضيف كود لإظهار توست "تم النشر"
    } catch (e) {
        alert("فشل النشر: " + e.message);
    } finally {
        publishPostBtn.disabled = false;
        publishPostBtn.textContent = "نشر";
    }
});
