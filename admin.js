// admin.js (النسخة النهائية والموحدة)

// 1. استيراد الأدوات من config.js
import { auth, db, calculateUserRank } from "./config.js";

// 2. استيراد دوال Auth و Firestore اللازمة
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    runTransaction,
    serverTimestamp,
    setDoc,
    increment,
    limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


// ====== DOM Refs ======
const authCheck = document.getElementById('authCheck');
const authStatus = document.getElementById('authStatus');
const authIcon = document.getElementById('authIcon');
const adminDashboard = document.getElementById('adminDashboard');

// الإحصائيات
const totalUsersCount = document.getElementById('totalUsersCount');
const totalStarsCount = document.getElementById('totalStarsCount');

// البحث والإدارة
const userSearchInput = document.getElementById('userSearchInput');
const searchUserBtn = document.getElementById('searchUserBtn');
const userProfileDisplay = document.getElementById('userProfileDisplay');
const userControlActions = document.getElementById('userControlActions');
const targetUsernameSpan = document.getElementById('targetUsername');

// إجراءات التحكم (الحظر)
const banDurationInput = document.getElementById('banDurationInput');
const tempBanBtn = document.getElementById('tempBanBtn');
const permanentBanBtn = document.getElementById('permanentBanBtn');
const unbanBtn = document.getElementById('unbanBtn');

// إجراءات التحكم (النجوم)
const starsAmountInput = document.getElementById('starsAmountInput');
const addStarsBtn = document.getElementById('addStarsBtn');
const removeStarsBtn = document.getElementById('removeStarsBtn');
const setStarsBtn = document.getElementById('setStarsBtn');

// الأدوات الشاملة
const globalStarsAmount = document.getElementById('globalStarsAmount');
const distributeStarsBtn = document.getElementById('distributeStarsBtn');
const promoCodeName = document.getElementById('promoCodeName');
const promoCodeStars = document.getElementById('promoCodeStars');
const generatePromoBtn = document.getElementById('generatePromoBtn');
const generatedCodeFeedback = document.getElementById('generatedCodeFeedback');

// ====== State & Constants ======
const usersCol = collection(db, 'users');
const promosCol = collection(db, 'promos');
const SECONDS_IN_DAY = 24 * 60 * 60;

let currentTargetUser = null; 


// ====== Helpers ======
function showToast(msg, color = '#2ecc71') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    t.style.borderColor = color; 
    document.body.appendChild(t);
    
    setTimeout(()=> { t.style.opacity = 1; t.style.transform = 'translateX(0)'; }, 20);
    setTimeout(()=> { 
        t.style.opacity = 0; 
        t.style.transform = 'translateX(100%)';
        setTimeout(()=> t.remove(), 400); 
    }, 3500);
}

function formatTimestamp(ts) {
    if (!ts?.toDate) return 'N/A';
    return ts.toDate().toLocaleString('ar-EG');
}

