

angular.module('app.chat')
    .service('ChatService', function (ApiService) {

        this.searchUsers = function (term) {
            return ApiService.get('/chat/users/search?term=' + encodeURIComponent(term));
        };

   
        this.getSessions = function () {
            return ApiService.get('/chat/sessions');
        };

  
        this.getOrCreateSession = function (otherUserId) {
            return ApiService.post('/chat/sessions/' + otherUserId, {});
        };

        this.getMessages = function (chatId) {
            return ApiService.get('/chat/sessions/' + chatId + '/messages');
        };

   
        this.uploadFile = function (chatId, formData) {
            return ApiService.postFormData('/chat/sessions/' + chatId + '/files', formData);
        };
    });