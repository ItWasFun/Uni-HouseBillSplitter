from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3
import hashlib
import random
import string
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

# ============================================
# PERSIAN DATE HELPER FUNCTIONS
# ============================================

def persian_month_number(month_name):
    """Convert Persian month name to number (1-12)"""
    months = {
        'فروردین': 1, 'اردیبهشت': 2, 'خرداد': 3, 'تیر': 4,
        'مرداد': 5, 'شهریور': 6, 'مهر': 7, 'آبان': 8,
        'آذر': 9, 'دی': 10, 'بهمن': 11, 'اسفند': 12
    }
    return months.get(month_name, 1)

def persian_month_name(month_num):
    """Convert month number to Persian name"""
    months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
              'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
    return months[month_num - 1] if 1 <= month_num <= 12 else ''

def persian_to_gregorian(persian_year, persian_month, persian_day):
    """
    Convert Persian date to Gregorian date string (YYYY-MM-DD)
    Simplified version - for demo purposes
    """
    import jdatetime
    try:
        gregorian = jdatetime.date(persian_year, persian_month, persian_day).togregorian()
        return gregorian.strftime('%Y-%m-%d')
    except:
        # Fallback: approximate conversion
        return f"{persian_year + 621}-{str(persian_month).zfill(2)}-{str(persian_day).zfill(2)}"

def gregorian_to_persian(gregorian_date):
    """Convert Gregorian date string to Persian date tuple (year, month_name, day)"""
    import jdatetime
    try:
        date_obj = datetime.strptime(gregorian_date, '%Y-%m-%d')
        persian = jdatetime.date.fromgregorian(date=date_obj)
        return persian.year, persian_month_name(persian.month), persian.day
    except:
        return None, None, None

def get_current_persian_year():
    """Get current Persian year"""
    import jdatetime
    return jdatetime.date.today().year

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect('house_bills.db')
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_house_code():
    """Generate a 7-digit house code like PF52122"""
    letters = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=2))
    numbers = ''.join(random.choices('0123456789', k=5))
    return f"{letters}{numbers}"

def login_required(f):
    """Decorator: user must be logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'لطفا ابتدا وارد شوید'}), 401
        return f(*args, **kwargs)
    return decorated_function

def manager_required(f):
    """Decorator: user must be House Manager or Housemate Manager"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'لطفا ابتدا وارد شوید'}), 401
        if not (session.get('is_house_manager') or session.get('is_housemate_manager')):
            return jsonify({'error': 'این بخش فقط برای مدیر خانه قابل دسترسی است'}), 403
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator: user must be Super Admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'لطفا ابتدا وارد شوید'}), 401
        if not session.get('is_admin'):
            return jsonify({'error': 'این بخش فقط برای ادمین سیستم قابل دسترسی است'}), 403
        return f(*args, **kwargs)
    return decorated_function

