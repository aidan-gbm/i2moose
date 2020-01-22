/***************/
/*   MODULES   */
/***************/

// Router
const router = require('express').Router()

// Database
const modulePostgres = require('../postgresql')

// Renderer
const renderer = require('../renderer')

/***************/
/*   ROUTING   */
/***************/

// Home
router.get('/', function(req, res) {
  renderer.renderPage(res, 'pages/index', req.session.user)
})

// Roster
router.get('/roster', function(req, res) {
  renderer.renderPage(res, 'pages/roster', req.session.user)
})

// Academics
router.get('/academics', function(req, res) {
  renderer.renderPage(res, 'pages/academics', req.session.user)
})

// Military
router.get('/military', async function(req, res) {
  renderer.renderPage(res, 'pages/military', req.session.user)
})

// Physical
router.get('/physical', function(req, res) {
  renderer.renderPage(res, 'pages/physical', req.session.user)
})

module.exports = router