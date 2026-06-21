// ================= دالة الأنيميشن لعداد الأرقام =================
function animateCounters() {
    const counters = document.querySelectorAll('.counter-animate');
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target')) || 0;
        const duration = 1200; 
        let startTime = null;

        const animation = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            
            counter.innerText = Math.round(target * ease);
            if (progress < 1) requestAnimationFrame(animation); 
            else counter.innerText = target;
        };
        requestAnimationFrame(animation);
    });
}

// ================= دالة بناء الواجهة =================
export function renderProfile(userData) {
    const name = userData ? userData.name : "طالب / مستخدم";
    const email = userData ? userData.email : "لا يوجد بريد";
    
    // تشغيل الأنيميشن والأيقونات بعد رسم الصفحة مباشرة
    setTimeout(() => {
        if(window.lucide) lucide.createIcons();
        animateCounters();
    }, 50);

    return `
    <div class="w-full min-h-[calc(100vh+2rem)] bg-white dark:bg-[#0e1621] animate-fade-in pb-24 -mt-12 -mx-4 lg:mt-0 lg:mx-0 w-[calc(100%+2rem)] lg:w-full relative">
        <style>
            .custom-scrollbar::-webkit-scrollbar { display: none; } 
            .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        </style>
        
        <div class="max-w-2xl mx-auto bg-white dark:bg-[#0e1621]">
            <!-- الغلاف والصورة الشخصية -->
            <div class="h-52 relative rounded-b-3xl shadow-sm" style="background: linear-gradient(to right, #6366f1, #9333ea); background-size: cover; background-position: center;">
                <div class="absolute inset-0 bg-black/25 rounded-b-3xl"></div>

                <div class="absolute top-12 w-full px-4 flex justify-between items-start z-10 pt-safe">
                    <button class="bg-black/30 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-white/10 shadow-sm active:scale-95 transition-transform" onclick="showToast('سيتم تفعيل التعديل قريباً', 'info')">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> تعديل
                    </button>
                    
                    <div class="flex items-center gap-2">
                        <button class="relative w-10 h-10 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 shadow-sm active:scale-95 transition-transform" onclick="showToast('لا توجد إشعارات جديدة', 'info')">
                            <i data-lucide="bell" class="w-5 h-5"></i>
                        </button>
                        <button onclick="openSettings()" class="w-10 h-10 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 shadow-sm active:scale-95 transition-transform">
                            <i data-lucide="settings" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>

                <div class="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
                    <div class="w-[110px] h-[110px] rounded-full border-[5px] border-white dark:border-[#0e1621] overflow-hidden bg-white dark:bg-[#17212b] shadow-lg">
                        <i data-lucide="user" class="w-12 h-12 text-slate-300 m-auto mt-8"></i>
                    </div>
                </div>
            </div>

            <!-- الاسم واليوزر والإحصائيات -->
            <div class="pt-16 pb-6 px-4 text-center border-b border-slate-100 dark:border-[#17212b]">
                <h2 class="text-[22px] font-black text-slate-800 dark:text-white mb-1">${name}</h2>
                <div class="text-xs text-slate-400 mb-5 font-mono">${email}</div>

                <div class="flex justify-center items-center gap-10 max-w-sm mx-auto mt-4">
                    <div class="text-center cursor-pointer group">
                        <div class="text-xl font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors counter-animate" data-target="0">0</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">متابع</div>
                    </div>
                    <div class="w-px h-8 bg-slate-200 dark:bg-[#233040]"></div>
                    <div class="text-center cursor-pointer group">
                        <div class="text-xl font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors counter-animate" data-target="0">0</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">يتابع</div>
                    </div>
                    <div class="w-px h-8 bg-slate-200 dark:bg-[#233040]"></div>
                    <div class="text-center cursor-help group">
                        <div class="text-xl font-black text-amber-500 dark:text-amber-400 counter-animate" data-target="0">0</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">الرصيد</div>
                    </div>
                </div>
            </div>

            <!-- الإحصائيات الأكاديمية -->
            <div class="px-4 py-4 border-b border-slate-100 dark:border-[#17212b] bg-slate-50/50 dark:bg-transparent">
                <div class="flex justify-between items-center px-1 cursor-pointer select-none group" onclick="toggleStats()">
                    <h3 class="text-[13px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-colors group-hover:text-indigo-500">
                        <i data-lucide="bar-chart-2" class="w-4 h-4 text-indigo-500"></i> إحصائيات الأداء
                    </h3>
                    <div id="stats-chevron" class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-slate-200 dark:bg-[#233040] text-slate-800 dark:text-white">
                        <i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300 rotate-180"></i>
                    </div>
                </div>
                
                <div id="academic-stats" class="transition-all duration-500 ease-in-out overflow-hidden max-h-[300px] opacity-100 mt-4">
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-white dark:bg-[#17212b] p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-transparent text-center">
                            <div class="text-[10px] font-bold text-slate-400 mb-1">المهام المنجزة</div>
                            <div class="text-lg font-black text-emerald-500 font-mono"><span class="counter-animate" data-target="0">0</span>%</div>
                        </div>
                        <div class="bg-white dark:bg-[#17212b] p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-transparent text-center">
                            <div class="text-[10px] font-bold text-slate-400 mb-1">نسبة الحضور</div>
                            <div class="text-lg font-black text-blue-500 font-mono"><span class="counter-animate" data-target="100">100</span>%</div>
                        </div>
                        <div class="bg-white dark:bg-[#17212b] p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-transparent text-center">
                            <div class="text-[10px] font-bold text-slate-400 mb-1">المعدل التراكمي</div>
                            <div class="text-lg font-black text-purple-500 font-mono">0.00</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- قسم المنشورات -->
            <div class="pt-6 pb-20 bg-white dark:bg-[#0e1621]">
                <div class="px-5 mb-4 flex items-center justify-between">
                    <h3 class="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <i data-lucide="layers" class="w-4 h-4 text-indigo-500"></i> منشوراتي
                    </h3>
                    <div class="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 px-3 py-1.5 rounded-full shadow-sm">
                        <div class="relative flex h-2 w-2">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </div>
                        <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">0 منشور</span>
                    </div>
                </div>
                
                <div class="text-center py-12 animate-fade-in">
                    <div class="w-16 h-16 bg-slate-50 dark:bg-[#17212b] rounded-full flex items-center justify-center mx-auto mb-3">
                        <i data-lucide="pen-tool" class="w-6 h-6 text-slate-400"></i>
                    </div>
                    <p class="text-slate-500 font-bold text-sm">لا يوجد محتوى متاح.</p>
                </div>
            </div>
        </div>

        <!-- ================= نافذة الإعدادات السفلية ================= -->
        <div id="overlay" onclick="closeSettings()" class="fixed inset-0 bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none z-[300] transition-opacity duration-300"></div>
        <div id="settings-sheet" class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-[#17212b] rounded-t-3xl overflow-hidden flex flex-col z-[301] transition-transform duration-300 translate-y-full">
            <div class="w-full pt-4 pb-2 cursor-grab touch-none">
                <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-3 pointer-events-none"></div>
                <h3 class="text-center font-bold text-lg text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-[#233040] select-none">الإعدادات</h3>
            </div>
            
            <div class="p-4 space-y-2 pb-6">
                <button onclick="toggleTheme()" class="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-[#1c242f] rounded-2xl hover:bg-slate-100 dark:hover:bg-[#233040] transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-white dark:bg-[#0e1621] text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-sm">
                            <i data-lucide="moon" class="w-5 h-5"></i>
                        </div>
                        <span class="font-bold text-slate-700 dark:text-slate-200 text-sm">المظهر (ليلي/نهاري)</span>
                    </div>
                </button>
                
                <div class="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-[#1c242f] rounded-2xl mt-4 border border-slate-100 dark:border-[#233040]">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#233040] text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-sm">
                            <i data-lucide="mail" class="w-5 h-5"></i>
                        </div>
                        <div class="flex flex-col text-right">
                            <span class="text-[10px] font-bold text-slate-400">البريد الإلكتروني</span>
                            <span class="font-mono text-slate-700 dark:text-slate-200 text-xs">${email}</span>
                        </div>
                    </div>
                </div>
                
                <button onclick="logout()" class="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors mt-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-white dark:bg-red-900/40 text-red-500 flex items-center justify-center shadow-sm">
                            <i data-lucide="log-out" class="w-5 h-5 ml-1"></i>
                        </div>
                        <span class="font-bold text-red-500 text-sm">تسجيل الخروج</span>
                    </div>
                </button>
            </div>
        </div>
    </div>
    `;
}

