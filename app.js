import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  databaseURL: "https://clan-forum-default-rtdb.firebaseio.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97",
  measurementId: "G-G6D8V7KSNH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUserData = null; // لتخزين بيانات المستخدم الحالي

// ================= نظام الإشعارات الداخلي (Custom Toasts) =================
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if(type === 'error') iconClass = 'fa-circle-xmark';
    if(type === 'info') iconClass = 'fa-circle-info';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span style="font-size: 14px; font-weight: 500;">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================= نظام استدعاء الملفات (Modular Routing) =================
window.switchTab = async function(tabId, element) {
    // تفعيل أيقونة الشريط
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(element) element.classList.add('active');

    const contentArea = document.getElementById('content-area');
    // إظهار علامة التحميل الأنيقة
    contentArea.innerHTML = '<div class="loader-container"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    try {
        // سحب الملف الخارجي (مثلاً: profile.html)
        const response = await fetch(`${tabId}.html`);
        if (!response.ok) throw new Error('الصفحة غير موجودة');
        
        const html = await response.text();
        contentArea.innerHTML = html;

        // إذا كانت الصفحة هي البروفايل، نقوم بتحديث البيانات بداخلها
        if(tabId === 'profile' && currentUserData) {
            setupProfileData();
        }
    } catch (error) {
        contentArea.innerHTML = `<div style="text-align:center; padding: 50px; color: #94a3b8;"><i class="fa-solid fa-file-circle-xmark fa-3x mb-3"></i><br>جاري بناء صفحة ${tabId}</div>`;
    }
}

// ================= المصادقة =================
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-screen').classList.replace('active', 'hidden');
        document.getElementById('app-screen').classList.replace('hidden', 'active');
        
        // جلب بيانات المستخدم
        get(ref(db, 'users/' + user.uid)).then((snapshot) => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
                showToast(`مرحباً بعودتك، ${currentUserData.name}!`, 'success');
                // فتح المنتدى كصفحة رئيسية
                switchTab('forum', document.getElementById('nav-forum'));
            }
        });
    } else {
        document.getElementById('app-screen').classList.replace('active', 'hidden');
        document.getElementById('auth-screen').classList.replace('hidden', 'active');
    }
});

window.login = function() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    if(!email || !pass) return showToast("يرجى إدخال البيانات!", "error");

    showToast("جاري تسجيل الدخول...", "info");
    signInWithEmailAndPassword(auth, email, pass).catch((error) => {
        showToast("خطأ في البريد أو كلمة المرور", "error");
    });
}

document.getElementById('btn-register').addEventListener('click', () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;

    if(!name || !email || !pass) return showToast("أكمل جميع الحقول!", "error");

    showToast("جاري إنشاء الحساب...", "info");
    createUserWithEmailAndPassword(auth, email, pass).then((userCred) => {
        const username = "@" + name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 100);
        set(ref(db, 'users/' + userCred.user.uid), {
            name: name, username: username, email: email
        });
    }).catch((error) => showToast(error.message, "error"));
});

// ================= دوال مساعدة لصفحة البروفايل =================
window.toggleAuth = function(formId) {
    document.querySelectorAll('.auth-box').forEach(box => {
        box.classList.remove('active-auth');
        box.classList.add('hidden-auth');
    });
    document.getElementById(formId).classList.replace('hidden-auth', 'active-auth');
}

window.setupProfileData = function() {
    if(currentUserData) {
        document.getElementById('user-display-name').innerText = currentUserData.name;
        document.getElementById('user-display-username').innerText = currentUserData.username;
        document.getElementById('settings-email').innerText = currentUserData.email;
    }
}

window.openSettings = function() {
    document.getElementById('settings-sheet').style.bottom = '0';
    document.getElementById('overlay').classList.add('active');
}
window.closeSettings = function() {
    document.getElementById('settings-sheet').style.bottom = '-100%';
    document.getElementById('overlay').classList.remove('active');
}
window.logout = function() {
    signOut(auth).then(() => showToast("تم تسجيل الخروج بنجاح", "info"));
}
window.toggleName = function() {
    document.getElementById('user-display-name').classList.toggle('hidden');
    document.getElementById('user-display-username').classList.toggle('hidden');
}
