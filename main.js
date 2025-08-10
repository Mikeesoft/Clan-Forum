// =====================
// إعدادات Firebase
// =====================
const firebaseConfig = {
    apiKey: "ضع_API_KEY_هنا",
    authDomain: "اسم-مشروعك.firebaseapp.com",
    projectId: "اسم-مشروعك",
    storageBucket: "اسم-مشروعك.appspot.com",
    messagingSenderId: "ضع_ID_هنا",
    appId: "ضع_APP_ID_هنا"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =====================
// عناصر DOM
// =====================
const likeButton = document.querySelector('.like-btn');
const likeCountSpan = document.getElementById('likeCount');
const commentButton = document.querySelector('.comment-btn');
const commentsSection = document.getElementById('adminCommentsSection');
const navRightDiv = document.querySelector('.nav-right');

let commentsVisible = false;
let likedByUser = false;
let likes = 0;

// =====================
// جلب البيانات عند التحميل
// =====================
async function loadPostData() {
    const postRef = db.collection("adminPost").doc("mainPost");
    const docSnap = await postRef.get();
    
    if (docSnap.exists) {
        const data = docSnap.data();
        likes = data.likes || 0;
        likeCountSpan.textContent = likes;
        
        if (Array.isArray(data.comments)) {
            data.comments.forEach(comment => {
                addCommentToDOM(comment.author, comment.text);
            });
        }
    } else {
        await postRef.set({ likes: 0, comments: [] });
    }
}
loadPostData();

// =====================
// الإعجاب
// =====================
if (likeButton && likeCountSpan) {
    likeButton.addEventListener('click', async () => {
        const postRef = db.collection("adminPost").doc("mainPost");
        
        if (likedByUser) {
            likes--;
            likedByUser = false;
            likeButton.classList.remove('liked');
        } else {
            likes++;
            likedByUser = true;
            likeButton.classList.add('liked');
        }
        
        likeCountSpan.textContent = likes;
        await postRef.update({ likes });
    });
}

// =====================
// التعليقات
// =====================
if (commentButton && commentsSection) {
    commentButton.addEventListener('click', () => {
        if (!commentsVisible) {
            commentsSection.innerHTML = `
                <div class="comment-input-area">
                    <input type="text" id="newCommentInput" placeholder="اكتب تعليقك هنا...">
                    <button id="addCommentBtn">إضافة تعليق</button>
                </div>
            `;
            commentsVisible = true;
            
            const addCommentBtn = document.getElementById('addCommentBtn');
            const newCommentInput = document.getElementById('newCommentInput');
            
            addCommentBtn.addEventListener('click', async () => {
                const commentText = newCommentInput.value.trim();
                if (commentText) {
                    const authorName = auth.currentUser ? auth.currentUser.displayName : "عضو جديد";
                    addCommentToDOM(authorName, commentText);
                    
                    const postRef = db.collection("adminPost").doc("mainPost");
                    await postRef.update({
                        comments: firebase.firestore.FieldValue.arrayUnion({
                            author: authorName,
                            text: commentText
                        })
                    });
                    
                    newCommentInput.value = '';
                } else {
                    alert('الرجاء كتابة تعليق قبل الإضافة!');
                }
            });
        } else {
            commentsSection.innerHTML = '';
            commentsVisible = false;
        }
    });
}

function addCommentToDOM(author, text) {
    const commentDiv = document.createElement('div');
    commentDiv.classList.add('comment');
    commentDiv.innerHTML = `
        <div class="comment-author">${author}</div>
        <div class="comment-text">${text}</div>
    `;
    commentsSection.insertBefore(commentDiv, commentsSection.querySelector('.comment-input-area') || null);
}

// =====================
// تسجيل الدخول/الخروج
// =====================
function toggleLoginState(isLoggedIn, userName = "") {
    if (!navRightDiv) return;
    navRightDiv.innerHTML = '';
    if (isLoggedIn) {
        navRightDiv.innerHTML = `
            <a href="profile.html" class="nav-icon profile-icon" title="ملفي الشخصي">
                <i class="fas fa-user-circle"></i>
                <span>${userName || "ملفي الشخصي"}</span>
            </a>
        `;
    } else {
        navRightDiv.innerHTML = `
            <a href="login.html" class="auth-btn">تسجيل الدخول</a>
        `;
    }
}
toggleLoginState(false);

// =====================
// تسجيل الدخول بجوجل
// =====================
document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;
                    toggleLoginState(true, user.displayName);
                })
                .catch((error) => {
                    console.error(error);
                    alert("حصل خطأ أثناء تسجيل الدخول بجوجل!");
                });
        });
    }
});

// =====================
// الأيقونة النشطة في Navbar
// =====================
document.addEventListener('DOMContentLoaded', () => {
    const navIcons = document.querySelectorAll('.nav-left .nav-icon, .nav-right .nav-icon');
    const currentPath = window.location.pathname.split('/').pop();
    
    navIcons.forEach(icon => {
        const iconHref = icon.getAttribute('href');
        if (iconHref && iconHref.endsWith(currentPath)) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    });
    
    if (currentPath === 'login.html') {
        const loginBtn = document.querySelector('.auth-btn');
        if (loginBtn) loginBtn.classList.add('active');
    }
});