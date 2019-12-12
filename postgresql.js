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
        await client.query('ROLLBACK')
        return false
    } finally {
        client.release()
    }
})().catch(e => console.log(e.toString()))

/********** SETUP TABLES ***********/
exports.setup = async(clean) => {
    cleanTables = `
        DROP TABLE IF EXISTS cadettasked;
        DROP TABLE IF EXISTS training;
        DROP TABLE IF EXISTS cadet;`
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
    createTraining = `CREATE TABLE IF NOT EXISTS training (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            suspense DATE,
            description TEXT
        );`
    createCadetTasked = `CREATE TABLE IF NOT EXISTS cadettasked (
            eventid INT REFERENCES training(id) ON UPDATE CASCADE,
            cadetid VARCHAR(6) REFERENCES cadet(xnumber) ON UPDATE CASCADE
        );`
    if (clean) {
        return (
            await query(cleanTables) &&
            await query(createTraining) &&
            await query(createCadet) &&
            await query(createCadetTasked)
        )
    } else {
        return (
            await query(createTraining) &&
            await query(createCadet) &&
            await query(createCadetTasked)
        )
    }
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
    getRoster = (sql`
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
    )
    return await query(getRoster)
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