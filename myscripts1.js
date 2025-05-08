class PeerApp {
    constructor() {
           this.elements = {
                     startCallButton: document.getElementById('startCallButton'),
                     endCallButton: document.getElementById('endCallButton'),
                     localVideo: document.getElementById('localVideo'),
                     remoteVideo: document.getElementById('remoteVideo'),
                     remoteVideoContainer: document.getElementById('remoteVideoContainer'),
                     videosContainer: document.getElementById('videosContainer'),
                     myPeerIdSpan: document.getElementById('myPeerId'),
                     copyPeerIdBtn: document.getElementById('copyPeerId'),
                     peerIdInput: document.getElementById('peerIdInput'),
                     toggleAudioButton: document.getElementById('toggleAudioButton'),
                     toggleVideoButton: document.getElementById('toggleVideoButton'),

                     callInit: document.getElementById('callInit'),
                     callOptionsModal: document.getElementById('callOptionsModal'),
                     optionChat: document.getElementById('optionChat'),
                     optionAudio: document.getElementById('optionAudio'),
                     optionVideo: document.getElementById('optionVideo'),
                     chatContainer: document.getElementById('chatContainer'),
                     chatMessages: document.getElementById('chatMessages'),
                     chatInput: document.getElementById('chatInput'),
                     sendChatButton: document.getElementById('sendChatButton'),
                     incomingCallModal: document.getElementById('incomingCallModal'),
                     incomingCallType: document.getElementById('incomingCallType'),
                     acceptCallBtn: document.getElementById('acceptCallBtn'),
                     rejectCallBtn: document.getElementById('rejectCallBtn'),
                     connectedPeersSpan: document.getElementById('connectedPeers'),
                     disconnectBtn: document.getElementById('disconnectBtn'),
                     chatInputContainer: document.querySelector('.chat-input-container'),
                     newPeerId: document.getElementById('newPeerId')
                 };

        this.state = {
            myPeerId: generateRandomPeerId(),
            localStream: null,
            peerConnection: null,
            audioEnabled: true,
            videoEnabled: false,
            connectedPeers: [],
            pendingCall: null,
            currentChatConn: null
        };

        this.init();
    }

    init() {
        this.peer = new Peer(this.state.myPeerId);
        console.log('[PeerJS] Initialized with ID:', this.state.myPeerId);

        this.elements.myPeerIdSpan.textContent = this.state.myPeerId;
        this.setConnectedUI(false);

        this.getUserMedia({ video: false, audio: true })
            .then(stream => this.setLocalStream(stream))
            .catch(error => console.error('[Media] Access error:', error));

        this.setupEventListeners();
    }

    async getUserMedia(constraints) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.error('[Media] Error:', error);
            throw error;
        }
    }

    setLocalStream(stream) {
        this.state.localStream = stream;
        if (this.elements.localVideo) {
            this.elements.localVideo.srcObject = stream;
        }
        console.log('[Media] Local stream set.');
    }

    updateConnectedPeers(peerId, add) {
        const peers = this.state.connectedPeers;
        if (add && !peers.includes(peerId)) {
            peers.push(peerId);
        } else if (!add) {
            this.state.connectedPeers = peers.filter(id => id !== peerId);
        }

        this.elements.connectedPeersSpan.textContent = peers.length
            ? `Connected Peers: ${peers.join(', ')}`
            : 'Connected Peers: None';
    }

    setCallUIActive(active) {
        const { startCallButton, peerIdInput, callInit } = this.elements;
        startCallButton.disabled = active;
        peerIdInput.disabled = active;

        startCallButton.classList.toggle('disabled', active);
        peerIdInput.classList.toggle('disabled', active);
        callInit.classList.toggle('hide', active);
    }

    setConnectedUI(connected) {
        const { disconnectBtn, chatInputContainer, endCallButton } = this.elements;
        disconnectBtn.style.display = connected ? '' : 'none';
        chatInputContainer.style.display = connected ? '' : 'none';
        endCallButton.style.display = connected ? '' : 'none';
    }

    async startCall(peerId, type) {
        try {
            this.setCallUIActive(true);
            this.elements.videosContainer.classList.add('active');
            this.elements.endCallButton.classList.add('active');

            const constraints = { audio: true, video: type === 'video' };
            const stream = await this.getUserMedia(constraints);
            this.setLocalStream(stream);

            const call = this.peer.call(peerId, stream);
            this.state.peerConnection = call;
            this.updateConnectedPeers(peerId, true);

            call.on('stream', remoteStream => {
                this.elements.remoteVideo.srcObject = remoteStream;
                this.elements.remoteVideoContainer.classList.add('active');
            });

            call.on('close', () => this.endCall());

            this.setConnectedUI(true);
            return call;
        } catch (error) {
            console.error('[Call] Failed to start:', error);
            this.endCall();
        }
    }

    async answerCall() {
        if (!this.state.pendingCall) return;

        try {
            this.elements.incomingCallModal.classList.remove('active');
            this.setCallUIActive(true);
            this.elements.videosContainer.classList.add('active');
            this.elements.endCallButton.classList.add('active');

            const callType = this.state.pendingCall.metadata?.type;
            const needVideo = callType === 'video';
            const currentStream = this.state.localStream;

            if (!currentStream || (needVideo && !currentStream.getVideoTracks().length)) {
                const stream = await this.getUserMedia({ audio: true, video: needVideo });
                this.setLocalStream(stream);
            }

            this.state.pendingCall.answer(this.state.localStream);
            this.state.peerConnection = this.state.pendingCall;
            this.updateConnectedPeers(this.state.pendingCall.peer, true);

            this.state.pendingCall.on('stream', remoteStream => {
                this.elements.remoteVideo.srcObject = remoteStream;
                this.elements.remoteVideoContainer.classList.add('active');
            });

            this.state.pendingCall.on('close', () => this.endCall());

            this.setConnectedUI(true);
            this.state.pendingCall = null;
        } catch (error) {
            console.error('[Call] Error answering:', error);
            this.endCall();
        }
    }

    endCall() {
        if (this.state.peerConnection) this.state.peerConnection.close();
        if (this.state.currentChatConn) this.state.currentChatConn.close();

        this.state.peerConnection = null;
        this.state.currentChatConn = null;

        this.elements.remoteVideo.srcObject = null;
        this.elements.remoteVideoContainer.classList.remove('active');
        this.elements.videosContainer.classList.remove('active');
        this.elements.endCallButton.classList.remove('active');
        this.elements.chatContainer.classList.remove('active');

        this.setCallUIActive(false);
        this.setConnectedUI(false);
        this.state.connectedPeers = [];
        this.elements.connectedPeersSpan.textContent = 'Connected Peers: None';

        this.resetAppState();
    }

    resetAppState() {
        console.log('[App] Resetting UI state...');
        // Add reset logic if needed (clear inputs, toggle states, etc.)
    }

    appendChatMessage(sender, message) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        if (sender === 'You') msgDiv.classList.add('outgoing');
        if (sender === 'Peer') msgDiv.classList.add('incoming');
        if (sender === 'System') {
            msgDiv.style.textAlign = 'center';
            msgDiv.style.color = '#888';
        }

        const messageContent = document.createElement('div');
        messageContent.textContent = message;

        const metadata = document.createElement('span');
        metadata.classList.add('metadata');

        const now = new Date();
        const timeString = now.toTimeString().slice(0, 5); // HH:MM
        if (sender === 'You') {
            metadata.innerHTML = `${timeString} <span class="ticks">✔✔</span>`;
        } else if (sender === 'Peer') {
            metadata.innerHTML = `${timeString}`;
        }

        msgDiv.appendChild(messageContent);
        if (sender === 'You' || sender === 'Peer') {
            msgDiv.appendChild(metadata);
        }

        this.elements.chatMessages.appendChild(msgDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;

        if (sender === 'System' && message === 'Chat ended.') {
            this.elements.chatContainer.classList.remove('active');
            this.setCallUIActive(false);
        }
    }
}
