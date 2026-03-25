angular.module('app.auth')
    .controller('AuthController', function (AuthService,SessionService,ProfileService, $state, toastr) {

        const vm = this;

        vm.model = {};
        vm.fieldErrors = {};
        vm.error = null;
        vm.success = null;
        vm.loading = false;
        vm.showPassword = false;

        vm.cities = [];
        vm.dobError = '';
        vm.ageError = '';

        const MIN_AGE = 13;

        vm.days = Array.from({ length: 31 }, (_, i) => i + 1);

        vm.months = [
            { value: 1, name: 'Jan' }, { value: 2, name: 'Feb' },
            { value: 3, name: 'Mar' }, { value: 4, name: 'Apr' },
            { value: 5, name: 'May' }, { value: 6, name: 'Jun' },
            { value: 7, name: 'Jul' }, { value: 8, name: 'Aug' },
            { value: 9, name: 'Sep' }, { value: 10, name: 'Oct' },
            { value: 11, name: 'Nov' }, { value: 12, name: 'Dec' }
        ];

        vm.years = [];
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 1900; y--) vm.years.push(y);


        vm.togglePassword = () => vm.showPassword = !vm.showPassword;

        vm.passwordMismatch = () =>
            !!(vm.model.password &&
                vm.model.confirmPassword &&
                vm.model.password !== vm.model.confirmPassword);

        vm.validateDOB = function () {
            const { day, month, year } = vm.model;
            vm.dobError = '';
            vm.ageError = '';
            vm.model.age = '';

            if (!day || !month || !year) return;

            const dob = new Date(year, month - 1, day);
            const today = new Date();

            if (
                dob.getFullYear() !== +year ||
                dob.getMonth() !== month - 1 ||
                dob.getDate() !== +day
            ) {
                vm.dobError = 'Invalid date (e.g. Feb 30 does not exist)';
                return;
            }

            if (dob > today) {
                vm.dobError = 'Date of birth cannot be in the future';
                return;
            }

            let age = today.getFullYear() - year;
            if (today < new Date(today.getFullYear(), month - 1, day)) age--;

            if (age < MIN_AGE) {
                vm.ageError = `Minimum age is ${MIN_AGE} years`;
                return;
            }

            vm.model.age = age;
        };



        vm.loadCities = function () {
            vm.model.city = '';  
            vm.cities = [];

            if (!vm.model.state) return;

            AuthService.getCities(vm.model.state)
                .then(res => vm.cities = res.data || [])
                .catch(() => vm.cities = []);
        };

        vm.patterns = {
            username: /^(\d{10}|[^\s@]+@[^\s@]+\.[^\s@]+)$/, 
            phone: /^[0-9]{10}$/
        };

        vm.loginUser = function (form) {
            if (form.$invalid) return;
            vm.error = null;
            vm.loading = true;

            let loginData = null;

            AuthService.login(vm.model)
                .then(res => {
                    if (res.data && res.data.isSuccess) {
                        loginData = res.data.data;
                        localStorage.setItem('token', loginData.token);
                        localStorage.setItem('userId', loginData.id);


                        return ProfileService.getProfile();
                    } else {
                        toastr.error(res.data.message || 'Login failed');
                        throw new Error(res.data.message || 'Login failed');
                    }
                })
                .then(profileRes => {
                    if (profileRes && profileRes.data && profileRes.data.isSuccess) {
                        const profileData = profileRes.data.data;
                        profileData.userName = loginData.userName;

                        SessionService.saveUserProfile(profileData);

                        toastr.success('Welcome back, ' + (profileData.firstName || profileData.userName));

                        if (loginData.isAdmin) {
                            $state.go('app.adminUsers');
                        } else {
                            $state.go('app.dashboard');
                        }

                    } else {
                        throw new Error(profileRes.data.message || 'Could not load profile');
                    }
                })
                .catch(err => {
                    vm.error = (err.data && err.data.message) || err.message || 'Invalid credentials';
                    toastr.error(vm.error);
                })
                .finally(() => vm.loading = false);
        };


        vm.registerUser = function (form) {

            let isValid = true;

            if (form.$invalid || vm.passwordMismatch() || vm.dobError || vm.ageError) {
                return;
            }

            if (!vm.model.firstName || vm.model.firstName.length < 3) {
                vm.error = "First name must be at least 3 characters";
                return;
            }

            if (!vm.model.address || vm.model.address.length < 10) {
                vm.error = "Address must be at least 10 characters";
                return;
            }

            if (!vm.model.zipCode || !/^[0-9]{6}$/.test(vm.model.zipCode)) {
                vm.error = "Zip code must be exactly 6 digits";
                return;
            }


            if (!vm.patterns.username.test(vm.model.userName)) {
                toastr.warning("Invalid username");
                return;
            }

            if (vm.model.gender === undefined || vm.model.gender === null) {
                vm.error = "Please select gender";
                return;
            }

            if (!vm.patterns.phone.test(vm.model.mobile)) {
                vm.error = "Mobile must be a valid 10-digit number";
                return;
            }

            if (vm.model.phone && !vm.patterns.phone.test(vm.model.phone)) {
                vm.error = "Phone must be a valid 10-digit number";
                return;
            }

            vm.loading = true;


            AuthService.register(vm.model)
                .then((res) => {
                    if (res.data.isSuccess) {
                        toastr.success(res.data.message)
                        $state.go('auth.login');

                    } else {
                        toastr.error(res.data.message)
                    }
                })
                .catch(err => {
                    vm.error = (err && err.data && err.data.message)
                        ? err.data.message
                        : 'Registration failed';                })
                .finally(() => {
                    vm.loading = false;
                });
        };

        vm.forgotPassword = function (form) {
            vm.error = null;
            vm.success = null;
            if (form.$invalid) return;

            vm.loading = true;

            AuthService.forgotPassword(vm.model)
                .then(() => {
                    vm.success = 'A password reset link has been sent to your email.';
                })
                .catch(err => {
                    vm.error = (err && err.data && err.data.message)
                        ? err.data.message
                        : 'Failed to send reset link. Please try again.';
                })
                .finally(() => vm.loading = false);
        };
    });