# Subir Imperial Fitness a GitHub sin error de “too many files”

No uses **GitHub Web → Upload files** para este proyecto. GitHub Web se bloquea cuando hay muchos archivos.

Usa una de estas dos opciones:

## Opción recomendada: GitHub Desktop

1. Abre GitHub Desktop.
2. Ve a **File → Add local repository**.
3. Selecciona esta carpeta del proyecto.
4. Si GitHub Desktop dice que no es repositorio Git, elige **create a repository**.
5. En la parte inferior escribe el commit:
   `Primer despliegue Imperial Fitness App`
6. Presiona **Commit to main**.
7. Presiona **Publish repository**.
8. Marca **Keep this code private**.
9. Publica el repositorio.

## Opción con doble clic en Windows

1. Crea en GitHub un repositorio privado vacío llamado:
   `imperial-fitness-app`
2. Copia la URL HTTPS del repositorio, por ejemplo:
   `https://github.com/TU_USUARIO/imperial-fitness-app.git`
3. Ejecuta el archivo:
   `SUBIR_A_GITHUB_WINDOWS.bat`
4. Cuando te pida la URL, pégala y presiona Enter.

## Importante

Este proyecto ya incluye `.gitignore`, por eso no se subirán:

- `node_modules/`
- `dist/`
- `build/`
- `.env`
- `backend/.env`
- `venv/`
- `__pycache__/`
- archivos temporales o privados

Los archivos `.env.example` y `.env.pilot.example` sí se suben porque solo son plantillas, no contienen claves reales.
