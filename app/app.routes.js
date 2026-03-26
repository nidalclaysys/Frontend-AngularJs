angular.module('app')
    .config(function ($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/auth/login');

        $stateProvider

            .state('auth', {
                url: '/auth',
                abstract: true, 
                templateUrl: 'app/features/auth/auth.html'
            })

            .state('auth.login', {
                url: '/login',
                templateUrl: 'app/features/auth/login.html',
                controller: 'AuthController as vm'
            })

            .state('auth.register', {
                url: '/register',
                templateUrl: 'app/features/auth/register.html',
                controller: 'AuthController as vm'
            })

            .state('auth.forgot', {
                url: '/forgot',
                templateUrl: 'app/features/auth/forgot.html',
                controller: 'AuthController as vm'
            })
            .state('app', {
                url: '/app',
                abstract: true,
                templateUrl: 'app/shared/navbar/navbar.html',
                controller: 'NavbarController as nav',
                data: { requiresAuth: true }
            })

            .state('app.dashboard', {
                url: '/dashboard',
                templateUrl: 'app/features/user/dashboard/dashboard.html',
                controller: 'DashboardController as vm'
            })

            .state('app.profile', {
                url: '/profile',
                templateUrl: 'app/features/user/profile/profile.html',
                controller: 'ProfileController as vm'
            })
            .state('app.chat', {
                url: '/chat',
                templateUrl: 'app/features/user/chat/chat.html',
                controller: 'ChatController as vm'
            })
            .state('app.adminDashboard', {
                url: '/admin/users',
                templateUrl: 'app/features/admin/users/admin-users.html',
                controller: 'AdminUsersController as vm',
                data: { requiresAuth: true, requiresAdmin: true }
            });
          
           
    });