// app.js

import { 
  auth, db, provider, 
  signInWithPopup, onAuthStateChanged, signOut, 
  doc, getDoc, setDoc, serverTimestamp, 
  collection, query, orderBy, limit, onSnapshot, addDoc, getDocs 
} from './firebase-core.js';

document.addEventListener('DOMContentLoaded', () => {

  let myCurrentAvatar = 'https://via.placeholder.com/35';

  // ==========================================
  // === 🎴 نظام رتب الأنمي (جديد) ===
  // ==========================================
  function getRank(stars) {
    if (stars >= 10000) return { title: 'SS-Class', color: '#ff007f', shadow: '0 0 10px #ff007f' }; // وردي نيون
    if (stars >= 5000) return { title: 'S-Class', color: '#fbbf24', shadow: '0 0 10px #fbbf24' }; // ذهبي
    if (stars >= 2500) return { title: 'A-Class', color: '#ef4444', shadow: '0 0 10px #ef4444' }; // أحمر
    if (stars >= 1000) return { title: 'B-Class', color: '#8b5cf6', shadow: '0 0 10px #8b5cf6' }; // بنفسجي
    if (stars >= 500) return { title: 'C-Class', color: '#3b82f6', shadow: '0 0 10px #3b82f6' };  // أزرق
    if (stars >= 100) return { title: 'D-Class', color: '#22c55e', shadow: '0 0 10px #22c55e' };  // أخضر
    return { title: 'F-Class', color: '#94a3b8', shadow: 'none' }; // رمادي
  }

  // ==========================================
  // === 1. نظام الإشعارات الأنيق (Toast) ===
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
  // === 2. التنقل بين الأقسام (Bottom Nav) ===
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
      
      if (targetId === 'tab-leaderboard') {
        loadLeaderboard();
      }
    });
  });

  // ==========================================
  // === 3. نظام تسجيل الدخول وتحديث الواجهة ===
  // ==========================================
  const profileContent = document.getElementById('profile-content');
  const welcomeText = document.getElementById('welcome-text');

  function updateUI(user, userData = null) {
    if (user) {
      const name = user.displayName || 'مغامر';
      const photo = userData?.photoURL || user.photoURL || 'https://via.placeholder.com/90';
      const level = userData?.level || 0;
      const stars = userData?.stars || 0;
      const rank = getRank(stars); // 🌟 جلب الرتبة

      myCurrentAvatar = photo;

      welcomeText.innerHTML = `مرحباً بعودتك، ${name.split(' ')[0]} 👋`;

      profileContent.innerHTML = `
        <div class="section-title">هوية المغامر 🆔</div>
        <div class="glass-card profile-header">
          
          <div class="avatar-wrapper">
            <img src="${photo}" alt="Avatar" class="avatar-large" id="profile-img-preview">
            <label for="avatar-upload" class="edit-avatar-btn"><i class="fa-solid fa-camera"></i></label>
            <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
          </div>
          
          <h2>${name} <span class="rank-badge" style="color: ${rank.color}; border-color: ${rank.color}; box-shadow: ${rank.shadow};">${rank.title}</span></h2>
          <p class="text-accent">${user.email}</p>
          
          <div class="stats-row">
            <div class="stat-box"><h4>${level}</h4><p>المستوى</p></div>
            <div class="stat-box"><h4>${stars.toLocaleString()}</h4><p>النجوم</p></div>
          </div>

          <div class="promo-section">
            <div class="promo-title"><i class="fa-solid fa-wand-magic-sparkles" style="color: var(--gold);"></i> هل تمتلك تعويذة (Promo Code)؟</div>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="promo-input" placeholder="أدخل الكود هنا..." class="chat-input" style="flex: 1; padding: 10px;">
              <button id="btn-apply-promo" class="btn-primary" style="padding: 10px 15px;"><i class="fa-solid fa-check"></i></button>
            </div>
          </div>

          <button id="logout-btn" class="btn-danger" style="width: 100%; margin-top: 20px;">
            <i class="fa-solid fa-right-from-bracket"></i> تسجيل الخروج
          </button>
        </div>
      `;

      document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

      const fileInput = document.getElementById('avatar-upload');
      const imgPreview = document.getElementById('profile-img-preview');
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 300 * 1024) { 
          showToast('الصورة كبيرة جداً! يجب أن تكون أقل من 300KB', 'fa-solid fa-triangle-exclamation');
          return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target.result;
          imgPreview.src = base64; 
          myCurrentAvatar = base64; 
          initChat(); 
          
          try {
            await setDoc(doc(db, 'users', user.uid), { photoURL: base64 }, { merge: true });
            showToast('تم تحديث مظهرك بنجاح ✨', 'fa-solid fa-image');
            userData.photoURL = base64; 
          } catch (err) {
            console.error(err);
            showToast('فشل تحديث الصورة', 'fa-solid fa-circle-xmark');
          }
        };
        reader.readAsDataURL(file);
      });

      const btnApplyPromo = document.getElementById('btn-apply-promo');
      const promoInput = document.getElementById('promo-input');

      btnApplyPromo.addEventListener('click', async () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return showToast('الرجاء إدخال كود صحيح!', 'fa-solid fa-circle-exclamation');
        
        btnApplyPromo.disabled = true;
        btnApplyPromo.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
          const promoRef = doc(db, 'promos', code);
          const promoSnap = await getDoc(promoRef);
          
          if (!promoSnap.exists()) {
            showToast('هذه التعويذة غير صحيحة أو منتهية الصلاحية!', 'fa-solid fa-circle-xmark');
            return;
          }

          if (userData.activatedPromos && userData.activatedPromos.includes(code)) {
            showToast('لقد استخدمت هذه التعويذة من قبل!', 'fa-solid fa-circle-info');
            return;
          }

          const promoData = promoSnap.data();
          const starsToAdd = promoData.stars || 0;
          
          const newStars = (userData.stars || 0) + starsToAdd;
          const newLevel = Math.floor(newStars / 50);
          
          const activatedPromos = userData.activatedPromos || [];
          activatedPromos.push(code);

          await setDoc(doc(db, 'users', user.uid), {
            stars: newStars,
            level: newLevel,
            activatedPromos: activatedPromos
          }, { merge: true });

          showToast(`تم التفعيل! حصلت على ${starsToAdd} نجمة 🌟`, 'fa-solid fa-wand-magic-sparkles');
          promoInput.value = '';
          
          updateUI(user, { ...userData, stars: newStars, level: newLevel, activatedPromos: activatedPromos });

        } catch (error) {
          console.error(error);
          showToast('حدث خلل سحري أثناء التفعيل!', 'fa-solid fa-bug');
        } finally {
          btnApplyPromo.disabled = false;
          btnApplyPromo.innerHTML = '<i class="fa-solid fa-check"></i>';
        }
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
        try { await signInWithPopup(auth, provider); } 
        catch (err) { showToast("حدث خطأ أثناء تسجيل الدخول!", "fa-solid fa-triangle-exclamation"); console.error(err); }
      });
    }
  }

  // ==========================================
  // === 4. نظام المهام (استلام النجوم) ===
  // ==========================================
  const questBtn = document.querySelector('.quest-card .btn-primary');

  function getTodayDate() {
    const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function checkQuestStatus(userData) {
    if (!questBtn) return;
    const today = getTodayDate();
    
    if (userData && userData.lastClaimDate === today) {
      questBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> تمت المهمة';
      questBtn.style.background = 'rgba(255,255,255,0.1)';
      questBtn.style.color = 'var(--text-muted)';
      questBtn.disabled = true;
    } else {
      questBtn.innerHTML = '<i class="fa-solid fa-star"></i> استلام';
      questBtn.style.background = 'var(--accent)';
      questBtn.style.color = '#fff';
      questBtn.disabled = false;
    }
  }

  if (questBtn) {
    questBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) return showToast('يجب تسجيل الدخول أولاً أيها المغامر!', 'fa-solid fa-circle-exclamation');

      questBtn.disabled = true;
      questBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاستلام...';

      const userRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const today = getTodayDate();

        if (data.lastClaimDate === today) {
          showToast('لقد أنهيت هذه المهمة اليوم بالفعل!', 'fa-solid fa-circle-info');
          checkQuestStatus(data);
          return;
        }

        const newStars = (data.stars || 0) + 5;
        const newLevel = Math.floor(newStars / 50);

        await setDoc(userRef, { stars: newStars, level: newLevel, lastClaimDate: today }, { merge: true });

        showToast(`عاش! حصلت على 5 نجوم. رصيدك الآن: ${newStars}`, 'fa-solid fa-star');
        checkQuestStatus({ lastClaimDate: today });
        updateUI(user, { ...data, stars: newStars, level: newLevel, lastClaimDate: today });

      } catch (error) {
        console.error(error);
        showToast('حدث خلل سحري! حاول مرة أخرى.', 'fa-solid fa-bug');
        questBtn.disabled = false; questBtn.innerHTML = '<i class="fa-solid fa-star"></i> استلام';
      }
    });
  }

  // ==========================================
  // === 5. مراقبة حالة المستخدم ===
  // ==========================================
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      let userData = { stars: 0, level: 0 };
      
      if (!snap.exists()) {
        userData = { stars: 0, level: 0, createdAt: serverTimestamp() };
        await setDoc(userRef, userData);
      } else {
        userData = snap.data();
      }
      updateUI(user, userData);
      checkQuestStatus(userData); 
    } else {
      updateUI(null);
      checkQuestStatus(null);
    }
  });

  // ==========================================
  // === 6. نظام الحانة (الدردشة العامة) ===
  // ==========================================
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const messagesCol = collection(db, "chats", "global", "messages");

  function initChat() {
    const q = query(messagesCol, orderBy("createdAt", "asc"));
    onSnapshot(q, (snapshot) => {
      chatMessages.innerHTML = '';
      const currentUser = auth.currentUser;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isMe = currentUser && data.authorId === currentUser.uid;
        
        let timeString = '';
        if (data.createdAt) {
           timeString = data.createdAt.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        }

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
    
    try {
      await addDoc(messagesCol, {
        text: text,
        authorName: user.displayName || "مغامر",
        authorId: user.uid,
        avatar: myCurrentAvatar,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      showToast("فشل الإرسال. تأكد من اتصالك.", "fa-solid fa-wifi");
      console.error(e);
    }
  }

  if (btnSend && chatInput) {
    btnSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  }
  initChat(); 

  // ==========================================
  // === 7. قاعة الأساطير (المتصدرون مع الرتب) ===
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

      if (querySnapshot.empty) {
        leaderboardList.innerHTML = '<p class="text-muted text-center">لا يوجد أساطير بعد...</p>';
        return;
      }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const stars = data.stars || 0;
        const level = data.level || 0;
        const name = data.username || data.displayName || "مغامر مجهول";
        const avatar = data.photoURL || "https://via.placeholder.com/50";
        const animeRank = getRank(stars); // 🌟 جلب الرتبة للمتصدرين

        let rankClass = '', iconHtml = '';
        if (rank === 1) { rankClass = 'rank-1'; iconHtml = '<i class="fa-solid fa-crown" style="color: gold;"></i>'; }
        else if (rank === 2) { rankClass = 'rank-2'; iconHtml = '<i class="fa-solid fa-medal"></i>'; }
        else if (rank === 3) { rankClass = 'rank-3'; iconHtml = '<i class="fa-solid fa-medal"></i>'; }

        const card = document.createElement('div');
        card.className = `glass-card user-rank-card ${rankClass}`;
        card.innerHTML = `
          <div class="rank-num">${rank}</div>
          <img src="${avatar}" onerror="this.src='https://via.placeholder.com/50?text=?'" alt="Avatar" class="avatar">
          <div class="user-info">
            <h3>${name} ${iconHtml} <span class="rank-badge" style="color: ${animeRank.color}; border-color: ${animeRank.color}; box-shadow: ${animeRank.shadow};">${animeRank.title}</span></h3>
            <p class="text-muted">المستوى ${level}</p>
          </div>
          <div class="stars">${stars.toLocaleString()} <i class="fa-solid fa-star"></i></div>
        `;
        
        leaderboardList.appendChild(card);
        rank++;
      });
    } catch (error) {
      console.error(error);
      leaderboardList.innerHTML = '<p class="text-danger text-center">حدث خلل سحري أثناء جلب البيانات!</p>';
    }
  }
});
