var Promise = require('bluebird');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(
        process.env['NEO4J_URL'] ||
        process.env['GRAPHENEDB_URL'] ||
        'http://localhost:7474'
);

var model = {};
/**
 *
 * Returns a model by it's identifier
 * @param {Number} id
 *
 */
model.getById = function (id) {
    return new Promise( function (resolve, reject) {
        var query = [
            'MATCH (m:Model{id : {modelId}})<-[:OWNS]-(author)',
            'OPTIONAL MATCH m<-[c:COMMENTED]-(cAuthor)',
            'WITH * ORDER BY c.date DESC LIMIT 10',
            'WITH m, author, extract(c1 IN filter(c1 IN collect({c: c, author: cAuthor}) WHERE c1.c IS NOT NULL) | { date: c1.c.date, content: c1.c.content, author: c1.author.name, avatar: c1.author.avatar }) AS modelComments',
            'OPTIONAL MATCH m-[:TAGGED]->(modelTag:Tag)',
            'WITH m, author, modelComments, collect(modelTag.name) AS modelTags',
            'OPTIONAL MATCH (u:User)-[ru:VOTED {type: "UP"}]->m',
            'WITH m, author, modelComments, modelTags, count(ru) as modelUpvotes',
            'OPTIONAL MATCH (u:User)-[rd:VOTED {type: "DOWN"}]->m',
            'WITH m, author, modelComments, modelTags, modelUpvotes, count(rd) as modelDownvotes',
            'RETURN { name: m.name, description: m.description, files: m.files, downvotes: modelDownvotes, upvotes: modelUpvotes, publicationDate: m.publicationDate, visibility: m.visibility, tags: modelTags, author: { name: author.name, avatar: author.avatar, about: author.about }, comments:  modelComments, tags: modelTags} AS model'
        ].join('\n');

        var params = {
            modelId: Number(id)
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);
            return resolve(results);
        });
    });
};

/**
 *
 * Returns a model by it's name
 * @param name
 * @returns {Promise} Returns a promise with the resolved model, rejects to error otherwise
 *
 */
model.getByName = function (name) {
    return new Promise ( function (resolve, reject) {
        var query = [
            'MATCH (m:Model{name : {modelName}})<-[:OWNS]-(author)',
            'OPTIONAL MATCH m<-[c:COMMENTED]-(cAuthor)',
            'WITH * ORDER BY c.date DESC LIMIT 10',
            'WITH m, author, extract(c1 IN filter(c1 IN collect({c: c, author: cAuthor}) WHERE c1.c IS NOT NULL) | { date: c1.c.date, content: c1.c.content, author: c1.author.name, avatar: c1.author.avatar }) AS modelComments',
            'OPTIONAL MATCH m-[:TAGGED]->(modelTag:Tag)',
            'WITH m, author, modelComments, collect(modelTag.name) AS modelTags',
            'OPTIONAL MATCH (u:User)-[ru:VOTED {type: "UP"}]->m',
            'WITH m, author, modelComments, modelTags, count(ru) as modelUpvotes',
            'OPTIONAL MATCH (u:User)-[rd:VOTED {type: "DOWN"}]->m',
            'WITH m, author, modelComments, modelTags, modelUpvotes, count(rd) as modelDownvotes',
            'RETURN { name: m.name, description: m.description, files: m.files, downvotes: modelDownvotes, upvotes: modelUpvotes, publicationDate: m.publicationDate, visibility: m.visibility, tags: modelTags, author: { name: author.name, avatar: author.avatar, about: author.about }, comments:  modelComments, tags: modelTags} AS model'
        ].join('\n');

        var params = {
            modelName: name
        };

        db.query(query, params, function (err, results) {
            if (err) return reject(err);
            return resolve(results);
        });
    });
};

module.exports = model;