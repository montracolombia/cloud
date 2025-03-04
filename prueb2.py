import os

clave = os.getenv("GCS_SECRET_KEY")
if clave:
    print("Clave encontrada:", clave)
else:
    print("Clave secreta no encontrada. Configúrala en las variables de entorno.")
