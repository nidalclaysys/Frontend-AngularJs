
angular.module('app')

    .service('SessionService', function ($state, $rootScope, $cookies,$injector) {

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

        this.isAdmin = function () {
            const isAdminCookie = $cookies.get("isAdmin");

            return isAdminCookie === 'true';
        };

        this.logout = function () {

            console.log("clicked logout")
            localStorage.clear();

            $state.go("auth.login");

            $rootScope.$emit('auth-changed');
        }
    })


    .run(function ($transitions, $state, SessionService, toastr) {

        $transitions.onBefore({}, function (trans) {
            const toState = trans.to();
            const isAuthenticated = SessionService.isAuthenticated();
            const isAdmin = SessionService.isAdmin();

            if (toState.data && toState.data.requiresAuth && !isAuthenticated) {
                toastr.warning("Please login to continue");
                return trans.router.stateService.target('auth.login');
            }

            if (toState.data && toState.data.requiresAdmin && !isAdmin) {
                toastr.error("Access Denied: Admins Only");

                return trans.router.stateService.target('app.dashboard');
            }

            const guestOnly = ['auth.login', 'auth.register', 'auth.forgot'];
            if (guestOnly.includes(toState.name) && isAuthenticated) {
                return trans.router.stateService.target(isAdmin ? 'app.adminDashboard' : 'app.dashboard');
            }
        });
    });