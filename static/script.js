// ============================================
// PERSIAN DATE HELPERS
// ============================================

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

function getCurrentPersianDay() {
    const now = new Date();
    return now.getDate();
}

function getPersianMonthName(num) {
    const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return months[num - 1] || '';
}

function populateYearDropdown(selectId, startYear) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentYear = startYear || getCurrentPersianYear();
    select.innerHTML = '';
    for (let year = currentYear; year <= currentYear + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        select.appendChild(option);
    }
}

function populateDayDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    for (let day = 1; day <= 31; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day;
        select.appendChild(option);
    }
    const currentDay = getCurrentPersianDay();
    if (currentDay <= 31) select.value = currentDay;
}

function populateMonthDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentMonth = getCurrentPersianMonth();
    if (select) select.value = currentMonth;
}

function initPersianDatePickers() {
    populateYearDropdown('newBillYear');
    populateMonthDropdown('newBillMonth');
    populateYearDropdown('paymentYear', 1400);
    populateDayDropdown('paymentDay');
    populateMonthDropdown('paymentMonth');
}

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

// Clean phone number (remove leading zero) - for login/register only
function cleanPhoneNumberLogin(input) {
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

// Clean phone number for dashboard forms
function cleanPhoneNumberDashboard(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.startsWith('0')) val = val.substring(1);
    if (val.length > 10) val = val.substring(0, 10);
    input.value = val;
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
    if (tabId === 'attendance') {
        loadMyAttendance();
        loadAllAttendance();
        if (document.getElementById('editAttendanceUser')) loadEditAttendanceUsers();
    }
    if (tabId === 'housemates') {
        loadHousemates();
        if (document.getElementById('pendingUsersList')) loadPendingUsers();
    }
    if (tabId === 'payments') {
        loadPaymentHistory();
        if (document.getElementById('pendingPaymentsList')) loadPendingPayments();
        if (document.getElementById('paymentHistoryUser')) loadPaymentHistoryUsers();
    }
    if (tabId === 'debt') loadAllDebt();
    if (tabId === 'receipts') {
        loadReceiptStatus();
        loadMyReceipts();
    }
}

// ============================================
// BILLS TAB
// ============================================
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
            populateYearDropdown('newBillYear');
            populateMonthDropdown('newBillMonth');

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

