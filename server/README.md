# Base de datos y servidor de INKFORMA

La aplicación ahora utiliza un backend Node.js/Express y SQLite persistente. No depende de una cuenta de Supabase ni de servicios externos para gestionar contenido, archivos o reservas.

## Primera cuenta (una sola vez)

Desde una terminal dentro de la carpeta del proyecto:

```powershell
npm.cmd install
npm.cmd run admin:create
npm.cmd run dev
```

El asistente pide correo y contraseña (mínimo 12 caracteres) y confirmación. La contraseña no se muestra ni se guarda en texto plano. No hay credenciales predeterminadas, registro público ni cuenta de pruebas en la base real. Abre la página, añade `/admin` a su dirección e inicia sesión. Para cambiar la contraseña, usa Mi cuenta; si pierdes el acceso, desde la máquina del servidor puedes crear otra cuenta con un correo diferente mediante el mismo comando.

El administrador puede editar contenido del estudio y horarios, gestionar imágenes publicadas o en borrador, confirmar/reprogramar/cancelar reservas, eliminar sus datos y subir/publicar/eliminar modelos GLB.

## Almacenamiento real

La primera ejecución crea automáticamente:

- `data/inkforma.sqlite`: contenido, administradores, sesiones, referencias multimedia y reservas.
- `data/media/`: imágenes optimizadas y modelos GLB.
- Archivos auxiliares SQLite WAL/SHM, si existen.

Esta carpeta está excluida de Git. Los archivos no se guardan dentro del código ni se suben al repositorio. Los datos sobreviven a reinicios en la misma carpeta/disco. Una copia nueva del proyecto tendrá su propia base vacía: al actualizar, conserva tu carpeta `data/` o apunta `APP_DATA_DIR` a un directorio estable. No la compartas porque contiene datos privados y hashes de contraseñas.

Para una copia de seguridad, detén la aplicación y copia **toda** la carpeta de datos, incluidos archivos SQLite auxiliares y `media/`. Para restaurar, usa esa carpeta con la aplicación detenida. Configura copias periódicas en el alojamiento que elijas.

## Publicación en un servidor

Se necesita alojamiento que ejecute Node.js y tenga disco persistente. Una publicación estática en GitHub Pages ya no es suficiente para el backend. No se ha contratado ni desplegado alojamiento externo.

```sh
npm ci
npm run build
npm start
```

Opciones del proceso:

| Variable | Uso |
| --- | --- |
| `APP_DATA_DIR` | Ruta persistente fuera del checkout. Por defecto `data/` en el directorio de trabajo. |
| `PORT` | Puerto HTTP; por defecto 5173. |
| `HOST` | Interfaz; por defecto 0.0.0.0. |
| `PUBLIC_ORIGIN` | Origen HTTPS público exacto, por ejemplo `https://tustudio.example`; activa cookies seguras y fija el origen permitido para operaciones de escritura. |

Configura estas variables en tu alojamiento o terminal. `.env.example` es documentación; el servidor no carga `.env` automáticamente. No necesitas ninguna clave de Supabase. En producción usa HTTPS y establece `PUBLIC_ORIGIN`. La carpeta `dist/` solo contiene el frontend; las rutas API y archivos protegidos los sirve el backend.

## Reservas

Cada horario corresponde a **una consulta del estudio**, no a una sesión completa de tatuaje ni a la agenda individual de varios artistas. El administrador configura días, apertura, cierre, duración de cada consulta y zona horaria. Las solicitudes admiten fechas dentro de los próximos 180 días.

Las reservas pendientes y confirmadas ocupan el horario. Un índice único en SQLite evita reservas simultáneas del mismo turno, incluso si dos personas envían a la vez. Cancelar libera el horario. El administrador puede reprogramar, añadir notas privadas o borrar los datos. Cambiar horarios globales no reprograma reservas existentes.

Las solicitudes no envían correos, WhatsApp ni pagos automáticamente. El estudio debe contactar al cliente y confirmar la cita. Se requiere consentimiento para gestionar sus datos, que no se publican en el API público. Antes de operar con clientes reales, ajusta los textos de privacidad y la política de conservación a tu estudio.

## Permisos y archivos

