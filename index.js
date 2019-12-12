/*********************/
/*  SETUP VARIABLES  */
/*********************/
// Global
const path = require('path')
const express = require('express')
const PORT = process.env.PORT || 5000

// Database
const modulePostgres = require('./postgresql.js')
modulePostgres.setup(false)

// Express
var app = express()
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Body Parser
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}))

// Validator
const moduleValidator = require('./validator.js')
var notifications = []
var errors = []

// Favicon
var favicon = require('serve-favicon')
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')))

// Font Awesome
app.set('fa-js', path.join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free', 'js'))

// Crypto
var crypto = require('crypto')
const SALT = process.env.PASS_SALT

// Sessions
var session = require('express-session')
var cookieParser = require('cookie-parser')
app.use(session({
  secret: process.env.SESS_SECRET,
  resave: false,
  saveUninitialized: true
}))
app.use(cookieParser())

/*********************/
/*      ROUTING      */
/*********************/
// Render Page (data is optional)
function renderPage(res, page, user, data) {
  res.render(page, { user: user, notifications: notifications, errors: errors, data: data })
  notifications = []
  errors = []
}

// Login
app.route('/login')
  .get(function(req, res) {
    if (req.session.user) {
      res.redirect('/profile')
    } else {
      renderPage(res, 'pages/login', null)
    }
  })

  .post(async function(req, res) {
    let validationErrors = []
    validationErrors.concat(await moduleValidator.validateEmail(req.body.em))

    if (validationErrors.length > 0) {
      validationErrors.forEach(e => errors.push(e))
      renderPage(res, 'pages/login', null)
    } else {
      let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
      let result = await modulePostgres.getXnumber(req.body.em, pw)

      if (result.rows[0]) {
        req.session.user = result.rows[0]['X-Number']
        res.redirect('/profile')
      } else {
        errors.push({'msg': 'Invalid Login'})
        renderPage(res, 'pages/login', null)
      }
    }
  })

// Logout
app.get('/logout', function(req, res) {
  req.session.user = null
  res.redirect('/')
})

// Register
app.route('/register')
  .get(function(req, res) {
    if (req.session.user) {
      res.redirect('/profile')
    } else {
      renderPage(res, 'pages/register', null)
    }
  })

  .post(async function(req, res) {
    let validationErrors = []
    validationErrors.concat(moduleValidator.validateAlpha(req.body.fn, 'First Name'))
    validationErrors.concat(moduleValidator.validateAlpha(req.body.ln, 'Last Name'))
    validationErrors.concat(moduleValidator.validateXnumber(req.body.xn))
    validationErrors.concat(await moduleValidator.validateEmail(req.body.em, modulePostgres.getUserByEmail))
    validationErrors.concat(moduleValidator.validatePassword(req.body.pw, req.body.pw2))

    if (validationErrors.length > 0) {
      validationErrors.forEach(e => errors.push(e))
      renderPage(res, 'pages/register', null)
    } else {
      let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
      let response = await modulePostgres.register(req.body.xn, req.body.em, pw, req.body.fn, req.body.ln)
      if (response) {
        req.session.user = req.body.xn;
        res.redirect('/profile')
      } else {
        errors.push({'msg':'Server error. Contact your ISO.'})
        renderPage(res, 'pages/register', null)
      }
    }
  })

// Profile
app.get('/profile', async(req, res) => {
  if (req.session.user) {
    let xn = req.session.user
    let result = await modulePostgres.getProfile(xn)

    if (result.rows[0]) {
      renderPage(res, 'pages/profile', xn, result.rows[0])
    } else {
      errors.push({'msg':"Somehow you're logged in but not in the database..."})
      renderPage(res, 'pages/profile', req.session.user, {})
    }
  } else {
    res.redirect('/login')
  }
})

// Update User Public
app.post('/update-user-public', async function(req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  let validationErrors = []
  validationErrors.concat(moduleValidator.validateAlpha(req.body.fn, 'First Name'))
  validationErrors.concat(moduleValidator.validateAlpha(req.body.ln, 'Last Name'))
  validationErrors.concat(moduleValidator.validateInitial(req.body.mi, 'Middle Initial'))
  validationErrors.concat(moduleValidator.validateYear(req.body.ay, 'Academic Year'))
  validationErrors.concat(moduleValidator.validateAlpha(req.body.pl, 'Platoon'))
  validationErrors.concat(moduleValidator.validateAlpha(req.body.sq, 'Squad'))
  validationErrors.concat(moduleValidator.validateAlpha(req.body.rm, 'Room #'))
  validationErrors.concat(moduleValidator.validateAlphanumeric(req.body.mj, 'Major'))

  if (validationErrors.length > 0) {
    validationErrors.forEach(e => errors.push(e))
    return res.redirect('/profile')
  } else {
    if (await modulePostgres.updateUserPublic([
      req.body.fn,
      req.body.ln,
      req.body.mi || null,
      req.body.ay || null,
      req.body.pl || null,
      req.body.sq || null,
      req.body.rm || null,
      req.body.mj || null,
      req.session.user
    ])) {
      notifications.push({'msg':'Successfully updated profile.'})
      res.redirect('/profile')
    } else {
      errors.push({'msg': 'Server error. Contact your ISO.'})
      res.redirect('/profile')
    }
  }  
})

// Update User Personal
app.post('/update-user-personal', async function(req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  let validationErrors = []
  validationErrors.concat(moduleValidator.validateXnumber(req.body.xn))
  validationErrors.concat(await moduleValidator.validateEmail(req.body.em))
  validationErrors.concat(moduleValidator.validatePhone(req.body.fn))

  if (validationErrors.length > 0) {
    validationErrors.forEach(e => errors.push(e))
    return res.redirect('/profile')
  } else {
    if (await modulePostgres.updateUserPersonal([req.body.xn, req.body.em, req.body.pn || null, req.session.user])) {
      notifications.push({'msg':'Successfully updated profile.'})
      res.redirect('/profile')
    } else {
      errors.push({'msg': 'Server error. Contact your ISO.'})
      res.redirect('/profile')
    }
  }
})

// Update User Password
app.post('/update-user-password', async function(req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  let validationErrors = []
  validationErrors.concat(moduleValidator.validatePassword(req.body.pw, req.body.pw2))
  if (validationErrors.length > 0) {
    validationErrors.forEach(e => errors.push(e))
    return res.redirect('/profile')
  } else {
    let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
    if (await modulePostgres.updateUserPassword(pw, req.session.user)) {
      notifications.push({'msg':'Successfully updated password.'})
      res.redirect('/profile')
    } else {
      errors.push({'msg': 'Server error. Contact your ISO.'})
      res.redirect('/profile')
    }
  }
})

// Home
app.get('/', function(req, res) {
  renderPage(res, 'pages/index', req.session.user)
})

// Roster
app.get('/roster', async(req, res) => {
  let result = await modulePostgres.getRoster()
  if (result) {
    let results = { 'rows': (result) ? result.rows : null }
    renderPage(res, 'pages/roster', req.session.user, results)
  } else {
    errors.push({'msg':'Server error. Contact administrator.'})
    renderPage(res, 'pages/roster', null, {})
  }
})

// Academics
app.get('/academics', function(req, res) {
  renderPage(res, 'pages/academics', req.session.user)
})

// Military
app.get('/military', function(req, res) {
  renderPage(res, 'pages/military', req.session.user)
})

// Physical
app.get('/physical', function(req, res) {
  renderPage(res, 'pages/physical', req.session.user)
})

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
