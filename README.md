# 🚛 Logistics Vehicle Management System

A comprehensive Flask-based web application for managing vehicle fleets, maintenance logs, and document tracking in logistics operations.

## ✨ Features

### 🚗 Vehicle Management
- **Vehicle Registration**: Add new vehicles with detailed information (make, model, year, VIN, color, category, plate number)
- **Vehicle Details**: View comprehensive vehicle information including images
- **Vehicle Updates**: Edit vehicle information and details
- **Vehicle Deletion**: Remove vehicles from the fleet
- **Fuel Tracking**: Monitor fuel levels and last fueled dates

### 🛠️ Maintenance Management
- **Maintenance Logs**: Record and track maintenance activities
- **Maintenance History**: View complete maintenance history for each vehicle
- **Maintenance Alerts**: Automatic alerts for overdue maintenance (2+ weeks)

### 📄 Document Management
- **Document Upload**: Store vehicle-related documents (insurance, registration, etc.)
- **Document Tracking**: Monitor document expiry dates
- **Document Updates**: Edit document information and expiry dates
- **Document Deletion**: Remove outdated documents

### ⚠️ Smart Alerts System
- **Low Fuel Alerts**: Automatic notifications for vehicles with low fuel
- **Maintenance Reminders**: Alerts for vehicles requiring maintenance
- **Document Expiry Warnings**: Notifications for expiring documents

## 🛠️ Technology Stack

- **Backend**: Flask (Python)
- **Database**: PostgreSQL
- **Frontend**: HTML, CSS, JavaScript
- **Database Adapter**: psycopg2

## 📋 Prerequisites

Before running this application, make sure you have:

- Python 3.7 or higher
- PostgreSQL database server
- pip (Python package installer)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd LOGISTICS
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up PostgreSQL Database**
   - Create a new PostgreSQL database named `logistics_db`
   - Update the database connection string in `app.py`:
     ```python
     DATABASE_URL = "postgresql://username:password@localhost:5432/logistics_db"
     ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the application**
   - Open your web browser and navigate to `http://localhost:5000`

## 📁 Project Structure

```
LOGISTICS/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
├── static/               # Static assets
│   ├── style/           # CSS files
│   └── script/          # JavaScript files
├── templates/            # HTML templates
│   ├── index.html       # Main vehicle registration page
│   └── vehicle_details.html  # Vehicle details page
└── .git/                # Git repository
```

## 🔌 API Endpoints

### Vehicle Management
- `GET /` - Main vehicle registration page
- `GET /vehicle_details/<vehicle_id>` - Vehicle details page
- `GET /api/cars` - Get all vehicles with alerts
- `GET /api/vehicles/<vehicle_id>/details` - Get detailed vehicle information
- `POST /api/register_vehicle` - Register a new vehicle
- `PUT /api/vehicles/<vehicle_id>` - Update vehicle information
- `DELETE /api/vehicles/<vehicle_id>` - Delete a vehicle

### Maintenance Management
- `POST /api/vehicles/<vehicle_id>/maintenance` - Add maintenance log
- `DELETE /api/maintenance_logs/<log_id>` - Delete maintenance log

### Document Management
- `POST /api/vehicles/<vehicle_id>/documents` - Upload document
- `PUT /api/documents/<document_id>` - Update document
- `DELETE /api/documents/<document_id>` - Delete document

## 🗄️ Database Schema

### Vehicles Table
- `id` - Primary key
- `model`, `year`, `make` - Vehicle specifications
- `vin` - Vehicle Identification Number (unique)
- `color`, `category`, `plate_number` - Additional details
- `main_image_base64` - Vehicle image (base64 encoded)
- `last_fueled_date`, `fuel_level` - Fuel tracking
- `created_at`, `updated_at` - Timestamps

### Maintenance Logs Table
- `id` - Primary key
- `vehicle_id` - Foreign key to vehicles
- `log_type`, `log_date`, `notes` - Maintenance details
- `created_at` - Timestamp

### Vehicle Documents Table
- `id` - Primary key
- `vehicle_id` - Foreign key to vehicles
- `document_name`, `file_content_base64` - Document details
- `file_mime_type`, `expiry_date` - Document metadata
- `uploaded_at` - Timestamp

## 🔧 Configuration

### Database Configuration
Update the `DATABASE_URL` in `app.py` with your PostgreSQL credentials:
```python
DATABASE_URL = "postgresql://username:password@localhost:5432/logistics_db"
```

### Environment Variables (Optional)
For production deployment, consider using environment variables:
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/logistics_db"
export FLASK_ENV="production"
```

## 🚀 Deployment

### Local Development
```bash
python app.py
```

### Production Deployment
For production deployment, consider using:
- Gunicorn or uWSGI as WSGI server
- Nginx as reverse proxy
- Environment variables for configuration
- SSL certificates for HTTPS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the existing issues in the repository
2. Create a new issue with detailed information
3. Contact the development team

## 🔄 Version History

- **v1.0.0** - Initial release with basic vehicle management
- **v1.1.0** - Added maintenance tracking and alerts
- **v1.2.0** - Added document management system
- **v1.3.0** - Enhanced alert system and UI improvements

---

**Built with ❤️ for efficient logistics management**
