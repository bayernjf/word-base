const { withPodfile } = require('@expo/config-plugins');

// Xcode 15.4 ships a C++20-final libc++ that enforces stricter abstract-class
// checks in std::allocate_shared. ExpoModulesCore 2.0.6 sets
// CLANG_CXX_LANGUAGE_STANDARD = 'c++20' in its podspec, which causes
// EXJavaScriptRuntime.mm to fail to compile on Xcode 15.4:
//   TestingSyncJSCallInvoker.h: field type 'TestingSyncJSCallInvoker' is an
//   abstract class / no matching member function for call to 'invokeAsync'.
// Inject a post_install hook that forces CLANG_CXX_LANGUAGE_STANDARD=c++17 for
// every pod target until upstream bumps to a compatible RN/Expo version.
const SNIPPET_MARKER = '# Added by plugins/with-cxx-std.js';

const POST_INSTALL_BODY = [
  '    ' + SNIPPET_MARKER + ': work around Xcode 15.4 libc++ C++20',
  '    # abstract-class check breaking expo-modules-core@2.0.6.',
  "    installer.pods_project.targets.each do |target|",
  '      target.build_configurations.each do |config|',
  "        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'",
  '      end',
  '    end',
].join('\n');

function findPostInstallEnd(src, markerIdx) {
  // Expo-generated Podfile wraps everything in
  //   target ... do
  //     ...
  //     post_install do |installer|
  //       ...
  //     end       <-- closes post_install, 4-space indented end
  //   end         <-- closes target, 2-space indented end
  // We look for the first `end` (4-space indent) that appears AFTER all the
  // inner post_install content. Since there can be nested blocks, we track
  // do/end depth starting from the post_install `do`.
  const lines = src.slice(markerIdx).split('\n');
  // Find the index of the first line (the marker line itself, index 0).
  let depth = 0;
  let started = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Count bare `do` keywords (Ruby block openers). This is a rough parse
    // but sufficient for the generated Podfile (no strings/comments contain
    // standalone do/end keywords in the bodies we care about).
    const doCount = (line.match(/\bdo\b/g) || []).length;
    const endCount = (line.match(/(^|\s)end(\s|$)/g) || []).length;
    depth += doCount - endCount;
    if (doCount > 0) started = true;
    if (started && doCount === 0 && endCount > 0 && depth === 0) {
      // Reconstruct absolute offset in src.
      let off = markerIdx;
      for (let j = 0; j < i; j++) off += lines[j].length + 1;
      return off;
    }
  }
  return -1;
}

function mergePostInstall(src) {
  if (src.includes(SNIPPET_MARKER)) return src;

  const marker = 'post_install do |installer|';
  const idx = src.indexOf(marker);
  if (idx < 0) {
    return src + `\npost_install do |installer|\n${POST_INSTALL_BODY}\nend\n`;
  }
  const endOffset = findPostInstallEnd(src, idx);
  if (endOffset < 0) return src;
  const endLineStart = src.lastIndexOf('\n', endOffset) + 1;
  return src.slice(0, endLineStart) + POST_INSTALL_BODY + '\n' + src.slice(endLineStart);
}

module.exports = function withCxxStd(config) {
  return withPodfile(config, (cfg) => {
    cfg.modResults.contents = mergePostInstall(cfg.modResults.contents);
    return cfg;
  });
};
