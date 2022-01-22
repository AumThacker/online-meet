const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
})
const myVideo = document.createElement('video')
let myVideoStream;
const peers = {}
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myVideoStream = stream
    addVideoStream(myVideo, stream)
    myPeer.on('call', call => {
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream)
        })
    })
    socket.on('user-connected', userId => {
        // connectToNewUser(userId, stream)
        setTimeout(connectToNewUser, 3000, userId, stream);
    })
    socket.on("createMessage", message => {
        $("ul").append(`<li class="message"><b>user</b><br/>${message}</li>`);
    })
})
socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
    socket.emit('join-meet', meet_code, id)
})

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        video.remove()
    })
    peers[userId] = call
}
function addVideoStream(video, stream) {
    stream.getVideoTracks()[0].enabled = false;
    stream.getAudioTracks()[0].enabled = false;
    video.srcObject = myVideoStream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video);
}

const micOnOff = () => {
    let enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getAudioTracks()[0].enabled = false;
        turnOffMic();
    } else {
        turnOnMic();
        myVideoStream.getAudioTracks()[0].enabled = true;
    }
}

const turnOffMic = () => {
    const html = `
    <i class="bi bi-mic-mute-fill"></i>
    `
    document.querySelector('.mic-icon').innerHTML = html;
}

const turnOnMic = () => {
    const html = `
    <i class="bi bi-mic-fill"></i>
    `
    document.querySelector('.mic-icon').innerHTML = html;
}

const videoOnOff = () => {
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        turnOffVideo();
    } else {
        turnOnVideo();
        myVideoStream.getVideoTracks()[0].enabled = true;
    }
}

const turnOffVideo = () => {
    const html = `
    <i class="bi bi-camera-video-off-fill"></i>
    `
    document.querySelector('.video-icon').innerHTML = html;
}

const turnOnVideo = () => {
    const html = `
    <i class="bi bi-camera-video-fill"></i>
    `
    document.querySelector('.video-icon').innerHTML = html;
}

const sendMessage = () => {
    let message = document.getElementById('chat_message').value;
    socket.emit('message', message);
    document.getElementById('chat_message').value = "";
    
}