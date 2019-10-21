// Global Setup
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

// Database Setup
const pgsqlModule = require('./postgresql.js')
pgsqlModule.setup(false)

// Express Setup
var app = express()
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Body Parser Setup
var bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Crypto Setup
var crypto = require('crypto')
const SALT = process.env.PASS_SALT

// Session Setup
var session = require('express-session')
var cookieParser = require('cookie-parser')
app.use(session({
  secret: process.env.SESS_SECRET,
  resave: false,
  saveUninitialized: true
}))
app.use(cookieParser())

// Routing
app.get('/', function(req, res) {
  res.render('pages/index', { user: req.session.user })
})

app.get('/academics', function(req, res) {
  res.render('pages/academics', { user: req.session.user })
})

app.get('/military', function(req, res) {
  res.render('pages/military', { user: req.session.user })
})

app.get('/physical', function(req, res) {
  res.render('pages/physical', { user: req.session.user })
})

app.get('/profile', async(req, res) => {
  if (req.session.user) {
    let xn = req.session.user
    let result = await pgsqlModule.getProfile(xn)
    console.log(result.rows)

    if (result.rows[0]) {
      res.render('pages/profile', { user: xn, data: result.rows[0] })
    } else {
      let error = "Somehow you're logged in but not in the database..."
      res.render('pages/error', { user: req.session.user, error: error })
    }
  } else {
    res.redirect('/login')
  }
})

app.get('/login', function(req, res) {
  if (req.session.user) {
    res.redirect('/profile')
  } else {
    res.render('pages/login', { user: null })
  }
})

app.post('/login', async(req, res) => {
  let em = req.body.em
  let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
  let result = await pgsqlModule.getXnumber(em, pw)

  if (result.rows[0]) {
    req.session.user = result.rows[0].xnumber
    res.redirect('/profile')
  } else {
    let msg = "Login Incorrect"
    res.render('pages/login', { user: null, msg: msg })
  }
})

app.get('/logout', function(req, res) {
  req.session.user = null
  res.redirect('/')
})

app.get('/register', function(req, res) {
  if (req.session.user) {
    res.redirect('/profile')
  } else {
    res.render('pages/register', { user: null })
  }
})

app.post('/register', async(req, res) => {
  var em = req.body.em
  var xn = req.body.xn
  var ln = req.body.ln
  var fn = req.body.fn
  var mi = req.body.mi
  var pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')

  let response = await pgsqlModule.register(xn, em, pw, fn, ln, mi)

  if (response) {
    req.session.user = xn;
    res.redirect('/profile')
  } else {
    let err = 'Server error. Contact administrator.'
    res.render('pages/error', { user: null, error: err })
  }
})

app.get('/roster', async(req, res) => {
  let result = await pgsqlModule.getRoster(false)
  if (result) {
    let results = { 'rows': (result) ? result.rows : null }
    res.render('pages/roster', { user: req.session.user, data: results })
  } else {
    let err = 'Server error. Contact administrator.'
    res.render('pages/error', { user: null, error: err })
  }
})

app.post('/update-user', async(req, res) => {
  if (!req.session.user) {
    let error = "Please login.";
    res.render('pages/error', { user: null, error: error });
  }
  else {
    let data = {}
    data['firstname'] = (!!req.body.fn) ? `'${req.body.fn}'` : null
    data['lastname'] = (!!req.body.ln) ? `'${req.body.ln}'` : null
    data['middleinitial'] = (!!req.body.mi) ? `'${req.body.mi}'` : null
    data['academicyear'] = (!!req.body.ay) ? req.body.ay : null
    data['platoon'] = (!!req.body.pl) ? req.body.pl : null
    data['squad'] = (!!req.body.sq) ? req.body.sq : null
    data['room'] = (!!req.body.rm) ? req.body.rm : null
    data['major'] = (!!req.body.mj) ? `'${req.body.mj}'` : null
    let xn = req.session.user

    if (await pgsqlModule.updateUser(data, xn))
      res.redirect('/profile')
    else {
      let err = 'Server error. Contact administrator.'
      res.render('pages/error', { user: null, error: err })
    }
  }
})

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
