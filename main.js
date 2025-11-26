/* main.js - منطق التطبيق الشامل */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBo_O8EKeS6jYM-ee12oYrIlT575oaU2Pg",
    authDomain: "clan-forum.firebaseapp.com",
    projectId: "clan-forum",
    storageBucket: "clan-forum.firebasestorage.app",
    messagingSenderId: "1011903491894",
    appId: "1:1011903491894:web:f1bc46a549e74b3717cd97"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* ====== 1. التحكم في التنقل (Navigation) ====== */
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page-view');
const mainHeader = document.getElementById('mainHeader');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const targetId = item.getAttribute('data-target');
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        // إظهار الهيدر فقط في الرئيسية
        if (targetId === 'feed-page') {
            mainHeader.style.display = 'flex';
        } else {
            mainHeader.style.display = 'none';
        }
    });
});

/* ====== 2. إدارة المستخدم (User & Menu) ====== */
const menuUserProfile = document.getElementById('menuUserProfile');
const menuLogoutBtn = document.getElementById('menuLogoutBtn');
const menuLoginBtnInternal = document.getElementById('menuLoginBtnInternal');

if (menuLoginBtnInternal) {
    menuLoginBtnInternal.onclick = () => signInWithPopup(auth, provider);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        let stars = 0;
        try {
            const snap = await getDoc(userRef);
            if (snap.exists()) stars = snap.data().stars || 0;
        } catch (e) {}
        
        menuUserProfile.innerHTML = `
            <img src="${user.photoURL}" style="width:60px; height:60px; border-radius:50%; border:2px solid #333;">
            <div style="flex:1;">
                <h3 style="color:#fff; margin:0;">${user.displayName}</h3>
                <span style="color:#aaa; font-size:0.85rem;">@${user.uid.substring(0,8)}...</span>
                <div class="menu-stats">
                    <div class="stat-tag"><i class="fas fa-star" style="color:#f1c40f"></i> ${stars}</div>
                    <div class="stat-tag"><i class="fas fa-gem" style="color:#3498db"></i> 0</div>
                </div>
            </div>
            <a href="profile.html" style="color:#aaa;"><i class="fas fa-chevron-left"></i></a>
        `;
        menuLogoutBtn.style.display = 'flex';
        menuLogoutBtn.onclick = () => signOut(auth);
        
        // تحميل البوستات بعد الدخول (اختياري، يمكن تحميلها للكل)
        loadPosts();
        
    } else {
        menuUserProfile.innerHTML = `
             <div style="padding:20px; width:100%; text-align:center;">
                 <p style="color:#aaa; margin-bottom:10px;">سجل دخولك لتتفاعل!</p>
                 <button id="menuLoginBtnInternal2" class="app-btn" style="width:100%">تسجيل الدخول</button>
            </div>
        `;
        document.getElementById('menuLoginBtnInternal2').onclick = () => signInWithPopup(auth, provider);
        menuLogoutBtn.style.display = 'none';
    }
});

/* ====== 3. نشر البوستات (Posts System) ====== */
const addPostFab = document.getElementById('addPostFab');
const createPostModal = document.getElementById('createPostModal');
const closePostModal = document.getElementById('closePostModal');
const publishPostBtn = document.getElementById('publishPostBtn');
const postContentInput = document.getElementById('postContentInput');
const postsContainer = document.getElementById('postsContainer');

addPostFab.addEventListener('click', () => {
    if (!auth.currentUser) return alert("يجب تسجيل الدخول للنشر!");
    createPostModal.style.display = 'flex';
    postContentInput.focus();
});

closePostModal.addEventListener('click', () => {
    createPostModal.style.display = 'none';
});

publishPostBtn.addEventListener('click', async () => {
    const text = postContentInput.value.trim();
    if (!text) return;
    
    publishPostBtn.disabled = true;
    publishPostBtn.textContent = "جاري النشر...";
    
    try {
        await addDoc(collection(db, "posts"), {
            text: text,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName,
            authorAvatar: auth.currentUser.photoURL,
            createdAt: serverTimestamp(),
            likes: 0
        });
        createPostModal.style.display = 'none';
        postContentInput.value = "";
    } catch (e) {
        alert("فشل النشر: " + e.message);
    } finally {
        publishPostBtn.disabled = false;
        publishPostBtn.textContent = "نشر";
    }
});

// تحميل البوستات (Feed)
function loadPosts() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
    onSnapshot(q, (snapshot) => {
        postsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'الآن';
            
            const postHTML = `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${data.authorAvatar}" class="user-avatar">
                        <div class="post-info">
                            <span class="user-name">${data.authorName}</span>
                            <span class="post-time">${date}</span>
                        </div>
                    </div>
                    <div class="post-body">${data.text}</div>
                    <div class="post-actions">
                        <div class="action"><i class="far fa-heart"></i></div>
                        <div class="action"><i class="far fa-comment"></i></div>
                        <div class="action"><i class="fas fa-share"></i></div>
                    </div>
                </div>
            `;
            postsContainer.insertAdjacentHTML('beforeend', postHTML);
        });
    });
}
// تحميل البوستات فوراً (للزوار والمشتركين)
loadPosts();

/* ====== 4. نظام الشات (Chat System) ====== */
const openChatBtn = document.getElementById('openChatBtn');
const chatOverlay = document.getElementById('chatOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMessagesBox = document.getElementById('chatMessages');

if (openChatBtn) {
    openChatBtn.addEventListener('click', () => {
        chatOverlay.style.display = 'flex';
        loadChatMessages();
    });
}

closeChatBtn.addEventListener('click', () => {
    chatOverlay.style.display = 'none';
});

sendChatBtn.addEventListener('click', sendMessage);

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !auth.currentUser) return;
    chatInput.value = '';
    try {
        await addDoc(collection(db, "chats", "global", "messages"), {
            text: text,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName,
            avatar: auth.currentUser.photoURL,
            createdAt: serverTimestamp()
        });
    } catch (e) { console.error(e); }
}

let chatUnsubscribe = null;

function loadChatMessages() {
    if (chatUnsubscribe) return;
    const q = query(collection(db, "chats", "global", "messages"), orderBy("createdAt", "asc"), limit(50));
    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        chatMessagesBox.innerHTML = '';
        const currentUid = auth.currentUser?.uid;
        snapshot.forEach(doc => {
            const data = doc.data();
            const isMe = data.authorId === currentUid;
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-msg ${isMe ? 'mine' : 'others'}`;
            msgDiv.innerHTML = `
                <img src="${data.avatar}" class="chat-avatar">
                <div>
                    <div class="chat-bubble">${data.text}</div>
                    <div class="chat-info"><span>${data.authorName}</span></div>
                </div>
            `;
            chatMessagesBox.appendChild(msgDiv);
        });
        chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
    });
}