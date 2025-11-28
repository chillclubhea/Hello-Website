// 初始化Supabase
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseKey = 'your-anon-key'
const supabase = supabase.createClient(supabaseUrl, supabaseKey)

// 修改注册函数
async function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const goal = parseInt(document.getElementById('reg-goal').value) || 2000;

    const { data, error } = await supabase.auth.signUp({
        email: user + '@watertracker.com', // Supabase需要email格式
        password: pass
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

    const { data, error } = await supabase.auth.signIn({
        email: userInput + '@watertracker.com',
        password: passInput
    });

    if (error) {
        document.getElementById('login-error').textContent = error.message;
        return;
    }

    currentUser = data.user;
    showApp();
}
