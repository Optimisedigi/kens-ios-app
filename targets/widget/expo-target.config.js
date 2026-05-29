/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'NeverMissTwiceWidget',
  // SwiftUI for the widget views; ActivityKit for the "streak at risk"
  // Live Activity (Feature 2), AppIntents for the tap-to-complete button.
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  deploymentTarget: '17.0',
  colors: {
    $accent: '#818CF8',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.optimisedigital.nevermisstwice'],
  },
});
