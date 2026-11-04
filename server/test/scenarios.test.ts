import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDatabase, resetAll, resetScenario } from '../src/db.js';

const db = openDatabase(':memory:');
const app = createApp(db);
const auth = { Authorization: 'Bearer cli-a-lab-token', 'X-Client-Id': 'CLI-A' };
beforeEach(() => resetAll(db));
after(() => db.close());

test('CU-01 busca PR-05 y agrega dos unidades', async () => {
  const products = await request(app).get('/api/scenarios/CU-01/products').set(auth).expect(200);
  assert.equal(products.body.products.find((p: {sku:string}) => p.sku === 'PR-05').stock, 5);
  const result = await request(app).post('/api/scenarios/CU-01/cart/items').set(auth).send({sku:'PR-05',quantity:2}).expect(201);
  assert.equal(result.body.items.find((i: {sku:string}) => i.sku === 'PR-05').quantity, 2);
});

test('CE-04 rechaza checkout sin dirección y no inicia cobro', async () => {
  const cart = await request(app).get('/api/scenarios/CE-04/cart').set(auth).expect(200);
  assert.equal(cart.body.items.length, 1);
  const result = await request(app).post('/api/scenarios/CE-04/checkout').set(auth).send({name:'CLI-A',email:'cli-a@example.test',address:''}).expect(422);
  assert.equal(result.body.error.code, 'DELIVERY_ADDRESS_REQUIRED');
  assert.match(result.body.error.message, /No se inició el cobro/);
  const count = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE scenario_id=?').get('CE-04') as {count:number};
  assert.equal(count.count, 0);
});

test('VL-05 rechaza seis unidades y mantiene vacío el carrito', async () => {
  const result = await request(app).post('/api/scenarios/VL-05/cart/items').set(auth).send({sku:'PR-05',quantity:6}).expect(409);
  assert.equal(result.body.error.code, 'INSUFFICIENT_INVENTORY');
  const cart = await request(app).get('/api/scenarios/VL-05/cart').set(auth).expect(200);
  assert.equal(cart.body.items.some((i: {sku:string}) => i.sku === 'PR-05'), false);
});

test('TD-02 guarda rechazo, mantiene PENDIENTE DE PAGO y no crea cobro exitoso', async () => {
  const result = await request(app).post('/api/scenarios/TD-02/orders/PED-202/payments').set(auth).send({result:'RECHAZADO'}).expect(200);
  assert.equal(result.body.order.status, 'PENDIENTE DE PAGO');
  const detail = await request(app).get('/api/scenarios/TD-02/orders/PED-202').set(auth).expect(200);
  assert.deepEqual(detail.body.paymentAttempts.map((p: {result:string}) => p.result), ['RECHAZADO']);
  assert.equal(detail.body.successfulCharges.length, 0);
  const products = await request(app).get('/api/scenarios/TD-02/products').set(auth).expect(200);
  assert.equal(products.body.products.find((p: {sku:string})=>p.sku==='PR-05').stock, 5);
});

test('ME-04 rechaza reiniciar pago de PED-204 cancelado', async () => {
  const result = await request(app).post('/api/scenarios/ME-04/orders/PED-204/transitions').set(auth).send({to:'PENDIENTE DE PAGO'}).expect(409);
  assert.equal(result.body.error.code, 'TERMINAL_ORDER_STATE');
  const order = await request(app).get('/api/scenarios/ME-04/orders/PED-204').set(auth).expect(200);
  assert.equal(order.body.order.status, 'CANCELADO');
});

test('CLI-A requiere credencial y reset independiente es idempotente', async () => {
  await request(app).get('/api/scenarios/CU-01/cart').expect(401);
  await request(app).post('/api/scenarios/CU-01/cart/items').set(auth).send({sku:'PR-05',quantity:2}).expect(201);
  await request(app).post('/api/scenarios/CU-01/reset').set(auth).expect(200);
  await request(app).post('/api/scenarios/CU-01/reset').set(auth).expect(200);
  const cart = await request(app).get('/api/scenarios/CU-01/cart').set(auth).expect(200);
  assert.equal(cart.body.items.length, 0);
  const untouched = await request(app).get('/api/scenarios/CE-04/cart').set(auth).expect(200);
  assert.equal(untouched.body.items.length, 1);
});

test('pago aprobado descuenta inventario y actualiza pedido atómicamente', async () => {
  resetScenario(db, 'TD-02');
  const result = await request(app).post('/api/scenarios/TD-02/orders/PED-202/payments').set(auth).send({result:'APROBADO'}).expect(200);
  assert.equal(result.body.order.status, 'PAGADO');
  const detail = await request(app).get('/api/scenarios/TD-02/orders/PED-202').set(auth).expect(200);
  assert.equal(detail.body.successfulCharges.length, 1);
  const products = await request(app).get('/api/scenarios/TD-02/products').set(auth).expect(200);
  assert.equal(products.body.products.find((p: {sku:string})=>p.sku==='PR-05').stock, 4);
});
