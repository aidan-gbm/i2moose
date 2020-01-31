/***************/
/*   MODULES   */
/***************/

// Router
const profile = require('express').Router()

// Crypto
const crypto = require('crypto')
const SALT = process.env.PASS_SALT

// Database
const modulePostgres = require('../postgresql')

// Validator
const moduleValidator = require('../validator')

// Renderer
const renderer = require('../renderer')

/***************/
/*   ROUTING   */
/***************/

// /profile
profile.get('/', async(req, res) => {
    if (req.session.user) {
        renderer.renderPage(res, 'pages/profile/profile', req.session.user)
    } else {
        res.redirect('/profile/login')
    }
})

// /profile/register
profile.get('/register', function(req, res) {
    if (req.session.user) {
        res.redirect('/profile')
    } else {
        renderer.renderPage(res, 'pages/profile/register', null)
    }
})

profile.post('/register', async function(req, res) {
    let validationErrors = []
    validationErrors = validationErrors.concat(
        moduleValidator.validateAlpha(req.body.fn, 'First Name'),
        moduleValidator.validateAlpha(req.body.ln, 'Last Name'),
        await moduleValidator.validateXnumber(req.body.xn, modulePostgres.getProfile),
        await moduleValidator.validateEmail(req.body.em, modulePostgres.getUserByEmail),
        moduleValidator.validatePassword(req.body.pw, req.body.pw2)
    )

    if (validationErrors.length > 0) {
        validationErrors.forEach(e => renderer.errors.push(e))
        return renderer.renderPage(res, 'pages/profile/register', null)
    } else {
        let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
        let response = await modulePostgres.register(req.body.xn, req.body.em, pw, req.body.fn, req.body.ln)
        if (response) {
            req.session.user = req.body.xn;
            res.redirect('/profile')
        } else {
            renderer.errors.push({'msg':'Server error. Contact your ISO.'})
            return renderer.renderPage(res, 'pages/profile/register', null)
        }
    }
})

// profile/login
profile.get('/login', function(req, res) {
    if (req.session.user) {
        res.redirect('/profile')
    } else {
        renderer.renderPage(res, 'pages/profile/login', null)
    }
})

// profile/logout
profile.get('/logout', function(req, res) {
    req.session.destroy()
    res.redirect('/')
})

module.exports = profile