const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const passport = require('passport');
const cookieSession = require('cookie-session')
require("./passport-setup");

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(cookieSession({
    name: 'meet-session',
    keys: ['key1', 'key2']
}))
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    res.render('home', { isLoggedin: req.session.isLoggedin });
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
    res.redirect('/')
})

app.post('/meet', (req, res) => {
    let meet_code = Math.random().toString(36).slice(2);
    res.redirect(`/${meet_code}`)
})

app.get('/:meet', (req, res) => {
    if (req.session.isLoggedin) {
        res.render('meet', { meet_code: req.params.meet, name: req.user.displayName })
    } else {
        res.redirect("/")
    }
})

io.on('connection', socket => {
    socket.on('join-meet', (meet_code, userId) => {
        socket.join(meet_code)
        socket.broadcast.to(meet_code).emit('user-connected', userId)

        socket.on('message', (message) => {
            io.to(meet_code).emit('createMessage', message)
        });

        socket.on('disconnect', () => {
            socket.broadcast.to(meet_code).emit('user-disconnected', userId)
        })
    })
})

server.listen(3000)