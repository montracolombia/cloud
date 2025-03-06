from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from google.oauth2 import service_account
import os
import base64
import json
from datetime import timedelta

# Obtener la credencial en Base64 desde la variable de entorno
encoded_credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if not encoded_credentials:
    raise ValueError("❌ No se encontró la variable GOOGLE_APPLICATION_CREDENTIALS en las variables de entorno.")

# Decodificar la credencial en Base64
credentials_info = json.loads(base64.b64decode(encoded_credentials).decode("utf-8"))

# Crear credenciales en memoria
credentials = service_account.Credentials.from_service_account_info(credentials_info)

# Inicializar cliente de Google Cloud Storage con credenciales en memoria
client = storage.Client(credentials=credentials)
bucket_name = "cloudmontra"
bucket = client.bucket(bucket_name)

print("✅ Google Cloud Storage Client Configurado Correctamente en Memoria")

app = FastAPI()

# Configuración de CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1:5500",
    "https://fastapi-backend-201226788937.us-central1.run.app",
    "https://montracolombia.github.io"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Búsqueda de imágenes por SKU
@app.get("/search/{sku}")
def search_images(sku: str):
    """Buscar imágenes en GCS por SKU"""
    blobs = client.list_blobs(bucket_name)  # Obtener todos los archivos

    # Filtrar archivos que contengan el SKU en cualquier parte del nombre
    images = [
        f"https://storage.googleapis.com/{bucket_name}/{blob.name}"
        for blob in blobs if sku in blob.name
    ]

    if not images:
        raise HTTPException(status_code=404, detail="No se encontraron imágenes para el SKU proporcionado")

    return {"images": images}

# Generar URL firmada para descargar imágenes privadas
@app.get("/download/{image_name}")
def download_image(image_name: str):
    """Generar una URL firmada para descargar una imagen privada"""
    blob = bucket.blob(image_name)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    try:
        url_firmada = blob.generate_signed_url(expiration=timedelta(minutes=15), version="v4")
        return {"download_url": url_firmada}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al generar la URL firmada: {e}")

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de FastAPI"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))  # Cloud Run usa PORT=8080
    uvicorn.run(app, host="0.0.0.0", port=port)
