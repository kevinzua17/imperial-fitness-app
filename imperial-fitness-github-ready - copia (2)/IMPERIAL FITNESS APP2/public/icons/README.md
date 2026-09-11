# Iconos PWA de Imperial Fitness

Estos iconos están generados para Android y iOS.

Corrección aplicada:

- `apple-touch-icon` sin transparencia.
- iconos cuadrados opacos, sin esquinas preredondeadas.
- iconos `maskable` separados para Android.
- nombre visible: `Imperial Fitness`.

Esto evita que iOS muestre el icono como imagen superpuesta o con capas blancas detrás.

Para regenerarlos con un logo nuevo:

```bash
python -m pip install pillow
python scripts/generar_iconos_pwa.py
```

Si vas a reemplazar el logo base primero:

```bash
python scripts/convertir_logo_pwa.py RUTA_DEL_LOGO
```
