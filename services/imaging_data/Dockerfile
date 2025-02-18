FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create the upload directory
RUN mkdir -p /data/dicom

EXPOSE 5003

CMD ["python", "app.py"] 