/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  name: 'NeverMissTwiceWatch',
  displayName: 'Never Miss Twice',
  bundleIdentifier: 'com.optimisedigital.nevermisstwice.watchkitapp',
  deploymentTarget: '10.0',
  colors: {
    $accent: '#818CF8',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.optimisedigital.nevermisstwice'],
  },
});
