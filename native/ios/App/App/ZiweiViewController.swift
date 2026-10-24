import Capacitor
import UIKit
import UniformTypeIdentifiers
import WebKit

final class ZiweiViewController: CAPBridgeViewController {
    private var appliedSafeInsets: UIEdgeInsets?
    private var navigationObservation: NSKeyValueObservation?

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let webView = webView else { return }
        // Keep keyboard-driven WKWebView scrolling inside UIKit's safe area.
        // CSS padding alone cannot stop a shifted visual viewport painting under the clock.
        let container = UIView(frame: view.bounds)
        container.backgroundColor = UIColor(red: 249 / 255.0, green: 249 / 255.0, blue: 247 / 255.0, alpha: 1)
        view = container
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.clipsToBounds = true
        container.addSubview(webView)
        let safe = container.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: safe.topAnchor),
            webView.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: safe.trailingAnchor)
        ])
        appliedSafeInsets = nil
        updateSafeArea()
    }

    private var contentSafeInsets: UIEdgeInsets {
        // The contained WebView already excludes all four system safe-area edges.
        // Avoid adding the same UIKit inset again in app/privacy CSS.
        if let webView = webView, webView.superview === view { return .zero }
        return view.window?.safeAreaInsets ?? view.safeAreaInsets
    }

    private func safeAreaScript() -> String {
        let insets = contentSafeInsets
        return """
        window.ZWBZ_NATIVE_INSETS = {top:\(insets.top),bottom:\(insets.bottom)};
        (() => {
          const apply = () => {
            document.documentElement.style.setProperty('--native-safe-top', '\(insets.top)px');
            document.documentElement.style.setProperty('--native-safe-bottom', '\(insets.bottom)px');
          };
          if (document.documentElement) apply();
          else document.addEventListener('DOMContentLoaded', apply, {once:true});
        })();
        """
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        updateSafeArea()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateSafeArea()
    }

    private func updateSafeArea() {
        guard let webView = webView else { return }
        let insets = contentSafeInsets
        guard appliedSafeInsets != insets else { return }
        appliedSafeInsets = insets
        webView.evaluateJavaScript(safeAreaScript(), completionHandler: nil)
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ShareExportPlugin())
        // WKWebView can report zero CSS env insets on the installed runtime.
        // Persist measured UIKit insets across local privacy/back navigations.
        webView?.configuration.userContentController.addUserScript(WKUserScript(source: safeAreaScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        navigationObservation = webView?.observe(\.isLoading, options: [.new]) { [weak self] webView, _ in
            guard !webView.isLoading, let self = self else { return }
            self.appliedSafeInsets = nil
            self.updateSafeArea()
        }
        appliedSafeInsets = nil
        updateSafeArea()
        #if DEBUG
        if ProcessInfo.processInfo.environment["ZIWEI_UI_TEST"] == "1" {
            var bootstrap = """
            localStorage.clear();
            localStorage.setItem('zwbz.profile', JSON.stringify({name:'虛構測試人物',birthDate:'2000-01-01',birthTime:'12:00',gender:'女'}));
            localStorage.setItem('zwbz.records',JSON.stringify([{date:'2026-10-04',mood:3,energy:4,tags:[],note:'synthetic only',updatedAt:'2026-10-04T00:00:00Z'}]));
            """
            if ProcessInfo.processInfo.environment["ZIWEI_STORE_SCREENSHOTS"] == "1" {
                bootstrap += """
                const exampleProfile = JSON.parse(localStorage.getItem('zwbz.profile'));
                exampleProfile.name = '示範人物';
                localStorage.setItem('zwbz.profile', JSON.stringify(exampleProfile));
                const exampleRecords = Array.from({length:21}, (_,i) => {
                    const d = new Date(); d.setDate(d.getDate()-20+i);
                    const ds = [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
                    return {date:ds,mood:[3,4,3,2,4,5,3][i%7],energy:[4,3,4,2,3,4,5][i%7],
                        tags:i%2===0?['散步']:['閱讀'],note:'合成示範資料，非真實使用者紀錄',updatedAt:ds+'T00:00:00Z'};
                });
                localStorage.setItem('zwbz.records',JSON.stringify(exampleRecords));
                """
            }
            webView?.configuration.userContentController.addUserScript(WKUserScript(source: bootstrap, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            try? "{\"records\":[{\"date\":\"2026-10-03\",\"mood\":4,\"energy\":3,\"tags\":[],\"note\":\"synthetic import\",\"updatedAt\":\"2026-10-03T00:00:00Z\"}]}".write(to: directory.appendingPathComponent("Synthetic-valid.json"), atomically: true, encoding: .utf8)
            try? "{bad json".write(to: directory.appendingPathComponent("Synthetic-invalid.json"), atomically: true, encoding: .utf8)
        }
        #endif
    }
}

@objc(ShareExportPlugin)
public final class ShareExportPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
    public let identifier = "ShareExportPlugin"
    public let jsName = "ShareExport"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "importBackup", returnType: CAPPluginReturnPromise)]
    private var importCall: CAPPluginCall?
    private var shareCall: CAPPluginCall?
    private var shareFolder: URL?
    private var importPicker: UIDocumentPickerViewController?
    private var shareController: UIActivityViewController?
    private var importFinishing = false
    private var shareFinishing = false
    private let exportRoot = FileManager.default.temporaryDirectory.appendingPathComponent("ziwei-exports", isDirectory: true)

    private func trace(_ event: String) {
        #if DEBUG
        guard ProcessInfo.processInfo.environment["ZIWEI_UI_TEST"] == "1" else { return }
        let file = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("native-check-events.txt")
        let existing = (try? String(contentsOf: file, encoding: .utf8)) ?? ""
        try? (existing + "\(Date().timeIntervalSince1970) \(event)\n").write(to: file, atomically: true, encoding: .utf8)
        #endif
    }

    public override func load() {
        // A process interruption can skip the share completion callback.
        try? FileManager.default.removeItem(at: exportRoot)
    }

    @objc func share(_ call: CAPPluginCall) {
        guard let filename = call.getString("filename"), let text = call.getString("text"),
              filename == (filename as NSString).lastPathComponent,
              filename.hasSuffix(".json") || filename.hasSuffix(".csv") else {
            call.reject("匯出檔名或內容不正確")
            return
        }
        DispatchQueue.main.async {
            self.trace("share requested")
            var exportFolder: URL?
            do {
                guard let controller = self.bridge?.viewController, controller.presentedViewController == nil,
                      self.shareCall == nil, self.importCall == nil else {
                    call.reject("請先關閉目前的分享或匯入畫面")
                    return
                }
                let folder = self.exportRoot.appendingPathComponent(UUID().uuidString, isDirectory: true)
                exportFolder = folder
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                let file = folder.appendingPathComponent(filename)
                try text.write(to: file, atomically: true, encoding: .utf8)
                var localChecks: [UIActivity]?
                #if DEBUG
                if ProcessInfo.processInfo.environment["ZIWEI_UI_TEST"] == "1" { localChecks = [SyntheticLocalActivity()] }
                #endif
                let activity = UIActivityViewController(activityItems: [file], applicationActivities: localChecks)
                self.shareCall = call
                self.shareFolder = folder
                self.shareController = activity
                if UIDevice.current.userInterfaceIdiom == .pad {
                    activity.modalPresentationStyle = .popover
                    activity.popoverPresentationController?.sourceView = controller.view
                    activity.popoverPresentationController?.sourceRect = CGRect(x: controller.view.bounds.midX, y: controller.view.bounds.midY, width: 1, height: 1)
                } else {
                    activity.modalPresentationStyle = .pageSheet
                }
                activity.completionWithItemsHandler = { _, completed, _, error in
                    self.trace("share callback completed=\(completed) error=\(error != nil)")
                    self.finishShare(completed: completed, error: error, expectedCall: call)
                }
                controller.present(activity, animated: true)
                activity.presentationController?.delegate = self
            } catch {
                if let folder = exportFolder { try? FileManager.default.removeItem(at: folder) }
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func importBackup(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.trace("import requested pending=\(self.importCall != nil) presented=\(self.bridge?.viewController?.presentedViewController != nil)")
            guard let controller = self.bridge?.viewController,
                  controller.presentedViewController == nil, self.importCall == nil, self.shareCall == nil else {
                call.reject("請先關閉目前的分享或匯入畫面")
                return
            }
            self.importCall = call
            // Some Files providers tag .json backups as generic data rather than public.json.
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json, .data], asCopy: false)
            self.importPicker = picker
            picker.delegate = self
            picker.allowsMultipleSelection = false
            #if DEBUG
            if ProcessInfo.processInfo.environment["ZIWEI_UI_TEST"] == "1" {
                picker.directoryURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            }
            #endif
            controller.present(picker, animated: true) { self.trace("import presentation completed") }
            picker.presentationController?.delegate = self
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        trace("import cancel callback matches=\(controller === importPicker)")
        guard controller === importPicker else { return }
        finishImport(controller) { $0.resolve(["cancelled": true]) }
    }

    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        trace("presentation dismissed import=\(presentationController.presentedViewController === importPicker) share=\(presentationController.presentedViewController === shareController)")
        if presentationController.presentedViewController === shareController {
            finishShare(completed: false, error: nil)
        }
        if presentationController.presentedViewController === importPicker {
            if let picker = importPicker { finishImport(picker) { $0.resolve(["cancelled": true]) } }
        }
    }

    // Keep the request active until UIKit has finished removing its presentation.
    // A callback can arrive while dismissal is still animating.
    private func afterDismiss(_ controller: UIViewController?, completion: @escaping () -> Void) {
        guard let controller = controller else { completion(); return }
        if controller.isBeingDismissed, let transition = controller.transitionCoordinator,
           transition.animate(alongsideTransition: nil, completion: { _ in completion() }) { return }
        if controller.presentingViewController != nil {
            controller.dismiss(animated: true, completion: completion)
        } else { completion() }
    }

    private func finishImport(_ controller: UIDocumentPickerViewController, result: @escaping (CAPPluginCall) -> Void) {
        guard controller === importPicker, let call = importCall, !importFinishing else { return }
        importFinishing = true
        afterDismiss(controller) {
            guard self.importCall === call else { return }
            self.importCall = nil
            self.importPicker = nil
            self.importFinishing = false
            self.trace("import settled after dismissal")
            result(call)
        }
    }

    private func finishShare(completed: Bool, error: Error?, expectedCall: CAPPluginCall? = nil) {
        guard let call = shareCall, !shareFinishing else { return }
        if let expectedCall = expectedCall, call !== expectedCall { return }
        shareFinishing = true
        afterDismiss(shareController) {
            guard self.shareCall === call else { return }
            self.shareCall = nil
            self.shareController = nil
            self.shareFinishing = false
            if let folder = self.shareFolder { try? FileManager.default.removeItem(at: folder) }
            self.shareFolder = nil
            self.trace("share settled after dismissal")
            if let error = error { call.reject(error.localizedDescription) }
            else { call.resolve(["completed": completed]) }
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        trace("import pick callback matches=\(controller === importPicker) count=\(urls.count)")
        guard controller === importPicker, importCall != nil, !importFinishing else { return }
        guard let file = urls.first else { finishImport(controller) { $0.resolve(["cancelled": true]) }; return }
        guard file.pathExtension.lowercased() == "json" else { finishImport(controller) { $0.reject("請選擇 .json 備份檔案") }; return }
        let scoped = file.startAccessingSecurityScopedResource()
        defer { if scoped { file.stopAccessingSecurityScopedResource() } }
        do {
            let size = try file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size <= 5 * 1024 * 1024 else { finishImport(controller) { $0.reject("檔案超過 5 MB，請選擇較小的 JSON 備份") }; return }
            let data = try Data(contentsOf: file)
            guard data.count <= 5 * 1024 * 1024 else { finishImport(controller) { $0.reject("檔案超過 5 MB") }; return }
            guard let text = String(data: data, encoding: .utf8) else { finishImport(controller) { $0.reject("檔案不是 UTF-8 JSON 備份") }; return }
            finishImport(controller) { $0.resolve(["cancelled": false, "text": text]) }
            trace("import read resolved bytes=\(data.count)")
        } catch { finishImport(controller) { $0.reject("無法讀取檔案，請重新選擇備份") } }
    }
}

#if DEBUG
// A test-only local recipient exercises real UIKit activity completion without a cloud destination.
private final class SyntheticLocalActivity: UIActivity {
    private var source: URL?
    override var activityTitle: String? { "本機測試備份" }
    override var activityType: UIActivity.ActivityType? { UIActivity.ActivityType("com.lwbroo.ziweibazi.synthetic-local") }
    override var activityImage: UIImage? { UIImage(systemName: "tray.and.arrow.down") }
    override func canPerform(withActivityItems items: [Any]) -> Bool { items.contains { ($0 as? URL)?.pathExtension == "json" } }
    override func prepare(withActivityItems items: [Any]) { source = items.compactMap { $0 as? URL }.first }
    override func perform() {
        guard let source = source else { activityDidFinish(false); return }
        let output = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Shared-synthetic.json")
        do {
            if FileManager.default.fileExists(atPath: output.path) { try FileManager.default.removeItem(at: output) }
            try FileManager.default.copyItem(at: source, to: output)
            activityDidFinish(true)
        } catch { activityDidFinish(false) }
    }
}
#endif
