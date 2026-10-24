import XCTest

// UI-driven user review: no diagnostic launch flag or storage/bootstrap injection.
// The app under review is the unmodified Release; only this test runner changes.
final class FirstTimeUXChecks: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launchEnvironment["TZ"] = "America/New_York"
        app.launch()
        XCTAssertTrue(app.buttons["記錄"].waitForExistence(timeout: 25))
    }
    func shot(_ name: String) {
        Thread.sleep(forTimeInterval: 0.7) // Let native sheet/layout transitions settle before capturing.
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + "-hierarchy"; tree.lifetime = .keepAlways; add(tree)
    }
    func contains(_ text: String) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }
    func reach(_ element: XCUIElement) {
        for _ in 0..<8 { if element.exists && element.isHittable { return }; app.swipeUp() }
        XCTAssertTrue(element.isHittable, app.debugDescription)
    }
    func test03JournalPersistenceAndDraft() throws {
        app.buttons["今日流運"].tap()
        let mood = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "心情 4 分")).firstMatch
        reach(mood); mood.tap()
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "精力 3 分")).firstMatch.tap()
        let note = app.textViews.firstMatch
        reach(note); note.tap(); note.typeText("Synthetic US review - first day")
        shot("us-17-journal-keyboard")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        reach(app.buttons["儲存記錄"]); app.buttons["儲存記錄"].tap()
        XCTAssertTrue(contains("已儲存").waitForExistence(timeout: 8), app.debugDescription)
        shot("us-18-journal-saved")
        app.buttons["記錄"].tap()
        XCTAssertTrue(contains("Synthetic US review - first day").exists, app.debugDescription)
        shot("us-19-record-card")
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["記錄"].waitForExistence(timeout: 20))
        app.buttons["記錄"].tap()
        XCTAssertTrue(contains("Synthetic US review - first day").exists)
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH '編輯 '")).firstMatch.tap()
        let edit = app.textViews.firstMatch
        XCTAssertEqual(edit.value as? String, "Synthetic US review - first day")
        reach(edit); edit.tap()
        edit.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 31) + "Synthetic US review - edited")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        app.buttons["儲存記錄"].tap()
        XCTAssertTrue(contains("已儲存").waitForExistence(timeout: 8))
        app.buttons["記錄"].tap()
        XCTAssertTrue(contains("共 1 筆記錄").exists)
        XCTAssertTrue(contains("Synthetic US review - edited").exists, app.debugDescription)
        shot("us-20-edited-record")
        app.buttons["趨勢分析"].tap(); shot("us-21-one-record-trends")
        app.buttons["今日流運"].tap(); reach(app.textViews.firstMatch)
        app.textViews.firstMatch.tap(); app.textViews.firstMatch.typeText(" UNSAVED")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        shot("us-22-unsaved-draft")
        app.buttons["記錄"].tap(); app.buttons["今日流運"].tap()
        reach(app.textViews.firstMatch); shot("us-23-returned-draft")
    }
    func test04CalendarTrendsPrivacyAndRotation() throws {
        app.buttons["今日流運"].tap()
        app.otherElements.matching(NSPredicate(format: "label == '日期'")).allElementsBoundByIndex.last!.tap()
        shot("us-24-daily-calendar")
        app.buttons.matching(NSPredicate(format: "label ENDSWITH 'Tuesday, October 6'")).firstMatch.tap(); app.buttons["Done"].tap()
        let mood = app.descendants(matching: .any).matching(NSPredicate(format: "label == '心情 4 分'")).firstMatch
        reach(mood); mood.tap()
        app.descendants(matching: .any).matching(NSPredicate(format: "label == '精力 3 分'")).firstMatch.tap()
        reach(app.textViews.firstMatch); app.textViews.firstMatch.tap()
        app.textViews.firstMatch.typeText("Synthetic US review - second date")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        app.buttons["儲存記錄"].tap()
        XCTAssertTrue(contains("已儲存").waitForExistence(timeout: 8))
        app.buttons["記錄"].tap()
        XCTAssertTrue(contains("共 2 筆記錄").exists)
        XCTAssertTrue(contains("2026-10-06").exists)
        shot("us-25-two-date-records")
        app.buttons["今日流運"].tap(); app.buttons["回到今天"].tap()
        shot("us-26-return-to-today")
        app.buttons["趨勢分析"].tap(); shot("us-27-two-record-trends")
        app.swipeUp(); app.swipeUp(); app.swipeUp(); shot("us-28-trends-preview")
        app.buttons["設定"].tap(); reach(app.links["隱私權政策"])
        app.links["隱私權政策"].tap()
        XCTAssertTrue(contains("iPhone 離線版隱私說明").waitForExistence(timeout: 8))
        shot("us-29-local-privacy")
        app.swipeUp(); app.swipeUp(); shot("us-30-privacy-support")
        app.links["← 回到 App"].tap()
        XCTAssertTrue(app.buttons["記錄"].waitForExistence(timeout: 8))
        app.buttons["記錄"].tap(); shot("us-31-privacy-return-records")
        XCUIDevice.shared.orientation = .landscapeLeft
        shot("us-32-landscape-records")
        XCUIDevice.shared.orientation = .portrait
    }
    func test05ShareAndSaveFilesDiscovery() throws {
        app.buttons["記錄"].tap(); app.buttons["匯出 JSON"].tap()
        let close = app.buttons.matching(NSPredicate(format: "label == 'Close' OR label == '關閉'")).firstMatch
        let outside = app.otherElements["PopoverDismissRegion"]
        XCTAssertTrue(outside.waitForExistence(timeout: 12) || close.exists, app.debugDescription)
        shot("us-33-json-share")
        if close.exists { close.tap() }
        else { outside.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).tap() }
        XCTAssertTrue(contains("已取消分享").waitForExistence(timeout: 8)); shot("us-34-share-cancelled")
        app.buttons["匯出 JSON"].tap()
        let save = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'Save to Files' OR label == '儲存到檔案'")).firstMatch
        XCTAssertTrue(save.waitForExistence(timeout: 12), app.debugDescription)
        save.tap(); shot("us-35-save-to-files-destination")
    }
    func test06ImportCancelAndLocalDiscovery() throws {
        app.buttons["記錄"].tap(); app.buttons["匯入 JSON"].tap()
        let cancel = app.buttons.matching(NSPredicate(format: "label == 'Cancel' OR label == '取消'")).firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 12), app.debugDescription)
        shot("us-36-import-picker"); cancel.tap()
        XCTAssertTrue(contains("已取消匯入").waitForExistence(timeout: 8)); shot("us-37-import-cancelled")
        app.buttons["匯入 JSON"].tap()
        let browse = app.buttons.matching(NSPredicate(format: "label == 'Browse' OR label == '瀏覽'")).firstMatch
        if browse.waitForExistence(timeout: 3) { browse.tap() }
        let local = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'On My iPhone' OR (label CONTAINS '我的' AND label CONTAINS 'iPhone')")).firstMatch
        if local.waitForExistence(timeout: 3) { local.tap() }
        shot("us-38-local-files-discovery")
    }
    func test07SettingsAccessibility() throws {
        app.buttons["設定"].tap(); shot("us-39-settings-accessibility")
        if #available(iOS 17.0, *) {
            // Diagnostic collection, never a claim that accessibility passed.
            try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .hitRegion, .sufficientElementDescription]) { issue in
                print("US AUDIT \(issue.auditType) type=\(String(describing: issue.element?.elementType)) label=\(issue.element?.label ?? "unresolved") frame=\(String(describing: issue.element?.frame))")
                return true
            }
        }
    }
    func test10LeapDayAndEditSelection() throws {
        app.buttons["設定"].tap()
        let date = app.otherElements.matching(NSPredicate(format: "label == '出生日期'")).allElementsBoundByIndex.last!
        date.tap(); app.buttons["Show year picker"].tap()
        app.pickerWheels.element(boundBy: 1).adjust(toPickerWheelValue: "2000")
        app.pickerWheels.element(boundBy: 0).adjust(toPickerWheelValue: "February")
        app.buttons["Done"].tap(); date.tap()
        app.buttons["Tuesday, February 29"].tap(); app.buttons["Done"].tap()
        shot("us-47-leap-date-profile"); app.buttons["儲存並排盤"].tap()
        XCTAssertTrue(contains("2000-02-29 12:00").waitForExistence(timeout: 12)); shot("us-48-leap-date-saved")
        app.buttons["記錄"].tap()
        app.buttons["編輯 2026-10-07 的記錄"].tap()
        reach(app.textViews.firstMatch); app.textViews.firstMatch.press(forDuration: 1.2)
        shot("us-49-edit-selection-menu")
    }
    func selectLocalFixture(_ name: String) {
        app.buttons["匯入 JSON"].tap()
        let cell = app.cells.matching(NSPredicate(format: "label BEGINSWITH %@", name + ".json,")).firstMatch
        XCTAssertTrue(cell.waitForExistence(timeout: 12), app.debugDescription)
        cell.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
    }
    func test08FilesErrorsAndNonemptyMerge() throws {
        app.buttons["記錄"].tap()
        selectLocalFixture("manual-original")
        XCTAssertTrue(contains("新增 1 筆、更新 0 筆，共 3 筆").waitForExistence(timeout: 12), app.debugDescription)
        shot("us-40-import-original-nonempty")
        for (name, message) in [("manual-invalid", "匯入失敗"), ("manual-large", "5 MB"), ("manual-utf8", "UTF-8")] {
            selectLocalFixture(name)
            XCTAssertTrue(contains(message).waitForExistence(timeout: 12), app.debugDescription)
            XCTAssertTrue(contains("共 3 筆記錄").exists)
            XCTAssertTrue(contains("Demo US User").exists)
            XCTAssertTrue(contains("Synthetic US review").exists)
            shot("us-41-" + name + "-preserved")
        }
        selectLocalFixture("manual-valid")
        XCTAssertTrue(contains("新增 1 筆、更新 1 筆，共 4 筆").waitForExistence(timeout: 12), app.debugDescription)
        XCTAssertTrue(contains("Demo US User").exists)
        XCTAssertTrue(contains("Manual-updated").exists)
        XCTAssertTrue(contains("Manual-added").exists)
        shot("us-42-valid-merge-preserved")
        selectLocalFixture("manual-valid")
        XCTAssertTrue(contains("新增 0 筆、更新 0 筆，共 4 筆").waitForExistence(timeout: 12))
        shot("us-43-repeated-merge")
    }
    func test09LocalRoundTrip() throws {
        app.buttons["記錄"].tap(); app.buttons["匯出 JSON"].tap()
        let save = app.cells.matching(NSPredicate(format: "label == 'Save to Files' OR label == '儲存到檔案'")).firstMatch
        XCTAssertTrue(save.waitForExistence(timeout: 12))
        save.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        let confirm = app.buttons.matching(NSPredicate(format: "label == 'Save' OR label == '儲存'")).firstMatch
        let reached = confirm.waitForExistence(timeout: 15)
        shot("us-44-local-save-stage")
        XCTAssertTrue(reached, app.debugDescription)
        // Only use the verified local app folder. Never save to a cloud destination.
        let folderTitle = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '紫微八字,'")).firstMatch
        if !folderTitle.exists {
            let localRoot = app.otherElements["DOC.browsingRoot Source: com.apple.FileProvider.LocalStorage, Title: On My iPhone"]
            XCTAssertTrue(localRoot.exists, app.debugDescription)
            let folder = app.cells.matching(NSPredicate(format: "label BEGINSWITH '紫微八字,'")).firstMatch
            XCTAssertTrue(folder.exists, app.debugDescription)
            folder.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        }
        XCTAssertTrue(folderTitle.waitForExistence(timeout: 8), app.debugDescription)
        shot("us-44b-verified-local-app-folder")
        confirm.tap()
        XCTAssertTrue(contains("分享完成").waitForExistence(timeout: 12))
        shot("us-45-export-saved")
        app.buttons["匯入 JSON"].tap()
        let export = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'ziwei-bazi-trend-'")).firstMatch
        XCTAssertTrue(export.waitForExistence(timeout: 12), app.debugDescription)
        export.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        XCTAssertTrue(contains("新增 0 筆、更新 0 筆，共 4 筆").waitForExistence(timeout: 12))
        XCTAssertTrue(contains("Demo US User").exists)
        shot("us-46-real-local-roundtrip")
    }
    func test01FirstLaunchAndPickerDiscovery() throws {
        shot("us-01-first-launch")
        app.buttons["本命盤"].tap(); shot("us-02-empty-chart")
        app.buttons["記錄"].tap(); shot("us-03-empty-records")
        app.buttons["趨勢分析"].tap(); shot("us-04-empty-trends")
        app.buttons["設定"].tap()
        XCTAssertTrue(app.textFields["姓名"].waitForExistence(timeout: 10))
        shot("us-05-empty-settings")
        app.buttons["儲存並排盤"].tap(); shot("us-06-incomplete-profile")
        app.textFields["姓名"].tap(); app.textFields["姓名"].typeText("Demo US User")
        shot("us-07-name-keyboard")
        let date = app.otherElements.matching(NSPredicate(format: "label == %@", "出生日期")).allElementsBoundByIndex.last!
        XCTAssertTrue(date.exists, app.debugDescription)
        date.tap(); shot("us-08-birth-date-picker")
    }
    func test02ProfilePicker() throws {
        app.buttons["設定"].tap()
        let date = app.otherElements.matching(NSPredicate(format: "label == %@", "出生日期")).allElementsBoundByIndex.last!
        date.tap(); shot("us-08-birth-date-picker")
        app.buttons["Show year picker"].tap()
        shot("us-09-birth-month-year-picker")
        app.pickerWheels.element(boundBy: 1).adjust(toPickerWheelValue: "2000")
        app.pickerWheels.element(boundBy: 0).adjust(toPickerWheelValue: "January")
        app.buttons["Done"].tap()
        date.tap()
        app.buttons["Sunday, January 2"].tap()
        app.buttons["Done"].tap()
        app.otherElements.matching(NSPredicate(format: "label == %@", "出生時間")).allElementsBoundByIndex.last!.tap()
        shot("us-10-birth-time-picker")
        app.pickerWheels.element(boundBy: 0).adjust(toPickerWheelValue: "12")
        app.pickerWheels.element(boundBy: 1).adjust(toPickerWheelValue: "00")
        app.pickerWheels.element(boundBy: 2).adjust(toPickerWheelValue: "PM")
        app.buttons["Done"].tap()
        app.textFields["姓名"].tap(); app.textFields["姓名"].typeText("Demo US User")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        app.staticTexts["女"].tap(); shot("us-11-complete-profile")
        app.buttons["儲存並排盤"].tap()
        XCTAssertTrue(app.buttons["命盤向右捲動"].waitForExistence(timeout: 15), app.debugDescription)
        shot("us-12-saved-chart")
        app.buttons["命盤向右捲動"].tap(); shot("us-13-chart-right")
        app.swipeUp(); app.swipeUp(); shot("us-14-chart-bazi")
        app.buttons["今日流運"].tap(); shot("us-15-daily-profile")
        app.swipeUp(); app.swipeUp(); shot("us-16-daily-record-form")
    }
}

