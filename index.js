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
//const modulePostgres = require('./postgresql.js')
//modulePostgres.setup()

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

// API (Sub)
const apiRouter = require('./routers/api')
app.use('/api', apiRouter)

// Main (Sub)
const mainRouter = require('./routers/main')
app.use('/', mainRouter)

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
