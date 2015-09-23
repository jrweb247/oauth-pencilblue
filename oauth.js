/**
 * Created by Julien on 31/08/15.
 */

module.exports = function(pb) {

    /**
     * Contact Form - A basic contact form plugin.
     * look like.
     *
     * @author Blake Callens <blake@pencilblue.org>
     * @copyright 2015 PencilBlue, LLC
     */
    function Oauth(){}

    /**
     * Called when the application is being installed for the first time.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    Oauth.onInstall = function(cb) {
        cb(null, true);
    };

    /**
     * Called when the application is uninstalling this plugin.  The plugin should
     * make every effort to clean up any plugin-specific DB items or any in function
     * overrides it makes.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    Oauth.onUninstall = function(cb) {
        cb(null, true);
    };

    /**
     * Called when the application is starting up. The function is also called at
     * the end of a successful install. It is guaranteed that all core PB services
     * will be available including access to the core DB.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    Oauth.onStartup = function(cb) {
        
        pb.TemplateService.registerGlobal('google_oauth', function(flag, cb) {
            var pluginService = new pb.PluginService();
            pluginService.getSettings('oauth-pencilblue', function(err, oauthSettings) {
                if (pb.util.isError(err)) {
                    return cb(err, '');
                }
                var result = false;
                var wording = '';
                for (var i = 0; i < oauthSettings.length; i++) {

                    if (oauthSettings[i].name === 'google_oauth_enable') {
                        result =  oauthSettings[i].value;
                    }
                    else if (oauthSettings[i].name === 'google_oauth_wording') {
                        wording = oauthSettings[i].value;
                    }
                }
                if (!result) {
                  return cb(err, '');
                }
                else {
                    var templateService = new pb.TemplateService();
                    templateService.registerLocal('google_oauth_wording', wording);
                    templateService.load('oauth/google', function(err, result) {
                        return cb(null, new pb.TemplateValue(result, false));
                    });
                }
            });
        });

        pb.TemplateService.registerGlobal('facebook_oauth', function(flag, cb) {
            var pluginService = new pb.PluginService();  
            pluginService.getSettings('oauth-pencilblue', function(err, oauthSettings) {
                if (pb.util.isError(err)) {
                    return cb(err, '');
                }
                var result = false;
                var wording = '';
                for (var i = 0; i < oauthSettings.length; i++) {

                    if (oauthSettings[i].name === 'facebook_oauth_enable') {
                        result =  oauthSettings[i].value;
                    }
                    else if (oauthSettings[i].name === 'facebook_oauth_wording') {
                        wording = oauthSettings[i].value;
                    }
                }
                if (!result) {
                    return cb(err, '');
                }
                else {
                    var templateService = new pb.TemplateService();
                    templateService.registerLocal('facebook_oauth_wording', wording);
                    templateService.load('oauth/facebook', function(err, result) {
                        return cb(null, new pb.TemplateValue(result, false));
                    });
                }
            });
        });

        cb(null, true);
    };

    /**
     * Called when the application is gracefully shutting down.  No guarantees are
     * provided for how much time will be provided the plugin to shut down.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    Oauth.onShutdown = function(cb) {
        cb(null, true);
    };

    //exports
    return Oauth;
};
