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

// Body Parser
const bodyParser = require('body-parser')
profile.use(bodyParser.urlencoded({extended: true}))

// Validator
const moduleValidator = require('../validator')

// Renderer
const renderer = require('../renderer')

/***************/
/*   ROUTING   */
/***************/

// profile
profile.get('/', async(req, res) => {
    if (req.session.user) {
        let xn = req.session.user
        let result = await modulePostgres.getProfile(xn)

        if (result.rows[0]) {
            renderer.renderPage(res, 'pages/profile', xn, result.rows[0])
        } else {
            renderer.errors.push({'msg':"Somehow you're logged in but not in the database..."})
            renderer.renderPage(res, 'pages/profile', xn, {})
        }
    } else {
        res.redirect('/profile/login')
    }
})

// profile/register
profile.get('/register', function(req, res) {
    if (req.session.user) {
        res.redirect('/profile')
    } else {
        renderer.renderPage(res, 'pages/register', null)
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
        return renderer.renderPage(res, 'pages/register', null)
    } else {
        let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
        let response = await modulePostgres.register(req.body.xn, req.body.em, pw, req.body.fn, req.body.ln)
        if (response) {
            req.session.user = req.body.xn;
            res.redirect('/profile')
        } else {
            renderer.errors.push({'msg':'Server error. Contact your ISO.'})
            return renderer.renderPage(res, 'pages/register', null)
        }
    }
})

// profile/login
profile.get('/login', function(req, res) {
    if (req.session.user) {
        res.redirect('/profile')
    } else {
        renderer.renderPage(res, 'pages/login', null)
    }
})

profile.post('/login', async function(req, res) {
    if (process.env.DEBUG) {
        req.session.user = 'x03367'
        req.session.jobs = ['ISO']
        return res.redirect('/')
    }

    let validationErrors = []
    validationErrors = validationErrors.concat(await moduleValidator.validateEmail(req.body.em))

    if (validationErrors.length > 0) {
        validationErrors.forEach(e => renderer.errors.push(e))
        renderer.renderPage(res, 'pages/login', null)
    } else {
        let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
        let result = await modulePostgres.getXnumber(req.body.em, pw)

        if (result.rows[0]) {
            req.session.user = result.rows[0]['X-Number']
            let job = await modulePostgres.getJob(req.session.user)
            if (job.rows[0]) {
                req.session.jobs = []
                job.rows.forEach(job => {
                    req.session.jobs.push(job['shortname'])
                })
            }
            res.redirect('/profile')
        } else {
            renderer.errors.push({'msg': 'Invalid Login'})
            renderer.renderPage(res, 'pages/login', null)
        }
    }
})

// profile/logout
profile.get('/logout', function(req, res) {
    req.session.destroy()
    res.redirect('/')
})

/***************/
/*   ACTIONS   */
/***************/

// profile/update-public
profile.post('/update-public', async function(req, res) {
    if (!req.session.user) {
        return res.redirect('/profile/login');
    }

    let validationErrors = []
    validationErrors = validationErrors.concat(
        moduleValidator.validateAlpha(req.body.fn, 'First Name'),
        moduleValidator.validateAlpha(req.body.ln, 'Last Name'),
        moduleValidator.validateInitial(req.body.mi, 'Middle Initial'),
        moduleValidator.validateYear(req.body.ay, 'Academic Year'),
        moduleValidator.validateAlpha(req.body.pl, 'Platoon'),
        moduleValidator.validateAlpha(req.body.sq, 'Squad'),
        moduleValidator.validateAlpha(req.body.rm, 'Room #'),
        moduleValidator.validateAlphanumeric(req.body.mj, 'Major')
    )

    if (validationErrors.length > 0) {
        validationErrors.forEach(e => renderer.errors.push(e))
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
            renderer.notifications.push({'msg':'Successfully updated profile.'})
            res.redirect('/profile')
        } else {
            renderer.errors.push({'msg': 'Server error. Contact your ISO.'})
            res.redirect('/profile')
        }
    }  
})

// profile/update-personal
profile.post('/update-personal', async function(req, res) {
    if (!req.session.user) {
        return res.redirect('/profile/login');
    }

    let validationErrors = []
    validationErrors = validationErrors.concat(
        await moduleValidator.validateXnumber(req.body.xn),
        await moduleValidator.validateEmail(req.body.em),
        moduleValidator.validatePhone(req.body.fn)
    )

    if (validationErrors.length > 0) {
        validationErrors.forEach(e => renderer.errors.push(e))
        return res.redirect('/profile')
    } else {
        if (await modulePostgres.updateUserPersonal([req.body.xn, req.body.em, req.body.pn || null, req.session.user])) {
            renderer.notifications.push({'msg':'Successfully updated profile.'})
            res.redirect('/profile')
        } else {
            renderer.errors.push({'msg': 'Server error. Contact your ISO.'})
            res.redirect('/profile')
        }
    }
})

// profile/update-password
profile.post('/update-password', async function(req, res) {
    if (!req.session.user) {
        return res.redirect('/profile/login');
    }

    let validationErrors = []
    validationErrors = validationErrors.concat(moduleValidator.validatePassword(req.body.pw, req.body.pw2))
    if (validationErrors.length > 0) {
        validationErrors.forEach(e => renderer.errors.push(e))
        return res.redirect('/profile')
    } else {
        let pw = crypto.pbkdf2Sync(req.body.pw, SALT, 1000, 64, 'sha256').toString('hex')
        if (await modulePostgres.updateUserPassword(pw, req.session.user)) {
            renderer.notifications.push({'msg':'Successfully updated password.'})
            res.redirect('/profile')
        } else {
            renderer.errors.push({'msg': 'Server error. Contact your ISO.'})
            res.redirect('/profile')
        }
    }
})

module.exports = profile