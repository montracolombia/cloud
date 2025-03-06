from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from google.cloud import storage
from google.oauth2 import service_account
from jose import JWTError, jwt
import os
import base64
import json
from datetime import timedelta, datetime
from typing import Optional

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

# Configuración de JWT
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

# Base de datos interna de usuarios
fake_users_db = {
    "user1": {
        "username": "user1",
        "password": "password1",
    },
    "user2": {
        "username": "user2",
        "password": "password2",
    },
    "user3": {
        "username": "user3",
        "password": "password3",
    },
}

def authenticate_user(username: str, password: str):
    user = fake_users_db.get(username)
    if user and user["password"] == password:
        return user
    return None

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/search/{sku}")
def search_images(sku: str, token: str = Depends(verify_token)):
    """Buscar imágenes en GCS por SKU y generar URLs firmadas"""
    blobs = client.list_blobs(bucket_name)  # Obtener todos los archivos

    images = []
    for blob in blobs:
        if sku in blob.name:
            url_firmada = blob.generate_signed_url(expiration=timedelta(minutes=15), version="v4")
            images.append(url_firmada)

    if not images:
        raise HTTPException(status_code=404, detail="No se encontraron imágenes para el SKU proporcionado")

    return {"images": images}

# Generar URL firmada para descargar imágenes privadas
@app.get("/download/{image_name}")
def download_image(image_name: str, token: str = Depends(verify_token)):
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
