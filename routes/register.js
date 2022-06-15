// Modules.
var express = require('express');
const {body, validationResult} = require('express-validator');
const querystring = require('querystring');
const request = require('request');

// Loading application configuration.
const configs = require('../configs.js').settings;

var router = express.Router();

// Showing registration form by GET request.
router.get('/register', function (req, res) {
    // If we had a user session, We must redirect to the home route.
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.render('register', {
            title: 'Register',
            errors: null,
            show_error: "",
            registered_done: ""
        });
    }
});

// This route will be executed after submitting the registration form.
router.post(
        '/register',
        //We have to validate datas.
        // checking email format.
        body('email').isEmail().withMessage('The email is not correct.'),
        // Full name must be 6 characters.        
        body('full_name').isLength({min: 6}).withMessage('Must be at least 6 chars long.'),
        // UserName must be 6 characters.   
        body('user_name').isLength({min: 3}).withMessage('Must be at least 3 chars long.'),
        // password must be at least 6 chars long
        body('password').isLength({min: 6}).withMessage('Must be at least 6 chars long.'),
        (req, res) => {
            
    // If we had errors on the past validation, the errors variable keeps them showing.
    const errors = validationResult(req);

    // error_message is used for database connection errors and wrong login information.
    var error_message = [];

    // After adding a new user, This variable will be true and on the view, a Success message will be shown.
    var registered_done = false;

    // Each user has a unique_id field that is numeric.
    var unique_id = "";

    if (errors.isEmpty()) {
        // We are free to proceed to register a new user.
        let params = {
            request: 'register',
            email: req.body.email,
            user_login: req.body.user_name,
            full_name: req.body.full_name,
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
                registered_done = true;
            }
            res.render('register', {
                title: 'Register',
                errors: error_message,
                show_error: error_message.length ? true : "",
                registered_done: registered_done ? true : ""
            });
        });
    } else {
        // There is error in validating data by Node.js.
        res.render('register', {
            title: 'Register',
            errors: errors.array(),
            show_error: errors.array().length ? true : "",
            registered_done: registered_done ? true : "",
            unique_id: unique_id
        });
    }
});

module.exports = router;