// ====== User Profile Display ======
function renderUserProfile(userData, uid) {
    currentTargetUser = { ...userData, uid };
    
    // ✅ استخدام الدالة الموحدة لحساب الرتبة للعرض
    const rankInfo = calculateUserRank(userData.stars || 0);

    const bannedUntil = userData.bannedUntil?.toDate ? userData.bannedUntil.toDate() : null;
    const isBanned = bannedUntil && bannedUntil > new Date() || userData.isBannedPermanent === true;
    const isPermanent = userData.isBannedPermanent === true;
    const banReason = userData.banReason || 'غير محدد';

    const statusText = isPermanent ? 'باند نهائي' : isBanned ? `محظور مؤقتاً` : 'نشط';
    const statusColor = isPermanent || isBanned ? 'var(--danger)' : 'var(--success)';
    
    let banDetails = '';
    if (isPermanent) {
        banDetails = `باند نهائي.`;
    } else if (isBanned) {
        banDetails = `حتى: ${formatTimestamp(userData.bannedUntil)}.`;
    }
    
    // تنسيق عرض المستوى
    let levelDisplay = `${rankInfo.level}`;
    if (rankInfo.isPrestige) {
        levelDisplay += ` <span style="color:var(--gold)">(${rankInfo.prestigeSymbol} رتبة فخرية)</span>`;
    }

    userProfileDisplay.style.display = 'block';
    userControlActions.style.display = 'block';
    targetUsernameSpan.textContent = userData.username || userData.displayName || 'N/A';
    unbanBtn.style.display = isBanned || isPermanent ? 'block' : 'none';
    
    // منع المسؤول من حظر نفسه
    const selfAdmin = uid === auth.currentUser.uid;
    tempBanBtn.disabled = selfAdmin;
    permanentBanBtn.disabled = selfAdmin;
    unbanBtn.disabled = selfAdmin;

    userProfileDisplay.innerHTML = `
        <div style="display:flex; align-items:center; gap:20px;">
            <img src="${userData.photoURL || 'https://via.placeholder.com/60'}" alt="Avatar" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:3px solid var(--accent);">
            <div style="flex-grow:1;">
                <h3 style="margin:0; color:#fff;">@${userData.username || 'N/A'} (${userData.displayName || 'N/A'})</h3>
                <p style="color:var(--muted); margin:5px 0 0;">الإيميل: ${userData.email || 'N/A'} | UID: ${uid}</p>
                <p style="color:var(--muted); margin:5px 0 0;">${userData.isAdmin ? `<strong style="color:var(--gold);">[مسؤول]</strong>` : ''}</p>
            </div>
        </div>

        <div style="margin-top:20px; padding-top:15px; border-top:1px dashed rgba(255,255,255,0.1);">
            <p style="margin:0; color:#fff;">
                <strong>الحالة:</strong> 
                <span style="color:${statusColor}; font-weight:700;">${statusText}</span>
                ${banDetails}
            </p>
            <p style="margin:5px 0; color:#fff;"><strong>النجوم الحالية:</strong> ${userData.stars?.toLocaleString('en-US') || 0}</p>
            <p style="margin:5px 0;"><strong>المستوى:</strong> ${levelDisplay}</p>
            <p style="margin:5px 0;"><strong>آخر نشاط:</strong> ${userData.lastActiveDate || 'N/A'}</p>
            <p style="margin:5px 0;"><strong>سبب الحظر:</strong> ${banReason}</p>
        </div>
    `;
}


// ====== Core Admin Actions ======

/* 1. البحث عن مستخدم */
searchUserBtn.addEventListener('click', async () => {
    const term = userSearchInput.value.trim().toLowerCase();
    if (!term) return showToast('الرجاء إدخال يوزر أو UID للبحث.', 'var(--gold)');

    searchUserBtn.disabled = true;
    userProfileDisplay.innerHTML = `<p style="color:var(--muted); text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري البحث عن المستخدم...</p>`;
    userProfileDisplay.style.display = 'block';
    userControlActions.style.display = 'none';

    try {
        let userDocSnap = null;
        let targetUID = null;

        if (term.length === 28) {
            targetUID = term;
            userDocSnap = await getDoc(doc(db, 'users', targetUID));
        } 
        else {
            const q = query(usersCol, where('username', '==', term), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                userDocSnap = snap.docs[0];
                targetUID = userDocSnap.id;
            }
        }

        if (userDocSnap?.exists()) {
            renderUserProfile(userDocSnap.data(), targetUID);
            showToast('تم العثور على المستخدم!', 'var(--success)');
        } else {
            userProfileDisplay.innerHTML = `<p style="color:var(--danger); text-align:center;"><i class="fas fa-exclamation-circle"></i> لم يتم العثور على مستخدم باليوزر/UID المدخل.</p>`;
            currentTargetUser = null;
        }

    } catch (e) {
        console.error('Search error:', e);
        showToast('حدث خطأ أثناء البحث.', 'var(--danger)');
        userProfileDisplay.innerHTML = `<p style="color:var(--danger); text-align:center;"><i class="fas fa-exclamation-circle"></i> خطأ: ${e.message}</p>`;
    } finally {
        searchUserBtn.disabled = false;
    }
});

/* 2. إجراءات الحظر/الباند */
tempBanBtn.addEventListener('click', async () => {
    if (!currentTargetUser) return showToast('ابحث عن مستخدم أولاً.', 'var(--gold)');
    const days = parseInt(banDurationInput.value);
    if (isNaN(days) || days <= 0) return showToast('الرجاء إدخال مدة حظر صالحة (بالأيام).', 'var(--gold)');
    
    const reason = prompt("الرجاء إدخال سبب الحظر المؤقت:");
    if (!reason) return showToast('لا يمكن الحظر بدون سبب.', 'var(--gold)');
    
    const banUntil = new Date(Date.now() + days * SECONDS_IN_DAY * 1000);
    
    try {
        await updateDoc(doc(db, 'users', currentTargetUser.uid), {
            bannedUntil: banUntil,
            isBannedPermanent: false,
            banReason: reason
        });
        showToast(`تم حظر ${currentTargetUser.username} مؤقتاً لمدة ${days} أيام.`, 'var(--danger)');
        const snap = await getDoc(doc(db, 'users', currentTargetUser.uid));
        renderUserProfile(snap.data(), currentTargetUser.uid);
    } catch (e) {
        showToast('فشل عملية الحظر.', 'var(--danger)');
        console.error(e);
    }
});

