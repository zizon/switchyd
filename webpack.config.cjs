module.exports = {
  mode: 'production',
  entry: {
    'option-ui': './dist/ui.js',
    'service-worker': './dist/core/main.js'
  },
  output: {
    filename: '[name].js'
  },
  experiments: {
    topLevelAwait: true
  }
}
