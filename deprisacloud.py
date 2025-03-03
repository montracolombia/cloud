import os
from google.cloud import storage

# Configuración
CARPETA_LOCAL = "images"  # Cambia esto a la carpeta de imágenes
BUCKET_NAME = "deprisa-cloud"
CREDENTIALS_JSON = "deprisa-subida.json"  # Archivo de credenciales descargado

# Autenticación en Google Cloud
storage_client = storage.Client.from_service_account_json(CREDENTIALS_JSON)
bucket = storage_client.bucket(BUCKET_NAME)

def subir_imagenes():
    for archivo in os.listdir(CARPETA_LOCAL):
        if archivo.endswith(".jpg"):
            blob = bucket.blob(archivo)
            blob.upload_from_filename(os.path.join(CARPETA_LOCAL, archivo))
            print(f"Subido: {archivo}")

if __name__ == "__main__":
    subir_imagenes()
