// Global Setup
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const pgsqlModule = require('./postgresql.js');

// Database Pool Setup
const { Pool } = require('pg');
const conn = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: conn,
  ssl: true
});

// Express Setup
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body Parser Setup
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Crypto Setup
var crypto = require('crypto');
const SALT = process.env.PASS_SALT;

// Session Setup
var session = require('express-session');
var cookieParser = require('cookie-parser');
app.use(session({
  secret: process.env.SESS_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(cookieParser());

// Routing
app.get('/', function(req, res) {
  res.render('pages/index', { user: req.session.user });
});

app.get('/academics', function(req, res) {
  res.render('pages/academics', { user: req.session.user });
});

app.get('/military', function(req, res) {
  res.render('pages/military', { user: req.session.user });
});

app.get('/physical', function(req, res) {
  res.render('pages/physical', { user: req.session.user });
});

app.get('/profile', async(req, res) => {
  if (req.session.user) {
    const client = await pool.connect();
    try {
      let xn = req.session.user;
      let query = 'SELECT firstname,lastname,middleinitial,academicyear,phonenumber,platoon,squad,room,major,mentorship,email FROM cadet WHERE xnumber = \'' + xn + '\';';
      let result = await client.query(query);

      if (result.rows[0]) {
        res.render('pages/profile', { user: xn, data: result.rows[0] });
      } else {
        let error = "Somehow you're logged in but not in the database..."
        res.render('pages/error', { user: req.session.user, error: error });
      }
    } catch (e) {
      console.log(e.toString());
      let error = "System error: " + e.toString();
      res.render('pages/error', { user: req.session.user, error: error });
    } finally {
      client.release();
    }
  } else {
    res.redirect('/login');
  }
});

app.get('/login', function(req, res) {
  if (req.session.user) {
    res.redirect('/profile');
  } else {
    res.render('pages/login', { user: null });
  }
});

app.post('/login', async(req, res) => {
  const client = await pool.connect();
  try {
    let em = req.body.em;
    let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex');

    let query = 'SELECT xnumber FROM cadet WHERE email = \''+em+'\' AND password = \''+pw+'\' LIMIT 1;'
    let result = await client.query(query);
    if (result.rows[0]) {
      req.session.user = result.rows[0].xnumber;
      res.redirect('/profile');
    } else {
      let msg = "Login Incorrect";
      res.render('pages/login', { user: null, msg: msg });
    }
  } catch (e) {
    console.log(e.toString());
    let error = "System error: " + e.toString();
    res.render('pages/error', { user: req.session.user, error: error });
  } finally {
    client.release();
  }
});

app.get('/logout', function(req, res) {
  req.session.user = null;
  res.redirect('/');
});

app.get('/register', function(req, res) {
  if (req.session.user) {
    res.redirect('/profile');
  } else {
    res.render('pages/register', { user: null });
  }
});

app.post('/register', async(req, res) => {
  const client = await pool.connect();
  try {
    var em = req.body.em;
    var xn = req.body.xn;
    var ln = req.body.ln;
    var fn = req.body.fn;
    var mi = req.body.mi;
    var pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex');

    await client.query('BEGIN');
    if (mi) pgsqlModule.register(client, xn, em, pw, fn, ln, mi);
    else pgsqlModule.register(client, xn, em, pw, fn, ln);

    await client.query('COMMIT');
    req.session.user = xn;
    res.render('pages/profile', { user: req.session.user });
  } catch (e) {
    await client.query('ROLLBACK');
    console.log(e.toString());
    let error = "System error: " + e.toString();
    res.render('pages/error', { user: req.session.user, error: error });
  } finally {
    client.release();
  }
});

app.get('/roster', async(req, res) => {
  const client = await pool.connect();
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT academicyear,firstname,lastname,middleinitial,platoon,squad,room,major,mentorship FROM cadet');
    var results = { 'rows': (result) ? result.rows : null };
    res.render('pages/roster', { user: req.session.user, data: results });
  } catch(e) {
    let error = "System error: " + e.toString();
    console.log(error);
    res.render('pages/error', { user: req.session.user, error: error });
  } finally {
    client.release();
  }
});

app.post('/update-user', async(req, res) => {
  if (!req.session.user) {
    let error = "Please login.";
    res.render('pages/error', { user: null, error: error });
  }
  else {
    const client = await pool.connect();
    try {
      let fn = (req.body.fn) != '' ? '\''+req.body.fn+'\'' : null;
      let ln = (req.body.ln) != '' ? '\''+req.body.ln+'\'' : null;
      let mi = (req.body.mi) != '' ? '\''+req.body.mi+'\'' : null;
      let ay = (req.body.ay) != '' ? req.body.ay : null;
      let pl = (req.body.pl) != '' ? req.body.pl : null;
      let sq = (req.body.sq) != '' ? req.body.sq : null;
      let rm = (req.body.rm) != '' ? req.body.rm : null;
      let mj = (req.body.mj) != '' ? '\''+req.body.mj+'\'' : null;
      let mn = (req.body.mn) != '' ? '\''+req.body.mn+'\'' : null;
      let xn = req.session.user;

      await client.query('BEGIN');
      let query = 'UPDATE cadet SET firstName='+fn+
        ',lastName='+ln+
        ',middleInitial='+mi+
        ',academicYear='+ay+
        ',platoon='+pl+
        ',squad='+sq+
        ',room='+rm+
        ',major='+mj+
        ',mentorship='+mn+
        ' WHERE xnumber = \''+ xn + '\';';
      const result = await client.query(query);

      await client.query('COMMIT');
      res.redirect('/profile');
    } catch (e) {
      await client.query('ROLLBACK');
      console.log(e.toString());
      let error = e.toString();
      res.render('pages/error', { user: req.session.user, error: error });
    } finally {
      client.release();
    }
  }
});

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
