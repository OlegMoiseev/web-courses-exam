const express = require('express');
const multer = require('multer');
const pgp = require("pg-promise")(/*options*/);
const db = pgp("postgres://awsadmin:oleg12537@proc-img-db.cm7oierctxts.eu-west-2.rds.amazonaws.com:5432/awsadmin");
var bodyParser = require('body-parser');
var session = require('express-session');


const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './uploads')
    }, // this saves your file into a directory called "uploads"
    filename: function (req, file, callback) {
        callback(null, file.originalname)
    }
});

const app = express();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 120000 }, resave: false, saveUninitialized: false}));




app.get('/', (req, res, next) => {
    if (req.session.username) {
        res.sendFile(__dirname + '/main.html');
    } else {
        console.log("Go to login page");

        res.sendFile(__dirname + '/login.html');
    }
});


app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/main.html');
// });

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

const upload = multer({storage : storage});

app.post('/', upload.single('file-to-upload'), (req, res) => {
    console.log(req.file.originalname);
    res.redirect('/');
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

app.post("/register", function (request, response) {
    user = request.body;

    // TODO: replace it, but I haven't enough time for it
    db_req = "INSERT INTO users (nickname, first_name, last_name, password) VALUES ('" +
        user.nick + "', '" +
        user.first_name + "', '" +
        user.last_name + "', '" +
        user.password + "')";

    db.none(db_req)
        .then(function () {
            console.log("ALL OK!");
            response.send('OK');
        })
        .catch(function (error) {
            console.log("ERROR:", error.code);
            console.log("ERROR details:", error.detail);

            if (error.code == 23505){
                response.send("Nickname already exists!");
            }
        });
    // response.redirect('/login');

});

app.post("/login", (request, response) => {
    user = request.body;

    // TODO: replace it, but I haven't enough time for it
    db_req = "SELECT users.password FROM users WHERE users.nickname = '" +
             user.nick + "'";

    db.one(db_req)
        .then(function (data) {
            console.log("Nick exists! Checking...");
            if (data.password == user.password) {
                console.log("OK! Redirecting now");
                request.session.username = user.nick;
                response.send('OK');
            } else {
                response.send("Password is wrong!!!");
            }

        })
        .catch(function (error) {
            console.log("ERROR:", error.code);

            if (error.code == 0){
                response.send("Nickname does not exists!");
            }
        });
});


app.listen(8081, () => console.log('Server UP!'));