#!/usr/bin/env python3
"""
Database Initialization Script for Logistics Application
This script will create all necessary tables and add sample data.
"""

import os
import sys
from datetime import date, datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app, create_tables, get_db_connection
    import psycopg2
    from psycopg2 import extras
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this script from your application directory")
    sys.exit(1)

def init_database():
    """Initialize the database with tables and sample data."""
    
    print("🗄️ Initializing Logistics Database")
    print("=" * 40)
    
    # Step 1: Create tables
    print("📋 Step 1: Creating database tables...")
    try:
        with app.app_context():
            create_tables()
        print("✅ Tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    # Step 2: Add sample data
    print("\n📊 Step 2: Adding sample data...")
    
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Sample vehicles
        sample_vehicles = [
            {
                'model': 'Civic',
                'year': 2022,
                'make': 'Honda',
                'vin': 'HONDA1234567890123',
                'color': 'Blue',
                'category': 'Sedan',
                'plate_number': 'ABC123'
            },
            {
                'model': 'F-150',
                'year': 2021,
                'make': 'Ford',
                'vin': 'FORD1234567890123',
                'color': 'White',
                'category': 'Truck',
                'plate_number': 'XYZ789'
            },
            {
                'model': 'Camry',
                'year': 2023,
                'make': 'Toyota',
                'vin': 'TOYOTA12345678901',
                'color': 'Silver',
                'category': 'Sedan',
                'plate_number': 'DEF456'
            }
        ]
        
        # Insert sample vehicles
        for vehicle in sample_vehicles:
            cur.execute("""
                INSERT INTO vehicles (model, year, make, vin, color, category, plate_number)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (vin) DO NOTHING
                RETURNING id;
            """, (vehicle['model'], vehicle['year'], vehicle['make'], vehicle['vin'], 
                  vehicle['color'], vehicle['category'], vehicle['plate_number']))
            
            result = cur.fetchone()
            if result:
                vehicle_id = result['id']
                print(f"✅ Added vehicle: {vehicle['year']} {vehicle['make']} {vehicle['model']} (ID: {vehicle_id})")
                
                # Add sample maintenance logs for this vehicle
                maintenance_logs = [
                    {
                        'log_type': 'Oil Change',
                        'log_date': date(2024, 1, 15),
                        'notes': 'Changed oil and filter, checked tire pressure'
                    },
                    {
                        'log_type': 'Tire Rotation',
                        'log_date': date(2024, 2, 20),
                        'notes': 'Rotated tires, balanced wheels'
                    }
                ]
                
                for log in maintenance_logs:
                    cur.execute("""
                        INSERT INTO maintenance_logs (vehicle_id, log_type, log_date, notes)
                        VALUES (%s, %s, %s, %s);
                    """, (vehicle_id, log['log_type'], log['log_date'], log['notes']))
                
                # Add sample documents for this vehicle
                sample_documents = [
                    {
                        'document_name': 'Vehicle Registration',
                        'file_mime_type': 'application/pdf',
                        'file_content_base64': 'JVBERi0xLjQKJcOkw7zDtsO...',  # Placeholder
                        'expiry_date': date(2025, 12, 31)
                    },
                    {
                        'document_name': 'Insurance Certificate',
                        'file_mime_type': 'application/pdf',
                        'file_content_base64': 'JVBERi0xLjQKJcOkw7zDtsO...',  # Placeholder
                        'expiry_date': date(2024, 6, 30)
                    }
                ]
                
                for doc in sample_documents:
                    cur.execute("""
                        INSERT INTO vehicle_documents (vehicle_id, document_name, file_content_base64, file_mime_type, expiry_date)
                        VALUES (%s, %s, %s, %s, %s);
                    """, (vehicle_id, doc['document_name'], doc['file_content_base64'], 
                          doc['file_mime_type'], doc['expiry_date']))
        
        conn.commit()
        print("✅ Sample data added successfully!")
        
    except Exception as e:
        print(f"❌ Error adding sample data: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()
    
    # Step 3: Verify data
    print("\n🔍 Step 3: Verifying data...")
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Count vehicles
        cur.execute("SELECT COUNT(*) as count FROM vehicles;")
        vehicle_count = cur.fetchone()['count']
        print(f"✅ Vehicles in database: {vehicle_count}")
        
        # Count maintenance logs
        cur.execute("SELECT COUNT(*) as count FROM maintenance_logs;")
        maintenance_count = cur.fetchone()['count']
        print(f"✅ Maintenance logs in database: {maintenance_count}")
        
        # Count documents
        cur.execute("SELECT COUNT(*) as count FROM vehicle_documents;")
        document_count = cur.fetchone()['count']
        print(f"✅ Documents in database: {document_count}")
        
        # Show sample vehicles
        print("\n📋 Sample vehicles:")
        cur.execute("SELECT id, make, model, year, plate_number FROM vehicles LIMIT 5;")
        vehicles = cur.fetchall()
        for vehicle in vehicles:
            print(f"  - {vehicle['year']} {vehicle['make']} {vehicle['model']} (Plate: {vehicle['plate_number']})")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error verifying data: {e}")
        return False
    
    print("\n🎉 Database initialization completed successfully!")
    print("\n📋 Database Summary:")
    print(f"  - Vehicles: {vehicle_count}")
    print(f"  - Maintenance Logs: {maintenance_count}")
    print(f"  - Documents: {document_count}")
    
    return True

def test_database_connection():
    """Test the database connection."""
    print("🔗 Testing database connection...")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()
        print(f"✅ Database connection successful!")
        print(f"   PostgreSQL version: {version[0]}")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🚛 Logistics Database Initialization")
    print("=" * 50)
    
    # Test connection first
    if not test_database_connection():
        print("\n❌ Cannot proceed without database connection.")
        print("Please check your database configuration in app.py")
        sys.exit(1)
    
    # Initialize database
    if init_database():
        print("\n✅ Database is ready for use!")
        print("\n🌐 You can now start your Flask application:")
        print("   python app.py")
    else:
        print("\n❌ Database initialization failed!")
        sys.exit(1)
