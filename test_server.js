const express = require('express');
const multer = require('multer');
const cv = require('opencv');


const app = express();

app.use(
    function crossOrigin(req, res, next){
        res.header('Access-Control-Allow-Origin', "*");
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        return next();
    });

var upload = multer({ storage: storage });

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/main.html');
});


// It's very crucial that the file name matches the name attribute in your html
app.post('/', upload.single('file-to-upload'), (req, res) => {
    console.log(req.file.originalname);

    var face_detector = cv.FACE_CASCADE;

    cv.readImage('./uploads/' + req.file.originalname, function (err, im)
    {
        if (im.width() < 1 || im.height() < 1)
        {
            throw new Error('Image has no size');
        }
        im.detectObject(face_detector, {}, function(err, faces)
        {
            for (var i = 0; i < faces.length; i++)
            {
                var face = faces[i];
                im.ellipse(face.x + face.width / 2, face.y + face.height / 2, face.width / 2, face.height / 2, [255, 255, 0], 3);
            }
            im.save('./results/save.jpg');
        });
    });



    res.redirect('/');
});


app.listen(8080, () => console.log('Server UP!'));
























/*
const express = require('express');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './uploads')
    }, // this saves your file into a directory called "uploads"
    filename: function (req, file, callback) {
        callback(null, file.originalname)
    }
});

const app = express();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/main.html');
});

var upload = multer({storage : storage}).single('file-to-upload');

// It's very crucial that the file name matches the name attribute in your html
// app.post('/', upload.single('file-to-upload'), (req, res) => {
//     console.log(req.file.originalname);
//     res.redirect('/');
// });

app.post('/', function (res, req) {
    upload(req, res, function (err) {
        if (err){
            return res.end("Error uploading");
        }
        res.end("File is uploaded");
    });
});

app.listen(8080, () => console.log('Server UP!'));
 */
