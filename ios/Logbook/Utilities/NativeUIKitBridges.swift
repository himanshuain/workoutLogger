import SwiftUI
import UIKit

// MARK: - Native horizontal paging (UIPageViewController)

struct NativeHorizontalPageView<Page: Hashable, Content: View>: UIViewControllerRepresentable {
    @Binding var selection: Page
    let pages: [Page]
    @ViewBuilder let content: (Page) -> Content

    func makeCoordinator() -> Coordinator {
        Coordinator(selection: $selection, pages: pages, content: content)
    }

    func makeUIViewController(context: Context) -> UIPageViewController {
        let controller = UIPageViewController(
            transitionStyle: .scroll,
            navigationOrientation: .horizontal,
            options: [UIPageViewController.OptionsKey.interPageSpacing: 0]
        )
        controller.dataSource = context.coordinator
        controller.delegate = context.coordinator
        controller.view.backgroundColor = .clear

        if let scrollView = controller.view.subviews.compactMap({ $0 as? UIScrollView }).first {
            scrollView.isPagingEnabled = true
            scrollView.bounces = true
            scrollView.alwaysBounceHorizontal = pages.count > 1
            scrollView.showsHorizontalScrollIndicator = false
            scrollView.delaysContentTouches = false
            scrollView.canCancelContentTouches = true
            scrollView.decelerationRate = .fast
        }

        context.coordinator.syncPages()
        if let initial = context.coordinator.controller(for: selection) {
            controller.setViewControllers([initial], direction: .forward, animated: false)
            context.coordinator.currentPage = selection
        }
        return controller
    }

    func updateUIViewController(_ controller: UIPageViewController, context: Context) {
        context.coordinator.selection = $selection
        context.coordinator.setContent(content)
        context.coordinator.refreshHostedContent()

        guard context.coordinator.currentPage != selection,
              let target = context.coordinator.controller(for: selection),
              let current = controller.viewControllers?.first,
              let currentPage = context.coordinator.page(for: current),
              let fromIndex = pages.firstIndex(of: currentPage),
              let toIndex = pages.firstIndex(of: selection) else { return }

        context.coordinator.isProgrammaticChange = true
        let direction: UIPageViewController.NavigationDirection = toIndex >= fromIndex ? .forward : .reverse
        controller.setViewControllers([target], direction: direction, animated: true) { finished in
            if finished {
                context.coordinator.currentPage = selection
                context.coordinator.isProgrammaticChange = false
            }
        }
    }

    final class Coordinator: NSObject, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
        var selection: Binding<Page>
        let pages: [Page]
        private var content: (Page) -> AnyView
        var controllers: [Page: UIHostingController<AnyView>] = [:]
        var currentPage: Page?
        var isProgrammaticChange = false

        init<Content: View>(selection: Binding<Page>, pages: [Page], content: @escaping (Page) -> Content) {
            self.selection = selection
            self.pages = pages
            self.content = { page in AnyView(content(page)) }
        }

        func setContent<Content: View>(_ builder: @escaping (Page) -> Content) {
            content = { page in AnyView(builder(page)) }
        }

        func refreshHostedContent() {
            for page in pages {
                if let host = controllers[page] {
                    host.rootView = content(page)
                }
            }
        }

        func syncPages() {
            let valid = Set(pages)
            controllers = controllers.filter { valid.contains($0.key) }
        }

        func controller(for page: Page) -> UIViewController? {
            guard pages.contains(page) else { return nil }
            if let existing = controllers[page] {
                existing.rootView = content(page)
                return existing
            }
            let host = UIHostingController(rootView: content(page))
            host.view.backgroundColor = .clear
            controllers[page] = host
            return host
        }

        func page(for viewController: UIViewController) -> Page? {
            controllers.first(where: { $0.value === viewController })?.key
        }

        func pageViewController(
            _ pageViewController: UIPageViewController,
            viewControllerBefore viewController: UIViewController
        ) -> UIViewController? {
            guard let page = page(for: viewController),
                  let index = pages.firstIndex(of: page),
                  index > 0 else { return nil }
            return controller(for: pages[index - 1])
        }

        func pageViewController(
            _ pageViewController: UIPageViewController,
            viewControllerAfter viewController: UIViewController
        ) -> UIViewController? {
            guard let page = page(for: viewController),
                  let index = pages.firstIndex(of: page),
                  index < pages.count - 1 else { return nil }
            return controller(for: pages[index + 1])
        }

        func pageViewController(
            _ pageViewController: UIPageViewController,
            didFinishAnimating finished: Bool,
            previousViewControllers: [UIViewController],
            transitionCompleted completed: Bool
        ) {
            guard completed,
                  !isProgrammaticChange,
                  let visible = pageViewController.viewControllers?.first,
                  let page = page(for: visible) else { return }
            currentPage = page
            if selection.wrappedValue != page {
                selection.wrappedValue = page
                HapticFeedback.select()
            }
        }
    }
}
