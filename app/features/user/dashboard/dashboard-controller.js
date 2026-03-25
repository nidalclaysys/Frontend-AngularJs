
angular.module('app')
    .controller('DashboardController', function (SessionService) {

        const vm = this;

        vm.baseUrl = "https://localhost:7180";

        vm.logout = function () {
            SessionService.logout();
        };

        vm.user = SessionService.getUserProfile() || {};
        vm.initials = _initials(vm.user);

        function _initials(u) {
            if (u.firstName && u.lastName)
                return (u.firstName[0] + u.lastName[0]).toUpperCase();
            if (u.firstName) return u.firstName.slice(0, 2).toUpperCase();
            if (u.userName) return u.userName.slice(0, 2).toUpperCase();
            return '??';
        }

        const h = new Date().getHours();
        vm.timeOfDay = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
        vm.today = new Date();
        vm.memberSince = vm.user.iat
            ? new Date(vm.user.iat * 1000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
            : 'Recently';
    });