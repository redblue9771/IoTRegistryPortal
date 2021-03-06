let authenticateUser = require('../helpers/authenticateUser.js');
let getTranslation = require('../helpers/translations.js');
let messageTypes = require('../helpers/messageTypes.js');
let User = require('../models/user.js');
let UserGroup = require('../models/userGroup.js');
let UserGroupMem = require('../models/userGroupMem.js');


module.exports = function (app, _) {

    app.post('/userGroup', function (req, res) {

        // retrieve information
        let body = _.pick(req.body, 'token', 'name', 'description', 'permissions', 'path');

        authenticateUser(body.token).then((email) => {

            // check if the user doesn't have already a group with the name
            UserGroup.find({email: email, name: body.name}, function (err, groups) {
                if (err) {
                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                }
                else if (groups.length > 0) {
                    res.status(400).json({msg: getTranslation(messageTypes.GROUP_ALREADY_EXISTS)});
                }
                // TODO check if the user exists ???
                else {
                    // create a new group
                    let newGroup = new UserGroup({
                        email: email,
                        name: body.name,
                        description: body.description,
                        permissions: body.permissions,
                        path: body.path,
                    });

                    // save the group
                    newGroup.save(function (err) {
                        if (err) {
                            res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                        } else {
                            res.status(201).json(newGroup); //return the newly created group object
                        }
                    });
                }
            });
        }, (errCode) => {
            res.status(403).json({});
        });
    });


    app.put('/userGroup', function (req, res) {
        // for now, only the owner can update the group  // TODO ?
        // retrieve information
        let body = _.pick(req.body, 'token', 'id', 'name', 'description', 'permissions', 'path');

        authenticateUser(body.token).then((email) => {

            UserGroup.findById(body.id, function (err, group) {
                if (err) {
                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                }
                else if (!group) {
                    res.status(404).json({msg: getTranslation(messageTypes.GROUP_NOT_FOUND)});
                }
                else if (group.email !== email) {
                    res.status(403).json({msg: getTranslation(messageTypes.GROUP_UPDATE_INFO)});
                }
                else {
                    //group.email = body.email;  // TODO support transfer ownership of the group to an another user???
                    if (body.name) {
                        group.name = body.name;
                    }
                    if (body.description) {
                        group.description = body.description;
                    }
                    if (body.permissions) {
                        group.permissions = body.permissions;
                    }
                    if (body.path) {
                        group.path = body.path;
                    }
                    // if something was updated
                    if (body.name || body.description || body.permissions || body.path) {
                        group.updated_at = new Date();

                        group.save(function (err) {
                            if (err) {
                                res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                            } else {
                                res.status(200).json(group); //return the updated group object
                            }
                        });
                    }
                    else {
                        res.status(200).json(group);
                    }
                }
            })
        }, (errCode) => {
            res.status(403).json({});
        })
    });


    app.delete('/userGroup', function (req, res) {

        // retrieve information
        let body = _.pick(req.body, 'token', 'id');

        authenticateUser(body.token).then((email) => {

            UserGroup.findById(body.id, function (err, group) {
                if (err) {
                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                }
                else if (!group) {
                    res.status(404).json({msg: getTranslation(messageTypes.GROUP_NOT_FOUND)});
                }
                else if (group.email !== email) {
                    res.status(403).json({msg: getTranslation(messageTypes.GROUP_DELETE_INFO)});
                }
                else {
                    // if there are any members of the group, end their membership
                    UserGroupMem.remove({groupID: body.id}, function (err) {
                        if (err) {
                            res.status(404).json({msg: getTranslation(messageTypes.GROUP_NOT_FOUND)});
                        }
                        else {
                            // delete the group
                            UserGroup.findByIdAndRemove(body.id, function (err, group) {
                                if (err) {
                                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                                }
                                else {
                                    res.status(200).json(group)
                                }
                            })
                        }
                    });
                }
            });
        }, (errCode) => {
            res.status(403).json({});
        });
    });


    app.post('/getGroupsByOwnership', function (req, res) {

        // retrieve information
        let body = _.pick(req.body, 'token');

        authenticateUser(body.token).then((email) => {

            UserGroup.find({email: email}).lean().exec(function (err, groups) {
                if (err) {
                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                }
                else if (groups.length === 0) {
                    res.status(200).json(groups);
                }
                else {
                    let counter = 0;
                    for (let i = 0; i < groups.length; i++) {
                        getUserGroupMembers({email: email, id: groups[i]._id}).then((members) => {
                            groups[i]['additionalInfoLst'] = [
                                {
                                    name: "Members",
                                    number: members.length
                                }
                            ];
                            counter++;
                            if (counter === groups.length) {
                                res.status(200).json(groups);
                            }
                        }, (errCode) => {
                            groups[i]['additionalInfoLst'] = [
                                {
                                    name: "Members",
                                    number: "?"
                                }
                            ];
                            counter++;
                            if (counter === groups.length) {
                                res.status(200).json(groups);
                            }
                        });
                    }
                }
            });
        }, (errCode) => {
            res.status(403).json({});
        });
    });


    app.post('/userGroupMember', function (req, res) {
        // for now, only the owner of the group can add a new member // TODO
        // retrieve information
        let body = _.pick(req.body, 'token', 'id', 'memberEmail');

        authenticateUser(body.token).then((email) => {

            // check if the requester is the owner
            UserGroup.findById(body.id, function (err, group) {
                if (err) {
                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                }
                else if (!group) {
                    res.status(404).json({msg: getTranslation(messageTypes.GROUP_NOT_FOUND)})
                }
                else if (group.email !== email) {
                    res.status(403).json({msg: getTranslation(messageTypes.USER_GROUP_ADD_MEMBER_INFO)});
                }
                else {
                    // check if the potential new member exists/is registered as an user
                    User.findOne({email: body.memberEmail}, function (err, user) {
                        if (err) {
                            res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                        }
                        else if (!user) {
                            res.status(404).json({msg: getTranslation(messageTypes.USER_NOT_FOUND)});
                        }
                        else {
                            // user exists, now check current members of the group
                            UserGroupMem.find({email: body.memberEmail, groupID: body.id}, function (err, groups) {
                                if (err) {
                                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                                }
                                else if (groups.length > 0) {
                                    res.status(400).json({msg: getTranslation(messageTypes.MEMBER_ALREADY_EXISTS)});
                                }
                                else {
                                    // add a new member
                                    let newGroupMem = new UserGroupMem({
                                        email: body.memberEmail,
                                        groupID: body.id,
                                    });

                                    // save the group
                                    newGroupMem.save(function (err) {
                                        if (err) {
                                            res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                                        } else {
                                            //return the newly created user group membership object
                                            res.status(201).json(newGroupMem);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }, (errCode) => {
            res.status(403).json({});
        });
    });


    app.delete('/userGroupMember', function (req, res) {
        // for now, only the owner of the group can remove a member // TODO
        // retrieve information
        let body = _.pick(req.body, 'token', 'id', 'memberEmail');

        authenticateUser(body.token).then((email) => {

            // check if requester is the owner
            UserGroup.findById(body.id, function (err, group) {
                if (err) {
                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                }
                else if (!group) {
                    res.status(404).json({msg: getTranslation(messageTypes.GROUP_NOT_FOUND)});
                }
                else if (group.email !== email) {
                    res.status(403).json({msg: getTranslation(messageTypes.USER_GROUP_REMOVE_MEMBER_INFO)});
                }
                else {
                    // remove the member
                    UserGroupMem.findOneAndRemove({email: body.memberEmail, groupID: body.id}, function (err, removed) {
                        if (err) {
                            res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                        }
                        else {
                            // return deleted object
                            res.status(200).json(removed);
                        }
                    });
                }
            });
        }, (errCode) => {
            res.status(403).json({});
        });
    });


    app.post('/getGroupsByMembership', function (req, res) {

        // retrieve information
        let body = _.pick(req.body, 'token');

        authenticateUser(body.token).then((email) => {
            console.log("here: ", email);
            // let's get list of objects where ID belongs to the group the user is member of
            UserGroupMem.find({email: email}, 'groupID', function (err, IDs) {
                if (err) {
                    res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                }
                else {
                    // get groupID our from objects to list => so create list of IDs
                    let arrIDs = [];
                    for (let i = 0; i < IDs.length; i++) {
                        arrIDs.push(IDs[i].groupID);
                    }
                    // let's get list of group objects
                    UserGroup.find({'_id': {$in: arrIDs}}).lean().exec(function (err, groups) {
                        if (err) {
                            res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                        }
                        else if (groups.length === 0) {
                            res.status(200).json(groups);
                        }
                        else {
                            let counter = 0;
                            for (let i = 0; i < groups.length; i++) {
                                getUserGroupMembers({email: email, id: groups[i]._id}).then((members) => {
                                    groups[i]['additionalInfoLst'] = [
                                        {
                                            name: "Members",
                                            number: members.length
                                        }
                                    ];
                                    counter++;
                                    if (counter === groups.length) {
                                        res.status(200).json(groups);
                                    }
                                }, (errCode) => {
                                    groups[i]['additionalInfoLst'] = [
                                        {
                                            name: "Members",
                                            number: "?"
                                        }
                                    ];
                                    counter++;
                                    if (counter === groups.length) {
                                        res.status(200).json(groups);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }, (errCode) => {
            res.status(403).json({});
        });
    });

    /**
     * Returns a list of members of a user group
     * @param body - object of required information (groupID, requester or owner email)
     * @returns {Promise}
     */
    function getUserGroupMembers (body) {

        return new Promise((resolve, reject) => {
            // let's get a list of objects where emails belongs to members of the group specified by id
            UserGroupMem.find({groupID: body.id}, 'email', function (err, emails) {
                if (err) {
                    reject(500)
                }
                else {
                    let arrEmails = [];
                    for (let i = 0; i < emails.length; i++) {
                        arrEmails.push(emails[i].email);
                    }

                    UserGroup.findById(body.id, function (err, group) {
                        if (err) {
                            reject(500)
                        }
                        else if (!group) {
                            reject(404)
                        }
                        // check if the requester is the owner or a member
                        else if (group.email !== body.email && arrEmails.indexOf(body.email) === -1) {
                            reject(403)
                        }
                        else {
                            // return a list of members' emails
                            resolve(arrEmails)
                        }
                    });
                }
            });
        });
    }

    app.post('/getUserGroupMembers', function (req, res) {

        // retrieve information
        let body = _.pick(req.body, 'token', 'id');  // requester's email and id of the group

        authenticateUser(body.token).then((email) => {

            body['email'] = email;

            getUserGroupMembers(body).then((members) => {
                res.status(200).json(members);
            }, (errCode) => {
                switch (errCode) {
                    case 500:
                        res.status(500).json({msg: getTranslation(messageTypes.INTERNAL_DB_ERROR)});
                        break;
                    case 404:
                        res.status(404).json({msg: getTranslation(messageTypes.GROUP_NOT_FOUND)});
                        break;
                    case 403:
                        res.status(403).json(
                            //TODO true/false?
                            {msg: getTranslation(messageTypes.USER_GROUP_ACCESS_MEMBER_LIST_INFO)}
                        );
                }
            });
        }, (errCode) => {
            res.status(403).json({});
        });
    });


};