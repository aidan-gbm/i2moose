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

/********** REGISTER ***********/
exports.register = async(xn, em, pw, fn, ln) => {
    register = (sql`
        INSERT INTO cadet (
            xnumber, email, password, firstname, lastname
        ) VALUES (
            $1, $2, $3, $4, $5
        ) ON CONFLICT (xnumber) DO NOTHING`
    )
    return await query(register, [xn, em, pw, fn, ln])
}

/********** GET XNUMBER ***********/
exports.getXnumber = async(em, pw) => {
    getXnumber = (sql`
        SELECT xnumber AS "X-Number"
        FROM cadet
        WHERE email = $1
        AND password = $2
        LIMIT 1`
    )
    return await query(getXnumber, [em, pw])
}

/********** GET PROFILE ***********/
exports.getProfile = async(xn) => {
    getProfile = (sql`
        SELECT *
        FROM cadet
        WHERE xnumber = $1`
    )
    return await query(getProfile, [xn])
}

/********** GET ROSTER ***********/
exports.getRoster = async() => {
    getRoster = `
        SELECT
            academicyear AS "Academic Year",
            firstname AS "First Name",
            lastname AS "Last Name",
            middleinitial AS "Middle Initial",
            platoon AS "Platoon",
            squad AS "Squad",
            room AS "Room #",
            major AS "Major"
        FROM cadet`
    return await query(getRoster)
}

/****** LIST CADETS ******/
exports.listCadets = async() => {
    listCadets = `
        SELECT CONCAT (
            lastname, ', ', firstname, ' ', academicyear
        ) AS cdt
        FROM cadet
        ORDER BY academicyear;`
    return await query(listCadets)
}

/****** GET USER BY EMAIL *******/
exports.getUserByEmail = async(em) => {
    getEmail = (sql`
        SELECT
            academicyear AS "Graduation Year",
            firstname AS "First Name",
            lastname AS "Last Name",
            middleinitial AS "Middle Initial",
            platoon AS "Platoon",
            squad AS "Squad",
            room AS "Room #",
            major AS "Major"
        FROM cadet
        WHERE email = $1` 
    )
    return await query(getEmail, [em])
}

/****** JOBS ******/
exports.getJob = async(xn) => {
    getJob = (sql`
        SELECT j.shortname
        FROM job j
        INNER JOIN cadetHasJob cj ON j.id = cj.jobid
        INNER JOIN cadet c ON c.xnumber = cj.cadetid
        WHERE c.xnumber = $1`)
    return await query(getJob, [xn])
}

exports.setJob = async(xn, jn) => {
    setJob = (sql`
        INSERT INTO cadetHasJob (
            cadetid, jobid
        ) VALUES (
            $1, $2
        ) ON CONFLICT (cadetid, jobid) DO NOTHING`
    )
    return await query(setJob, [xn, jn])
}

exports.removeJob = async(xn, jn) => {
    removeJob = (sql`
        DELETE FROM cadethasjob
        WHERE cadetid = $1
        AND jobid = $2`
    )
    return await query(removeJob, [xn, jn])
}

exports.listJobs = async() => {
    listJobs = `
        SELECT CONCAT (
            shortname, ' - ', name
        ) AS job
        FROM job;`
    return await query(listJobs)
}

/****** TOOLS ******/
exports.giveTool = async(job_id, tool_name) => {
    giveTool = (sql`
        INSERT INTO jobHasTool (
            jobid, toolName
        ) VALUES (
            $1, $2
        ) ON CONFLICT (jobid, toolName) DO NOTHING;`
    )
    return await query(giveTool, [job_id, tool_name])
}

exports.removeTool = async(job_id, tool_name) => {
    removeTool = (sql`
        DELETE FROM jobHasTool
        WHERE jobid = $1
        AND toolName = $2`
    )
    return await query(removeTool, [job_id, tool_name])
}

exports.getTools = async(job1, job2 = "", job3 = "") => {
    getTools =(sql`
        SELECT toolName
        FROM jobHasTool
        WHERE jobid IN (
            SELECT id FROM job WHERE shortname IN ($1, $2, $3)
        );`
    )
    return await query(getTools, [job1, job2, job3])
}

/********** UPDATE USER ***********/
exports.updateUserPublic = async(data) => {
    updateUser = (sql`
        UPDATE cadet SET
            firstname=$1, lastName=$2, middleInitial=$3, academicYear=$4, platoon=$5, squad=$6, room=$7, major=$8
        WHERE xnumber = $9`
    )
    return await query(updateUser, data)
}

exports.updateUserPersonal = async(data) => {
    updateUser = (sql`
        UPDATE cadet SET
            xnumber=$1, email=$2, phonenumber=$3
        WHERE xnumber = $4`
    )
    return await query(updateUser, data)
}

exports.updateUserPassword = async(pw, xn) => {
    updateUser = (sql`
        UPDATE cadet SET
            password=$1
        WHERE xnumber = $2`
    )
    return await query(updateUser, [pw, xn])
}

/****** POSTS ******/
exports.writePost = async(title, text, location, author) => {
    let now = new Date()
    let writePost = (sql`
        INSERT INTO post (
            id, title, text, posted, edited, location, author
        ) VALUES (
            DEFAULT, $1, $2, $3, $3, $4, $5
        );`
    )
    return await query(writePost, [title, text, now, location, author])
}

exports.getPosts = async(location) => {
    let getPosts = (sql`
        SELECT
            p.title, p.text, to_char(p.posted, 'DDMONYY') as date, c.lastname as author
        FROM post p
        JOIN cadet c ON p.author = c.xnumber
        WHERE location = $1
        ORDER BY p.edited DESC`
    )
    return await query(getPosts, [location])
}

/****** CUSTOM QUERY ******/
exports.customQuery = async(qString) => {
    return await query(qString)
}