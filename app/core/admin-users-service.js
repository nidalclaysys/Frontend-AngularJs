angular.module('app')
    .service('AdminUsersService', function (ApiService) {

        const BASE = '/admin';

        this.getUsers = function () {
            return ApiService.get(`${BASE}/users`);
        };

        this.getBySerachUsers = function (search) {
            return ApiService.get(`${BASE}/users/${search}`);

        }

        this.getUser = function (id) {
            return ApiService.get(`${BASE}/user/${id}`);
        };

        this.deleteUser = function (id) {
            return ApiService.delete(`${BASE}/user/${id}`);
        };

        this.updateUser = function (id, payload) {
            return ApiService.put(`${BASE}/user/${id}`, payload);
        };

        this.uploadUserImage = function (id, formData) {
            return ApiService.postFormData(`${BASE}/user/${id}/image`, formData);
        };
        this.toggleUserStatus = function (id) {
            return ApiService.put(`${BASE}/user/${id}/status`);
        };
    });