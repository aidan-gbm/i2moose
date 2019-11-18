/*********************/
/*  SETUP VARIABLES  */
/*********************/
// Global
const path = require('path')
const express = require('express')
const PORT = process.env.PORT || 5000

// Database
const pgsqlModule = require('./postgresql.js')
pgsqlModule.setup(false)

// Express
var app = express()
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Validator - https://express-validator.github.io
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}))
const { check, validationResult } = require('express-validator')
var errors = []
let err_msg = {
  'login': 'Invalid Login',
  'email': 'Email must be valid.',
  'xnumber': '"X-Number must be in the format \'x#####\'.',
  'password_length': 'Password must contain at least 12 characters.',
  'password_repeat': 'Passwords do not match.',
  'alphabet': 'ITEM can only contain letters.',
  'empty': 'ITEM cannot be left blank.',
  'initial': 'Middle initial can only be one letter.',
  'year': 'ITEM must be a valid year.',
  'number': 'ITEM must be a number.',
}

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
// Login
app.route('/login')
  .get(function(req, res) {
    if (req.session.user) {
      res.redirect('/profile')
    } else {
      res.render('pages/login', { user: null, errors: errors })
      errors = []
    }
  })

  .post([
    check('em').normalizeEmail(),
    check('pw').escape()
  ], async(req, res) => {
    const validationErrors = validationResult(req)
    if (!validationErrors.isEmpty()) {
      errors = validationErrors['errors']
      res.render('pages/login', { user: null, errors: errors })
      return errors = []
    }

    let em = req.body.em
    let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
    let result = await pgsqlModule.getXnumber(em, pw)

    if (result.rows[0]) {
      req.session.user = result.rows[0].xnumber
      res.redirect('/profile')
    } else {
      errors.push({'msg': err_msg['login']})
      res.render('pages/login', { user: null, errors: errors })
      errors = []
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
      res.render('pages/register', { user: null, errors: errors })
      errors = []
    }
  })

  .post([
    check('em')
      .isEmail().withMessage(err_msg['email'])
      .normalizeEmail(),
    check('xn')
      .matches('^x[0-9]{5}$').withMessage(err_msg['xnumber']),
    check('ln')
      .not().isEmpty().withMessage(err_msg['empty'].replace('ITEM','Last name'))
      .trim()
      .isAlpha().withMessage(err_msg['alphabet'].replace('ITEM','Last name'))
      .escape(),
    check('fn')
      .not().isEmpty().withMessage(err_msg['empty'].replace('ITEM','First name'))
      .trim()
      .isAlpha().withMessage(err_msg['alphabet'].replace('ITEM','First name'))
      .escape(),
    check('pw')
      .isLength({ min: 12 }).withMessage(err_msg['password_length'])
      .escape(),
    check('pw2')
      .isLength({ min: 12 }).withMessage(err_msg['password_length'])
      .escape()
  ], async(req, res) => {
    var pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
    var pw2 = crypto.pbkdf2Sync(req.body.pw2, SALT, 1000, 64, 'sha256').toString('hex')

    const validationErrors = validationResult(req).array()
    if (pw != pw2) validationErrors.push(err_msg['password_repeat'])

    if (validationErrors.length > 0) {
      validationErrors.forEach(e => errors.push(e))
      res.render('pages/register', { user: null, errors: errors })
      return errors = []
    }

    let response = await pgsqlModule.register(req.body.xn, req.body.em, pw, req.body.fn, req.body.ln)

    if (response) {
      req.session.user = req.body.xn;
      res.redirect('/profile')
    } else {
      errors.push({'msg':'Server error. Contact your ISO.'})
      res.render('pages/register', { user: null, errors: erors })
      errors = []
    }
  })

// Profile
app.get('/profile', async(req, res) => {
  if (req.session.user) {
    let xn = req.session.user
    let result = await pgsqlModule.getProfile(xn)

    if (result.rows[0]) {
      res.render('pages/profile', { user: xn, data: result.rows[0], errors: errors })
    } else {
      errors.push({'msg':"Somehow you're logged in but not in the database..."})
      res.render('pages/profile', { user: req.session.user, errors: errors })
    }
    errors = []
  } else {
    res.redirect('/login')
  }
})

// Update Profile
app.post('/update-user', [
  check('fn')
    .not().isEmpty().withMessage(err_msg['empty'].replace('ITEM','First name'))
    .trim()
    .isAlpha().withMessage(err_msg['alphabet'].replace('ITEM','First name'))
    .escape(),
  check('ln')
    .not().isEmpty().withMessage(err_msg['empty'].replace('ITEM','Last name'))
    .trim()
    .isAlpha().withMessage(err_msg['alphabet'].replace('ITEM','Last name'))
    .escape(),
  check('mi')
    .trim().escape()
    .isLength({ max: 1 }).withMessage(err_msg['initial'])
    .isAlpha().withMessage(err_msg['alphabet'].replace('ITEM','Middle initial')),
  check('ay')
    .matches('^[0-9]{4}$').withMessage(err_msg['year'].replace('ITEM','Academic year')),
  check('pl')
    .trim().escape()
    .isNumeric().withMessage(err_msg['number'].replace('ITEM','Platoon')),
  check('sq')
    .trim().escape()
    .isNumeric().withMessage(err_msg['number'].replace('ITEM','Squad')),
  check('rm')
    .trim().escape()
    .isNumeric().withMessage(err_msg['number'].replace('ITEM','Room')),
  check('mj')
    .trim().escape()
    .isAlphanumeric().withMessage('Major must be alphanumeric.')
], async(req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const validationErrors = validationResult(req).array()
  if (validationErrors.length > 0) {
    validationErrors.forEach(e => errors.push(e))
    return res.redirect('/profile')
  }

  let data = {}
  data['fn'] = req.body.fn
  data['ln'] = req.body.ln
  data['mi'] = req.body.mi || null
  data['ay'] = req.body.ay || null
  data['pl'] = req.body.pl || null
  data['sq'] = req.body.sq || null
  data['rm'] = req.body.rm || null
  data['mj'] = req.body.mj || null
  let xn = req.session.user

  if (await pgsqlModule.updateUser(data, xn))
    res.redirect('/profile')
  else {
    errors.push({'msg': 'Server error. Contact your ISO.'})
    res.redirect('/profile')
  }
})

// Home
app.get('/', function(req, res) {
  res.render('pages/index', { user: req.session.user, errors: errors })
  errors = []
})

// Roster
app.get('/roster', async(req, res) => {
  let result = await pgsqlModule.getRoster(false)
  if (result) {
    let results = { 'rows': (result) ? result.rows : null }
    res.render('pages/roster', { user: req.session.user, data: results, errors: errors })
  } else {
    errors.push({'msg':'Server error. Contact administrator.'})
    res.render('pages/roster', { user: null, errors: errors })
  }
  errors = []
})

// Academics
app.get('/academics', function(req, res) {
  res.render('pages/academics', { user: req.session.user, errors: errors })
  errors = []
})

// Military
app.get('/military', function(req, res) {
  res.render('pages/military', { user: req.session.user, errors: errors })
  errors = []
})

// Physical
app.get('/physical', function(req, res) {
  res.render('pages/physical', { user: req.session.user, errors: errors })
  errors = []
})

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
