# Imagen base de Python 3.10
FROM python:3.10

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos al contenedor
COPY . /app

# Copia el archivo de credenciales al contenedor
COPY deprisa-consulta.json /app/deprisa-consulta.json

# Define la variable de entorno dentro del contenedor
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/deprisa-consulta.json"

# Instalar dependencias
#RUN pip install --no-cache-dir fastapi uvicorn google-cloud-storage python-jose[cryptography]
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Exponer el puerto 8080 (necesario para Cloud Run)
EXPOSE 8080

# Comando para ejecutar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
