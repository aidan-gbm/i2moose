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
                data = await loadWritePost(req.session)
                break;
            case "assign-tools":
                data = await loadAssignTools(req.session)
                break;
            case "assign-positions":
                data = await loadCadetNames(req.session)
                break;
            case "assign-rooms":
                data = await loadCadetNames(req.session)
                break;
        }
        return renderer.renderPage(res, 'pages/staff/tools', req.session.user, data)
    }
})

staff.post('/tools/:id', async function(req, res) {
    if (!req.session.jobs) {
        return res.redirect('/staff')
    } else {
        switch(req.params.id) {
            case "assign-jobs":
                await executeAssignJobs(req.body.name, req.body.job)
                break;
            case "remove-jobs":
                await executeRemoveJobs(req.body.name, req.body.job)
                req.params.id = "assign-jobs"
                break;
            case "create-jobs":
                await executeCreateJobs(req.body.shortname, req.body.name)
                req.params.id = "assign-jobs"
                break;
            case "delete-jobs":
                await executeDeleteJobs(req.body.job_id)
                req.params.id = "assign-jobs"
                break;
            case "write-post":
                await executeWritePost(req.body.title, req.body.text, req.body.location, req.session)
                break;
            case "edit-post":
                await executeEditPost(req.body.id, req.body.title, req.body.text, req.body.location)
                req.params.id = "write-post"
                break;
            case "delete-post":
                await executeDeletePost(req.body.id)
                req.params.id = "write-post"
                break;
            case "assign-tools":
                await executeAssignTools(req.body.jobs, req.body.tool)
                break;
            case "create-tools":
                await executeCreateTools(req.body.tool)
                req.params.id = "assign-tools"
                break;
            case "assign-positions":
                await executeAssignPositions(req.body.cadets, req.body.platoon, req.body.squad)
                break;
            case "assign-rooms":
                await executeAssignRooms(req.body.cadets, req.body.room)
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
        let result = await modulePostgres.getTools(req.session.jobs)
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
    queryString = `select j.shortname || ' - ' || j.name as job_name, j.id as job_id, c.lastname || ', ' || c.firstname || ' ''' || c.academicyear as cdt_name, c.xnumber as cdt_id from job j left join cadethasjob cj on j.id = cj.jobid full join cadet c on cj.cadetid = c.xnumber;`
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
                if (!(cadets[row['cdt_id']].jobs.includes(row['job_id']))) {
                    cadets[row['cdt_id']].jobs.push(row['job_name'])
                }
            }
        })
    }

    let data = toDataObject(session)
    data['cadets'] = cadets
    data['jobs'] = jobs
    return data
}

async function loadAssignTools(session) {
    queryString = `select j.shortname || ' - ' || j.name as job_name, j.id as job_id, jt.toolname as tool_name from job j left join jobhastool jt on j.id = jt.jobid`
    jobs = {}
    tools = {}
    let result = await modulePostgres.customQuery(queryString)
    if (result.rows[0]) {
        result.rows.forEach(row => {
            if (row['job_id'] != null && !(row['job_id'] in jobs))
                jobs[row['job_id']] = row['job_name']

            if (row['tool_name'] != null && !(row['tool_name'] in tools))
                tools[row['tool_name']] = []

            if (row['tool_name'] != null && !(tools[row['tool_name']].includes(row['job_id'])))
                tools[row['tool_name']].push(row['job_id'])
        })
    }
    
    let data = toDataObject(session)
    data['jobs'] = jobs
    data['tools'] = tools
    return data
}

async function loadWritePost(session) {
    queryString = `select
        id, title, text, location, to_char(posted, 'DDMONYY') as date
        from post
        where author = '${session.user}'
        order by posted desc`
    let result = await modulePostgres.customQuery(queryString)
    posts = {}
    if (result.rows.length > 0) {
        result.rows.forEach(row => {
            posts[row['id']] = {
                'title': Buffer.from(row['title'], 'base64').toString(),
                'text': row['text'],
                'location': row['location'],
                'date': row['date']
            }
        })
    }

    let data = toDataObject(session)
    data['posts'] = posts
    return data
}

