import ImageIO
import SwiftUI
import UIKit

enum ExerciseMediaContentMode {
    case fit
    case fill

    var imageContentMode: UIView.ContentMode {
        switch self {
        case .fit: .scaleAspectFit
        case .fill: .scaleAspectFill
        }
    }
}

final class ExerciseMediaCache {
    static let shared = ExerciseMediaCache()
    private let cache = NSCache<NSURL, UIImage>()
    private var inFlight: [URL: [(UIImage?) -> Void]] = [:]
    private let lock = NSLock()

    private init() {
        cache.countLimit = 120
        cache.totalCostLimit = 64 * 1024 * 1024
    }

    func image(for url: URL, completion: @escaping (UIImage?) -> Void) {
        let key = url as NSURL
        if let cached = cache.object(forKey: key) {
            completion(cached)
            return
        }

        lock.lock()
        if inFlight[url] != nil {
            inFlight[url]?.append(completion)
            lock.unlock()
            return
        }
        inFlight[url] = [completion]
        lock.unlock()

        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self else { return }
            let image = data.flatMap(Self.decodeImage)
            if let image {
                self.cache.setObject(image, forKey: url as NSURL, cost: data?.count ?? 0)
            }

            self.lock.lock()
            let callbacks = self.inFlight.removeValue(forKey: url) ?? []
            self.lock.unlock()

            DispatchQueue.main.async {
                callbacks.forEach { $0(image) }
            }
        }.resume()
    }

    private static func decodeImage(from data: Data) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let count = CGImageSourceGetCount(source)
        guard count > 0 else { return nil }

        if count == 1 {
            guard let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
            return UIImage(cgImage: cgImage)
        }

        var images: [UIImage] = []
        var duration: TimeInterval = 0

        for index in 0..<count {
            guard let cgImage = CGImageSourceCreateImageAtIndex(source, index, nil) else { continue }
            images.append(UIImage(cgImage: cgImage))

            let properties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any]
            let gifInfo = properties?[kCGImagePropertyGIFDictionary] as? [CFString: Any]
            let delay = gifInfo?[kCGImagePropertyGIFUnclampedDelayTime] as? TimeInterval
                ?? gifInfo?[kCGImagePropertyGIFDelayTime] as? TimeInterval
                ?? 0.1
            duration += max(delay, 0.02)
        }

        guard !images.isEmpty else { return nil }
        return UIImage.animatedImage(with: images, duration: duration)
    }
}

struct ExerciseMediaView: View {
    let url: URL?
    let symbol: String
    let tint: Color
    var contentMode: ExerciseMediaContentMode = .fit
    var cornerRadius: CGFloat = 10

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(Color(.tertiarySystemFill))

            if let url {
                if isGIF(url) {
                    AnimatedGIFView(url: url, contentMode: contentMode.imageContentMode)
                        .padding(4)
                } else {
                    RemoteExerciseImage(url: url, contentMode: contentMode)
                        .padding(4)
                }
            } else {
                fallbackSymbol(size: 40)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }

    private func fallbackSymbol(size: CGFloat) -> some View {
        Image(systemName: symbol)
            .font(.system(size: max(size * 0.34, 22)))
            .foregroundStyle(tint.opacity(0.85))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func isGIF(_ url: URL) -> Bool {
        let path = url.absoluteString.lowercased()
        return path.contains(".gif") || url.pathExtension.lowercased() == "gif"
    }
}

private struct RemoteExerciseImage: View {
    let url: URL
    let contentMode: ExerciseMediaContentMode
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .modifier(MediaScaling(mode: contentMode))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onAppear {
            ExerciseMediaCache.shared.image(for: url) { loaded in
                image = loaded
            }
        }
    }
}

private struct MediaScaling: ViewModifier {
    let mode: ExerciseMediaContentMode

    func body(content: Content) -> some View {
        switch mode {
        case .fit:
            content.scaledToFit()
        case .fill:
            content.scaledToFill()
        }
    }
}

private struct AnimatedGIFView: UIViewRepresentable {
    let url: URL
    let contentMode: UIView.ContentMode

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> GIFContainerView {
        let view = GIFContainerView()
        view.imageView.contentMode = contentMode
        return view
    }

    func updateUIView(_ view: GIFContainerView, context: Context) {
        view.imageView.contentMode = contentMode
        context.coordinator.load(url: url, into: view.imageView)
    }

    final class Coordinator {
        private var loadedURL: URL?

        func load(url: URL, into imageView: UIImageView) {
            guard loadedURL != url else { return }
            loadedURL = url
            imageView.image = nil
            ExerciseMediaCache.shared.image(for: url) { image in
                imageView.image = image
            }
        }
    }
}

private final class GIFContainerView: UIView {
    let imageView = UIImageView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = true
        backgroundColor = .clear
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.clipsToBounds = true
        addSubview(imageView)
        NSLayoutConstraint.activate([
            imageView.leadingAnchor.constraint(equalTo: leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: trailingAnchor),
            imageView.topAnchor.constraint(equalTo: topAnchor),
            imageView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
