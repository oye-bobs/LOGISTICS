# app.py
from flask import Flask, render_template, request, jsonify
import psycopg2
from psycopg2 import extras
from datetime import datetime, date, timedelta

app = Flask(__name__)

# --- PostgreSQL Configuration ---
DATABASE_URL = "postgresql://postgres:desmond@localhost:5432/logistics_db"

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def create_tables():
    """Creates all necessary tables if they don't already exist.
    This function is enhanced to include vehicle_documents and maintenance_logs tables
    and updated columns for vehicles table.
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id SERIAL PRIMARY KEY,
                model VARCHAR(255) NOT NULL,
                year INTEGER NOT NULL,
                make VARCHAR(255) NOT NULL,
                vin VARCHAR(17) UNIQUE NOT NULL,
                color VARCHAR(100),
                category VARCHAR(100),
                plate_number VARCHAR(20),  
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                main_image_base64 TEXT,
                main_image_mime_type VARCHAR(255),
                last_fueled_date DATE,
                fuel_level VARCHAR(50) DEFAULT 'Full'
            );
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_logs (
                id SERIAL PRIMARY KEY,
                vehicle_id INTEGER NOT NULL,
                log_type VARCHAR(255) NOT NULL,
                log_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            );
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS vehicle_documents (
                id SERIAL PRIMARY KEY,
                vehicle_id INTEGER NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                file_content_base64 TEXT NOT NULL,
                file_mime_type VARCHAR(255) NOT NULL,
                expiry_date DATE,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            );
        """)

        conn.commit()
        cur.close()
        print("Tables checked/created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")
    finally:
        if conn:
            conn.close()

# Ensure tables are created when the app starts
with app.app_context():
    create_tables()

