/* config.js - القلب النابض للمشروع */

// 1. استيراد المكتبات مرة واحدة فقط
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 2. إعدادات المشروع (مركزية)
const firebaseConfig = {
  apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg", 
  authDomain: "clan-forum.firebaseapp.com",
  projectId: "clan-forum",
  storageBucket: "clan-forum.firebasestorage.app",
  messagingSenderId: "1011903491894",
  appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

// 3. تهيئة التطبيق وتصدير الأدوات لاستخدامها في الملفات الأخرى
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// 4. ثوابت النظام (سهولة التعديل مستقبلاً)
export const GAME_CONSTANTS = {
    STARS_PER_LEVEL: 50,
    MAX_LEVEL: 100,
    STARS_FOR_PRESTIGE: 500,
    PRESTIGE_SYMBOLS: ['⭐', 'Σ', 'Δ', 'Ω', 'Ψ', 'Φ']
};

/**
 * 🟢 دالة مركزية لحساب الرتبة والمستوى
 * @param {number} stars - عدد النجوم الكلي
 * @returns {object} - { level, prestigeSymbol, progressPercent, nextTarget }
 */
export function calculateUserRank(stars = 0) {
    const { STARS_PER_LEVEL, MAX_LEVEL, STARS_FOR_PRESTIGE, PRESTIGE_SYMBOLS } = GAME_CONSTANTS;
    
    const maxBaseStars = MAX_LEVEL * STARS_PER_LEVEL; // 5000 نجمة

    let level = 0;
    let prestigeIndex = 0;
    let progressPercent = 0;
    let nextTarget = 0; // النجوم المتبقية للمستوى التالي

    if (stars < maxBaseStars) {
        // الحالة العادية (تحت المستوى 100)
        level = Math.floor(stars / STARS_PER_LEVEL);
        const starsInCurrentLevel = stars % STARS_PER_LEVEL;
        progressPercent = (starsInCurrentLevel / STARS_PER_LEVEL) * 100;
        nextTarget = STARS_PER_LEVEL - starsInCurrentLevel;
        prestigeIndex = 0;
    } else {
        // حالة الأساطير (Prestige)
        level = MAX_LEVEL;
        const starsBeyondMax = stars - maxBaseStars;
        
        // حساب الرتبة الفخرية
        prestigeIndex = Math.min(Math.floor(starsBeyondMax / STARS_FOR_PRESTIGE) + 1, PRESTIGE_SYMBOLS.length - 1);
        
        // حساب التقدم داخل الرتبة الفخرية
        const starsInCurrentPrestige = starsBeyondMax % STARS_FOR_PRESTIGE;
        
        // إذا وصل لأخر رتبة، التقدم يكون 100%
        if (prestigeIndex >= PRESTIGE_SYMBOLS.length - 1) {
            progressPercent = 100;
            nextTarget = 0;
        } else {
            progressPercent = (starsInCurrentPrestige / STARS_FOR_PRESTIGE) * 100;
            nextTarget = STARS_FOR_PRESTIGE - starsInCurrentPrestige;
        }
    }

    return {
        level: level,
        prestigeSymbol: PRESTIGE_SYMBOLS[prestigeIndex] || PRESTIGE_SYMBOLS[0],
        isPrestige: prestigeIndex > 0,
        progressPercent: Math.min(Math.max(progressPercent, 0), 100),
        nextTarget: nextTarget
    };
}
