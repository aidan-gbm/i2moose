/*************/
/*  MODULES  */
/*************/

// Express
const PORT = process.env.PORT || 5000
const express = require('express')
app = express()

// Path
const path = require('path')

// Database
const modulePostgres = require('./postgresql.js')
modulePostgres.setup()

// Font Awesome
app.set('fa-js', path.join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free', 'js'))

// Favicon
const favicon = require('serve-favicon')
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')))

// Sessions
const session = require('express-session')
app.use(session({
  secret: process.env.SESS_SECRET,
  resave: false,
  saveUninitialized: true
}))

// Cookie Parser
const cookieParser = require('cookie-parser')
app.use(cookieParser())

// Renderer
const renderer = require('./renderer')

// Set Variables
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

/*********************/
/*      ROUTING      */
/*********************/

// Staff (Sub)
const staffRouter = require('./routers/staff')
app.use('/staff', staffRouter)

// Profile (Sub)
const profileRouter = require('./routers/profile')
app.use('/profile', profileRouter)

// Home
app.get('/', function(req, res) {
  renderer.renderPage(res, 'pages/index', req.session.user)
})

// Roster
app.get('/roster', async(req, res) => {
  let result = await modulePostgres.getRoster()
  if (result) {
    let results = { 'rows': (result) ? result.rows : null }
    renderer.renderPage(res, 'pages/roster', req.session.user, results)
  } else {
    renderer.errors.push({'msg':'Server error. Contact administrator.'})
    renderer.renderPage(res, 'pages/roster', null, {})
  }
})

// Academics
app.get('/academics', function(req, res) {
  renderer.renderPage(res, 'pages/academics', req.session.user)
})

// Military
app.get('/military', function(req, res) {
  renderer.renderPage(res, 'pages/military', req.session.user)
})

// Physical
app.get('/physical', function(req, res) {
  renderer.renderPage(res, 'pages/physical', req.session.user)
})

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
