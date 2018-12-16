const express = require('express');
const multer = require('multer');
const pgp = require("pg-promise")(/*options*/);
const db = pgp("postgres://awsadmin:oleg12537@proc-img-db.cm7oierctxts.eu-west-2.rds.amazonaws.com:5432/awsadmin");
const bodyParser = require('body-parser');
var session = require('express-session');

var secured = require('./secured');
var router = express.Router();
module.exports = router;

// config express-session
var sess = {
    secret: 'RaNd0mSeСrЕtWоW',
    cookie: {},
    resave: false,
    saveUninitialized: true
};

const app = express();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

if (app.get('env') === 'production') {
    sess.cookie.secure = true; // serve secure cookies, requires https
}

app.use(session(sess));

var dotenv = require('dotenv');
dotenv.config();

// Load Passport
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

// Configure Passport to use Auth0
var strategy = new Auth0Strategy(
    {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL:
            process.env.AUTH0_CALLBACK_URL || 'http://localhost:8080/callback'
    },
    function (accessToken, refreshToken, extraParams, profile, done) {
        // accessToken is the token to call Auth0 API (not needed in the most cases)
        // extraParams.id_token has the JSON Web Token
        // profile has all the information from the user
        let count_req = "SELECT count(public.users.email) AS count FROM users WHERE users.email = $1";
        db.one(count_req, profile._json.email)
            .then(function (data) {
                if (data.count == 0) {
                    let fname = profile._json.given_name;
                    let lname = profile._json.family_name;
                    let email = profile._json.email;
                    db_req = "INSERT INTO users (email, first_name, last_name) VALUES ($1, $2, $3)";
                    db.none(db_req, [email, fname, lname])
                        .then(function () {
                            console.log("New user registered!!");
                        })
                        .catch(function (error) {
                            console.log("ERROR in insert user:", error.code);
                        });
                }
                else {
                    console.log("User already exists");
                }
            })
            .catch(function (error) {
                console.log("ERROR in getting user:", error.code);
            });
        return done(null, profile);
    }
);

passport.use(strategy);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});



app.get('/login', passport.authenticate('auth0', {
    scope: 'openid email profile'
}), function (req, res) {
    console.log("In login func");
    res.redirect('/file_upload');
});

app.get('/callback', function (req, res, next) {
    passport.authenticate('auth0', function (err, user, info) {
        console.log("In callback func");

        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }
        req.logIn(user, function (err) {
            if (err) { return next(err); }
            const returnTo = req.session.returnTo;
            delete req.session.returnTo;
            res.redirect(returnTo || '/file_upload');
        });
    })(req, res, next);
});

app.get('/logout',(req,res)=>{
    req.logout();
    res.redirect('/login')
});


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

app.get('/file_upload', secured(), (req, res) => {
    res.sendFile(__dirname + '/client/html/file_upload.html');
});


const upload = multer({storage: storage});


app.post('/upload', upload.single('file-to-upload'), (req, res) => {
    console.log("Upload called");
    res.send("FILE UPLOADED!");
});

app.get('/getFilters', (req, res) => {
    db.multi("SELECT * FROM filters_list")
        .then(function (data) {
            res.send(data[0]);
        })
        .catch(function (error) {
            console.log("ERROR:", error);
        });
});

app.get('/getName', (req, res) => {
    res.send(req.user._json.given_name + " " + req.user._json.family_name);
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