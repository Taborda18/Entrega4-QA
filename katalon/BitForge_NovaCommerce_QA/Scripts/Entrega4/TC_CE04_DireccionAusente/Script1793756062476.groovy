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
 WebUI.click(css("[data-testid='scenario-CE-04']"))
 WebUI.click(css("[data-testid='reset-scenario']"))
 WebUI.waitForElementVisible(css("[data-testid='cart-item-PR-05']"),10)
 WebUI.setText(css("[data-testid='customer-name']"),'Cliente Académico')
 WebUI.setText(css("[data-testid='customer-email']"),'cli-a@example.test')
 WebUI.setText(css("[data-testid='delivery-address']"),'')
 WebUI.click(css("[data-testid='checkout']"))
 WebUI.verifyTextPresent('La dirección de entrega es obligatoria. No se inició el cobro.',false)
 WebUI.verifyElementPresent(css("[data-testid='cart-item-PR-05']"),5)
 WebUI.takeScreenshot('Screenshots/Entrega4/CE04_rechazo.png')
} finally { WebUI.closeBrowser() }