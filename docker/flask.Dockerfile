FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY services/patient_management/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY services/patient_management .

ENV FLASK_APP=app.py
ENV FLASK_ENV=development
ENV MONGO_URL=mongodb://mongodb:27017

EXPOSE 5004

CMD ["flask", "run", "--host=0.0.0.0", "--port=5004"] 