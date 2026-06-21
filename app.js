// ================= 1. استيراد مكتبات فايربيز =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ================= 2. إعدادات مشروعك =================
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

// تشغيل فايربيز
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ================= 3. دوال الواجهة (UI Functions) =================
// جعل الدوال عامة (Global) لتعمل مع HTML مباشرة
window.switchTab = function(tabId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    document.getElementById(`${tabId}-view`).classList.remove('hidden');
    document.getElementById(`${tabId}-view`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

window.toggleName = function() {
    document.getElementById('user-display-name').classList.toggle('hidden');
    document.getElementById('user-display-username').classList.toggle('hidden');
}

window.openSettings = function() {
    document.getElementById('settings-sheet').style.bottom = '0';
    document.getElementById('overlay').classList.add('active');
}

window.closeSettings = function() {
    document.getElementById('settings-sheet').style.bottom = '-100%';
    document.getElementById('overlay').classList.remove('active');
}

window.toggleTheme = function() {
    document.body.classList.toggle('light-theme');
}

window.toggleAuth = function(formId) {
    document.querySelectorAll('.auth-box').forEach(box => {
        box.classList.remove('active-auth');
        box.classList.add('hidden-auth');
    });
    document.getElementById(formId).classList.remove('hidden-auth');
    document.getElementById(formId).classList.add('active-auth');
}

// ================= 4. المراقبة الذكية (تذكر المستخدم) =================
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // إذا كان مسجلاً، ادخل للتطبيق فوراً
        authScreen.classList.remove('active');
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        appScreen.classList.add('active');

        // جلب بياناته من قاعدة البيانات لعرضها في البروفايل
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                document.getElementById('user-display-name').innerText = userData.name;
                document.getElementById('user-display-username').innerText = userData.username;
            }
        });
    } else {
        // إذا لم يكن مسجلاً، أظهر شاشة الدخول
        appScreen.classList.remove('active');
        appScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
        authScreen.classList.add('active');
    }
});

// ================= 5. برمجة الأزرار والعمليات =================

// تسجيل الدخول
window.login = function() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const btn = document.querySelector('#login-form .primary-btn');

    if(!email || !pass) return alert("يرجى إدخال البريد وكلمة المرور!");

    btn.innerText = "جاري الدخول...";
    signInWithEmailAndPassword(auth, email, pass).catch((error) => {
        btn.innerText = "تسجيل الدخول";
        alert("تأكد من صحة البريد الإلكتروني وكلمة المرور.");
    });
}

// إنشاء حساب جديد
document.querySelector('#register-form .primary-btn').addEventListener('click', () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const btn = document.querySelector('#register-form .primary-btn');

    if(!name || !email || !pass) return alert("يرجى ملء جميع الحقول!");

    btn.innerText = "جاري إنشاء الحساب...";
    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            const user = userCredential.user;
            // توليد يوزر نيم تلقائي (مثال: @mohammed123)
            const username = "@" + name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
            
            // حفظ البيانات في قاعدة البيانات (Realtime DB)
            set(ref(db, 'users/' + user.uid), {
                name: name,
                username: username,
                email: email,
                createdAt: Date.now()
            }).then(() => {
                btn.innerText = "إنشاء حساب";
                // فايربيز سيدخله تلقائياً ويطلق onAuthStateChanged
            });
        })
        .catch((error) => {
            btn.innerText = "إنشاء حساب";
            alert("حدث خطأ: " + error.message);
        });
});

// استعادة كلمة المرور
document.querySelector('#reset-form .primary-btn').addEventListener('click', () => {
    const email = document.getElementById('reset-email').value;
    if(!email) return alert("أدخل بريدك الإلكتروني أولاً!");
    
    sendPasswordResetEmail(auth, email)
        .then(() => alert("تم إرسال رابط الاستعادة إلى بريدك!"))
        .catch(error => alert("حدث خطأ: " + error.message));
});

// تسجيل الخروج
document.querySelector('.text-danger').addEventListener('click', () => {
    signOut(auth).then(() => {
        closeSettings();
        // بمجرد الخروج ستعمل onAuthStateChanged وتعود لشاشة الدخول
    });
});
