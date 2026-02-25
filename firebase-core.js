// firebase-core.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// ⚠️ تم إيقاف استيراد App Check مؤقتاً لتجنب توقف الموقع على Netlify
// import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-check.js";

import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// 3. ⚠️ تم إيقاف تفعيل الحماية (App Check) مؤقتاً حتى تعمل التبويبات والموقع بدون مشاكل
// const appCheck = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider('6LejEyesAAAAABQwxNg_Bz_zg4nZm4MznKjSuGJ3'),
//   isTokenAutoRefreshEnabled: true
// });

// 4. تجهيز الخدمات
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 5. تصدير الخدمات والدوال لاستخدامها في التطبيق
export { 
  auth, db, provider, 
  signInWithPopup, onAuthStateChanged, signOut, 
  doc, getDoc, setDoc, serverTimestamp, 
  collection, query, orderBy, limit, onSnapshot, addDoc, getDocs 
};
