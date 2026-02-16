# POS Offline Ready

POS web instalable (PWA) que funciona sin internet para registrar ventas y sincroniza automáticamente cuando vuelve la conexión.

## Características

- Registro de ventas en almacenamiento local (`localStorage`).
- Cola de ventas pendientes (`synced: false`) cuando no hay internet o falla la API.
- Reintento automático de sincronización al recuperar conexión (`online`).
- Botón de sincronización manual.
- Instalación como app (`manifest.webmanifest` + Service Worker).
- Cache offline para la interfaz.

## Ejecutar

```bash
python3 -m http.server 4173
```

Abrir `http://localhost:4173`.

> Para sincronización real, expón un endpoint `POST /api/sales` en el mismo origen. Si ese endpoint no existe, las ventas seguirán en cola hasta que exista conectividad + API disponible.