- Contraseñas derivadas con scrypt y sal aleatoria. Sesiones aleatorias almacenadas por hash, con vencimiento de 8 horas y cookies HttpOnly/SameSite Strict.
- Las rutas de administración verifican la sesión en el servidor. No basta con mostrar u ocultar botones.
- Se valida el origen de todas las peticiones de escritura; login y solicitudes de reserva tienen límites de frecuencia por dirección IP.
- Imágenes de hasta 10 MB se decodifican con Sharp, se limitan a 40 MP, se orientan y convierten a WEBP con un máximo de 2400 px. Se eliminan metadatos; no se aceptan SVG ni archivos que solo simulen ser imágenes.
- Los borradores multimedia solo se sirven a administradores autenticados. Los datos SQLite no se sirven públicamente, ni siquiera en desarrollo.
- GLB de hasta 30 MB y 500.000 triángulos, con texturas/datos incluidos, sin animaciones, esqueleto ni compresores no soportados. Los modelos se guardan como borradores, con vista previa antes de publicarlos.
- Los modelos personalizados se normalizan en el visor y admiten diseños localizados y tono de piel. No tienen calibración anatómica automática: las zonas/brazaletes permanecen disponibles en los modelos incluidos. Para añadir esa compatibilidad a otro modelo se necesita un calibrador de articulaciones específico.

## Esquema

`admins` → `sessions`; `settings` guarda el contenido y horario del estudio; `gallery` y `body_models` contienen referencias a archivos; `bookings` almacena solicitudes y notas privadas. Las tablas se crean desde `server/db.js` con consultas parametrizadas. No se envían correos ni mensajes a servicios externos.

## Pruebas

`npm test` inicia una base **aislada en el directorio temporal del sistema** y una cuenta ficticia solo para pruebas. Las pruebas cubren permisos reales, sesión, origen/CSRF, privacidad de borradores, validación de imágenes, reservas y conflictos de horario, edición desde el panel, modelos publicados y el probador 3D. Esa cuenta nunca se crea mediante el arranque normal.

## Asistente de tatuajes con IA

El chat utiliza Google Gemini (`generateContent`, modelo predeterminado `gemini-2.5-flash-lite`). Gemini dispone de cuotas gratuitas sujetas al modelo, país, cuenta y disponibilidad. **Para evitar consumo de pago, usa un proyecto sin facturación activada; la app no contrata planes ni cambia automáticamente a servicios de pago.** Revisa las condiciones actuales en https://ai.google.dev/gemini-api/docs/pricing y los límites en https://ai.google.dev/gemini-api/docs/rate-limits. Está desactivado por defecto y no genera respuestas de IA si falta la clave. No hay respuestas simuladas en el arranque normal.

Para activarlo en tu computadora, ejecuta una vez en la carpeta del proyecto:

```powershell
npm.cmd run ai:configure
```

El asistente pide una clave de Gemini sin mostrarla. Créala desde https://aistudio.google.com/apikey en un proyecto con cuota gratuita disponible, sin activar facturación. Nunca pegues claves en un chat, en el código ni en Git. La clave se guarda en `data/gemini-key.txt` (o dentro de `APP_DATA_DIR`), fuera del repositorio, con permisos privados. Las copias de esa carpeta también contendrán la clave: mantenlas privadas. Otra opción, adecuada para alojamiento, es inyectar `INKFORMA_GEMINI_KEY` como variable de servidor; esa variable tiene prioridad sobre el archivo. No uses variables `VITE_` para credenciales.

Después entra a **Administración → Asistente IA**, añade las preguntas frecuentes y activa el asistente. El panel muestra si hay una clave configurada, no su valor; presencia no significa que la clave ya se haya validado con el proveedor. La validez se comprueba cuando se envía una consulta. Si la guardaste por archivo, no hace falta reiniciar; si añadiste una variable de entorno, reinicia el proceso para que la reciba.

El bot recibe exclusivamente el texto de la conversación y la descripción/contacto/horarios/FAQ del estudio. Sus instrucciones restringen el ámbito a tatuajes, preparación y cuidados generales, el probador y el estudio; no inventa tarifas ni confirma reservas. No recibe las tablas de clientes, contraseñas ni datos privados. La especialización depende de instrucciones al modelo; no equivale a supervisión de un tatuador o un profesional sanitario.

Las conversaciones se mantienen en memoria del navegador y no se guardan en SQLite. Cada pregunta y su contexto se envían a Google Gemini. En servicios gratuitos, Google puede usar las entradas y respuestas para mejorar sus productos según sus condiciones; no envíes información sensible. El visitante recibe un aviso antes de escribir. No existe carga de fotografías al bot.

El servidor limita cada conversación a 12 mensajes / 12.000 caracteres de contexto, cada pregunta a 2000 caracteres y la respuesta a 500 tokens. Admite 8 solicitudes por minuto/IP y un máximo global configurable de 1–500 intentos por día UTC, conservado en SQLite. Los errores y timeouts consumen un intento. El contador no es un presupuesto monetario exacto: configura también los límites de uso del proveedor. El dominio de Gemini es fijo, las claves nunca viajan al navegador y los errores no exponen detalles privados del proveedor.