# --- Static File Route (for debugging) ---
@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files directly."""
    return app.send_static_file(filename)

# --- Global Error Handler ---
@app.errorhandler(Exception)
def handle_exception(e):
    # Log the exception for debugging purposes
    app.logger.error('An unexpected error occurred: %s', e, exc_info=True)
    # Return a JSON response for all errors
    return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

# --- Flask Routes ---

@app.route('/')
def index():
    """Renders the main index page (vehicle registration)."""
    return render_template('index.html')

@app.route('/vehicle_details/<int:vehicle_id>')
def vehicle_details(vehicle_id):
    """Renders the vehicle details page."""
    return render_template('vehicle_details.html', vehicle_id=vehicle_id)

@app.route('/api/cars', methods=['GET'])
def get_vehicles():
    """
    Fetches all vehicle records from the database and generates alerts
    based on fuel level, maintenance, and document expiry.
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Fetch all vehicles
        cur.execute("SELECT id, model, year, make, vin, color, category, plate_number, created_at, last_fueled_date, fuel_level FROM vehicles ORDER BY created_at DESC;")
        vehicles = cur.fetchall()
        
        vehicles_list = []
        alerts = []
        now = date.today() # Get today's date for comparisons

        for vehicle in vehicles:
            vehicle_dict = dict(vehicle)
            # Format dates and handle None values for basic vehicle info
            for key, value in vehicle_dict.items():
                if isinstance(value, (datetime, date)): 
                    vehicle_dict[key] = value.isoformat()
                elif value is None:
                    vehicle_dict[key] = "" # Ensure no 'null' in JSON for empty fields
            
            # Change 'fuel_level' key to 'fuelLevel' for consistency with frontend
            vehicle_dict['fuelLevel'] = vehicle_dict.pop('fuel_level')

            vehicle_id = vehicle_dict['id']

            # --- Generate Alerts for each vehicle ---

            # Alert for low fuel
            if vehicle_dict['fuelLevel'] == 'Low':
                alerts.append({
                    "id": f"{vehicle_id}_fuel",
                    "type": "fuel_low",
                    "title": "Low Fuel Alert",
                    "content": f"⛽ {vehicle_dict['make']} {vehicle_dict['model']} ({vehicle_dict['year']}) has low fuel. Consider refueling soon!",
                    "timestamp": datetime.now().isoformat()
                })

            # Alert for maintenance overdue (last maintenance older than 2 weeks)
            cur.execute("""
                SELECT log_date FROM maintenance_logs
                WHERE vehicle_id = %s ORDER BY log_date DESC LIMIT 1;
            """, (vehicle_id,))
            latest_maintenance = cur.fetchone()
            
            if latest_maintenance and latest_maintenance['log_date'] is not None:
                log_date_val = latest_maintenance['log_date']
                log_date_obj = None
                try:
                    if isinstance(log_date_val, datetime):
                        log_date_obj = log_date_val.date()
                    elif isinstance(log_date_val, date):
                        log_date_obj = log_date_val
                    
                    if log_date_obj:
                        days_since_maintenance = (now - log_date_obj).days
                        if days_since_maintenance >= 14:
                            alerts.append({
                                "id": f"{vehicle_id}_maint_overdue",
                                "type": "maintenance_overdue",
                                "title": "Maintenance Reminder",
                                "content": f"🛠️ Check {vehicle_dict['make']} {vehicle_dict['model']} ({vehicle_dict['year']}) maintenance logs. Last maintenance was over 2 weeks ago (on {log_date_obj.isoformat()}).",
                                "timestamp": datetime.now().isoformat()
                            })
                except Exception as e:
                    print(f"Error processing maintenance log date for vehicle {vehicle_id}: {e}")
            else:
                # Alert if no maintenance logs exist
                alerts.append({
                    "id": f"{vehicle_id}_no_maint",
                    "type": "no_maintenance_record",
                    "title": "No Maintenance Record",
                    "content": f"⚙️ No maintenance records found for {vehicle_dict['make']} {vehicle_dict['model']} ({vehicle_dict['year']}). It's recommended to log maintenance regularly.",
                    "timestamp": datetime.now().isoformat()
                })

            # Alerts for documents nearing expiry or expired
            cur.execute("""
                SELECT document_name, expiry_date FROM vehicle_documents
                WHERE vehicle_id = %s AND expiry_date IS NOT NULL;
            """, (vehicle_id,))
            documents = cur.fetchall()
            
            for doc_item in documents:
                if doc_item['expiry_date'] is not None:
                    expiry_date_val = doc_item['expiry_date']
                    expiry_date_obj = None
                    try:
                        if isinstance(expiry_date_val, datetime):
                            expiry_date_obj = expiry_date_val.date()
                        elif isinstance(expiry_date_val, date):
                            expiry_date_obj = expiry_date_val
                        
                        if expiry_date_obj:
                            days_until_expiry = (expiry_date_obj - now).days
                            
                            if 0 <= days_until_expiry <= 10:
                                alerts.append({
                                    "id": f"{vehicle_id}_doc_{doc_item['document_name']}_expiring",
                                    "type": "document_expiring_soon",
                                    "title": "Document Expiry Warning",
                                    "content": f"📄 {vehicle_dict['make']} {vehicle_dict['model']} ({vehicle_dict['year']})'s {doc_item['document_name']} is expiring in {days_until_expiry} days! Expiry: {expiry_date_obj.isoformat()}.",
                                    "timestamp": datetime.now().isoformat()
                                })
                            elif days_until_expiry < 0:
                                alerts.append({
                                    "id": f"{vehicle_id}_doc_{doc_item['document_name']}_expired",
                                    "type": "document_expired",
                                    "title": "Document Expired!",
                                    "content": f"🔴 {vehicle_dict['make']} {vehicle_dict['model']} ({vehicle_dict['year']})'s {doc_item['document_name']} expired on {expiry_date_obj.isoformat()}! Please update.",
                                    "timestamp": datetime.now().isoformat()
                                })
                    except Exception as e:
                        print(f"Error processing document expiry date for vehicle {vehicle_id}, document {doc_item['document_name']}: {e}")

            vehicles_list.append(vehicle_dict)

        cur.close()
        return jsonify({"vehicles": vehicles_list, "alerts": alerts}), 200
    except Exception as e:
        print(f"Error fetching vehicles and alerts: {e}")
        return jsonify({"error": "Failed to fetch data", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/vehicles/<int:vehicle_id>/details', methods=['GET'])
def get_vehicle_details(vehicle_id):
    """
    Fetches details for a single vehicle, including its maintenance logs and documents.
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Fetch vehicle main details
        cur.execute("""
    SELECT id, model, year, make, vin, color, category, plate_number, created_at, updated_at,
        main_image_base64, main_image_mime_type, last_fueled_date, fuel_level
    FROM vehicles WHERE id = %s;
""", (vehicle_id,))
        vehicle = cur.fetchone()

        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404

        vehicle_dict = dict(vehicle)
        # Format dates and handle None values
        for key, value in vehicle_dict.items():
            if isinstance(value, (datetime, date)):
                vehicle_dict[key] = value.isoformat()
            elif value is None:
                vehicle_dict[key] = None # Keep None for explicit null values in JSON

        # Fetch maintenance logs for this vehicle
        cur.execute("""
            SELECT id, log_type, log_date, notes, created_at
            FROM maintenance_logs WHERE vehicle_id = %s ORDER BY log_date DESC;
        """, (vehicle_id,))
        maintenance_logs = cur.fetchall()
        vehicle_dict['maintenance_logs'] = []
        for log in maintenance_logs:
            log_dict = dict(log)
            log_dict['log_date'] = log_dict['log_date'].isoformat() if log_dict['log_date'] else None
            log_dict['created_at'] = log_dict['created_at'].isoformat() if log_dict['created_at'] else None
            vehicle_dict['maintenance_logs'].append(log_dict)
        
        # Determine last maintenance display for the summary section
        if maintenance_logs:
            latest_log_date = maintenance_logs[0]['log_date']
            if latest_log_date:
                # Ensure it's a date object before formatting
                if isinstance(latest_log_date, datetime):
                    latest_log_date = latest_log_date.date()
                vehicle_dict['last_maintenance_display'] = latest_log_date.isoformat()
            else:
                vehicle_dict['last_maintenance_display'] = None
        else:
            vehicle_dict['last_maintenance_display'] = None


        # Fetch documents for this vehicle
        cur.execute("""
            SELECT id, document_name, file_content_base64, file_mime_type, expiry_date, uploaded_at
            FROM vehicle_documents WHERE vehicle_id = %s ORDER BY uploaded_at DESC;
        """, (vehicle_id,))
        documents = cur.fetchall()
        vehicle_dict['documents'] = []
        for doc_item in documents:
            doc_dict = dict(doc_item)
            doc_dict['expiry_date'] = doc_dict['expiry_date'].isoformat() if doc_dict['expiry_date'] else None
            doc_dict['uploaded_at'] = doc_dict['uploaded_at'].isoformat() if doc_dict['uploaded_at'] else None
            vehicle_dict['documents'].append(doc_dict)

        cur.close()
        return jsonify(vehicle_dict), 200
    except Exception as e:
        print(f"Error fetching vehicle details for ID {vehicle_id}: {e}")
        return jsonify({"error": "Failed to fetch vehicle details", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/register_vehicle', methods=['POST'])
def register_vehicle():
    """Registers a new vehicle."""
    conn = None
    try:
        
        data = request.get_json()
        model = data.get('model')
        year = data.get('year')
        make = data.get('make')
        vin = data.get('vin')
        color = data.get('color')
        category = data.get('category')
        plate_number = data.get('plate_number')

        if not all([model, year, make, vin, color, category]):
            return jsonify({"error": "All fields are required"}), 400
        if len(vin) != 17:
            return jsonify({"error": "VIN must be exactly 17 characters long"}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            INSERT INTO vehicles (model, year, make, vin, color, category, plate_number)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id;
        """, (model, year, make, vin, color, category, plate_number))
        vehicle_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        return jsonify({"message": "Vehicle registered successfully!", "id": vehicle_id}), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "VIN already exists. Vehicle might be registered already."}), 409
    except Exception as e:
        print(f"Error registering vehicle: {e}")
        return jsonify({"error": "Failed to register vehicle", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/vehicles/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Updates main details of an existing vehicle."""
    conn = None
    try:
        data = request.get_json()
        model = data.get('model')
        year = data.get('year')
        make = data.get('make')
        vin = data.get('vin')
        color = data.get('color')
        category = data.get('category')
        last_fueled_date = data.get('lastFueledDate') or None
        fuel_level = data.get('fuelLevel', 'Full') # Default to 'Full' if not provided
        plate_number = data.get('plate_number')

        # Handle image updates
        main_image_base64 = data.get('mainImageBase64', None)
        main_image_mime_type = data.get('mainImageMimeType', None)

        set_clauses = []
        params = []

        if model is not None:
            set_clauses.append("model = %s")
            params.append(model)
        if year is not None:
            set_clauses.append("year = %s")
            params.append(year)
        if make is not None:
            set_clauses.append("make = %s")
            params.append(make)
        if vin is not None:
            set_clauses.append("vin = %s")
            params.append(vin)
        if color is not None:
            set_clauses.append("color = %s")
            params.append(color)
        if category is not None:
            set_clauses.append("category = %s")
            params.append(category)
        if last_fueled_date is not None:
            set_clauses.append("last_fueled_date = %s")
            params.append(last_fueled_date)
        if fuel_level is not None: # Can be 'Full', 'Half', 'Low'
            set_clauses.append("fuel_level = %s")
            params.append(fuel_level)
        if plate_number is not None:
            set_clauses.append("plate_number = %s")
            params.append(plate_number)

        # Handle image data. If explicit empty string, clear it. If not provided, keep existing.
        if 'mainImageBase64' in data: # Check if key exists in payload
            set_clauses.append("main_image_base64 = %s")
            params.append(main_image_base64 if main_image_base64 else None) # Store None for empty string
        if 'mainImageMimeType' in data: # Check if key exists in payload
            set_clauses.append("main_image_mime_type = %s")
            params.append(main_image_mime_type if main_image_mime_type else None) # Store None for empty string


        if not set_clauses:
            return jsonify({"error": "No fields provided for update"}), 400

        params.append(vehicle_id)
        query = f"UPDATE vehicles SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *;"

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(query, tuple(params))
        updated_vehicle = cur.fetchone()
        conn.commit()
        cur.close()

        if updated_vehicle:
            updated_vehicle_dict = dict(updated_vehicle)
            for key, value in updated_vehicle_dict.items():
                if isinstance(value, (datetime, date)): # Corrected to use 'date'
                    updated_vehicle_dict[key] = value.isoformat()
                elif value is None:
                    updated_vehicle_dict[key] = ""
            return jsonify(updated_vehicle_dict), 200
        else:
            return jsonify({"error": "Vehicle not found"}), 404
    except Exception as e:
        print(f"Error updating vehicle: {e}")
        return jsonify({"error": "Failed to update vehicle", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    """Deletes a vehicle record."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM vehicles WHERE id = %s;", (vehicle_id,))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "Vehicle not found"}), 404
        cur.close()
        return jsonify({"message": "Vehicle deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting vehicle: {e}")
        return jsonify({"error": "Failed to delete vehicle", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

# --- Maintenance Logs API ---
@app.route('/api/vehicles/<int:vehicle_id>/maintenance', methods=['POST'])
def add_maintenance_log(vehicle_id):
    """Adds a new maintenance log for a vehicle."""
    conn = None
    try:
        data = request.get_json()
        log_type = data.get('logType')
        log_date = data.get('logDate')
        notes = data.get('notes')

        if not all([log_type, log_date]):
            return jsonify({"error": "Maintenance type and date are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO maintenance_logs (vehicle_id, log_type, log_date, notes)
            VALUES (%s, %s, %s, %s);
        """, (vehicle_id, log_type, log_date, notes))
        conn.commit()
        cur.close()
        return jsonify({"message": "Maintenance log added successfully!"}), 201
    except Exception as e:
        print(f"Error adding maintenance log: {e}")
        return jsonify({"error": "Failed to add maintenance log", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/maintenance_logs/<int:log_id>', methods=['DELETE'])
def delete_maintenance_log(log_id):
    """Deletes a maintenance log."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM maintenance_logs WHERE id = %s;", (log_id,))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "Maintenance log not found"}), 404
        cur.close()
        return jsonify({"message": "Maintenance log deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting maintenance log: {e}")
        return jsonify({"error": "Failed to delete maintenance log", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

# --- Vehicle Documents API ---
@app.route('/api/vehicles/<int:vehicle_id>/documents', methods=['POST'])
def upload_document(vehicle_id):
    """Uploads a new document for a vehicle."""
    conn = None
    try:
        data = request.get_json()
        document_name = data.get('documentName')
        file_content_base64 = data.get('fileContentBase64')
        file_mime_type = data.get('fileMimeType')
        expiry_date = data.get('expiryDate') or None

        if not all([document_name, file_content_base64, file_mime_type]):
            return jsonify({"error": "Document name, file content, and MIME type are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO vehicle_documents (vehicle_id, document_name, file_content_base64, file_mime_type, expiry_date)
            VALUES (%s, %s, %s, %s, %s);
        """, (vehicle_id, document_name, file_content_base64, file_mime_type, expiry_date))
        conn.commit()
        cur.close()
        return jsonify({"message": "Document uploaded successfully!"}), 201
    except Exception as e:
        print(f"Error uploading document: {e}")
        return jsonify({"error": "Failed to upload document", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/documents/<int:document_id>', methods=['PUT'])
def update_document(document_id):
    """Updates an existing document."""
    conn = None
    try:
        data = request.get_json()
        document_name = data.get('documentName')
        expiry_date = data.get('expiryDate') or None # Can be null

        if not document_name:
            return jsonify({"error": "Document name is required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE vehicle_documents
            SET document_name = %s, expiry_date = %s
            WHERE id = %s RETURNING *;
        """, (document_name, expiry_date, document_id))
        updated_doc = cur.fetchone()
        conn.commit()
        cur.close()

        if updated_doc:
            return jsonify({"message": "Document updated successfully!"}), 200
        else:
            return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        print(f"Error updating document: {e}")
        return jsonify({"error": "Failed to update document", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/documents/<int:document_id>', methods=['DELETE'])
def delete_document(document_id):
    """Deletes a document."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM vehicle_documents WHERE id = %s;", (document_id,))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"error": "Document not found"}), 404
        cur.close()
        return jsonify({"message": "Document deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting document: {e}")
        return jsonify({"error": "Failed to delete document", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(debug=True)
