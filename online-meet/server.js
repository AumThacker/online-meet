const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
    let meet_code = Math.random().toString(36).slice(2);
    res.redirect(`/${meet_code}`)
})

app.get('/:meet', (req, res) => {
    res.render('meet', { meet_code: req.params.meet })
})

io.on('connection', socket => {
    socket.on('join-meet', (meet_code, userId) => {
        socket.join(meet_code)
        socket.broadcast.to(meet_code).emit('user-connected', userId)
    })
})

server.listen(3000)