// ============================================
// ATTENDANCE TAB
// ============================================
async function loadMyAttendance() {
    const container = document.getElementById('myAttendanceList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        // Fetch attendance for current user
        const attResponse = await fetch('/api/attendance');
        const attendanceData = await attResponse.json();

        // Fetch all bills to get available months
        const billsResponse = await fetch('/api/bills');
        const bills = await billsResponse.json();
        
        // Get unique months from bills
        const availableMonths = [...new Set(bills.map(b => b.month))].sort().reverse();

        // Populate month selectors
        const monthSelect = document.getElementById('attendanceMonthSelect');
        if (monthSelect) {
            monthSelect.innerHTML = '';
            for (const month of availableMonths) {
                const [year, monthNum] = month.split('-');
                const persianYear = parseInt(year) - 621;
                const persianMonthName = getPersianMonthName(parseInt(monthNum));
                const displayText = `${persianMonthName} ${persianYear}`;
                const option = document.createElement('option');
                option.value = month;
                option.textContent = displayText;
                if (month === availableMonths[0]) option.selected = true;
                monthSelect.appendChild(option);
            }
            // Set days input if attendance exists for the selected month
            const daysInput = document.getElementById('attendanceDays');
            if (daysInput && attendanceData.length > 0 && availableMonths.length > 0) {
                const currentMonth = availableMonths[0];
                const existing = attendanceData.find(m => m.month === currentMonth);
                daysInput.value = existing ? existing.days_present : '';
            }
        }

        // Populate all attendance month selector
        const allMonthSelect = document.getElementById('allAttendanceMonthSelect');
        if (allMonthSelect) {
            allMonthSelect.innerHTML = '';
            for (const month of availableMonths) {
                const [year, monthNum] = month.split('-');
                const persianYear = parseInt(year) - 621;
                const persianMonthName = getPersianMonthName(parseInt(monthNum));
                const displayText = `${persianMonthName} ${persianYear}`;
                const option = document.createElement('option');
                option.value = month;
                option.textContent = displayText;
                if (month === availableMonths[0]) option.selected = true;
                allMonthSelect.appendChild(option);
            }
            loadAllAttendance();
        }

        // Populate edit attendance month dropdown
        const editMonthSelect = document.getElementById('editAttendanceMonth');
        if (editMonthSelect) {
            editMonthSelect.innerHTML = '';
            for (const month of availableMonths) {
                const [year, monthNum] = month.split('-');
                const persianYear = parseInt(year) - 621;
                const persianMonthName = getPersianMonthName(parseInt(monthNum));
                const displayText = `${persianMonthName} ${persianYear}`;
                const option = document.createElement('option');
                option.value = month;
                option.textContent = displayText;
                if (month === availableMonths[0]) option.selected = true;
                editMonthSelect.appendChild(option);
            }
        }

        // Display user's attendance history
        if (!attendanceData || attendanceData.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ اطلاعات حضوری ثبت نشده است</p>';
            return;
        }

        let html = '<div class="table-responsive"><table><thead><tr>';
        html += '<th>ماه</th><th>روزهای حضور</th>';
        html += '</tr></thead><tbody>';

        for (const item of attendanceData) {
            const [year, monthNum] = item.month.split('-');
            const persianYear = parseInt(year) - 621;
            const persianMonthName = getPersianMonthName(parseInt(monthNum));
            html += `<tr>
                <td>${persianMonthName} ${persianYear}</td>
                <td>${item.days_present || 0} روز</td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading attendance:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری حضور</p>';
    }
}

async function loadAllAttendance() {
    const container = document.getElementById('allAttendanceList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    const monthSelect = document.getElementById('allAttendanceMonthSelect');
    const month = monthSelect ? monthSelect.value : '';

    try {
        const response = await fetch(`/api/attendance/all?month=${month}`);
        const data = await response.json();

        if (!data.attendance || data.attendance.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ اطلاعات حضوری برای این ماه وجود ندارد</p>';
            return;
        }

        let html = `<h4>${data.month ? getPersianMonthName(parseInt(data.month.split('-')[1])) + ' ' + (parseInt(data.month.split('-')[0]) - 621) : ''}</h4>`;
        html += '<div class="table-responsive"><table><thead><tr>';
        html += '<th>نام</th><th>متراژ</th><th>روزهای حضور</th>';
        html += '</tr></thead><tbody>';

        for (const person of data.attendance) {
            const roleIcon = person.is_house_manager ? '👑' : (person.is_housemate_manager ? '👑' : '');
            html += `<tr>
                <td>${person.full_name} ${roleIcon}</td>
                <td>${person.room_area || 0} متر</td>
                <td>${person.days_present || 0} روز</td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading all attendance:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری حضور</p>';
    }
}

async function saveAttendance() {
    const monthSelect = document.getElementById('attendanceMonthSelect');
    const daysInput = document.getElementById('attendanceDays');
    const msgDiv = document.getElementById('attendanceMessage');

    if (!monthSelect || !daysInput || !msgDiv) return;

    const month = monthSelect.value;
    const days = parseInt(daysInput.value);

    msgDiv.style.display = 'none';
    msgDiv.className = 'message';

    if (!month) {
        msgDiv.textContent = 'لطفاً ماه را انتخاب کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    if (!days || days < 0 || days > 31) {
        msgDiv.textContent = 'لطفاً تعداد روزهای حضور را بین ۰ تا ۳۱ وارد کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, days_present: days })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msgDiv.textContent = '✅ حضور با موفقیت ثبت شد';
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';
            loadMyAttendance();
            loadAllAttendance();
            setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
        } else {
            msgDiv.textContent = data.error || 'خطا در ثبت حضور';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

async function loadEditAttendanceUsers() {
    const userSelect = document.getElementById('editAttendanceUser');
    if (!userSelect) return;

    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        userSelect.innerHTML = '';
        for (const user of users) {
            // Skip house managers (no share) and current user
            if (user.is_house_manager) continue;
            if (user.id == window.currentUserId) continue;
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name;
            userSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading users for edit:', error);
    }
}

async function editAttendance() {
    const userSelect = document.getElementById('editAttendanceUser');
    const monthSelect = document.getElementById('editAttendanceMonth');
    const daysInput = document.getElementById('editAttendanceDays');
    const msgDiv = document.getElementById('editAttendanceMessage');

    if (!userSelect || !monthSelect || !daysInput || !msgDiv) return;

    const userId = userSelect.value;
    const month = monthSelect.value;
    const days = parseInt(daysInput.value);

    msgDiv.style.display = 'none';
    msgDiv.className = 'message';

    if (!userId || !month) {
        msgDiv.textContent = 'لطفاً کاربر و ماه را انتخاب کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    if (!days || days < 0 || days > 31) {
        msgDiv.textContent = 'لطفاً تعداد روزهای حضور را بین ۰ تا ۳۱ وارد کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`/api/admin/attendance/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, start_date: null, end_date: null, days_present: days })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msgDiv.textContent = '✅ حضور با موفقیت ویرایش شد';
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';
            loadAllAttendance();
            setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
        } else {
            msgDiv.textContent = data.error || 'خطا در ویرایش حضور';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error editing attendance:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

// ============================================
// HOUSEMATES TAB
// ============================================
async function loadHousemates() {
    const container = document.getElementById('housematesList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        if (!users || users.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ همخانه‌ای ثبت نشده است</p>';
            return;
        }

        let html = '<div class="table-responsive"><table><thead><tr>';
        html += '<th>نام</th><th>نام کاربری</th><th>متراژ</th><th>نقش</th><th>وضعیت</th>';
        html += '</tr></thead><tbody>';

        for (const user of users) {
            let role = '👤 مستاجر';
            if (user.is_admin) role = '⭐ ادمین';
            else if (user.is_house_manager) role = '👑 مدیر خانه';
            else if (user.is_housemate_manager) role = '👑 مستاجر + مدیر';
            
            let status = '✅ تأیید شده';
            if (user.is_approved === 0) status = '⏳ در انتظار تأیید';

            html += `<tr>
                <td>${user.full_name}</td>
                <td>${user.username}</td>
                <td>${user.room_area || 0} متر</td>
                <td>${role}</td>
                <td>${status}</td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading housemates:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری همخانه‌ها</p>';
    }
}

async function loadPendingUsers() {
    const container = document.getElementById('pendingUsersList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        const response = await fetch('/api/users/pending');
        const users = await response.json();

        if (!users || users.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ درخواست عضویت جدیدی وجود ندارد</p>';
            return;
        }

        let html = '<div class="table-responsive"><table><thead><tr>';
        html += '<th>نام</th><th>نام کاربری</th><th>شماره موبایل</th><th>عملیات</th>';
        html += '</tr></thead><tbody>';

        for (const user of users) {
            html += `<tr>
                <td>${user.full_name}</td>
                <td>${user.username}</td>
                <td>${user.phone_number || '-'}</td>
                <td>
                    <button class="success small" onclick="approveUser(${user.id})">✓ تأیید</button>
                    <button class="danger small" onclick="rejectUser(${user.id})">✗ رد</button>
                </td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading pending users:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری درخواست‌ها</p>';
    }
}

async function approveUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/approve`, {
            method: 'POST'
        });
        if (response.ok) {
            loadPendingUsers();
            loadHousemates();
            showNotification('کاربر با موفقیت تأیید شد');
        } else {
            alert('خطا در تأیید کاربر');
        }
    } catch (error) {
        console.error('Error approving user:', error);
        alert('خطا در ارتباط با سرور');
    }
}

async function rejectUser(userId) {
    if (!confirm('آیا از رد این کاربر مطمئن هستید؟')) return;
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            loadPendingUsers();
            loadHousemates();
            showNotification('کاربر رد شد');
        } else {
            alert('خطا در رد کاربر');
        }
    } catch (error) {
        console.error('Error rejecting user:', error);
        alert('خطا در ارتباط با سرور');
    }
}

async function addHousemate() {
    const username = document.getElementById('newUserUsername').value.trim();
    const full_name = document.getElementById('newUserFullName').value.trim();
    const phone = document.getElementById('newUserPhone').value.trim();
    const room_area = parseFloat(document.getElementById('newUserArea').value);
    const msgDiv = document.getElementById('addUserMessage');

    if (!msgDiv) return;
    msgDiv.style.display = 'none';
    msgDiv.className = 'message';

    if (!username || !full_name || !phone || !room_area) {
        msgDiv.textContent = 'لطفاً همه فیلدهای الزامی را پر کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    if (phone.length !== 10) {
        msgDiv.textContent = 'شماره موبایل باید ۱۰ رقم باشد';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, full_name, phone_number: phone, room_area, password: '1234' })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msgDiv.textContent = '✅ همخانه با موفقیت اضافه شد';
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';
            document.getElementById('newUserUsername').value = '';
            document.getElementById('newUserFullName').value = '';
            document.getElementById('newUserPhone').value = '';
            document.getElementById('newUserArea').value = '';
            loadHousemates();
            setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
        } else {
            msgDiv.textContent = data.error || 'خطا در اضافه کردن همخانه';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error adding housemate:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

// ============================================
// PAYMENTS TAB
// ============================================

async function loadPaymentHistoryUsers() {
    const userSelect = document.getElementById('paymentHistoryUser');
    if (!userSelect) return;

    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        userSelect.innerHTML = '';
        
        // Add "All Users" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'همه کاربران';
        userSelect.appendChild(allOption);
        
        for (const user of users) {
            // Skip house managers (no share)
            if (user.is_house_manager) continue;
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name;
            userSelect.appendChild(option);
        }
        
        // Load history for first user or all
        loadPaymentHistory();
    } catch (error) {
        console.error('Error loading payment history users:', error);
    }
}

async function loadPaymentHistory() {
    const container = document.getElementById('paymentHistoryList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        let userId = null;
        const userSelect = document.getElementById('paymentHistoryUser');
        
        // If user selector exists (manager view), get selected user
        if (userSelect) {
            userId = userSelect.value;
        }
        
        // Build URL with optional user_id parameter
        let url = '/api/payments/my';
        if (userId && userId !== 'all') {
            url = `/api/payments/user/${userId}`;
        }
        
        const response = await fetch(url);
        const payments = await response.json();

        if (!payments || payments.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ پرداختی ثبت نشده است</p>';
            return;
        }

        let html = '<div class="table-responsive"><table><thead><tr>';
        html += '<th>کاربر</th><th>مبلغ</th><th>تاریخ</th><th>شماره تراکنش</th><th>وضعیت</th>';
        html += '</tr></thead><tbody>';

        for (const payment of payments) {
            const statusMap = {
                'pending': '⏳ در انتظار تأیید',
                'verified': '✅ تأیید شده',
                'rejected': '❌ رد شده'
            };
            const statusClass = payment.verification_status;
            html += `<tr>
                <td>${payment.user_name || payment.full_name || 'کاربر'}</td>
                <td>${Number(payment.amount_paid).toLocaleString()} تومان</td>
                <td>${payment.payment_date || '-'}</td>
                <td>${payment.transaction_id || '-'}</td>
                <td><span class="status-badge status-${statusClass}">${statusMap[payment.verification_status] || payment.verification_status}</span></td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading payment history:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری تاریخچه پرداخت</p>';
    }
}

async function registerPayment() {
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const day = document.getElementById('paymentDay').value;
    const month = document.getElementById('paymentMonth').value;
    const year = document.getElementById('paymentYear').value;
    const transaction_id = document.getElementById('paymentTransaction').value.trim();
    const notes = document.getElementById('paymentNotes').value.trim();
    const msgDiv = document.getElementById('paymentMessage');

    if (!msgDiv) return;
    msgDiv.style.display = 'none';
    msgDiv.className = 'message';

    if (!amount || amount <= 0) {
        msgDiv.textContent = 'لطفاً مبلغ معتبر وارد کنید';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
        return;
    }

    const gregorianYear = parseInt(year) + 621;
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const payment_date = `${gregorianYear}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    try {
        const response = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount_paid: amount,
                payment_date: payment_date,
                transaction_id: transaction_id || '',
                notes: notes || ''
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msgDiv.textContent = '✅ پرداخت با موفقیت ثبت شد و منتظر تأیید مدیر است';
            msgDiv.className = 'message success';
            msgDiv.style.display = 'block';
            document.getElementById('paymentAmount').value = '';
            document.getElementById('paymentTransaction').value = '';
            document.getElementById('paymentNotes').value = '';
            loadPaymentHistory();
            if (document.getElementById('pendingPaymentsList')) loadPendingPayments();
            loadDebtSummary();
            setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
        } else {
            msgDiv.textContent = data.error || 'خطا در ثبت پرداخت';
            msgDiv.className = 'message error';
            msgDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error registering payment:', error);
        msgDiv.textContent = 'خطا در ارتباط با سرور';
        msgDiv.className = 'message error';
        msgDiv.style.display = 'block';
    }
}

async function loadPendingPayments() {
    const container = document.getElementById('pendingPaymentsList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        const response = await fetch('/api/payments/pending');
        const payments = await response.json();

        if (!payments || payments.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ پرداخت منتظر تأییدی وجود ندارد</p>';
            return;
        }

        let html = '<div class="table-responsive"><table><thead><tr>';
        html += '<th>کاربر</th><th>مبلغ</th><th>تاریخ</th><th>شماره تراکنش</th><th>عملیات</th>';
        html += '</tr></thead><tbody>';

        for (const payment of payments) {
            html += `<tr>
                <td>${payment.full_name}</td>
                <td>${Number(payment.amount_paid).toLocaleString()} تومان</td>
                <td>${payment.payment_date || '-'}</td>
                <td>${payment.transaction_id || '-'}</td>
                <td>
                    <button class="success small" onclick="verifyPayment(${payment.id}, 'verify')">✓ تأیید</button>
                    <button class="danger small" onclick="verifyPayment(${payment.id}, 'reject')">✗ رد</button>
                </td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading pending payments:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری پرداخت‌ها</p>';
    }
}

async function verifyPayment(paymentId, action) {
    try {
        const response = await fetch(`/api/payments/${paymentId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });

        if (response.ok) {
            loadPendingPayments();
            loadPaymentHistory();
            loadDebtSummary();
            showNotification(action === 'verify' ? 'پرداخت تأیید شد' : 'پرداخت رد شد');
        } else {
            alert('خطا در تأیید/رد پرداخت');
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        alert('خطا در ارتباط با سرور');
    }
}

// ============================================
// DEBT TAB
// ============================================
async function loadAllDebt() {
    const container = document.getElementById('allDebtList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        const response = await fetch('/api/debt/all');
        const debts = await response.json();

        if (!debts || debts.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ اطلاعات بدهی وجود ندارد</p>';
            return;
        }

        let html = '<div class="table-responsive"><table><thead><tr>';
        html += '<th>نام</th><th>بدهی کل</th><th>پرداخت شده</th><th>مانده</th><th>وضعیت</th>';
        html += '</tr></thead><tbody>';

        for (const debt of debts) {
            if (debt.is_house_manager) continue;
            const statusClass = debt.balance <= 0 ? 'verified' : 'pending';
            const statusText = debt.balance <= 0 ? '✅ تسویه' : '⚠️ بدهکار';
            html += `<tr>
                <td>${debt.full_name}</td>
                <td>${Number(debt.total_owed || 0).toLocaleString()} تومان</td>
                <td>${Number(debt.verified_paid || 0).toLocaleString()} تومان</td>
                <td><strong>${Number(debt.balance || 0).toLocaleString()} تومان</strong></td>
                <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading all debt:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری اطلاعات بدهی</p>';
    }
}

// ============================================
// LOAD DEBT SUMMARY
// ============================================
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

// ============================================
// RECEIPTS TAB
// ============================================

let currentReceiptStatus = null;

async function loadReceiptStatus() {
    const container = document.getElementById('receiptStatus');
    const actionsDiv = document.getElementById('receiptActions');
    const resultDiv = document.getElementById('receiptResult');
    
    if (!container) return;
    container.innerHTML = 'در حال بررسی وضعیت تسویه...';

    try {
        const response = await fetch('/api/receipt/status');
        const data = await response.json();
        currentReceiptStatus = data;

        actionsDiv.style.display = 'block';
        const statusMsg = document.getElementById('receiptStatusMessage');
        const generateBtn = document.getElementById('generateReceiptBtn');

        // Build status display based on simple overall logic
        let statusHtml = '';
        
        const fullyPaidText = data.fully_paid_until ? 
            `آخرین ماه دارای قبض: ${data.fully_paid_until.persian_month} ${data.fully_paid_until.persian_year}` :
            'هیچ ماهی';

        if (data.net_balance >= 0) {
            const statusText = data.net_balance > 0 ? 
                `💰 بستانکار: ${Number(data.net_balance).toLocaleString()} تومان` :
                '✅ تسویه کامل';
            
            statusHtml = `
                <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                    <div style="flex: 1; min-width: 250px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">وضعیت تسویه</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: var(--success);">
                            ✅ تسویه کامل
                        </div>
                        <div style="font-size: 14px; margin-top: 5px; color: var(--text-secondary);">
                            ${statusText}
                        </div>
                        <div style="font-size: 13px; margin-top: 8px; color: var(--text-muted);">
                            📅 ${fullyPaidText}
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">مجموع سهم از ابتدا</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px;">
                            ${Number(data.cumulative_share || 0).toLocaleString()} تومان
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">مجموع پرداخت از ابتدا</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: var(--success);">
                            ${Number(data.cumulative_paid || 0).toLocaleString()} تومان
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">مانده کلی</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: var(--success);">
                            ${Number(data.net_balance || 0).toLocaleString()} تومان
                            ${data.net_balance > 0 ? ' (بستانکار)' : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            statusHtml = `
                <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                    <div style="flex: 1; min-width: 250px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">وضعیت تسویه</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: var(--danger);">
                            ❌ بدهکار
                        </div>
                        <div style="font-size: 14px; margin-top: 5px; color: var(--text-secondary);">
                            بدهی: ${Number(Math.abs(data.net_balance || 0)).toLocaleString()} تومان
                        </div>
                        <div style="font-size: 13px; margin-top: 8px; color: var(--text-muted);">
                            📅 ${fullyPaidText}
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">مجموع سهم از ابتدا</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px;">
                            ${Number(data.cumulative_share || 0).toLocaleString()} تومان
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">مجموع پرداخت از ابتدا</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: var(--warning);">
                            ${Number(data.cumulative_paid || 0).toLocaleString()} تومان
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Show current month bills if they exist
        let billsHtml = '';
        if (data.current_month && data.current_month.bills && data.current_month.bills.length > 0) {
            billsHtml = `<div class="table-responsive"><table class="receipt-bills-table">
                <thead><tr>
                    <th>نوع قبض</th>
                    <th>مبلغ کل</th>
                    <th>روش تقسیم</th>
                    <th>سهم شما</th>
                </tr></thead><tbody>`;
            for (const bill of data.current_month.bills) {
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
                    'combined': 'متراژ × حضور'
                };
                billsHtml += `<tr>
                    <td>${typeMap[bill.utility_type] || bill.utility_type}</td>
                    <td>${Number(bill.total_amount).toLocaleString()} تومان</td>
                    <td>${methodMap[bill.division_method] || bill.division_method}</td>
                    <td><strong>${Number(bill.user_share).toLocaleString()} تومان</strong></td>
                </tr>`;
            }
            billsHtml += '</tbody></table></div>';
        }
        
        const currentMonthName = data.current_month ? `${data.current_month.persian_month} ${data.current_month.persian_year}` : '-';
        
        container.innerHTML = `
            ${statusHtml}
            
            <div style="margin-top: 20px;">
                <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">ماه جاری</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px;">${currentMonthName}</div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">سهم شما در ماه جاری</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px;">
                            ${Number(data.current_month?.total_share || 0).toLocaleString()} تومان
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">پرداخت شده در ماه جاری</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: var(--success);">
                            ${Number(data.current_month?.verified_paid || 0).toLocaleString()} تومان
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: var(--bg-primary); border-radius: 12px; padding: 18px 20px;">
                        <div style="font-size: 13px; color: var(--text-muted);">مانده ماه جاری</div>
                        <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: ${data.current_month?.balance > 0 ? 'var(--danger)' : 'var(--success)'};">
                            ${Number(data.current_month?.balance || 0).toLocaleString()} تومان
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h4 style="margin-bottom: 10px;">📋 قبض‌های ماه جاری</h4>
                    ${billsHtml || '<p style="color: var(--text-muted);">هیچ قبضی برای ماه جاری وجود ندارد</p>'}
                </div>
            </div>
        `;

        // Update button state
        if (data.can_generate) {
            if (data.net_balance > 0) {
                statusMsg.innerHTML = `💰 شما بستانکار هستید (${Number(data.net_balance).toLocaleString()} تومان). می‌توانید رسید دریافت کنید.`;
                statusMsg.style.color = 'var(--success)';
            } else {
                statusMsg.innerHTML = '✅ شما تسویه کامل هستید. می‌توانید رسید دریافت کنید.';
                statusMsg.style.color = 'var(--success)';
            }
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
            generateBtn.textContent = data.net_balance > 0 ? '📄 دریافت رسید بستانکاری' : '📄 دریافت رسید تسویه کامل';
        } else {
            statusMsg.innerHTML = `⚠️ شما بدهکار هستید (${Number(Math.abs(data.net_balance || 0)).toLocaleString()} تومان). ابتدا بدهی خود را تسویه کنید.`;
            statusMsg.style.color = 'var(--danger)';
            generateBtn.disabled = true;
            generateBtn.style.opacity = '0.5';
            generateBtn.textContent = '📄 دریافت رسید (غیرفعال)';
        }
        
        resultDiv.style.display = 'none';

    } catch (error) {
        console.error('Error loading receipt status:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری وضعیت تسویه</p>';
        actionsDiv.style.display = 'none';
    }
}

async function generateReceipt() {
    const resultDiv = document.getElementById('receiptResult');
    const generateBtn = document.getElementById('generateReceiptBtn');
    
    resultDiv.style.display = 'none';
    generateBtn.textContent = 'در حال صدور...';
    generateBtn.disabled = true;

    try {
        const response = await fetch('/api/receipt/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (response.ok && data.success) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = data.receipt_html || '<p>رسید صادر شد</p>';
            
            // Reload receipts list
            loadMyReceipts();
            showNotification('✅ رسید با موفقیت صادر شد', 'success');
        } else {
            showNotification(data.error || 'خطا در صدور رسید', 'error');
        }
    } catch (error) {
        console.error('Error generating receipt:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    } finally {
        generateBtn.textContent = '📄 دریافت رسید';
        generateBtn.disabled = false;
    }
}

function printReceipt() {
    const receiptContent = document.getElementById('receiptResult');
    if (!receiptContent) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>رسید پرداخت</title>
            <style>
                body {
                    font-family: 'Shabnam', 'Tahoma', sans-serif;
                    direction: rtl;
                    padding: 40px;
                    background: white;
                }
                .receipt-container {
                    max-width: 700px;
                    margin: 0 auto;
                }
                .receipt-inner {
                    padding: 20px;
                }
                ${document.querySelector('style').innerHTML}
            </style>
        </head>
        <body>
            ${receiptContent.innerHTML}
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 30px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                    🖨️ چاپ رسید
                </button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

async function loadMyReceipts() {
    const container = document.getElementById('receiptsList');
    if (!container) return;
    container.innerHTML = 'در حال بارگذاری...';

    try {
        const response = await fetch('/api/receipts/my');
        const receipts = await response.json();

        if (!receipts || receipts.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">هیچ رسیدی صادر نشده است</p>';
            return;
        }

        let html = '<div class="table-responsive"><table><thead><tr>';
        html += '<th>ماه</th><th>شماره رسید</th><th>مبلغ کل</th><th>تاریخ صدور</th>';
        html += '</tr></thead><tbody>';

        for (const receipt of receipts) {
            // Parse month if it's not already displayed
            let monthDisplay = receipt.month;
            if (receipt.month && receipt.month !== 'all') {
                const [year, monthNum] = receipt.month.split('-');
                const persianYear = parseInt(year) - 621;
                const persianMonthName = getPersianMonthName(parseInt(monthNum));
                monthDisplay = `${persianMonthName} ${persianYear}`;
            } else if (receipt.month === 'all') {
                monthDisplay = 'همه ماه‌ها';
            }
            
            html += `<tr>
                <td>${monthDisplay}</td>
                <td style="direction: ltr; font-family: monospace; font-size: 12px;">${receipt.receipt_number}</td>
                <td>${Number(receipt.total_paid).toLocaleString()} تومان</td>
                <td>${receipt.issued_date}</td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading receipts:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px 0;">خطا در بارگذاری رسیدها</p>';
    }
}

// ============================================
// NOTIFICATIONS HELPER
// ============================================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        font-family: 'Shabnam', sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
}

// ============================================
// DARK MODE TOGGLE
// ============================================
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

// ============================================
// LOAD DARK MODE PREFERENCE
// ============================================
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = '☀️';
}

// ============================================
// ENTER KEY SUPPORT FOR LOGIN & INITIALIZE
// ============================================
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
        // Store current user ID for edit attendance
        fetch('/api/users/current')
            .then(res => res.json())
            .then(data => {
                window.currentUserId = data.id;
            })
            .catch(err => console.error('Error getting current user:', err));
        
        initPersianDatePickers();
        loadDebtSummary();
        loadBills();
        loadMyAttendance();
        loadAllAttendance();
        loadHousemates();
        if (document.getElementById('pendingUsersList')) loadPendingUsers();
        loadPaymentHistory();
        if (document.getElementById('pendingPaymentsList')) loadPendingPayments();
        loadAllDebt();
        if (document.getElementById('editAttendanceUser')) {
            // Small delay to ensure currentUserId is set
            setTimeout(loadEditAttendanceUsers, 200);
        }
        if (document.getElementById('paymentHistoryUser')) {
            loadPaymentHistoryUsers();
        }
        loadReceiptStatus();
        loadMyReceipts();
    }
});