const express = require('express');
const multer = require('multer');
const pgp = require("pg-promise")(/*options*/);
const db = pgp("postgres://awsadmin:oleg12537@proc-img-db.cm7oierctxts.eu-west-2.rds.amazonaws.com:5432/awsadmin");
const bodyParser = require('body-parser');
var session = require('express-session');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const cv = require('opencv');
var fs = require('fs');
var cors = require('cors');


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

app.use(cors());

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

if (app.get('env') === 'production') {
    sess.cookie.secure = true; // serve secure cookies, requires https
}

app.use(session(sess));

var dotenv = require('dotenv');
dotenv.config();

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
                    db_req = "INSERT INTO users (email, first_name, last_name) VALUES ($1, $2, $3) RETURNING id";
                    db.one(db_req, [email, fname, lname])
                        .then(function (user) {
                            db_req = "INSERT INTO current_work (id_user) VALUES ($1)";
                            db.none(db_req, user.id)
                                .then(function () {
                                    console.log("New user registered!!");
                                })
                                .catch(function (error) {
                                    console.log("ERROR in insert user into work:", error.code);
                                });
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


// Load Passport
var passport = require('passport');
passport.use(strategy);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

aws.config.update({
    region: 'eu-west-2'
});

var s3 = new aws.S3();

const params = {
    s3: s3,
    bucket: 'images-proc-app/raw',
    acl: 'public-read',
    key: function (req, file, callback) {
        let d = new Date();
        let curImg = req.user._json.email + '-' + d.getMilliseconds() + '-' + file.originalname;

        let db_req = "SELECT users.id FROM users WHERE users.email = $1";
        db.one(db_req, req.user._json.email)
            .then(function (user) {
                // let addrCurImg = "https://s3.eu-west-2.amazonaws.com/images-proc-app/" + curImg;
                let addrCurImg = curImg;

                db_req = "INSERT INTO raw_images (id_creator, link) VALUES ($1, $2) RETURNING id";
                db.one(db_req, [user.id, addrCurImg])
                    .then(function (image) {
                        db_req = "UPDATE current_work SET id_raw_img = $1 WHERE id_user = $2";
                        db.none(db_req, [image.id, user.id])
                            .catch(function (error) {
                                console.log("ERROR in insert into current_work:", error.code);
                            });
                    })
                    .catch(function (error) {
                        console.log("ERROR in adding raw img in db:", error.code);
                    });
                callback(null, curImg)
            })
            .catch(function (error) {
                console.log("ERROR in getting user id:", error.code);
            });
    }
};

const storage = multerS3(params);

const upload = multer({storage: storage});

app.get('/login', passport.authenticate('auth0', {
    scope: 'openid email profile'
}), function (req, res) {
    console.log("In login func");
    res.redirect('/file_upload');
});

app.get('/callback', function (req, res, next) {
    passport.authenticate('auth0', function (err, user, info) {
        console.log("In callback func");

        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/login');
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            const returnTo = req.session.returnTo;
            delete req.session.returnTo;
            res.redirect(returnTo || '/file_upload');
        });
    })(req, res, next);
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login')
});

app.get('/file_upload', secured(), (req, res) => {
    res.sendFile(__dirname + '/client/html/file_upload.html');
});

app.get('/profile', secured(), (req, res) => {
    res.sendFile(__dirname + '/client/html/profile.html');
});

