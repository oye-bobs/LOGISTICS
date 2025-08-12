import os

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    STATIC_FOLDER = 'static'
    STATIC_URL_PATH = '/static'
    
    # Database configuration
    DATABASE_URL = os.environ.get('DATABASE_URL') or "postgresql://postgres:desmond@localhost:5432/logistics_db"

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    
    # Ensure static files are served correctly in production
    STATIC_FOLDER = 'static'
    STATIC_URL_PATH = '/static'

class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = True
    TESTING = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
