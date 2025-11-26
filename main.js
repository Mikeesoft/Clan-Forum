import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 1. إعدادات فايربيس (تأكد إن دي إعدادات مشروعك)
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

// ============ 2. إدارة المستخدم (Login & Profile) ============
const menuUserProfile = document.getElementById('menuUserProfile');
const menuLogoutBtn = document.getElementById('menuLogoutBtn');
const menuLoginBtnInternal = document.getElementById('menuLoginBtnInternal');

// زرار تسجيل الدخول
if(menuLoginBtnInternal) {
    menuLoginBtnInternal.addEventListener('click', () => signInWithPopup(auth, provider));
}

// مراقب حالة المستخدم (أهم جزء)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // لو المستخدم مسجل دخول
        const userRef = doc(db, "users", user.uid);
        
        // استماع لأي تغيير في بيانات المستخدم (Realtime)
        onSnapshot(userRef, (docSnap) => {
            let userData = docSnap.exists() ? docSnap.data() : {};
            
            // تجهيز البيانات للعرض
            const displayName = userData.fullName || user.displayName;
            const displayHandle = userData.username ? `@${userData.username}` : "@user";
            const photo = user.photoURL;

            // تحديث كارت البروفايل في القائمة
            menuUserProfile.innerHTML = `
                <img src="${photo}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <h3 style="margin:0; font-size:16px; color:white;">${displayName}</h3>
                    <p style="margin:0; font-size:12px; color:#aaa;">${displayHandle}</p>
                </div>
            `;

            // ملء حقول التعديل بالبيانات الحالية
            document.getElementById('editNameInput').value = userData.fullName || "";
            document.getElementById('editUsernameInput').value = userData.username || "";
            document.getElementById('editBioInput').value = userData.bio || "";
        });

        menuLogoutBtn.style.display = 'flex';
        menuLogoutBtn.onclick = () => signOut(auth);
        if(menuLoginBtnInternal) menuLoginBtnInternal.style.display = 'none';

        // تحميل البوستات
        loadPosts();

    } else {
        // لو مش مسجل دخول
        menuUserProfile.innerHTML = `<p style="color:#777; text-align:center; width:100%;">أنت زائر</p>`;
        menuLogoutBtn.style.display = 'none';
        if(menuLoginBtnInternal) menuLoginBtnInternal.style.display = 'block';
    }
});

// ============ 3. تعديل البروفايل (المنطق) ============
const editProfileModal = document.getElementById('editProfileModal');
const openEditProfileBtn = document.getElementById('openEditProfileBtn');
const closeEditProfileBtn = document.getElementById('closeEditProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');

// فتح النافذة
if(openEditProfileBtn) {
    openEditProfileBtn.addEventListener('click', () => {
        if(!auth.currentUser) return alert("سجل دخول الأول!");
        editProfileModal.style.display = 'flex';
    });
}

// غلق النافذة
if(closeEditProfileBtn) {
    closeEditProfileBtn.addEventListener('click', () => editProfileModal.style.display = 'none');
}

// حفظ البيانات (Core Logic)
if(saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        saveProfileBtn.innerText = "جاري الحفظ...";
        
        const newName = document.getElementById('editNameInput').value;
        const newUsername = document.getElementById('editUsernameInput').value;
        const newBio = document.getElementById('editBioInput').value;

        try {
            // استخدام setDoc مع merge عشان لو المستند مش موجود ينشئه
            await setDoc(doc(db, "users", user.uid), {
                fullName: newName,
                username: newUsername,
                bio: newBio,
                email: user.email
            }, { merge: true });

            alert("تم التحديث بنجاح! ✅");
            editProfileModal.style.display = 'none';
        } catch (error) {
            console.error(error);
            alert("حدث خطأ: " + error.message);
        } finally {
            saveProfileBtn.innerText = "حفظ";
        }
    });
}

// ============ 4. البوستات (Logic) ============
const postsContainer = document.getElementById('postsContainer');

function loadPosts() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
    
    onSnapshot(q, (snapshot) => {
        postsContainer.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const time = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : 'الآن';
            
            const postHTML = `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${data.authorAvatar || 'https://via.placeholder.com/40'}" class="user-avatar">
                        <div>
                            <div style="font-weight:bold;">${data.authorName || 'مستخدم'}</div>
                            <div style="font-size:12px; color:#777;">${data.authorUsername || '@user'} • ${time}</div>
                        </div>
                    </div>
                    <div class="post-body">${data.text}</div>
                </div>
            `;
            postsContainer.innerHTML += postHTML;
        });
    });
}

// ============ 5. التنقل (Tabs) ============
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const targetId = item.getAttribute('data-target');
        document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
    });
});
