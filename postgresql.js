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
;(query = async(queryString) => {
    if (!queryString) return
    let client = await pool.connect()
    try {
        await client.query('BEGIN')
        let res = await client.query(queryString)
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
exports.register = async(xn, email, pass, fn, ln) => {
    register = (sql`
        INSERT INTO cadet (
            xnumber,
            email,
            password,
            firstname,
            lastname
        ) VALUES (
            ${xn}, ${email}, ${pass}, ${fn}, ${ln}
        ) ON CONFLICT (xnumber) DO NOTHING`
    )
    return await query(register)
}

/********** GET XNUMBER ***********/
exports.getXnumber = async(email, password) => {
    getXnumber = (sql`
        SELECT xnumber
        FROM cadet
        WHERE email = ${email}
        AND password = ${password}
        LIMIT 1`
    )
    return await query(getXnumber)
}

/********** GET PROFILE ***********/
exports.getProfile = async(xnumber) => {
    getProfile = (sql`
        SELECT *
        FROM cadet
        WHERE xnumber = ${xnumber}`
    )
    return await query(getProfile)
}

/********** GET ROSTER ***********/
exports.getRoster = async(admin) => {
    getRoster = (sql`
        SELECT
            academicyear, firstname,
            lastname, middleinitial,
            platoon, squad,
            room, major
        FROM cadet`
    )
    return await query(getRoster)
}

/********** UPDATE USER ***********/
exports.updateUserPublic = async(d, xn) => {
    updateUser = (sql`
        UPDATE cadet SET
            firstname=${d.fn}, lastName=${d.ln},
            middleInitial=${d.mi}, academicYear=${d.ay},
            platoon=${d.pl}, squad=${d.sq},
            room=${d.rm}, major=${d.mj}
        WHERE xnumber = ${xn}`
    )
    return await query(updateUser)
}

exports.updateUserPersonal = async(d, xn) => {
    updateUser = (sql`
        UPDATE cadet SET
            xnumber=${d.xn},
            email=${d.em},
            phonenumber=${d.pn}
        WHERE xnumber = ${xn}`
    )
    return await query(updateUser)
}

exports.updateUserPassword = async(pw, xn) => {
    updateUser = (sql`
        UPDATE cadet SET
            password=${pw}
        WHERE xnumber = ${xn}`
    )
    return await query(updateUser)
}