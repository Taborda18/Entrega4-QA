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
 WebUI.click(css("[data-testid='scenario-CU-01']"))
 WebUI.click(css("[data-testid='reset-scenario']"))
 WebUI.setText(css("[data-testid='product-search']"),'PR-05')
 WebUI.click(css("[data-testid='search-product']"))
 WebUI.waitForElementVisible(css("[data-testid='add-to-cart']"),10)
 WebUI.click(css("[data-testid='add-to-cart']"))
 WebUI.verifyElementText(css("[data-testid='cart-quantity-PR-05']"),'2')
 WebUI.takeScreenshot('Screenshots/Entrega4/CU01_carrito.png')
} finally { WebUI.closeBrowser() }