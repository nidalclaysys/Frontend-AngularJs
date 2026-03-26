
angular.module('app.chat')
    .controller('ChatController', function (
        ChatService,
        SessionService,
        $scope,
        $timeout,
        $window
    ) {

        const vm = this;

       
        const currentUser = SessionService.getUser() || {};
        vm.myId = Number(localStorage.getItem("userId"));

        console.log(`userid = ${vm.myId}`)

        vm.IMG_BASE = 'https://localhost:7180';

     
        vm.sessions = [];
        vm.sessionsLoading = true;
        vm.activeSession = null;

        vm.messages = [];
        vm.messagesLoading = false;
        vm.messagesError = null;

        vm.messageText = '';
        vm.fileUploading = false;
        vm.fileUploadError = null;

        vm.searchOpen = false;
        vm.searchTerm = '';
        vm.searchResults = [];
        vm.searching = false;

        vm.onlineUsers = {};
        vm.partnerTyping = false;

        vm.sidebarOpen = $window.innerWidth >= 768;
        vm.hubConnected = false;

        let hub = null;
        let searchTimer = null;
        let typingTimer = null;
        let myTypingCooldown = null;

        vm.sameDay = function (d1, d2) {
            if (!d1 || !d2) return false;
            const date1 = new Date(d1);
            const date2 = new Date(d2);
            return date1.getFullYear() === date2.getFullYear() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getDate() === date2.getDate();
        };

        init();

        function init() {
            initHub();
            loadSessions();
        }


        function initHub() {
            const token = SessionService.getToken();

            hub = new signalR.HubConnectionBuilder()
                .withUrl(vm.IMG_BASE + '/chatHub', {
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect()
                .build();

            hub.on('ReceiveMessage', (senderId, message, messageType, fileName) => {
                safeApply(() => {
                    if (senderId === vm.myId) return;

                    addMessage({
                        sendId: senderId,
                        message: message,
                        messageType: messageType,
                        fileName: fileName,
                        _isFile: messageType === 1,
                        isRead: false
                    });

                    vm.partnerTyping = false;
                    updateSessionPreview(message, messageType);
                });
            });


            hub.on('MessageRead', (id) => {
                safeApply(() => {
                    const msg = vm.messages.find(m => m.id === id);
                    if (msg) msg.isRead = true;
                });
            });


            hub.on('UserTyping', (userId) => {
                if (userId === vm.myId) return;

                safeApply(() => {
                    vm.partnerTyping = true;

                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => {
                        safeApply(() => vm.partnerTyping = false);
                    }, 3000);
                });
            });

            vm.onTyping = function () {
                if (vm.activeSession && vm.hubConnected) {
                    hub.invoke('NotifyTyping', vm.activeSession.chatId, vm.myId);
                }
            };


            hub.on('UserOnline', id => safeApply(() => vm.onlineUsers[id] = true));
            hub.on('UserOffline', id => safeApply(() => vm.onlineUsers[id] = false));

            hub.onreconnecting(() => safeApply(() => vm.hubConnected = false));
            hub.onreconnected(() => {
                safeApply(() => vm.hubConnected = true);
                rejoinActiveChat();
            });
            hub.onclose(() => safeApply(() => vm.hubConnected = false));

            hub.start()

                .then(() => {
                    safeApply(() => vm.hubConnected = true);

                    hub.invoke('GetOnlineUsers')
                        .then(users => {
                            safeApply(() => {
                                users.forEach(id => { vm.onlineUsers[Number(id)] = true; });
                            });
                        });
                })
                .catch(() => safeApply(() => vm.hubConnected = false));
        }

        function rejoinActiveChat() {
            if (vm.activeSession) {
                hub.invoke('JoinChat', vm.activeSession.chatId).catch(angular.noop);
            }
        }

        function loadSessions() {
            vm.sessionsLoading = true;

            ChatService.getSessions()
                .then(res => {
                    vm.sessions = (res.data || []).map(s => ({
                        ...s,
                        _lastMessage: '',
                        _unreadCount: 0
                    }));
                })
                .finally(() => vm.sessionsLoading = false);
        }

        vm.openSession = function (session) {
            if (vm.activeSession?.chatId === session.chatId) return;

            vm.activeSession = session;
            vm.messages = [];
            vm.messageText = '';
            vm.partnerTyping = false;

            if (vm.hubConnected) {
                hub.invoke('JoinChat', session.chatId).catch(angular.noop);
            }

            loadMessages(session.chatId);

            if ($window.innerWidth < 768) {
                vm.sidebarOpen = false;
            }
        };

      
        function loadMessages(chatId) {
            vm.messagesLoading = true;
            vm.messagesError = null;

            ChatService.getMessages(chatId)
                .then(res => {
                    vm.messages = (res.data || []).map(formatMessage);

                    if (vm.messages.length) {
                        updateSessionPreview(vm.messages.at(-1).message);
                    }

                    scrollToBottom();
                })
                .catch(() => vm.messagesError = 'Failed to load messages')
                .finally(() => vm.messagesLoading = false);
        }

        vm.canSend = function () {
            const hasText = vm.messageText && vm.messageText.trim().length > 0;
            const hasFile = !!vm.selectedFile; 
            const isUploading = vm.fileUploading;

            return vm.hubConnected &&
                vm.activeSession &&
                (hasText || hasFile) && 
                !isUploading;
        };

        vm.sendMessage = function () {
            if (!vm.activeSession || !vm.hubConnected) return;

            const text = vm.messageText ? vm.messageText.trim() : '';

            if (vm.selectedFile) {
                vm.fileUploading = true;
                const formData = new FormData();
                formData.append('file', vm.selectedFile);

                ChatService.uploadFile(vm.activeSession.chatId, formData)
                    .then(res => {
                        const relativePath = res.data.data;
                        const fileName = vm.selectedFile.name;

                        addMessage({
                            sendId: vm.myId,
                            message: relativePath,
                            messageType: 1,
                            fileName: fileName,
                            _isFile: true
                        });

                        hub.invoke('SendMessage', vm.activeSession.chatId, vm.myId, relativePath, 1, fileName);

                        vm.clearFile();
                    })
                    .catch(() => vm.fileUploadError = 'Upload failed')
                    .finally(() => vm.fileUploading = false);

                return; 
            }

            if (text) {
                addMessage({ sendId: vm.myId, message: text, messageType: 0, isRead: false });
                hub.invoke('SendMessage', vm.activeSession.chatId, vm.myId, text, 0, null);
                vm.messageText = '';
                scrollToBottom();
            }
        };

        vm.onKeyDown = function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                vm.sendMessage();
            }
        };


        vm.onFileAttach = function (file) {
            if (!file || !vm.activeSession) return;

            safeApply(() => {
                vm.selectedFile = file;
                vm.fileUploadError = null;
               
            });
        };

        vm.filePreview = null;

        vm.selectedFileName = ''; 

        vm.handleFilePreview = function (input) {
            const file = input.files[0];
            if (file) {
                safeApply(() => {
                    vm.selectedFile = file;
                    vm.selectedFileName = file.name;
                    vm.fileUploadError = null;

                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            safeApply(() => {
                                vm.filePreview = e.target.result;
                            });
                        };
                        reader.readAsDataURL(file);
                    } else {
                        vm.filePreview = null;
                    }
                });
            }
        };

        vm.clearFilePreview = function () {
            vm.filePreview = null;
            document.getElementById('chatFileInput').value = '';
        };

        vm.clearFile = function () {
            vm.selectedFile = null;
            document.getElementById('chatFileInput').value = "";
        };

 
        vm.toggleSearch = () => vm.searchOpen = !vm.searchOpen;

        vm.searchUsers = function () {
            const term = vm.searchTerm.trim();
            if (term.length < 2) return vm.searchResults = [];

            clearTimeout(searchTimer);

            vm.searching = true;

            searchTimer = setTimeout(() => {
                ChatService.searchUsers(term)
                    .then(res => safeApply(() => {
                        vm.searchResults = res.data || [];
                        vm.searching = false;
                    }))
                    .catch(() => safeApply(() => vm.searching = false));
            }, 300);
        };

        vm.clearSearch = function () {
            vm.searchTerm = '';
            vm.searchResults = [];
            vm.searchOpen = false;
        };

        vm.startChat = function (user) {
            ChatService.getOrCreateSession(user.id)
                .then(res => {
                    let session = vm.sessions.find(s => s.chatId === res.data);

                    if (!session) {
                        session = {
                            chatId: res.data,
                            otherUserId: user.id,
                            otherUserName: user.name
                        };
                        vm.sessions.unshift(session);
                    }

                    vm.openSession(session);
                });
        };

   
        function addMessage(data) {
            vm.messages.push(formatMessage({
                ...data,
                sendAt: new Date().toISOString()
            }));
        }

        function formatMessage(m) {
            m._isFile = m._isFile ?? isFile(m.message);
            m._fileName = m._fileName || (m._isFile ? getFileName(m.message) : null);
            return m;
        }

        function isFile(msg) {
            return /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|zip|rar)/i.test(msg || '');
        }

        function getFileName(url) {
            return decodeURIComponent(url.split('/').pop());
        }

        function updateSessionPreview(message) {
            if (!vm.activeSession) return;

            const session = vm.sessions.find(s => s.chatId === vm.activeSession.chatId);
            if (session) {
                session._lastMessage = isFile(message)
                    ? '📎 Attachment'
                    : message.slice(0, 40);
            }
        }

        vm.nameInitials = function (name) {
            if (!name) return '?';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        };

        function scrollToBottom() {
            $timeout(() => {
                const el = document.getElementById('chatMessagesContainer');
                if (el) el.scrollTop = el.scrollHeight;
            });
        }

        function safeApply(fn) {
            if (!$scope.$$phase) $scope.$apply(fn);
            else fn();
        }

        vm.onTyping = function () {
            if (!vm.activeSession || !vm.hubConnected || myTypingCooldown) return;

            hub.invoke('NotifyTyping', vm.activeSession.chatId, vm.myId);

            myTypingCooldown = setTimeout(() => {
                myTypingCooldown = null;
            }, 2000);
        };

        vm.isOnline = id => !!vm.onlineUsers[id];

        vm.closeSidebar = function () {
            vm.sidebarOpen = true;
            vm.activeSession = null;
        };

        function formatMessage(m) {

            m._isFile = (m.messageType === 1) || isFile(m.message);
            m._fileName = m.fileName || (m._isFile ? getFileName(m.message) : null);

            if (m._isFile && m.message) {

                if (m.message.startsWith('/')) {
                    m.displayUrl = vm.IMG_BASE + m.message;
                } else if (!m.message.startsWith('http')) {

                    m.displayUrl = vm.IMG_BASE + '/' + m.message;
                } else {

                    m.displayUrl = m.message;
                }
            } else {

                m.displayUrl = m.message;
            }

            return m;
        }

        function updateSessionPreview(message, type) {
            if (!vm.activeSession) return;

            const session = vm.sessions.find(s => s.chatId === vm.activeSession.chatId);
            if (session) {
                const isActuallyFile = (type === 1) || isFile(message);
                session._lastMessage = isActuallyFile ? '📎 Attachment' : message.slice(0, 40);
            }
        }

        vm.downloadFile = function (url, fileName) {

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('File not found');
                    }
                    return response.blob();
                })
                .then(blob => {

                    const blobUrl = window.URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName || 'download';

                    document.body.appendChild(link);
                    link.click();

                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                })
                .catch(err => {
                    console.error('Download failed:', err);

                });
        };
       
        $scope.$on('$destroy', function () {
            clearTimeout(searchTimer);
            clearTimeout(typingTimer);
            clearTimeout(myTypingCooldown);

            if (hub) hub.stop();
        });

    });