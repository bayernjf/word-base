const { withPodfile } = require('@expo/config-plugins');

// Xcode 15.4 ships a C++20-final libc++ that enforces stricter abstract-class
// checks in std::allocate_shared. ExpoModulesCore 2.0.6 sets
// CLANG_CXX_LANGUAGE_STANDARD = 'c++20' in its podspec, which causes
// EXJavaScriptRuntime.mm to fail to compile on Xcode 15.4:
//   TestingSyncJSCallInvoker.h: field type 'TestingSyncJSCallInvoker' is an
//   abstract class / no matching member function for call to 'invokeAsync'.
// Inject a post_install hook that forces CLANG_CXX_LANGUAGE_STANDARD=c++17 for
// every pod target until upstream bumps to a compatible RN/Expo version.
const POST_INSTALL_SNIPPET = `
    # Added by plugins/with-cxx-std.js: work around Xcode 15.4 libc++ C++20
    # abstract-class check breaking expo-modules-core@2.0.6.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
`;

function mergePostInstall(src) {
  const marker = 'post_install do |installer|';
  const idx = src.indexOf(marker);
  if (idx < 0) {
    return src + `\npost_install do |installer|\n${POST_INSTALL_SNIPPET}\nend\n`;
  }
  const endIdx = src.indexOf('\nend', idx + marker.length);
  if (endIdx < 0) return src;
  return src.slice(0, endIdx) + POST_INSTALL_SNIPPET + src.slice(endIdx);
}

module.exports = function withCxxStd(config) {
  return withPodfile(config, (cfg) => {
    const contents = cfg.modResults.contents;
    if (!contents.includes('plugins/with-cxx-std.js')) {
      cfg.modResults.contents = mergePostInstall(contents);
    }
    return cfg;
  });
};

