from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import traceback
from werkzeug.utils import secure_filename
from flask import send_file
import mimetypes

app = Flask(__name__)
# Allow requests from any origin (useful when opening index.html from file:// or different ports)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

# Initialize users.json with proper structure
if not os.path.exists('users.json'):
    with open('users.json', 'w') as f:
        json.dump({"users": {}, "officials": {}}, f, indent=4)
else:
    # Ensure required top-level keys exist
    try:
        with open('users.json', 'r') as f:
            data = json.load(f)
        changed = False
        if "users" not in data:
            data["users"] = {}
            changed = True
        if "officials" not in data:
            data["officials"] = {}
            changed = True
        if changed:
            with open('users.json', 'w') as f:
                json.dump(data, f, indent=4)
    except Exception:
        with open('users.json', 'w') as f:
            json.dump({"users": {}, "officials": {}}, f, indent=4)

# Import other modules
import login
import complaints
import notifications
import gps
import voiceExtraction

UPLOAD_DIR = 'uploads'
DOCS_DB = 'documents.json'
COMPLAINTS_DB = 'complaints.json'

os.makedirs(UPLOAD_DIR, exist_ok=True)
if not os.path.exists(DOCS_DB):
    with open(DOCS_DB, 'w') as f:
        json.dump({"documents": []}, f, indent=4)
if not os.path.exists(COMPLAINTS_DB):
    with open(COMPLAINTS_DB, 'w') as f:
        json.dump({"complaints": []}, f, indent=4)

def load_documents():
    try:
        with open(DOCS_DB, 'r') as f:
            return json.load(f)
    except Exception:
        return {"documents": []}

def save_documents(data):
    with open(DOCS_DB, 'w') as f:
        json.dump(data, f, indent=4)

def load_complaints():
    try:
        with open(COMPLAINTS_DB, 'r') as f:
            return json.load(f)
    except Exception:
        return {"complaints": []}

