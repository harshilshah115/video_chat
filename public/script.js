const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');
const disconnectButton = document.getElementById('disconnectButton');

const socket = io('https://videochat-teal.vercel.app/', {
  transports: ['websocket', 'polling'], // Ensure both transports are allowed
  secure: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});
let peerConnection;

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function startLocalVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

async function createOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    } catch (error) {
        console.error('Error creating offer.', error);
    }
}




socket.on('offer', async (offer) => {
    if (!peerConnection) initializePeerConnection();
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    } catch (error) {
        console.error('Error handling offer.', error);
    }
});

socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error('Error handling answer.', error);
    }
});

socket.on('candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('Error adding received ice candidate', error);
    }
});

// Handle user disconnect event
socket.on('user-disconnected', () => {
    closeRemoteVideo();
});

function handleIceCandidate(event) {
    if (event.candidate) {
        socket.emit('candidate', event.candidate);
    }
}

function handleTrackEvent(event) {
    remoteVideo.srcObject = event.streams[0];
}

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.ontrack = handleTrackEvent;
}

function closeLocalVideoCall() {
    if (peerConnection) {
        // Stop all local media tracks
        const localStream = localVideo.srcObject;
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        // Close the peer connection
        peerConnection.close();
        peerConnection = null;
    }
    // Reset the video element
    localVideo.srcObject = null;
}

function closeRemoteVideo() {
    // Stop all remote media tracks
    const remoteStream = remoteVideo.srcObject;
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }
    // Reset the video element
    remoteVideo.srcObject = null;
}

// Event listener for the call button
callButton.addEventListener('click', async () => {
    if (!peerConnection) initializePeerConnection();
    await startLocalVideo();
    await createOffer();
});

// Event listener for the disconnect button
disconnectButton.addEventListener('click', () => {
    socket.emit('user-disconnected');
    closeLocalVideoCall();
    alert('You have disconnected from the call.');
    window.location.reload(); // Auto refresh the page
});
