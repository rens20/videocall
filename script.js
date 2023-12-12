const PRE = "DELTA";
const SUF = "MEET";
var room_id;
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
var local_stream;
var screenStream;
var peer = null;
var currentPeer = null;
var screenSharing = false;
function createRoom() {
  console.log("Creating Room");
  let room = document.getElementById("room-input").value;
  if (room == " " || room == "") {
    alert("Please enter room number");
    return;
  }
  room_id = PRE + room + SUF;
  peer = new Peer(room_id);
  peer.on("open", (id) => {
    console.log("Peer Connected with ID: ", id);
    hideModal();
    getUserMedia(
      { video: true, audio: true },
      (stream) => {
        local_stream = stream;
        setLocalStream(local_stream);
      },
      (err) => {
        console.log(err);
      }
    );
    notify("Waiting to join.");
  });
  peer.on("call", (call) => {
    call.answer(local_stream);
    call.on("stream", (stream) => {
      setRemoteStream(stream);
    });
    currentPeer = call;
  });
}

function setLocalStream(stream) {
  let video = document.getElementById("local-video");
  video.srcObject = stream;

  // Wait for the loadedmetadata event before attempting to play
  video.addEventListener("loadedmetadata", () => {
    video.muted = true;
    video
      .play()
      .then(() => {
        console.log("Local video playback started successfully");
      })
      .catch((error) => {
        console.error("Error starting local video playback:", error);
      });
  });
}
/// video.muted = true;
// video.play();
function setRemoteStream(stream) {
  let video = document.getElementById("remote-video");
  video.srcObject = stream;
  video.play();
}

function hideModal() {
  document.getElementById("entry-modal").hidden = true;
}

function notify(msg) {
  let notification = document.getElementById("notification");
  notification.innerHTML = msg;
  notification.hidden = false;
  setTimeout(() => {
    notification.hidden = true;
  }, 3000);
}

function joinRoom() {
  console.log("Joining Room");
  let room = document.getElementById("room-input").value;
  if (room == " " || room == "") {
    alert("Please enter room number");
    return;
  }
  room_id = PRE + room + SUF;
  hideModal();
  peer = new Peer();
  peer.on("open", (id) => {
    console.log("Connected with Id: " + id);
    getUserMedia(
      { video: true, audio: true },
      (stream) => {
        local_stream = stream;
        setLocalStream(local_stream);
        notify("Joining room");
        let call = peer.call(room_id, stream);
        call.on("stream", (stream) => {
          setRemoteStream(stream);
        });
        currentPeer = call;
      },
      (err) => {
        console.log(err);
      }
    );
  });
}

function startScreenShare() {
  if (screenSharing) {
    stopScreenSharing();
  }
  navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
    screenStream = stream;
    let videoTrack = screenStream.getVideoTracks()[0];
    videoTrack.onended = () => {
      stopScreenSharing();
    };
    if (peer) {
      let sender = currentPeer.peerConnection.getSenders().find(function (s) {
        return s.track.kind == videoTrack.kind;
      });
      sender.replaceTrack(videoTrack);
      screenSharing = true;
    }
    console.log(screenStream);
  });
}

function stopScreenSharing() {
  if (!screenSharing) return;
  let videoTrack = local_stream.getVideoTracks()[0];
  if (peer) {
    let sender = currentPeer.peerConnection.getSenders().find(function (s) {
      return s.track.kind == videoTrack.kind;
    });
    sender.replaceTrack(videoTrack);
  }
  screenStream.getTracks().forEach(function (track) {
    track.stop();
  });
  screenSharing = false;
}

function startMicrophone() {
  // Toggle the microphone (mute/unmute)
  if (local_stream) {
    const audioTracks = local_stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled; // Toggle the track's enabled state
      });

      // Notify the user about the microphone state
      const notificationMsg = audioTracks[0].enabled
        ? "Microphone unmuted"
        : "Microphone muted";
      notify(notificationMsg);
    }
  }
}

function startLeave() {
  if (peer) {
    peer.disconnect();
    peer.destroy();
  }
  hideVideoElements();
  peer = new Peer();
  showEntryModal();
}
function hideVideoElements() {
  const localVideo = document.getElementById("local-video");
  const remoteVideo = document.getElementById("remote-video");
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  localVideo.style.display = "none";
  remoteVideo.style.display = "none";
}
