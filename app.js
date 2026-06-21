// استيراد فايربيز
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// استيراد مكون البروفايل من الملف الجديد
import { renderProfile } from "./profile.js";

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

let currentUserData = null; 

// ================= نظام الإشعارات =================
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

// ================= نظام التنقل (SPA Router) =================
window.switchTab = function(tabId, element) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(element) element.classList.add('active');

    const contentArea = document.getElementById('content-area');

    if (tabId === 'profile') {
        // نستخدم الدالة المستوردة من profile.js ونمرر لها البيانات
        contentArea.innerHTML = renderProfile(currentUserData);
    } else {
        contentArea.innerHTML = `<div style="text-align:center; padding: 50px; color: #94a3b8;"><i class="fa-solid fa-file-circle-xmark fa-3x mb-3"></i><br>جاري بناء صفحة ${tabId}</div>`;
    }
}

// ================= دوال التطبيق العامة =================
window.toggleTheme = function() {
    document.body.classList.toggle('light-theme');
}

window.toggleAuth = function(formId) {
    document.querySelectorAll('.auth-box').forEach(box => {
        box.classList.remove('active-auth');
        box.classList.add('hidden-auth');
    });
    document.getElementById(formId).classList.replace('hidden-auth', 'active-auth');
}

// ================= المصادقة وقاعدة البيانات =================
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-screen').classList.replace('active', 'hidden');
        document.getElementById('app-screen').classList.replace('hidden', 'active');
        
        get(ref(db, 'users/' + user.uid)).then((snapshot) => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
                showToast(`مرحباً بك، ${currentUserData.name}`, 'success');
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
        showToast("تأكد من صحة البيانات!", "error");
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

window.logout = function() {
    signOut(auth).then(() => {
        if(document.getElementById('overlay')) {
            // استدعاء دالة الإغلاق لو الإعدادات كانت مفتوحة
            window.closeSettings(); 
        }
        showToast("تم تسجيل الخروج", "info");
    });
}