permanentBanBtn.addEventListener('click', async () => {
    if (!currentTargetUser) return showToast('ابحث عن مستخدم أولاً.', 'var(--gold)');
    if (!confirm(`تحذير: هل أنت متأكد من عمل باند نهائي للمستخدم @${currentTargetUser.username}؟`)) return;

    const reason = prompt("الرجاء إدخال سبب الباند النهائي:");
    if (!reason) return showToast('لا يمكن الحظر بدون سبب.', 'var(--gold)');

    try {
        await updateDoc(doc(db, 'users', currentTargetUser.uid), {
            bannedUntil: null, 
            isBannedPermanent: true,
            banReason: reason
        });
        showToast(`تم عمل باند نهائي للمستخدم @${currentTargetUser.username}.`, 'var(--danger)');
        const snap = await getDoc(doc(db, 'users', currentTargetUser.uid));
        renderUserProfile(snap.data(), currentTargetUser.uid);
    } catch (e) {
        showToast('فشل عملية الباند النهائي.', 'var(--danger)');
        console.error(e);
    }
});

unbanBtn.addEventListener('click', async () => {
    if (!currentTargetUser) return showToast('ابحث عن مستخدم أولاً.', 'var(--gold)');
    
    try {
        await updateDoc(doc(db, 'users', currentTargetUser.uid), {
            bannedUntil: serverTimestamp(), 
            isBannedPermanent: false,
            banReason: null
        });
        showToast(`تم فك الحظر عن المستخدم @${currentTargetUser.username}.`, 'var(--success)');
        const snap = await getDoc(doc(db, 'users', currentTargetUser.uid));
        renderUserProfile(snap.data(), currentTargetUser.uid);
    } catch (e) {
        showToast('فشل فك الحظر.', 'var(--danger)');
        console.error(e);
    }
});


/* 3. إجراءات التحكم بالنجوم (Stars) - ✅ تم التحديث */
async function updateStars(action, amount) {
    if (!currentTargetUser) return showToast('ابحث عن مستخدم أولاً.', 'var(--gold)');
    if (isNaN(amount) || amount < 0) return showToast('أدخل قيمة صحيحة وموجبة للنجوم.', 'var(--gold)');

    const uRef = doc(db, 'users', currentTargetUser.uid);
    
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(uRef);
            const data = snap.data();
            const currentStars = data.stars || 0;
            let newStars = currentStars;
            
            if (action === 'add') {
                newStars = currentStars + amount;
            } else if (action === 'remove') {
                newStars = Math.max(0, currentStars - amount); 
            } else if (action === 'set') {
                newStars = amount;
            }

            // ✅ استخدام الدالة الموحدة لحساب القيم الجديدة قبل الحفظ
            const rankInfo = calculateUserRank(newStars);
            
            tx.update(uRef, { 
                stars: newStars,
                level: rankInfo.level, 
                prestigeRank: rankInfo.prestigeSymbol // حفظ الرمز للتناسق مع القديم
            });
        });
        
        showToast(`تم ${action === 'add' ? 'إضافة' : action === 'remove' ? 'سحب' : 'تعيين'} النجوم بنجاح!`, 'var(--accent)');
        const snap = await getDoc(uRef);
        renderUserProfile(snap.data(), currentTargetUser.uid);
    } catch (e) {
        showToast('فشل تحديث النجوم.', 'var(--danger)');
        console.error(e);
    }
}

addStarsBtn.addEventListener('click', () => updateStars('add', parseInt(starsAmountInput.value)));
removeStarsBtn.addEventListener('click', () => updateStars('remove', parseInt(starsAmountInput.value)));
setStarsBtn.addEventListener('click', () => updateStars('set', parseInt(starsAmountInput.value)));


/* 4. الإحصائيات العامة */
async function loadStats() {
    try {
        const q = query(usersCol); 
        const snap = await getDocs(q); 
        
        const totalUsers = snap.size;
        
        let totalStars = 0;
        snap.forEach(doc => {
            totalStars += doc.data().stars || 0;
        });
        
        totalUsersCount.textContent = totalUsers.toLocaleString('en-US');
        totalStarsCount.textContent = totalStars.toLocaleString('en-US');

    } catch (e) {
        console.warn('Failed to load stats:', e);
        totalUsersCount.textContent = 'خطأ';
        totalStarsCount.textContent = 'خطأ';
    }
}
setInterval(loadStats, 60000); 