app.post('/upload', upload.single('file-to-upload'), (req, res) => {
    console.log("Upload called");
    res.send("Uploaded");
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

app.get('/deleteImage', (req, res) => {
    deleteImage(req, res);
});

app.get('/getInfo', (req, res) => {
    console.log("In getInfo");
    let db_req = "SELECT users.id FROM users WHERE users.email = $1";
    db.one(db_req, req.user._json.email)
        .then(function (user) {
            db_req = "SELECT processed_images.id, raw_images.link, filters_list.name, filters_applied.parameters " +
                "FROM raw_images, filters_applied, processed_images, filters_list " +
                "WHERE raw_images.id_creator = $1 AND " +
                "processed_images.id_raw_image = raw_images.id AND " +
                "filters_applied.id_processed_img = processed_images.id AND " +
                "filters_applied.id_filter = filters_list.id";
            db.any(db_req, user.id)
                .then(function (images) {

                    res.send(images);
                })
                .catch(function (error) {
                    console.log("ERROR in getting raw_images (info):", error.code);
                });
        })
        .catch(function (error) {
            console.log("ERROR in getting user id (info):", error.code);
        });
});

app.post("/addImage", (req, res) => {

    let filters = req.body;


    let db_req = "SELECT users.id FROM users WHERE users.email = $1";
    db.one(db_req, req.user._json.email)
        .then(function (user) {
            db_req = "SELECT current_work.id_raw_img FROM current_work WHERE current_work.id_user = $1";
            db.one(db_req, user.id)
                .then(function (raw_img) {
                    db_req = "SELECT raw_images.link FROM raw_images WHERE raw_images.id = $1";
                    db.one(db_req, raw_img.id_raw_img)
                        .then(function (data) {
                            processImage(data.link, filters, req, res);

                        })
                        .catch(function (error) {
                            console.log("ERROR in getting raw_img link:", error.code);
                        });
                })
                .catch(function (error) {
                    console.log("ERROR in getting raw_img id:", error.code);
                });
        });
});

function processImage(name, filters, req, res) {
    console.log("We will work with image:");
    console.log(name);

    var params = {
        Bucket: "images-proc-app/raw",
        Key: name
    };
    s3.getObject(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        }
        else {
            cv.readImage(data.Body, function (err, img) {
                if (err) {
                    throw err;
                }

                const width = img.width();
                const height = img.height();

                if (width < 1 || height < 1) {
                    throw new Error('Image has no size');
                }

                let db_req = "SELECT users.id FROM users WHERE users.email = $1";
                db.one(db_req, req.user._json.email)
                    .then(function (user) {
                        db_req = "SELECT current_work.id_raw_img FROM current_work WHERE current_work.id_user = $1";
                        db.one(db_req, user.id)
                            .then(function (raw_img) {
                                db_req = "INSERT INTO processed_images (id_raw_image, link) VALUES ($1, $2) RETURNING id";
                                db.one(db_req, [raw_img.id_raw_img, name])
                                    .then(function (proc_img) {
                                        for (let i = 0; i < filters.length; ++i) {
                                            if (filters[i].name == "Gaussian blur") { // only odd numbers!!!
                                                if (filters[i].parameters.length != 2) {
                                                    filters[i].parameters[0] = 11;
                                                    filters[i].parameters[1] = 11;
                                                }
                                                img.gaussianBlur([getOdd(filters[i].parameters[0]), getOdd(filters[i].parameters[1])]);
                                            }

                                            if (filters[i].name == "To Grayscale") {
                                                img.convertGrayscale();
                                            }

                                            if (filters[i].name == "Crop") {
                                                if (filters[i].parameters.length != 4){
                                                    filters[i].parameters[0] = 100;
                                                    filters[i].parameters[1] = 100;
                                                    filters[i].parameters[2] = 100;
                                                    filters[i].parameters[3] = 100;

                                                }
                                                let croppedImg = img.crop(Number(filters[i].parameters[0]),
                                                    Number(filters[i].parameters[1]),
                                                    Number(filters[i].parameters[2]),
                                                    Number(filters[i].parameters[3]));
                                            }

                                            if (filters[i].name == "Dilate") {
                                                if (filters[i].parameters.length != 4){
                                                    filters[i].parameters[0] = 1;
                                                }
                                                img.dilate(Number(filters[i].parameters[0]));
                                            }

                                            if (filters[i].name == "Erode") {
                                                if (filters[i].parameters.length != 4){
                                                    filters[i].parameters[0] = 1;
                                                }
                                                img.erode(Number(filters[i].parameters[0]));
                                            }

                                            if (filters[i].name == "Find contours") {
                                                img.findContours();
                                            }

                                            if (filters[i].name == "Rotate") {
                                                console.log()
                                                if (filters[i].parameters.length != 1){
                                                    filters[i].parameters[0] = 0;
                                                }
                                                img.rotate(Number(filters[i].parameters[0]));
                                            }

                                            db_req = createReq(filters[i].parameters);
                                            db.none(db_req, [getFilterId(filters[i].name), proc_img.id, i])
                                                .catch(function (error) {
                                                    console.log("ERROR in insert filter " + i + ": ", error.code);
                                                });
                                        }


                                        img.save('./results/' + name);

                                        var contents = fs.readFileSync('./results/' + name);

                                        var params = {
                                            Bucket: "images-proc-app/processed",
                                            Key: name,
                                            acl: 'public-read',
                                            Body: contents
                                        };
                                        s3.upload(params, function (err, data) {
                                            if (err) {
                                                console.log("Error in finish upload to S3: " + err);
                                            }
                                            fs.unlinkSync('./results/' + name);
                                            console.log('Success upload processed image!');
                                            name.replace('@', '%40');
                                            res.send(name);
                                        });


                                    })
                                    .catch(function (error) {
                                        console.log("ERROR in insert proc_img link:", error.code);
                                    });
                            })
                            .catch(function (error) {
                                console.log("ERROR in getting raw_img id (2):", error.code);
                            });
                    })
                    .catch(function (error) {
                        console.log("ERROR in getting user id (2):", error.code);
                    });
            });
        }
    });
}

