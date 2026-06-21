// دالة بناء واجهة البروفايل (نعمل لها Export عشان نستخدمها في مكان تاني)
export function renderProfile(userData) {
    const name = userData ? userData.name : "غير معروف";
    const username = userData ? userData.username : "@user";
    const email = userData ? userData.email : "لا يوجد بريد";

    return `
        <div class="profile-header">
            <div class="cover-photo" onclick="showToast('سيتم تفعيل رفع الغلاف قريباً', 'info')">
                <div class="edit-overlay"><i class="fa-solid fa-camera"></i></div>
                <div class="settings-icon glass-btn" onclick="event.stopPropagation(); openSettings()">
                    <i class="fa-solid fa-gear"></i>
                </div>
            </div>
            
            <div class="avatar-container" onclick="showToast('سيتم تفعيل تغيير الصورة قريباً', 'info')">
                <img src="https://via.placeholder.com/120" alt="Avatar" class="avatar-img">
                <div class="edit-avatar"><i class="fa-solid fa-camera"></i></div>
            </div>
        </div>

        <div class="profile-info" style="margin-top: 30px;">
            <h2 class="user-title">
                <span id="user-display-name">${name}</span>
                <span id="user-display-username" class="hidden">${username}</span>
                <i class="fa-solid fa-repeat switch-icon" onclick="toggleName()"></i>
            </h2>
            
            <div class="stats-glass" style="margin-top: 20px;">
                <div class="stat-box">
                    <span class="stat-value">∞</span>
                    <span class="stat-label">الرصيد</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">0</span>
                    <span class="stat-label">يتابع</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">0</span>
                    <span class="stat-label">متابع</span>
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

// ================= دوال التحكم الخاصة بالبروفايل فقط =================
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
