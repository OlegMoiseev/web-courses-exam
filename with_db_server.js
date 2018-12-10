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

var upload = multer({storage : storage});

app.post('/', upload.single('file-to-upload'), (req, res) => {
    console.log(req.file.originalname);
    res.redirect('/');
});


app.listen(8080, () => console.log('Server UP!'));