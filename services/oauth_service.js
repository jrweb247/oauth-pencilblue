/*
    Copyright (C) 2015  PencilBlue, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var request = require('simple-oauth2/node_modules/request');
var oauth2  = require('simple-oauth2');
var async = require('async');

module.exports = function(pb) {

    var util          = pb.util;
    var credentials = {
        google: {
            site: 'https://accounts.google.com/o',
            tokenPath: '/oauth2/token',
            authorizationPath: '/oauth2/auth',
            apiUser: 'https://www.googleapis.com/plus/v1/people/me?emails/value',
            getEmail: function(data) {
                return data.emails[0].value;
            }
        },
        facebook: {
            site: 'https://graph.facebook.com',
            tokenPath: '/oauth/access_token',
            authorizationPath: '/oauth/authorize',
            apiUser: 'https://graph.facebook.com/me?fields=email',
            getEmail: function(data) {
                return data.email ? data.email : null;
            }
        }
    };
    
    
    function OauthService(provider) {

        this.provider = provider;
        this.credential = null;
        this.oauth = null;
    }

    OauthService.init = function(cb) {
        cb(null, true);
    };

    OauthService.getName = function() {
        return "oauthService";
    };

    OauthService.prototype.getOauth = function(cb) {

        var self = this;

        if (this.oauth == null) {

            if (typeof credentials[self.provider] === 'undefined') {
                cb(new Error("Provider not found in configuration"), true);
                return;
            }

            var pluginService = new pb.PluginService();
            pluginService.getSettings('oauth-pencilblue', function(err, oauthSettings) {

                for (var i = 0; i < oauthSettings.length; i++) {

                    switch (oauthSettings[i].name) {
                        case 'google_client_id':
                            credentials.google.clientID = oauthSettings[i].value;
                            break;

                        case 'google_client_secret':
                            credentials.google.clientSecret = oauthSettings[i].value;
                            break;

                        case 'facebook_client_id':
                            credentials.facebook.clientID = oauthSettings[i].value;
                            break;

                        case 'facebook_client_secret':
                            credentials.facebook.clientSecret = oauthSettings[i].value;
                            break;

                        default:
                            break;
                    }
                }
                if (credentials[self.provider].clientID === '') {
                    cb(new Error("clientId not found in configuration"), true);
                    return;
                }

                if (credentials[self.provider].clientSecret === '' ) {
                    cb(new Error("clientSecret not found in configuration"), true);
                    return;
                }
                self.credential = credentials[self.provider];
                self.oauth = oauth2(self.credential);
                cb(null, true);
            });
        }
        else {
            cb(null, true);
        }
    };

    OauthService.prototype.getAuthorizationUri = function(cb) {

        var self = this;
        this.getOauth(function(err, results) {
            if (util.isError(err)) {
                cb(err, results);
            }
            else {
                var url = self.oauth.authCode.authorizeURL({
                    redirect_uri: pb.config.siteRoot + '/oauth/' + self.provider + '/callback',
                    scope: 'email',
                    state: '3(#0/!~'
                });
                cb(null, url);
            }
        })
    };

    OauthService.prototype.getToken = function(code, cb) {

        var self = this;
        this.getOauth(function(err, result) {
            if (util.isError(err)) {
                cb(err, result);
            }
            else {
                self.oauth.authCode.getToken({
                    code: code,
                    redirect_uri: pb.config.siteRoot + '/oauth/' + self.provider + '/callback'
                }, cb);
            }
        });
    };

    OauthService.prototype.createToken = function(token, cb) {

        var self = this;
        this.getOauth(function(err, result) {
            if (util.isError(err)) {
                cb(err, result);
            }
            else {
                cb(null, self.oauth.accessToken.create(token));
            }
        });
    };

    OauthService.prototype.getInfos = function(token, cb) {

        var self = this;
        var options = {
            uri: this.credential.apiUser,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'user-agent' : 'me'
            }
        };

        request(options, function(err, result) {
            if (util.isError(err)) {
                cb(err, result);
            }
            else {
                var email = self.credential.getEmail(JSON.parse(result.body));
                if (email === null) {
                    cb(new Error('Wrong account'), true);
                }
                else {
                    cb(err, email);
                }
            }
        });

    };

    return OauthService;
};
