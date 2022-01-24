const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
        clientID: "186601439826-4ehd9k5b21qkpfli7os6mcfjpdmush0o.apps.googleusercontent.com",
        clientSecret: "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",
        callbackURL: "http://localhost:3000/login/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        return done(null, profile)
    }
));