def calculate_user_share(user_id, bill_id):
    """Calculate share for a specific user and bill"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get bill details
    cursor.execute('''
        SELECT total_amount, division_method, house_id FROM bills WHERE id = ?
    ''', (bill_id,))
    bill = cursor.fetchone()
    
    if not bill:
        conn.close()
        return 0
    
    total_amount = bill['total_amount']
    division_method = bill['division_method']
    house_id = bill['house_id']
    
    # Get user details
    cursor.execute('SELECT room_area FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    user_area = user['room_area'] if user else 0
    
    # Get all housemates in this house (exclude house managers)
    cursor.execute('''
        SELECT id, room_area FROM users 
        WHERE house_id = ? AND is_approved = 1 AND is_house_manager = 0
    ''', (house_id,))
    all_users = cursor.fetchall()
    
    share = 0
    
    if division_method == 'equal':
        share = total_amount / len(all_users) if all_users else 0
    
    elif division_method == 'area':
        total_area = sum(u['room_area'] for u in all_users)
        if total_area > 0:
            share = (user_area / total_area) * total_amount
    
    elif division_method == 'presence':
        # Get attendance for this month
        cursor.execute('SELECT month FROM bills WHERE id = ?', (bill_id,))
        month = cursor.fetchone()['month']
        
        total_days = 0
        user_days = 0
        for u in all_users:
            cursor.execute('''
                SELECT days_present FROM attendance 
                WHERE user_id = ? AND month = ?
            ''', (u['id'], month))
            att = cursor.fetchone()
            days = att['days_present'] if att else 0
            total_days += days
            if u['id'] == user_id:
                user_days = days
        
        if total_days > 0:
            share = (user_days / total_days) * total_amount
    
    elif division_method == 'combined':
        # Get attendance for this month
        cursor.execute('SELECT month FROM bills WHERE id = ?', (bill_id,))
        month = cursor.fetchone()['month']
        
        total_weight = 0
        user_weight = 0
        for u in all_users:
            cursor.execute('''
                SELECT days_present FROM attendance 
                WHERE user_id = ? AND month = ?
            ''', (u['id'], month))
            att = cursor.fetchone()
            days = att['days_present'] if att else 0
            weight = u['room_area'] * days
            total_weight += weight
            if u['id'] == user_id:
                user_weight = weight
        
        if total_weight > 0:
            share = (user_weight / total_weight) * total_amount
    
    conn.close()
    return round(share)

def get_user_debt(user_id):
    """Calculate total debt for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user's house
    cursor.execute('SELECT house_id FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return {'total_owed': 0, 'verified_paid': 0, 'pending_paid': 0, 'balance': 0}
    
    house_id = user['house_id']
    
    # Get all bills for this house
    cursor.execute('SELECT id, month FROM bills WHERE house_id = ?', (house_id,))
    bills = cursor.fetchall()
    
    total_owed = 0
    
    for bill in bills:
        share = calculate_user_share(user_id, bill['id'])
        total_owed += share
    
    # Get verified payments
    cursor.execute('''
        SELECT SUM(amount_paid) as total FROM payments 
        WHERE user_id = ? AND verification_status = 'verified'
    ''', (user_id,))
    verified_paid = cursor.fetchone()['total'] or 0
    
    # Get pending payments
    cursor.execute('''
        SELECT SUM(amount_paid) as total FROM payments 
        WHERE user_id = ? AND verification_status = 'pending'
    ''', (user_id,))
    pending_paid = cursor.fetchone()['total'] or 0
    
    conn.close()
    
    return {
        'total_owed': int(total_owed),
        'verified_paid': int(verified_paid),
        'pending_paid': int(pending_paid),
        'balance': int(total_owed - verified_paid)
    }

# ============================================
# PAGE ROUTES
# ============================================

@app.route('/')
def index():
    """Home page - login/register"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard"""
    return render_template('dashboard.html', 
                         user_name=session.get('full_name'),
                         is_admin=session.get('is_admin'),
                         is_house_manager=session.get('is_house_manager'),
                         is_housemate_manager=session.get('is_housemate_manager'))

# ============================================
# AUTHENTICATION ROUTES
# ============================================

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.json
    
    username = data.get('username')
    full_name = data.get('full_name')
    email = data.get('email', '')
    phone_number = data.get('phone_number')
    house_code = data.get('house_code', '').strip()
    role = data.get('role', 'regular')  # 'house_manager', 'housemate_manager', 'regular'
    password = data.get('password')
    
    if not all([username, full_name, phone_number, password]):
        return jsonify({'error': 'تمام فیلدهای الزامی را پر کنید'}), 400
    
    # Validate phone number
    if not phone_number.isdigit() or len(phone_number) != 10:
        return jsonify({'error': 'شماره موبایل باید ۱۰ رقم باشد'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if username exists
    cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'این نام کاربری قبلاً ثبت شده است'}), 400
    
    # Check if phone number exists
    cursor.execute('SELECT id FROM users WHERE phone_number = ?', (phone_number,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'این شماره موبایل قبلاً ثبت شده است'}), 400
    
    hashed_password = hash_password(password)
    
    # Determine roles based on selected role
    is_admin = 0
    is_house_manager = 0
    is_housemate_manager = 0
    
    if role == 'house_manager':
        is_house_manager = 1
    elif role == 'housemate_manager':
        is_housemate_manager = 1
    # else: regular housemate (all 0)
    
    # Check if house exists
    house_id = None
    if house_code:
        cursor.execute('SELECT id FROM houses WHERE house_code = ?', (house_code,))
        house = cursor.fetchone()
        if house:
            house_id = house['id']
            # Check if this is the first user in the house
            cursor.execute('SELECT COUNT(*) as count FROM users WHERE house_id = ? AND is_approved = 1', (house_id,))
            count = cursor.fetchone()['count']
            if count == 0:
                # First user becomes house manager by default
                is_house_manager = 1
                is_housemate_manager = 0
                is_approved = 1
            else:
                # Other users need approval
                is_approved = 0
        else:
            conn.close()
            return jsonify({'error': 'کد خانه معتبر نیست'}), 400
    else:
        # No house code - create new house
        if is_house_manager or is_housemate_manager:
            # Manager creating new house
            new_code = generate_house_code()
            cursor.execute('INSERT INTO houses (house_code, name) VALUES (?, ?)', 
                           (new_code, f'خانه {full_name}'))
            house_id = cursor.lastrowid
            is_approved = 1
        else:
            # Regular user without house code - needs to enter one
            conn.close()
            return jsonify({'error': 'لطفاً کد خانه را وارد کنید', 'needs_code': True}), 400
    
    cursor.execute('''
        INSERT INTO users (
            house_id, username, full_name, email, phone_number,
            room_area, is_admin, is_house_manager, is_housemate_manager,
            password, is_approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (house_id, username, full_name, email, phone_number, 0, 
          is_admin, is_house_manager, is_housemate_manager, 
          hashed_password, is_approved))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'user_id': user_id,
        'username': username,
        'full_name': full_name,
        'is_approved': is_approved,
        'is_house_manager': is_house_manager,
        'is_housemate_manager': is_housemate_manager,
        'house_code': new_code if 'new_code' in locals() else None,
        'message': 'ثبت‌نام با موفقیت انجام شد' if is_approved else 'درخواست شما ثبت شد و منتظر تأیید مدیر است'
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Login user"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({'error': 'نام کاربری و رمز عبور الزامی است'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    hashed_password = hash_password(password)
    
    cursor.execute('''
        SELECT id, username, full_name, house_id, room_area,
               is_admin, is_house_manager, is_housemate_manager,
               is_approved
        FROM users 
        WHERE username = ? AND password = ?
    ''', (username, hashed_password))
    
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'error': 'نام کاربری یا رمز عبور اشتباه است'}), 401
    
    if not user['is_approved']:
        conn.close()
        return jsonify({'error': 'حساب کاربری شما منتظر تأیید مدیر است'}), 401
    
    # Check if user needs to enter room area (only for housemates with room_area = 0)
    needs_area = False
    if not user['is_admin'] and not user['is_house_manager'] and user['room_area'] == 0:
        needs_area = True
    
    session['user_id'] = user['id']
    session['username'] = user['username']
    session['full_name'] = user['full_name']
    session['house_id'] = user['house_id']
    session['room_area'] = user['room_area']
    session['is_admin'] = user['is_admin']
    session['is_house_manager'] = user['is_house_manager']
    session['is_housemate_manager'] = user['is_housemate_manager']
    session['needs_area'] = needs_area
    
    # Get house code
    if user['house_id']:
        cursor.execute('SELECT house_code FROM houses WHERE id = ?', (user['house_id'],))
        house = cursor.fetchone()
        session['house_code'] = house['house_code'] if house else None
    
    conn.close()
    
    return jsonify({
        'success': True,
        'user_id': user['id'],
        'username': user['username'],
        'full_name': user['full_name'],
        'is_admin': user['is_admin'],
        'is_house_manager': user['is_house_manager'],
        'is_housemate_manager': user['is_housemate_manager'],
        'needs_area': needs_area,
        'house_code': session.get('house_code')
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'success': True})

@app.route('/api/users/current', methods=['GET'])
@login_required
def get_current_user():
    """Get current user info"""
    return jsonify({
        'id': session['user_id'],
        'username': session['username'],
        'full_name': session['full_name'],
        'is_admin': session['is_admin'],
        'is_house_manager': session['is_house_manager'],
        'is_housemate_manager': session['is_housemate_manager'],
        'needs_area': session.get('needs_area', False),
        'house_code': session.get('house_code')
    })

@app.route('/api/user/area', methods=['POST'])
@login_required
def update_user_area():
    """Update user's room area (first time)"""
    data = request.json
    room_area = data.get('room_area')
    
    if not room_area or room_area <= 0:
        return jsonify({'error': 'متراژ معتبر نیست'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE users 
        SET room_area = ? 
        WHERE id = ? AND is_house_manager = 0
    ''', (room_area, session['user_id']))
    
    conn.commit()
    conn.close()
    
    session['room_area'] = room_area
    session['needs_area'] = False
    
    return jsonify({'success': True})

# ============================================
# SUPER ADMIN ROUTES
# ============================================

@app.route('/api/admin/access', methods=['POST'])
@admin_required
def admin_access_house():
    """Super Admin enters a house by code"""
    data = request.json
    house_code = data.get('house_code')
    
    if not house_code:
        return jsonify({'error': 'کد خانه را وارد کنید'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM houses WHERE house_code = ?', (house_code,))
    house = cursor.fetchone()
    
    if not house:
        conn.close()
        return jsonify({'error': 'کد خانه معتبر نیست'}), 404
    
    conn.close()
    
    # Store the house_id in session for admin access
    session['admin_house_id'] = house['id']
    session['admin_house_code'] = house_code
    
    return jsonify({'success': True, 'house_code': house_code})

# ============================================
# HOUSE INFO ROUTES
# ============================================

@app.route('/api/house/info', methods=['GET'])
@login_required
def get_house_info():
    """Get current house info"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    if not house_id:
        return jsonify({'error': 'هیچ خانه‌ای یافت نشد'}), 404
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT house_code, name FROM houses WHERE id = ?', (house_id,))
    house = cursor.fetchone()
    
    conn.close()
    
    return jsonify({
        'house_code': house['house_code'] if house else None,
        'house_name': house['name'] if house else None
    })

# ============================================
# USER MANAGEMENT ROUTES
# ============================================

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    """Get all users in current house"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    if not house_id:
        return jsonify([])
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, full_name, email, phone_number, room_area,
               is_admin, is_house_manager, is_housemate_manager,
               is_approved, created_date
        FROM users 
        WHERE house_id = ?
        ORDER BY is_house_manager DESC, is_housemate_manager DESC, full_name
    ''', (house_id,))
    
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(users)

@app.route('/api/users/pending', methods=['GET'])
@manager_required
def get_pending_users():
    """Get pending users for approval"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    if not house_id:
        return jsonify([])
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, full_name, email, phone_number, created_date
        FROM users 
        WHERE house_id = ? AND is_approved = 0
    ''', (house_id,))
    
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(users)

@app.route('/api/users/<int:user_id>/approve', methods=['POST'])
@manager_required
def approve_user(user_id):
    """Approve a pending user"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE users 
        SET is_approved = 1 
        WHERE id = ? AND house_id = ? AND is_approved = 0
    ''', (user_id, house_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@manager_required
def delete_user(user_id):
    """Remove a user from the house"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    if user_id == session['user_id']:
        return jsonify({'error': 'نمی‌توانید خودتان را حذف کنید'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE users 
        SET house_id = NULL 
        WHERE id = ? AND house_id = ? AND is_admin = 0
    ''', (user_id, house_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/users/<int:user_id>/area', methods=['PUT'])
@manager_required
def update_user_area_manager(user_id):
    """Manager updates user's room area"""
    data = request.json
    room_area = data.get('room_area')
    
    if not room_area or room_area <= 0:
        return jsonify({'error': 'متراژ معتبر نیست'}), 400
    
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE users 
        SET room_area = ? 
        WHERE id = ? AND house_id = ? AND is_house_manager = 0
    ''', (room_area, user_id, house_id))
    
    conn.commit()
    conn.close()
    
    # Create notification for the user
    create_notification(user_id, '📏 متراژ شما ویرایش شد', 'متراژ اتاق شما توسط مدیر خانه تغییر پیدا کرد', '/dashboard?tab=profile')
    
    return jsonify({'success': True})

# ============================================
# BILL ROUTES
# ============================================

@app.route('/api/bills', methods=['GET'])
@login_required
def get_bills():
    """Get all bills for current house"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    if not house_id:
        return jsonify([])
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT b.*, u.full_name as created_by_name
        FROM bills b
        JOIN users u ON b.created_by = u.id
        WHERE b.house_id = ?
        ORDER BY b.month DESC, b.created_date DESC
    ''', (house_id,))
    
    bills = []
    for row in cursor.fetchall():
        bill = dict(row)
        # Calculate share for this user
        bill['user_share'] = calculate_user_share(session['user_id'], bill['id'])
        bills.append(bill)
    
    conn.close()
    return jsonify(bills)

@app.route('/api/bills', methods=['POST'])
@manager_required
def add_bill():
    """Add a new bill"""
    data = request.json
    
    utility_type = data.get('utility_type')
    total_amount = data.get('total_amount')
    month = data.get('month')
    division_method = data.get('division_method')
    
    valid_utilities = ['rent', 'electricity', 'water', 'gas', 'internet']
    valid_methods = ['equal', 'area', 'presence', 'combined']
    
    if utility_type not in valid_utilities:
        return jsonify({'error': 'نوع قبض معتبر نیست'}), 400
    
    if division_method not in valid_methods:
        return jsonify({'error': 'روش تقسیم نامعتبر است'}), 400
    
    if not total_amount or total_amount <= 0:
        return jsonify({'error': 'مبلغ قبض باید بیشتر از صفر باشد'}), 400
    
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO bills (house_id, utility_type, total_amount, month, division_method, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (house_id, utility_type, total_amount, month, division_method, session['user_id']))
    
    conn.commit()
    bill_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'success': True, 'bill_id': bill_id})

@app.route('/api/bills/<int:bill_id>', methods=['PUT'])
@manager_required
def update_bill(bill_id):
    """Update a bill"""
    data = request.json
    
    total_amount = data.get('total_amount')
    division_method = data.get('division_method')
    
    if not total_amount or total_amount <= 0:
        return jsonify({'error': 'مبلغ قبض باید بیشتر از صفر باشد'}), 400
    
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE bills 
        SET total_amount = ?, division_method = ?
        WHERE id = ? AND house_id = ?
    ''', (total_amount, division_method, bill_id, house_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/bills/<int:bill_id>', methods=['DELETE'])
@manager_required
def delete_bill(bill_id):
    """Delete a bill"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM bills WHERE id = ? AND house_id = ?', (bill_id, house_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# ============================================
# ATTENDANCE ROUTES
# ============================================

@app.route('/api/attendance', methods=['GET'])
@login_required
def get_attendance():
    """Get attendance for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT month, days_present
        FROM attendance 
        WHERE user_id = ?
        ORDER BY month DESC
    ''', (session['user_id'],))
    
    attendance = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(attendance)

@app.route('/api/attendance', methods=['POST'])
@login_required
def save_attendance():
    """Save attendance for current user"""
    data = request.json
    month = data.get('month')
    days_present = data.get('days_present')
    
    if not month:
        return jsonify({'error': 'ماه الزامی است'}), 400
    
    if days_present is None or days_present < 0 or days_present > 31:
        return jsonify({'error': 'تعداد روزهای حضور باید بین ۰ تا ۳۱ باشد'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO attendance (user_id, month, days_present)
        VALUES (?, ?, ?)
    ''', (session['user_id'], month, days_present))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/attendance/all', methods=['GET'])
@login_required
def get_all_attendance():
    """Get all attendance for current house"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    month = request.args.get('month')
    
    if not house_id:
        return jsonify([])
    
    if not month:
        # Get latest month from bills
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT month FROM bills WHERE house_id = ? ORDER BY month DESC LIMIT 1', (house_id,))
        result = cursor.fetchone()
        conn.close()
        month = result['month'] if result else None
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.id, u.username, u.full_name, u.room_area,
               COALESCE(a.days_present, 0) as days_present,
               u.is_house_manager, u.is_housemate_manager
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id AND a.month = ?
        WHERE u.house_id = ? AND u.is_approved = 1
        ORDER BY u.is_house_manager DESC, u.full_name
    ''', (month, house_id))
    
    attendance = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'month': month,
        'attendance': attendance
    })

# ============================================
# PAYMENT ROUTES
# ============================================

@app.route('/api/payments', methods=['POST'])
@login_required
def add_payment():
    """Register a payment"""
    data = request.json
    
    amount_paid = data.get('amount_paid')
    payment_date = data.get('payment_date')
    transaction_id = data.get('transaction_id', '')
    notes = data.get('notes', '')
    
    if not amount_paid or amount_paid <= 0:
        return jsonify({'error': 'مبلغ پرداختی معتبر نیست'}), 400
    
    if not payment_date:
        payment_date = datetime.now().strftime('%Y-%m-%d')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO payments (user_id, amount_paid, payment_date, transaction_id, notes)
        VALUES (?, ?, ?, ?, ?)
    ''', (session['user_id'], amount_paid, payment_date, transaction_id, notes))
    
    conn.commit()
    payment_id = cursor.lastrowid
    conn.close()
    
    # Create notification for manager
    house_id = session.get('admin_house_id') or session.get('house_id')
    notif_conn = get_db()
    notif_cursor = notif_conn.cursor()
    notif_cursor.execute('''
        SELECT id FROM users 
        WHERE house_id = ? AND (is_house_manager = 1 OR is_housemate_manager = 1) AND id != ?
    ''', (house_id, session['user_id']))
    managers = notif_cursor.fetchall()
    for manager in managers:
        create_notification_db(manager['id'], '💳 پرداخت جدید ثبت شد', 
                               f'کاربر {session["full_name"]} مبلغ {amount_paid:,} تومان پرداخت کرده است', 
                               '/dashboard?tab=payments')
    notif_conn.close()
    
    return jsonify({
        'success': True,
        'payment_id': payment_id,
        'message': 'پرداخت ثبت شد و منتظر تأیید مدیر است'
    })

@app.route('/api/payments/my', methods=['GET'])
@login_required
def get_my_payments():
    """Get current user's payment history"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, amount_paid, payment_date, transaction_id, 
               verification_status, notes, created_date
        FROM payments 
        WHERE user_id = ?
        ORDER BY created_date DESC
    ''', (session['user_id'],))
    
    payments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(payments)

@app.route('/api/payments/pending', methods=['GET'])
@manager_required
def get_pending_payments():
    """Get all pending payments for current house"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT p.*, u.username, u.full_name
        FROM payments p
        JOIN users u ON p.user_id = u.id
        WHERE u.house_id = ? AND p.verification_status = 'pending'
        ORDER BY p.created_date ASC
    ''', (house_id,))
    
    payments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(payments)

@app.route('/api/payments/<int:payment_id>/verify', methods=['POST'])
@manager_required
def verify_payment(payment_id):
    """Verify or reject a payment"""
    data = request.json
    action = data.get('action')  # 'verify' or 'reject'
    
    if action not in ['verify', 'reject']:
        return jsonify({'error': 'عمل نامعتبر است'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    new_status = 'verified' if action == 'verify' else 'rejected'
    verified_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Get user_id for notification
    cursor.execute('SELECT user_id FROM payments WHERE id = ?', (payment_id,))
    payment = cursor.fetchone()
    
    cursor.execute('''
        UPDATE payments 
        SET verification_status = ?, verified_by = ?, verified_date = ?
        WHERE id = ?
    ''', (new_status, session['user_id'], verified_date, payment_id))
    
    conn.commit()
    
    if payment:
        create_notification_db(payment['user_id'], 
                              '💳 پرداخت شما تأیید شد' if action == 'verify' else '💳 پرداخت شما رد شد',
                              f'پرداخت شما توسط مدیر خانه {new_status} شد',
                              '/dashboard?tab=payments')
    
    conn.close()
    
    return jsonify({'success': True})

# ============================================
# DEBT ROUTES
# ============================================

@app.route('/api/debt/my', methods=['GET'])
@login_required
def get_my_debt():
    """Get current user's debt"""
    debt = get_user_debt(session['user_id'])
    return jsonify(debt)

@app.route('/api/debt/all', methods=['GET'])
@login_required
def get_all_debt():
    """Get all users' debt in current house"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    if not house_id:
        return jsonify([])
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, full_name, room_area, is_house_manager
        FROM users 
        WHERE house_id = ? AND is_approved = 1
    ''', (house_id,))
    
    users = cursor.fetchall()
    
    all_debts = []
    for user in users:
        debt = get_user_debt(user['id'])
        debt['user_id'] = user['id']
        debt['username'] = user['username']
        debt['full_name'] = user['full_name']
        debt['room_area'] = user['room_area']
        debt['is_house_manager'] = user['is_house_manager']
        all_debts.append(debt)
    
    conn.close()
    return jsonify(all_debts)

# ============================================
# OBJECTION ROUTES
# ============================================

@app.route('/api/objections', methods=['POST'])
@login_required
def add_objection():
    """Add an objection to a bill"""
    data = request.json
    bill_id = data.get('bill_id')
    description = data.get('description')
    
    if not bill_id or not description:
        return jsonify({'error': 'شناسه قبض و توضیحات الزامی است'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO objections (user_id, bill_id, description)
        VALUES (?, ?, ?)
    ''', (session['user_id'], bill_id, description))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/objections', methods=['GET'])
@manager_required
def get_objections():
    """Get all objections for current house"""
    house_id = session.get('admin_house_id') or session.get('house_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT o.*, u.full_name as user_name, b.utility_type, b.month
        FROM objections o
        JOIN users u ON o.user_id = u.id
        JOIN bills b ON o.bill_id = b.id
        WHERE b.house_id = ? AND o.status = 'pending'
        ORDER BY o.created_date ASC
    ''', (house_id,))
    
    objections = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(objections)

@app.route('/api/objections/<int:objection_id>/resolve', methods=['POST'])
@manager_required
def resolve_objection(objection_id):
    """Resolve or reject an objection"""
    data = request.json
    action = data.get('action')  # 'resolve' or 'reject'
    resolution_note = data.get('resolution_note', '')
    
    if action not in ['resolve', 'reject']:
        return jsonify({'error': 'عمل نامعتبر است'}), 400
    
    new_status = 'resolved' if action == 'resolve' else 'rejected'
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE objections 
        SET status = ?, resolved_by = ?, resolved_date = ?, resolution_note = ?
        WHERE id = ?
    ''', (new_status, session['user_id'], datetime.now().strftime('%Y-%m-%d %H:%M:%S'), resolution_note, objection_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# ============================================
# RECEIPT ROUTES
# ============================================

@app.route('/api/receipt/check', methods=['GET'])
@login_required
def check_receipt_eligibility():
    """Check if user is eligible for a receipt"""
    month = request.args.get('month')
    
    if not month:
        return jsonify({'error': 'ماه الزامی است'}), 400
    
    debt = get_user_debt(session['user_id'])
    is_eligible = debt['balance'] <= 0
    
    return jsonify({
        'eligible': is_eligible,
        'month': month,
        'balance': debt['balance']
    })

@app.route('/api/receipt/generate', methods=['POST'])
@login_required
def generate_receipt():
    """Generate a receipt for a specific month"""
    data = request.json
    month = data.get('month')
    
    if not month:
        return jsonify({'error': 'ماه الزامی است'}), 400
    
    debt = get_user_debt(session['user_id'])
    
    if debt['balance'] > 0:
        return jsonify({'error': f'امکان دریافت رسید وجود ندارد. موجودی شما: {debt["balance"]:,} تومان'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if receipt already exists
    cursor.execute('SELECT id FROM receipts WHERE user_id = ? AND month = ?', 
                   (session['user_id'], month))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'رسید قبلاً صادر شده است'}), 400
    
    receipt_number = f"REC-{month}-{session['user_id']}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    receipt_text = f"""
═══════════════════════════════════════════
            رسید پرداخت ماهانه
═══════════════════════════════════════════

شماره رسید: {receipt_number}
تاریخ صدور: {datetime.now().strftime('%Y/%m/%d %H:%M')}

نام پرداخت‌کننده: {session['full_name']}
ماه صورت‌حساب: {month}

مبلغ کل پرداختی: {debt['verified_paid']:,} تومان

وضعیت: ✅ تسویه کامل

═══════════════════════════════════════════
"""
    
    cursor.execute('''
        INSERT INTO receipts (user_id, month, receipt_number, total_paid, receipt_text)
        VALUES (?, ?, ?, ?, ?)
    ''', (session['user_id'], month, receipt_number, debt['verified_paid'], receipt_text))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'receipt_number': receipt_number,
        'receipt_text': receipt_text,
        'total_paid': debt['verified_paid']
    })

@app.route('/api/receipts/my', methods=['GET'])
@login_required
def get_my_receipts():
    """Get all receipts for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT month, receipt_number, total_paid, issued_date
        FROM receipts
        WHERE user_id = ?
        ORDER BY month DESC
    ''', (session['user_id'],))
    
    receipts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(receipts)

# ============================================
# NOTIFICATION HELPER FUNCTIONS
# ============================================

def create_notification_db(user_id, title, message, link=None):
    """Create a notification for a user"""
    conn = sqlite3.connect('house_bills.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO notifications (user_id, title, message, link)
        VALUES (?, ?, ?, ?)
    ''', (user_id, title, message, link))
    conn.commit()
    conn.close()

def create_notification(user_id, title, message, link=None):
    """Wrapper for create_notification_db"""
    create_notification_db(user_id, title, message, link)

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """Get all notifications for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, title, message, is_read, link, created_date
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_date DESC
        LIMIT 50
    ''', (session['user_id'],))
    
    notifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(notifications)

@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE notifications 
        SET is_read = 1 
        WHERE id = ? AND user_id = ?
    ''', (notification_id, session['user_id']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# ============================================
# DEBUG ROUTES
# ============================================

@app.route('/api/debug/session', methods=['GET'])
@login_required
def debug_session():
    """Debug endpoint to see session data"""
    return jsonify(dict(session))


if __name__ == '__main__':
    print("=" * 50)
    print("🏠 House Bill Splitter System")
    print("=" * 50)
    print("Starting server at http://localhost:5000")
    print("")
    print("👥 Test Users:")
    print("  admin      | pass: admin  | (Super Admin)")
    print("  daniyal    | pass: 1234   | (House Manager)")
    print("  mehdi      | pass: 1234   | (Housemate Manager)")
    print("  asma       | pass: 1234   | (Regular Housemate)")
    print("  mohammadreza | pass: 1234 | (Regular Housemate)")
    print("  maryam     | pass: 1234   | (Regular Housemate)")
    print("=" * 50)
    app.run(debug=True, port=5000)