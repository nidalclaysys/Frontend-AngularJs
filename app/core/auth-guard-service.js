
angular.module('app')

    .service('SessionService', function ($rootScope, $injector) {

        const USER_KEY = "user_profile";
        this.getUser = function () {
            const token = localStorage.getItem('token');
            if (!token) return null;
            try {
                const base64Url = token.split('.')[1];

                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                return JSON.parse(jsonPayload);
            } catch (e) {
                console.error("Session Error: Could not parse token payload", e);
                return null;
            }
        };

        this.getToken = function () {
            return localStorage.getItem('token') || null;
        };

        this.saveUserProfile = function (user) {
            if (user) {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            }
        };
        this.getUserProfile = function () {
                const user = localStorage.getItem(USER_KEY);
                return user ? JSON.parse(user) : null;
            };

        this.isAuthenticated = function () {
            const user = this.getUser();
            if (!user) return false;

            if (user.exp && Date.now() / 1000 > user.exp) {
                localStorage.removeItem('token');
                return false;
            }
            return true;
        };

        this.logout = function () {
            localStorage.removeItem('token');
            localStorage.removeItem(USER_KEY);

            $rootScope.$emit('auth-changed');

            try {
                const $state = $injector.get('$state');
                $state.go('auth.login');
            } catch (e) {
                console.warn("State navigation failed, falling back to window reload");
                window.location.href = '/login'; // Hard fallback
            }
        }
    })


    .run(function ($transitions, $state, SessionService) {
        const PROTECTED = ['app.dashboard', 'app.profile', 'app.settings','app.admin'];
        const GUEST_ONLY = ['auth.login', 'auth.register', 'auth.forgot'];

        $transitions.onBefore({}, function (trans) {
            const to = trans.to().name;
            const auth = SessionService.isAuthenticated();

            if (PROTECTED.includes(to) && !auth) {
                return trans.router.stateService.target('auth.login');
            }

            if (GUEST_ONLY.includes(to) && auth) {
                return trans.router.stateService.target('app.dashboard');
            }
        });
    });
