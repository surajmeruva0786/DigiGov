import json
import datetime
import os

# --- Users JSON File ---
USERS_FILE = "users.json"
try:
    with open(USERS_FILE, "r") as f:
        users = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    users = {"users": {}}
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=4)

# --- Complaints JSON File ---
COMPLAINTS_FILE = "complaints.json"

# Load complaints from file or create empty
complaints = {}
if os.path.exists(COMPLAINTS_FILE):
    try:
        with open(COMPLAINTS_FILE, "r") as f:
            content = f.read().strip()
            complaints = json.loads(content) if content else {}
            if not isinstance(complaints, dict):
                complaints = {}
    except (json.JSONDecodeError, OSError):
        complaints = {}
        with open(COMPLAINTS_FILE, "w") as f:
            json.dump(complaints, f, indent=4)
else:
    with open(COMPLAINTS_FILE, "w") as f:
        json.dump(complaints, f, indent=4)

# Complaint ID counter (max ID + 1)
complaint_counter = max([int(k) for k in complaints.keys()], default=0) + 1


# --- Helper to save complaints ---
def save_complaints():
    with open(COMPLAINTS_FILE, "w") as f:
        json.dump(complaints, f, indent=4)


# --- Complaint Functions ---

def get_user_by_username(username):
    """Find a user in users.json by username"""
    return users.get(username, None)


def add_complaint(username, sector, complaint_text):
    """Add a new complaint"""
    global complaint_counter
    user = get_user_by_username(username)
    if not user:
        return "❌ Username not found in users.json"

    complaint_id = complaint_counter
    complaint_counter += 1

    complaints[str(complaint_id)] = {
        "id": complaint_id,
        "user_id": user["id"],
        "username": user["username"],
        "sector": sector,
        "complaint_text": complaint_text,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "Pending"
    }

    save_complaints()
    return f"✅ Complaint filed successfully with ID {complaint_id}"


def get_user_complaints(username):
    """Fetch all complaints filed by a username"""
    return [c for c in complaints.values() if c["username"] == username]


def update_complaint_status(complaint_id, new_status):
    """Update the status of a complaint"""
    if str(complaint_id) not in complaints:
        return "❌ Complaint not found"
    complaints[str(complaint_id)]["status"] = new_status
    save_complaints()
    return f"✅ Complaint ID {complaint_id} updated to status: {new_status}"


def get_complaints_by_sector(sector):
    """Fetch complaints filtered by sector"""
    return [c for c in complaints.values() if c["sector"].lower() == sector.lower()]


# --- Interactive Menu ---
def main():
    while True:
        print("\n--- Complaint System ---")
        print("1. File a new complaint")
        print("2. View my complaints")
        print("3. Update complaint status (Admin use)")
        print("4. View complaints by sector")
        print("5. Exit")

        choice = input("Enter your choice: ")

        if choice == "1":
            try:
                username = input("Enter your username: ")
                sector = input("Enter sector (Police, Electricity, Water, Roads, Health, Education, Revenue): ")
                complaint_text = input("Enter complaint details: ")

                print(add_complaint(username, sector, complaint_text))
            except Exception as e:
                print("❌ Error:", e)

        elif choice == "2":
            try:
                username = input("Enter your username: ")
                my_complaints = get_user_complaints(username)
                if not my_complaints:
                    print("No complaints found.")
                else:
                    for c in my_complaints:
                        print(c)
            except Exception as e:
                print("❌ Error:", e)

        elif choice == "3":
            try:
                cid = int(input("Enter complaint ID to update: "))
                new_status = input("Enter new status (Pending/In Process/Resolved/Verified): ")
                print(update_complaint_status(cid, new_status))
            except Exception as e:
                print("❌ Error:", e)

        elif choice == "4":
            sector = input("Enter sector name: ")
            sector_complaints = get_complaints_by_sector(sector)
            if not sector_complaints:
                print("No complaints in this sector.")
            else:
                for c in sector_complaints:
                    print(c)

        elif choice == "5":
            print("Exiting Complaint System. Goodbye!")
            break

        else:
            print("❌ Invalid choice, try again.")


if __name__ == "__main__":
    main()
