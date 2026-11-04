import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { resetAll, resetScenario, SCENARIOS, type Scenario } from './db.js';

const token = 'cli-a-lab-token';
const money = (n: number) => n;
function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ error: { code, message, ...(details === undefined ? {} : { details }) } });
}
function validScenario(value: string): value is Scenario { return (SCENARIOS as readonly string[]).includes(value); }
function auth(req: Request, res: Response, next: NextFunction) {
  if (req.header('authorization') !== `Bearer ${token}` || req.header('x-client-id') !== 'CLI-A') return fail(res, 401, 'UNAUTHORIZED', 'Se requiere el cliente académico autenticado CLI-A.');
  next();
}
function scenarioGuard(req: Request, res: Response, next: NextFunction) {
  if (!validScenario(req.params.scenarioId)) return fail(res, 404, 'SCENARIO_NOT_FOUND', 'Escenario no reconocido.');
  next();
}

export function createApp(db: Database.Database) {
  const app = express();
  app.use(cors()); app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'sqlite' }));
  app.use('/api', auth);
  app.get('/api/scenarios', (_req, res) => res.json({ scenarios: SCENARIOS }));
  app.post('/api/reset', (_req, res) => { try { resetAll(db); res.json({ reset: true }); } catch { fail(res, 500, 'RESET_FAILED', 'No fue posible restablecer el laboratorio.'); } });
  app.post('/api/scenarios/:scenarioId/reset', scenarioGuard, (req, res) => {
    try { resetScenario(db, req.params.scenarioId as Scenario); const orderId = req.params.scenarioId === 'TD-02' ? 'PED-202' : req.params.scenarioId === 'ME-04' ? 'PED-204' : undefined; res.json({ reset: true, scenarioId: req.params.scenarioId, ...(orderId ? { orderId } : {}) }); }
    catch { fail(res, 500, 'RESET_FAILED', 'No fue posible restablecer el escenario.'); }
  });
  app.get('/api/scenarios/:scenarioId/products', scenarioGuard, (req, res) => {
    const products = db.prepare('SELECT sku,name,price_cents AS priceCents,stock FROM products WHERE scenario_id=? ORDER BY sku').all(req.params.scenarioId);
    res.json({ products });
  });
  app.get('/api/scenarios/:scenarioId/cart', scenarioGuard, (req, res) => {
    const items = db.prepare('SELECT c.sku,p.name,c.quantity FROM carts c JOIN products p USING(scenario_id,sku) WHERE c.scenario_id=? ORDER BY c.sku').all(req.params.scenarioId);
    res.json({ items });
  });
  app.post('/api/scenarios/:scenarioId/cart/items', scenarioGuard, (req, res) => {
    const { sku, quantity } = req.body ?? {};
    if (typeof sku !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) return fail(res, 400, 'INVALID_CART_ITEM', 'SKU y cantidad entera positiva son obligatorios.');
    const product = db.prepare('SELECT stock FROM products WHERE scenario_id=? AND sku=?').get(req.params.scenarioId, sku) as { stock: number } | undefined;
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado.');
    const existing = db.prepare('SELECT quantity FROM carts WHERE scenario_id=? AND sku=?').get(req.params.scenarioId, sku) as { quantity: number } | undefined;
    const wanted = quantity + (existing?.quantity ?? 0);
    if (wanted > product.stock) return fail(res, 409, 'INSUFFICIENT_INVENTORY', `Stock insuficiente: disponibles ${product.stock}, solicitadas ${wanted}.`, { available: product.stock, requested: wanted });
    db.transaction(() => db.prepare('INSERT INTO carts(scenario_id,sku,quantity) VALUES(?,?,?) ON CONFLICT(scenario_id,sku) DO UPDATE SET quantity=excluded.quantity').run(req.params.scenarioId, sku, wanted))();
    const items = db.prepare('SELECT c.sku,p.name,c.quantity FROM carts c JOIN products p USING(scenario_id,sku) WHERE c.scenario_id=? ORDER BY c.sku').all(req.params.scenarioId);
    res.status(201).json({ items });
  });
  app.post('/api/scenarios/:scenarioId/checkout', scenarioGuard, (req, res) => {
    const { name, email, address } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'INVALID_CUSTOMER', 'Nombre y correo válidos son obligatorios.');
    if (typeof address !== 'string' || !address.trim()) return fail(res, 422, 'DELIVERY_ADDRESS_REQUIRED', 'La dirección de entrega es obligatoria. No se inició el cobro.');
    const lines = db.prepare('SELECT c.sku,c.quantity,p.price_cents AS unitPrice FROM carts c JOIN products p USING(scenario_id,sku) WHERE c.scenario_id=?').all(req.params.scenarioId) as { sku:string; quantity:number; unitPrice:number }[];
    if (!lines.length) return fail(res, 409, 'EMPTY_CART', 'Agregue productos antes de iniciar el checkout.');
    const create = db.transaction(() => {
      const id = `PED-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
      db.prepare("INSERT INTO orders(id,scenario_id,client_id,name,email,address,status,total_cents) VALUES(?,?,'CLI-A',?,?,?,'CREADO',?)").run(id, req.params.scenarioId, name.trim(), email.trim(), address.trim(), total);
      const insert = db.prepare('INSERT INTO order_items(order_id,sku,quantity,unit_price_cents) VALUES(?,?,?,?)');
      for (const line of lines) insert.run(id, line.sku, line.quantity, line.unitPrice);
      return { id, status: 'CREADO', totalCents: money(total) };
    });
    res.status(201).json({ order: create() });
  });
  app.post('/api/scenarios/:scenarioId/orders/:orderId/payments', scenarioGuard, (req, res) => {
    const result = req.body?.result;
    if (!['APROBADO','RECHAZADO'].includes(result)) return fail(res, 400, 'INVALID_PAYMENT_RESULT', 'El resultado simulado debe ser APROBADO o RECHAZADO.');
    const order = db.prepare('SELECT * FROM orders WHERE id=? AND scenario_id=?').get(req.params.orderId, req.params.scenarioId) as {id:string;status:string;total_cents:number}|undefined;
    if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Pedido no encontrado.');
    if (order.status !== 'PENDIENTE DE PAGO') return fail(res, 409, 'INVALID_ORDER_STATE', `No se puede cobrar un pedido en estado ${order.status}.`);
    const execute = db.transaction(() => {
      db.prepare('INSERT INTO payment_attempts(order_id,result) VALUES(?,?)').run(order.id, result);
      if (result === 'RECHAZADO') return { payment: { status: 'RECHAZADO' }, order: { id: order.id, status: 'PENDIENTE DE PAGO' } };
      const lines = db.prepare('SELECT sku,quantity FROM order_items WHERE order_id=?').all(order.id) as {sku:string;quantity:number}[];
      for (const line of lines) {
        const product = db.prepare('SELECT stock FROM products WHERE scenario_id=? AND sku=?').get(req.params.scenarioId, line.sku) as {stock:number}|undefined;
        if (!product || product.stock < line.quantity) throw Object.assign(new Error('Inventario insuficiente al aprobar el pago.'), { code: 'INSUFFICIENT_INVENTORY' });
      }
      for (const line of lines) db.prepare('UPDATE products SET stock=stock-? WHERE scenario_id=? AND sku=?').run(line.quantity, req.params.scenarioId, line.sku);
      db.prepare('INSERT INTO successful_charges(order_id,amount_cents) VALUES(?,?)').run(order.id, order.total_cents);
      db.prepare("UPDATE orders SET status='PAGADO' WHERE id=?").run(order.id);
      return { payment: { status: 'APROBADO' }, order: { id: order.id, status: 'PAGADO' } };
    });
    try { res.json(execute()); } catch (error) { const e = error as Error & {code?:string}; if(e.code==='INSUFFICIENT_INVENTORY') return fail(res,409,e.code,e.message); return fail(res,500,'PAYMENT_FAILED','No se pudo procesar la operación de pago.'); }
  });
  app.post('/api/scenarios/:scenarioId/orders/:orderId/transitions', scenarioGuard, (req, res) => {
    const order = db.prepare('SELECT id,status FROM orders WHERE id=? AND scenario_id=?').get(req.params.orderId, req.params.scenarioId) as {id:string;status:string}|undefined;
    if (!order) return fail(res,404,'ORDER_NOT_FOUND','Pedido no encontrado.');
    if (order.status === 'PAGADO' || order.status === 'CANCELADO') return fail(res,409,'TERMINAL_ORDER_STATE',`El estado ${order.status} es terminal; transición rechazada.`);
    if (req.body?.to !== 'PENDIENTE DE PAGO' || order.status !== 'CREADO') return fail(res,409,'INVALID_ORDER_TRANSITION',`Transición ${order.status} → ${String(req.body?.to)} no permitida.`);
    db.transaction(() => db.prepare("UPDATE orders SET status='PENDIENTE DE PAGO' WHERE id=?").run(order.id))();
    res.json({ order: { id: order.id, status: 'PENDIENTE DE PAGO' } });
  });
  app.get('/api/scenarios/:scenarioId/orders/:orderId', scenarioGuard, (req, res) => {
    const order = db.prepare('SELECT id,scenario_id AS scenarioId,client_id AS clientId,status,total_cents AS totalCents FROM orders WHERE id=? AND scenario_id=?').get(req.params.orderId, req.params.scenarioId);
    if (!order) return fail(res,404,'ORDER_NOT_FOUND','Pedido no encontrado.');
    const attempts = db.prepare('SELECT result,created_at AS createdAt FROM payment_attempts WHERE order_id=?').all(req.params.orderId);
    const charges = db.prepare('SELECT amount_cents AS amountCents FROM successful_charges WHERE order_id=?').all(req.params.orderId);
    res.json({ order, paymentAttempts: attempts, successfulCharges: charges });
  });
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => { const e=err as Error; fail(res,400,'INVALID_REQUEST',e.message || 'Solicitud inválida.'); });
  return app;
}
