const os = require('os');
const original = os.networkInterfaces;

os.networkInterfaces = function() {
  try {
    return original();
  } catch (e) {
    return {}; // Fallback: return empty if Android blocks access
  }
};
