import sqlite3
import hashlib
import random
import string
from datetime import datetime

# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_house_code():
    """Generate a 7-digit house code like PF52122"""
    letters = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=2))
    numbers = ''.join(random.choices('0123456789', k=5))
    return f"{letters}{numbers}"

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

# ============================================
# CREATE TABLES
# ============================================

def create_tables():
    conn = sqlite3.connect('house_bills.db')
    cursor = conn.cursor()

    # 1. HOUSES
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS houses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            house_code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            created_date TEXT NOT NULL DEFAULT CURRENT_DATE
        )
    ''')

    # 2. USERS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            house_id INTEGER,
            username TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            email TEXT,
            phone_number TEXT NOT NULL UNIQUE,
            room_area REAL DEFAULT 0,
            is_admin INTEGER DEFAULT 0,
            is_house_manager INTEGER DEFAULT 0,
            is_housemate_manager INTEGER DEFAULT 0,
            password TEXT NOT NULL,
            is_approved INTEGER DEFAULT 0,
            created_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL,
            CHECK(room_area >= 0)
        )
    ''')

    # 3. BILLS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            house_id INTEGER NOT NULL,
            utility_type TEXT NOT NULL,
            total_amount INTEGER NOT NULL,
            month TEXT NOT NULL,
            division_method TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            created_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id),
            CHECK(utility_type IN ('rent', 'electricity', 'water', 'gas', 'internet')),
            CHECK(division_method IN ('equal', 'area', 'presence', 'combined'))
        )
    ''')

    # 4. ATTENDANCE
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            days_present INTEGER NOT NULL CHECK(days_present BETWEEN 0 AND 31),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, month)
        )
    ''')

    # 5. PAYMENTS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount_paid INTEGER NOT NULL,
            payment_date TEXT NOT NULL,
            transaction_id TEXT,
            verification_status TEXT DEFAULT 'pending',
            verified_by INTEGER,
            verified_date TEXT,
            notes TEXT,
            created_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (verified_by) REFERENCES users(id),
            CHECK(verification_status IN ('pending', 'verified', 'rejected'))
        )
    ''')

    # 6. OBJECTIONS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS objections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            bill_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            resolved_by INTEGER,
            resolved_date TEXT,
            resolution_note TEXT,
            created_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
            FOREIGN KEY (resolved_by) REFERENCES users(id),
            CHECK(status IN ('pending', 'resolved', 'rejected'))
        )
    ''')

    # 7. RECEIPTS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            receipt_number TEXT NOT NULL UNIQUE,
            total_paid INTEGER NOT NULL,
            issued_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            receipt_text TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, month)
        )
    ''')

    # 8. NOTIFICATIONS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            link TEXT,
            created_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # 9. INVITES
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            house_id INTEGER NOT NULL,
            invited_user_id INTEGER NOT NULL,
            invited_by INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
            FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
            CHECK(status IN ('pending', 'accepted', 'declined'))
        )
    ''')

    conn.commit()
    conn.close()
    print("✅ All tables created successfully!")

# ============================================
# SEED SAMPLE DATA
# ============================================

