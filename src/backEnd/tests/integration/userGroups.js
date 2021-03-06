let mongoose = require('mongoose');
let should = require('should');
let assert = require('assert');
let request = require('supertest');
let requests = require('../API_test_requests.js');

let conf = require('../../config/config.js');
let Token = require('./../../models/token.js');
let User = require('../../models/user');
let UserGroup = require('./../../models/userGroup.js');


describe('update - delete - find', function () {

    let data = {
        email: "test2@test.mail",
        password: 'secret',
    };
    let token = "";

    before(function (done) {
        request(conf.server.url)
            .post('/register')
            .send(data)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                request(conf.server.url)
                    .post('/login')
                    .send(data)
                    .end(function (err, res) {
                        if (err) {
                            throw err;
                        }
                        token = res.body.token;
                        done();
                    });
            });
    });

    after(function (done) {
        User.remove({email: data.email}, function () {
            Token.remove({email: data.email}, function () {
                done();
            });
        });
    });

    it('create user group', function (done) {
        let body = {
            token: token,
            name: "GroupName",
        };

        requests.postRequest('/userGroup', body, 201).then((res) => {
            res.body.email.should.be.equal(data.email);
            res.body.name.should.be.equal(body.name);
        }).then(done, done);
    });
});


describe('update - delete - find', function () {

    let notOwnerNoGroupsUser = {
        email: "userNotOwner@mail.com",
        password: "secret"
    };

    let data = {
        email: "test2@test.mail",
        name: "GroupName",
    };

    let id = 0;
    let tokenNotOwner = "";
    let token = "";

    before(function (done) {
        request(conf.server.url)
            .post('/register')
            .send(notOwnerNoGroupsUser)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                request(conf.server.url)
                    .post('/login')
                    .send(notOwnerNoGroupsUser)
                    .end(function (err, res) {
                        if (err) {
                            throw err;
                        }
                        tokenNotOwner = res.body.token;
                        done();
                    });
            });
    });

    beforeEach(function (done) {
        data['password'] = "secret";

        request(conf.server.url)
            .post('/register')
            .send(data)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                request(conf.server.url)
                    .post('/login')
                    .send(data)
                    .end(function (err, res) {
                        if (err) {
                            throw err;
                        }
                        token = res.body.token;
                        data['token'] = token;

                        request(conf.server.url)
                            .post('/userGroup')
                            .send(data)
                            .end(function (err, res) {
                                if (err) {
                                    throw err;
                                }
                                id = res.body._id;
                                done();
                            });
                    });
            });
    });


    afterEach(function (done) {
        UserGroup.remove({email: data.email}, function () {
            User.remove({email: data.email}, function () {
                Token.remove({email: data.email}, function () {
                    done();
                });
            });
        });
    });

    after(function (done) {
        User.remove({email: notOwnerNoGroupsUser.email}, function () {
            done();
        });
    });


    it('create user group, the group already exists', function (done) {

        data['token'] = token;
        requests.postRequest('/userGroup', data, 400).then((res) => {
        }).then(done, done);
    });


    it('update group', function (done) {

        let newInfo = {
            name: "newName",
            description: "NewDesc",
            //permissions:,     // TODO
            path: "newPath"
        };

        let body = {
            token: token,
            email: data.email,
            id: id,
            name: newInfo.name,
            description: newInfo.description,
            path: newInfo.path
        };

        requests.putRequest('/userGroup', body, 200).then((res) => {
            res.body.email.should.be.equal(data.email);
            res.body._id.should.be.equal(id);
            res.body.name.should.be.equal(newInfo.name);
            res.body.description.should.be.equal(newInfo.description);
            res.body.path.should.be.equal(newInfo.path);
            res.body.updated_at.should.not.equal(res.body.created_at);
        }).then(done, done);
    });


    it('try to update group with the same information', function (done) {

        let body = {
            token: token,
            id: id
        };

        requests.putRequest('/userGroup', body, 200).then((res) => {
            // changed nothing, so data must be equal
            res.body.updated_at.should.be.equal(res.body.created_at);
        }).then(done, done);
    });


    it('update group which is not in the database', function (done) {

        let body = {
            token: token,
            id: "doesNotExist"
        };

        requests.putRequest('/userGroup', body, 404).then((res) => {
        }).then(done, done);
    });

    it('update group by not the owner', function (done) {

        let body = {
            token: tokenNotOwner,
            id: id
        };

        requests.putRequest('/userGroup', body, 403).then((res) => {
        }).then(done, done);
    });


    it('delete group', function (done) {

        let body = {
            token: token,
            id: id
        };

        requests.delRequest('/userGroup', body, 200).then((res) => {
            res.body.email.should.be.equal(data.email);
            res.body._id.should.be.equal(id);
        }).then(done, done);
    });


    it('delete group which is not in the database', function (done) {

        let body = {
            token: token,
            id: "doesNotExist"
        };

        requests.delRequest('/userGroup', body, 404).then((res) => {
        }).then(done, done);
    });


    it('delete group by not the owner', function (done) {

        let body = {
            token: tokenNotOwner,
            id: id
        };

        requests.delRequest('/userGroup', body, 403).then((res) => {
        }).then(done, done);
    });


    it('get groups by ownership', function (done) {

        let body = {
            token: token,
        };

        requests.postRequest('/getGroupsByOwnership', body, 200).then((res) => {
            res.body.length.should.be.equal(1);
            res.body[0].name.should.be.equal(data.name);
            res.body[0].email.should.be.equal(data.email);
            res.body[0].additionalInfoLst.length.should.be.equal(1);
        }).then(done, done);
    });


    it('get groups by ownership, no groups', function (done) {

        let body = {
            token: tokenNotOwner,
        };

        requests.postRequest('/getGroupsByOwnership', body, 200).then((res) => {
            res.body.length.should.be.equal(0);
        }).then(done, done);
    });
});


