'use strict';

var Group = require('../models/group'),
    User = require('../models/user'),
    Joi = require('joi'),
    schema = require('../schema'),
    Boom = require('boom'),
    Promise = require('bluebird'),
    GroupApplicationNotification = require('../models/notifications').GroupApplicationNotification,
    GroupInviteNotification = require('../models/notifications').GroupInviteNotification;

module.exports = function (server) {

    server.route({
        method: 'POST',
        path: '/groups',
        config: {
            auth: 'token',
            validate: {
                payload: {
                    name: schema.group.name.required(),
                    description: schema.group.description.required(),
                    visibility: schema.group.visibility.required()
                }
            }
        },
        handler: function (request, reply) {
            var groupInfo = request.payload;
            groupInfo.adminName = request.auth.credentials.username;
            groupInfo.creationDate = (new Date()).toISOString();
            // check if group already exists
            Group.getByName(groupInfo.name, request.auth.credentials.username)
                .then(function () {
                    return reply(Boom.badRequest('Group already exists'));
                })
                .catch(Error, function (error) {
                    return reply(Boom.badImplementation(error.message));
                })
                // If group doesn't exist, create it
                .catch(function () {
                    Group.create(groupInfo)
                        .then(function (group) {
                            reply(group);
                        })
                        .catch(function (error) {
                            return reply(Boom.badImplementation('Internal server error'));
                        });
                });
        }
    });

    server.route({
        method: 'GET',
        path: '/groups/{id}',
        config: {
            auth: {
                mode: 'optional',
                strategy: 'token'
            },
            validate: {
                params: {
                    id: schema.group.name.required()
                }
            }
        },
        handler: function (request, reply) {
            Group.getByName(request.params.id, request.auth.credentials ? request.auth.credentials.username : null)
                .then(function (group) {
                    if (group.group.visibility === 'public')
                        reply(group);
                    else if (!request.auth.credentials)
                        reply(Boom.notFound('Group not found'));

                    Group.isMember(request.params.id, request.auth.credentials.username)
                        .then(function (isMember) {
                            if (isMember)
                                reply(group);
                            else
                                reply(Boom.notFound('Group not found'));
                        })
                        .catch(function () {
                            reply(Boom.badImplementation('Internal server error'));
                        });
                })
                .catch(Error, function (error) {
                    return reply(Boom.badImplementation(error.message));
                })
                .catch(function () {
                    return reply(Boom.notFound('Group not found'));
                });
        }
    });

    server.route({
        method: 'PATCH',
        path: '/groups/{id}',
        config: {
            auth: {
                strategy: 'token'
            },
            validate: {
                params: {
                    id: schema.group.name.required()
                },
                payload: {
                    description: schema.group.description.required(),
                    visibility: schema.group.visibility.required()
                }
            }
        },
        handler: function (request, reply) {
            Group.update(request.params.id, request.auth.credentials.username, request.payload.description, request.payload.visibility)
                .then(function (results) {
                    if (results.length == 0) {
                        reply('No such group.').code(404);
                    } else {
                        return reply(results[0]['groupInfo']);
                    }
                })
                .catch(Error, function (error) {
                    return reply(Boom.badImplementation(error.message));
                })
                .catch(function () {
                    return reply(Boom.notFound('Group not found'));
                });
        }
    });

    server.route({
        path: '/groups/{id}/admins',
        method: 'GET',
        config: {
            auth: {
                mode: 'optional',
                strategy: 'token'
            },
            validate: {
                params: {
                    id: schema.group.name.required()
                }
            }
        },
        handler: function (request, reply) {
            var groupId = request.params.id;
            Group.getById(groupId)
                .then(function () {
                    Group.getAdministrators(groupId)
                        .then(function (administrators) {
                            reply(administrators);
                        })
                        .catch(Error, function (error) {
                            reply(Boom.badImplementation(error.message));
                        });

                })
                .catch(Error, function () {
                    reply(Boom.badImplementation('Internal Server Error'));
                })
                .catch(function () {
                    reply(Boom.notFound('Group not found'));
                });
        }
    });

    server.route({
        path: '/groups/{id}/members',
        method: 'GET',
        config: {
            auth: {
                mode: 'optional',
                strategy: 'token'
            },
            validate: {
                params: {
                    id: schema.group.name.required()
                }
            }
        },
        handler: function (request, reply) {
            var groupId = request.params.id;
            Group.getByName(groupId)
                .then(function () {
                    Group.getMembers(groupId)
                        .then(function (members) {
                            reply(members);
                        })
                        .catch(Error, function (error) {
                            reply(Boom.badImplementation(error.message));
                        });

                })
                .catch(Error, function () {
                    reply(Boom.badImplementation('Internal Server Error'));
                })
                .catch(function () {
                    reply(Boom.notFound('Group not found'));
                });
        }
    });

    server.route({
        path: '/groups/{id}/invite',
        method: 'POST',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required()
                },
                payload: {
                    inviteeName: Joi.string().required()
                }
            }
        },
        handler: function (request, reply) {
            Group.isAdmin(request.params.id, request.auth.credentials.username)
                .then(function (isAdmin) {
                    if (!isAdmin)
                        return reply(Boom.unauthorized('User is not an administrator'));

                    var notification = new GroupInviteNotification({
                        userTo: request.payload.inviteeName,
                        seen: false,
                        date: new Date(),
                        groupName: request.params.id,
                        inviterName: request.auth.credentials.username
                    });

                    notification.save(function(err) {
                        if (err)
                            return reply(Boom.badImplementation('Internal server error'));

                        return reply().code(200);
                    });
                })
                .catch(function () {
                    reply(Boom.badImplementation('Internal server error'));
                });
        }
    });

    server.route({
        path: '/groups/{id}/invite/{inviteid}',
        method: 'PATCH',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required(),
                    inviteid: Joi.string().required()
                },
                payload: {
                    accepted: Joi.boolean()
                }
            }
        },
        handler: function (request, reply) {
            GroupInviteNotification.findOne({ _id: request.params.inviteid }, function(err, notification) {
                if (err)
                    return reply(Boom.badRequest('Notification _id does not exist'));

                if (notification.userTo != request.auth.credentials.username)
                    return reply(Boom.forbidden('User is not the target of the invite'));

                GroupInviteNotification.update({_id: request.params.inviteid }, { accepted: request.payload.accepted, seen: true }, null, function(err) {
                    if (err)
                        return reply(Boom.badImplementation('Internal server error'));

                    if (!request.payload.accepted)
                        return reply().code(200);

                    Group.addMember(request.params.id, request.auth.credentials.username)
                        .then(function() {
                            reply().code(200);
                        })
                        .catch(function() {
                            return reply(Boom.badImplementation('Internal server error'));
                        })
                });
            });
        }
    });

    server.route({
        path: '/groups/{id}/apply/{notificationid}',
        method: 'PATCH',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required(),
                    notificationid: Joi.string().required()
                },
                payload: {
                    accepted: Joi.boolean().required()
                }
            }
        },
        handler: function (request, reply) {
            Group.isAdmin(request.params.id, request.auth.credentials.username)
                .then(function (isAdmin) {
                    if (!isAdmin)
                        return reply(Boom.badRequest('User is not administrator of the group'));

                    GroupApplicationNotification.findOneAndUpdate({ _id: request.params.notificationid }, { accepted: request.payload.accepted, seen: true}, null, function(err, notification) {
                        if (err)
                            throw err;

                        GroupApplicationNotification.update({ groupName: request.params.id, applicantName: notification.applicantName }, { accepted: request.payload.accepted }, null, function(err) {
                            if (err)
                                throw err;

                            if (!request.payload.accepted)
                                return reply().code(200);

                            Group.addMember(request.params.id, notification.applicantName)
                                .then(function() {
                                    reply().code(200);
                                })
                                .catch(function(error) {
                                    console.log(error);
                                    reply(Boom.badImplementation('Internal server error'));
                                });
                        });
                    });
                })
                .catch(function (error) {
                    console.log(error);
                    return reply(Boom.badImplementation('Internal server error'));
                })
        }
    });

    server.route({
        path: '/groups/{id}/apply',
        method: 'POST',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required()
                },
                payload: {
                    avatar: schema.user.avatar.required()
                }
            }
        },
        handler: function (request, reply) {
            Group.isMember(request.params.id, request.auth.credentials.username)
                .then(function (isMember) {
                    if (isMember)
                        return reply(Boom.badRequest('User is already a member'));
                    
                    Group.getAdministrators(request.params.id)
                        .then(function (administrators) {
                            Promise.map(administrators, function (administrator) {
                                return new Promise(function (resolve) {
                                    var notification = new GroupApplicationNotification({
                                        userTo: administrator.username,
                                        seen: false,
                                        date: new Date(),
                                        applicantName: request.auth.credentials.username,
                                        applicantAvatar:  request.payload.avatar,
                                        groupName: request.params.id
                                    });

                                    notification.save(function (err) {
                                        if (err) {
                                            console.log("saveError");
                                            throw err;
                                        }
                                        resolve(true);
                                    });
                                });
                            })
                                .then(function () {
                                    reply().code(200);
                                })
                                .catch(function () {
                                    reply(Boom.badImplementation('Internal server error'));
                                });
                        });
                })
                .catch(function () {
                    reply(Boom.badImplementation('Internal server error'));
                })
        }
    });

    server.route({
        path: '/groups/{id}/admins',
        method: 'POST',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required()
                },
                payload: {
                    adminName: schema.user.username.required()
                }
            }
        },
        handler: function (request, reply) {
            Group.isAdmin(request.params.id, request.auth.credentials.username)
                .then(function (isAdmin) {
                    if (!isAdmin)
                        return reply(Boom.badRequest('Requesting user is not an administrator of the group'));

                    Group.addAdmin(request.params.id, request.payload.adminName)
                        .then(function () {
                            reply("Administrator successfully added").code(200);
                        })
                        .catch(function (error) {
                        });
                })
                .catch(Error, function (error) {
                    reply(Boom.badImplementation(error.message));
                });
        }
    });

    server.route({
        path: '/groups/{id}/members',
        method: 'POST',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required()
                },
                payload: {
                    adminName: schema.user.username.required()
                }
            }
        },
        handler: function (request, reply) {
            Group.isMember(request.params.id, request.auth.credentials.username)
                .then(function (isMember) {
                    if (!isMember)
                        return reply(Boom.badRequest('Requesting user is not a member of the group'));

                    Group.addAdmin(request.params.id, request.payload.adminName)
                        .then(function () {
                            reply("Administrator successfully added").code(200);
                        })
                        .catch(function () {
                            reply(Boom.badImplementation('Internal Server Error'));
                        });
                })
                .catch(Error, function (error) {
                    reply(Boom.badImplementation(error.message));
                });
        }
    });

    server.route({
        path: '/groups/{id}/galleries',
        method: 'GET',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required()
                }
            }
        },
        handler: function (request, reply) {
            var groupId = request.params.id;
            Group.isMember(groupId, request.auth.credentials.username)
                .then(function (isMember) {
                    // if user is member of the group, get the private and public galleries
                    if (isMember) {
                        Group.getAllGalleries(groupId)
                            .then(function (galleries) {
                                reply(galleries);
                            })
                            .catch(Error, function (error) {
                                reply(Boom.badImplementation(error.message));
                            });
                    }
                    else {
                        Group.getPublicGalleries(groupId)
                            .then(function (galleries) {
                                reply(galleries);
                            })
                            .catch(Error, function (error) {
                                reply(Boom.badImplementation(error.message));
                            });
                    }
                })
                .catch(Error, function (error) {
                    reply(Boom.badImplementation(error.message));
                });
        }
    });

    server.route({
        path: '/groups/{id}/models',
        method: 'GET',
        config: {
            auth: 'token',
            validate: {
                params: {
                    id: schema.group.name.required(),
                }
            }
        },
        handler: function (request, reply) {
            var groupId = request.params.id;
            Group.getAllModels(groupId)
                .then(function (models) {
                    reply(models);
                })
                .catch(Error, function () {
                    reply(Boom.badImplementation(error.message));
                });
        }
    });
};