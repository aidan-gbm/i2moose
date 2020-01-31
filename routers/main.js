/***************/
/*   MODULES   */
/***************/

// Router
const router = require('express').Router()

// Renderer
const renderer = require('../renderer')

/***************/
/*   ROUTING   */
/***************/

// Home
router.get('/', function(req, res) {
  renderer.renderPage(res, 'pages/main/index', req.session.user)
})

// Roster
router.get('/roster', function(req, res) {
  renderer.renderPage(res, 'pages/main/roster', req.session.user)
})

// Academics
router.get('/academics', function(req, res) {
  renderer.renderPage(res, 'pages/main/academics', req.session.user)
})

// Military
router.get('/military', async function(req, res) {
  renderer.renderPage(res, 'pages/main/military', req.session.user)
})

// Physical
router.get('/physical', function(req, res) {
  renderer.renderPage(res, 'pages/main/physical', req.session.user)
})

module.exports = router