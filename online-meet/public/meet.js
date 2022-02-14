const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
})
const myVideo = document.createElement('video')
let myVideoStream;
const peers = {}
let calls = [];
let screenStream;
let isScreenPresented = false;
document.getElementById("view_people").style.display = "none";
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

    // socket.on('screen-presented', () => {

    // })

    socket.on("createMessage", message => {
        $("#messages").append(`<li class="message"><b>${message.name}</b><br/>${message.msg}</li>`);
    })

    socket.on("people-list", (people, current_user_email) => {
        if (current_user_email == email)
        {
            for (let i = 0; i < people.length; i++) {
                for(let j=1; j<people[i].length;j++)
                {
                    $("#people_list").append(`<img src="${people[i][0]}"></img><li class="message">${people[i][j]}</li><br>`);
                }
            }
        }
    })
})
socket.on('user-disconnected', userId => {
    for (let index = 0; index < calls.length; index++) {
        if (peers[userId] == calls[index]) {
            calls.splice(index, 1)
        }
    }
    if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
    socket.emit('join-meet', meet_code, id, name, email, profile_img)
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
    calls.push(call)
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

const shareScreen = () => {
    navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
        const html = `
        <span class="material-icons" id="stop-presenting-icon">
            cancel_presentation
        </span>
        <span>Stop presenting</span>
        `
        document.querySelector('.present-screen-button').innerHTML = html;
        document.getElementsByClassName('present-screen-button')[0].setAttribute('onclick', "stopScreenSharing()")
        screenStream = stream;
        //        socket.emit('present-screen')
        document.getElementsByTagName('video')[0].srcObject = stream
        isScreenPresented = true;
        let videoTrack = screenStream.getVideoTracks()[0];
        videoTrack.onended = () => {
            stopScreenSharing()
        }
        if (myPeer) {
            calls.forEach(call => {
                call.peerConnection.getSenders().find(function (s) {
                    if (s.track.kind == videoTrack.kind) {
                        s.replaceTrack(videoTrack)
                    }
                })
            });
        }
    })
}
const stopScreenSharing = () => {
    const html = `
    <span class="material-icons" id="present-screen-icon">
    present_to_all
</span>
<span>Present screen</span>
    `
    document.querySelector('.present-screen-button').innerHTML = html;
    document.getElementsByClassName('present-screen-button')[0].setAttribute('onclick', "shareScreen()")
    document.getElementsByTagName('video')[0].srcObject = myVideoStream
    let videoTrack = myVideoStream.getVideoTracks()[0];
    isScreenPresented = false;
    if (myPeer) {
        calls.forEach(call => {
            call.peerConnection.getSenders().find(function (s) {
                if (s.track.kind == videoTrack.kind) {
                    s.replaceTrack(videoTrack)
                }
            })
        });
    }
    screenStream.getTracks().forEach(function (track) {
        track.stop();
    });
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
    <span class="material-icons" id="mic-off" >
        mic_off
    </span>
    <span>Unmute</span>
    `
    document.querySelector('.mic-button').innerHTML = html;
}

const turnOnMic = () => {
    const html = `
    <span class="material-icons" id="mic">
    mic
    </span>
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
    <span class="material-icons" id="videocam-off">
    videocam_off
    </span>
        <span>Play video</span>
    `
    document.querySelector('.video-button').innerHTML = html;
}

const turnOnVideo = () => {
    const html = `
    <span class="material-icons" id = "videocam">
    videocam
    </span>
        <span>Stop video</span>
    `
    document.querySelector('.video-button').innerHTML = html;
}

const sendMessage = () => {
    let message = {
        name: name,
        msg: document.getElementById('chat_message').value
    };
    if (message.msg != "") {
        socket.emit('message', message);
        document.getElementById('chat_message').value = "";
    }
}

const chat = () => {
    document.getElementById("view_people").style.display = "none";
    document.getElementById("chat").style.display = "inline";
}

const viewPeople = () => {
    document.getElementById("chat").style.display = "none";
    document.getElementById("view_people").style.display = "inline";
    document.getElementById("people_list").innerHTML = "";
    socket.emit("view-people", email);
}

const leaveMeet = () => {
    socket.emit("leave-meet", name, email);
    let form = document.getElementById("leave-form");
    form.action = `/leave/${meet_code}`;
}