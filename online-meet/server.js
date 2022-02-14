const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const passport = require('passport');
const cookieSession = require('cookie-session')
const mongoose = require("mongoose");
const Meet = require("./models/Meet");
require("./passport-setup");
let people = new Map();
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
        console.log(req.user.photos[0].value);
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

    people.set(meet_code, new Map());
    
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
        res.render('meet', { meet_code: req.params.meet, name: req.user.displayName, email: req.user.emails[0].value, profile_img: req.user.photos[0].value })
    } else {
        res.redirect("/")
    }
})

app.get('/leave/:meet', (req, res) => {
    res.render("leave-meet", { meet_code: req.params.meet });
})

io.on('connection', socket => {
    
    socket.on('join-meet', (meet_code, userId, name, email, profile_img) => {
        if(!people.get(meet_code).has(email))
        {
            people.get(meet_code).set(email, [profile_img]);
        }
        people.get(meet_code).get(email).push(name);
        socket.join(meet_code)
        socket.broadcast.to(meet_code).emit('user-connected', userId)

        // socket.on('present-screen', () => {
        //     socket.broadcast.to(meet_code).emit('screen-presented')
        // })

        socket.on('message', (message) => {
            io.to(meet_code).emit('createMessage', message)
        });

        socket.on('view-people', (current_user_email) => {
            let people_map = people.get(meet_code);
            let people_list = [people_map.size];
            for (let i = 0; i < people_map.size; i++) {
                people_list[i] = []   
            }
            let i = 0;
            people_map.forEach(function(value, key){
                value.forEach(element => {
                    people_list[i].push(element);
                });
                i++;
            });

            io.to(meet_code).emit('people-list', people_list, current_user_email);
        })

        socket.on('leave-meet', (name, email) => {
            for (let i = 0; i < people.get(meet_code).get(email).length; i++) {
                if(people.get(meet_code).get(email)[i]==name )
                {
                    people.get(meet_code).get(email).splice(i,1);
                    break;
                }
            }
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