describe('--- Group Members ---', function () {

    let newMember = {
        email: "newMember@mail.com",
        password: "password",
    };

    let data = {
        email: "test2@test.mail",
        password: "secret",
        name: "GroupNameMembersTesting",
    };

    let id = 0;
    let token = "";
    let tokenNewMember = "";

    beforeEach(function (done) {
        // register the newMember
        request(conf.server.url)
            .post('/register')
            .send(newMember)
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                else {
                    // register a test user
                    request(conf.server.url)
                        .post('/register')
                        .send(data)
                        .end(function (err, res) {
                            if (err) {
                                throw err;
                            }
                            // login the member
                            request(conf.server.url)
                                .post('/login')
                                .send(newMember)
                                .end(function (err, res) {
                                    if (err) {
                                        throw err;
                                    }
                                    tokenNewMember = res.body.token;
                                    // login the test user
                                    request(conf.server.url)
                                        .post('/login')
                                        .send(data)
                                        .end(function (err, res) {
                                            if (err) {
                                                throw err;
                                            }
                                            // create a new group as the test user
                                            token = res.body.token;
                                            data['token'] = token;
                                            request(conf.server.url)
                                                .post('/userGroup')
                                                .send(data)
                                                .end(function (err, res) {
                                                    if (err) {
                                                        throw err;
                                                    }
                                                    id = res.body._id;
                                                    done();
                                                });
                                        });
                                });

                        });
                }
            });
    });

    afterEach(function (done) {
        UserGroup.remove({email: data.email}, function () {
            User.remove({email: {$in: [data.email, newMember.email]}}, function () {
                Token.remove({email: {$in: [data.email, newMember.email]}}, function () {
                    done();
                });
            });
        });
    });


    it('add a new user group member', function (done) {

        let body = {
            token: token,
            id: id,
            memberEmail: newMember.email,
        };

        requests.postRequest('/userGroupMember', body, 201).then((res) => {
            res.body.groupID.should.be.equal(id);
            res.body.email.should.be.equal(newMember.email);
        }).then(done, done);
    });


    it('add a new user group member, user is already a member', function (done) {

        let body = {
            token: token,
            id: id,
            memberEmail: newMember.email,
        };

        requests.postRequest('/userGroupMember', body, 201).then((res) => {
            requests.postRequest('/userGroupMember', body, 400).then((res) => {
            }).then(done, done);
        });
    });


    it('add a new user group member not by the owner', function (done) {

        let body = {
            token: "notOwner@mail.com",
            id: id,
            memberEmail: newMember.email,
        };

        requests.postRequest('/userGroupMember', body, 403).then((res) => {
        }).then(done, done);
    });


    it('add a new user group member, group does not exist', function (done) {

        let body = {
            token: token,
            id: "doesNotExist",
            memberEmail: newMember.email,
        };

        requests.postRequest('/userGroupMember', body, 404).then((res) => {
        }).then(done, done);
    });


    it('add a new user group member, new member is not registered', function (done) {

        let body = {
            token: token,
            id: id,
            memberEmail: "notRegistered@mail.com",
        };

        requests.postRequest('/userGroupMember', body, 404).then((res) => {
        }).then(done, done);
    });


    it('delete group member', function (done) {

        let body = {
            token: token,
            id: id,
            memberEmail: newMember.email,
        };

        // create a member first
        requests.postRequest('/userGroupMember', body, 201).then((res) => {
            requests.delRequest('/userGroupMember', body, 200).then((res) => {
                res.body.email.should.be.equal(body.memberEmail);   //TODO
            }).then(done, done);
        });
    });


    it('delete group member for not the group owner', function (done) {

        let body = {
            token: tokenNewMember,
            id: id,
            memberEmail: newMember.email,
        };

        requests.delRequest('/userGroupMember', body, 403).then((res) => {
        }).then(done, done);
    });


    it('delete group member, group does not exist', function (done) {

        let body = {
            token: token,
            id: "doesNotExist",
            memberEmail: newMember.email,
        };

        requests.delRequest('/userGroupMember', body, 404).then((res) => {
        }).then(done, done);
    });


    it('get groups by membership', function (done) {

        let body = {
            token: token,
            id: id,
            memberEmail: newMember.email,
        };

        let body2 = {
            token: tokenNewMember
        };

        // create a member first
        requests.postRequest('/userGroupMember', body, 201).then((res) => {
            requests.postRequest('/getGroupsByMembership', body2, 200).then((res) => {
                res.body.length.should.be.equal(1);
                res.body[0].name.should.be.equal(data.name);
                res.body[0].additionalInfoLst.length.should.be.equal(1);
            }).then(done, done);
        });
    });


    it('get groups by membership, member of none groups', function (done) {

        let body = {
            token: token,
        };

        requests.postRequest('/getGroupsByMembership', body, 200).then((res) => {
            res.body.length.should.be.equal(0);
        }).then(done, done);
    });


    it('get members of a group for the group owner', function (done) {

        let body = {
            token: token,
            id: id,
            memberEmail: newMember.email,
        };

        let body2 = {
            token: token,
            id: id,
        };

        // create a member first
        requests.postRequest('/userGroupMember', body, 201).then((res) => {
            requests.postRequest('/getUserGroupMembers', body2, 200).then((res) => {
                res.body.length.should.be.equal(1);
                res.body[0].should.be.equal(newMember.email);
            }).then(done, done);
        });
    });


    it('get members of a group for a member', function (done) {

        let body = {
            token: token,
            id: id,
            memberEmail: newMember.email,
        };

        let body2 = {
            token: tokenNewMember,
            id: id,
        };

        // create a member
        requests.postRequest('/userGroupMember', body, 201).then((res) => {
            requests.postRequest('/getUserGroupMembers', body2, 200).then((res) => {
                res.body.length.should.be.equal(1);
                res.body[0].should.be.equal(newMember.email);
            }).then(done, done);
        });
    });


    it('get members of a group for non-authorized person', function (done) {

        let body = {
            token: "someone@mail.com",
            id: id,
        };

        requests.postRequest('/getUserGroupMembers', body, 403).then((res) => {
        }).then(done, done);
    });


    it('get members of a group which does not exist', function (done) {

        let body = {
            token: token,
            id: "doesNotExist",
        };

        requests.postRequest('/getUserGroupMembers', body, 404).then((res) => {
        }).then(done, done);
    });

});
