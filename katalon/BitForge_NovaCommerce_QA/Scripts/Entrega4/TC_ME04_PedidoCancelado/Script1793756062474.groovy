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
 WebUI.click(css("[data-testid='scenario-ME-04']"))
 WebUI.click(css("[data-testid='reset-scenario']"))
 WebUI.verifyElementText(css("[data-testid='cancelled-order-id']"),'PED-204')
 WebUI.verifyTextPresent('estado inicial CANCELADO.',false)
 WebUI.click(css("[data-testid='retry-payment']"))
 WebUI.verifyTextPresent('El estado CANCELADO es terminal; transición rechazada.',false)
 WebUI.verifyTextPresent('CANCELADO',false)
 WebUI.takeScreenshot('Screenshots/Entrega4/ME04_rechazo.png')
} finally { WebUI.closeBrowser() }