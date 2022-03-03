const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const passport = require('passport');
const cookieSession = require('cookie-session')
const mongoose = require("mongoose");
const Meet = require("./models/Meet");
const nodemailer = require('nodemailer');
require("./passport-setup");

let people = new Map();
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'onlinemeet157@gmail.com',
        pass: 'Online@123'
    }
})


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

app.get('/:meet', async(req, res) => {
    if (req.session.isLoggedin) {
        let meet = await findMeetHost(req.params.meet);
        res.render('meet', { meet_code: req.params.meet, name: req.user.displayName, email: req.user.emails[0].value, profile_img: req.user.photos[0].value, host_email: meet.host_email, host_name: meet.host_fname + " " + meet.host_lname })
    } else {
        res.redirect("/")
    }
})

io.on('connection', socket => {
    socket.on('join-meet', (meet_code, userId, name, email, profile_img) => {
        if (!people.get(meet_code).has(email)) {
            people.get(meet_code).set(email, [profile_img]);
        }
        people.get(meet_code).get(email).push(name);
        socket.join(meet_code)
        socket.broadcast.to(meet_code).emit('user-connected', userId)

        socket.on('message', (message) => {
            io.to(meet_code).emit('createMessage', message)
        });

        socket.on('request', async (email, name, profile_img) => {
            let is_authorized_email = await isAuthorizedEmail(meet_code, email);
            if(is_authorized_email == true)
            {
                io.to(meet_code).emit('authorized', email);
            }
            else
            {
                io.to(meet_code).emit('show-request', email, name, profile_img);
            }
        })

        socket.on('remove-request', (email) => {
            io.to(meet_code).emit('request-removed', email);
        })

        socket.on('do-authorization', (email, is_authorized_user) => {
            if (is_authorized_user) {
                io.to(meet_code).emit('authorized', email);
            } else {
                io.to(meet_code).emit('not-authorized', email);
            }
        })

        socket.on('view-people', (current_user_email) => {
            let people_map = people.get(meet_code);
            let people_list = [people_map.size];
            for (let i = 0; i < people_map.size; i++) {
                people_list[i] = []
            }
            let i = 0;
            people_map.forEach(function(value, key) {
                value.forEach(element => {
                    people_list[i].push(element);
                });
                i++;
            });

            io.to(meet_code).emit('people-list', people_list, current_user_email);
        })

        socket.on('authorize-person', async (email, host_email, host_name) => {
            await addAuthorizedEmail(meet_code, email);
            let mailOptions = {
                from: 'onlinemeet157@gmail.com',
                to: email,
                subject: 'Online Meet Invitation',
                text: `You are invited to ${host_name}'s meet.
Here is meet details:
    Host name: ${host_name}
    Host email: ${host_email}
    Meet code: ${meet_code}
                `
            }
            transporter.sendMail(mailOptions);
            socket.emit('person-authorized');
        })

        socket.on('leave-meet', (name, email) => {
            for (let i = 0; i < people.get(meet_code).get(email).length; i++) {
                if (people.get(meet_code).get(email)[i] == name) {
                    people.get(meet_code).get(email).splice(i, 1);
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

async function findMeetHost(meet_code) {
    const meet = await Meet.findOne({ meet_code: meet_code });
    if (meet != null) {
        return meet;
    }
    return "";
}

async function createMeet(meet) {
    await Meet.create(meet);
}

async function addAuthorizedEmail(meet_code, email) {
    const meet = await Meet.findOne({meet_code: meet_code});
    meet.authorized_emails.push(email);
    await Meet.updateOne({meet_code: meet_code}, {authorized_emails: meet.authorized_emails});
}

async function isAuthorizedEmail(meet_code, email){
    const meet = await Meet.findOne({meet_code: meet_code});
    if(meet.authorized_emails.indexOf(email) == -1)
    {
        return false;
    }
    return true;
}

server.listen(3000)