// ================= دوال التحكم في الواجهة =================

window.toggleStats = function() {
    const statsDiv = document.getElementById('academic-stats');
    const chevron = document.getElementById('stats-chevron');
    
    if(statsDiv.classList.contains('max-h-0')) {
        // فتح الإحصائيات
        statsDiv.classList.replace('max-h-0', 'max-h-[300px]');
        statsDiv.classList.replace('opacity-0', 'opacity-100');
        statsDiv.classList.replace('mt-0', 'mt-4');
        chevron.classList.replace('bg-slate-100', 'bg-slate-200');
        chevron.classList.replace('dark:bg-[#1c242f]', 'dark:bg-[#233040]');
        chevron.classList.replace('text-slate-400', 'text-slate-800');
        chevron.querySelector('i').classList.add('rotate-180');
    } else {
        // إغلاق الإحصائيات
        statsDiv.classList.replace('max-h-[300px]', 'max-h-0');
        statsDiv.classList.replace('opacity-100', 'opacity-0');
        statsDiv.classList.replace('mt-4', 'mt-0');
        chevron.classList.replace('bg-slate-200', 'bg-slate-100');
        chevron.classList.replace('dark:bg-[#233040]', 'dark:bg-[#1c242f]');
        chevron.classList.replace('text-slate-800', 'text-slate-400');
        chevron.querySelector('i').classList.remove('rotate-180');
    }
}

window.openSettings = function() {
    const sheet = document.getElementById('settings-sheet');
    const overlay = document.getElementById('overlay');
    
    overlay.classList.replace('opacity-0', 'opacity-100');
    overlay.classList.replace('pointer-events-none', 'pointer-events-auto');
    sheet.classList.replace('translate-y-full', 'translate-y-0');
}

window.closeSettings = function() {
    const sheet = document.getElementById('settings-sheet');
    const overlay = document.getElementById('overlay');
    
    overlay.classList.replace('opacity-100', 'opacity-0');
    overlay.classList.replace('pointer-events-auto', 'pointer-events-none');
    sheet.classList.replace('translate-y-0', 'translate-y-full');
}

window.toggleTheme = function() {
    document.documentElement.classList.toggle('dark');
}
