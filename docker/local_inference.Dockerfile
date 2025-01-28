FROM python:3.9-slim

WORKDIR /app

# Install system dependencies required for cryptography
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directories
RUN mkdir -p /app/data/encrypted_bin_files /app/data/decrypted_bin_files

# Run the application
CMD ["python", "app.py"] 