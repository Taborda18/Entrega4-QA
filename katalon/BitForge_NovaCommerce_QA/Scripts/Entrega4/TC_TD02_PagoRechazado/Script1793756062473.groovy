import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.testobject.ConditionType

def css = { String selector ->
    TestObject object = new TestObject(selector)
    object.addProperty('css', ConditionType.EQUALS, selector)
    return object
}
WebUI.openBrowser('')
try {
 WebUI.navigateToUrl('http://localhost:5173')
 WebUI.click(css("[data-testid='scenario-TD-02']"))
 WebUI.click(css("[data-testid='reset-scenario']"))
 WebUI.verifyElementAttributeValue(css("[data-testid='order-id']"),'value','PED-202',5)
 WebUI.click(css("[data-testid='reject-payment']"))
 WebUI.verifyTextPresent('Pago RECHAZADO; pedido PENDIENTE DE PAGO.',false)
 WebUI.verifyTextNotPresent('Pago APROBADO',false)
 WebUI.takeScreenshot('Screenshots/Entrega4/TD02_rechazo.png')
} finally { WebUI.closeBrowser() }