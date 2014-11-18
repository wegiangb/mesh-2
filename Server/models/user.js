var Promise = require('bluebird');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(
        process.env['NEO4J_URL'] ||
        process.env['GRAPHENEDB_URL'] ||
        'http://localhost:7474'
);
var crypto = require('crypto');
var user = {};

/**
 *
 * Returns a user by it's name
 * @param username string identifier of the user
 * @returns {Promise} Returns a promise with the resolved user, rejects to error otherwise
 *
 */
user.getByUsername = function (username) {
    return new Promise ( function (resolve, reject) {
        var query = [
            'MATCH (u: User{username: { username }})',
            'RETURN { username: u.username, passwordHash: u.passwordHash, name: u.name, avatar: u.avatar, email: u.email } as user'
        ].join('\n');

        var params = {
            username: username
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);

            if (results.length >= 0)
                return resolve(results);
            else
                return reject('No users were found');
        });
    });
};

/**
 * Returns a user by it's email
 * @param {String} email String email identifier of the user
 * @returns {Promise} Returns a promise with the resolved user, rejects to error otherwie
 */
user.getByEmail = function (email) {
    return new Promise ( function (resolve, reject) {
        var query = [
            'MATCH (u:User {email: {email}})',
            'RETURN { username: u.username, passwordHash: u.passwordHash, name: u.name, avatar: u.avatar, email: u.email } as user '
        ];

        var params = {
            email: email
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);

            if (results.length >= 0)
                return resolve(results);
            else
                return reject('No user was found');
        });
    });
};

/**
 * Creates a user based on the registerInfo
 * @param {Object} registerInfo Info to be inserted as the user's information
 * @returns {Promise} Returns a promise with the resolved user, rejects to error otherwise
 */
user.create = function (registerInfo) {
    return new Promise(function (resolve, reject) {
        var query = [
            'MERGE (u: User{firstName: { firstName }, lastName: { lastName }, username: { username }, email: { email }, passwordHash: { passwordHash }, birthdate: { birthdate }, country: { country }})'
        ].join('\n');

        var params = {
            firstName: registerInfo.firstName,
            lastName: registerInfo.lastName,
            username: registerInfo.username,
            email: registerInfo.email,
            passwordHash: user.generatePasswordHash(registerInfo.username, registerInfo.password),
            birthdate: registerInfo.birthdate,
            country: registerInfo.country
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);

            if (results.length >= 0)
                return resolve(results);
            else
                return reject('No user was found');
};

/**
 *
 * Adds a model to a user's favourites
 * @param username string identifier of the user
 * @param modelId identifier of the model
 * @returns {Promise} Returns a promise with the resolved user, rejects to error otherwise
 *
 */
user.addFavouriteModel = function (username, modelId) {
    return new Promise ( function (resolve, reject) {
        var query = [
            'MATCH (u:User {username: {username}}), (m:Model {id: {id}})',
            'MERGE (u)-[f:FAVOURITED]->(m)',
            'RETURN f'
        ].join('\n');

        var params = {
            username: username,
            id: modelId
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);
            return resolve(results[0]);
        });
    });
};

/**
 *
 * Removes a model from a user's favourites
 * @param username string identifier of the user
 * @param modelId identifier of the model
 * @returns {Promise} Returns a promise which resolves to true, rejects to error otherwise
 *
 */
user.removeFavouriteModel = function (username, modelId) {
    return new Promise ( function (resolve, reject) {
        var query = [
            'MATCH (User {username: {username}})-[f:FAVOURITED]->(Model {id: {id}})',
            'DELETE f'
        ].join('\n');

        var params = {
            username: username,
            id: modelId
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);
            return resolve(true); //todo (possibly) return something based on whether the match worked or not
        });
    });
};

/**
 *
 * Adds a user to another user's followers
 * @param follower string identifier of the user that wants to follow another user
 * @param followed string identifier of the user being followed
 * @returns {Promise} Returns a promise with the resolved user, rejects to error otherwise
 *
 */
user.followUser = function (follower, followed) {
    return new Promise ( function (resolve, reject) {
        var query = [
            'MATCH (u:User {username: {follower}}), (u2:User {username: {followed}})',
            'MERGE (u)-[f:FOLLOWING]->(u2)',
            'RETURN f'
        ].join('\n');

        var params = {
            follower: follower,
            followed: followed
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);
            return resolve(results[0]);
        });
    });
};

/**
 *
 * Adds a user to another user's followers
 * @param follower string identifier of the user that wants to follow another user
 * @param followed string identifier of the user being followed
 * @returns {Promise} Returns a promise which resolves to true, rejects to error otherwise
 *
 */
user.unfollowUser = function (follower, followed) {
    return new Promise ( function (resolve, reject) {
        var query = [
            'MATCH (User {username: {follower}})-[f:FOLLOWING]->(User {username: {followed}})',
            'DELETE f'
        ].join('\n');

        var params = {
            follower: follower,
            followed: followed
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);
            return resolve(true); //todo (possibly) return something based on whether the match worked or not
        });
    });
};

/**
 * Generates a passwordhash from a username and password
 * @param {String} username
 * @param {String} password
 * @returns {String} Hash of the username and password
 */
user.generatePasswordHash = function (username, password) {
    var hash = crypto.createHash('sha256');
    hash.update(username + '+' + password);
    return hash.digest('hex');
};

module.exports = user;
