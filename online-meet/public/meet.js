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
let people_list;

$("#view_people").hide();
$("#view_requests").hide();
$(".main").hide();
$(".request_main_page").show();
$("#add-person-suc-msg").hide();
$("#add-person-fail-msg").hide();

socket.on('show-request', (requesting_user_email, requesting_user_name, requesting_user_profile_img) => {
    if (email == host_email) {
        document.getElementsByClassName("view-requests-button")[0].click();
        const html = `
            <img id="${requesting_user_email}" src='${requesting_user_profile_img}'></img>
            <li id="${requesting_user_email}">${requesting_user_name}
                <button class="btn btn-outline-primary" onclick="join('${requesting_user_email}')">Join</button>
                <button class="btn btn-outline-danger" onclick="cancel('${requesting_user_email}')">Cancel</button>
            </li>
        `
        $("#request_list").append(html);
    }
})

socket.on('not-authorized', (not_authorized_email) => {
    if (email == not_authorized_email) {
        $(".main").hide();
        $(".request_main_page").show();
        document.getElementsByClassName("leave-button")[0].click();
    }
    if (email == host_email) {
        while (!!document.getElementById(`${not_authorized_email}`)) {
            document.getElementById(`${not_authorized_email}`).remove();
        }
    }
})

socket.on('authorized', (authorized_email) => {
    if (email == authorized_email) {
        $(".main").show();
        $(".request_main_page").hide();
    }
    if (email == host_email) {
        while (!!document.getElementById(`${authorized_email}`)) {
            document.getElementById(`${authorized_email}`).remove();
        }
    }
})

socket.on('request-removed', (requested_email) => {
    if (email == host_email) {
        if (!!document.getElementById(`${requested_email}`)) {
            document.getElementById(`${requested_email}`).remove();
        }
    }
})

socket.on('person-authorized', () => {
    $("#email").val("");
    $("#add-person-suc-msg").show();
    setTimeout(() => {
        $("#add-person-suc-msg").hide();
    }, 3000);
})

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
        if (current_user_email == email) {
            people_list = people;
            for (let i = 0; i < people.length; i++) {
                for (let j = 1; j < people[i].length; j++) {
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

myPeer.on('open', id => {
    socket.emit('join-meet', meet_code, id, name, email, profile_img)
    if (email != host_email) {
        socket.emit('request', email, name, profile_img);
    }
    if (email == host_email) {
        socket.emit('do-authorization', host_email, true);
    }
})

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
    $("#view_people").hide();
    $("#view_requests").hide();
    $("#chat").show();
}

const viewPeople = () => {
    $("#view_people").show();
    $("#view_requests").hide();
    $("#chat").hide();
    document.getElementById("people_list").innerHTML = "";
    if (email == host_email) {
        document.getElementsByClassName("main__people_window")[0].style.height = "76vh";
        document.getElementsByClassName("main__people_window")[0].style.maxHeight = "76vh";
        if (!!document.getElementById("attendance_btn") == false) {
            $("#view_people").append('<button class="btn btn-outline-primary" id="attendance_btn" onclick="takeAttendance()">Take Attendance</button>')
        }
    }
    socket.emit("view-people", email);
}

const authorizePerson = () => {
    if($("#email").val() != "")
    {
        socket.emit("authorize-person", $("#email").val(), host_email, host_name);
    }
    else
    {
        $("#add-person-fail-msg").show();
        setTimeout(() => {
            $("#add-person-fail-msg").hide();
        }, 3000);
    }
}

const viewRequests = () => {
    $("#view_people").hide();
    $("#chat").hide();
    $("#view_requests").show();
}

const join = (requesting_user_email) => {
    socket.emit('do-authorization', requesting_user_email, true);
}

const cancel = (requesting_user_email) => {
    socket.emit('do-authorization', requesting_user_email, false);
}

const takeAttendance = () => {
    let people = $("#people_list").html();
    let printWindow = window.open('', '', 'height=600,width=1000');
    printWindow.document.write('<html><head><title>People List</title>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(people);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

const leaveMeetFromRequest = () => {
    socket.emit("leave-meet", name, email);
    socket.emit("remove-request", email);
    document.getElementById("leave-form-from-request").action = `/leave/${meet_code}`;
}

const leaveMeet = () => {
    socket.emit("leave-meet", name, email);
    document.getElementById("leave-form").action = `/leave/${meet_code}`;
}