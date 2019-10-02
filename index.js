// Global Setup
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

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

app.get('/profile', function(req, res) {
  res.render('pages/profile', { user: req.session.user });
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
  data = { user: req.session.user };
  console.log("Got POST to /login");
  try {
    var em = req.body.em;
    var pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex');

    var query = 'SELECT xnumber FROM cadet WHERE email = \''+em+'\' AND password = \''+pw+'\';'
    const result = await client.query(query);

    if (result.rows) {
      req.session.user = result.rows[0].xnumber;
      res.redirect('/profile');
    } else {
      let msg = "Login Incorrect";
      res.render('pages/login', { user: null, msg: msg });
    }
  } catch (e) {
    console.log(e.stack);
    let error = "System error: " + e.stack;
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
    var query = 'INSERT INTO cadet (xnumber,firstname,lastname,middleinitial,email,password) VALUES (\''+xn+'\',\''+fn+'\',\''+ln+'\',\''+mi+'\',\''+em+'\',\''+pw+'\');';
    console.log('Query: ' + query);
    const result = await client.query(query);

    await client.query('COMMIT');
    req.session.user = xn;
    data.user = req.session.user;
    res.render('pages/profile', { user: req.session.user });
  } catch (e) {
    await client.query('ROLLBACK');
    console.log(e.stack);
    let error = "System error: " + e.stack;
    res.render('pages/error', { user: req.session.user, error: error });
  } finally {
    client.release();
  }
});

app.get('/db', async(req, res) => {
  const client = await pool.connect();
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT academicyear,firstname,lastname,middleinitial,platoon,squad,room,major,mentorship FROM cadet');
    var results = { 'rows': (result) ? result.rows : null };
    res.render('pages/db', { user: req.session.user, data: results });
  } catch(e) {
    let error = "System error: " + e.stack;
    console.log(error);
    res.render('pages/error', { user: req.session.user, error: error });
  } finally {
    client.release();
  }
});

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
