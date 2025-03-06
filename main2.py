from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from google.cloud import storage
import os

# Configuración del cliente de Google Cloud Storage
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "deprisa-consulta.json"
client = storage.Client()
bucket_name = "deprisa-cloud"
bucket = client.bucket(bucket_name)

app = FastAPI()

# Modelo para autenticación
class UserLogin(BaseModel):
    username: str
    password: str

# Simulación de usuarios (en un entorno real, usar una BD)
users_db = {
    "admin": {"password": "admin123", "role": "consulta"},
}

# Autenticación simple
def authenticate_user(user: UserLogin):
    if user.username in users_db and users_db[user.username]["password"] == user.password:
        return True
    raise HTTPException(status_code=401, detail="Credenciales incorrectas")

@app.post("/login")
def login(user: UserLogin):
    if authenticate_user(user):
        return {"message": "Login exitoso"}

@app.get("/search/{sku}")
def search_images(sku: str):
    blobs = client.list_blobs(bucket_name, prefix=sku)
    images = [f"https://storage.googleapis.com/{bucket_name}/{blob.name}" for blob in blobs]
    return {"images": images}

@app.get("/download/{image_name}")
def download_image(image_name: str):
    blob = bucket.blob(image_name)
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return {"download_url": blob.public_url}
