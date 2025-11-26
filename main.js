/* main.js - النسخة النهائية والشاملة */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
        
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');
        
        // إظهار الهيدر فقط في الرئيسية
        if (mainHeader) {
            mainHeader.style.display = (targetId === 'feed-page') ? 'flex' : 'none';
        }
    });
});

/* ====== 2. إدارة المستخدم والقائمة الجانبية (Realtime) ====== */
const menuUserProfile = document.getElementById('menuUserProfile');
const menuLogoutBtn = document.getElementById('menuLogoutBtn');
const menuLoginBtnInternal = document.getElementById('menuLoginBtnInternal');

if (menuLoginBtnInternal) {
    menuLoginBtnInternal.onclick = () => signInWithPopup(auth, provider);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        
        // 🟢 تحديث فوري: أي تغيير في الداتابيز يسمع هنا علطول
        onSnapshot(userRef, (docSnap) => {
            let stars = 0;
            let displayUsername = user.uid.substring(0, 8);
            let displayName = user.displayName;
            let bioText = "مستخدم جديد";

            if (docSnap.exists()) {
                const data = docSnap.data();
                stars = data.stars || 0;
                if (data.username) displayUsername = data.username;
                if (data.fullName) displayName = data.fullName; // الاسم من الداتابيز أولويات
                if (data.bio) bioText = data.bio;
                
                // تحديث حقول صفحة "تعديل البروفايل" لو كنا واقفين عليها
                fillEditProfileInputs(displayName, displayUsername, bioText);
            }

            // تحديث القائمة الجانبية
            if (menuUserProfile) {
                menuUserProfile.innerHTML = `
                    <img src="${user.photoURL}" style="width:60px; height:60px; border-radius:50%; border:2px solid #333; object-fit:cover;">
                    <div style="flex:1;">
                        <h3 style="color:#fff; margin:0; font-size:16px;">${displayName}</h3>
                        <span style="color:#aaa; font-size:0.85rem; dir="ltr">@${displayUsername}</span>
                        <div class="menu-stats">
                            <div class="stat-tag"><i class="fas fa-star" style="color:#f1c40f"></i> ${stars}</div>
                        </div>
                    </div>
                `;
            }
        });

        if (menuLogoutBtn) {
            menuLogoutBtn.style.display = 'flex';
            menuLogoutBtn.onclick = () => signOut(auth);
        }
        
        loadPosts(); // تحميل البوستات

    } else {
        // حالة عدم تسجيل الدخول
        if (menuUserProfile) {
            menuUserProfile.innerHTML = `
                 <div style="padding:20px; width:100%; text-align:center;">
                     <p style="color:#aaa; margin-bottom:10px;">سجل دخولك لتتفاعل!</p>
                     <button id="menuLoginBtnInternal2" class="app-btn" style="width:100%">تسجيل الدخول</button>
                </div>
            `;
            setTimeout(() => {
                const loginBtn2 = document.getElementById('menuLoginBtnInternal2');
                if (loginBtn2) loginBtn2.onclick = () => signInWithPopup(auth, provider);
            }, 100);
        }
        if (menuLogoutBtn) menuLogoutBtn.style.display = 'none';
    }
});

/* ====== 3. وظيفة تعديل البروفايل (الجديد) ====== */
// تأكد أن لديك Inputs بهذه الـ IDs في صفحة التعديل
const editNameInput = document.getElementById('editNameInput');
const editUsernameInput = document.getElementById('editUsernameInput');
const editBioInput = document.getElementById('editBioInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');

// دالة لتعبئة الحقول تلقائياً عند فتح التطبيق
function fillEditProfileInputs(name, username, bio) {
    if (editNameInput) editNameInput.value = name;
    if (editUsernameInput) editUsernameInput.value = username;
    if (editBioInput) editBioInput.value = bio;
}

// زر الحفظ
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return alert("يجب تسجيل الدخول!");

        saveProfileBtn.textContent = "جاري الحفظ...";
        saveProfileBtn.disabled = true;

        try {
            const userRef = doc(db, "users", user.uid);
            
            // البيانات المراد تحديثها
            const updateData = {};
            if (editNameInput && editNameInput.value) updateData.fullName = editNameInput.value;
            if (editUsernameInput && editUsernameInput.value) updateData.username = editUsernameInput.value;
            if (editBioInput) updateData.bio = editBioInput.value;

            // إرسال لفايربيس (Merge: true للحفاظ على البيانات القديمة)
            await updateDoc(userRef, updateData); // استخدمنا updateDoc بدلاً من setDoc للحفاظ على النجوم

            alert("تم تحديث البيانات بنجاح ✅");
            
        } catch (error) {
            console.error(error);
            alert("حدث خطأ: " + error.message);
        } finally {
            saveProfileBtn.textContent = "حفظ التعديلات";
            saveProfileBtn.disabled = false;
        }
    });
}

/* ====== 4. نشر البوستات (Posts System) ====== */
const addPostFab = document.getElementById('addPostFab');
const createPostModal = document.getElementById('createPostModal');
const closePostModal = document.getElementById('closePostModal');
const publishPostBtn = document.getElementById('publishPostBtn');
const postContentInput = document.getElementById('postContentInput');
const postsContainer = document.getElementById('postsContainer');

if (addPostFab) {
    addPostFab.addEventListener('click', () => {
        if (!auth.currentUser) return alert("يجب تسجيل الدخول للنشر!");
        createPostModal.style.display = 'flex';
        postContentInput.focus();
    });
}

if (closePostModal) {
    closePostModal.addEventListener('click', () => {
        createPostModal.style.display = 'none';
    });
}

if (publishPostBtn) {
    publishPostBtn.addEventListener('click', async () => {
        const text = postContentInput.value.trim();
        if (!text) return;
        
        publishPostBtn.disabled = true;
        publishPostBtn.textContent = "جاري النشر...";
        
        try {
            let authorUsername = "@user";
            let authorName = auth.currentUser.displayName;

            // محاولة جلب الاسم واليوزر المحدثين من قاعدة البيانات بدلاً من Auth القديم
            const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (uSnap.exists()) {
                const data = uSnap.data();
                if (data.username) authorUsername = "@" + data.username;
                if (data.fullName) authorName = data.fullName;
            }
            
            await addDoc(collection(db, "posts"), {
                text: text,
                authorId: auth.currentUser.uid,
                authorName: authorName,
                authorUsername: authorUsername,
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
}

// تحميل البوستات (Feed)
function loadPosts() {
    if (!postsContainer) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
    
    onSnapshot(q, (snapshot) => {
        postsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'الآن';
            const handle = data.authorUsername || "@user";
            
            // هنا تم استخدام كلاس post-card لإصلاح التصميم
            const postHTML = `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${data.authorAvatar}" class="user-avatar">
                        <div class="post-info">
                            <span class="user-name">${data.authorName}</span>
                            <span class="post-handle">${handle}</span>
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

/* ====== 5. نظام الشات (Chat System) ====== */
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

if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
        chatOverlay.style.display = 'none';
    });
}

if (sendChatBtn) {
    sendChatBtn.addEventListener('click', sendMessage);
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !auth.currentUser) return;
    chatInput.value = '';
    
    // جلب الاسم الحقيقي للمستخدم قبل الإرسال
    let currentName = auth.currentUser.displayName;
    try {
        const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (uSnap.exists() && uSnap.data().fullName) {
            currentName = uSnap.data().fullName;
        }
    } catch(e) {}

    try {
        await addDoc(collection(db, "chats", "global", "messages"), {
            text: text,
            authorId: auth.currentUser.uid,
            authorName: currentName,
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
        if (!chatMessagesBox) return;
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