function deleteImage(req, res) {
    let db_req = "SELECT users.id FROM users WHERE users.email = $1";
    console.log("email ", req.user._json.email);

    db.one(db_req, req.user._json.email)
        .then(function (user) {
            db_req = "SELECT current_work.id_raw_img FROM current_work WHERE current_work.id_user = $1";
            db.one(db_req, user.id)
                .then(function (raw_img) {
                    db_req = "SELECT processed_images.id FROM processed_images WHERE processed_images.id_raw_image = $1";
                    db.one(db_req, raw_img.id_raw_img)
                        .then(function (proc_img) {
                            db_req = "DELETE FROM filters_applied WHERE filters_applied.id_processed_img = $1;";
                            db.none(db_req, proc_img.id)
                                .then(function () {
                                    db_req = "DELETE FROM processed_images WHERE processed_images.id = $1;";
                                    db.none(db_req, proc_img.id)
                                        .then(function () {
                                            res.send("Deleted");
                                        })
                                        .catch(function (error) {
                                            console.log("ERROR in deleting proc img:", error.code);
                                        });
                                })
                                .catch(function (error) {
                                    console.log("ERROR in deleting applied filters:", error.code);
                                });
                        })
                        .catch(function (error) {
                            console.log("ERROR in getting proc_img id (3):", error.code);
                        });
                })
                .catch(function (error) {
                    console.log("ERROR in getting raw_img id (3):", error.code);
                });
        })
        .catch(function (error) {
            console.log("ERROR in getting user id (3):", error.code);
        });

}

function createReq(arr) {
    return "INSERT INTO filters_applied (id_filter, id_processed_img, serial_number, parameters) VALUES" +
        "($1, $2, $3, '" + getParameters(arr) + "')";
}

function getFilterId(name) {
    switch (name) {
        case "Gaussian blur":
            return 1;
        case "Median blur":
            return 2;
        case "Bilateral blur":
            return 3;
        case "To Grayscale":
            return 4;
        case "Resize":
            return 5;
        case "Crop":
            return 6;
        case "Rotate":
            return 7;
        case "Flip":
            return 8;
        case "Find contours":
            return 9;
        case "Erode":
            return 10;
        case "Dilate":
            return 11;
        case "Sobel operator":
            return 12;
    }
}

function getParameters(par) {
    let ret = "{";
    for (let i = 0; i < par.length; ++i) {
        ret += par[i] + ", "
    }
    if (ret.length > 1) ret = ret.substring(0, ret.length - 2);  // delete "space" and "comma"
    ret += '}';
    return ret;
}

function getOdd(num) {
    return Math.floor(Number(num) / 2) * 2 + 1;
}

function getFile(name) {
    var params = {
        Bucket: "images-proc-app",
        acl: 'public-read',
        Key: name
    };
    s3.getObject(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        }
        else {
            cv.readImage(data.Body, function (err, img) {
                if (err) {
                    throw err;
                }

                const width = img.width();
                const height = img.height();

                if (width < 1 || height < 1) {
                    throw new Error('Image has no size');
                }
                console.log('Return will be call');
            });
        }
    });
}

app.listen(8080, () => console.log('Server UP!'));