import { useEffect, useState } from 'react';

const scenarios = [
  ['CU-01', 'Buscar producto y agregar al carrito'],
  ['CE-04', 'Dirección de entrega ausente'],
  ['VL-05', 'Seis unidades con cinco disponibles'],
  ['TD-02', 'Pago rechazado'],
  ['ME-04', 'Pedido cancelado'],
] as const;
type Product = { sku: string; name: string; stock: number; priceCents: number };
type CartLine = { sku: string; name: string; quantity: number };
const headers = { Authorization: 'Bearer cli-a-lab-token', 'X-Client-Id': 'CLI-A', 'Content-Type': 'application/json' };

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Error de solicitud');
  return body;
}

export default function App() {
  const [scenario, setScenario] = useState<string>('CU-01');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('PR-05');
  const [quantity, setQuantity] = useState(2);
  const [name, setName] = useState('Cliente Académico');
  const [email, setEmail] = useState('cli-a@example.test');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('PED-204');
  const [detailOpen, setDetailOpen] = useState(false);

  async function refresh() {
    const [p, c] = await Promise.all([api(`/scenarios/${scenario}/products`), api(`/scenarios/${scenario}/cart`)]);
    setProducts(p.products); setCart(c.items);
  }
  useEffect(() => { setOrderId(scenario === 'TD-02' ? 'PED-202' : 'PED-204'); refresh().catch(e => setMessage(e.message)); }, [scenario]);
  const product = products.find(p => p.sku === query.toUpperCase());

  async function reset() {
    try { const r = await api(`/scenarios/${scenario}/reset`, { method: 'POST' }); setOrderId(r.orderId ?? 'PED-204'); setMessage(`Escenario ${scenario} restablecido.`); await refresh(); }
    catch (e) { setMessage((e as Error).message); }
  }
  async function add(q = quantity, skuToAdd = query.toUpperCase()) {
    try { const r = await api(`/scenarios/${scenario}/cart/items`, { method: 'POST', body: JSON.stringify({ sku: skuToAdd, quantity: q }) }); setCart(r.items); setMessage(`${skuToAdd} agregado al carrito.`); }
    catch (e) { setMessage((e as Error).message); await refresh(); }
  }
  async function checkout() {
    try {
      const r = await api(`/scenarios/${scenario}/checkout`, { method: 'POST', body: JSON.stringify({ name, email, address }) });
      setOrderId(r.order.id); setMessage(`Pedido ${r.order.id}: ${r.order.status}.`);
    } catch (e) { setMessage((e as Error).message); }
  }
  async function rejectPayment() {
    try { const r = await api(`/scenarios/${scenario}/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify({ result: 'RECHAZADO' }) }); setMessage(`Pago ${r.payment.status}; pedido ${r.order.status}.`); }
    catch (e) { setMessage((e as Error).message); }
  }
  async function retryCancelled() {
    try { const r = await api(`/scenarios/${scenario}/orders/${orderId}/transitions`, { method: 'POST', body: JSON.stringify({ to: 'PENDIENTE DE PAGO' }) }); setMessage(`Pedido ${r.order.status}.`); }
    catch (e) { setMessage((e as Error).message); }
  }

  return <main>
    <header><div><span className="eyebrow">BITFORGE · LABORATORIO ACADÉMICO</span><h1>NovaCommerce <em>QA Lab</em></h1><p>Escenarios de comercio reproducibles · Cliente autenticado CLI-A</p></div><button className="secondary" data-testid="reset-scenario" onClick={reset}>Restablecer escenario</button></header>
    <nav aria-label="Escenarios">{scenarios.map(([id, title]) => <button key={id} data-testid={`scenario-${id}`} className={scenario === id ? 'selected' : ''} onClick={() => { setScenario(id); setMessage(''); setDetailOpen(false); }}>{id}<small>{title}</small></button>)}</nav>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">ESCENARIO {scenario}</span><h2>{scenarios.find(s => s[0] === scenario)?.[1]}</h2></div><span className="badge">API local · SQLite</span></div>
      {scenario === 'CU-01' && <div className="grid"><div><label>Buscar producto</label><div className="row"><input data-testid="product-search" value={query} onChange={e => setQuery(e.target.value)} /><button data-testid="search-product" onClick={() => { setDetailOpen(true); setMessage(product ? `Producto ${product.sku} encontrado.` : 'Producto no encontrado.'); }}>Buscar</button></div>{detailOpen && product && <article className="product"><b>{product.name}</b><span>{product.sku} · Stock {product.stock}</span><label>Cantidad<input data-testid="product-quantity" type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></label><button data-testid="add-to-cart" onClick={() => add(2)}>Agregar 2 unidades</button></article>}</div><Cart items={cart} /></div>}
      {scenario === 'VL-05' && <div className="scenario-card"><p>Stock inicial de PR-05: <b data-testid="available-stock">{products.find(p => p.sku === 'PR-05')?.stock ?? 5}</b>. El carrito parte vacío.</p><button data-testid="add-six" onClick={() => { setQuery('PR-05'); add(6, 'PR-05'); }}>Intentar agregar 6 unidades</button><Cart items={cart} /></div>}
      {scenario === 'CE-04' && <div className="grid"><form onSubmit={e => { e.preventDefault(); checkout(); }}><label>Nombre<input data-testid="customer-name" value={name} onChange={e => setName(e.target.value)} /></label><label>Correo<input data-testid="customer-email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Dirección de entrega<input data-testid="delivery-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Obligatoria para continuar" /></label><button data-testid="checkout" type="submit">Continuar al cobro</button></form><div className="scenario-card"><p>Carrito disponible para el escenario.</p><button className="secondary" onClick={() => add(1)}>Preparar carrito</button><Cart items={cart} /></div></div>}
      {scenario === 'TD-02' && <div className="scenario-card"><p>Cliente CLI-A autorizado · datos completos · inventario suficiente.</p><label>Pedido<input data-testid="order-id" value={orderId} onChange={e => setOrderId(e.target.value)} /></label><button data-testid="reject-payment" onClick={rejectPayment}>Simular respuesta RECHAZADO</button><p>El pedido debe continuar PENDIENTE DE PAGO y el inventario no se descuenta.</p></div>}
      {scenario === 'ME-04' && <div className="scenario-card"><p>Pedido <b data-testid="cancelled-order-id">PED-204</b> · estado inicial CANCELADO.</p><button data-testid="retry-payment" onClick={retryCancelled}>Intentar reiniciar el pago</button></div>}
      {message && <div role="status" aria-live="polite" data-testid="scenario-message" className="message">{message}</div>}
    </section>
    <footer>Pagos simulados · Sin servicios externos · Los datos de cada escenario son independientes</footer>
  </main>;
}

function Cart({ items }: { items: CartLine[] }) { return <aside className="cart"><h3>Carrito</h3>{items.length === 0 ? <p data-testid="empty-cart">Sin productos</p> : items.map(i => <div className="cart-line" key={i.sku} data-testid={`cart-item-${i.sku}`}><span>{i.sku} · {i.name}</span><b data-testid={`cart-quantity-${i.sku}`}>{i.quantity}</b></div>)}</aside>; }