Las pruebas del chat usan un proveedor **simulado exclusivamente en el arranque aislado de QA**. Validan interfaz, contexto, validación, errores, permisos y cuotas sin hacer llamadas externas. Para validar respuestas reales hace falta una clave válida y acceso al modelo; esa validación no se ha ejecutado cuando falta la clave.

Si ya tenías OpenAI configurado, ejecuta de nuevo `npm.cmd run ai:configure`: la clave anterior no se reutiliza ni se elimina. Se conservan la base de datos, galería, reservas y ajustes del asistente. Después reinicia el servidor y revisa su activación en el administrador.

Si el modelo deja de estar disponible, el responsable del servidor puede indicar un modelo Gemini compatible mediante `INKFORMA_GEMINI_MODEL` y reiniciar. Comprueba primero que tenga cuota gratuita. El servidor no selecciona otro modelo automáticamente. Ante una cuota agotada (HTTP 429), el chat pide esperar; no se cambia a un plan de pago. Una clave inválida, un modelo no disponible o una respuesta bloqueada muestran un error seguro sin revelar detalles del proveedor. Si tu alojamiento limita salidas de red, permite HTTPS hacia `generativelanguage.googleapis.com`.

### Diagnosticar errores de Gemini

Ejecuta `npm.cmd run ai:check`. Solo consulta la lista de modelos: no envía conversaciones ni genera respuestas, y nunca muestra la clave. Comprueba conectividad, aceptación de la clave y si el modelo configurado aparece. La disponibilidad en esa lista no garantiza cuota gratuita de generación; revísala en Google AI Studio. Los errores de permisos, clave, modelo y cuota ahora tienen mensajes distintos.

Si el modelo no aparece, el diagnóstico muestra modelos accesibles. Comprueba la cuota gratuita del modelo elegido y, en PowerShell, establece `$env:INKFORMA_GEMINI_MODEL="ID_DEL_MODELO"`; después inicia `npm.cmd run dev` en esa misma terminal. No se cambia de modelo ni se activa facturación automáticamente. Si la clave es rechazada, vuelve a ejecutar `npm.cmd run ai:configure`. Si hay una variable `INKFORMA_GEMINI_KEY` inyectada en el servidor, tiene prioridad: actualízala en la configuración de tu alojamiento.

Si listar modelos funciona pero el chat devuelve 404, comprueba el modelo mostrado en **Administración → Asistente IA**. En la misma terminal donde configuraste `INKFORMA_GEMINI_MODEL`, ejecuta `npm.cmd run ai:check -- --generate`: hace una consulta breve real, consume cuota del proyecto y no activa pagos. Muestra el modelo usado, el código HTTP y, si existe, el estado de Google; no imprime claves ni errores crudos del proveedor. Si funciona, reinicia el servidor desde esa terminal y verifica que abres su puerto. Un HTTP 404 significa que Google rechazó esa ruta de generación; listar modelos por sí solo no demuestra acceso a la generación.

La prueba directa también muestra el texto explicativo de Google únicamente en la terminal, ocultando la clave utilizada, patrones de claves Google, correos e identificadores de proyecto. No imprime cabeceras ni objetos de error completos. Comprueba que no haya información privada antes de compartir el resultado. El chat público sigue mostrando mensajes fijos.

### Publicaciones y diseños probables en 3D

La tabla `gallery` añade `kind` (`work`, `studio`, `artist`) y `design_filename` opcional mediante una migración aditiva e idempotente. Los registros antiguos siguen siendo trabajos (`work`). El API público devuelve publicaciones publicadas y su `designUrl`, si existe; el frontend separa trabajos del espacio y los artistas. No se crean perfiles ni fotos ficticias.

Las cargas autenticadas de galería aceptan `image` y `design` como archivos separados, máximo 10 MB cada uno, con validación real por Sharp. Los diseños también se optimizan a WEBP con transparencia, se guardan en el directorio privado y solo se sirven si la publicación es pública o el visitante tiene sesión administrativa. Editar sin adjuntar otro diseño conserva el anterior; `removeDesign: true`, cambiar a una foto de estudio/artista o eliminar la publicación retira el archivo correspondiente. Un error de carga no reemplaza el diseño existente.

### WhatsApp manual desde reservas

La migración añade `bookings.client_note` (texto vacío en reservas anteriores). El API administrativo permite actualizar este campo (máx. 1500 caracteres) y corregir `phone`; las actualizaciones parciales conservan las notas internas y observaciones existentes. No se exponen en el API público. La composición ocurre en el navegador del administrador usando solo nombre, marca pública, estado, fecha, hora, referencia y observaciones del cliente; nunca `admin_note`. El enlace usa `https://wa.me/` con número internacional y texto codificado, se abre con `noopener noreferrer` por una acción explícita y no requiere secretos, llamadas de servidor, webhooks ni cuentas de Meta. No representa un envío automático ni confirma entrega.
