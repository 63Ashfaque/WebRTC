        function generateRandomPeerId() {
            return Math.floor(1000 + Math.random() * 9000).toString();
        }
        const startCallButton = document.getElementById('startCallButton');
        const endCallButton = document.getElementById('endCallButton');
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const remoteVideoContainer = document.getElementById('remoteVideoContainer');
        const videosContainer = document.getElementById('videosContainer');
        const myPeerIdSpan = document.getElementById('myPeerId');
        const copyPeerIdBtn = document.getElementById('copyPeerId');
        const peerIdInput = document.getElementById('peerIdInput');
        const toggleAudioButton = document.getElementById('toggleAudioButton');
        const toggleVideoButton = document.getElementById('toggleVideoButton');
        const mediaToggles = document.getElementById('mediaToggles');
        const callInit = document.getElementById('callInit');
        // Modal and chat
        const callOptionsModal = document.getElementById('callOptionsModal');
        const optionChat = document.getElementById('optionChat');
        const optionAudio = document.getElementById('optionAudio');
        const optionVideo = document.getElementById('optionVideo');
        const chatContainer = document.getElementById('chatContainer');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const sendChatButton = document.getElementById('sendChatButton');
        // Incoming call dialog
        const incomingCallModal = document.getElementById('incomingCallModal');
        const incomingCallType = document.getElementById('incomingCallType');
        const acceptCallBtn = document.getElementById('acceptCallBtn');
        const rejectCallBtn = document.getElementById('rejectCallBtn');
        let pendingCall = null;

        // Generate and assign a 4-digit Peer ID
        var myPeerId = generateRandomPeerId();
        myPeerIdSpan.textContent = myPeerId;
        console.log('[PeerJS] Generated Peer ID:', myPeerId);

        const peer = new Peer(myPeerId);  // Use the 4-digit Peer ID
        console.log('[PeerJS] Peer instance created with ID:', myPeerId);
        let localStream;
        let peerConnection;
        let audioEnabled = true;
        let videoEnabled = false;

        // By default, only request audio
        console.log('[Media] Requesting audio stream (no video)...');
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            .then(stream => {
                localStream = stream;
                localVideo.srcObject = stream;
                console.log('[Media] Audio stream obtained and assigned to localVideo.');
            })
            .catch(error => {
                console.error('[Media] Error accessing media devices.', error);
            });

        function setCallUIActive(active) {
            startCallButton.disabled = active;
            peerIdInput.disabled = active;
            if (active) {
                startCallButton.classList.add('disabled');
                peerIdInput.classList.add('disabled');
                callInit.classList.add('hide');
            } else {
                startCallButton.classList.remove('disabled');
                peerIdInput.classList.remove('disabled');
                callInit.classList.remove('hide');
            }
            console.log('[UI] Start Call button and Peer ID input', active ? 'disabled' : 'enabled');
        }

        // Track connected peer IDs
        let connectedPeers = [];
        const connectedPeersSpan = document.getElementById('connectedPeers');
        function updateConnectedPeers(peerId, add) {
            if (add) {
                if (!connectedPeers.includes(peerId)) connectedPeers.push(peerId);
            } else {
                connectedPeers = connectedPeers.filter(id => id !== peerId);
            }
            connectedPeersSpan.textContent = connectedPeers.length
                ? `Connected Peers: ${connectedPeers.join(', ')}`
                : 'Connected Peers: None';
        }

        // Handle incoming calls with accept/reject dialog
        peer.on('call', call => {
            console.log('[PeerJS] Incoming call received. Waiting for user to accept.');
            pendingCall = call;
            // Try to detect call type (audio/video)
            let type = 'Audio/Video Call';
            if (call.metadata && call.metadata.type) {
                type = call.metadata.type.charAt(0).toUpperCase() + call.metadata.type.slice(1) + ' Call';
            }
            incomingCallType.textContent = type;
            incomingCallModal.classList.add('active');
            call.on('close', () => { updateConnectedPeers(call.peer, false); });
        });

        acceptCallBtn.addEventListener('click', () => {
            if (!pendingCall) return;
            incomingCallModal.classList.remove('active');
            setCallUIActive(true);
            videosContainer.classList.add('active');
            endCallButton.classList.add('active');
            pendingCall.answer(localStream);  // Answer with the local stream
            peerConnection = pendingCall;
            updateConnectedPeers(pendingCall.peer, true);
            pendingCall.on('stream', remoteStream => {
                remoteVideo.srcObject = remoteStream;  // Display remote stream
                remoteVideoContainer.classList.add('active');
                mediaToggles.classList.add('active');
                console.log('[PeerJS] Remote stream received and assigned to remoteVideo.');
            });
            pendingCall.on('close', () => {
                remoteVideo.srcObject = null;
                remoteVideoContainer.classList.remove('active');
                mediaToggles.classList.remove('active');
                videosContainer.classList.remove('active');
                endCallButton.classList.remove('active');
                setCallUIActive(false);
                console.log('[PeerJS] Call closed. Remote video cleared.');
                updateConnectedPeers(pendingCall.peer, false);
            });
            pendingCall = null;
        });

        rejectCallBtn.addEventListener('click', () => {
            if (!pendingCall) return;
            incomingCallModal.classList.remove('active');
            // Close the call without answering
            try { pendingCall.close(); } catch (e) {}
            pendingCall = null;
        });

        // Start a call
        startCallButton.addEventListener('click', () => {
            const peerId = peerIdInput.value.trim();
            console.log('[UI] Start Call button clicked. Target Peer ID:', peerId);
            if (peerId) {
                // Show call options modal
                callOptionsModal.classList.add('active');
                // Store peerId for use in option handlers
                callOptionsModal.dataset.peerId = peerId;
            } else {
                peerIdInput.focus();
                console.log('[UI] No Peer ID entered. Input focused.');
            }
        });

        // Call Option Handlers
        optionChat.addEventListener('click', () => {
            callOptionsModal.classList.remove('active');
            setCallUIActive(true);
            chatContainer.classList.add('active');
            endCallButton.classList.add('active');
            videosContainer.classList.remove('active');
            mediaToggles.classList.remove('active');
            // Setup PeerJS data connection
            const peerId = callOptionsModal.dataset.peerId;
            const conn = peer.connect(peerId);
            window.currentChatConn = conn;
            updateConnectedPeers(peerId, true);
            conn.on('open', () => {
                console.log('[Chat] Data connection opened.');
            });
            conn.on('data', data => {
                appendChatMessage('Peer', data);
            });
            conn.on('close', () => {
                appendChatMessage('System', 'Chat ended.');
                updateConnectedPeers(peerId, false);
            });
        });

        optionAudio.addEventListener('click', () => {
            callOptionsModal.classList.remove('active');
            setCallUIActive(true);
            videosContainer.classList.add('active');
            endCallButton.classList.add('active');
            mediaToggles.classList.add('active');
            // Start audio call
            const peerId = callOptionsModal.dataset.peerId;
            navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(stream => {
                localStream = stream;
                localVideo.srcObject = stream;
                const call = peer.call(peerId, stream);
                peerConnection = call;
                updateConnectedPeers(peerId, true);
                call.on('stream', remoteStream => {
                    remoteVideo.srcObject = remoteStream;
                    remoteVideoContainer.classList.add('active');
                    mediaToggles.classList.add('active');
                });
                call.on('close', () => {
                    remoteVideo.srcObject = null;
                    remoteVideoContainer.classList.remove('active');
                    mediaToggles.classList.remove('active');
                    videosContainer.classList.remove('active');
                    endCallButton.classList.remove('active');
                    setCallUIActive(false);
                    updateConnectedPeers(peerId, false);
                });
            });
        });

        optionVideo.addEventListener('click', () => {
            callOptionsModal.classList.remove('active');
            setCallUIActive(true);
            videosContainer.classList.add('active');
            endCallButton.classList.add('active');
            mediaToggles.classList.add('active');
            // Start video call
            const peerId = callOptionsModal.dataset.peerId;
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                localStream = stream;
                localVideo.srcObject = stream;
                const call = peer.call(peerId, stream);
                peerConnection = call;
                updateConnectedPeers(peerId, true);
                call.on('stream', remoteStream => {
                    remoteVideo.srcObject = remoteStream;
                    remoteVideoContainer.classList.add('active');
                    mediaToggles.classList.add('active');
                });
                call.on('close', () => {
                    remoteVideo.srcObject = null;
                    remoteVideoContainer.classList.remove('active');
                    mediaToggles.classList.remove('active');
                    videosContainer.classList.remove('active');
                    endCallButton.classList.remove('active');
                    setCallUIActive(false);
                    updateConnectedPeers(peerId, false);
                });
            });
        });

        // Chat UI logic
        function appendChatMessage(sender, message) {
            const msgDiv = document.createElement('div');
            msgDiv.classList.add('message');
            if (sender === 'You') {
                msgDiv.classList.add('outgoing');
                msgDiv.textContent = message;
            } else if (sender === 'Peer') {
                msgDiv.classList.add('incoming');
                msgDiv.textContent = message;
            } else if (sender === 'System') {
                msgDiv.style.textAlign = 'center';
                msgDiv.style.color = '#888';
                msgDiv.textContent = message;
            } else {
                msgDiv.textContent = `${sender}: ${message}`;
            }
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            if (sender === 'System' && message === 'Chat ended.') {
                chatContainer.classList.remove('active');
                setCallUIActive(false);
            }
        }
        sendChatButton.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') sendChatMessage();
        });
        function sendChatMessage() {
            const msg = chatInput.value.trim();
            if (!msg || !window.currentChatConn) return;
            window.currentChatConn.send(msg);
            appendChatMessage('You', msg);
            chatInput.value = '';
        }

        // Handle incoming data connections
        peer.on('connection', conn => {
            window.currentChatConn = conn;
            chatContainer.classList.add('active');
            setCallUIActive(true);
            endCallButton.classList.add('active');
            updateConnectedPeers(conn.peer, true);
            conn.on('data', data => {
                appendChatMessage('Peer', data);
            });
            conn.on('close', () => {
                appendChatMessage('System', 'Chat ended.');
                updateConnectedPeers(conn.peer, false);
            });
        });

        // End the call
        endCallButton.addEventListener('click', () => {
            console.log('[UI] End Call button clicked.');
            if (peerConnection) {
                peerConnection.close();
                console.log('[PeerJS] Peer connection closed.');
            }
            if (window.currentChatConn) {
                window.currentChatConn.close();
                window.currentChatConn = null;
            }
            remoteVideo.srcObject = null;
            remoteVideoContainer.classList.remove('active');
            mediaToggles.classList.remove('active');
            videosContainer.classList.remove('active');
            endCallButton.classList.remove('active');
            chatContainer.classList.remove('active');
            setCallUIActive(false);
            console.log('[UI] Remote video cleared.');
        });

        // Copy Peer ID to clipboard
        copyPeerIdBtn.addEventListener('click', () => {
            const id = myPeerIdSpan.textContent;
            navigator.clipboard.writeText(id);
            copyPeerIdBtn.textContent = '✅';
            setTimeout(() => copyPeerIdBtn.textContent = '📋', 1000);
            console.log('[UI] Peer ID copied to clipboard:', id);
        });
        newPeerId.addEventListener('click', () => {
        
             myPeerId = generateRandomPeerId();
            myPeerIdSpan.textContent = myPeerId;
            console.log('[UI] New Peer ID generated:', myPeerId);
        });

        // Toggle Audio
        toggleAudioButton.addEventListener('click', () => {
            if (!localStream) return;
            audioEnabled = !audioEnabled;
            localStream.getAudioTracks().forEach(track => {
                track.enabled = audioEnabled;
            });
            toggleAudioButton.textContent = audioEnabled ? '🔊 Audio On' : '🔇 Audio Off';
            console.log('[UI] Audio', audioEnabled ? 'enabled' : 'muted');
        });

        // Toggle Video
        toggleVideoButton.addEventListener('click', async () => {
            if (!localStream) return;
            if (!videoEnabled) {
                // Enable video: get video track and add to stream
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const videoTrack = videoStream.getVideoTracks()[0];
                    localStream.addTrack(videoTrack);
                    localVideo.srcObject = localStream;
                    videoEnabled = true;
                    toggleVideoButton.textContent = '🎥 Video On';
                    console.log('[UI] Video enabled');
                } catch (err) {
                    console.error('[Media] Error enabling video:', err);
                }
            } else {
                // Disable video: remove video track from stream
                localStream.getVideoTracks().forEach(track => {
                    track.stop();
                    localStream.removeTrack(track);
                });
                localVideo.srcObject = localStream;
                videoEnabled = false;
                toggleVideoButton.textContent = '🎥 Video Off';
                console.log('[UI] Video disabled');
            }
        });

        // Add references for header call buttons and disconnect
        // const videoCallBtn = document.getElementById('videoCallBtn');
        // const audioCallBtn = document.getElementById('audioCallBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const chatInputContainer = document.querySelector('.chat-input-container');

        // Show/hide all call/chat options based on connection state
        function setConnectedUI(connected) {
            // Header call buttons
            // videoCallBtn.style.display = connected ? '' : 'none';
            // audioCallBtn.style.display = connected ? '' : 'none';
            disconnectBtn.style.display = connected ? '' : 'none';
            // Chat input
            chatInputContainer.style.display = connected ? '' : 'none';
            // Media toggles
            mediaToggles.style.display = connected ? '' : 'none';
            // End call button
            endCallButton.style.display = connected ? '' : 'none';
        }
        // Hide all options initially
        setConnectedUI(false);

        // Toast notification logic
        const toast = document.getElementById('toast');
        function showToast(message) {
            toast.textContent = message;
            toast.style.opacity = '1';
            setTimeout(() => {
                toast.style.opacity = '0';
            }, 2000);
        }

        // When a connection is established (chat or call), show options
        function onConnected() {
            setConnectedUI(true);
            showToast('Connected!');
        }
        // When disconnected, hide options
        function onDisconnected() {
            setConnectedUI(false);
        }

        // Example: After chat connection open
        optionChat.addEventListener('click', () => {
            callOptionsModal.classList.remove('active');
            setCallUIActive(true);
            chatContainer.classList.add('active');
            endCallButton.classList.add('active');
            videosContainer.classList.remove('active');
            mediaToggles.classList.remove('active');
            // Setup PeerJS data connection
            const peerId = callOptionsModal.dataset.peerId;
            const conn = peer.connect(peerId);
            window.currentChatConn = conn;
            updateConnectedPeers(peerId, true);
            conn.on('open', () => {
                console.log('[Chat] Data connection opened.');
                onConnected();
            });
            conn.on('data', data => {
                appendChatMessage('Peer', data);
            });
            conn.on('close', () => {
                appendChatMessage('System', 'Chat ended.');
                updateConnectedPeers(peerId, false);
                onDisconnected();
            });
        });

        // Example: After call connection open/close
        optionAudio.addEventListener('click', () => {
            callOptionsModal.classList.remove('active');
            setCallUIActive(true);
            videosContainer.classList.add('active');
            endCallButton.classList.add('active');
            mediaToggles.classList.add('active');
            // Start audio call
            const peerId = callOptionsModal.dataset.peerId;
            navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(stream => {
                localStream = stream;
                localVideo.srcObject = stream;
                const call = peer.call(peerId, stream);
                peerConnection = call;
                updateConnectedPeers(peerId, true);
                onConnected();
                call.on('stream', remoteStream => {
                    remoteVideo.srcObject = remoteStream;
                    remoteVideoContainer.classList.add('active');
                    mediaToggles.classList.add('active');
                });
                call.on('close', () => {
                    remoteVideo.srcObject = null;
                    remoteVideoContainer.classList.remove('active');
                    mediaToggles.classList.remove('active');
                    videosContainer.classList.remove('active');
                    endCallButton.classList.remove('active');
                    setCallUIActive(false);
                    updateConnectedPeers(peerId, false);
                    onDisconnected();
                });
            });
        });
        optionVideo.addEventListener('click', () => {
            callOptionsModal.classList.remove('active');
            setCallUIActive(true);
            videosContainer.classList.add('active');
            endCallButton.classList.add('active');
            mediaToggles.classList.add('active');
            // Start video call
            const peerId = callOptionsModal.dataset.peerId;
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                localStream = stream;
                localVideo.srcObject = stream;
                const call = peer.call(peerId, stream);
                peerConnection = call;
                updateConnectedPeers(peerId, true);
                onConnected();
                call.on('stream', remoteStream => {
                    remoteVideo.srcObject = remoteStream;
                    remoteVideoContainer.classList.add('active');
                    mediaToggles.classList.add('active');
                });
                call.on('close', () => {
                    remoteVideo.srcObject = null;
                    remoteVideoContainer.classList.remove('active');
                    mediaToggles.classList.remove('active');
                    videosContainer.classList.remove('active');
                    endCallButton.classList.remove('active');
                    setCallUIActive(false);
                    updateConnectedPeers(peerId, false);
                    onDisconnected();
                });
            });
        });
        // For incoming data connections
        peer.on('connection', conn => {
            window.currentChatConn = conn;
            chatContainer.classList.add('active');
            setCallUIActive(true);
            endCallButton.classList.add('active');
            updateConnectedPeers(conn.peer, true);
            onConnected();
            conn.on('data', data => {
                appendChatMessage('Peer', data);
            });
            conn.on('close', () => {
                appendChatMessage('System', 'Chat ended.');
                updateConnectedPeers(conn.peer, false);
                onDisconnected();
            });
        });
        // For incoming calls
        peer.on('call', call => {
            console.log('[PeerJS] Incoming call received. Waiting for user to accept.');
            pendingCall = call;
            // Try to detect call type (audio/video)
            let type = 'Audio/Video Call';
            if (call.metadata && call.metadata.type) {
                type = call.metadata.type.charAt(0).toUpperCase() + call.metadata.type.slice(1) + ' Call';
            }
            incomingCallType.textContent = type;
            incomingCallModal.classList.add('active');
            call.on('close', () => { updateConnectedPeers(call.peer, false); onDisconnected(); });
        });
        // End/disconnect buttons
        endCallButton.addEventListener('click', () => {
            console.log('[UI] End Call button clicked.');
            if (peerConnection) {
                peerConnection.close();
                console.log('[PeerJS] Peer connection closed.');
            }
            if (window.currentChatConn) {
                window.currentChatConn.close();
                window.currentChatConn = null;
            }
            remoteVideo.srcObject = null;
            remoteVideoContainer.classList.remove('active');
            mediaToggles.classList.remove('active');
            videosContainer.classList.remove('active');
            endCallButton.classList.remove('active');
            chatContainer.classList.remove('active');
            setCallUIActive(false);
            console.log('[UI] Remote video cleared.');
            onDisconnected();
        });
        disconnectBtn.addEventListener('click', () => {
            console.log('[UI] Disconnect button clicked.');
            if (peerConnection) {
                peerConnection.close();
                console.log('[PeerJS] Peer connection closed by disconnect.');
            }
            if (window.currentChatConn) {
                window.currentChatConn.close();
                window.currentChatConn = null;
            }
            remoteVideo.srcObject = null;
            remoteVideoContainer.classList.remove('active');
            mediaToggles.classList.remove('active');
            videosContainer.classList.remove('active');
            endCallButton.classList.remove('active');
            chatContainer.classList.remove('active');
            setCallUIActive(false);
            console.log('[UI] Disconnected state. UI reset.');
            onDisconnected();
        });