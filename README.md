# INKFORMA — Estudio de tatuajes

Web de estudio con probador anatómico 3D, creada con JavaScript, Vite y Three.js. INKFORMA es un nombre provisional; personalizar información y contacto antes de publicar.

## Ejecutar en Windows

Instalar Node.js 22.12 o superior y abrir una terminal en la carpeta que contiene `package.json`:

```powershell
npm.cmd install
npm.cmd run dev
```

Abrir la dirección que muestra Vite. Mantener abierta la terminal. Para obtener esta versión desde GitHub, descargar de nuevo **Code → Download ZIP**, descomprimir en una carpeta nueva y ejecutar esos comandos. Los modelos GLB ya vienen incluidos; no hace falta instalar Blender.

## Entorno de desarrollo

Validado con Node 24. Desde el checkout existente:

```sh
cd /workspace/appweb
npm ci --cache /tmp/inkforma-npm
npm run dev -- --port 5173
```

`npm run build` genera producción en `dist/`; `npm run preview` permite comprobarla. Publicar el contenido de `dist/` en un alojamiento estático situado en la raíz de un dominio. Si se usa una subcarpeta, configurar `base` de Vite antes de compilar.

## Usar el probador

1. Elegir cuerpo masculino o femenino, contextura y tono de piel.
2. Subir PNG, JPG o WEBP (hasta 10 MB). Al cargar, se activa **Mover tatuaje**.
3. Pulsar y arrastrar sobre cualquier zona visible de piel para colocar o mover el diseño. Funciona con ratón o dedo. Si se sale de la silueta, se conserva la última posición válida.
4. Cambiar a **Girar cuerpo** para rotar y acercar la cámara con rueda o gesto de dos dedos. Las vistas Frente, Espalda y ambos laterales facilitan elegir otra zona. Volver a Mover tatuaje para seguir colocándolo.
5. Ajustar tamaño, rotación e intensidad; reflejar el diseño o retirarlo de la piel.
6. Guardar en biblioteca. Se conservan imagen procesada, cuerpo, tono y posición 3D con tamaño, rotación, intensidad y reflejo. **Usar** recupera la colocación. Los diseños guardados en la versión anterior siguen disponibles, aunque no tenían posición guardada.
7. Descargar el PNG o capturar la vista actual del cuerpo.

### Trabajar por zonas y revisar un brazalete

- En **Zona para tatuar**, elegir brazo completo, brazo superior, antebrazo o pantorrilla de cualquiera de los lados; también pecho o espalda. **Ver solo la zona seleccionada** aísla la sección y centra la cámara. Desmarcarlo vuelve a mostrar el cuerpo como contexto, conservando el diseño. Elegir **Cuerpo completo** devuelve la vista general.
- Pulsar **Probar un brazalete de ejemplo** para ver inmediatamente un patrón que rodea el antebrazo. También se puede subir una imagen propia y elegir **Brazalete envolvente · 360°**. Si no había una extremidad elegida, se selecciona el antebrazo izquierdo.
- Ajustar ancho, posición a lo largo de la extremidad, repeticiones y rotación alrededor de la piel. Arrastrar en Mover tatuaje cambia su posición longitudinal; Girar cuerpo permite examinarla. **Giro 360°** inicia o detiene la inspección automática; cambiar a Mover tatuaje la detiene.
- Revisar el brazalete por delante, detrás y ambos laterales, o girar libremente. El patrón se proyecta alrededor de la malla anatómica completa, utilizando los centros de sus articulaciones; no es una calcomanía plana colocada solo en la cara frontal.
- Usar una franja horizontal cuyos extremos izquierdo y derecho coincidan. La aplicación cierra la vuelta, pero una imagen que no sea continua puede mostrar una unión visible. Las zonas de codo, hombro y curvas pronunciadas pueden deformar el dibujo; elegir el antebrazo o brazo superior por separado facilita revisar el resultado. No se calculan medidas reales de impresión ni de la piel de una persona.
- La biblioteca también guarda zona, aislamiento y los ajustes del brazalete. Los diseños de versiones anteriores siguen funcionando.

Al cambiar de zona se retira la colocación localizada para evitar proyectar sobre otra sección. En modo brazalete, si la nueva zona es una extremidad, se vuelve a aplicar alrededor de ella. Pecho, espalda y cuerpo completo usan el modo localizado.

Al cambiar de cuerpo se retira la colocación localizada para evitar proyectar sobre una anatomía diferente; el diseño cargado permanece disponible. Un brazalete se recalcula sobre la nueva extremidad con los ajustes actuales.

El filtro de fondo elimina tonos blancos o claros con un umbral ajustable. Para tatuajes blancos, desactivarlo y usar PNG transparente. No realiza segmentación de fotografías con fondos complejos.

La biblioteca usa localStorage de este navegador: no sincroniza dispositivos ni requiere cuenta. El espacio es limitado; descargar copias. Las imágenes se procesan localmente y no se envían a un servidor.

## Modelos anatómicos

Se incluyen cuerpos adultos MakeHuman, con rostro, manos y dedos, en GLB: dos archivos de aproximadamente 1.95 MB, con tres contexturas cada uno y referencias de articulaciones por variante. Se descargan desde el propio sitio y se reutilizan en memoria al cambiar de contextura. La anatomía sustituye a los maniquíes geométricos de la primera versión.

Las mallas y los targets originales son CC0 1.0. Fuentes, autores, licencia y commit de origen en [public/models/ATTRIBUTION.md](public/models/ATTRIBUTION.md). El conversor reproducible es `scripts/build-body-models.py`; no se incluye código de la aplicación MakeHuman.

La piel tiene un acabado de escultura con iluminación de estudio, sin texturas fotográficas. Para más realismo se pueden editar los modelos en Blender y añadir texturas PBR de piel con licencia adecuada. La proyección se adhiere a la malla continua y se orienta con las normales de la superficie. Diseños muy grandes o zonas de curvatura extrema pueden recortarse; reducir el tamaño y ajustar la zona. No equivale a una simulación del resultado real del tatuaje.

## Validación

```sh
npm install
npx playwright install chromium
npm test
npm run build
```

En PowerShell usar `npm.cmd` y `npx.cmd`. Las pruebas usan Chromium instalado con Playwright; si existe `/usr/bin/chromium`, lo reutilizan. Se puede indicar otro ejecutable con `CHROMIUM_PATH`.

Las pruebas cubren aislamiento de zonas en ambos modelos, visibilidad del brazalete en cuatro ángulos, recuperación de ajustes de envoltura, las seis variantes de anatomía, quitar fondo claro, arrastre y colocación, separación entre cámara y diseño, recuperación de posición, exportación, gestos táctiles, anchura móvil y recuperación tras errores al cargar modelos.

WebGL es necesario para el visor. Sin él se puede seguir subiendo y guardando imágenes. Las fuentes de Google son opcionales, con tipografías de respaldo. La web no incluye backend, autenticación, reservas ni pagos.
