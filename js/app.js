// --- 確保 DOM 完全加載後再設置事件監聽器 ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 已加載，設置事件監聽器...');
    setupEventListeners();
    checkSession();
    startClock();
});

// --- 事件監聽器設置函數 ---
function setupEventListeners() {
    console.log('設置事件監聽器...');
    
    // 登入相關
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
        console.log('登入按鈕事件監聽器已設置');
    } else {
        console.error('找不到登入按鈕');
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
        console.log('註冊按鈕事件監聽器已設置');
    } else {
        console.error('找不到註冊按鈕');
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 畫面切換 - 這是關鍵！
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    
    if (showRegister) {
        showRegister.addEventListener('click', showRegisterScreen);
        console.log('顯示註冊畫面按鈕事件監聽器已設置');
    } else {
        console.error('找不到顯示註冊畫面按鈕');
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', showLoginScreen);
        console.log('顯示登入畫面按鈕事件監聽器已設置');
    } else {
        console.error('找不到顯示登入畫面按鈕');
    }
    
    // 飲水記錄相關
    const submitWaterBtn = document.getElementById('submit-water');
    const resetDayBtn = document.getElementById('reset-day');
    
    if (submitWaterBtn) submitWaterBtn.addEventListener('click', submitWater);
    if (resetDayBtn) resetDayBtn.addEventListener('click', resetDay);
    
    // 快速按鈕
    const quickButtons = document.querySelectorAll('.add-btn');
    quickButtons.forEach(button => {
        button.addEventListener('click', function() {
            const amount = parseInt(this.getAttribute('data-amount'));
            fillAmount(amount);
        });
    });
    
    // Enter 鍵提交
    const customAmount = document.getElementById('custom-amount');
    if (customAmount) {
        customAmount.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitWater();
            }
        });
    }
}

// --- 畫面切換函數 ---
function showRegisterScreen() {
    console.log('切換到註冊畫面');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('register-screen').classList.remove('hidden');
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-error').textContent = '';
    document.getElementById('reg-error').textContent = '';
}

function showLoginScreen() {
    console.log('切換到登入畫面');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-error').textContent = '';
    document.getElementById('reg-error').textContent = '';
}

// 初始化Supabase
const supabaseUrl = 'https://fayorxvfxtrycjiiiyfu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheW9yeHZmeHRyeWNqaWlpeWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzY1MTAsImV4cCI6MjA3OTg1MjUxMH0.7znE_AaNg6zESUO-RoSsyFqxCgcxjPT_pQiN557e6Nw'
const supabase = supabase.createClient(supabaseUrl, supabaseKey)

// 修改注册函数
async function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const goal = parseInt(document.getElementById('reg-goal').value) || 2000;

    const { data, error } = await supabase.auth.signUp({
        email: email, // Supabase需要email格式
        password: password
    });

    if (error) {
        document.getElementById('reg-error').textContent = error.message;
        return;
    }

    // 创建用户配置
    const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
            { 
                user_id: data.user.id, 
                username: user, 
                daily_goal: goal,
                created_at: new Date()
            }
        ]);

    if (!profileError) {
        showApp();
    }
}

// 修改登录函数
async function handleLogin() {
    const userInput = document.getElementById('login-user').value.trim();
    const passInput = document.getElementById('login-pass').value.trim();

    const { data, error } = await supabase.auth.signInWithPassword()
        email: email',
        password: password

    });

    if (error) {
        document.getElementById('login-error').textContent = error.message;
        return;
    }

    currentUser = data.user;
    showApp();
}
// --- 認證回調處理 ---
async function handleAuthCallback() {
    // 檢查 URL 中是否有認證參數
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    console.log('認證回調參數:', { accessToken, refreshToken, error, errorDescription });

    if (error) {
        console.error('認證錯誤:', errorDescription);
        showToast(`認證失敗: ${errorDescription}`, 'error');
        // 清理 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (accessToken && refreshToken) {
        try {
            console.log('處理 OAuth 回調...');
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (error) {
                console.error('設置會話錯誤:', error);
                showToast('登入失敗，請重試', 'error');
            } else {
                console.log('OAuth 登入成功:', data);
                currentUser = data.user;
                await loadUserData();
                showApp();
                showToast('登入成功！', 'success');
            }

            // 清理 URL 參數
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (err) {
            console.error('OAuth 回調處理錯誤:', err);
            showToast('認證處理失敗', 'error');
        }
    }
}
