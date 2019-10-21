export function setup(client) {
    createCadet = `
        CREATE TABLE IF NOT EXISTS cadet (
            xnumber VARCHAR(6) PRIMARY KEY,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            firstname VARCHAR(25) NOT NULL,
            lastname VARCHAR(25) NOT NULL,
            middleinitial CHAR(1),
            academicyear INT,
            phonenumber CHAR(10),
            platoon INT,
            squad INT,
            room INT,
            major VARCHAR(25)
        );`
    createTraining = `
        CREATE TABLE IF NOT EXISTS training (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            suspense DATE,
            description TEXT
        );`
    createCadetTasked = `
        CREATE TABLE IF NOT EXISTS cadettasked (
            eventid INT REFERENCES training(id) ON UPDATE CASCADE,
            cadetid VARCHAR(6) REFERENCES cadet(xnumber) ON UPDATE CASCADE
        );`
    
    let res1 = await client.query(createCadet);
    let res2 = await client.query(createTraining);
    let res3 = await client.query(createCadetTasked);
    return [res1,res2,res3]
}

// Register with middle initial
export function register(client, xn, email, pass, fn, ln, mi) {
    register = `
        CALL register(
            ${xn}, ${email}, ${pass}, ${fn}, ${ln}, ${mi}
        );`
    
    let res = await client.query(query);
    return res;
}

// Register without middle initial
export function register(client, xn, email, pass, fn, ln) {
    register = `
    CALL register(
        ${xn}, ${email}, ${pass}, ${fn}, ${ln}
    );`

    let res = await client.query(query);
    return res;
}