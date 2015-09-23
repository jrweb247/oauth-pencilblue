var path = require('path');
var qs = require('qs');
var async = require('async');

module.exports = function OauthCallbackModule(pb) {

    //pb dependencies
    var util          = pb.util;
    var PluginService = pb.PluginService;
    var OauthService  = PluginService.getService('oauthService', 'oauth-pencilblue');

    function OauthCallback() {}
    util.inherits(OauthCallback, pb.BaseController);

    OauthCallback.prototype.render = function(cb) {

        var self = this;
        var vars = this.pathVars;
        var code = this.query.code;

        var service = new OauthService(vars.provider);

        service.getToken(code, function(err, result) {

            if (util.isError(err)) {
                self.renderError(err, cb);
            }
            else {
                service.createToken(qs.parse(result), function(err, token){
                    if (util.isError(err)) {
                        self.renderError(err, cb);
                    }
                    else {
                        service.getInfos(token.token.access_token, function (err, email) {
                            if (util.isError(err)) {
                                self.renderError(err, cb);
                            }
                            else {
                                self.saveUser(email, cb);
                            }
                        });
                    }
                });
            }
        });
    };

    OauthCallback.getRoutes = function(cb) {
        var routes = [
            {
                method: 'get',
                path: '/oauth/:provider/callback',
                auth_required: false,
                content_type: 'text/html'
            }
        ];
        cb(null, routes);
    };

    OauthCallback.prototype.renderError = function(err, cb) {
        cb({
            content_type: 'text/json',
            code: 200,
            content: err.message
        });
    };

    OauthCallback.prototype.saveUser = function(email, cb) {
        
        var self = this;  
        var post = {};

        post.admin      = pb.SecurityService.ACCESS_USER;
        post.username   = email.split('@')[0];
        post.email      = email;
        post.password   = pb.util.uniqueId();
        post.confirm_password = post.password;
        
        var user = pb.DocumentCreator.create('user', post);
        self.validateUniques(user, function(err, results) {
            if(util.isError(err)) {
               cb({
                code: 400,
                content: pb.BaseController.apiResponse(pb.BaseController.API_ERROR, errMsg)
              });
              return;
            }
            var errMsg = null;
            if (results.verified_username > 0 || results.unverified_username > 0) {
                      errMsg = self.ls.get('EXISTING_USERNAME');
                return self.login(post, cb);
            }
            else if (results.verified_email > 0 || results.unverified_email > 0) {
              errMsg = self.ls.get('EXISTING_EMAIL');
              return self.login(post, cb);
            }

            if (errMsg) {
              cb({
                code: 400,
                content: pb.BaseController.apiResponse(pb.BaseController.API_ERROR, errMsg)
              });
              return;
            }

            var dao = new pb.DAO();
            dao.save(user, function(err, data) {
                if(util.isError(err)) {
                  cb({
                    code: 500,
                    content: pb.BaseController.apiResponse(pb.BaseController.API_ERROR, self.ls.get('ERROR_SAVING'))
                  });
                  return;
                }
                self.login(post, cb);
                cb({
                  code: 200,
                  content: 'ok'
                });
            });     
        });
    };
    
    OauthCallback.prototype.validateUniques = function(user, cb) {
        var dao = new pb.DAO();
        var tasks = {
          verified_username: function(callback) {
            dao.count('user', {username: user.username}, callback);
          },
          verified_email: function(callback) {
            dao.count('user', {email: user.email}, callback);
          },
          unverified_username: function(callback) {
            dao.count('unverified_user', {username: user.username}, callback);
          },
          unverified_email: function(callback) {
            dao.count('unverified_user', {email: user.email}, callback);
          }
        };
        async.series(tasks, cb);
    };

    OauthCallback.prototype.login = function(post, cb) {
        var self         = this;
        var adminAttempt = false;

        var query = {
            object_type : 'user',
            '$or' : [
                {
                    username : post.username
                },
                {
                    email : post.username
                }
            ]
        };

        var dao = new pb.DAO();
        dao.loadByValues(query, 'user', function(err, user) {

            if (util.isError(err) || !util.isObject(user)) {
                pb.log.info(err);
                return cb(err, user);
            }

            delete user.password;

            user.permissions                        = pb.PluginService.getPermissionsForRole(user.admin);
            self.session.authentication.user        = user;
            self.session.authentication.user_id     = user[pb.DAO.getIdField()].toString();
            self.session.authentication.admin_level = user.admin;

            if (!self.session.locale) {
                self.session.locale = user.locale;
            }

            var location = '/';
            if (self.session.on_login !== undefined) {
                location = self.session.on_login;
                delete self.session.on_login;
            }
            else if(adminAttempt) {
                location = '/admin';
            }
            self.redirect(location, cb);
        });
    };

    //exports
    return OauthCallback;
};