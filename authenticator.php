<?php

/**
 * Plugin Name: WordPress Node.js authenticator.
 * Description: Making user registration and login by node.js . You must put this file in the root of a WordPress website.
 * Plugin URI: https://github.com/haghighi251/
 * Author: Amir Haghighi
 * Version: 1.0.0
 * Author URI: haghighi251@gmail.com
 * Requires PHP at least: 5.4
 * Requires PHP: 7.3.12
 * Text Domain: scc
 *
 * @package scc
 * @category Core
 *
 */

/**
 * Setting headers and PHP error configurations. 
 * According to we have to return JSON data as an API result to node.js application, 
 * We shouldn't have any headers or warning. So we need to reject them by the codes below.
 */
header('Access-Control-Allow-Origin: *');
ini_set('log_errors', 'On');
ini_set('display_errors', 'Off');
ini_set('error_reporting', E_ALL);
define('WP_DEBUG', false);
define('WP_DEBUG_LOG', FALSE);
define('WP_DEBUG_DISPLAY', FALSE);

// This file will be used to have permission to use some WP features.
require_once 'wp-load.php';

/**
 * application class has some methods. these methods will be executed by Node.js requests.
 * These methods could be called by any other programing languages.
 * All data should be sent by POST request. 
 * For calling each method we have a POST variable witch name is request.
 */
class application {

    /**
     * 
     * @return type
     */
    public function register() {
        $post = filter_input_array(INPUT_POST);

        // Keeps errors as array and returns it to node.js RQ.
        $errors = [];

        /**
         * Default is null.
         * User id if the new user will add.
         * WP error if there is a problem with adding user information to DB by WP.
         */
        $user_id;

        // Validating data.
        if (!filter_var($post['email'], FILTER_VALIDATE_EMAIL)) {
            array_push($errors, "Invalid email format.");
        } else {
            // return WP_User object otherwise return false if not found 
            if (get_user_by('email', $post['email'])) {
                array_push($errors, 'E-mail already in use.');
            }
        }

        if (get_user_by('user_login', $post['user_login'])) {
            array_push($errors, 'User name already in use.');
        }
        if (strlen($post['password']) < 6) {
            array_push($errors, 'Password should be at least 6 chars long.');
        }
        if (strlen($post['full_name']) < 6) {
            array_push($errors, 'Full name should be at least 6 chars long.');
        }
        if (strlen($post['user_login']) < 3) {
            array_push($errors, 'Full name should be at least 3 chars long.');
        }

        // count($errors) == 0 means there is no error.
        if (count($errors) == 0) {
            //Register New User
            $user_id = wp_insert_user(array(
                'user_pass' => $post['password'],
                'user_login' => $post['user_login'],
                'user_email' => $post['email'],
                'user_nicename' => $post['full_name'],
                'display_name' => $post['user_login'],
            ));
            if (is_wp_error($user_id)) {
                //There is an error. This is WP error object.
                array_push($errors, $user_id->get_error_message());
            }
        }

        // Returning JSON data to node.js request.
        return die(json_encode(array(
            'success' => count($errors) ? false : true,
            'errors' => $errors,
            'user_id' => $user_id,
        )));
    }

    public function login() {
        $post = filter_input_array(INPUT_POST);
        
        // Keeps errors as array and returns it to node.js RQ.
        $errors = [];
        
        /**
         * Default is null.
         * User id if everything will be right.
         * WP error if there is a problem with the user login process in WP.
         */
        $user_id;
        
        // User name of the user in WP. default value is null.
        $user_name;
        
        if (strlen($post['password']) < 6) {
            array_push($errors, 'Password should be at least 6 chars long.');
        }
        if (!filter_var($post['email'], FILTER_VALIDATE_EMAIL)) {
            array_push($errors, "Invalid email format.");
        } else {
            // return WP_User object otherwise return false if not found. 
            if (!get_user_by('email', $post['email'])) {
                array_push($errors, 'E-mail not found.');
            }
        }
        if (count($errors) == 0) {
            // Login information
            $creds = array(
                'user_login' => $post['email'],
                'user_password' => $post['password'],
                'remember' => $post['remember']
            );
            $user = wp_signon($creds, true);
            if (is_wp_error($user)) {
                //There is an error. This is WP error object.
                array_push($errors, $user->get_error_message());
            } else {
                // Getting user information here.
                $user_id = $user->ID;
                $user_name = $user->display_name;
            }
        }

        // Returning JSON data to node.js request.
        return die(json_encode(array(
            'success' => count($errors) ? false : true,
            'errors' => $errors,
            'user_id' => $user_id,
            'user_name' => $user_name,
        )));
    }

}

$post = filter_input_array(INPUT_POST);

// Making an instance from the application class and then calling the right method.
$app = new application();
call_user_func(array($app, $post['request']));
