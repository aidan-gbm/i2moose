/***************/
/*   MODULES   */
/***************/

// Router
const staff = require('express').Router()

// Renderer
const renderer = require('../renderer')

// Database
const modulePostgres = require('../postgresql')

// Body Parser
const bodyParser = require('body-parser')
staff.use(bodyParser.urlencoded({extended: true}))

// Supported Jobs
function userHasSupportedJob(jobs) {
    let supported = false
    let supportedJobs = new Set(['ISO', 'XO'])
    jobs.forEach(j => {
        if (supportedJobs.has(j))
            supported = true
    })
    return supported
}

/***************/
/*   ROUTING   */
/***************/

// staff
staff.get('/', function(req, res) {
    if (req.session.jobs) {
        if (userHasSupportedJob(req.session.jobs)) {
            return res.redirect('/staff/tools')
        } else {
            renderer.notifications.push({'msg':"No tools have been implemented yet for your job."})
            return renderer.renderPage(res, 'pages/staff/index', req.session.user)
        }
    } else {
        renderer.errors.push({'msg':"You must be signed in to view this page."})
        return renderer.renderPage(res, 'pages/staff/index', req.session.user)
    }
})

// staff/tools
staff.get('/tools', async function(req, res) {
    if (!req.session.jobs) {
        return res.redirect('/staff')
    } else {
        let data = {
            'jobs': req.session.jobs,
            'tools': []
        }
        console.log('Jobs: ' + req.session.jobs.toString())
        let result = await modulePostgres.getTools(req.session.jobs)
        console.log(result)
        if (result.rows[0]) {
            result.rows.forEach(t => {
                data['tools'].push(t['toolName'])
            })
        } else {
            renderer.notifications.push({'msg':"No tools have been implemented yet for your job(s)."})
        }
        return renderer.renderPage(res, 'pages/staff/tools', req.session.user, data)
    }
})

// staff/tool-select
staff.post('/tool-select', function(req, res) {
    if (!req.session.jobs) {
        return res.redirect('/staff')
    } else {
        let selectedTool = req.body.tool
        renderer.notifications.push({'msg':"You selected: " + selectedTool})
        return res.redirect('/staff/tools')
    }
})

module.exports = staff