# Checklist de lanzamiento - Imperial Fitness App

Fecha objetivo: lunes 15 de junio de 2026

## Etapa de hoy: estabilidad técnica, móvil, login, timer, encuestas y dashboard

### 1. Login y acceso

- [x] Login con estado de carga para evitar sensación de congelamiento.
- [x] Contraseña con botón de mostrar/ocultar.
- [x] Registro con campos físicos básicos.
- [x] Recuperación de contraseña con visual consistente.
- [ ] Probar login real con usuario admin.
- [ ] Probar login real con usuario cliente.

### 2. Timer

- [x] Sonido fuerte al cambiar de fase.
- [x] Conteo sonoro 3, 2, 1 antes del cambio.
- [x] Refuerzo visual amarillo durante el conteo.
- [x] Diferenciación visual entre ENTRENO y DESCANSO.
- [ ] Probar sonido en Chrome móvil.
- [ ] Probar sonido en Android.
- [ ] Probar sonido en iPhone, si aplica.

### 3. Encuesta diaria

- [x] Modal con scroll en celular.
- [x] Corrección de pantallas cortadas.
- [x] Botones accesibles en parte inferior.
- [ ] Probar completar encuesta completa desde celular.

### 4. Rutina asignada

- [x] Textos más grandes para cliente.
- [x] Imágenes más visibles.
- [x] Mejor comportamiento responsive.
- [ ] Probar rutina con varios ejercicios.
- [ ] Probar rutina sin imagen.

### 5. Datos físicos e InBody

- [x] Edad.
- [x] Género.
- [x] Estatura.
- [x] Peso.
- [x] Masa muscular.
- [x] Grasa corporal.
- [x] IMC.
- [x] Porcentaje de grasa corporal.
- [x] Nivel de grasa visceral 1-20.
- [x] Tasa metabólica basal.
- [ ] Probar guardado contra Supabase real.

### 6. Dashboard y móvil

- [x] Correcciones responsive principales.
- [x] Evitar cortes horizontales.
- [x] Mejoras de carga inicial.
- [ ] Probar en pantalla de celular pequeña.
- [ ] Probar en pantalla mediana.
- [ ] Probar en navegador de escritorio.

### 7. Base de datos

- [x] Migración creada para campos nuevos.
- [x] Esquemas backend actualizados.
- [x] Modelos backend actualizados.
- [ ] Ejecutar migración `018_user_demographics_inbody.sql` en Supabase.
- [ ] Confirmar que los datos se guardan correctamente.

### 8. Validación técnica

- [x] TypeScript sin errores.
- [x] Build de producción generado.
- [x] Paquete listo para reemplazar en GitHub.
- [ ] Prueba final en producción o preview.

## Pendiente para después del lanzamiento

- Pagos y membresías.
- Notificaciones push.
- Reportes PDF.
- Fotos de progreso.
- Nutrición avanzada.
- Dashboard avanzado de métricas.
- Automatizaciones con IA.