def seed_sample_data():
    conn = sqlite3.connect('house_bills.db')
    cursor = conn.cursor()
    
    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    if count > 0:
        print("⚠️ Data already exists! Skipping seed.")
        conn.close()
        return

    # Create house
    house_code = generate_house_code()
    cursor.execute('''
        INSERT INTO houses (house_code, name)
        VALUES (?, ?)
    ''', (house_code, 'خانه کافئین و کد'))
    house_id = cursor.lastrowid

    # Hash passwords
    admin_pass = hash_password('admin')
    user_pass = hash_password('1234')

    # Sample users
    users = [
        # (house_id, username, full_name, email, phone, room_area, is_admin, is_house_manager, is_housemate_manager, password, is_approved)
        (None, 'admin', 'ادمین سیستم', 'admin@system.com', '0000000000', 0, 1, 0, 0, admin_pass, 1),
        (house_id, 'daniyal', 'دانیال دیلمی پور', 'daniyal@example.com', '9123456789', 0, 0, 1, 0, user_pass, 1),
        (house_id, 'mehdi', 'مهدی علیزاده', 'mehdi@example.com', '9337715812', 18, 0, 0, 1, user_pass, 1),
        (house_id, 'asma', 'اسما خزاعل زاده', 'asma@example.com', '9145678901', 20, 0, 0, 0, user_pass, 1),
        (house_id, 'mohammadreza', 'محمدرضا احمدی', 'mr@example.com', '9156789012', 15, 0, 0, 0, user_pass, 1),
        (house_id, 'maryam', 'مریم بنی طرف زاده', 'maryam@example.com', '9167890123', 12, 0, 0, 0, user_pass, 1),
    ]

    user_ids = []
    for u in users:
        cursor.execute('''
            INSERT INTO users (
                house_id, username, full_name, email, phone_number,
                room_area, is_admin, is_house_manager, is_housemate_manager,
                password, is_approved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', u)
        user_ids.append(cursor.lastrowid)

    # Get user IDs for reference
    admin_id = user_ids[0]
    daniyal_id = user_ids[1]   # House Manager (no share)
    mehdi_id = user_ids[2]     # Housemate Manager (has share)
    asma_id = user_ids[3]      # Regular Housemate
    mohammadreza_id = user_ids[4]  # Regular Housemate
    maryam_id = user_ids[5]    # Regular Housemate

    # Current month and previous month
    current_month = datetime.now().strftime('%Y-%m')
    current_year = datetime.now().year
    current_month_num = datetime.now().month
    previous_month = f"{current_year}-{str(current_month_num - 1).zfill(2)}"

    # Add bills for current month
    bills_data = [
        (house_id, 'rent', 2000000, current_month, 'area', daniyal_id),
        (house_id, 'electricity', 450000, current_month, 'presence', daniyal_id),
        (house_id, 'water', 150000, current_month, 'presence', daniyal_id),
        (house_id, 'gas', 350000, current_month, 'presence', daniyal_id),
        (house_id, 'internet', 120000, current_month, 'equal', daniyal_id),
    ]

    for b in bills_data:
        cursor.execute('''
            INSERT INTO bills (house_id, utility_type, total_amount, month, division_method, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', b)

    # Add bills for previous month
    if current_month_num > 1:
        prev_bills_data = [
            (house_id, 'rent', 2000000, previous_month, 'area', daniyal_id),
            (house_id, 'electricity', 430000, previous_month, 'presence', daniyal_id),
            (house_id, 'water', 140000, previous_month, 'presence', daniyal_id),
            (house_id, 'gas', 330000, previous_month, 'presence', daniyal_id),
            (house_id, 'internet', 120000, previous_month, 'equal', daniyal_id),
        ]
        for b in prev_bills_data:
            cursor.execute('''
                INSERT INTO bills (house_id, utility_type, total_amount, month, division_method, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', b)

    # Add attendance for current month (housemates only)
    attendance_data = [
        (mehdi_id, current_month, 28),
        (asma_id, current_month, 30),
        (mohammadreza_id, current_month, 25),
        (maryam_id, current_month, 20),
    ]

    # Add attendance for previous month
    if current_month_num > 1:
        prev_attendance = [
            (mehdi_id, previous_month, 30),
            (asma_id, previous_month, 28),
            (mohammadreza_id, previous_month, 22),
            (maryam_id, previous_month, 18),
        ]
        attendance_data.extend(prev_attendance)

    for a in attendance_data:
        cursor.execute('''
            INSERT INTO attendance (user_id, month, days_present)
            VALUES (?, ?, ?)
        ''', a)

    # Add sample payments (some verified, some pending)
    payments_data = [
        (mehdi_id, 300000, datetime.now().strftime('%Y-%m-%d'), 'TRX-001', 'verified', admin_id),
        (asma_id, 200000, datetime.now().strftime('%Y-%m-%d'), 'TRX-002', 'pending', None),
        (mohammadreza_id, 100000, datetime.now().strftime('%Y-%m-%d'), 'TRX-003', 'pending', None),
    ]

    for p in payments_data:
        verified_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S') if p[5] else None
        cursor.execute('''
            INSERT INTO payments (user_id, amount_paid, payment_date, transaction_id, verification_status, verified_by, verified_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (p[0], p[1], p[2], p[3], p[4], p[5], verified_date))

    # Add sample notification for mehdi
    cursor.execute('''
        INSERT INTO notifications (user_id, title, message, link)
        VALUES (?, ?, ?, ?)
    ''', (mehdi_id, '📢 حضور شما ویرایش شد', 'روز های حضور شما توسط مدیر خانه تغییر پیدا کرد', '/dashboard?tab=attendance'))

    conn.commit()
    conn.close()

    print("✅ Sample data seeded successfully!")
    print("")
    print("=" * 50)
    print("🏠 House Code:", house_code)
    print("=" * 50)
    print("")
    print("👥 Users:")
    print("  admin      | ادمین سیستم     | pass: admin  | (Super Admin)")
    print("  daniyal    | دانیال دیلمی پور | pass: 1234   | (House Manager)")
    print("  mehdi      | مهدی علیزاده    | pass: 1234   | (Housemate Manager)")
    print("  asma       | اسما خزاعل زاده  | pass: 1234   | (Regular Housemate)")
    print("  mohammadreza | محمدرضا احمدی | pass: 1234   | (Regular Housemate)")
    print("  maryam     | مریم بنی طرف زاده | pass: 1234  | (Regular Housemate)")
    print("")
    print(f"📅 Current Month: {current_month}")
    print(f"📅 Previous Month: {previous_month}")
    print("")
    print("💡 Super Admin: Login as 'admin', then enter house code to access any house")
    print("💡 House Manager: Login as 'daniyal', has no share")
    print("💡 Housemate Manager: Login as 'mehdi', has share AND manager permissions")
    print("=" * 50)

# ============================================
# RUN
# ============================================

if __name__ == '__main__':
    create_tables()
    seed_sample_data()