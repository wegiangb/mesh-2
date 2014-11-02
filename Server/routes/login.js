'use strict';

var User = require('../models/user');
var Boom = require('boom');
var Joi = require('joi');
var jwt = require('jsonwebtoken');
var redis = require('redis');
var client = redis.createClient();

var privateKey = 'Kitties';

module.exports = function (server) {

    var validate = function (rToken, decodedToken, callback) {
        console.log(rToken);
        console.log(decodedToken);

        if (decodedToken) {
            console.log(decodedToken.username.toString());
        }

        client.get(decodedToken.username, function (err, tok) {
            if (err) return callback(null, false);
            if (!tok) {
                return callback(null, false);
            } else if (tok == rToken) {
                return callback(null, true, decodedToken);
            } else {
                return callback(null, false);
            }
        });
    };

    server.pack.register(require('hapi-auth-jsonwebtoken'), function (err) {

        server.auth.strategy('token', 'jwt', {key: privateKey, validateFunc: validate});

        server.route({
            method: 'GET',
            path: '/tokenRequired',
            config: {auth: 'token'},
            handler: function (request, reply) {
                var replyObj = {
                    text: 'I am a JSON response, and you needed a token to get me.',
                    credentials: request.auth.credentials
                };
                reply(replyObj);
            }
        });

        server.route({
            method: 'GET',
            path: '/noTokenRequired',
            config: {auth: false},
            handler: function (request, reply) {
                var replyObj = { text: 'I am JSON response, but you did not need a token to get me' };
                reply(replyObj);
            }
        });

    });

    server.route({
        method: 'POST',
        path: '/login',
        config: {
            auth: false,
            validate: {
                payload: {
                    username: Joi.string().required(),
                    password: Joi.string().required()
                }
            }
        },
        handler: function (request, reply) {
            var user = request.payload.username;
            var password = request.payload.password;

            User.getByUsername(user).then(function (userData) {
                if (userData[0]) {
                    userData = userData[0].user;
                    console.log(userData);
                    var insertedPasswordHash = User.generatePasswordHash(user, password);
                    console.log(insertedPasswordHash);
                    if (userData.passwordHash && insertedPasswordHash.toLowerCase() == userData.passwordHash.toLowerCase()) {
                        client.get(user, function (err, tok) {
                            if (err) return reply(Boom.badImplementation(err));

                            if (tok) {
                                return reply({token: tok});
                            } else {
                                var token = jwt.sign({username: user}, privateKey);
                                client.set(user, token);
                                return reply({token: token});
                            }
                        });
                    } else {
                        reply(Boom.badRequest('Invalid password'));
                    }
                } else {
                    reply(Boom.badRequest('Invalid username'));
                }
            });
        }
    });
};