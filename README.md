# PONCHO 2026 · versión corregida para GitHub Pages + Google Apps Script

## Qué estaba fallando

El repositorio publicado tiene `index.html`, `style.css` y `app.js` en la **raíz**, pero el HTML buscaba los recursos en `css/style.css` y `js/app.js`. Por eso GitHub Pages devolvía los errores 404 y la página aparecía sin diseño ni funcionamiento.

Esta versión usa rutas coherentes con la estructura actual:

```text
PONCHO/
├── index.html
├── style.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── Code.gs
└── README.md
```

## Publicación rápida

1. Reemplazá en GitHub los archivos actuales por los de esta carpeta, todos en la raíz del repositorio.
2. En **Settings → Pages**, seleccioná `Deploy from a branch`, rama `main`, carpeta `/(root)`.
3. Confirmá que la URL siga siendo `https://umpcat.github.io/PONCHO/`.

## Preparar Google Sheets

El backend usa dos planillas:

- **PONCHO 2026**: Usuarios y registros de Personas.
- **MARCATÓN AL PONCHO 2026**: listado y gestión de Comercios.

### Planilla principal PONCHO 2026

Abrí la planilla principal y entrá en **Extensiones → Apps Script**. Pegá el contenido completo de `Code.gs`.

En la parte superior reemplazá:

```javascript
const SHEET_ID_COMERCIOS = "PEGAR_AQUI_EL_ID_DE_LA_PLANILLA_DE_COMERCIOS";
```

por el ID real de la planilla de comercios.

Después ejecutá manualmente una sola vez la función:

```javascript
prepararEstructura
```

Esto crea o completa estas pestañas y encabezados:

- `Usuarios`: Legajo, Apellido y Nombre, Sucursal, Fecha, Hora.
- `AltaTarjeta`
- `HabilitacionTC`
- `ActivacionTC`
- `ElegiMas`
- `Prestamos`
- `Seguros`
- `AppBNA`

### Planilla de comercios

El archivo de Google Sheets debe ser **`EL MARCATÓN AL PONCHO 2026 (Respuestas)`**. El código ya está adaptado a estos encabezados exactos:

```text
Marca temporal
Dirección de correo electrónico
RUBRO
RAZÓN SOCIAL - Apellido y Nombre (Persona Física) / Denominación (Persona Jurídica)
NOMBRE FANTASIA DEL EMPRENDIMIENTO Y/O COMERCIO
CUIT/CUIL
TELÉFONO - SOLO NUMEROS
SECTOR
'+Pagos Nación
PromoAceptada
Senalizado
AgenteRegistro
FechaActualizacion
HoraActualizacion
```

No es necesario renombrar la pestaña interna: `Code.gs` la detecta automáticamente por los encabezados `CUIT/CUIL`, Razón Social y `PromoAceptada`. La búsqueda admite CUIT/CUIL, razón social y nombre de fantasía. En los resultados también muestra rubro, sector y situación de `+Pagos Nación`.

Las últimas cinco columnas se actualizan desde la aplicación:

```text
PromoAceptada | Senalizado | AgenteRegistro | FechaActualizacion | HoraActualizacion
```

No modifiques los títulos de esas columnas ni agregues espacios al principio o al final.

## Implementar Apps Script

1. En Apps Script: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**.
4. Acceso: **Cualquier usuario**.
5. Copiá la URL que termina en `/exec`.

En `index.html`, reemplazá:

```javascript
window.APPS_SCRIPT_URL = "PEGAR_AQUI_LA_URL_DE_APPS_SCRIPT";
```

por la URL `/exec` y hacé commit.

Cada vez que modifiques `Code.gs`, publicá una **nueva versión** desde “Gestionar implementaciones”.

## Prueba mínima

Probá en este orden:

1. Abrir la web y verificar que tenga diseño.
2. Registrar un agente.
3. Buscar un comercio por CUIT o razón social.
4. Marcar Promo y Señalizado y verificar las columnas en Sheets.
5. Registrar una acción de Personas.
6. Abrir Dashboard y comprobar que los KPI y gráficos se actualicen.

## Mejoras incluidas

