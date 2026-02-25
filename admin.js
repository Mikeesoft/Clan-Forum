// admin.js

import { 
  auth, db, onAuthStateChanged, 
  doc, getDoc, setDoc, serverTimestamp, collection, addDoc 
} from './firebase-core.js';

document.addEventListener('DOMContentLoaded', () => {
  const authCheck = document.getElementById('auth-check');
  const adminContent = document.getElementById('admin-content');

  // ==========================================
  // 1. نظام الحماية: التحقق من هوية النقيب
  // ==========================================
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // لو مش مسجل دخول، اطرده للصفحة الرئيسية
      window.location.replace('index.html');
      return;
    }

    // جلب بيانات المستخدم من Firestore
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    // التحقق هل يمتلك صلاحية (isAdmin: true)
    if (snap.exists() && snap.data().isAdmin === true) {
      // أهلاً بالنقيب! افتح الأبواب
      authCheck.style.display = 'none';
      adminContent.style.display = 'block';
    } else {
      // محاولة اختراق! اطرده
      alert('عذراً! هذه الغرفة السرية مخصصة لنقيب الأبطال فقط 🛡️');
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

    if (!code || isNaN(stars) || stars <= 0) {
      return alert('الرجاء إدخال كود صحيح وعدد نجوم أكبر من الصفر!');
    }

    btnPromo.disabled = true;
    btnPromo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوليد...';

    try {
      // حفظ الكود في كوليكشن promos
      await setDoc(doc(db, 'promos', code), {
        stars: stars,
        createdAt: serverTimestamp()
      });
      alert(`تم توليد التعويذة [ ${code} ] بنجاح! 🪄`);
      document.getElementById('promo-code').value = '';
      document.getElementById('promo-stars').value = '';
    } catch (e) {
      console.error(e);
      alert('حدث خلل سحري أثناء التوليد!');
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

    if (!title || !body) {
      return alert('الرجاء كتابة عنوان وتفاصيل الخبر أولاً!');
    }

    btnNews.disabled = true;
    btnNews.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النشر...';

    try {
      // حفظ الخبر في كوليكشن news
      await addDoc(collection(db, 'news'), {
        title: title,
        body: body,
        author: auth.currentUser.displayName,
        createdAt: serverTimestamp()
      });
      alert('تم نشر الإعلان في النقابة بنجاح! 📰');
      document.getElementById('news-title').value = '';
      document.getElementById('news-body').value = '';
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء نشر الخبر!');
    } finally {
      btnNews.disabled = false;
      btnNews.innerHTML = '<i class="fa-solid fa-bullhorn"></i> نشر الإعلان';
    }
  });

});
