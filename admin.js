// admin.js

import { 
  auth, db, onAuthStateChanged, 
  doc, getDoc, setDoc, serverTimestamp, collection, addDoc 
} from './firebase-core.js';

document.addEventListener('DOMContentLoaded', () => {
  const authCheck = document.getElementById('auth-check');
  const adminContent = document.getElementById('admin-content');

  // ==========================================
  // === 🔔 نظام الإشعارات الفخم للأدمن ===
  // ==========================================
  function showToast(message, icon = 'fa-solid fa-bell') {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<i class="${icon} toast-icon"></i> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // ==========================================
  // 1. نظام الحماية
  // ==========================================
  onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.replace('index.html'); return; }
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().isAdmin === true) {
      authCheck.style.display = 'none'; adminContent.style.display = 'block';
    } else {
      window.location.replace('index.html');
    }
  });

  // ==========================================
  // 2. توليد التعاويذ
  // ==========================================
  const btnPromo = document.getElementById('btn-create-promo');
  btnPromo.addEventListener('click', async () => {
    const code = document.getElementById('promo-code').value.trim().toUpperCase();
    const stars = parseInt(document.getElementById('promo-stars').value);
    if (!code || isNaN(stars) || stars <= 0) return showToast('أدخل كود صحيح ونجوم أكبر من الصفر!', 'fa-solid fa-triangle-exclamation');
    
    btnPromo.disabled = true; btnPromo.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
      await setDoc(doc(db, 'promos', code), { stars: stars, createdAt: serverTimestamp() });
      showToast(`تم توليد التعويذة [ ${code} ] بنجاح! 🪄`, 'fa-solid fa-wand-magic-sparkles');
      document.getElementById('promo-code').value = ''; document.getElementById('promo-stars').value = '';
    } catch (e) { showToast('حدث خلل سحري!', 'fa-solid fa-bug'); } 
    finally { btnPromo.disabled = false; btnPromo.innerHTML = '<i class="fa-solid fa-plus"></i> توليد الكود'; }
  });

  // ==========================================
  // 3. نشر الأخبار
  // ==========================================
  const btnNews = document.getElementById('btn-publish-news');
  btnNews.addEventListener('click', async () => {
    const title = document.getElementById('news-title').value.trim();
    const body = document.getElementById('news-body').value.trim();
    if (!title || !body) return showToast('اكتب عنوان وتفاصيل الخبر أولاً!', 'fa-solid fa-circle-exclamation');
    
    btnNews.disabled = true; btnNews.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
      await addDoc(collection(db, 'news'), { title: title, body: body, author: auth.currentUser.displayName || "النقيب", createdAt: serverTimestamp() });
      showToast('تم نشر الإعلان بنجاح! 📰', 'fa-solid fa-bullhorn');
      document.getElementById('news-title').value = ''; document.getElementById('news-body').value = '';
    } catch (e) { showToast('حدث خطأ أثناء النشر!', 'fa-solid fa-circle-xmark'); } 
    finally { btnNews.disabled = false; btnNews.innerHTML = '<i class="fa-solid fa-paper-plane"></i> نشر الإعلان'; }
  });

  // ==========================================
  // 🌟 4. إضافة مهام جديدة بوقت محدد ⏳ 🌟
  // ==========================================
  const btnQuest = document.getElementById('btn-add-quest');
  btnQuest.addEventListener('click', async () => {
    const title = document.getElementById('quest-title').value.trim();
    const desc = document.getElementById('quest-desc').value.trim();
    const reward = parseInt(document.getElementById('quest-reward').value);
    const hours = parseInt(document.getElementById('quest-hours').value);

    if (!title || !desc || isNaN(reward) || reward <= 0 || isNaN(hours) || hours <= 0) {
      return showToast('الرجاء إدخال كل البيانات بشكل صحيح (النجوم والساعات)!', 'fa-solid fa-triangle-exclamation');
    }

    btnQuest.disabled = true; 
    btnQuest.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تعليق المهمة...';

    // 🌟 حساب وقت الانتهاء 🌟
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (hours * 60 * 60 * 1000)); 

    try {
      await addDoc(collection(db, 'quests'), { 
        title: title, 
        desc: desc, 
        reward: reward, 
        createdAt: serverTimestamp(),
        expiresAt: expiresAt // حفظ وقت الانتهاء في قاعدة البيانات
      });
      showToast('تمت إضافة المهمة للوحة النقابة بنجاح! ⚔️', 'fa-solid fa-scroll');
      document.getElementById('quest-title').value = ''; 
      document.getElementById('quest-desc').value = '';
      document.getElementById('quest-reward').value = '';
      document.getElementById('quest-hours').value = '';
    } catch (e) { 
      console.error(e);
      showToast('حدث خطأ أثناء إضافة المهمة!', 'fa-solid fa-circle-xmark'); 
    } finally { 
      btnQuest.disabled = false; 
      btnQuest.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> تعليق المهمة بوقت محدد'; 
    }
  });

});
