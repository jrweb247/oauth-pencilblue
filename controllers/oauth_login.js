var path = require('path');

module.exports = function OauthLoginModule(pb) {

    //pb dependencies
    var util          = pb.util;
    var PluginService = pb.PluginService;
    var OauthService  = PluginService.getService('oauthService', 'oauth-pencilblue');

    function OauthLogin() {}
    util.inherits(OauthLogin, pb.BaseController);

    OauthLogin.prototype.render = function(cb) {

        var vars = this.pathVars;
        var self = this;

        var service = new OauthService(vars.provider);

        service.getAuthorizationUri(function(err, url) {
            if (!util.isError(err)) {
                self.redirect(url, cb);
            }
            else {
                self.renderError(err, cb);
            }
        })
    };

    OauthLogin.prototype.renderError = function(err, cb) {
        cb({
            content_type: 'text/json',
            code: 200,
            content: err.message
        });
    };

    OauthLogin.getRoutes = function(cb) {
        var routes = [
            {
                method: 'get',
                path: '/oauth/:provider/login',
                auth_required: false,
                content_type: 'text/html'
            }
        ];
        cb(null, routes);
    };

    //exports
    return OauthLogin;
};