- Corrección definitiva de las rutas 404.
- Diseño responsive para celular y computadora.
- Registro de sucursal y cambio de agente.
- Validación de DNI, legajo, monto y campos obligatorios.
- Prevención de doble canje por DNI o voucher.
- Dashboard con fechas ordenadas correctamente.
- Estado de comercios sin duplicar categorías.
- Escape de contenido proveniente de Sheets para reducir riesgos de inyección.
- Bloqueo de escrituras simultáneas mediante `LockService`.
- Botones con estado de carga y mensajes de error más claros.
- PWA básica para agregar la app a la pantalla de inicio.

## Actualización visual v3

- Se incorporó el logo BNA provisto.
- Se incorporaron las piezas visuales de PONCHO 2026 y El Marcatón.
- Se agregaron las opciones `Medios de Pago` y `Otros` en Sucursal.
- Los mensajes de carga, éxito, advertencia y error se muestran en ventanas emergentes grandes.
- La carpeta `assets/` debe subirse completa al repositorio.

## Corrección del dashboard

El dashboard ahora cuenta únicamente filas completas y realmente registradas por la aplicación.
No suma filas con formato, fórmulas vacías, contenido residual ni filas incompletas.
Para comercios, el total considera únicamente respuestas con CUIT/CUIL informado.


## Estructura plana para GitHub

Esta variante deja todos los archivos e imágenes en la raíz del repositorio.
No debe renombrarse `app.js` como `index.html`.

La línea de conexión se encuentra en `index.html`:

```html
window.APPS_SCRIPT_URL = "PEGAR_AQUI_LA_URL_DE_APPS_SCRIPT";
```


## Versión V4 · Estilo minimalista y búsqueda por sector

Cambios incluidos:

- Rediseño moderno, más limpio y minimalista.
- Tipografía sans serif de sistema, sin depender de fuentes externas.
- Navegación de Comercios por 19 sectores.
- Búsqueda exacta por la columna `SECTOR`.
- La búsqueda individual también incluye `NOMBRE FANTASIA DEL EMPRENDIMIENTO Y/O COMERCIO`.
- Las tarjetas muestran sector, nombre de fantasía, razón social, CUIT/CUIL, rubro y +Pagos Nación.
- Se corrigieron los encabezados reales de la hoja `EL MARCATÓN AL PONCHO 2026 (Respuestas)`.

Después de pegar el nuevo `Code.gs`, se debe publicar una nueva versión de la implementación de Apps Script.


## Versión V5 · Corrección de pestaña y marca reutilizable

- La pestaña de comercios ya no tiene que llamarse `Respuestas`.
- Apps Script la detecta automáticamente por los encabezados `CUIT/CUIL`, `RAZÓN SOCIAL` y `SECTOR`.
- Se eliminaron de la interfaz las referencias visuales específicas a 2026 y a la edición 55.
- La portada ahora usa una composición gráfica genérica de PONCHO, reutilizable en futuras ediciones.
- La aplicación conserva compatibilidad con agentes guardados en la versión anterior.


## Versión V6 · Links necesarios y registro de terminales

### Links necesarios
El menú principal incorpora accesos directos al formulario de alta de comercio y a los contactos de +Pagos Nación.

### Registro de terminales
La pestaña `Terminales` se crea con:

`Registro, Fecha, Hora, Agente, CUIT/CUIL, RazonSocial, NombreFantasia, Sector, Entrega, Venta, NumeroSerie`

El backend valida el CUIT contra la base de comercios y evita repetir un número de serie.


## Versión V7 · Sistema visual BNA + PONCHO

- Color e icono propios para cada módulo.
- Encabezados contextuales con la identidad del módulo.
- Tipografía, espaciado y botones más cercanos al nuevo BNA+.
- Tramas geométricas inspiradas en PONCHO, reutilizables todos los años.
- Dashboard y formularios con mejor jerarquía visual.
- No modifica el backend ni las hojas de Google Sheets.

Para instalar esta versión visual, reemplazá en GitHub:
`index.html`, `app.js`, `style.css`, `sw.js` y `README.md`.

No hace falta reemplazar `Code.gs`.
