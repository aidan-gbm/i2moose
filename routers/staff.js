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

// Data Object
function toDataObject(session) {
    let data = {
        'sess-jobs': session.jobs,
        'sess-tools': session.tools,
        'sess-tool': session.tool
    }
    return data
}

/***************/
/*   ROUTING   */
/***************/

// staff
staff.get('/', function(req, res) {
    if (req.session.jobs) {
        req.session.tools = []
        req.session.tool = undefined
        return res.redirect('/staff/tools')
    } else {
        renderer.errors.push({'msg':"You must be signed in to view this page."})
        return renderer.renderPage(res, 'pages/staff/index', req.session.user)
    }
})

// staff/tools
staff.get('/tools', function(req, res) {
    if (!req.session.jobs) {
        return res.redirect('/staff')
    } else {
        if (req.session.tools.length == 0 && renderer.notifications.length == 0) {
            return res.redirect('/staff/tool-list')
        } else {
            renderer.renderPage(res, 'pages/staff/tools', req.session.user, toDataObject(req.session))
        }
    }
})

staff.get('/tools/:id', async function(req, res) {
    if (!req.session.jobs) {
        return res.redirect('/staff')
    } else {
        let data = toDataObject(req.session)
        switch(req.params.id) {
            case "assign-jobs":
                data = await loadAssignJobs(req.session)
                break;
            case "write-post":
                break;
        }
        return renderer.renderPage(res, 'pages/staff/tools', req.session.user, data)
    }
})

staff.post('/tools/:id', async function(req, res) {
    if (!req.session.jobs) {
        return res.redirect('/staff')
    } else {
        let data = toDataObject(req.session)
        switch(req.params.id) {
            case "assign-jobs":
                await executeAssignJobs(req.body.name, req.body.job)
                break;
            case "remove-jobs":
                await executeRemoveJobs(req.body.name, req.body.job)
                req.params.id = "assign-jobs"
                break;
            case "write-post":
                await executeWritePost(req.body.title, req.body.text, req.body.location, req.session)
                break;
        }
        return res.redirect('/staff/tools/' + req.params.id)
    }
})

// staff/tool-select
staff.post('/tool-select', function(req, res) {
    if (!req.session.jobs) {
        return res.redirect('/staff')
    } else {
        req.session.tool = req.body.tool
        return res.redirect('/staff/tools/' + req.body.tool.toLowerCase().replace(/\s/g, '-'))
    }
})

// staff/tool-list
staff.get('/tool-list', async function(req, res) {
    if (req.session.jobs) {
        let result = await modulePostgres.getTools.apply(null,req.session.jobs.slice(0,Math.min(req.session.jobs.length,3)))
        if (result.rows[0]) {
            result.rows.forEach(t => {
                if (!req.session.tools.includes(t['toolname']))
                    req.session.tools.push(t['toolname'])
            })
        } else {
            renderer.notifications.push({'msg':"No tools have been implemented yet for your job(s)."})
        }
    }
    return res.redirect('/staff/tools')
})

/******************/
/*   LOAD TOOLS   */
/******************/

async function loadAssignJobs(session) {
    queryString = `select
        j.shortname || ' - ' || j.name as job_name,
        j.id as job_id,
        c.lastname || ', ' || c.firstname || ' ''' || c.academicyear as cdt_name,
        c.xnumber as cdt_id
        from job j
        left join cadethasjob cj on j.id = cj.jobid
        full join cadet c on cj.cadetid = c.xnumber;`
    cadets = {}
    jobs = {}
    let result = await modulePostgres.customQuery(queryString)
    if (result.rows[0]) {
        result.rows.forEach(row => {
            if (row['job_id'] != null && !(row['job_id'] in jobs)) {
                jobs[row['job_id']] = row['job_name']
            }
            if (row['cdt_id'] != null && !(row['cdt_id'] in cadets)) {
                cadets[row['cdt_id']] = {'name': row['cdt_name'], 'jobs': []}
            }
            if (row['cdt_id'] != null && row['job_id'] != null) {
                if (!(row['job_id'] in cadets[row['cdt_id']].jobs)) {
                    cadets[row['cdt_id']].jobs.push(row['job_name'])
                }
            }
        })
    }

    data = toDataObject(session)
    data['cadets'] = cadets
    data['jobs'] = jobs
    return data
}

/*********************/
/*   EXECUTE TOOLS   */
/*********************/

async function executeAssignJobs(xnumber, job_id) {
    if (xnumber != "" && job_id != "") {
        try {
            job_id = parseInt(job_id)
            await modulePostgres.setJob(xnumber, job_id)
            renderer.notifications.push({'msg':"Successfully assigned job."})
        } catch (e) {
            renderer.errors.push({'msg':"Unexpected data. Are you doing something you shouldn't be?"})
        }
    } else {
        renderer.errors.push({'msg':"You must select both a name and a job."})
    }
}

async function executeRemoveJobs(xnumber, job_id) {
    if (xnumber != "" && job_id != "") {
        try {
            job_id = parseInt(job_id)
            await modulePostgres.removeJob(xnumber, job_id)
            renderer.notifications.push({'msg':"Successfully removed job."})
        } catch (e) {
            renderer.errors.push({'msg':"Unexpected data. Are you doing something you shouldn't be?"})
        }
    } else {
        renderer.errors.push({'msg':"You must select both a name and a job."})
    }
}

async function executeWritePost(title, text, location, session) {
    if (title != "" && text != "" && location != "") {
        let author = session.user
        await modulePostgres.writePost(title, text, location, author)
        let msg = `Wrote post to ${location}: ${title}.`
        renderer.notifications.push({'msg':msg})
    } else {
        renderer.errors.push({'msg':"You must submit a title, text, and location."})
    }
}

module.exports = staff