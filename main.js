// ====== وظائف التعامل مع رسالة المسؤول (الإعجاب والتعليقات) ======
const likeButton = document.querySelector('.like-btn');
const likeCountSpan = document.getElementById('likeCount');
const commentButton = document.querySelector('.comment-btn');
const commentsSection = document.getElementById('adminCommentsSection');

let likes = 0;
let commentsVisible = false;

if (likeButton && likeCountSpan) {
    likeButton.addEventListener('click', () => {
        if (likeButton.classList.contains('liked')) {
            likes--;
            likeButton.classList.remove('liked');
        } else {
            likes++;
            likeButton.classList.add('liked');
        }
        likeCountSpan.textContent = likes;
    });
}

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

            addCommentBtn.addEventListener('click', () => {
                const commentText = newCommentInput.value.trim();
                if (commentText) {
                    const commentDiv = document.createElement('div');
                    commentDiv.classList.add('comment');
                    commentDiv.innerHTML = `
                        <div class="comment-author">عضو جديد</div>
                        <div class="comment-text">${commentText}</div>
                    `;
                    commentsSection.insertBefore(commentDiv, commentsSection.querySelector('.comment-input-area'));
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

// ====== وظيفة التعامل مع زر تسجيل الدخول/الملف الشخصي ======
const navRightDiv = document.querySelector('.nav-right');

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

// ====== Firebase + Google Login ======
// حط إعدادات Firebase الخاصة بك هنا:
const firebaseConfig = {
    apiKey: "ضع_API_KEY_هنا",
    authDomain: "اسم-مشروعك.firebaseapp.com",
    projectId: "اسم-مشروعك",
    storageBucket: "اسم-مشروعك.appspot.com",
    messagingSenderId: "ضع_ID_هنا",
    appId: "ضع_APP_ID_هنا"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// تسجيل الدخول بجوجل
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

// ====== تحديد الأيقونة النشطة ======
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