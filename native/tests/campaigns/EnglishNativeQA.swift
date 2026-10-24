// Dated 2026-10-08 synthetic native QA campaign. Run primary methods00–06 on a newly owned simulator in order, after seeding only its local Documents fixtures. Method07 is a separate fresh large-display screenshot setup. Never inject app storage or use DEBUG bootstrap. See native/qa/READINESS_206bbbb.md for exact session evidence and limits.
import XCTest
final class EnglishNativeQA: XCTestCase {
 let app=XCUIApplication()
 override func setUpWithError() throws {
  continueAfterFailure=false
  app.launchArguments=["-AppleLanguages","(en)","-AppleLocale","en_US"]
  XCUIDevice.shared.orientation = .portrait
  app.launch()
  XCTAssertTrue(app.buttons["Settings"].waitForExistence(timeout:30),app.debugDescription)
 }
 func shot(_ name:String) {
  Thread.sleep(forTimeInterval:0.6)
  let a=XCTAttachment(screenshot:XCUIScreen.main.screenshot());a.name=name;a.lifetime = .keepAlways;add(a)
  let b=XCTAttachment(string:app.debugDescription);b.name=name+"-hierarchy";b.lifetime = .keepAlways;add(b)
 }
 func text(_ value:String)->XCUIElement { app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@",value)).firstMatch }
 func reach(_ element:XCUIElement) {
  for _ in 0..<10 {if element.exists && element.isHittable{return};app.swipeUp()}
  XCTAssertTrue(element.exists && element.isHittable,app.debugDescription)
 }
 func done(){if app.buttons["Done"].exists{app.buttons["Done"].tap()}}
 func test00EnglishFirstLaunchDiscovery() throws {
  shot("en-00-first-launch")
  XCTAssertTrue(text("Charts are not scientific predictions").exists)
  app.buttons["Birth chart"].tap();shot("en-01-empty-chart")
  XCTAssertTrue(text("Reading the chart").exists)
  app.buttons["Entries"].tap();shot("en-02-empty-entries")
  XCTAssertTrue(text("No saved entries yet").exists)
  app.buttons["Trends"].tap();shot("en-03-empty-trends")
  XCTAssertTrue(text("Enter birth details in Settings.").exists)
  app.buttons["Settings"].tap()
  let name=app.textFields["Name (optional)"];reach(name);name.tap();name.typeText("Demo English User")
  shot("en-04-name-keyboard")
  done()
  let date=app.otherElements.matching(NSPredicate(format:"label == 'Birth date'")).allElementsBoundByIndex.last!
  reach(date);date.tap();shot("en-05-birth-date-picker")
 }
 func test01ProfileSetupKeyboardAndChart() throws {
  app.buttons["Settings"].tap()
  let name=app.textFields["Name (optional)"];reach(name);name.tap();name.typeText("Demo English User")
  shot("en-04-name-keyboard")
  XCTAssertGreaterThanOrEqual(name.frame.minY,app.webViews.firstMatch.frame.minY)
  XCTAssertTrue(app.keyboards.firstMatch.exists)
  done()
  let date=app.otherElements.matching(NSPredicate(format:"label == 'Birth date'")).allElementsBoundByIndex.last!
  reach(date);date.tap();shot("en-05-birth-date-picker")
  app.buttons["Show year picker"].tap()
  app.pickerWheels.element(boundBy:1).adjust(toPickerWheelValue:"2000")
  app.pickerWheels.element(boundBy:0).adjust(toPickerWheelValue:"January")
  done();date.tap()
  app.buttons.matching(NSPredicate(format:"label ENDSWITH 'Sunday, January 2'")).firstMatch.tap();done()
  let time=app.otherElements.matching(NSPredicate(format:"label == 'Birth time'")).allElementsBoundByIndex.last!
  reach(time);time.tap();shot("en-06-birth-time-picker")
  app.pickerWheels.element(boundBy:0).adjust(toPickerWheelValue:"12")
  app.pickerWheels.element(boundBy:1).adjust(toPickerWheelValue:"00")
  app.pickerWheels.element(boundBy:2).adjust(toPickerWheelValue:"PM");done()
  let female=app.staticTexts["Female"];reach(female);female.tap()
  XCTAssertTrue(text("Birthplace time-zone conversion").exists)
  shot("en-07-profile-ready")
  let save=app.buttons["Save profile and open chart"];reach(save);save.tap()
  XCTAssertTrue(app.buttons["Scroll chart right"].waitForExistence(timeout:15),app.debugDescription)
  XCTAssertTrue(text("Demo English User").exists)
  XCTAssertTrue(text("2000-01-02 12:00").exists)
  shot("en-08-chart-top")
  app.buttons["Scroll chart right"].tap();shot("en-09-chart-scrolled")
  reach(text("Bazi / Four pillars"));shot("en-10-bazi")
 }
 func replaceNote(_ value:String) {
  let note=app.textViews.firstMatch;reach(note);note.tap();if app.buttons["Continue"].waitForExistence(timeout:1){app.buttons["Continue"].tap()};note.press(forDuration:1.2)
  shot("en-note-selection-menu")
  let select=app.menuItems.matching(NSPredicate(format:"label == 'Select All' OR label == '全選'")).firstMatch
  XCTAssertTrue(select.waitForExistence(timeout:5),app.debugDescription);select.tap();note.typeText(value)
  XCTAssertEqual(note.value as? String,value,app.debugDescription);done()
 }
 func saveEntry(){let save=app.buttons["Save entry"];reach(save);save.tap();XCTAssertTrue(text("Entry saved for").waitForExistence(timeout:10),app.debugDescription)}
 func test02JournalSaveRestartEditDraftAndDates() throws {
  app.buttons["Daily"].tap()
  let mood=app.descendants(matching:.any).matching(NSPredicate(format:"label == 'Mood 4 out of 5'")).firstMatch;reach(mood);mood.tap()
  app.descendants(matching:.any).matching(NSPredicate(format:"label == 'Energy 3 out of 5'")).firstMatch.tap()
  let note=app.textViews.firstMatch;reach(note);note.tap();note.typeText("First synthetic entry")
  XCTAssertGreaterThanOrEqual(note.frame.minY,app.webViews.firstMatch.frame.minY)
  shot("en-11-note-keyboard");done();saveEntry();shot("en-12-entry-saved")
  app.buttons["Entries"].tap();XCTAssertTrue(text("First synthetic entry").exists);XCTAssertTrue(text("1 saved entry").exists)
  app.terminate();app.launch();XCTAssertTrue(app.buttons["Entries"].waitForExistence(timeout:25));app.buttons["Entries"].tap()
  XCTAssertTrue(text("First synthetic entry").exists);shot("en-13-reopened-entry")
  app.buttons.matching(NSPredicate(format:"label BEGINSWITH 'Edit entry for '")).firstMatch.tap()
  XCTAssertEqual(app.textViews.firstMatch.value as? String,"First synthetic entry")
  replaceNote("Edited synthetic entry");saveEntry();app.buttons["Entries"].tap()
  XCTAssertTrue(text("1 saved entry").exists);XCTAssertTrue(text("Edited synthetic entry").exists);XCTAssertFalse(text("First synthetic entry").exists);shot("en-14-exact-edit")
  app.buttons["Daily"].tap();replaceNote("SESSION DRAFT ONLY")
  XCTAssertTrue(text("Unsaved draft").exists);app.buttons["Entries"].tap()
  XCTAssertTrue(text("Edited synthetic entry").exists);XCTAssertFalse(text("SESSION DRAFT ONLY").exists)
  app.buttons["Daily"].tap();XCTAssertEqual(app.textViews.firstMatch.value as? String,"SESSION DRAFT ONLY");shot("en-15-draft-restored")
  let date=app.otherElements.matching(NSPredicate(format:"label == 'Date'")).allElementsBoundByIndex.last!
  date.tap();shot("en-16-daily-calendar")
  app.buttons.matching(NSPredicate(format:"label ENDSWITH 'Tuesday, October 6'")).firstMatch.tap();done()
  XCTAssertNotEqual(app.textViews.firstMatch.value as? String,"SESSION DRAFT ONLY")
  reach(mood);mood.tap();app.descendants(matching:.any).matching(NSPredicate(format:"label == 'Energy 3 out of 5'")).firstMatch.tap()
  reach(note);note.tap();note.typeText("Second synthetic date");done();saveEntry()
  app.buttons["Today"].tap();XCTAssertEqual(app.textViews.firstMatch.value as? String,"SESSION DRAFT ONLY");shot("en-17-date-draft-restored")
  app.buttons["Entries"].tap();XCTAssertTrue(text("2 saved entries").exists);XCTAssertTrue(text("Edited synthetic entry").exists);XCTAssertTrue(text("Second synthetic date").exists)
  shot("en-18-two-entries");app.buttons["Trends"].tap();XCTAssertTrue(text("Mood and energy").waitForExistence(timeout:10));shot("en-19-two-entry-trends")
 }
 func test03RotationPrivacyAndKeyboardReturn() throws {
  app.buttons["Entries"].tap();XCUIDevice.shared.orientation = .landscapeLeft
  Thread.sleep(forTimeInterval:1);shot("en-20-landscape-entries")
  XCTAssertTrue(app.buttons["Export JSON backup"].isHittable)
  XCUIDevice.shared.orientation = .portrait;Thread.sleep(forTimeInterval:1)
  app.buttons["Settings"].tap();let privacy=app.links["Privacy information"];reach(privacy);privacy.tap()
  XCTAssertTrue(text("Offline iPhone privacy information").waitForExistence(timeout:10));shot("en-21-english-privacy")
  reach(text("Astrology is cultural interpretation"));shot("en-22-privacy-limits")
  app.swipeDown();app.swipeDown();app.swipeDown();let back=app.links["← Back to App"];XCTAssertTrue(back.isHittable);back.tap()
  XCTAssertTrue(app.buttons["Settings"].waitForExistence(timeout:15));app.buttons["Settings"].tap()
  let name=app.textFields["Name (optional)"];reach(name);name.tap();shot("en-23-keyboard-after-privacy")
  XCTAssertGreaterThanOrEqual(name.frame.minY,app.webViews.firstMatch.frame.minY);done()
  app.buttons["Entries"].tap();XCTAssertTrue(text("2 saved entries").exists);XCTAssertTrue(text("Edited synthetic entry").exists)
 }
 func localFolder() {
  let title=app.buttons.matching(NSPredicate(format:"label BEGINSWITH '紫微八字,'")).firstMatch
  if title.waitForExistence(timeout:2){return}
  let browse=app.buttons.matching(NSPredicate(format:"label == 'Browse' OR label == '瀏覽'")).firstMatch;if browse.exists{browse.tap()}
  if title.waitForExistence(timeout:3){return}
  let local=app.cells.matching(NSPredicate(format:"label BEGINSWITH 'On My iPhone' OR (label CONTAINS '我的' AND label CONTAINS 'iPhone')")).firstMatch
  if local.waitForExistence(timeout:5){local.tap()}
  if title.waitForExistence(timeout:2){return}
  let folder=app.cells.matching(NSPredicate(format:"label BEGINSWITH '紫微八字,'")).firstMatch
  XCTAssertTrue(folder.waitForExistence(timeout:10),app.debugDescription);folder.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.25)).tap()
  XCTAssertTrue(title.waitForExistence(timeout:8),app.debugDescription)
 }
 func pick(_ name:String) {
  app.buttons["Import JSON"].tap()
  let cell=app.cells.matching(NSPredicate(format:"label BEGINSWITH %@",name+".json,")).firstMatch
  if !cell.waitForExistence(timeout:8){localFolder()}
  XCTAssertTrue(cell.waitForExistence(timeout:10),app.debugDescription);cell.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.25)).tap()
 }
 func verifyOriginal(_ count:Int){XCTAssertTrue(text("\(count) saved entries").exists);XCTAssertTrue(text("Demo English User").exists);XCTAssertTrue(text("Edited synthetic entry").exists);XCTAssertTrue(text("Second synthetic date").exists)}
 func test04FilesCancelErrorsAndMerge() throws {
  app.buttons["Entries"].tap();verifyOriginal(2)
  for index in 0..<3 {
   app.buttons["Import JSON"].tap();let cancel=app.buttons.matching(NSPredicate(format:"label == 'Cancel' OR label == '取消'")).firstMatch
   XCTAssertTrue(cancel.waitForExistence(timeout:12),app.debugDescription);if index==0{shot("en-24-files-picker")};cancel.tap()
   XCTAssertTrue(text("Import cancelled").waitForExistence(timeout:12));XCTAssertTrue(app.buttons["Import JSON"].isEnabled);verifyOriginal(2)
  }
  shot("en-25-three-cancels")
  pick("QA-original");XCTAssertTrue(text("1 added, 0 updated, 3 total entries").waitForExistence(timeout:12));verifyOriginal(3)
  for name in ["QA-invalid","QA-large","QA-utf8"] {
   pick(name);XCTAssertTrue(text("Could not import").waitForExistence(timeout:12));verifyOriginal(3);XCTAssertTrue(text("Original fixture note").exists);shot("en-26-"+name+"-preserved")
  }
  pick("QA-valid");XCTAssertTrue(text("1 added, 1 updated, 4 total entries").waitForExistence(timeout:12));verifyOriginal(4);XCTAssertTrue(text("Updated fixture note").exists);XCTAssertTrue(text("Added fixture note").exists)
  shot("en-27-valid-merge");pick("QA-valid");XCTAssertTrue(text("0 added, 0 updated, 4 total entries").waitForExistence(timeout:12));verifyOriginal(4);shot("en-28-repeat-import")
 }
 func test05ActualLocalJSONRoundtrip() throws {
  app.buttons["Entries"].tap();verifyOriginal(4);app.buttons["Export JSON backup"].tap()
  let close=app.buttons.matching(NSPredicate(format:"label == 'Close' OR label == '關閉'")).firstMatch
  let outside=app.otherElements["PopoverDismissRegion"]
  XCTAssertTrue(outside.waitForExistence(timeout:12)||close.exists,app.debugDescription);shot("en-29-share-sheet")
  if close.exists{close.tap()}else{outside.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.3)).tap()}
  XCTAssertTrue(text("Sharing cancelled").waitForExistence(timeout:12));verifyOriginal(4)
  app.buttons["Export JSON backup"].tap();let saveFiles=app.cells.matching(NSPredicate(format:"label == 'Save to Files' OR label == '儲存到檔案'")).firstMatch
  XCTAssertTrue(saveFiles.waitForExistence(timeout:12),app.debugDescription);saveFiles.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.25)).tap()
  let save=app.buttons.matching(NSPredicate(format:"label == 'Save' OR label == '儲存'")).firstMatch
  XCTAssertTrue(save.waitForExistence(timeout:15),app.debugDescription);localFolder();shot("en-30-verified-local-folder");save.tap()
  XCTAssertTrue(text("Sharing completed").waitForExistence(timeout:12));verifyOriginal(4);shot("en-31-export-completed")
  app.buttons["Import JSON"].tap();let exported=app.cells.matching(NSPredicate(format:"label BEGINSWITH 'ziwei-bazi-trend-'")).firstMatch
  XCTAssertTrue(exported.waitForExistence(timeout:12),app.debugDescription);exported.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.25)).tap()
  XCTAssertTrue(text("0 added, 0 updated, 4 total entries").waitForExistence(timeout:12));verifyOriginal(4);shot("en-32-local-roundtrip")
 }
 func test06EnglishCandidateScreenshots() throws {
  app.buttons["Daily"].tap();shot("en-store-01-daily")
  reach(text("Daily entry"));shot("en-store-02-journal")
  app.buttons["Birth chart"].tap();shot("en-store-03-chart-guide");reach(app.buttons["Scroll chart right"]);shot("en-store-04-chart")
  reach(text("Bazi / Four pillars"));shot("en-store-05-bazi")
  app.buttons["Entries"].tap();shot("en-store-06-entries")
  app.buttons["Trends"].tap();shot("en-store-07-trends")
  app.buttons["Settings"].tap();shot("en-store-08-settings")
 }





 func test07LargeEnglishScreenshotSetup() throws {
  app.buttons["Entries"].tap();pick("QA-gallery")
  XCTAssertTrue(text("21 added, 0 updated, 21 total entries").waitForExistence(timeout:15),app.debugDescription)
  XCTAssertTrue(text("Demo English User").exists)
  try test06EnglishCandidateScreenshots()
 }
}
