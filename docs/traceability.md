# Trazabilidad de Entrega 3

| Caso original | Fixture reproducible | Interacción/API | Aserciones de aceptación |
|---|---|---|---|
| CU-01 — Buscar producto y agregarlo al carrito | `PR-05`, stock 5, carrito vacío en `CU-01` | Buscar, abrir detalle y `POST /api/scenarios/CU-01/cart/items` con cantidad 2 | Carrito contiene `PR-05` con cantidad 2. `data-testid`: `product-search`, `search-product`, `add-to-cart`, `cart-quantity-PR-05`. |
| CE-04 — Dirección de entrega ausente | Carrito con PR-05; CLI-A, nombre y correo completos; dirección vacía | `POST /api/scenarios/CE-04/checkout` | HTTP 422, `DELIVERY_ADDRESS_REQUIRED`, no se inicia cobro ni se crea pedido. |
| VL-05 — Seis unidades con cinco disponibles | `PR-05` stock 5 y carrito vacío en `VL-05` | `POST /api/scenarios/VL-05/cart/items` cantidad 6 | HTTP 409, `INSUFFICIENT_INVENTORY`; carrito permanece vacío. |
| TD-02 — Pago rechazado | Pedido `PED-202` pendiente, cliente CLI-A; una unidad y stock suficiente | `POST /api/scenarios/TD-02/orders/PED-202/payments` resultado `RECHAZADO` | Pedido sigue `PENDIENTE DE PAGO`; se registra intento; no hay cargo exitoso ni descuento de inventario. |
| ME-04 — Pedido cancelado | `PED-204` en estado `CANCELADO` | `POST /api/scenarios/ME-04/orders/PED-204/transitions` destino `PENDIENTE DE PAGO` | HTTP 409, transición rechazada; pedido continúa `CANCELADO`. |

Los estados de pedido soportados son `CREADO`, `PENDIENTE DE PAGO`, `PAGADO` y `CANCELADO`. `PAGADO` y `CANCELADO` son terminales. Solo un resultado de pago `APROBADO` dentro de una transacción SQLite actualiza el pedido a `PAGADO`, registra el cargo y descuenta existencias.
