// Lets the GitHub Pages build serve the app from /LiftInMind/ instead of the site root.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || '' },
});
