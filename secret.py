from cryptography.fernet import Fernet

# Generar la clave y guardarla en un archivo
clave = Fernet.generate_key()
with open("clave.key", "wb") as clave_file:
    clave_file.write(clave)

# Leer las credenciales originales
with open("deprisa-subida.json", "rb") as file:
    datos = file.read()

# Encriptar y guardar
cipher = Fernet(clave)
datos_encriptados = cipher.encrypt(datos)

with open("deprisa-subida.json", "wb") as file:
    file.write(datos_encriptados)


print("✅ Archivo encriptado correctamente.")
print("Clave de desencriptado (GUÁRDALA SEGURO):", clave.decode())
print("Datos encriptados:", datos_encriptados.decode())