def save_complaints(data):
    with open(COMPLAINTS_DB, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"})

@app.route('/api/register', methods=['POST'])
def handle_register():
    try:
        print("\n=== Registration Request ===")
        print("Registration endpoint hit")
        data = request.get_json()
        print("Received data:", data)
        
        if not data:
            print("Error: No data provided")
            return jsonify({"success": False, "message": "No data provided"}), 400
            
        # Validate required fields
        required_fields = ['name', 'phone', 'password', 'aadhaar']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            print(f"Error: Missing fields: {missing_fields}")
            return jsonify({
                "success": False,
                "message": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Process registration
        result = login.register_user(data)
        print("Registration result:", result)  # Debug print
        
        return jsonify(result)
    except Exception as e:
        print("Registration error:", str(e))  # Debug print
        traceback.print_exc()  # Print full error traceback
        return jsonify({
            "success": False,
            "message": "Registration failed. Please try again."
        }), 500

@app.route('/api/login', methods=['POST'])
def handle_login():
    try:
        data = request.get_json()
        if not data or 'phone' not in data or 'password' not in data:
            return jsonify({
                "success": False,
                "message": "Phone and password are required"
            }), 400
        
        result = login.verify_login(data['phone'], data['password'])
        return jsonify(result)
    except Exception as e:
        print("Login error:", str(e))
        return jsonify({
            "success": False,
            "message": "Login failed. Please try again."
        }), 500

# Complaints API
@app.route('/api/complaints', methods=['GET'])
def list_complaints():
    try:
        user_id = request.args.get('user_id') or request.args.get('username')
        data = load_complaints()
        items = data.get('complaints', [])
        if user_id:
            items = [c for c in items if str(c.get('userId')) == str(user_id) or str(c.get('username')) == str(user_id)]
        return jsonify({"success": True, "complaints": items})
    except Exception as e:
        print('List complaints error:', e)
        return jsonify({"success": False, "complaints": []}), 500

@app.route('/api/complaints', methods=['POST'])
def create_complaint():
    try:
        data = request.get_json() or {}
        required = ['userId', 'sector', 'subject', 'description', 'location', 'priority']
        missing = [k for k in required if not data.get(k)]
        if missing:
            return jsonify({"success": False, "message": f"Missing: {', '.join(missing)}"}), 400
        store = load_complaints()
        items = store.get('complaints', [])
        new_id = (max([c.get('id', 0) for c in items]) + 1) if items else 1
        record = {
            "id": new_id,
            "userId": data['userId'],
            "sector": data['sector'],
            "subject": data['subject'],
            "description": data['description'],
            "location": data['location'],
            "priority": data['priority'],
            "status": 'pending',
            "createdAt": __import__('datetime').datetime.now().isoformat()
        }
        items.append(record)
        store['complaints'] = items
        save_complaints(store)
        return jsonify({"success": True, "complaint": record})
    except Exception as e:
        print('Create complaint error:', e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Failed to create complaint"}), 500

# Notifications API (simple stub)
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    try:
        user_id = request.args.get('user_id') or 'anonymous'
        notifs = [
            {"id": 1, "title": "Welcome", "message": "Welcome to DigiGov!", "userId": user_id},
            {"id": 2, "title": "Tips", "message": "You can upload important documents in Documents tab.", "userId": user_id}
        ]
        return jsonify({"success": True, "notifications": notifs})
    except Exception as e:
        print('Notifications error:', e)
        return jsonify({"success": False, "notifications": []}), 500

# Location API
@app.route('/api/location', methods=['GET'])
def get_location():
    try:
        coords = gps.get_location()
        if coords:
            return jsonify({"success": True, "lat": coords[0], "lng": coords[1]})
        return jsonify({"success": False, "message": "Location unavailable"}), 200
    except Exception as e:
        print('Location error:', e)
        return jsonify({"success": False, "message": "Failed to get location"}), 500

# Voice processing API (stub)
@app.route('/api/voice', methods=['POST'])
def process_voice():
    try:
        if 'audio' not in request.files:
            return jsonify({"success": False, "message": "No audio provided"}), 400
        # For now, just return a placeholder transcript
        return jsonify({"success": True, "transcript": "Transcription is not implemented in this demo."})
    except Exception as e:
        print('Voice error:', e)
        return jsonify({"success": False, "message": "Voice processing failed"}), 500

@app.route('/api/documents', methods=['GET'])
def list_documents():
    try:
        user_id = request.args.get('user_id')
        data = load_documents()
        docs = data.get('documents', [])
        if user_id:
            docs = [d for d in docs if str(d.get('user_id')) == str(user_id)]
        return jsonify({"success": True, "documents": docs})
    except Exception as e:
        print('List documents error:', e)
        return jsonify({"success": False, "documents": []}), 500

@app.route('/api/documents', methods=['POST'])
def upload_document():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No file uploaded"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "message": "Empty filename"}), 400
        user_id = request.form.get('user_id', '')
        original_name = secure_filename(file.filename)
        # Create user folder
        user_folder = os.path.join(UPLOAD_DIR, str(user_id or 'anonymous'))
        os.makedirs(user_folder, exist_ok=True)
        # Ensure unique name
        base_name = os.path.splitext(original_name)[0]
        ext = os.path.splitext(original_name)[1]
        save_name = original_name
        counter = 1
        while os.path.exists(os.path.join(user_folder, save_name)):
            save_name = f"{base_name}_{counter}{ext}"
            counter += 1
        save_path = os.path.join(user_folder, save_name)
        file.save(save_path)

        data = load_documents()
        doc_id = len(data.get('documents', [])) + 1
        record = {
            "id": doc_id,
            "user_id": user_id,
            "name": save_name,
            "original_name": original_name,
            "path": f"{user_folder}/{save_name}",
            "type": request.form.get('type', ''),
            "uploadDate": __import__('datetime').datetime.now().strftime('%Y-%m-%d')
        }
        data['documents'].append(record)
        save_documents(data)
        return jsonify({"success": True, "document": record})
    except Exception as e:
        print('Upload error:', e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Upload failed"}), 500

@app.route('/api/documents/<int:doc_id>/download', methods=['GET'])
def download_document(doc_id: int):
    try:
        data = load_documents()
        match = next((d for d in data.get('documents', []) if int(d.get('id', -1)) == doc_id), None)
        if not match:
            return jsonify({"success": False, "message": "Not found"}), 404
        path = match.get('path')
        if not path or not os.path.exists(path):
            return jsonify({"success": False, "message": "File missing"}), 404
        return send_file(path, as_attachment=True, download_name=match.get('original_name') or match.get('name'))
    except Exception as e:
        print('Download error:', e)
        return jsonify({"success": False, "message": "Download failed"}), 500

@app.route('/api/documents/<int:doc_id>/view', methods=['GET'])
def view_document(doc_id: int):
    try:
        data = load_documents()
        match = next((d for d in data.get('documents', []) if int(d.get('id', -1)) == doc_id), None)
        if not match:
            return jsonify({"success": False, "message": "Not found"}), 404
        path = match.get('path')
        if not path or not os.path.exists(path):
            return jsonify({"success": False, "message": "File missing"}), 404
        mime, _ = mimetypes.guess_type(path)
        # Ensure PDFs open inline in browser
        if path.lower().endswith('.pdf'):
            mime = 'application/pdf'
        resp = send_file(
            path,
            mimetype=mime or 'application/octet-stream',
            as_attachment=False,
            download_name=match.get('original_name') or match.get('name')
        )
        # Force inline Content-Disposition to avoid downloads
        filename = match.get('original_name') or match.get('name')
        resp.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        return resp
    except Exception as e:
        print('View error:', e)
        return jsonify({"success": False, "message": "View failed"}), 500

@app.route('/api/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id: int):
    try:
        data = load_documents()
        docs = data.get('documents', [])
        idx = next((i for i, d in enumerate(docs) if int(d.get('id', -1)) == doc_id), -1)
        if idx == -1:
            return jsonify({"success": False, "message": "Not found"}), 404
        record = docs[idx]
        path = record.get('path')
        # Remove file if it exists
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception as fe:
            print('File delete warning:', fe)
        # Remove from metadata and save
        docs.pop(idx)
        data['documents'] = docs
        save_documents(data)
        return jsonify({"success": True})
    except Exception as e:
        print('Delete error:', e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Delete failed"}), 500


@app.route('/api/official/register', methods=['POST'])
def handle_official_register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        required = ['emp_id', 'name', 'department', 'category', 'password']
        missing = [f for f in required if f not in data or not data.get(f)]
        if missing:
            return jsonify({
                "success": False,
                "message": f"Missing required fields: {', '.join(missing)}"
            }), 400

        result = login.register_official(data)
        return jsonify(result)
    except Exception as e:
        print("Official registration error:", str(e))
        return jsonify({
            "success": False,
            "message": "Registration failed. Please try again."
        }), 500

@app.route('/api/official/login', methods=['POST'])
def handle_official_login():
    try:
        data = request.get_json()
        if not data or 'emp_id' not in data or 'password' not in data:
            return jsonify({
                "success": False,
                "message": "Employee ID and password are required"
            }), 400

        result = login.verify_official_login(data['emp_id'], data['password'])
        return jsonify(result)
    except Exception as e:
        print("Official login error:", str(e))
        return jsonify({
            "success": False,
            "message": "Login failed. Please try again."
        }), 500

if __name__ == '__main__':
    print('Starting Flask server on http://localhost:5000 ...')
    app.run(host='0.0.0.0', port=5000, debug=False)