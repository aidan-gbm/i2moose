/***************/
/*   MODULES   */
/***************/

// Router
const router = require('express').Router()

// Database
const modulePostgres = require('../../postgresql')

// Crypto
const moduleCrypto = require('crypto')
const SALT = process.env.PASS_SALT

// Body Parser
const bodyParser = require('body-parser')
router.use(bodyParser.urlencoded({extended: true}))
router.use(bodyParser.json())

// Validator
const moduleValidator = require('../../validator')

/***************/
/*   ROUTING   */
/***************/

// /api/profile/get
router.get('/get', function(req, res) {
  if (req.session.user) {
    let queryPromise = modulePostgres.getProfile(req.session.user)
    queryPromise.then(function(rows) {
      res.json({'rows': rows})
    }, function(err) {
      console.log(err)
      res.json({'rows': []})
    })
} else {
    res.status(401)
}
})

// /api/profile/update
router.post('/update/:type', function(req, res) {
  if (req.session.user) {
    switch (req.params.type) {

      // UPDATE PUBLIC
      case 'public': 
      let pubErrors = moduleValidator.validateAlpha(req.body.firstname, 'First Name')
        .concat(moduleValidator.validateAlpha(req.body.lastname, 'Last Name'))
        .concat(moduleValidator.validateInitial(req.body.middleinitial))
        .concat(moduleValidator.validateYear(req.body.academicyear, 'Graduation Year'))
        .concat(moduleValidator.validateAlphanumeric(req.body.major, 'Major'))
        if (pubErrors.length == 0) {
          modulePostgres.updateUserPersonal(req.body.firstname, req.body.lastname, req.body.middleinitial, req.body.academicyear, req.body.major, req.session.user)
            .then(function(rows) {
              res.status(200).send('Successfully updated public information.')
            }).catch(function(err) {
              console.log(err)
              res.status(500).send('Internal Server Error.')
            })
        } else res.status(400).send(pubErrors.toString().split(',').join('<br>'))
        break;

      // UPDATE PERSONAL
      case 'personal':
        let perErrors = moduleValidator.validateXnumber(req.body.xnumber, modulePostgres.getProfile)
          .concat(moduleValidator.validateEmail(req.body.email, modulePostgres.getUserByEmail))
          .concat(moduleValidator.validatePhone(req.body.phonenumber))
        if (perErrors.length == 0) {
          modulePostgres.updateUserPersonal(req.body.xnumber, req.body.email, req.body.phonenumber, req.session.user)
            .then(function(rows) {
              req.session.user = req.body.xnumber
              res.status(200).send('Successfully updated personal information.')
            }).catch(function(err) {
              console.log(err)
              res.status(500).send('Internal Server Error.')
            })
        } else res.status(400).send(perErrors.toString().split(',').join('<br>'))
        break;

      // RESET PASSWORD
      case 'password':
        let pasErrors = moduleValidator.validatePassword(req.body.pass1, req.body.pass2)
        if (pasErrors.length == 0) {
          let pw = moduleCrypto.pbkdf2Sync(req.body.pass1, SALT, 1000, 64, 'sha256').toString('hex')
          modulePostgres.updateUserPassword(pw, req.session.user)
            .then(res.status(200).send('Successfully reset password.'))
            .catch(function(err) {
              console.log(err)
              res.status(500).send('Internal Server Error.')
            })
        } else res.status(400).send(pasErrors.toString().split(',').join('<br>'))

      // UNKNOWN REQUEST
      default:
        res.status(400).send('Unknown request.')
    }
  } else {
    res.status(401).send('You must be logged in.')
  }
})

// /api/profile/login
router.post('/login', function(req, res) {
  let password = moduleCrypto.pbkdf2Sync(req.body.password, SALT, 1000, 64, 'sha256').toString('hex')
  modulePostgres.getUserFromLogin(req.body.email, password)
    .then(function(rows1) {
      if (rows1[0]) {
        modulePostgres.getJob(rows1[0]['xnumber'])
          .then(function(rows2) {
            req.session.jobs = []
            rows2.forEach(job => { req.session.jobs.push(job['shortname']) })
            req.session.user = rows1[0]['xnumber']
            res.status(302).send('/profile')
          })
          .catch(function(err) {
            console.log(err)
            res.status(500).send('Internal Server Error.')
          })
      } else {
        res.status(401).send('Invalid Login.')
      }
    }).catch(function(err) {
      console.log(err)
      res.status(500).send('Internal Server Error.')
    })
})

module.exports = router