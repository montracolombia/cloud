import os
from cryptography.fernet import Fernet

# Obtener la clave encriptada desde las variables de entorno
clave_encriptada = os.getenv("GCS_SECRET_KEY")

if not clave_encriptada:
    raise ValueError("Clave secreta no encontrada. Configúrala en las variables de entorno.")

# Convertir la clave en bytes
clave_bytes = clave_encriptada.encode()

# Encriptar las credenciales
f = Fernet(clave_bytes)

try:
    with open("deprisa-subida.json", "rb") as file:
        datos = file.read()

    datos_encriptados = f.encrypt(datos)

    # Verificar el contenido antes de escribirlo
    print("Contenido encriptado:", datos_encriptados.decode())

    with open("deprisa-subida.json", "wb") as file:
        file.write(datos_encriptados)

    print("Archivo JSON de credenciales encriptado correctamente.")

except Exception as e:
    print("Error al encriptar las credenciales:", e)
