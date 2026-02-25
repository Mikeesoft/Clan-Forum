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
  // 1. نظام الحماية: التحقق من هوية النقيب
  // ==========================================
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace('index.html');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists() && snap.data().isAdmin === true) {
      authCheck.style.display = 'none';
      adminContent.style.display = 'block';
    } else {
      window.location.replace('index.html');
    }
  });

  // ==========================================
  // 2. نظام توليد التعاويذ (Promo Codes)
  // ==========================================
  const btnPromo = document.getElementById('btn-create-promo');
  
  btnPromo.addEventListener('click', async () => {
    const code = document.getElementById('promo-code').value.trim().toUpperCase();
    const stars = parseInt(document.getElementById('promo-stars').value);

    // 🌟 استبدال نافذة المتصفح المزعجة بالإشعار الفخم
    if (!code || isNaN(stars) || stars <= 0) {
      return showToast('الرجاء إدخال كود صحيح وعدد نجوم أكبر من الصفر!', 'fa-solid fa-triangle-exclamation');
    }

    btnPromo.disabled = true;
    btnPromo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوليد...';

    try {
      await setDoc(doc(db, 'promos', code), {
        stars: stars,
        createdAt: serverTimestamp()
      });
      showToast(`تم توليد التعويذة [ ${code} ] بنجاح! 🪄`, 'fa-solid fa-wand-magic-sparkles');
      document.getElementById('promo-code').value = '';
      document.getElementById('promo-stars').value = '';
    } catch (e) {
      console.error(e);
      showToast('حدث خلل سحري أثناء التوليد!', 'fa-solid fa-bug');
    } finally {
      btnPromo.disabled = false;
      btnPromo.innerHTML = '<i class="fa-solid fa-plus"></i> توليد الكود';
    }
  });

  // ==========================================
  // 3. نظام نشر الأخبار (الإعلانات)
  // ==========================================
  const btnNews = document.getElementById('btn-publish-news');
  
  btnNews.addEventListener('click', async () => {
    const title = document.getElementById('news-title').value.trim();
    const body = document.getElementById('news-body').value.trim();

    // 🌟 استبدال نافذة المتصفح المزعجة بالإشعار الفخم
    if (!title || !body) {
      return showToast('الرجاء كتابة عنوان وتفاصيل الخبر أولاً!', 'fa-solid fa-circle-exclamation');
    }

    btnNews.disabled = true;
    btnNews.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النشر...';

    try {
      await addDoc(collection(db, 'news'), {
        title: title,
        body: body,
        author: auth.currentUser.displayName || "النقيب",
        createdAt: serverTimestamp()
      });
      showToast('تم نشر الإعلان في النقابة بنجاح! 📰', 'fa-solid fa-bullhorn');
      document.getElementById('news-title').value = '';
      document.getElementById('news-body').value = '';
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء نشر الخبر!', 'fa-solid fa-circle-xmark');
    } finally {
      btnNews.disabled = false;
      btnNews.innerHTML = '<i class="fa-solid fa-bullhorn"></i> نشر الإعلان';
    }
  });

});
