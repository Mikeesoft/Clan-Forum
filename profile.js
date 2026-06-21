// ================= دالة الأنيميشن لعداد الأرقام =================
// (مستوحاة من مشروعك القديم، لكن مبرمجة لتعمل مباشرة بدون React)
function animateCounters() {
    const counters = document.querySelectorAll('.counter-animate');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const duration = 1200; // مدة الأنيميشن
        let startTime = null;

        const animation = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            // تأثير التباطؤ (Ease Out)
            const ease = 1 - Math.pow(1 - progress, 4);
            counter.innerText = Math.round(target * ease);

            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                counter.innerText = target; // التأكد من وصول الرقم النهائي
            }
        };
        requestAnimationFrame(animation);
    });
}

// ================= دالة بناء واجهة البروفايل =================
export function renderProfile(userData) {
    const name = userData ? userData.name : "غير معروف";
    const username = userData ? userData.username : "@user";
    const email = userData ? userData.email : "لا يوجد بريد";

    // وضع مؤقت لاستدعاء الأنيميشن بعد رسم الصفحة
    setTimeout(() => animateCounters(), 50);

    return `
        <div class="h-52 relative rounded-b-[2rem] shadow-sm" style="background: linear-gradient(to right, #3b82f6, #9333ea);">
            <div class="absolute inset-0 bg-black/20 rounded-b-[2rem]"></div>
            
            <div class="absolute top-12 w-full px-4 flex justify-between items-start z-10 pt-safe">
                <button class="bg-black/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 border border-white/10 shadow-sm active:scale-95 transition-transform" onclick="showToast('تعديل البروفايل قريباً', 'info')">
                    <i class="fa-solid fa-pen-to-square"></i> تعديل
                </button>
                
                <button onclick="openSettings()" class="w-10 h-10 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 shadow-sm active:scale-95 transition-transform">
                    <i class="fa-solid fa-gear"></i>
                </button>
            </div>

            <div class="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
                <div class="w-[110px] h-[110px] rounded-full border-[4px] border-[var(--bg-color)] overflow-hidden bg-[var(--bg-color)] shadow-lg relative cursor-pointer" onclick="showToast('تغيير الصورة قريباً', 'info')">
                    <img src="https://via.placeholder.com/150" class="w-full h-full object-cover">
                    <div class="absolute bottom-1 right-1 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-[var(--bg-color)]">
                        <i class="fa-solid fa-camera text-xs"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="pt-16 pb-6 px-4 text-center border-b border-slate-100 dark:border-[#17212b]">
            <h2 class="text-2xl font-black mb-1">
                <span id="user-display-name">${name}</span>
                <span id="user-display-username" class="hidden text-indigo-500">${username}</span>
                <i class="fa-solid fa-repeat text-[12px] text-slate-400 cursor-pointer ml-2 bg-black/5 p-2 rounded-full" onclick="toggleName()"></i>
            </h2>
            
            <p class="text-sm text-slate-500 font-medium mb-6">مطور ويب | شغوف بالرياضيات المتقطعة</p>

            <div class="flex justify-center items-center gap-10 max-w-sm mx-auto">
                <div class="text-center cursor-pointer group">
                    <div class="text-xl font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors counter-animate" data-target="15">0</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">متابع</div>
                </div>
                <div class="w-px h-8 bg-slate-200 dark:bg-[#233040]"></div>
                <div class="text-center cursor-pointer group">
                    <div class="text-xl font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors counter-animate" data-target="42">0</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">يتابع</div>
                </div>
                <div class="w-px h-8 bg-slate-200 dark:bg-[#233040]"></div>
                <div class="text-center group">
                    <div class="text-xl font-black text-amber-500 dark:text-amber-400 counter-animate" data-target="120">0</div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">الرصيد</div>
                </div>
            </div>
        </div>

        <div class="px-4 py-4 mb-20">
            <h3 class="text-[13px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 mb-4">
                <i class="fa-solid fa-chart-pie text-indigo-500"></i> إحصائيات الأداء
            </h3>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-[var(--glass-bg)] p-4 rounded-2xl shadow-sm border border-[var(--glass-border)] text-center">
                    <div class="text-[11px] font-bold text-slate-400 mb-1">التحديات المنجزة</div>
                    <div class="text-xl font-black text-emerald-500 font-mono"><span class="counter-animate" data-target="8">0</span></div>
                </div>
                <div class="bg-[var(--glass-bg)] p-4 rounded-2xl shadow-sm border border-[var(--glass-border)] text-center">
                    <div class="text-[11px] font-bold text-slate-400 mb-1">نقاط التفاعل</div>
                    <div class="text-xl font-black text-purple-500 font-mono"><span class="counter-animate" data-target="350">0</span></div>
                </div>
            </div>
        </div>

        <div id="overlay" onclick="closeSettings()"></div>
        <div id="settings-sheet" class="bottom-sheet glass-panel">
            <div class="sheet-handle"></div>
            <h3 style="margin-bottom: 20px; text-align: center;">الإعدادات</h3>
            
            <div class="setting-item" onclick="toggleTheme()">
                <span>المظهر (ليلي/نهاري)</span>
                <i class="fa-solid fa-sun"></i>
            </div>
            <div class="setting-item">
                <span style="font-size: 13px; color: #94a3b8;">${email}</span>
                <i class="fa-solid fa-envelope"></i>
            </div>
            <div class="setting-item text-danger" onclick="logout()">
                <span>تسجيل الخروج</span>
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </div>
        </div>
    `;
}

// ================= دوال التحكم =================
window.toggleName = function() {
    document.getElementById('user-display-name').classList.toggle('hidden');
    document.getElementById('user-display-username').classList.toggle('hidden');
}

window.openSettings = function() {
    document.getElementById('settings-sheet').style.bottom = '0';
    document.getElementById('overlay').classList.add('active');
}

window.closeSettings = function() {
    document.getElementById('settings-sheet').style.bottom = '-100%';
    document.getElementById('overlay').classList.remove('active');
}
