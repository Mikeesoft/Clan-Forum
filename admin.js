// admin.js

import { 
  auth, db, onAuthStateChanged, 
  doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, onSnapshot, arrayUnion, arrayRemove 
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
  // 1. نظام الحماية (التحقق من النقيب)
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
  // 4. إضافة مهام جديدة بوقت محدد ⏳
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

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (hours * 60 * 60 * 1000)); 

    try {
      await addDoc(collection(db, 'quests'), { 
        title: title, 
        desc: desc, 
        reward: reward, 
        createdAt: serverTimestamp(),
        expiresAt: expiresAt 
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

  // ==========================================
  // 🌟 5. صندوق بريد النقيب (مراجعة المهام) 🌟
  // ==========================================
  const requestsContainer = document.getElementById('requests-container');
  const requestsCol = collection(db, "quest_requests");

  const qRequests = query(requestsCol, where("status", "==", "pending"));
  
  onSnapshot(qRequests, (snapshot) => {
    requestsContainer.innerHTML = '';
    
    if (snapshot.empty) {
      requestsContainer.innerHTML = '<p class="text-muted text-center" style="margin-top: 20px;"><i class="fa-solid fa-check-double"></i> صندوق البريد فارغ، لا توجد طلبات معلقة!</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const req = docSnap.data();
      const reqId = docSnap.id;

      // 💡 التعديل السحري هنا لمعالجة الروابط الناقصة
      let finalUrl = req.proofUrl.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }

      const box = document.createElement('div');
      box.className = 'request-box';
      box.innerHTML = `
        <div style="flex: 1; min-width: 200px;">
          <h4 style="color: var(--gold); margin-bottom: 5px;"><i class="fa-solid fa-user-ninja"></i> ${req.userName}</h4>
          <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 8px;">أنجز مهمة: <strong style="color: #fff;">${req.questTitle}</strong> (المكافأة: ${req.reward} نجمة)</p>
          <a href="${finalUrl}" target="_blank" style="color: var(--accent); font-size: 0.9rem; text-decoration: none; display: inline-block; background: rgba(139, 92, 246, 0.1); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3);">
            <i class="fa-solid fa-link"></i> عرض دليل الإنجاز
          </a>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button class="btn-primary btn-accept" data-id="${reqId}" data-uid="${req.userId}" data-reward="${req.reward}" data-qtitle="${req.questTitle}" style="background: #22c55e; color: #fff; padding: 8px 15px;"><i class="fa-solid fa-check"></i> قبول</button>
          <button class="btn-danger btn-reject" data-id="${reqId}" data-uid="${req.userId}" data-qid="${req.questId}" data-qtitle="${req.questTitle}" style="padding: 8px 15px;"><i class="fa-solid fa-xmark"></i> رفض</button>
        </div>
      `;
      requestsContainer.appendChild(box);
    });

    // --- برمجة زر القبول ✅ ---
    document.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const reqId = e.currentTarget.getAttribute('data-id');
        const uid = e.currentTarget.getAttribute('data-uid');
        const reward = parseInt(e.currentTarget.getAttribute('data-reward'));
        const qTitle = e.currentTarget.getAttribute('data-qtitle');
        
        if(confirm('هل أنت متأكد من قبول الدليل ومنح النجوم للمغامر؟')) {
          try {
            await updateDoc(doc(db, "quest_requests", reqId), { status: "approved" });
            
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if(userSnap.exists()) {
              const uData = userSnap.data();
              const newStars = (uData.stars || 0) + reward;
              const newLevel = Math.floor(newStars / 50);
              
              await updateDoc(userRef, {
                stars: newStars,
                level: newLevel,
                notifications: arrayUnion(`أحسنت! تمت إضافة ${reward} نجمة لحسابك لإنجاز مهمة: ${qTitle} 🌟`)
              });
            }
            showToast('تم قبول المهمة وإرسال النجوم بنجاح!', 'fa-solid fa-check-circle');
          } catch(err) {
            console.error(err);
            showToast('حدث خطأ أثناء القبول', 'fa-solid fa-bug');
          }
        }
      });
    });

    // --- برمجة زر الرفض ❌ ---
    document.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const reqId = e.currentTarget.getAttribute('data-id');
        const uid = e.currentTarget.getAttribute('data-uid');
        const qId = e.currentTarget.getAttribute('data-qid');
        const qTitle = e.currentTarget.getAttribute('data-qtitle');

        if(confirm('هل أنت متأكد من رفض هذا الدليل؟')) {
          try {
            await updateDoc(doc(db, "quest_requests", reqId), { status: "rejected" });
            
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
              pendingQuests: arrayRemove(qId), // بيمسح المهمة من قائمة قيد المراجعة عشان يقدر يعيدها
              notifications: arrayUnion(`للأسف، تم رفض دليلك لمهمة: ${qTitle} لأن الدليل غير صحيح. حاول مرة أخرى! ❌`)
            });

            showToast('تم رفض المهمة وإبلاغ المغامر!', 'fa-solid fa-times-circle');
          } catch(err) {
            console.error(err);
            showToast('حدث خطأ أثناء الرفض', 'fa-solid fa-bug');
          }
        }
      });
    });
  });

});
