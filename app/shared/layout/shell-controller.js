
angular.module('app.admin')
    .controller('ShellController', function (SessionService, $state, $window, $scope) {

        const shell = this;

        shell.user = SessionService.getUser() || {};
        shell.initials = _initials(shell.user);

        const _role = shell.user.role || shell.user.Role ||
            shell.user['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        shell.isAdmin = _role === 'Admin';

        function _initials(u) {
            if (u.firstName && u.lastName)
                return (u.firstName[0] + u.lastName[0]).toUpperCase();
            if (u.firstName) return u.firstName.slice(0, 2).toUpperCase();
            if (u.userName) return u.userName.slice(0, 2).toUpperCase();
            return '??';
        }

        shell.scrolled = false;
        shell.dropdownOpen = false;
        shell.menuOpen = false;

        angular.element($window).on('scroll.shell', function () {
            $scope.$apply(() => { shell.scrolled = $window.scrollY > 8; });
        });

        shell.toggleDropdown = function ($event) {
            $event.stopPropagation();
            shell.dropdownOpen = !shell.dropdownOpen;
            shell.menuOpen = false;
        };
        shell.closeDropdown = () => shell.dropdownOpen = false;
        shell.toggleMenu = function () { shell.menuOpen = !shell.menuOpen; shell.dropdownOpen = false; };
        shell.closeMenu = () => shell.menuOpen = false;
        shell.closeAll = () => { shell.dropdownOpen = false; shell.menuOpen = false; };

        shell.logout = function () {
            shell.closeAll();
            SessionService.logout();
            $state.go('auth.login');
        };

        $scope.$on('$destroy', function () {
            angular.element($window).off('scroll.shell');
        });
    });