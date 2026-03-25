angular.module('app')
    .config(function ($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/auth/login');


    })
    .run(function ($transitions, SessionService) {

        $transitions.onBefore({}, function (trans) {
            const to = trans.to();
            const auth = SessionService.isAuthenticated();

            if (to.data && to.data.requiresAuth && !auth) {
                return trans.router.stateService.target('auth.login');
            }

            const guestOnly = ['home', 'auth.login', 'auth.register', 'auth.forgot'];
            if (guestOnly.includes(to.name) && auth) {
                return trans.router.stateService.target('app.dashboard');
            }


            if (to.data && to.data.requiresAdmin) {
                const user = SessionService.getUser();
                const role = user && (user.role || user.Role || user['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
                if (role !== 'Admin') {
                    return trans.router.stateService.target('app.dashboard');
                }
            }
        });

    });
