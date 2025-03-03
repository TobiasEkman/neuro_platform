FROM pytorch/pytorch:1.9.0-cuda10.2-cudnn7-runtime

# Installera systempaket
RUN apt-get update && apt-get install -y \
    git \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Installera Python-paket
RUN pip install --no-cache-dir \
    brats-toolkit \
    SimpleITK \
    pydicom \
    nibabel \
    scikit-image \
    scikit-learn \
    pandas \
    flask \
    flask-cors

# Ladda ner förtränade modeller
RUN mkdir -p /app/models
WORKDIR /app/models
RUN wget https://github.com/neuronflow/BraTS-Toolkit/releases/download/v1.0.0/models.zip \
    && unzip models.zip \
    && rm models.zip

WORKDIR /app
COPY . .

EXPOSE 5005
CMD ["python", "app.py"] 