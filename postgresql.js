// Connect to db & create pool
const conn = process.env.DATABASE_URL;
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: conn,
  ssl: true
})

// Send error on idle clients
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
})

// SQL Query Strings
var sql = require('sql-template-strings')

// Attempt query on database
;(query = async(queryString, args = []) => {
    if (!queryString) return
    let client = await pool.connect()
    try {
        await client.query('BEGIN')
        let res = await client.query(queryString, args)
        await client.query('COMMIT')
        return res
    } catch (e) {
        console.log(e.toString())
        await client.query('ROLLBACK')
        return false
    } finally {
        client.release()
    }
})().catch(e => console.log(e.toString()))

/********** SETUP TABLES ***********/
exports.setup = async() => {
    createCadet = `CREATE TABLE IF NOT EXISTS cadet (
        xnumber VARCHAR(6) PRIMARY KEY,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        firstname VARCHAR(25) NOT NULL,
        lastname VARCHAR(25) NOT NULL,
        middleinitial CHAR(1),
        academicyear INT,
        phonenumber CHAR(12),
        platoon INT,
        squad INT,
        room INT,
        major VARCHAR(25)
    );`
    createJob = `CREATE TABLE IF NOT EXISTS job (
        id SERIAL PRIMARY KEY,
        shortname VARCHAR(10) NOT NULL,
        name VARCHAR(50)
    );`
    createCadetHasJob = `CREATE TABLE IF NOT EXISTS cadetHasJob (
        cadetid VARCHAR(6) REFERENCES cadet(xnumber) ON UPDATE CASCADE ON DELETE CASCADE,
        jobid INT REFERENCES job(id) ON UPDATE CASCADE ON DELETE CASCADE
    );`
    createCadetHasJobIndex = `CREATE UNIQUE INDEX IF NOT EXISTS idx_cdt_job ON cadetHasJob (cadetid, jobid);`
    createJobHasTool = `CREATE TABLE IF NOT EXISTS jobHasTool (
        jobid INT REFERENCES job(id) ON UPDATE CASCADE ON DELETE CASCADE,
        toolName TEXT
    );`
    createJobHasToolIndex = `CREATE UNIQUE INDEX IF NOT EXISTS idx_job_tool ON jobHasTool (jobid, toolName);`
    createPost = `CREATE TABLE IF NOT EXISTS post (
        id SERIAL PRIMARY KEY,
        title TEXT,
        text TEXT,
        posted DATE,
        edited DATE,
        location VARCHAR(50),
        author VARCHAR(6) REFERENCES cadet(xnumber) ON UPDATE CASCADE ON DELETE NO ACTION
    )`
    createTraining = `CREATE TABLE IF NOT EXISTS training (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        suspense DATE,
        description TEXT
    );`
    createCadetTasked = `CREATE TABLE IF NOT EXISTS cadettasked (
        cadetid VARCHAR(6) REFERENCES cadet(xnumber) ON UPDATE CASCADE ON DELETE NO ACTION,
        eventid INT REFERENCES training(id) ON UPDATE CASCADE ON DELETE CASCADE
    );`
    createCadetTaskedIndex = `CREATE UNIQUE INDEX IF NOT EXISTS idx_cdt_event ON cadetTasked (cadetid, eventid);`
    return (
        await query(createCadet)
        && await query(createJob)
        && await query(createCadetHasJob)
        && await query(createCadetHasJobIndex)
        && await query(createJobHasTool)
        && await query(createJobHasToolIndex)
        && await query(createPost)
        //&& await query(createTraining)
        //&& await query(createCadetTasked)
    )
}

/********************/
/*   MISC QUERIES   */
/********************/
exports.customQuery = async(qString) => {
    return await query(qString)
}

exports.getUserByEmail = async(em) => {
    getEmail = (sql`SELECT xnumber FROM cadet WHERE email = $1`)
    return await query(getEmail, [em])
}

/********************/
/*   USER SELECTS   */
/********************/
exports.getProfile = async(xn) => {
    getProfile = (sql`
        SELECT
            firstname, lastname, middleinitial, academicyear, room, major,
            xnumber, email, phonenumber
        FROM cadet WHERE xnumber = $1`
    )
    return await query(getProfile, [xn])
}

exports.getRoster = async() => {
    getRoster = sql`
        SELECT
            c.academicyear AS "Graduation Year",
            j.shortname AS "Position",
            c.lastname AS "Last Name",
            c.firstname AS "First Name",
            c.middleinitial AS "Middle Initial",
            c.platoon AS "Platoon",
            c.squad AS "Squad",
            c.room AS "Room #",
            c.major AS "Major"
        FROM cadet c
        LEFT JOIN cadetHasJob cj ON c.xnumber = cj.cadetid
        LEFT JOIN job j ON cj.jobid = j.id
        ORDER BY c.academicyear, c.lastname, c.firstname, c.middleinitial`.setName('getRoster')
    return await query(getRoster)
}

