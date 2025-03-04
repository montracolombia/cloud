import os
from cryptography.fernet import Fernet

# Obtener la clave encriptada desde las variables de entorno
clave_encriptada = os.getenv("GCS_SECRET_KEY")

if not clave_encriptada:
    raise ValueError("Clave secreta no encontrada. Configúrala en las variables de entorno.")

# Convertir la clave en bytes
clave_bytes = clave_encriptada.encode()

# Desencriptar las credenciales
f = Fernet(clave_bytes)

try:
    with open("temp_gcs_credentials.json", "rb") as file:
        datos_encriptados = file.read()

    datos_desencriptados = f.decrypt(datos_encriptados)

    # Verificar el contenido antes de escribirlo
    print("Contenido desencriptado:", datos_desencriptados.decode())

    with open("temp_gcs_credentials.json", "wb") as file:
        file.write(datos_desencriptados)

    print("Archivo JSON de credenciales desencriptado correctamente.")

except Exception as e:
    print("Error al desencriptar las credenciales:", e)
