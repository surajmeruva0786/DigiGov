import json
import bcrypt
from datetime import datetime

def load_users():
    try:
        with open('users.json', 'r') as f:
            data = json.load(f)
            # Migrate existing officials section into users for unified storage
            if isinstance(data, dict) and 'officials' in data:
                users_map = data.get('users', {}) or {}
                officials_map = data.get('officials', {}) or {}
                # Reassign new ids continuing from current users count
                next_id = len(users_map) + 1
                for off in officials_map.values():
                    # Skip if already present (by emp_id match)
                    already = False
                    for u in users_map.values():
                        if u.get('emp_id') and u.get('emp_id') == off.get('emp_id'):
                            already = True
                            break
                    if already:
                        continue
                    new_id = str(next_id)
                    next_id += 1
                    merged = dict(off)
                    merged['id'] = new_id
                    merged['role'] = 'official'
                    users_map[new_id] = merged
                # Remove officials key after migration
                data['users'] = users_map
                data.pop('officials', None)
                # Persist migration
                save_users(data)
            # Ensure users key exists
            if 'users' not in data:
                data['users'] = {}
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        return {"users": {}}

def save_users(users_data):
    with open('users.json', 'w') as f:
        json.dump(users_data, f, indent=4)

def register_user(data):
    print("Starting registration with data:", data)  # Debug print
    
    users_data = load_users()
    
    # Check if phone number already exists
    for user in users_data["users"].values():
        if user["phone"] == data["phone"]:
            return {
                "success": False,
                "message": "Phone number already registered"
            }
    
    # Generate new user ID
    user_id = str(len(users_data["users"]) + 1)
    
    # Hash password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(data["password"].encode('utf-8'), salt)
    
    # Create user entry
    new_user = {
        "id": user_id,
        "name": data["name"],
        "phone": data["phone"],
        "aadhaar": data["aadhaar"],
        "email": data.get("email", ""),
        "address": data.get("address", ""),
        "role": data.get("role", "citizen"),
        "created_at": datetime.now().isoformat(),
        "hashed_password": hashed_password.decode('utf-8')
    }
    
    # Add to users
    users_data["users"][user_id] = new_user
    
    # Save to file
    try:
        save_users(users_data)
        print("User saved successfully")  # Debug print
    except Exception as e:
        print("Error saving user:", str(e))  # Debug print
        return {
            "success": False,
            "message": "Failed to save user data"
        }
    
    # Return success response (excluding password)
    return {
        "success": True,
        "message": "Registration successful",
        "user": {k: v for k, v in new_user.items() if k != 'hashed_password'}
    }

def verify_login(phone, password):
    users_data = load_users()
    
    # Find user by phone
    user = None
    for u in users_data["users"].values():
        if u["phone"] == phone:
            user = u
            break
    
    if not user:
        return {
            "success": False,
            "message": "User not found"
        }
    
    # Verify password
    if bcrypt.checkpw(password.encode('utf-8'), user["hashed_password"].encode('utf-8')):
        return {
            "success": True,
            "message": "Login successful",
            "user": {k: v for k, v in user.items() if k != 'hashed_password'}
        }
    
    return {
        "success": False,
        "message": "Invalid password"
    }

def register_official(data):
    users_data = load_users()

    # Check duplicate by emp_id inside unified users
    for u in users_data.get('users', {}).values():
        if u.get('emp_id') == data['emp_id']:
            return {"success": False, "message": "Employee ID already registered"}

    official_id = str(len(users_data.get('users', {})) + 1)

    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(data["password"].encode('utf-8'), salt)

    new_official = {
        "id": official_id,
        "emp_id": data["emp_id"],
        "name": data["name"],
        "department": data["department"],
        "category": data["category"],
        "role": "official",
        "created_at": datetime.now().isoformat(),
        "hashed_password": hashed_password.decode('utf-8')
    }

    users_data["users"][official_id] = new_official

    save_users(users_data)
    return {
        "success": True,
        "message": "Official registered successfully",
        "official": {k: v for k, v in new_official.items() if k != 'hashed_password'}
    }

def verify_official_login(emp_id, password):
    users_data = load_users()
    official = None
    for u in users_data.get('users', {}).values():
        if u.get('role') == 'official' and u.get('emp_id') == emp_id:
            official = u
            break

    if not official:
        return {"success": False, "message": "Official not found"}

    if bcrypt.checkpw(password.encode('utf-8'), official["hashed_password"].encode('utf-8')):
        return {
            "success": True,
            "message": "Login successful",
            "official": {k: v for k, v in official.items() if k != 'hashed_password'}
        }

    return {"success": False, "message": "Invalid password"}