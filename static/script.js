// ============================================
// LOGIN PAGE FUNCTIONS
// ============================================

// Switch between login and register tabs
function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const tabs = document.querySelectorAll('.login-tab');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
    
    const loginMsg = document.getElementById('loginMessage');
    const regMsg = document.getElementById('registerMessage');
    if (loginMsg) loginMsg.style.display = 'none';
    if (regMsg) regMsg.style.display = 'none';
}

// Clean phone number (remove leading zero)
function cleanPhoneNumber(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.startsWith('0')) val = val.substring(1);
    if (val.length > 10) val = val.substring(0, 10);
    input.value = val;
}

// Quick test login
function quickTest(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    doLogin();
}

// Login function
async function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msgDiv = document.getElementById('loginMessage');
    
    msgDiv.style.display = 'none';
    msgDiv.className = 'message';
    
    if (!username || !password) {
        msgDiv.textContent = 'لطفاً نام کاربری و رمز عبور را وارد کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            msgDiv.textContent = 'ورود موفق! در حال انتقال...';
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';
            
            sessionStorage.setItem('userName', data.full_name);
            sessionStorage.setItem('isAdmin', data.is_admin);
            sessionStorage.setItem('isHouseManager', data.is_house_manager);
            sessionStorage.setItem('isHousemateManager', data.is_housemate_manager);
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 800);
        } else {
            msgDiv.textContent = data.error || 'نام کاربری یا رمز عبور اشتباه است';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

// Register function
async function doRegister() {
    const username = document.getElementById('regUsername').value.trim();
    const full_name = document.getElementById('regFullName').value.trim();
    let phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const house_code = document.getElementById('regHouseCode').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const msgDiv = document.getElementById('registerMessage');
    
    // Get selected role
    const roleRadios = document.querySelectorAll('input[name="role"]');
    let role = 'regular';
    for (const radio of roleRadios) {
        if (radio.checked) {
            role = radio.value;
            break;
        }
    }
    
    msgDiv.style.display = 'none';
    msgDiv.className = 'message';
    
    // Validations
    if (!username) { showRegError('لطفاً نام کاربری را وارد کنید'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { showRegError('نام کاربری باید فقط شامل حروف انگلیسی و اعداد باشد'); return; }
    if (!full_name) { showRegError('لطفاً نام کامل خود را وارد کنید'); return; }
    if (!phone) { showRegError('لطفاً شماره موبایل را وارد کنید'); return; }
    if (phone.length !== 10) { showRegError('شماره موبایل باید ۱۰ رقم باشد'); return; }
    if (!password || password.length < 4) { showRegError('رمز عبور باید حداقل ۴ کاراکتر باشد'); return; }
    if (password !== passwordConfirm) { showRegError('رمز عبور و تکرار آن مطابقت ندارند'); return; }
    
    function showRegError(msg) {
        msgDiv.textContent = msg;
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                full_name,
                email,
                phone_number: phone,
                house_code,
                role,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            let roleMsg = '';
            if (data.is_house_manager) roleMsg = 'شما به عنوان مدیر خانه ثبت‌نام شدید';
            else if (data.is_housemate_manager) roleMsg = 'شما به عنوان مستاجر + مدیر خانه ثبت‌نام شدید';
            else roleMsg = 'ثبت‌نام شما با موفقیت انجام شد';
            
            if (data.house_code) {
                roleMsg += ` | کد خانه: ${data.house_code}`;
            }
            if (!data.is_approved) {
                roleMsg += ' | درخواست شما منتظر تأیید مدیر است';
            }
            
            msgDiv.textContent = roleMsg;
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';
            
            // Clear form
            document.getElementById('regUsername').value = '';
            document.getElementById('regFullName').value = '';
            document.getElementById('regPhone').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regHouseCode').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regPasswordConfirm').value = '';
            
            setTimeout(() => {
                switchAuthTab('login');
                document.getElementById('loginUsername').value = username;
            }, 2000);
        } else {
            msgDiv.textContent = data.error || 'خطا در ثبت‌نام';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Register error:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

// ============================================
// FORGOT PASSWORD FUNCTIONS
// ============================================

let forgotPhoneNumber = '';

function showForgotPassword() {
    document.getElementById('forgotModal').classList.add('active');
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'none';
    document.getElementById('forgotMessage').style.display = 'none';
    document.getElementById('forgotPhone').value = '';
    document.getElementById('forgotCode').value = '';
}

function closeForgotModal() {
    document.getElementById('forgotModal').classList.remove('active');
}

async function sendResetCode() {
    const phone = document.getElementById('forgotPhone').value.trim();
    const msgDiv = document.getElementById('forgotMessage');
    msgDiv.style.display = 'none';
    
    if (!phone || phone.length !== 10) {
        msgDiv.textContent = 'لطفاً شماره موبایل ۱۰ رقمی خود را وارد کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }
    
    forgotPhoneNumber = phone;
    
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    msgDiv.textContent = 'کد تأیید به شماره شما ارسال شد (کد تست: 12345)';
    msgDiv.className = 'message success';
    msgDiv.style.display = 'block';
}

async function verifyResetCode() {
    const code = document.getElementById('forgotCode').value.trim();
    const msgDiv = document.getElementById('forgotMessage');
    msgDiv.style.display = 'none';
    
    if (!code || code.length !== 5) {
        msgDiv.textContent = 'لطفاً کد ۵ رقمی را وارد کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }
    
    if (code === '12345') {
        document.getElementById('forgotStep2').style.display = 'none';
        document.getElementById('forgotStep3').style.display = 'block';
        msgDiv.textContent = 'کد تأیید شد. لطفاً رمز عبور جدید را وارد کنید';
        msgDiv.className = 'message success';
        msgDiv.style.display = 'block';
    } else {
        msgDiv.textContent = 'کد تأیید نامعتبر است (کد تست: 12345)';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

async function resetPassword() {
    const password = document.getElementById('newPassword').value;
    const passwordConfirm = document.getElementById('newPasswordConfirm').value;
    const msgDiv = document.getElementById('forgotMessage');
    msgDiv.style.display = 'none';
    
    if (!password || password.length < 4) {
        msgDiv.textContent = 'رمز عبور باید حداقل ۴ کاراکتر باشد';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }
    
    if (password !== passwordConfirm) {
        msgDiv.textContent = 'رمز عبور و تکرار آن مطابقت ندارند';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone_number: forgotPhoneNumber,
                new_password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            msgDiv.textContent = 'رمز عبور با موفقیت تغییر کرد! در حال انتقال به صفحه ورود...';
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';
            
            setTimeout(() => {
                closeForgotModal();
                document.getElementById('loginUsername').value = data.username || '';
            }, 2000);
        } else {
            msgDiv.textContent = data.error || 'خطا در تغییر رمز عبور';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Reset password error:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

// Persian date helpers
function getCurrentPersianYear() {
    const now = new Date();
    return now.getFullYear() - 621;
}

function getCurrentPersianMonth() {
    const now = new Date();
    const gregorianMonth = now.getMonth() + 1;
    const persianMonth = ((gregorianMonth + 8) % 12) + 1;
    return persianMonth;
}

function getPersianMonthName(num) {
    const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return months[num - 1] || '';
}

function populateYearDropdown() {
    const yearSelect = document.getElementById('newBillYear');
    if (!yearSelect) return;

    yearSelect.innerHTML = '';
    const year = 1405;
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    option.selected = true;
    yearSelect.appendChild(option);
}

function populateMonthDropdown() {
    const monthSelect = document.getElementById('newBillMonth');
    if (!monthSelect) return;

    const currentMonth = getCurrentPersianMonth();
    monthSelect.value = currentMonth;
}

function initPersianDatePickers() {
    populateYearDropdown();
    populateMonthDropdown();
}

// Dashboard tab switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.panel').forEach(panel => {
        if (panel.id === 'panel-' + tabId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    if (tabId === 'bills') loadBills();
}

// Load bills
async function loadBills() {
    const container = document.getElementById('billsList');
    const filterSelect = document.getElementById('billMonthFilter');
    
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        const response = await fetch('/api/bills');
        const bills = await response.json();

        if (filterSelect) {
            const months = [...new Set(bills.map(b => b.month))].sort().reverse();
            const currentFilter = filterSelect.value;
            filterSelect.innerHTML = '<option value="all">کل دوره</option>';
            for (const month of months) {
                const [year, monthNum] = month.split('-');
                const persianYear = parseInt(year) - 621;
                const persianMonthName = getPersianMonthName(parseInt(monthNum));
                const displayText = `${persianMonthName} ${persianYear}`;
                filterSelect.innerHTML += `<option value="${month}" ${month === currentFilter ? 'selected' : ''}>${displayText}</option>`;
            }
        }

        if (!bills || bills.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 30px 0;">هیچ قبضی ثبت نشده است</p>';
            return;
        }

        const currentFilter = filterSelect ? filterSelect.value : 'all';
        const filteredBills = currentFilter === 'all' ? bills : bills.filter(b => b.month === currentFilter);

        if (filteredBills.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 30px 0;">هیچ قبضی برای این دوره وجود ندارد</p>';
            return;
        }

        let html = '<div class="table-responsive"><table class="bills-table">';
        html += '<thead><tr>';
        html += '<th>نوع قبض</th><th>ماه</th><th>مبلغ کل</th><th>روش تقسیم</th><th>سهم شما</th>';
        html += '</tr></thead><tbody>';

        const typeMap = {
            'rent': '🏠 اجاره',
            'electricity': '🔌 برق',
            'water': '💧 آب',
            'gas': '🔥 گاز',
            'internet': '🌐 اینترنت'
        };
        const methodMap = {
            'equal': 'مساوی',
            'area': 'متراژ',
            'presence': 'حضور',
            'combined': 'ترکیبی'
        };

        for (const bill of filteredBills) {
            const [year, monthNum] = bill.month.split('-');
            const persianYear = parseInt(year) - 621;
            const persianMonthName = getPersianMonthName(parseInt(monthNum));
            
            html += `<tr>
                <td>${typeMap[bill.utility_type] || bill.utility_type}</td>
                <td>${persianMonthName} ${persianYear}</td>
                <td>${Number(bill.total_amount).toLocaleString()} تومان</td>
                <td>${methodMap[bill.division_method] || bill.division_method}</td>
                <td><strong>${Number(bill.user_share || 0).toLocaleString()} تومان</strong></td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading bills:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 30px 0;">خطا در بارگذاری قبوض</p>';
    }
}

// Add bill
async function addBill() {
    const utility_type = document.getElementById('newUtilityType').value;
    const total_amount = parseFloat(document.getElementById('newBillAmount').value);
    const persianYear = document.getElementById('newBillYear').value;
    const persianMonth = document.getElementById('newBillMonth').value;
    const division_method = document.getElementById('newDivisionMethod').value;
    const msgDiv = document.getElementById('addBillMessage');

    if (!msgDiv) return;

    msgDiv.style.display = 'none';
    msgDiv.className = 'message';

    if (!total_amount || total_amount <= 0) {
        msgDiv.textContent = 'لطفاً مبلغ معتبر وارد کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    if (!persianYear || !persianMonth) {
        msgDiv.textContent = 'لطفاً سال و ماه را انتخاب کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    const gregorianYear = parseInt(persianYear) + 621;
    const month = String(persianMonth).padStart(2, '0');
    const gregorianMonth = `${gregorianYear}-${month}`;

    try {
        const response = await fetch('/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                utility_type,
                total_amount,
                month: gregorianMonth,
                division_method
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msgDiv.textContent = '✅ قبض با موفقیت ثبت شد';
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';

            document.getElementById('newBillAmount').value = '';
            populateYearDropdown();
            populateMonthDropdown();

            loadBills();

            setTimeout(() => {
                msgDiv.style.display = 'none';
            }, 3000);
        } else {
            msgDiv.textContent = data.error || 'خطا در ثبت قبض';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error adding bill:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

// Load debt summary
async function loadDebtSummary() {
    try {
        const response = await fetch('/api/debt/my');
        const debt = await response.json();

        const totalDebtEl = document.getElementById('totalDebt');
        const debtDetailEl = document.getElementById('debtDetail');
        const statusDiv = document.getElementById('debtStatus');

        if (totalDebtEl) {
            totalDebtEl.innerHTML = (debt.balance || 0).toLocaleString() + ' تومان';
        }
        if (debtDetailEl) {
            debtDetailEl.innerHTML = `بدهی کل: ${(debt.total_owed || 0).toLocaleString()} | پرداخت شده: ${(debt.verified_paid || 0).toLocaleString()}`;
        }
        if (statusDiv) {
            if (debt.balance <= 0) {
                statusDiv.textContent = '✅ تسویه کامل';
                statusDiv.className = 'debt-status paid';
            } else {
                statusDiv.textContent = `⚠️ بدهکار: ${(debt.balance || 0).toLocaleString()} تومان`;
                statusDiv.className = 'debt-status unpaid';
            }
        }
    } catch (error) {
        console.error('Error loading debt:', error);
    }
}

// Logout
async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
}

// Dark mode toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const btn = document.querySelector('.theme-toggle');
    if (document.body.classList.contains('dark-mode')) {
        if (btn) btn.textContent = '☀️';
        localStorage.setItem('darkMode', 'enabled');
    } else {
        if (btn) btn.textContent = '🌙';
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = '☀️';
}

// Enter key support for login page
document.addEventListener('DOMContentLoaded', function() {
    // Login page enter key
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') doLogin();
        });
    }
    
    const regPasswordConfirm = document.getElementById('regPasswordConfirm');
    if (regPasswordConfirm) {
        regPasswordConfirm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') doRegister();
        });
    }
    
    const forgotCode = document.getElementById('forgotCode');
    if (forgotCode) {
        forgotCode.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') verifyResetCode();
        });
    }
    
    const newPasswordConfirm = document.getElementById('newPasswordConfirm');
    if (newPasswordConfirm) {
        newPasswordConfirm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') resetPassword();
        });
    }

    // Dashboard initialization
    if (document.getElementById('tabsContainer')) {
        loadDebtSummary();
        loadBills();
        initPersianDatePickers();
    }
});