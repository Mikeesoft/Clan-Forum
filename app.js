// app.js
import { 
  auth, db, provider, 
  signInWithPopup, onAuthStateChanged, signOut, 
  doc, getDoc, setDoc, serverTimestamp, 
  collection, query, orderBy, limit, onSnapshot, addDoc, getDocs 
} from './firebase-core.js';

document.addEventListener('DOMContentLoaded', () => {

  // === 1. التنقل بين الأقسام ===
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
      
      // جلب بيانات المتصدرين عند فتح القسم الخاص بهم فقط
      if (targetId === 'tab-leaderboard') {
        loadLeaderboard();
      }
    });
  });

  // === 2. نظام تسجيل الدخول وتحديث الواجهة ===
  const profileContent = document.getElementById('profile-content');
  const welcomeText = document.getElementById('welcome-text');

  function updateUI(user, userData = null) {
    if (user) {
      const name = user.displayName || 'مغامر';
      const photo = user.photoURL || 'https://via.placeholder.com/90';
      const level = userData?.level || 0;
      const stars = userData?.stars || 0;

      welcomeText.innerHTML = `مرحباً بعودتك، ${name.split(' ')[0]} 👋`;

      profileContent.innerHTML = `
        <div class="section-title">هوية المغامر 🆔</div>
        <div class="glass-card profile-header">
          <img src="${photo}" alt="Avatar" class="avatar-large">
          <h2>${name}</h2>
          <p class="text-accent">${user.email}</p>
          <div class="stats-row">
            <div class="stat-box"><h4>${level}</h4><p>المستوى</p></div>
            <div class="stat-box"><h4>${stars}</h4><p>النجوم</p></div>
          </div>
          <button id="logout-btn" class="btn-danger" style="width: 100%; margin-top: 20px;">
            <i class="fa-solid fa-right-from-bracket"></i> تسجيل الخروج
          </button>
        </div>
      `;

      document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    } else {
      welcomeText.innerHTML = `مرحباً بك في النقابة 👋`;
      profileContent.innerHTML = `
        <div class="section-title">هوية المغامر 🆔</div>
        <div class="glass-card profile-header">
          <img src="https://via.placeholder.com/90?text=?" alt="Unknown" class="avatar-large" style="border-color: var(--text-muted);">
          <h2>مغامر مجهول</h2>
          <p class="text-muted">يرجى إثبات هويتك</p>
          <button id="login-btn" class="btn-primary" style="width: 100%; margin-top: 30px;">
            <i class="fa-brands fa-google"></i> تسجيل الدخول بجوجل
          </button>
        </div>
      `;

      document.getElementById('login-btn').addEventListener('click', async () => {
        try { await signInWithPopup(auth, provider); } 
        catch (err) { alert("حدث خطأ أثناء تسجيل الدخول!"); console.error(err); }
      });
    }
  }

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
    } else {
      updateUI(null);
    }
  });


  // === 3. نظام الحانة (الدردشة) ===
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

        const msgDiv = document.createElement('div');
        msgDiv.className = `msg-box ${isMe ? 'sent' : 'received'}`;
        msgDiv.innerHTML = `
          <img src="${data.avatar || 'https://via.placeholder.com/35'}" alt="avatar" class="avatar">
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
    if (!user) return alert("يجب تسجيل الدخول للتحدث في الحانة!");

    chatInput.value = '';
    
    try {
      await addDoc(messagesCol, {
        text: text,
        authorName: user.displayName || "مغامر",
        authorId: user.uid,
        avatar: user.photoURL,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      alert("فشل الإرسال."); console.error(e);
    }
  }

  btnSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  initChat(); // تشغيل مراقبة الدردشة فوراً


  // === 4. قاعة الأساطير (المتصدرون) ===
  const leaderboardList = document.getElementById('leaderboard-list');
  const usersCol = collection(db, "users");

  async function loadLeaderboard() {
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

        let rankClass = '', iconHtml = '';
        if (rank === 1) { rankClass = 'rank-1'; iconHtml = '<i class="fa-solid fa-crown" style="color: gold;"></i>'; }
        else if (rank === 2) { rankClass = 'rank-2'; iconHtml = '<i class="fa-solid fa-medal"></i>'; }
        else if (rank === 3) { rankClass = 'rank-3'; iconHtml = '<i class="fa-solid fa-medal"></i>'; }

        const card = document.createElement('div');
        card.className = `glass-card user-rank-card ${rankClass}`;
        card.innerHTML = `
          <div class="rank-num">${rank}</div>
          <img src="${avatar}" alt="Avatar" class="avatar">
          <div class="user-info">
            <h3>${name} ${iconHtml}</h3>
            <p class="text-muted">المستوى ${level}</p>
          </div>
          <div class="stars">${stars.toLocaleString()} <i class="fa-solid fa-star"></i></div>
        `;
        
        leaderboardList.appendChild(card);
        rank++;
      });
    } catch (error) {
      console.error(error);
      leaderboardList.innerHTML = '<p class="text-danger text-center">حدث خلل أثناء جلب البيانات!</p>';
    }
  }

});
