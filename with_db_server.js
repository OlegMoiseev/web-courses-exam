const express = require('express');
const multer = require('multer');
const pgp = require("pg-promise")(/*options*/);
const db = pgp("postgres://awsadmin:oleg12537@proc-img-db.cm7oierctxts.eu-west-2.rds.amazonaws.com:5432/awsadmin");
const bodyParser = require('body-parser');
const session = require('express-session');

let curImg = "";
let userId = 7;
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './uploads')
    },
    filename: function (req, file, callback) {
        let d = new Date();
        curImg = req.session.username + '-' + d.getMilliseconds() + '-' + file.originalname;
        // curImg = req.session.username + '-' + file.originalname;

        let db_req = "SELECT users.id FROM users WHERE users.nickname = $1";
        db.one(db_req, req.session.username)
            .then(function (data) {
                userId = data.id;
            })
            .catch(function (error) {
                console.log("ERROR:", error.code);
            });

        let addrCurImg = "./uploads/" + curImg;
        db_req = "INSERT INTO raw_images (id_creator, link) VALUES ($1, $2)";

        db.none(db_req, [userId, addrCurImg])
            .then(function () {

            })
            .catch(function (error) {
                console.log("ERROR:", error.code);
                console.log("ERROR details:", error.detail);
            });
        callback(null, curImg)
    }
});

const app = express();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

app.use(session({secret: 'keyboard cat', resave: false, saveUninitialized: false}));

// , cookie: { maxAge: 120000 }


app.get('/', (req, res) => {
    if (req.session.username) {
        res.sendFile(__dirname + '/client/html/main.html');
    } else {
        console.log("Go to login page");

        res.sendFile(__dirname + '/client/html/login.html');
    }
});

app.get('/file_upload', (req, res) => {
    res.sendFile(__dirname + '/client/html/file_upload.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/client/html/register.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/client/html/login.html');
});

const upload = multer({storage: storage});

app.post('/', upload.single('file-to-upload'), (req, res) => {
    console.log(req.file.originalname);
    res.redirect('/');
});

app.post('/upload', upload.single('file-to-upload'), (req, res) => {
    console.log("Upload called");
    console.log(req.file.originalname);
    console.log(req.body);
    res.send("FILE UPLOADED!");
});

app.get('/getFilters', (req, res) => {
    db.multi("SELECT * FROM filters_list")
        .then(function (data) {
            console.log("getFilters called!");
            res.send(data[0]);
        })
        .catch(function (error) {
            console.log("ERROR:", error);
        });
});

app.get('/getName', (req, res) => {
    res.send("Username: " + req.session.username);
});

app.post("/register", function (request, response) {
    user = request.body;


    db_req = "INSERT INTO users (nickname, first_name, last_name, password) VALUES ($1, $2, $3, $4)";
    db.none(db_req, [user.nick, user.first_name, user.last_name, user.password])
        .then(function () {
            console.log("ALL OK!");
            response.send('OK');
        })
        .catch(function (error) {
            console.log("ERROR:", error.code);
            console.log("ERROR details:", error.detail);

            if (error.code === 23505) {
                response.send("Nickname already exists!");
            }
        });

});

app.post("/login", (request, response) => {
    user = request.body;

    db_req = "SELECT users.password FROM users WHERE users.nickname = $1";

    db.one(db_req, user.nick)
        .then(function (data) {
            console.log("Nick exists! Checking...");
            if (data.password === user.password) {
                console.log("OK! Redirecting now");
                request.session.username = user.nick;
                response.send('OK');
            } else {
                response.send("Password is wrong!!!");
            }

        })
        .catch(function (error) {
            console.log("ERROR:", error.code);

            if (error.code === 0) {
                response.send("Nickname does not exists!");
            }
        });
});

let params = [];
app.post("/addImage", (request, response) => {
    params = request.body;

    let idRaw = 0;
    console.log(userId);
    db_req = "SELECT raw_images.id FROM raw_images WHERE raw_images.id_creator = $1";
    db.one(db_req, userId)
        .then(function (data) {

            idRaw = data.id;
            console.log(idRaw);

        })
        .catch(function (error) {
            console.log("ERROR into addImg select:", error.code);
        });


    let addrCurImg = "./uploads/" + curImg;
    let db_req = "INSERT INTO processed_images (id_raw_image, link) VALUES ($1, $2)";

    db.none(db_req, [idRaw, addrCurImg]).catch(function (error) {
        console.log("ERROR in addImg insert:", error.code);
    });


    let r = [];
    for (let i = 0; i < params.length; ++i) {
        db_req = "INSERT INTO filters_applied (id_filter, id_processed_img, serial_number, parameters) VALUES ($1, $2, $3, $4)";
        r.push(db_req, [params[i].id, curImg, i, params[i].parameters]);
    }
    db.none("BEGIN").catch(function (error) {
        console.log("ERROR in start trans:", error.code);
    });
    for (let i = 0; i < r.length; ++i) {
        db.none(r[i]).catch(function (error) {
            console.log("ERROR into trans:", error.code);
            db.none("ROLLBACK").catch(function (error) {
                console.log("ERROR in start trans:", error.code);
            });
        });
    }
    db.none("COMMIT").catch(function (error) {
        console.log("ERROR in end trans:", error.code);
    });

});


app.listen(8080, () => console.log('Server UP!'));