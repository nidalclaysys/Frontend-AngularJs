angular.module('app.core')
    .factory('authInterceptor', function ($window, $q) {

        return {
            request: function (config) {
                const token = $window.localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = 'Bearer ' + token;
                }
                return config;
            },
            responseError: function (res) {
                if (res.status === 401) {
                    $state.go('home');
                }
                return $q.reject(res);
            }
        };
    })
    .config(function ($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
    });