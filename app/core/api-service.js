angular.module('app.core')
    .service('ApiService', function ($http, API_CONFIG) {

        const base = API_CONFIG.BASE_URL;

        this.get = (url) => $http.get(base + url);
        this.post = (url, data) => $http.post(base + url, data);
        this.put = function (url, data) {
            return $http.put(base + url, data);
        };

        this.delete = function (url) {
            return $http.delete(base + url);
        };

        this.postFormData = function (url, formData) {
            return $http.post(base + url, formData, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            });
        }
    });