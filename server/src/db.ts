import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const SCENARIOS = ['CU-01', 'CE-04', 'VL-05', 'TD-02', 'ME-04'] as const;
export type Scenario = typeof SCENARIOS[number];
export function openDatabase(filename = process.env.DB_FILE ?? path.resolve('data/lab.sqlite')) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products(scenario_id TEXT NOT NULL, sku TEXT NOT NULL, name TEXT NOT NULL, price_cents INTEGER NOT NULL, stock INTEGER NOT NULL CHECK(stock >= 0), PRIMARY KEY(scenario_id, sku));
    CREATE TABLE IF NOT EXISTS carts(scenario_id TEXT NOT NULL, sku TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0), PRIMARY KEY(scenario_id, sku), FOREIGN KEY(scenario_id, sku) REFERENCES products(scenario_id, sku) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL, client_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, address TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('CREADO','PENDIENTE DE PAGO','PAGADO','CANCELADO')), total_cents INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS order_items(order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, sku TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL, PRIMARY KEY(order_id, sku));
    CREATE TABLE IF NOT EXISTS payment_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, result TEXT NOT NULL CHECK(result IN ('APROBADO','RECHAZADO')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS successful_charges(id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE, amount_cents INTEGER NOT NULL);
  `);
  return db;
}

const labels: Record<Scenario, string> = { 'CU-01': 'Cliente de carrito', 'CE-04': 'Cliente de checkout', 'VL-05': 'Cliente de inventario', 'TD-02': 'Cliente de pago', 'ME-04': 'Cliente de pedido' };

export function resetScenario(db: Database.Database, scenario: Scenario) {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM orders WHERE scenario_id=?').run(scenario);
    db.prepare('DELETE FROM carts WHERE scenario_id=?').run(scenario);
    db.prepare('DELETE FROM products WHERE scenario_id=?').run(scenario);
    db.prepare('INSERT INTO products(scenario_id,sku,name,price_cents,stock) VALUES(?,?,?,?,?)').run(scenario, 'PR-05', 'Producto NovaCommerce PR-05', 2599, 5);
    db.prepare('INSERT INTO products(scenario_id,sku,name,price_cents,stock) VALUES(?,?,?,?,?)').run(scenario, 'PR-06', 'Producto complementario PR-06', 1199, 8);
    if (scenario === 'CE-04') db.prepare('INSERT INTO carts(scenario_id,sku,quantity) VALUES(?,?,?)').run(scenario, 'PR-05', 1);
    if (scenario === 'TD-02') {
      db.prepare("INSERT INTO orders(id,scenario_id,client_id,name,email,address,status,total_cents) VALUES('PED-202',?,'CLI-A',?,?,?,'PENDIENTE DE PAGO',2599)").run(scenario, labels[scenario], 'cli-a@example.test', 'Av. Académica 100');
      db.prepare("INSERT INTO order_items(order_id,sku,quantity,unit_price_cents) VALUES('PED-202','PR-05',1,2599)").run();
    }
    if (scenario === 'ME-04') {
      db.prepare("INSERT INTO orders(id,scenario_id,client_id,name,email,address,status,total_cents) VALUES('PED-204',?,'CLI-A',?,?,?,'CANCELADO',2599)").run(scenario, labels[scenario], 'cli-a@example.test', 'Av. Académica 100');
      db.prepare("INSERT INTO order_items(order_id,sku,quantity,unit_price_cents) VALUES('PED-204','PR-05',1,2599)").run();
    }
  });
  reset();
}

export function resetAll(db: Database.Database) {
  db.transaction(() => { for (const id of SCENARIOS) resetScenario(db, id); })();
}
