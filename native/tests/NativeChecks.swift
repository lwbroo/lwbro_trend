import XCTest

final class NativeChecks: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        #if DEBUG
        app.launchEnvironment["ZIWEI_UI_TEST"] = "1"
        #endif
        app.launch()
        XCTAssertTrue(app.buttons["記錄"].waitForExistence(timeout: 25))
    }

    func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func textContains(_ value: String) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", value)).firstMatch
    }

    func file(_ name: String) -> XCUIElement {
        app.cells.matching(NSPredicate(format: "label BEGINSWITH %@", name + ".json,")).firstMatch
    }

    func pick(_ name: String) {
        let item = file(name)
        XCTAssertTrue(item.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(item.isHittable, app.debugDescription)
        // Select the actual file cell once, away from its multiline filename label.
        item.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
    }

    func localAppFolder() {
        let title = app.navigationBars.descendants(matching: .any).matching(NSPredicate(format: "label == '紫微八字' OR label BEGINSWITH '紫微八字,'")).firstMatch
        if title.waitForExistence(timeout: 3) { return }
        let browse = app.buttons.matching(NSPredicate(format: "label == '瀏覽' OR label == 'Browse'")).firstMatch
        if browse.exists { browse.tap() }
        let local = app.cells.matching(NSPredicate(format: "(label CONTAINS '我的' AND (label CONTAINS 'iPhone' OR label CONTAINS 'iPad')) OR label BEGINSWITH 'On My iPhone' OR label BEGINSWITH 'On My iPad'")).firstMatch
        if local.waitForExistence(timeout: 8) { local.tap() }
        let folder = app.cells.matching(NSPredicate(format: "label BEGINSWITH '紫微八字'")).firstMatch
        XCTAssertTrue(folder.waitForExistence(timeout: 12), app.debugDescription)
        folder.tap()
        XCTAssertTrue(title.waitForExistence(timeout: 12), app.debugDescription)
    }

    func importLocal(_ name: String) {
        app.buttons["匯入 JSON"].tap()
        if !file(name).waitForExistence(timeout: 3) { localAppFolder() }
        pick(name)
    }

    func recordsSummary() -> String {
        let count = textContains("筆記錄")
        return count.exists ? count.label : textContains("還沒有任何記錄").label
    }

    func testStoreScreenshots() throws {
        #if DEBUG
        app.launchEnvironment["ZIWEI_STORE_SCREENSHOTS"] = "1"
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["記錄"].waitForExistence(timeout: 25))
        let header = textContains("個人趨勢資料庫")
        XCTAssertTrue(header.exists)
        if app.statusBars.firstMatch.exists {
            XCTAssertGreaterThanOrEqual(header.frame.minY, app.statusBars.firstMatch.frame.maxY)
        }
        capture("store-01-daily")
        app.buttons["本命盤"].tap()
        XCTAssertTrue(textContains("紫微斗數本命盤").waitForExistence(timeout: 10))
        let right = app.buttons["命盤向右捲動"]
        let left = app.buttons["命盤向左捲動"]
        XCTAssertTrue(right.waitForExistence(timeout: 10) && right.isHittable && right.isEnabled)
        capture("store-02-natal")
        right.tap()
        XCTAssertTrue(left.waitForExistence(timeout: 5) && left.isEnabled)
        capture("layout-chart-right")
        left.tap()
        app.buttons["記錄"].tap()
        XCTAssertTrue(textContains("共 21 筆記錄").waitForExistence(timeout: 10))
        capture("store-04-records")
        app.buttons["趨勢分析"].tap()
        XCTAssertTrue(textContains("心情與精力走勢").waitForExistence(timeout: 10))
        capture("store-05-trends")
        app.buttons["設定"].tap()
        XCTAssertTrue(app.textFields["姓名"].waitForExistence(timeout: 10))
        capture("store-06-settings")
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'AI 問答'")).firstMatch.exists)
        XCTAssertFalse(app.buttons["連線雲端"].exists)
        XCTAssertTrue(textContains("離線排盤與個人日誌").exists)
        // Capture top-level pages first, then chart scroll/edit navigation; no Files operations.
        app.buttons["本命盤"].tap()
        XCTAssertTrue(textContains("紫微斗數本命盤").waitForExistence(timeout: 10))
        let bazi = textContains("八字命盤")
        for _ in 0..<3 {
            if bazi.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(bazi.isHittable)
        capture("store-03-natal-detail")
        app.buttons["記錄"].tap()
        XCTAssertTrue(textContains("共 21 筆記錄").waitForExistence(timeout: 10))
        let edit = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '編輯 ' AND label ENDSWITH ' 的記錄'")).firstMatch
        XCTAssertTrue(edit.waitForExistence(timeout: 10))
        for _ in 0..<3 {
            if edit.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(edit.isHittable)
        capture("layout-record-actions")
        edit.tap()
        XCTAssertTrue(textContains("當日狀態記錄").waitForExistence(timeout: 10))
        capture("layout-record-edit")
        app.buttons["趨勢分析"].tap()
        XCTAssertTrue(textContains("心情與精力走勢").waitForExistence(timeout: 10))
        capture("layout-tab-reset-after-edit")
        app.buttons["設定"].tap()
        let privacy = app.links["隱私權政策"]
        for _ in 0..<5 {
            if privacy.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(privacy.isHittable)
        privacy.tap()
        XCTAssertTrue(textContains("iPhone 離線版隱私說明").waitForExistence(timeout: 10))
        capture("offline-privacy-local")
        let back = app.links["← 回到 App"]
        XCTAssertTrue(back.isHittable)
        if app.statusBars.firstMatch.exists {
            XCTAssertGreaterThanOrEqual(back.frame.minY, app.statusBars.firstMatch.frame.maxY)
        }
        back.tap()
        XCTAssertTrue(app.buttons["記錄"].waitForExistence(timeout: 15))
        #else
        throw XCTSkip("Screenshot-only Debug fixture; no Files operations or shipping data injection")
        #endif
    }

    func testReleaseImportCancelInvalidAndRepeat() throws {
        #if DEBUG
        throw XCTSkip("Release-only test with fixtures seeded outside the executable")
        #else
        app.buttons["記錄"].tap()
        capture("release-records-before-import")
        for _ in 0..<3 {
            app.buttons["匯入 JSON"].tap()
            let cancel = app.buttons.matching(NSPredicate(format: "label == 'Cancel' OR label == '取消'")).firstMatch
            XCTAssertTrue(cancel.waitForExistence(timeout: 15), app.debugDescription)
            cancel.tap()
            XCTAssertTrue(textContains("已取消匯入").waitForExistence(timeout: 10))
            XCTAssertTrue(app.buttons["匯入 JSON"].isEnabled)
        }
        capture("release-three-import-cancellations")
        importLocal("Synthetic-start")
        XCTAssertTrue(textContains("匯入完成").waitForExistence(timeout: 12), app.debugDescription)
        XCTAssertTrue(textContains("synthetic only").exists)
        importLocal("Synthetic-invalid")
        XCTAssertTrue(textContains("匯入失敗").waitForExistence(timeout: 12))
        XCTAssertTrue(textContains("synthetic only").exists)
        XCTAssertTrue(textContains("共 1 筆記錄").exists)
        importLocal("Synthetic-large")
        XCTAssertTrue(textContains("5 MB").waitForExistence(timeout: 12))
        XCTAssertTrue(textContains("共 1 筆記錄").exists)
        importLocal("Synthetic-valid")
        XCTAssertTrue(textContains("匯入完成").waitForExistence(timeout: 12))
        XCTAssertTrue(textContains("synthetic import").exists)
        XCTAssertTrue(textContains("synthetic only").exists)
        importLocal("Synthetic-valid")
        XCTAssertTrue(textContains("新增 0 筆、更新 0 筆，共 2 筆").waitForExistence(timeout: 12))
        capture("release-invalid-size-repeat-preservation")
        #endif
    }

    func testReleaseSaveToFilesRoundTrip() throws {
        #if DEBUG
        throw XCTSkip("Release-only test using actual local Save to Files")
        #else
        app.buttons["記錄"].tap()
        let originalCount = recordsSummary()
        app.buttons["匯出 JSON"].tap()
        let close = app.buttons.matching(NSPredicate(format: "label == 'Close' OR label == '關閉'")).firstMatch
        let outside = app.otherElements["PopoverDismissRegion"]
        XCTAssertTrue(outside.waitForExistence(timeout: 15) || close.exists, app.debugDescription)
        if close.exists { close.tap() }
        else { outside.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).tap() }
        XCTAssertTrue(textContains("已取消分享").waitForExistence(timeout: 12))
        app.buttons["匯出 JSON"].tap()
        let saveToFiles = app.descendants(matching: .any).matching(NSPredicate(format: "label == '儲存到檔案' OR label == 'Save to Files'")).firstMatch
        XCTAssertTrue(saveToFiles.waitForExistence(timeout: 15), app.debugDescription)
        capture("release-native-share-sheet")
        saveToFiles.tap()
        localAppFolder()
        let save = app.buttons.matching(NSPredicate(format: "label == 'Save' OR label == '儲存'")).firstMatch
        XCTAssertTrue(save.waitForExistence(timeout: 12), app.debugDescription)
        capture("release-save-to-owned-local-folder")
        save.tap()
        XCTAssertTrue(textContains("分享完成").waitForExistence(timeout: 15), app.debugDescription)
        app.buttons["匯入 JSON"].tap()
        let exported = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'ziwei-bazi-trend-'")).firstMatch
        if !exported.waitForExistence(timeout: 3) { localAppFolder() }
        XCTAssertTrue(exported.waitForExistence(timeout: 15), app.debugDescription)
        exported.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        XCTAssertTrue(textContains("匯入完成").waitForExistence(timeout: 12), app.debugDescription)
        XCTAssertEqual(recordsSummary(), originalCount)
        capture("release-real-files-roundtrip")
        #endif
    }

    func testShareSheetCancelAndScreens() throws {
        capture("synthetic-today")
        app.buttons["本命盤"].tap()
        capture("synthetic-chart")
        app.buttons["記錄"].tap()
        app.buttons["匯出 JSON"].tap()
        let close = app.buttons.matching(NSPredicate(format: "label == 'Close' OR label == '關閉'")).firstMatch
        let outside = app.otherElements["PopoverDismissRegion"]
        XCTAssertTrue(outside.waitForExistence(timeout: 12) || close.exists, app.debugDescription)
        capture("native-share-sheet")
        if close.exists { close.tap() }
        else { outside.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).tap() }
        XCTAssertTrue(textContains("已取消分享").waitForExistence(timeout: 8))
        app.buttons["匯出 JSON"].tap()
        let local = app.descendants(matching: .any).matching(NSPredicate(format: "label == '本機測試備份'")).firstMatch
        XCTAssertTrue(local.waitForExistence(timeout: 8), app.debugDescription)
        local.tap()
        XCTAssertTrue(textContains("分享完成").waitForExistence(timeout: 8))
        app.buttons["匯入 JSON"].tap()
        XCTAssertTrue(file("Shared-synthetic").waitForExistence(timeout: 8))
        pick("Shared-synthetic")
        XCTAssertTrue(textContains("匯入完成").waitForExistence(timeout: 8))
        capture("native-local-share-roundtrip")
        app.buttons["趨勢分析"].tap()
        capture("synthetic-trends")
        app.buttons["設定"].tap()
        XCTAssertTrue(app.textFields["姓名"].waitForExistence(timeout: 5))
        capture("synthetic-settings")
    }

    func testDocumentPickerCancelInvalidAndValidImport() throws {
        app.buttons["記錄"].tap()
        app.buttons["匯入 JSON"].tap()
        let cancel = app.buttons.matching(NSPredicate(format: "label == 'Cancel' OR label == '取消'")).firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 12), app.debugDescription)
        capture("native-import-picker")
        cancel.tap()
        XCTAssertTrue(textContains("已取消匯入").waitForExistence(timeout: 8))
        XCTAssertTrue(textContains("synthetic only").exists)

        app.buttons["匯入 JSON"].tap()
        XCTAssertTrue(file("Synthetic-invalid").waitForExistence(timeout: 12), app.debugDescription)
        pick("Synthetic-invalid")
        XCTAssertTrue(textContains("匯入失敗").waitForExistence(timeout: 8))
        XCTAssertTrue(textContains("synthetic only").exists)
        capture("native-invalid-import")

        app.buttons["匯入 JSON"].tap()
        XCTAssertTrue(file("Synthetic-valid").waitForExistence(timeout: 12))
        pick("Synthetic-valid")
        XCTAssertTrue(textContains("匯入完成").waitForExistence(timeout: 8))
        XCTAssertTrue(textContains("synthetic import").exists)
        XCTAssertTrue(textContains("synthetic only").exists)
        capture("native-valid-import")
    }

    func testSettingsAccessibilityAudit() throws {
        app.buttons["設定"].tap()
        XCTAssertTrue(app.textFields["姓名"].waitForExistence(timeout: 8))
        if #available(iOS 17.0, *) {
            try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .hitRegion, .sufficientElementDescription]) { issue in
                // WKWebView reports noninteractive subtitle/paragraph text as tiny hit targets.
                // Keep control hit-area, contrast and description checks strict.
                if issue.auditType == .hitRegion, issue.element?.elementType == .staticText {
                    print("AUDIT noninteractive static text hit region: \(issue.element?.label ?? "")")
                    return true
                }
                return false
            }
        }
        capture("accessibility-settings")
    }
}
