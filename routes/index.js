// Modules
var express = require('express');
var session = require('express-session');
var escapeHtml = require('escape-html');
const querystring = require('querystring');
const request = require('request');
const {body, validationResult} = require('express-validator');

// Loading application configuration.
const configs = require('../configs.js').settings;

//var router = express.Router();
var app = express();

// Setting session configuration.
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

// middleware to test if authenticated.
function isAuthenticated(req, res, next) {
    if (req.session.user)
        next();
    else
        next('route');
}

/**
 * Home page. If we don't have user session, It will be redirected to login route.
 */
app.get('/', isAuthenticated, function (req, res) {
    res.render('index', {title: 'Home', user: escapeHtml(req.session.user)});
});

// Login route based on GET request.
app.get('/', function (req, res) {
    res.render('login', {
        title: 'Login',
        errors: null,
        show_error: ""
    });
});

// Login route based on POST request. This route will call after submitting the login form.
app.post('/login',
        // We must check email format is correct and password is at least 6 characters.
        body('email').isEmail().withMessage('The email is not correct.'),
        body('password').isLength({min: 6}).withMessage('Must be at least 6 chars long'),
        (req, res) => {
            
    // If we had errors on the past validation, the errors variable keeps them showing.
    const errors = validationResult(req);
    
    // error_message is used for database connection errors and wrong login information.
    var error_message = [];

    if (errors.isEmpty()) {
        // We are free to proceed login process.
        let params = {
            request: 'login',
            email: req.body.email,
            remember: req.body.remember,
            password: req.body.password
        };
        params = querystring.stringify(params); 
        request.post({
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}, // important to interect with PHP
            url: configs.api_url,
            body: params
        }, function (error, response, body) {
            // body is a JSON response that has been made by PHP.
            console.log(body);
            var data = JSON.parse(body);
            if (data.success === false) {
                for (const err of data.errors) {
                    error_message.push({param: 'WP Error', msg: err});
                }
            } else {
                //Everything is right and now we can make user session.
                return req.session.regenerate(function (err) {
                    if (err)
                        next(err);
                    // Store user information in session.
                    req.session.user = data.user_name;

                    // WordPress user id. you can use it in other parts of your application.
                    req.session.user_id = data.user_id;
                    
                    /**
                     * Notice: We don't make any wordpress user sessions on the wordpress website. 
                     * This is because we just need to have user information in the node.js application 
                     * and for safety reasons, We should let to user will log in on the Wordpress by using a wordpress login form.
                     */

                    // Saving the session before redirecting to home page
                    // Load does not happen before session is saved
                    req.session.save(function (err) {
                        if (err) {
                            console.log(err);
                            return next(err);
                        } else {
                            res.redirect('/');
                        }
                    });
                });
            }
            res.render('login', {
                title: 'Login',
                errors: error_message,
                show_error: error_message.length ? true : ""
            });
        });
    } else {
        // There is error in validating data by Node.js.
        res.render('login', {
            title: 'Login',
            errors: errors.array(),
            show_error: errors.array().length ? true : "",
            registered_done: registered_done ? true : ""
        });
    }
});

// Login route based on GET request. This route will call before submitting the login form.
app.get('/login', function (req, res) {
    if (req.session.user) {
        // If we had a user session, We must redirect to the home route.
        res.redirect('/');
    } else {
        res.render('login', {
            title: 'Login',
            errors: null,
            show_error: ""
        });
    }
});

// Logout route based on GET request. It will be executed after clicking on the logout link.
app.get('/logout', function (req, res, next) {
    // logout logic

    // clear the user from the session object and save.
    // this will ensure that re-using the old session id
    // does not have a logged in user
    req.session.user = null;
    req.session.user_id = null;
    req.session.save(function (err) {
        if (err)
            next(err);
        req.session.regenerate(function (err) {
            if (err)
                next(err);
            res.redirect('/');
        });
    });
});

module.exports = app;
