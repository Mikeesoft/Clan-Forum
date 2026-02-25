// firebase-core.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// ⚠️ تم إيقاف استيراد App Check مؤقتاً
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
  getDocs,
  deleteDoc // 👈 🌟 أضفنا أمر الحذف هنا 🌟
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

// 4. تجهيز الخدمات
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 5. تصدير الخدمات والدوال لاستخدامها في التطبيق
export { 
  auth, db, provider, 
  signInWithPopup, onAuthStateChanged, signOut, 
  doc, getDoc, setDoc, serverTimestamp, 
  collection, query, orderBy, limit, onSnapshot, addDoc, getDocs, 
  deleteDoc // 👈 🌟 وأضفناها هنا كمان عشان الـ app.js يقدر يستخدمها 🌟
};
