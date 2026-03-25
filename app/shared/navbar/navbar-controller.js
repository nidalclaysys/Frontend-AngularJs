angular.module('app')
    .controller('NavbarController', function (SessionService, $state, $window, $document, $scope, $rootScope) {

        const nav = this;

        nav.baseUrl = "https://localhost:7180";


        nav.isAuthenticated = () => SessionService.isAuthenticated();

        function initUser() {
            nav.user = SessionService.getUserProfile() || {};
            nav.initials = buildInitials(nav.user);
        }

        initUser();

        $rootScope.$on('auth-changed', function () {
            initUser();
        });

        function buildInitials(user) {
            if (user.firstName && user.lastName)
                return (user.firstName[0] + user.lastName[0]).toUpperCase();
            if (user.firstName)
                return user.firstName.slice(0, 2).toUpperCase();
            if (user.userName)
                return user.userName.slice(0, 2).toUpperCase();
            return '??';
        }

        // ── UI State ──
        nav.dropdownOpen = false;
        nav.menuOpen = false;
        nav.scrolled = false;

        // ── Scroll Effect ──
        const onScroll = function () {
            $scope.$applyAsync(() => {
                nav.scrolled = $window.scrollY > 8;
            });
        };
        angular.element($window).on('scroll', onScroll);

        // ── Dropdown ──
        nav.toggleDropdown = function ($event) {
            $event.stopPropagation();

            $scope.$applyAsync(() => {
                nav.dropdownOpen = !nav.dropdownOpen;
            });
        };

        nav.closeDropdown = function () {
            nav.dropdownOpen = false;
        };

        // ── Mobile Menu ──
        nav.toggleMenu = function ($event) {
            if ($event) $event.stopPropagation();
            nav.menuOpen = !nav.menuOpen;
            nav.dropdownOpen = false;
        };

        nav.closeMenu = function () {
            nav.menuOpen = false;
        };

        // ── Close All ──
        nav.closeAll = function () {
            nav.dropdownOpen = false;
            nav.menuOpen = false;
        };

        // ── Logout ──
        nav.logout = function () {
            nav.closeAll();
            SessionService.logout();
        };

        nav.toDashboard = function () {
            nav.closeAll();
            $state.go('app.dashboard');
        }
        nav.toProfile = function () {
            nav.closeAll();
            $state.go('app.profile');

        }

        nav.toChat = function () {
            nav.closeAll();
            $state.go('app.chat');
        }

        $scope.$on('$destroy', function () {
            angular.element($window).off('scroll', onScroll);
        });
    });