async function loadCadetNames(session) {
    let data = toDataObject(session)
    queryString = `select xnumber, lastname || ', ' || firstname || ' ''' || academicyear as name, platoon, squad from cadet order by academicyear DESC, lastname, firstname, middleinitial;`
    let result = await modulePostgres.customQuery(queryString)
    data['cadets'] = result.rows
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

async function executeCreateJobs(shortname, name) {
    if (shortname.length > 10 || name.length > 50) {
        renderer.errors.push({'msg':"The short name can be a max of 10 characters and the full name can be a max of 50 characters."})
    } else if (shortname != "" && name != "") {
        let queryString = `INSERT INTO job (id, shortname, name) VALUES (DEFAULT, '${shortname}', '${name}');`
        await modulePostgres.customQuery(queryString)
        renderer.notifications.push({'msg':`Successfully created ${shortname} - ${name}.`})
    } else {
        renderer.errors.push({'msg':"You must enter a shortname and full name."})
    }
}

async function executeDeleteJobs(job_id) {
    try {
        job_id = parseInt(job_id)
        queryString = `DELETE FROM job WHERE id = ${job_id};`
        await modulePostgres.customQuery(queryString)
        renderer.notifications.push({'msg':`Successfully deleted job.`})
    } catch (e) {
        renderer.errors.push({'msg':"Unexpected data. Are you doing something you shouldn't be?"})
    }
}

async function executeWritePost(title, text, location, session) {
    if (title != "" && text != "" && location != "") {
        let author = session.user
        await modulePostgres.writePost(title, text, location, author)
        let msg = `Wrote post to ${location || 'drafts'}: ${Buffer.from(title, 'base64').toString()}.`
        renderer.notifications.push({'msg':msg})
    } else {
        renderer.errors.push({'msg':"You must submit a title, text, and location."})
    }
}

async function executeEditPost(id, title, text, location) {
    if (title != "" && text != "" && location != "") {
        await modulePostgres.editPost(id, title, text, location)
        renderer.notifications.push({'msg':`Edited ${Buffer.from(title, 'base64').toString()}.`})
    } else {
        renderer.errors.push({'msg':"You must submit a title, text, and location."})
    }
}

async function executeDeletePost(id) {
    await modulePostgres.deletePost(id)
    renderer.notifications.push({'msg':`Deleted post.`})
}

async function executeAssignTools(job_ids, tool_name) {
    if (job_ids != "" && tool_name != "") {
        try {
            job_ids = Buffer.from(job_ids, 'base64').toString().split(',').map(Number)
            await modulePostgres.giveTool(job_ids, tool_name)
            renderer.notifications.push({'msg':`Successfully assigned ${job_ids.length} jobs to ${tool_name}.`})
        } catch (e) {
            renderer.errors.push({'msg':"Unexpected data. Are you doing something you shouldn't be?"})
        }
    } else {
        renderer.errors.push({'msg':"You must select at least one job and a tool."})
    }
}

async function executeCreateTools(tool_name) {
    if (tool_name != "") {
        // Note: job_id here should be for ISO
        await modulePostgres.giveTool(2, tool_name)
        renderer.notifications.push({'msg':`Successfully created ${tool_name}.`})
    } else {
        renderer.errors.push({'msg':"You must enter a tool name."})
    }
}

async function executeAssignPositions(cadets, platoon, squad) {
    if (cadets != "" && platoon != "" && squad != "") {
        try {
            cadets = Buffer.from(cadets, 'base64').toString().split(',')
            platoon = parseInt(platoon)
            squad = parseInt(squad)
            await modulePostgres.setPositions(cadets, platoon, squad)
            renderer.notifications.push({'msg':`Successfully assigned ${cadets.length} cadet(s) to ${platoon} PLT ${squad} SQD.`})
        } catch (e) {
            renderer.errors.push({'msg':"Unexpected data. Are you doing something you shouldn't be?"})
        }
    } else {
        renderer.errors.push({'msg':"You must select at least one cadet and set both the platoon and squad."})
    }
}

async function executeAssignRooms(cadets, room) {
    if (cadets != "" && room != "") {
        try {
            cadets = Buffer.from(cadets, 'base64').toString().split(',')
            room = parseInt(room)
            await modulePostgres.setRooms(cadets, room)
            renderer.notifications.push({'msg':`Successfully assigned ${cadets.length} cadet(s) to room ${room}.`})
        } catch (e) {
            renderer.errors.push({'msg':"Unexpected data. Are you doing something you shouldn't be?"})
        }
    } else {
        renderer.errors.push({'msg':"You must select at least one cadet and specify a room number."})
    }
}

module.exports = staff