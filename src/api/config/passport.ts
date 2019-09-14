import Passport from "passport";
import * as PassportGithub from "passport-github";
import * as Config from "./index";

const mongoose = require('mongoose');
const UserModel = mongoose.model('User');


Passport.use(new PassportGithub.Strategy({
    clientID: Config.githubClientId,
    clientSecret: Config.githubClientSecret,
    callbackURL: Config.githubCallbackUrl
  },
  function(accessToken, refreshToken, profile, done) {
    UserModel.findOrCreate(
      { githubId: profile.id },
      // These fields can change so we can't search by them
      {
        username: profile.username,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
        accessToken: accessToken
      },
      function (err: any, user: any) {
        return done(err, user);
      });
    }
));


// Serialize by id
Passport.serializeUser(function(user: any, done) {
  done(null, user._id);
});


// Deserialize by id
Passport.deserializeUser(function(id: any, done: (err: any, user?: any) => void) {
  UserModel.findById(id)
  .then((usr: any) => done(null, usr))
  .catch((err: any) => done(err));
});
