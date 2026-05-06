import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var didInstallLaunchOverlay = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        installLaunchOverlayIfNeeded()
        DispatchQueue.main.async {
            self.installLaunchOverlayIfNeeded()
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        installLaunchOverlayIfNeeded()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    private func installLaunchOverlayIfNeeded() {
        guard !didInstallLaunchOverlay, let window else { return }

        didInstallLaunchOverlay = true

        let palette = launchPalette(for: window.traitCollection)
        window.backgroundColor = palette.background
        window.rootViewController?.view.backgroundColor = palette.background

        let overlay = UIView(frame: window.bounds)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay.backgroundColor = palette.background
        overlay.isUserInteractionEnabled = false

        let fontSize = min(44, max(38, window.bounds.width * 0.11))
        let wordmark = NSMutableAttributedString(
            string: "washed.",
            attributes: [
                .foregroundColor: palette.word,
                .font: UIFont.systemFont(ofSize: fontSize, weight: .medium),
            ]
        )
        wordmark.addAttribute(
            .foregroundColor,
            value: palette.dot,
            range: NSRange(location: 6, length: 1)
        )

        let mark = UILabel()
        mark.attributedText = wordmark
        mark.textAlignment = .center
        mark.translatesAutoresizingMaskIntoConstraints = false

        overlay.addSubview(mark)
        window.addSubview(overlay)

        NSLayoutConstraint.activate([
            mark.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            mark.centerYAnchor.constraint(equalTo: overlay.centerYAnchor)
        ])

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.4) {
            UIView.animate(withDuration: 0.48, delay: 0, options: [.curveEaseOut, .allowUserInteraction]) {
                overlay.alpha = 0
            } completion: { _ in
                overlay.removeFromSuperview()
            }
        }
    }

    private func launchPalette(
        for traitCollection: UITraitCollection
    ) -> (background: UIColor, word: UIColor, dot: UIColor) {
        let primary = UIColor(red: 0.039, green: 0.239, blue: 0.122, alpha: 1)
        if traitCollection.userInterfaceStyle == .dark {
            return (
                background: UIColor(red: 0.067, green: 0.067, blue: 0.067, alpha: 1),
                word: UIColor(red: 0.98, green: 0.98, blue: 0.98, alpha: 1),
                dot: primary
            )
        }

        return (background: primary, word: UIColor.white, dot: UIColor.white)
    }

}
