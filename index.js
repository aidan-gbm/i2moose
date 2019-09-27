// Global Setup
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

// Database Pool Setup
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

// Express Setup
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routing
app.get('/', function(req, res) {
  res.render('pages/index');
});

app.get('/academics', function(req, res) {
  res.render('pages/academics');
});

app.get('/military', function(req, res) {
  res.render('pages/military');
});

app.get('/physical', function(req, res) {
  res.render('pages/physical');
});

app.get('/db', async(req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM test_table');
    const results = { 'results': (result) ? result.rows : null };
    res.render('pages/db', results);
    client.release();
  }

  catch (err) {
    console.error(err);
    res.send(err);
  }
});

// Server Listen
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
