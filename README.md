# INKFORMA — Estudio de tatuajes

Primera versión de una web de estudio con probador 3D, creada con JavaScript, Vite y Three.js. INKFORMA es un nombre provisional; el contacto y la identidad del estudio se deben personalizar antes de publicar.

## Desarrollo

Requiere Node.js 22.12+ (validado con Node 24).

```sh
cd /workspace/appweb
npm ci --cache /tmp/inkforma-npm
npm run dev -- --port 5173
```

Para producción: `npm run build`. Los archivos generados quedan en `dist/`; `npm run preview` permite comprobarlos.

## Probador

- Arrastrar gira el cuerpo; la rueda permite acercar o alejar.
- Elegir modelo masculino o femenino, tres contexturas y color de piel.
- Subir PNG, JPG o WEBP (hasta 10 MB); hacer clic en el cuerpo para colocar el tatuaje. Ajustar tamaño y rotación. Al cambiar el cuerpo, volver a colocar el diseño.
- El filtro elimina píxeles claros con un umbral ajustable. Para dibujos blancos o diseños con tonos claros, desactivarlo y usar PNG transparente. No realiza segmentación de fondos complejos.
- La biblioteca guarda imágenes procesadas y preferencias corporales en localStorage de este navegador. No guarda la posición 3D del tatuaje, no sincroniza dispositivos y no requiere cuenta. Se puede descargar cada PNG y capturar una vista del cuerpo.
- Las imágenes se procesan localmente; no se envían a un servidor. El almacenamiento del navegador es limitado. Descargar copias para conservarlas.

## Modelos y siguientes mejoras

Los cuerpos actuales se generan con primitivas geométricas. Sirven para validar la interacción; no son modelos anatómicos de producción. La proyección se limita a la pieza corporal seleccionada y puede cortarse en uniones.

Para producción recomiendo crear o adquirir con licencia dos mallas anatómicas en Blender, con UV sin solapamientos y topología continua, y exportar en GLB/glTF. Crear morph targets de contextura sobre la misma topología; usar un material de piel separado y conservar escala y orientación coherentes. Integrarlos con GLTFLoader y sustituir el generador actual. Una malla continua mejora la proyección en articulaciones. Para guardar colocaciones, almacenar modelo, transformaciones del decal y diseño en una base de datos con almacenamiento de imágenes.

Para fondos fotográficos complejos, integrar un modelo de segmentación en navegador o un servicio con servidor; no exponer claves en el frontend. La web actual no incluye autenticación, reservas, pagos ni backend.

Las fuentes de Google son opcionales: la interfaz tiene fuentes de respaldo si no hay conexión. WebGL es necesario para el visor; sin él se puede seguir subiendo y guardando diseños.
