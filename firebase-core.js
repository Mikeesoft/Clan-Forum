// firebase-core.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-check.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 1. إعدادات مشروعك
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

// 2. تهيئة فايربيس
const app = initializeApp(firebaseConfig);

// 3. تفعيل الحماية (App Check) على مستوى الموقع كله
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LejEyesAAAAABQwxNg_Bz_zg4nZm4MznKjSuGJ3'),
  isTokenAutoRefreshEnabled: true
});

// 4. تصدير الخدمات عشان نستخدمها في باقي الملفات
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
export { signInWithPopup, onAuthStateChanged, signOut, doc, getDoc, setDoc, serverTimestamp };
