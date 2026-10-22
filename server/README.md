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
