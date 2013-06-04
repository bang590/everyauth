var oauthModule = require('./oauth2')
  , querystring= require('querystring')
  , request = require('request');

var weibo = module.exports =
oauthModule.submodule('qq')
  .configurable({
    scope: "URL identifying the Tencent QQ service to be accessed. See the documentation for the API you\'d like to use for what scope to specify. To specify more than one scope, list each one separated with a space."
  })
  
  .oauthHost('https://graph.qq.com')
  .apiHost('https://graph.qq.com')

  .authPath('/oauth2.0/authorize')
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/oauth2.0/token')
  .accessTokenParam('grant_type', 'authorization_code')
  .postAccessTokenParamsVia('data')

  .accessTokenHttpMethod('post')
  .entryPath('/auth/qq')
  .callbackPath('/auth/qq/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .getAccessToken( function (code) {
    var p = this.Promise()
      , url = this._oauthHost + this._accessTokenPath
      , opts = { url: url };

    opts.form = {
        client_id: this._appId
      , redirect_uri: this._myHostname + this._callbackPath
      , code: code
      , client_secret: this._appSecret
      , grant_type: 'authorization_code'
    };
    request.post( opts, function(err, res, body){
      if (err) {
        p.fail(err);
      } else {
        var o = {}
        body.split('&').forEach(function(item){
          var param = item.split('=')
          o[param[0]] = param[1]
        })
        p.fulfill(o.access_token, o);
        delete o.access_token;
      }
    });
    return p;
  })
  .fetchOAuthUser( function (accessToken, extra) {
    var p = this.Promise();
    var url = this.apiHost() + "/oauth2.0/me";
    var self = this
    self.oauth.get(url, accessToken, function (err, openId) {
      if (err) {
        p.fail(err);
      }else{
        openId = JSON.parse(openId.replace('callback(', '').replace(');', ''))
        var infoUrl = self.apiHost() + '/user/get_user_info?openid=' + openId.openid + '&oauth_consumer_key=' + self._appId
        self.oauth.get(infoUrl, accessToken, function(err, user){
          if (err) p.fail(err)
          else {
            var user = JSON.parse(user)
            user.id = openId.openid
            p.fulfill(user)
          }
        })
      }
    });
    
    return p;
  })
  .moduleErrback( function (err, seqValues) {
    seqValues.res.redirect('/')
  })
  .convertErr( function (err) {
    return new Error(err.data ? err.data : err);
  });
