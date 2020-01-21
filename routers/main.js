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
router.get('/', async function(req, res) {
  let home = await modulePostgres.getPosts('home')
  let history = await modulePostgres.getPosts('history')
  if (home.rows[0] || history.rows[0]) {
    let data = {'posts': {'home': home.rows, 'history': history.rows}}
    renderer.renderPage(res, 'pages/index', req.session.user, data)
  } else {
    renderer.renderPage(res, 'pages/index', req.session.user)
  }
})

// Roster
router.get('/roster', async function(req, res) {
  let result = await modulePostgres.getRoster()
  if (result) {
    let results = { 'rows': (result.rows[0]) ? result.rows : null }
    renderer.renderPage(res, 'pages/roster', req.session.user, results)
  } else {
    renderer.errors.push({'msg':'Server error. Contact administrator.'})
    renderer.renderPage(res, 'pages/roster', null, {})
  }
})

// Academics
router.get('/academics', async function(req, res) {
  let result = await modulePostgres.getPosts('academics')
  if (result.rows[0]) {
    let data = {'posts': {'academics': result.rows}}
    renderer.renderPage(res, 'pages/academics', req.session.user, data)
  } else {
    renderer.renderPage(res, 'pages/academics', req.session.user)
  }
})

// Military
router.get('/military', async function(req, res) {
  let result = await modulePostgres.getPosts('military')
  if (result.rows[0]) {
    let data = {'posts': {'military': result.rows}}
    renderer.renderPage(res, 'pages/military', req.session.user, data)
  } else {
    renderer.renderPage(res, 'pages/military', req.session.user)
  }
})

// Physical
router.get('/physical', async function(req, res) {
  let result = await modulePostgres.getPosts('physical')
  if (result.rows[0]) {
    let data = {'posts': {'physical': result.rows}}
    renderer.renderPage(res, 'pages/physical', req.session.user, data)
  } else {
    renderer.renderPage(res, 'pages/physical', req.session.user)
  }
})

module.exports = router