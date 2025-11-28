// --- Supabase 初始化 ---
const SUPABASE_URL = 'https://fayorxvfxtrycjiiiyfu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheW9yeHZmeHRyeWNqaWlpeWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NDU2MDksImV4cCI6MjA1MDIyMTYwOX0.4O4K0t8s-Bd5w2P0NlH1lHqH8n8eL9vY8Q6Qy9qJ3kA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 狀態變數 ---
let currentUser = null;
let currentDate = new Date().toDateString();
let timerInterval = null;
let userProfile = null;

// --- DOM 元素 ---
const loginScreen = document.getElementById('login-screen');
const registerScreen = document.getElementById('register-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const submitWaterBtn = document.getElementById('submit-water');
const resetDayBtn = document.getElementById('reset-day');
const quickButtons = document.querySelectorAll('.add-btn');

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('頁面載入完成');
    setupEventListeners();
    checkSession();
    startClock();
});

// --- 事件監聽器設置 ---
function setupEventListeners() {
    // 登入相關
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    showRegister.addEventListener('click', showRegisterScreen);
    showLogin.addEventListener('click', showLoginScreen);
    
    // 飲水記錄相關
    submitWaterBtn.addEventListener('click', submitWater);
    resetDayBtn.addEventListener('click', resetDay);
    
    // 快速按鈕
    quickButtons.forEach(button => {
        button.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            fillAmount(parseInt(amount));
        });
    });
    
    // Enter 鍵支持
    document.getElementById('reg-pass')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleRegister();
    });
    document.getElementById('login-pass')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('custom-amount')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') submitWater();
    });
}

// --- 時鐘功能 ---
function startClock() {
    updateTime();
    timerInterval = setInterval(updateTime, 1000);
}

function updateTime() {
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('zh-TW', dateOptions);
    const timeString = now.toLocaleTimeString('zh-TW', { hour12: false });
    document.getElementById('real-time-clock').textContent = timeString;
}

// --- 畫面切換 ---
function showLoginScreen() {
    console.log('顯示登入畫面');
    loginScreen.classList.remove('hidden');
    registerScreen.classList.add('hidden');
    appScreen.style.display = 'none';
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-success').textContent = '';
}

function showRegisterScreen() {
    console.log('顯示註冊畫面');
    loginScreen.classList.add('hidden');
    registerScreen.classList.remove('hidden');
    appScreen.style.display = 'none';
    document.getElementById('reg-error').textContent = '';
    document.getElementById('reg-success').textContent = '';
}

function showAppScreen() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('register-screen').classList.add('hidden');
    appScreen.style.display = 'block';
    console.log('顯示主應用畫面');
}

// --- 認證系統 ---
async function checkSession() {
    try {
        console.log('檢查登入狀態...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('檢查 session 錯誤:', error);
            showLoginScreen();
            return;
        }
        
        if (session && session.user) {
            console.log('用戶已登入:', session.user.email);
            currentUser = session.user;
            await loadUserData();
            showAppScreen();
        } else {
            console.log('沒有找到登入 session');
            showLoginScreen();
        }
    } catch (err) {
        console.error('檢查 session 異常:', err);
        showLoginScreen();
    }
}

async function handleRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value.trim();
    const goal = parseInt(document.getElementById('reg-goal').value) || 2000;
    const errorMsg = document.getElementById('reg-error');
    const successMsg = document.getElementById('reg-success');

    errorMsg.textContent = '';
    successMsg.textContent = '';

    if (!email || !password) {
        errorMsg.textContent = "請填寫所有欄位";
        return;
    }

    if (password.length < 6) {
        errorMsg.textContent = "密碼至少需要6位字符";
        return;
    }

    // 顯示加載狀態
    setLoadingState(registerBtn, true, '註冊中...');

    try {
        console.log('開始註冊:', email);
        
        // 直接註冊
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            console.error('註冊錯誤:', error);
            errorMsg.textContent = error.message;
            setLoadingState(registerBtn, false, '註冊並登入');
            return;
        }

        console.log('註冊成功:', data);

        // 創建用戶資料
        if (data.user) {
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert([
                    { 
                        user_id: data.user.id, 
                        daily_goal: goal
                    }
                ]);

            if (profileError && !profileError.message.includes('duplicate key')) {
                console.error('創建用戶資料錯誤:', profileError);
            }
        }

        // 嘗試直接登入
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (loginError) {
            successMsg.textContent = "註冊成功！請手動登入。";
            setTimeout(() => {
                showLoginScreen();
                document.getElementById('login-email').value = email;
                document.getElementById('login-success').textContent = "請使用您的帳號密碼登入";
            }, 2000);
        } else {
            console.log('自動登入成功');
            currentUser = loginData.user;
            await loadUserData();
            showAppScreen();
        }
        
    } catch (err) {
        console.error('註冊過程異常:', err);
        errorMsg.textContent = "註冊過程中發生錯誤";
    } finally {
        setLoadingState(registerBtn, false, '註冊並登入');
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value.trim();
    const errorMsg = document.getElementById('login-error');
    const successMsg = document.getElementById('login-success');

    errorMsg.textContent = '';
    successMsg.textContent = '';

    if (!email || !password) {
        errorMsg.textContent = "請填寫所有欄位";
        return;
    }

    // 顯示加載狀態
    setLoadingState(loginBtn, true, '登入中...');

    try {
        console.log('嘗試登入:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('登入錯誤詳細信息:', error);
            
            if (error.message.includes('Invalid login credentials')) {
                errorMsg.textContent = "電子郵件或密碼不正確";
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg.textContent = "請先驗證您的電子郵件";
            } else {
                errorMsg.textContent = error.message || "登入失敗";
            }
            setLoadingState(loginBtn, false, '登入');
            return;
        }

        console.log('登入成功:', data.user.email);
        currentUser = data.user;
        await loadUserData();
        showAppScreen();
        
    } catch (err) {
        console.error('登入過程異常:', err);
        errorMsg.textContent = "登入過程中發生錯誤";
    } finally {
        setLoadingState(loginBtn, false, '登入');
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('登出錯誤:', error);
            alert('登出時發生錯誤');
            return;
        }
        currentUser = null;
        userProfile = null;
        showLoginScreen();
        console.log('登出成功');
    } catch (err) {
        console.error('登出異常:', err);
        alert('登出時發生錯誤');
    }
}