/* 5. الأدوات الشاملة (Global Tools) */
distributeStarsBtn.addEventListener('click', async () => {
    const amount = parseInt(globalStarsAmount.value);
    if (isNaN(amount) || amount <= 0) return showToast('الرجاء إدخال عدد نجوم صالح للإضافة.', 'var(--gold)');
    if (!confirm(`تحذير: هل أنت متأكد من إضافة ${amount} نجمة لكل المستخدمين؟ هذه العملية غير قابلة للتراجع وقد تكون مكلفة.`)) return;
    
    distributeStarsBtn.disabled = true;
    showToast('جاري توزيع النجوم. قد تستغرق العملية وقتاً طويلاً...', 'var(--gold)');

    try {
        const q = query(usersCol);
        const snapshot = await getDocs(q);
        
        let successCount = 0;
        
        // ملاحظة: التوزيع الجماعي هنا يحدث النجوم فقط، وسيتم تحديث المستوى تلقائياً عند دخول المستخدم لملفه الشخصي
        // أو يمكنك إضافة منطق الحساب هنا، لكن لتسريع العملية سنكتفي بـ increment
        for (const userDoc of snapshot.docs) {
            const uRef = doc(db, 'users', userDoc.id);
            try {
                await updateDoc(uRef, {
                    stars: increment(amount)
                });
                successCount++;
            } catch (e) {
                console.warn(`Failed to update stars for user ${userDoc.id}:`, e);
            }
        }
        
        showToast(`تم إضافة ${amount} نجمة بنجاح إلى ${successCount} مستخدم.`, 'var(--success)');
        loadStats();
    } catch (e) {
        showToast('فشل عملية التوزيع الجماعي.', 'var(--danger)');
        console.error(e);
    } finally {
        distributeStarsBtn.disabled = false;
    }
});

generatePromoBtn.addEventListener('click', async () => {
    const code = promoCodeName.value.trim().toUpperCase();
    const stars = parseInt(promoCodeStars.value);
    
    if (!/^[A-Z0-9]+$/.test(code) || code.length < 5) return showToast('الكود يجب أن يكون أحرف إنجليزية وأرقام 5+.', 'var(--gold)');
    if (isNaN(stars) || stars <= 0) return showToast('الرجاء تحديد عدد نجوم صالح.', 'var(--gold)');
    
    generatePromoBtn.disabled = true;

    try {
        const promoRef = doc(db, 'promos', code);
        const snap = await getDoc(promoRef);
        
        if (snap.exists()) {
            generatedCodeFeedback.textContent = `الكود (${code}) موجود بالفعل.`;
            return showToast('الكود موجود بالفعل.', 'var(--gold)');
        }
        
        await setDoc(promoRef, {
            stars: stars,
            maxUses: 0, 
            uses: 0,
            createdBy: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });
        
        generatedCodeFeedback.innerHTML = `تم توليد الكود: <strong style="color:var(--success);">${code}</strong> يضيف ${stars} نجمة.`;
        showToast('تم توليد Promo Code بنجاح!', 'var(--success)');

    } catch (e) {
        console.error('Promo generation error:', e);
        showToast('فشل توليد Promo Code.', 'var(--danger)');
    } finally {
        generatePromoBtn.disabled = false;
    }
});


// ====== التهيئة والتحقق الأولي (On Load) ======
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        authStatus.textContent = 'يرجى تسجيل الدخول أولاً.';
        authIcon.className = 'fas fa-times-circle';
        authIcon.style.color = 'var(--danger)';
        setTimeout(() => location.href = 'index.html', 2000);
        return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
        authStatus.textContent = 'المستخدم غير مسجل في قاعدة البيانات.';
        authIcon.className = 'fas fa-times-circle';
        authIcon.style.color = 'var(--danger)';
        return;
    }

    const userData = snap.data();
    
    if (userData.isAdmin === true) {
        authCheck.style.display = 'none';
        adminDashboard.style.display = 'grid';
        loadStats(); 
    } else {
        authStatus.textContent = 'غير مصرح لك بالوصول إلى لوحة التحكم هذه.';
        authIcon.className = 'fas fa-lock';
        authIcon.style.color = 'var(--danger)';
    }
});
