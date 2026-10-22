# INKFORMA — Estudio de tatuajes

App web de estudio con probador anatómico 3D, panel de administración, galería y reservas. Usa JavaScript, Vite, Three.js, un servidor Node.js/Express y SQLite. INKFORMA es un nombre provisional; personalizar información y contacto antes de publicar.

## Ejecutar en Windows

Detén la versión anterior con Ctrl+C en su terminal. Instala Node.js 22.13 o superior (se recomienda Node.js 24 LTS) y abrir una terminal en la carpeta que contiene `package.json`:

```powershell
npm.cmd install
npm.cmd run admin:create
npm.cmd run dev
```

Abre la aplicación en el puerto que muestra el servidor (por defecto 5173). Añade `/admin` a su dirección para entrar al panel. `admin:create` solo hace falta para crear tu primera cuenta; consulta [la guía del servidor](server/README.md). Mantener abierta la terminal. Para obtener esta versión desde GitHub, descargar de nuevo **Code → Download ZIP**, descomprimir y ejecutar esos comandos. Si ya tienes datos de esta versión, conserva tu carpeta `data/` al actualizar o usa `APP_DATA_DIR` para mantenerla fuera del proyecto. Los modelos GLB ya vienen incluidos; no hace falta instalar Blender.

## Entorno de desarrollo

Validado con Node 24. Desde el checkout existente:

```sh
cd /workspace/appweb
npm ci --cache /tmp/inkforma-npm
npm run dev -- --port 5173
```

`npm run build` genera producción en `dist/`; `npm run preview` permite comprobarla. Para producción ejecuta `npm start` después de compilar. Esta versión requiere un servidor Node.js con almacenamiento persistente; GitHub Pages por sí solo ya no ejecuta sus reservas ni el panel. Configuración y copias de seguridad en [server/README.md](server/README.md).

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

WebGL es necesario para el visor. Sin él se puede seguir subiendo y guardando imágenes. Las fuentes de Google son opcionales, con tipografías de respaldo. La app incluye backend, autenticación de administradores, galería, edición de contenido, horarios y reservas. No incluye pagos ni avisos automáticos por correo/WhatsApp. La biblioteca personal del probador sigue siendo local al navegador; las reservas, los trabajos del estudio y el contenido se guardan en SQLite.

## Panel de administración y base de datos

Consulta [server/README.md](server/README.md) para crear la primera cuenta, editar contenido y horarios, gestionar la galería/reservas/modelos, configurar alojamiento y conservar tus datos. La base se crea y conecta automáticamente en el primer arranque; no se necesita una cuenta externa de Supabase.

## Chat de tatuajes con IA

Incluye un chat público especializado en tatuajes y configuración en **Administración → Asistente IA**. Para conectar una clave propia de Gemini desde Google AI Studio, usa `npm.cmd run ai:configure`; después activa el bot desde el panel. Usa un proyecto sin facturación activada y con cuota gratuita disponible; los límites dependen de Google, del modelo y de tu cuenta. La clave se guarda en el servidor, nunca en el navegador ni en Git. Sin clave, el chat muestra que no está disponible. Consulta [la guía de IA](server/README.md#asistente-de-tatuajes-con-ia) para configuración, límites y privacidad.

## Portada interactiva y diseños de prueba

La portada incluye una vista anatómica 3D con tatuaje botánico y control de giro. En pantallas pequeñas o con movimiento reducido se muestra una captura ligera: el visitante decide cuándo cargar la segunda vista 3D. Las vistas dejan de dibujar cuando no están visibles. El probador principal conserva sus controles y biblioteca local.

La sección **¿Qué habla de ti?** presenta cuatro estilos con dibujos de muestra originales: Botánica, Geométrico, Minimalista y Lettering. Al pulsar **Probar este diseño**, se coloca sobre el antebrazo del modelo incluido; se puede mover, girar y guardar como un diseño subido. Estas muestras no representan trabajos reales del estudio.

En **Administración → Galería**, cada publicación puede ser **Trabajo de tatuaje**, **Foto del estudio** o **Artista del estudio**. Publica fotografías reales con su título y descripción para mostrar el espacio y el equipo; la sección se oculta mientras no haya fotos publicadas. El administrador debe contar con los derechos y permisos de las personas fotografiadas.

Los trabajos pueden llevar un **Diseño para el probador** opcional, separado de la foto del tatuaje terminado. Sube el dibujo limpio en PNG transparente, JPG o WEBP (máx. 10 MB por archivo). Solo esos trabajos muestran el botón **Probar un diseño similar**. Se pueden reemplazar o quitar los dibujos desde el panel; los borradores y sus archivos siguen protegidos. Las fotos se optimizan, conservando transparencia y eliminando metadatos.

La actualización añade columnas a SQLite automáticamente al iniciar, sin borrar registros ni archivos. Conserva la carpeta `data` al actualizar; haz una copia con el servidor detenido. El póster de portada se obtuvo de los modelos MakeHuman CC0 incluidos; consulta `public/models/ATTRIBUTION.md`.

## Avisos manuales por WhatsApp

No necesitas registrar un número del estudio en el proyecto ni contratar una API. En **Administración → Reservas**, guarda el estado, fecha, hora, teléfono y **Observaciones para el cliente**. Después pulsa **Notificar por WhatsApp**, revisa o edita el mensaje y pulsa **Abrir WhatsApp**. Se abrirá tu WhatsApp Web o aplicación con el mensaje preparado; tú eliges enviarlo. Debes tener una cuenta de WhatsApp conectada en ese dispositivo, normal o Business.

El número del cliente debe incluir `+` y código de país, por ejemplo `+591 70012345` (también se acepta `00591…`). No se adivina el país de números antiguos o locales: corrígelos en la reserva o en la vista previa. Cambiar el número únicamente en la vista previa no lo guarda en la reserva. El mensaje refleja el estado y horario guardados; los cambios pendientes deben guardarse antes de prepararlo. La vista previa es editable y no envía nada por sí sola.

**Las notas internas nunca se copian al mensaje.** Las observaciones para el cliente se guardan en un campo diferente. El sistema no declara un aviso como enviado ni entregado, ya que un enlace manual no permite comprobarlo. El enlace contiene el número y el mensaje para WhatsApp; evita compartirlo con otras personas. La migración de SQLite añade el campo nuevo sin borrar reservas existentes.

## Categorías, carrusel y teclado del chat

En **Administración → Galería**, escribe una **Nueva categoría** y pulsa **Crear categoría**. Después elige la **Categoría del tatuaje** al subir o editar cada trabajo. Puedes renombrar categorías (el nombre cambia en todas sus fotos) o eliminarlas con confirmación: las imágenes permanecen como **Sin categoría**. Los nombres repetidos se rechazan, incluso con diferencias de mayúsculas o acentos. Las fotos del estudio y de artistas mantienen su sección independiente.

Las categorías que antes escribías como texto se convierten automáticamente en categorías administrables al iniciar, conservando las fotos. La galería pública muestra solo categorías con trabajos publicados, permite filtrar y recorrer las imágenes con flechas o deslizando en celular. Al abrir una imagen se puede pasar a la anterior o siguiente sin cerrar la vista; las flechas del teclado también funcionan. Se conserva **Probar un diseño similar** cuando el trabajo tiene un dibujo adjunto. El carrusel no avanza solo y respeta la preferencia de reducir movimiento.

En el chat, **Enter envía la consulta** y **Shift+Enter añade una línea**. El botón Enviar sigue disponible. No se envían consultas vacías, teclas repetidas ni pulsaciones Enter durante la composición del teclado.