// --- 應用程式主要邏輯 ---
async function loadUserData() {
    if (!currentUser) return;
    
    console.log('載入用戶資料...');
    
    try {
        // 加載用戶資料
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        if (profileError) {
            console.error('載入用戶資料錯誤:', profileError);
            userProfile = { daily_goal: 2000 };
        } else {
            userProfile = profileData;
        }
        
        // 加載今日飲水記錄
        const today = new Date().toISOString().split('T')[0];
        const { data: waterData, error: waterError } = await supabase
            .from('water_records')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('date', today)
            .order('created_at', { ascending: false });
        
        if (waterError) {
            console.error('載入飲水記錄錯誤:', waterError);
            updateUI([], userProfile);
            return;
        }
        
        // 更新UI
        updateUI(waterData, userProfile);
        
    } catch (err) {
        console.error('載入用戶資料異常:', err);
        updateUI([], { daily_goal: 2000 });
    }
}

function fillAmount(amount) {
    const input = document.getElementById('custom-amount');
    input.value = amount;
    input.focus();
    input.style.borderColor = '#3498db';
    setTimeout(() => {
        input.style.borderColor = '#ddd';
    }, 300);
}

async function submitWater() {
    if (!currentUser) {
        alert('請先登入');
        return;
    }
    
    const input = document.getElementById('custom-amount');
    const amount = parseInt(input.value);
    
    if (!amount || amount <= 0) {
        alert("請輸入有效的毫升數");
        return;
    }
    
    if (amount > 5000) {
        alert("單次飲水量不宜超過 5000ml");
        return;
    }
    
    // 顯示加載狀態
    setLoadingState(submitWaterBtn, true, '提交中...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('water_records')
            .insert([
                { 
                    user_id: currentUser.id, 
                    amount: amount,
                    date: today
                }
            ]);
        
        if (error) {
            console.error('添加飲水記錄錯誤:', error);
            alert("記錄添加失敗，請重試");
            return;
        }
        
        console.log('飲水記錄添加成功');
        // 重新加載數據
        await loadUserData();
        
        // 清空輸入框
        input.value = '';
        
    } catch (err) {
        console.error('提交飲水記錄異常:', err);
        alert("提交過程中發生錯誤");
    } finally {
        setLoadingState(submitWaterBtn, false, '提交記錄');
    }
}

async function resetDay() {
    if (!currentUser) return;
    
    if (!confirm("確定要清空今日的所有記錄嗎？此操作無法復原！")) {
        return;
    }
    
    // 顯示加載狀態
    setLoadingState(resetDayBtn, true, '重置中...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
            .from('water_records')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('date', today);
        
        if (error) {
            console.error('重置記錄錯誤:', error);
            alert("重置失敗，請重試");
            return;
        }
        
        console.log('重置成功');
        // 重新加載數據
        await loadUserData();
        
    } catch (err) {
        console.error('重置異常:', err);
        alert("重置過程中發生錯誤");
    } finally {
        setLoadingState(resetDayBtn, false, '重置今日記錄');
    }
}

function updateUI(waterData, profile) {
    if (!profile) return;
    
    // 更新用戶名
    const username = currentUser.email.split('@')[0];
    document.getElementById('display-username').textContent = username;
    document.getElementById('goal-intake').textContent = profile.daily_goal;
    
    // 計算今日總飲水量
    let totalIntake = 0;
    if (waterData && waterData.length > 0) {
        waterData.forEach(record => {
            totalIntake += record.amount;
        });
    }
    
    document.getElementById('current-intake').textContent = totalIntake;
    
    // 更新進度百分比
    let percentage = Math.round((totalIntake / profile.daily_goal) * 100);
    if (percentage > 100) percentage = 100;
    
    document.getElementById('percentage').textContent = percentage + '%';
    document.getElementById('wave').style.height = percentage + '%';
    
    // 更新歷史記錄
    updateHistoryList(waterData);
}

function updateHistoryList(records) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (!records || records.length === 0) {
        list.innerHTML = '<li style="justify-content:center; color:#999;">尚無記錄</li>';
    } else {
        records.forEach(record => {
            const li = document.createElement('li');
            const time = new Date(record.created_at).toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            li.innerHTML = `
                <span><i class="fas fa-glass-water"></i> ${record.amount} ml</span>
                <span class="time">${time}</span>
            `;
            list.appendChild(li);
        });
    }
}

function setLoadingState(button, isLoading, text = '') {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        if (text) {
            button.dataset.originalText = button.textContent;
            button.textContent = text;
        }
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}