/********************/
/*   USER ACTIONS   */
/********************/
exports.register = async(xn, em, pw, fn, ln) => {
    register = (sql`INSERT INTO cadet (xnumber, email, password, firstname, lastname) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (xnumber) DO NOTHING`)
    return await query(register, [xn, em, pw, fn, ln])
}

exports.getUserFromLogin = async(em, pw) => {
    getXnumber = (sql`SELECT xnumber FROM cadet WHERE email = $1 AND password = $2 LIMIT 1`)
    return await query(getXnumber, [em, pw])
}

exports.updateUserPublic = async(data) => {
    updateUser = (sql`UPDATE cadet SET firstname=$1, lastName=$2, middleInitial=$3, academicYear=$4, major=$5 WHERE xnumber = $6`)
    return await query(updateUser, data)
}

exports.updateUserPersonal = async(data) => {
    updateUser = (sql`UPDATE cadet SET xnumber=$1, email=$2, phonenumber=$3 WHERE xnumber = $4`)
    return await query(updateUser, data)
}

exports.updateUserPassword = async(pw, xn) => {
    updateUser = (sql`UPDATE cadet SET password=$1 WHERE xnumber = $2`)
    return await query(updateUser, [pw, xn])
}

/*********************/
/*   STAFF SELECTS   */
/*********************/
exports.getJob = async(xn) => {
    getJob = (sql`
        SELECT j.shortname
        FROM job j
        INNER JOIN cadetHasJob cj ON j.id = cj.jobid
        INNER JOIN cadet c ON c.xnumber = cj.cadetid
        WHERE c.xnumber = $1`)
    return await query(getJob, [xn])
}

exports.getTools = async(jobs) => {
    getJobIds = (sql`SELECT id FROM job WHERE shortname = $1`)
    for (i = 1; i < jobs.length; i++) {
        getJobIds.append(` OR shortname = \$${i+1}`)
    }
    getTools =(sql`SELECT toolName FROM jobHasTool WHERE jobid IN (`).append(getJobIds).append(`) ORDER BY toolName`)
    return await query(getTools, jobs)
}

exports.getPosts = async(location) => {
    let getPosts = (sql`
        SELECT p.title, p.text, to_char(p.posted, 'DDMONYY') as date, c.lastname as author
        FROM post p
        JOIN cadet c ON p.author = c.xnumber
        WHERE location = $1
        ORDER BY p.posted DESC`
    )
    return await query(getPosts, [location])
}

/*********************/
/*   STAFF ACTIONS   */
/*********************/
exports.setPositions = async(cadets, platoon, squad) => {
    setPositions = (sql`UPDATE cadet SET platoon = $1, squad = $2 WHERE xnumber = $3`)
    for (i = 1; i < cadets.length; i++) {
        setPositions.append(` OR xnumber = \$${i+3}`)
    }
    return await query(setPositions, [platoon, squad].concat(cadets))
}

exports.setRooms = async(cadets, room) => {
    setRooms = (sql`UPDATE cadet SET room = $1 WHERE xnumber = $2`)
    for (i = 1; i < cadets.length; i++)
        setRooms.append(` OR xnumber = \$${i+2}`)
    return await query(setRooms, [room].concat(cadets))
}

exports.setJob = async(xn, jn) => {
    setJob = (sql`INSERT INTO cadetHasJob (cadetid, jobid) VALUES ($1, $2) ON CONFLICT (cadetid, jobid) DO NOTHING`)
    return await query(setJob, [xn, jn])
}

exports.removeJob = async(xn, jn) => {
    removeJob = (sql`DELETE FROM cadethasjob WHERE cadetid = $1 AND jobid = $2`)
    return await query(removeJob, [xn, jn])
}

exports.giveTool = async(job_ids, tool_name) => {
    clearTools = (sql`DELETE FROM jobHasTool WHERE toolName = $1`)
    await query(clearTools, [tool_name])

    giveTool = (sql`INSERT INTO jobHasTool (jobid, toolName) VALUES ($2, $1)`)
    for (i = 1; i < job_ids.length; i++)
        giveTool.append(`, (\$${i+2}, $1)`)
    giveTool.append(` ON CONFLICT (jobid, toolName) DO NOTHING`)
    return await query(giveTool, [tool_name].concat(job_ids))
}

exports.writePost = async(title, text, location, author) => {
    let now = new Date()
    let writePost = (sql`INSERT INTO post (id, title, text, posted, edited, location, author) VALUES (DEFAULT, $1, $2, $3, $3, $4, $5)`)
    return await query(writePost, [title, text, now, location, author])
}

exports.editPost = async(id, title, text, location) => {
    let now = new Date()
    let editPost = (sql`UPDATE post SET title = $1, text = $2, location = $3, edited = $4 WHERE id = $5`)
    return await query(editPost, [title, text, location, now, id])
}

exports.deletePost = async(id) => {
    let deletePost = (sql`DELETE FROM post WHERE id = $1`)
    return await query(deletePost, [id])
}