exports.notifications = []
exports.errors = []

// Optional data
exports.renderPage = function(res, page, user, data) {
  res.render(page, { user: user, notifications: exports.notifications, errors: exports.errors, data: data })
  exports.notifications = []
  exports.errors = []
}