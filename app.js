// app.js

import { 
  auth, db, provider, 
  signInWithPopup, onAuthStateChanged, signOut, 
  doc, getDoc, setDoc, serverTimestamp, 
  collection, query, orderBy, limit, onSnapshot, addDoc, getDocs, deleteDoc 
} from './firebase-core.js';

document.addEventListener('DOMContentLoaded', () => {

  let myCurrentAvatar = 'https://via.placeholder.com/35';
  let myCurrentUsername = 'مغامر';
  let isCurrentUserAdmin = false;

  // ==========================================
  // === 🎴 نظام رتب الأنمي ===
  // ==========================================
  function getRank(stars) {
    if (stars >= 10000) return { title: 'SS-Class', color: '#ff007f', shadow: '0 0 10px #ff007f' };
    if (stars >= 5000) return { title: 'S-Class', color: '#fbbf24', shadow: '0 0 10px #fbbf24' };
    if (stars >= 2500) return { title: 'A-Class', color: '#ef4444', shadow: '0 0 10px #ef4444' };
    if (stars >= 1000) return { title: 'B-Class', color: '#8b5cf6', shadow: '0 0 10px #8b5cf6' };
    if (stars >= 500) return { title: 'C-Class', color: '#3b82f6', shadow: '0 0 10px #3b82f6' };
    if (stars >= 100) return { title: 'D-Class', color: '#22c55e', shadow: '0 0 10px #22c55e' };
    return { title: 'F-Class', color: '#94a3b8', shadow: 'none' };
  }

  // ==========================================
  // === 1. نظام الإشعارات (Toast الاحترافي) ===
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
  // === 2. التنقل بين الأقسام ===
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.page-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-target');

      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(targetId).classList.add('active');
      document.getElementById('main-content').scrollTop = 0;
      
      if (targetId === 'tab-leaderboard') loadLeaderboard();
    });
  });

  // ==========================================
  // === 3. نظام الأخبار الديناميكية ===
  // ==========================================
  const newsContainer = document.getElementById('news-container');
  const newsCol = collection(db, "news");

  function initNews() {
    if (!newsContainer) return;
    
    const q = query(newsCol, orderBy("createdAt", "desc"), limit(5));
    onSnapshot(q, (snapshot) => {
      newsContainer.innerHTML = ''; 
      
      if (snapshot.empty) {
        newsContainer.innerHTML = '<p class="text-muted text-center" style="margin-top: 30px;">لا توجد إعلانات حالياً في النقابة.</p>';
        return;
      }

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const newsId = docSnap.id; 
        let timeString = 'الآن';
        
        if (data.createdAt) {
          const d = data.createdAt.toDate();
          timeString = d.toLocaleDateString('ar-EG') + ' - ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        }

        const deleteBtnHTML = isCurrentUserAdmin ? `
          <button class="delete-news-btn" data-id="${newsId}" title="حذف الإعلان"><i class="fa-solid fa-trash-can"></i></button>
        ` : '';

        const newsCard = document.createElement('div');
        newsCard.className = 'glass-card news-card';
        newsCard.innerHTML = `
          ${deleteBtnHTML}
          <h3 style="color: var(--accent); margin-bottom: 8px; padding-right: ${isCurrentUserAdmin ? '40px' : '0'};">${data.title}</h3>
          <p class="text-muted" style="line-height: 1.6; white-space: pre-wrap;">${data.body}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid var(--card-border); padding-top: 10px;">
            <span class="date-badge" style="margin-top: 0;"><i class="fa-regular fa-clock"></i> ${timeString}</span>
            <span style="font-size: 0.8rem; color: var(--gold);"><i class="fa-solid fa-pen-nib"></i> ${data.author || 'النقيب'}</span>
          </div>
        `;
        newsContainer.appendChild(newsCard);
      });

      if (isCurrentUserAdmin) {
        document.querySelectorAll('.delete-news-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const newsId = e.currentTarget.getAttribute('data-id');
            if (confirm('هل أنت متأكد يا نقيب أنك تريد حذف هذا الإعلان؟ 🗑️')) {
              try { await deleteDoc(doc(db, "news", newsId)); showToast('تم حذف الإعلان بنجاح!', 'fa-solid fa-trash-can'); } 
              catch (error) { showToast('فشل الحذف. تأكد من صلاحياتك!', 'fa-solid fa-circle-xmark'); }
            }
          });
        });
      }
    }, (error) => { console.error("News error:", error); });
  }

  // ==========================================
  // === 4. نظام المهام (اليومي + المؤقت) ⚔️ ===
  // ==========================================
  const dailyQuestBtn = document.getElementById('daily-quest-btn');
  const questsContainer = document.getElementById('quests-container');
  const homeQuestsContainer = document.getElementById('home-quests-container');
  const questsCol = collection(db, "quests");

  function getTodayDate() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

  // 🔴 4.1 المهمة اليومية (الثابتة)
  function checkDailyQuestStatus(userData) {
    if (!dailyQuestBtn) return;
    const today = getTodayDate();
    if (userData && userData.lastClaimDate === today) {
      dailyQuestBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> تمت المهمة';
      dailyQuestBtn.style.background = 'rgba(255,255,255,0.1)'; dailyQuestBtn.style.color = 'var(--text-muted)'; dailyQuestBtn.disabled = true;
    } else {
      dailyQuestBtn.innerHTML = '<i class="fa-solid fa-star"></i> استلام 5';
      dailyQuestBtn.style.background = 'var(--accent)'; dailyQuestBtn.style.color = '#fff'; dailyQuestBtn.disabled = false;
    }
  }

  if (dailyQuestBtn) {
    dailyQuestBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) return showToast('يجب تسجيل الدخول لاستلام المهمة اليومية!', 'fa-solid fa-lock');

      dailyQuestBtn.disabled = true; dailyQuestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      const userRef = doc(db, 'users', user.uid);
      
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const today = getTodayDate();

        if (data.lastClaimDate === today) {
          showToast('لقد استلمت مهمة اليوم بالفعل!', 'fa-solid fa-circle-info');
          checkDailyQuestStatus(data); return;
        }

        const newStars = (data.stars || 0) + 5;
        const newLevel = Math.floor(newStars / 50);

        await setDoc(userRef, { stars: newStars, level: newLevel, lastClaimDate: today }, { merge: true });
        showToast(`دخول يومي ناجح! حصلت على 5 نجوم 🌟`, 'fa-solid fa-calendar-check');
        checkDailyQuestStatus({ lastClaimDate: today });
        updateUI(user, { ...data, stars: newStars, level: newLevel, lastClaimDate: today });
      } catch (error) { showToast('حدث خلل سحري!', 'fa-solid fa-bug'); dailyQuestBtn.disabled = false; dailyQuestBtn.innerHTML = '<i class="fa-solid fa-star"></i> استلام 5'; }
    });
  }

  // 🔴 4.2 المهام الديناميكية (المؤقتة)
  function initQuests(user, userData) {
    if (!questsContainer) return;
    const q = query(questsCol, orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
      questsContainer.innerHTML = '';
      if (homeQuestsContainer) homeQuestsContainer.innerHTML = '';
      
      let claimedQuests = userData?.claimedQuests || [];
      const now = new Date();
      let activeQuestsCount = 0;

      snapshot.forEach((docSnap) => {
        const quest = docSnap.data();
        const questId = docSnap.id;
        
        if (!quest.expiresAt) return;
        const expiryDate = quest.expiresAt.toDate();
        if (now > expiryDate) return; // إخفاء المهمة إذا انتهى وقتها

        const timeLeftMs = expiryDate - now;
        const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
        const timeText = hoursLeft > 0 ? `ينتهي بعد ${hoursLeft} ساعة` : 'ينتهي قريباً جداً!';
        const isClaimed = claimedQuests.includes(questId);
        
        const questCard = document.createElement('div');
        questCard.className = 'glass-card quest-card';
        questCard.innerHTML = `
          <div class="quest-info" style="flex: 1;">
            <h3 style="color: ${isClaimed ? 'var(--text-muted)' : 'var(--text-main)'};">
              ${isClaimed ? '<i class="fa-solid fa-check-double" style="color: var(--gold);"></i>' : ''} ${quest.title}
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-top: 5px;">${quest.desc}</p>
            <span class="date-badge" style="color: var(--danger); border: 1px solid var(--danger); background: rgba(239, 68, 68, 0.1);"><i class="fa-solid fa-hourglass-half"></i> ${timeText}</span>
          </div>
          <button class="btn-primary claim-btn" data-id="${questId}" data-reward="${quest.reward}" ${isClaimed ? 'disabled style="background: rgba(255,255,255,0.1); color: var(--text-muted);"' : ''}>
            ${isClaimed ? 'مكتملة' : `<i class="fa-solid fa-star"></i> استلام ${quest.reward}`}
          </button>
        `;

        questsContainer.appendChild(questCard);
        
        // عرض مهمتين فقط في الرئيسية
        if (homeQuestsContainer && activeQuestsCount < 2) {
          homeQuestsContainer.appendChild(questCard.cloneNode(true));
        }
        activeQuestsCount++;
      });

      if (activeQuestsCount === 0) {
        questsContainer.innerHTML = '<p class="text-muted text-center" style="margin-top: 30px;">لا توجد مهام إضافية نشطة. استرح يا بطل! ☕</p>';
        if (homeQuestsContainer) homeQuestsContainer.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">لا توجد مهام عاجلة.</p>';
      }

      // تفعيل زر استلام المهمة المؤقتة
      document.querySelectorAll('.claim-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (!user) return showToast('يجب تسجيل الدخول لاستلام المهام!', 'fa-solid fa-lock');
          
          const targetBtn = e.currentTarget;
          const qId = targetBtn.getAttribute('data-id');
          const reward = parseInt(targetBtn.getAttribute('data-reward'));

          targetBtn.disabled = true; targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

          try {
            const freshUserSnap = await getDoc(doc(db, 'users', user.uid));
            const freshData = freshUserSnap.data();
            const currentClaimed = freshData.claimedQuests || [];

            if (currentClaimed.includes(qId)) {
              showToast('لقد استلمت هذه المهمة بالفعل!', 'fa-solid fa-circle-info'); return;
            }

            currentClaimed.push(qId);
            const newStars = (freshData.stars || 0) + reward;
            const newLevel = Math.floor(newStars / 50);

            await setDoc(doc(db, 'users', user.uid), {
              stars: newStars, level: newLevel, claimedQuests: currentClaimed
            }, { merge: true });

            showToast(`عاش! أنجزت المهمة وحصلت على ${reward} نجمة 🌟`, 'fa-solid fa-khanda');
            
            // تحديث بيانات الواجهة فوراً
            freshData.claimedQuests = currentClaimed; freshData.stars = newStars; freshData.level = newLevel;
            updateUI(user, freshData);
            initQuests(user, freshData);

          } catch (error) { showToast('حدث خلل سحري أثناء الاستلام!', 'fa-solid fa-bug'); targetBtn.disabled = false; targetBtn.innerHTML = `<i class="fa-solid fa-star"></i> استلام ${reward}`; }
        });
      });
    });
  }


  // ==========================================
  // === 5. تسجيل الدخول وتحديث الواجهة ===
  // ==========================================
  const profileContent = document.getElementById('profile-content');
  const welcomeText = document.getElementById('welcome-text');

  function updateUI(user, userData = null) {
    if (user) {
      const customName = userData?.username || user.displayName || 'مغامر';
      const photo = userData?.photoURL || user.photoURL || 'https://via.placeholder.com/90';
      const level = userData?.level || 0;
      const stars = userData?.stars || 0;
      const rank = getRank(stars);
      const isAdmin = userData?.isAdmin === true;

      myCurrentAvatar = photo; myCurrentUsername = customName; isCurrentUserAdmin = isAdmin;
      welcomeText.innerHTML = `مرحباً بعودتك، ${customName.split(' ')[0]} 👋`;

      const adminButtonHTML = isAdmin ? `
        <button id="go-to-admin-btn" class="btn-primary" style="width: 100%; margin-top: 15px; background: var(--gold); color: #000; box-shadow: 0 0 10px rgba(251, 191, 36, 0.4);">
          <i class="fa-solid fa-crown"></i> الدخول لغرفة القيادة
        </button>
      ` : '';

      profileContent.innerHTML = `
        <div class="section-title">هوية المغامر 🆔</div>
        <div class="glass-card profile-header">
          <div class="avatar-wrapper">
            <img src="${photo}" alt="Avatar" class="avatar-large" id="profile-img-preview" style="object-fit: cover;">
            <label for="avatar-upload" class="edit-avatar-btn"><i class="fa-solid fa-camera"></i></label>
            <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
          </div>
          <h2>${customName} <span class="rank-badge" style="color: ${rank.color}; border-color: ${rank.color}; box-shadow: ${rank.shadow};">${rank.title}</span></h2>
          <p class="text-accent">${user.email}</p>
          
          <div class="stats-row">
            <div class="stat-box"><h4>${level}</h4><p>المستوى</p></div>
            <div class="stat-box"><h4>${stars.toLocaleString()}</h4><p>النجوم</p></div>
          </div>

          <div class="promo-section" style="margin-top: 25px;">
            <div class="promo-title"><i class="fa-solid fa-pen-to-square" style="color: var(--accent);"></i> تغيير اللقب السري</div>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="username-input" placeholder="اكتب لقبك الجديد..." value="${userData?.username || ''}" class="chat-input" style="flex: 1; padding: 10px;">
              <button id="btn-change-username" class="btn-primary" style="padding: 10px 15px;"><i class="fa-solid fa-floppy-disk"></i></button>
            </div>
          </div>

          <div class="promo-section" style="margin-top: 15px;">
            <div class="promo-title"><i class="fa-solid fa-wand-magic-sparkles" style="color: var(--gold);"></i> هل تمتلك تعويذة (Promo Code)؟</div>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="promo-input" placeholder="أدخل الكود هنا..." class="chat-input" style="flex: 1; padding: 10px;">
              <button id="btn-apply-promo" class="btn-primary" style="padding: 10px 15px;"><i class="fa-solid fa-check"></i></button>
            </div>
          </div>

          ${adminButtonHTML}
          <button id="logout-btn" class="btn-danger" style="width: 100%; margin-top: 15px;">
            <i class="fa-solid fa-right-from-bracket"></i> تسجيل الخروج
          </button>
        </div>
      `;

      document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
      if (isAdmin) document.getElementById('go-to-admin-btn').addEventListener('click', () => { window.location.href = 'admin.html'; });

      const btnChangeUsername = document.getElementById('btn-change-username');
      const usernameInput = document.getElementById('username-input');
      btnChangeUsername.addEventListener('click', async () => {
        const newName = usernameInput.value.trim();
        if (newName.length < 3) return showToast('اللقب يجب أن يكون 3 أحرف على الأقل!', 'fa-solid fa-circle-exclamation');
        btnChangeUsername.disabled = true; btnChangeUsername.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
          await setDoc(doc(db, 'users', user.uid), { username: newName }, { merge: true });
          showToast('تم تغيير اللقب بنجاح! 📛', 'fa-solid fa-user-check');
          userData.username = newName; updateUI(user, userData); 
        } catch (error) { showToast('فشل تغيير اللقب!', 'fa-solid fa-circle-xmark'); } 
        finally { btnChangeUsername.disabled = false; btnChangeUsername.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>'; }
      });

      const fileInput = document.getElementById('avatar-upload');
      const imgPreview = document.getElementById('profile-img-preview');
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 300 * 1024) return showToast('الصورة كبيرة جداً! الحد الأقصى 300KB', 'fa-solid fa-triangle-exclamation');
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target.result; imgPreview.src = base64; myCurrentAvatar = base64; initChat(); 
          try {
            await setDoc(doc(db, 'users', user.uid), { photoURL: base64 }, { merge: true });
            showToast('تم تحديث مظهرك بنجاح ✨', 'fa-solid fa-image'); userData.photoURL = base64; 
          } catch (err) { showToast('فشل تحديث الصورة', 'fa-solid fa-circle-xmark'); }
        };
        reader.readAsDataURL(file);
      });

      const btnApplyPromo = document.getElementById('btn-apply-promo');
      const promoInput = document.getElementById('promo-input');
      btnApplyPromo.addEventListener('click', async () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return showToast('الرجاء إدخال كود صحيح!', 'fa-solid fa-circle-exclamation');
        btnApplyPromo.disabled = true; btnApplyPromo.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
          const promoRef = doc(db, 'promos', code); const promoSnap = await getDoc(promoRef);
          if (!promoSnap.exists()) { showToast('هذه التعويذة غير صحيحة أو منتهية الصلاحية!', 'fa-solid fa-circle-xmark'); return; }
          if (userData.activatedPromos && userData.activatedPromos.includes(code)) { showToast('لقد استخدمت هذه التعويذة من قبل!', 'fa-solid fa-circle-info'); return; }

          const promoData = promoSnap.data(); const starsToAdd = promoData.stars || 0;
          const newStars = (userData.stars || 0) + starsToAdd; const newLevel = Math.floor(newStars / 50);
          const activatedPromos = userData.activatedPromos || []; activatedPromos.push(code);

          await setDoc(doc(db, 'users', user.uid), { stars: newStars, level: newLevel, activatedPromos: activatedPromos }, { merge: true });
          showToast(`تم التفعيل! حصلت على ${starsToAdd} نجمة 🌟`, 'fa-solid fa-wand-magic-sparkles');
          promoInput.value = ''; updateUI(user, { ...userData, stars: newStars, level: newLevel, activatedPromos: activatedPromos });
        } catch (error) { showToast('حدث خلل سحري أثناء التفعيل!', 'fa-solid fa-bug'); } 
        finally { btnApplyPromo.disabled = false; btnApplyPromo.innerHTML = '<i class="fa-solid fa-check"></i>'; }
      });

    } else {
      welcomeText.innerHTML = `مرحباً بك في النقابة 👋`;
      profileContent.innerHTML = `
        <div class="section-title">هوية المغامر 🆔</div>
        <div class="glass-card profile-header">
          <img src="https://via.placeholder.com/90?text=?" alt="Unknown" class="avatar-large" style="border-color: var(--text-muted);">
          <h2>مغامر مجهول</h2>
          <p class="text-muted">يرجى إثبات هويتك للنقابة</p>
          <button id="login-btn" class="btn-primary" style="width: 100%; margin-top: 30px;">
            <i class="fa-brands fa-google"></i> تسجيل الدخول بجوجل
          </button>
        </div>
      `;
      document.getElementById('login-btn').addEventListener('click', async () => {
        try { await signInWithPopup(auth, provider); } catch (err) { showToast("حدث خطأ أثناء تسجيل الدخول!", "fa-solid fa-triangle-exclamation"); }
      });
    }
  }

  // ==========================================
  // === 6. مراقبة حالة المستخدم ===
  // ==========================================
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const masterEmail = "Mohammadsafe202a@gmail.com"; 
      const isMasterUser = (user.email.toLowerCase() === masterEmail.toLowerCase());
      let userData = { stars: 0, level: 0 };
      
      if (!snap.exists()) {
        userData = { stars: 0, level: 0, isAdmin: isMasterUser, createdAt: serverTimestamp() };
        await setDoc(userRef, userData);
      } else {
        userData = snap.data();
        if (isMasterUser && userData.isAdmin !== true) {
          userData.isAdmin = true;
          await setDoc(userRef, { isAdmin: true }, { merge: true });
        }
      }
      updateUI(user, userData); 
      checkDailyQuestStatus(userData); 
      initQuests(user, userData); // تمرير البيانات لبرمجة المهام المؤقتة
    } else {
      updateUI(null); 
      checkDailyQuestStatus(null);
      initQuests(null, null);
      isCurrentUserAdmin = false;
    }
    initNews();
  });

  // ==========================================
  // === 7. نظام الحانة (الدردشة السريعة) ===
  // ==========================================
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const messagesCol = collection(db, "chats", "global", "messages");

  function initChat() {
    const q = query(messagesCol, orderBy("createdAt", "desc"), limit(50));
    onSnapshot(q, (snapshot) => {
      chatMessages.innerHTML = '';
      const currentUser = auth.currentUser;
      const messagesArray = [];
      snapshot.forEach((docSnap) => messagesArray.push(docSnap.data()));
      messagesArray.reverse();

      messagesArray.forEach((data) => {
        const isMe = currentUser && data.authorId === currentUser.uid;
        let timeString = '';
        if (data.createdAt) timeString = data.createdAt.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        
        const finalAvatar = isMe ? myCurrentAvatar : (data.avatar || 'https://via.placeholder.com/35');
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg-box ${isMe ? 'sent' : 'received'}`;
        msgDiv.innerHTML = `
          <img src="${finalAvatar}" onerror="this.src='https://via.placeholder.com/35?text=?'" alt="avatar" class="avatar" style="object-fit: cover;">
          <div>
            ${!isMe ? `<span class="msg-meta">${data.authorName} • ${timeString}</span>` : `<span class="msg-meta">${timeString}</span>`}
            <div class="msg-bubble">${data.text}</div>
          </div>
        `;
        chatMessages.appendChild(msgDiv);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    const user = auth.currentUser;
    if (!user) return showToast("يجب تسجيل الدخول للتحدث في الحانة!", "fa-solid fa-lock");
    chatInput.value = '';
    try { await addDoc(messagesCol, { text: text, authorName: myCurrentUsername, authorId: user.uid, avatar: myCurrentAvatar, createdAt: serverTimestamp() }); } 
    catch (e) { showToast("فشل الإرسال. تأكد من اتصالك.", "fa-solid fa-wifi"); }
  }

  if (btnSend && chatInput) {
    btnSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  }

  // ==========================================
  // === 8. قاعة الأساطير (المتصدرون) ===
  // ==========================================
  const leaderboardList = document.getElementById('leaderboard-list');
  const usersCol = collection(db, "users");

  async function loadLeaderboard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<p class="text-muted text-center"><i class="fas fa-spinner fa-spin"></i> جاري استدعاء الأساطير...</p>';
    
    try {
      const q = query(usersCol, orderBy("stars", "desc"), limit(20));
      const querySnapshot = await getDocs(q);
      leaderboardList.innerHTML = '';
      let rank = 1;

      if (querySnapshot.empty) { leaderboardList.innerHTML = '<p class="text-muted text-center">لا يوجد أساطير بعد...</p>'; return; }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const stars = data.stars || 0;
        const level = data.level || 0;
        const name = data.username || data.displayName || "مغامر مجهول";
        const avatar = data.photoURL || "https://via.placeholder.com/50";
        const animeRank = getRank(stars);

        let rankClass = '', iconHtml = '';
        if (rank === 1) { rankClass = 'rank-1'; iconHtml = '<i class="fa-solid fa-crown" style="color: gold;"></i>'; }
        else if (rank === 2) { rankClass = 'rank-2'; iconHtml = '<i class="fa-solid fa-medal"></i>'; }
        else if (rank === 3) { rankClass = 'rank-3'; iconHtml = '<i class="fa-solid fa-medal"></i>'; }

        const card = document.createElement('div');
        card.className = `glass-card user-rank-card ${rankClass}`;
        card.innerHTML = `
          <div class="rank-num">${rank}</div>
          <img src="${avatar}" onerror="this.src='https://via.placeholder.com/50?text=?'" alt="Avatar" class="avatar" style="object-fit: cover;">
          <div class="user-info">
            <h3>${name} ${iconHtml} <span class="rank-badge" style="color: ${animeRank.color}; border-color: ${animeRank.color}; box-shadow: ${animeRank.shadow};">${animeRank.title}</span></h3>
            <p class="text-muted">المستوى ${level}</p>
          </div>
          <div class="stars">${stars.toLocaleString()} <i class="fa-solid fa-star"></i></div>
        `;
        leaderboardList.appendChild(card);
        rank++;
      });
    } catch (error) { leaderboardList.innerHTML = '<p class="text-danger text-center">حدث خلل سحري أثناء جلب البيانات!</p>'; }
  }

  // تشغيل الوظائف الأساسية
  initChat(); 
});
