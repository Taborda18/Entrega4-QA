import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.model.FailureHandling as FailureHandling

WebUI.openBrowser('')
try {
    WebUI.navigateToUrl('http://localhost:5173')
    WebUI.click(findTestObject('Object Repository/Entrega4/VL05/button_VL-05Seis unidades con cinco disponibles'))
    WebUI.click(findTestObject('Object Repository/Entrega4/VL05/button_Restablecer escenario'))
    WebUI.waitForElementVisible(findTestObject('Object Repository/Entrega4/VL05/b_5'), 10)
    WebUI.verifyElementText(findTestObject('Object Repository/Entrega4/VL05/b_5'), '5')
    WebUI.verifyElementText(findTestObject('Object Repository/Entrega4/VL05/p_Sin productos'), 'Sin productos')
    WebUI.click(findTestObject('Object Repository/Entrega4/VL05/button_Intentar agregar 6 unidades'))
    WebUI.verifyElementText(findTestObject('Object Repository/Entrega4/VL05/p_Sin productos'), 'Sin productos')
    String result = WebUI.getText(findTestObject('Object Repository/Entrega4/VL05/p_Sin productos'))
    WebUI.verifyMatch(result, 'Sin productos', false)
    WebUI.verifyElementText(findTestObject('Object Repository/Entrega4/VL05/b_5'), '5')
    WebUI.verifyTextPresent('Stock insuficiente: disponibles 5, solicitadas 6.', false)
    WebUI.takeScreenshot('Screenshots/Entrega4/VL05_rechazo.png')
} finally {
    WebUI.closeBrowser()
}