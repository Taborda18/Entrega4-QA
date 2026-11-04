"""
Entrega 4 - Modalidad C: Automation Exercises generados y ejecutados por un agente de IA.

Proyecto independiente del proyecto Katalon (modalidad A). Cada ejercicio valida, en dos
capas (UI con Playwright + API REST con requests), uno de los cinco escenarios
reproducibles del NovaCommerce QA Lab. Requiere la app real corriendo en
http://localhost:5173 (frontend) y http://localhost:3001 (API).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:3001"
AUTH = {"Authorization": "Bearer cli-a-lab-token", "X-Client-Id": "CLI-A"}
EVIDENCE_DIR = Path(__file__).resolve().parent.parent / "evidence"
EVIDENCE_DIR.mkdir(exist_ok=True)

results = []


def record(exercise_id, title, case_origen, status, detail):
    results.append({
        "ejercicio": exercise_id,
        "titulo": title,
        "caso_entrega3": case_origen,
        "resultado": status,
        "detalle": detail,
    })
    print(f"[{status}] {exercise_id} - {title}: {detail}")


def ae01_cu01_agregar_carrito(page):
    eid, title, caso = "AE-01", "Agregar producto al carrito (UI + API)", "CU-01"
    try:
        requests.post(f"{API_URL}/api/scenarios/CU-01/reset", headers=AUTH, timeout=10).raise_for_status()
        page.goto(BASE_URL)
        page.click("[data-testid='scenario-CU-01']")
        page.click("[data-testid='reset-scenario']")
        page.fill("[data-testid='product-search']", "PR-05")
        page.click("[data-testid='search-product']")
        page.click("[data-testid='add-to-cart']")
        expect(page.locator("[data-testid='cart-quantity-PR-05']")).to_have_text("2")
        page.screenshot(path=str(EVIDENCE_DIR / "AE01_CU01_ui.png"))
        api_cart = requests.get(f"{API_URL}/api/scenarios/CU-01/cart", headers=AUTH, timeout=10).json()
        qty = next(i["quantity"] for i in api_cart["items"] if i["sku"] == "PR-05")
        assert qty == 2, f"API reporta cantidad {qty}, se esperaba 2"
        record(eid, title, caso, "PASS",
               "UI muestra cantidad 2 de PR-05 en el carrito; API confirma items[PR-05].quantity == 2.")
    except Exception as exc:
        page.screenshot(path=str(EVIDENCE_DIR / "AE01_CU01_ui.png"))
        record(eid, title, caso, "FAIL", f"Error de automatización/script: {exc}")


def ae02_ce04_direccion_ausente(page):
    eid, title, caso = "AE-02", "Checkout sin dirección de entrega (UI + API)", "CE-04"
    try:
        requests.post(f"{API_URL}/api/scenarios/CE-04/reset", headers=AUTH, timeout=10).raise_for_status()
        page.goto(BASE_URL)
        page.click("[data-testid='scenario-CE-04']")
        page.click("[data-testid='reset-scenario']")
        page.fill("[data-testid='customer-name']", "Agente IA - Entrega 4")
        page.fill("[data-testid='customer-email']", "agente.ia@example.test")
        page.fill("[data-testid='delivery-address']", "")
        page.click("[data-testid='checkout']")
        expect(page.locator("[data-testid='scenario-message']")).to_contain_text("dirección de entrega es obligatoria")
        page.screenshot(path=str(EVIDENCE_DIR / "AE02_CE04_ui.png"))
        api_resp = requests.post(f"{API_URL}/api/scenarios/CE-04/checkout", headers=AUTH,
                                  json={"name": "Agente IA", "email": "agente.ia@example.test", "address": ""},
                                  timeout=10)
        assert api_resp.status_code == 422, f"API devolvió {api_resp.status_code}, se esperaba 422"
        assert api_resp.json()["error"]["code"] == "DELIVERY_ADDRESS_REQUIRED"
        record(eid, title, caso, "PASS",
               "UI bloquea el checkout y muestra el mensaje de dirección obligatoria; "
               "API responde 422 DELIVERY_ADDRESS_REQUIRED sin crear el pedido.")
    except Exception as exc:
        page.screenshot(path=str(EVIDENCE_DIR / "AE02_CE04_ui.png"))
        record(eid, title, caso, "FAIL", f"Error de automatización/script: {exc}")


def ae03_vl05_inventario_insuficiente(page):
    eid, title, caso = "AE-03", "Rechazo por inventario insuficiente (UI + API)", "VL-05"
    try:
        requests.post(f"{API_URL}/api/scenarios/VL-05/reset", headers=AUTH, timeout=10).raise_for_status()
        page.goto(BASE_URL)
        page.click("[data-testid='scenario-VL-05']")
        page.click("[data-testid='reset-scenario']")
        expect(page.locator("[data-testid='available-stock']")).to_have_text("5")
        page.click("[data-testid='add-six']")
        expect(page.locator("[data-testid='empty-cart']")).to_be_visible()
        page.screenshot(path=str(EVIDENCE_DIR / "AE03_VL05_ui.png"))
        api_resp = requests.post(f"{API_URL}/api/scenarios/VL-05/cart/items", headers=AUTH,
                                  json={"sku": "PR-05", "quantity": 6}, timeout=10)
        assert api_resp.status_code == 409, f"API devolvió {api_resp.status_code}, se esperaba 409"
        assert api_resp.json()["error"]["code"] == "INSUFFICIENT_INVENTORY"
        record(eid, title, caso, "PASS",
               "UI rechaza agregar 6 unidades y el carrito permanece vacío; "
               "API responde 409 INSUFFICIENT_INVENTORY.")
    except Exception as exc:
        page.screenshot(path=str(EVIDENCE_DIR / "AE03_VL05_ui.png"))
        record(eid, title, caso, "FAIL", f"Error de automatización/script: {exc}")


def ae04_td02_pago_rechazado(page):
    eid, title, caso = "AE-04", "Pago rechazado no cobra ni descuenta stock (UI + API)", "TD-02"
    try:
        requests.post(f"{API_URL}/api/scenarios/TD-02/reset", headers=AUTH, timeout=10).raise_for_status()
        page.goto(BASE_URL)
        page.click("[data-testid='scenario-TD-02']")
        page.click("[data-testid='reset-scenario']")
        expect(page.locator("[data-testid='order-id']")).to_have_value("PED-202")
        page.click("[data-testid='reject-payment']")
        expect(page.locator("[data-testid='scenario-message']")).to_contain_text("RECHAZADO")
        page.screenshot(path=str(EVIDENCE_DIR / "AE04_TD02_ui.png"))
        detail = requests.get(f"{API_URL}/api/scenarios/TD-02/orders/PED-202", headers=AUTH, timeout=10).json()
        assert detail["order"]["status"] == "PENDIENTE DE PAGO"
        assert len(detail["successfulCharges"]) == 0
        record(eid, title, caso, "PASS",
               "UI confirma el rechazo y el pedido sigue PENDIENTE DE PAGO; "
               "API confirma 0 cargos exitosos tras el rechazo.")
    except Exception as exc:
        page.screenshot(path=str(EVIDENCE_DIR / "AE04_TD02_ui.png"))
        record(eid, title, caso, "FAIL", f"Error de automatización/script: {exc}")


def ae05_me04_pedido_cancelado(page):
    eid, title, caso = "AE-05", "Pedido CANCELADO no admite reinicio de pago (UI + API)", "ME-04"
    try:
        requests.post(f"{API_URL}/api/scenarios/ME-04/reset", headers=AUTH, timeout=10).raise_for_status()
        page.goto(BASE_URL)
        page.click("[data-testid='scenario-ME-04']")
        page.click("[data-testid='reset-scenario']")
        expect(page.locator("[data-testid='cancelled-order-id']")).to_have_text("PED-204")
        page.click("[data-testid='retry-payment']")
        expect(page.locator("[data-testid='scenario-message']")).to_contain_text("CANCELADO")
        page.screenshot(path=str(EVIDENCE_DIR / "AE05_ME04_ui.png"))
        api_resp = requests.post(f"{API_URL}/api/scenarios/ME-04/orders/PED-204/transitions", headers=AUTH,
                                  json={"to": "PENDIENTE DE PAGO"}, timeout=10)
        assert api_resp.status_code == 409, f"API devolvió {api_resp.status_code}, se esperaba 409"
        assert api_resp.json()["error"]["code"] == "TERMINAL_ORDER_STATE"
        record(eid, title, caso, "PASS",
               "UI rechaza reiniciar el pago y conserva CANCELADO; "
               "API responde 409 TERMINAL_ORDER_STATE.")
    except Exception as exc:
        page.screenshot(path=str(EVIDENCE_DIR / "AE05_ME04_ui.png"))
        record(eid, title, caso, "FAIL", f"Error de automatización/script: {exc}")


def main():
    health = requests.get(f"{API_URL}/api/health", timeout=10).json()
    print("Salud de la API antes de ejecutar:", health)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        for fn in (ae01_cu01_agregar_carrito, ae02_ce04_direccion_ausente,
                   ae03_vl05_inventario_insuficiente, ae04_td02_pago_rechazado,
                   ae05_me04_pedido_cancelado):
            fn(page)
        context.close()
        browser.close()

    summary = {
        "proyecto": "Entrega4-QA-main / agent_automation (modalidad C)",
        "generado_y_ejecutado_por": "Agente de IA (Claude, sesión en la nube) contra la app real del equipo",
        "fecha_ejecucion_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "base_url_frontend": BASE_URL,
        "base_url_api": API_URL,
        "total": len(results),
        "pass": sum(1 for r in results if r["resultado"] == "PASS"),
        "fail": sum(1 for r in results if r["resultado"] == "FAIL"),
        "ejercicios": results,
    }
    out_path = EVIDENCE_DIR / "resultado_ejecucion.json"
    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nResumen:", summary["pass"], "PASS /", summary["fail"], "FAIL de", summary["total"])
    print("Reporte guardado en", out_path)
    if summary["fail"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
