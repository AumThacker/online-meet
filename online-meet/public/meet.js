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
        $("ul").append(`<li class="message"><b>${message.name}</b><br/>${message.msg}</li>`);
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
    myVideoStream.getVideoTracks()[0].enabled = false;
    myVideoStream.getAudioTracks()[0].enabled = false;
    video.srcObject = stream
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
        <i class='fas fa-microphone-slash'></i>
        <span>Unmute</span>
    `
    document.querySelector('.mic-button').innerHTML = html;
}

const turnOnMic = () => {
    const html = `
        <i class='fas fa-microphone'></i>
        <span>Mute</span>
    `
    document.querySelector('.mic-button').innerHTML = html;
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
        <i class="fas fa-video-slash"></i>
        <span>Play video</span>
    `
    document.querySelector('.video-button').innerHTML = html;
}

const turnOnVideo = () => {
    const html = `
        <i class="fas fa-video"></i>
        <span>Stop video</span>
    `
    document.querySelector('.video-button').innerHTML = html;
}

const sendMessage = () => {
    let message = {
        name: name,
        msg: document.getElementById('chat_message').value
    };
    // if (message.msg != "") {
    socket.emit('message', message);
    document.getElementById('chat_message').value = "";
    // }
}

const leaveMeet = () => {
    console.log("hello")
    socket.emit("leave-meet");
    let form = document.getElementById("leave-form");
    form.action = `/leave/${meet_code}`;
}