# APK Android - paso a paso con Capacitor

Antes de generar APK, primero asegúrate de que el frontend esté apuntando al backend real.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Crear proyecto Android si todavía no existe

```bash
npm run mobile:add:android
```

## 3. Compilar frontend y sincronizar Capacitor

```bash
npm run mobile:build
```

## 4. Abrir Android Studio

```bash
npm run mobile:android
```

## 5. Generar APK

En Android Studio:

1. Build.
2. Build Bundle(s) / APK(s).
3. Build APK(s).

## 6. Generar AAB para Play Store

Para Google Play se recomienda AAB:

1. Build.
2. Generate Signed Bundle / APK.
3. Android App Bundle.
4. Crear o usar keystore.
5. Guardar el `.aab`.

## 7. Recomendación para piloto

Primero distribuir APK manualmente a 10-20 clientes conocidos. No subir a Play Store hasta que el piloto esté estable.
