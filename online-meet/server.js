const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const passport = require('passport');
const cookieSession = require('cookie-session')
const mongoose = require("mongoose");
const Meet = require("./models/Meet");
require("./passport-setup");

mongoose.connect("mongodb://localhost:27017/meet_db");

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(cookieSession({
    name: 'meet-session',
    keys: ['key1', 'key2']
}))
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.get('/', (req, res) => {
    res.render('home', { isLoggedin: req.session.isLoggedin, isMeetCodeValid: req.session.is_meet_code_valid });
})

app.get('/failed', (req, res) => res.send('Login failed'))

app.get('/login', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/login/callback', passport.authenticate('google', { failureRedirect: '/failed' }),
    function(req, res) {
        req.session.isLoggedin = true;
        res.redirect('/');
    });

app.get('/logout', (req, res) => {
    req.session.passport = null;
    req.session.isLoggedin = false;
    req.logOut();
    res.redirect('/');
})

app.post('/meet', async(req, res) => {
    let meet_code = Math.random().toString(36).slice(2);
    let is_meet_exist = await findMeet(meet_code);
    while (is_meet_exist == true) {
        meet_code = Math.random().toString(36).slice(2);
        is_meet_exist = await findMeet(meet_code);
    }
    const meet = new Meet({
        meet_code: meet_code,
        host_email: req.user.emails[0].value,
        host_fname: req.user.name.givenName,
        host_lname: req.user.name.familyName
    });
    createMeet(meet);
    res.redirect(`/${meet_code}`)
})

app.post('/join-meet', async(req, res) => {
    const meet_code = req.body.meet_code;
    let is_meet_exist = await findMeet(meet_code);
    if (is_meet_exist) {
        req.session.is_meet_code_valid = true;
        res.redirect(`/${meet_code}`);
    } else {
        req.session.is_meet_code_valid = false;
        res.redirect("/");
    }
});

app.get('/:meet', (req, res) => {
    if (req.session.isLoggedin) {
        res.render('meet', { meet_code: req.params.meet, name: req.user.displayName })
    } else {
        res.redirect("/")
    }
})

app.get('/leave/:meet', (req, res) => {
    res.render("leave-meet", { meet_code: req.params.meet });
})

io.on('connection', socket => {
    socket.on('join-meet', (meet_code, userId) => {
        socket.join(meet_code)
        socket.broadcast.to(meet_code).emit('user-connected', userId)

        socket.on('message', (message) => {
            io.to(meet_code).emit('createMessage', message)
        });

        socket.on('leave-meet', () => {
            socket.broadcast.to(meet_code).emit('user-disconnected', userId)
        })

        socket.on('disconnect', () => {
            socket.broadcast.to(meet_code).emit('user-disconnected', userId)
        })
    })
})

async function findMeet(meet_code) {
    const meet = await Meet.findOne({ meet_code: meet_code });
    if (meet != null) {
        return true;
    }
    return false;
}

async function createMeet(meet) {
    await Meet.create(meet);
}

server.listen(3000)