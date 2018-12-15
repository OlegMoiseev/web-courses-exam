module.exports = function () {
    return function secured (req, res, next) {
        console.log("In sec func");
        if (req.user) { return next(); }
        req.session.returnTo = req.originalUrl;
        res.redirect('/login');
    };
};