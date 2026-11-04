# NovaCommerce QA Lab

Laboratorio académico independiente de BitForge para ejercitar CU-01, CE-04, VL-05, TD-02 y ME-04. No forma parte del proyecto Katalon ni modifica las Entregas 1, 2 o 3. Los pagos son simulados y no hay integraciones externas.

## Requisitos

- Node.js 20+ y npm 10+.
- Windows, macOS o Linux.

## Instalación y ejecución

Desde esta carpeta:

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`. API: `http://localhost:3001/api/health`.

## Docker Compose (recomendado en Windows)

Con Docker Desktop abierto, desde esta carpeta:

```bash
docker compose up --build -d
```

Abre `http://localhost:5173`. La API se publica en `http://localhost:3001`; SQLite persiste en el volumen Docker `lab-data`. Los puertos están limitados a `127.0.0.1`.

Validar pruebas dentro de un contenedor:

```bash
docker compose run --rm api npm test
docker compose run --rm api npm run build
```

Ver estado y logs:

```bash
docker compose ps
docker compose logs -f
```

Detener los contenedores sin borrar los datos:

```bash
docker compose down
```

El reset de la aplicación restablece los fixtures; el volumen `lab-data` se conserva entre reinicios. Para borrar el volumen de forma explícita se requiere `docker compose down -v`.

Comandos separados (en terminales distintas):

```bash
npm run dev:server
npm run dev:client
```

La API inicia el archivo local `data/lab.sqlite` y lo reinicializa con fixtures reproducibles al arrancar. `DB_FILE` permite indicar otra ubicación; `PORT` cambia el puerto de API.

## Cliente académico

Las rutas de laboratorio requieren `Authorization: Bearer cli-a-lab-token`. El cliente de prueba es `CLI-A`; se puede enviar además `X-Client-Id: CLI-A`. La credencial es fija y exclusivamente académica/local: no utilizar en redes públicas ni como autenticación de producción.

## API REST

Todas las rutas salvo health requieren autenticación.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado de API y SQLite. |
| GET | `/api/scenarios` | IDs de escenarios soportados. |
| POST | `/api/reset` | Reset completo e idempotente. |
| POST | `/api/scenarios/:scenarioId/reset` | Reset aislado del escenario indicado. |
| GET | `/api/scenarios/:scenarioId/products` | Productos y stock del fixture. |
| GET | `/api/scenarios/:scenarioId/cart` | Carrito del escenario. |
| POST | `/api/scenarios/:scenarioId/cart/items` | JSON `{ "sku":"PR-05", "quantity":2 }`; stock validado. |
| POST | `/api/scenarios/:scenarioId/checkout` | JSON `{ "name":"...", "email":"...", "address":"..." }`; valid checkout creates the order in `CREADO`. |
| POST | `/api/scenarios/:scenarioId/orders/:orderId/payments` | JSON `{ "result":"APROBADO" }` o `RECHAZADO`. |
| POST | `/api/scenarios/:scenarioId/orders/:orderId/transitions` | JSON `{ "to":"PENDIENTE DE PAGO" }`; valida transición. |
| GET | `/api/scenarios/:scenarioId/orders/:orderId` | Pedido, intentos y cargos. |

Errores siguen el formato `{ "error": { "code":"...", "message":"...", "details":{} } }`. Códigos principales: 400 datos inválidos, 401 no autenticado, 404 entidad ausente, 409 regla de negocio/estado y 422 dirección obligatoria. Después del checkout, `POST /api/scenarios/:scenarioId/orders/:orderId/transitions` con `{ "to":"PENDIENTE DE PAGO" }` inicia el cobro; checkout por sí solo no cobra. La API transacciona la aprobación del pago: descuento de stock, cargo y cambio de estado se confirman o revierten juntos. Un rechazo deja el pedido pendiente y registra el intento, sin cargo ni descuento.

## Restablecimiento

- Desde la UI: botón **Restablecer escenario**.
- Por API: `POST /api/scenarios/CU-01/reset` (o cualquier ID entre `CU-01`, `CE-04`, `VL-05`, `TD-02`, `ME-04`).
- Reset total: `POST /api/reset`.

Cada caso mantiene su propio fixture de PR-05 con stock 5 y su carrito/pedidos separados. Repetir el reset produce el mismo estado y no afecta los otros cuatro escenarios.

## Pruebas

```bash
npm test
npm run build
```

La suite de API y lógica está en `server/test/scenarios.test.ts`. Incluye los cinco escenarios, autenticación, idempotencia/aislamiento de resets y aprobación atómica de pago. La trazabilidad entre caso, fixture, endpoint y selectores está en `docs/traceability.md`.

## Automatización de interfaz

Los controles principales exponen `data-testid`, entre ellos `scenario-CU-01`, `product-search`, `search-product`, `add-to-cart`, `cart-item-PR-05`, `cart-quantity-PR-05`, `delivery-address`, `checkout`, `add-six`, `reject-payment`, `retry-payment`, `reset-scenario` y `scenario-message`.

## Alcance y limitaciones

Aplicación didáctica para ejecución local: no es un sistema productivo, no integra identidad real ni pasarelas, y la credencial fija no es segura para exposición pública. Interfaz y API son mínimas y enfocadas en los cinco casos aprobados.
