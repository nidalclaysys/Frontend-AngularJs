angular.module('app.admin')
    .controller('AdminUsersController', function (AdminUsersService, $q, $scope, $timeout, toastr) {

        const vm = this;

        vm.IMG_BASE = 'https://localhost:7180';

        vm.users = [];
        vm.loading = true;
        vm.loadError = null;
        vm.search = '';
        vm.filter = 'all';

        vm.deleteTarget = null;
        vm.deleting = false;
        vm.deleteError = null;

        vm.drawerOpen = false;
        vm.drawerLoading = false;
        vm.drawerUser = null;
        vm.drawerError = null;
        vm.edit = {};
        vm.saveError = null;
        vm.saving = false;

        vm.imgPreview = null;
        vm.imgUploading = false;
        vm.imgUploadError = null;
        vm.imgUploadSuccess = false;

        vm.dobError = '';
        vm.ageError = '';
        vm.cities = [];

        const MIN_AGE = 13;
        const PHONE_RE = /^[0-9]{10}$/;
        const ZIP_RE = /^[0-9]{6}$/;

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
        for (let y = new Date().getFullYear(); y >= 1900; y--) vm.years.push(y);

        const CITY_MAP = {
            'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kannur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kottayam', 'Idukki', 'Wayanad', 'Pathanamthitta', 'Kasaragod'],
            'Tamilnadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Kancheepuram'],
            'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari', 'Shivamogga', 'Vijayapura', 'Tumakuru', 'Udupi']
        };
 
        vm.loadUsers = function () {
            vm.loading = true;
            vm.loadError = null;

            AdminUsersService.getUsers()
                .then(res => {
                    if (res.data?.isSuccess === true) {
                        vm.users = res.data.data || [];
                    } else if (Array.isArray(res.data)) {
                        vm.users = res.data;
                    } else {
                        vm.users = [];
                        vm.loadError = res.data?.message || 'Failed to load users';
                        toastr.error(vm.loadError);
                    }
                })
                .catch(err => {
                    vm.loadError = err?.data?.message || 'Failed to load users';
                })
                .finally(() => vm.loading = false);
        };

        vm.loadUsers();

        vm.doDelete = function () {
            if (!vm.deleteTarget) return;

            vm.deleting = true;

            AdminUsersService.deleteUser(vm.deleteTarget.id)
                .then(res => {
                    if (res.data.isSuccess) {
                        vm.users = vm.users.filter(u => u.id !== vm.deleteTarget.id);
                        vm.deleteTarget = null;
                    } else {
                        vm.deleteError = res.data.message;
                    }
                })
                .catch(err => {
                    vm.deleteError = err?.data?.message || 'Delete failed';
                })
                .finally(() => vm.deleting = false);
        };


        vm.openEdit = function (user) {
            vm.drawerOpen = true;
            vm.drawerLoading = true;

            AdminUsersService.getUser(user.id)
                .then(res => {
                    if (res.data.isSuccess) {
                        vm.drawerUser = res.data.data;
                        _populateEdit(vm.drawerUser);
                    } else {
                        vm.drawerError = res.data.message;
                    }
                })
                .catch(err => {
                    vm.drawerError = err?.data?.message || 'Load failed';
                })
                .finally(() => vm.drawerLoading = false);
        };

        vm.saveUser = function (form) {

            form.$setSubmitted();
            if (form.$invalid) return;

            if (!PHONE_RE.test(vm.edit.mobile)) {
                vm.saveError = 'Invalid mobile';
                return;
            }

            if (!ZIP_RE.test(vm.edit.zipCode)) {
                vm.saveError = 'Invalid ZIP';
                return;
            }

            const payload = {
                firstName: vm.edit.firstName,
                lastName: vm.edit.lastName,
                mobile: vm.edit.mobile
            };

            vm.saving = true;

            AdminUsersService.updateUser(vm.drawerUser.id, payload)
                .then(res => {
                    if (res.data.isSuccess) {
                        vm.closeDrawer();
                    } else {
                        return $q.reject(res);
                    }
                })
                .catch(err => {
                    vm.saveError = err?.data?.message || 'Save failed';
                })
                .finally(() => vm.saving = false);
        };

        vm.onImgSelected = function (file) {

            const fd = new FormData();
            fd.append('File', file);

            vm.imgUploading = true;

            AdminUsersService.uploadUserImage(vm.drawerUser.id, fd)
                .then(res => {
                    if (!res.data.isSuccess) return $q.reject(res);

                    return AdminUsersService.getUser(vm.drawerUser.id);
                })
                .then(res => {
                    vm.drawerUser = res.data.data;
                    vm.loadUsers();
                })
                .catch(err => {
                    vm.imgUploadError = err?.data?.message || 'Upload failed';
                })
                .finally(() => vm.imgUploading = false);
        };

        vm.toggleStatus = function (user) {
            user._toggling = true;

            const newStatus = !user.isActive;

            AdminUsersService.toggleUserStatus(user.id)
                .then(res => {
                    if (res.data.isSuccess) {
                        user.isActive = newStatus;
                        toastr.success(res.data.message);

                    } else {
                        throw res;
                    }
                })
                .catch(() => {
                    toastr.error('Failed to update status');
                })
                .finally(() => user._toggling = false);
        };



        vm.confirmDelete = function (user) {
            vm.deleteTarget = user;
            vm.deleteError = null;
            document.body.style.overflow = 'hidden';
        };


        vm.cancelDelete = function () {
            if (vm.deleting) return;
            vm.deleteTarget = null;
            vm.deleteError = null;
            document.body.style.overflow = '';
        };
        vm.openEdit = function (user) {
            vm.drawerOpen = true;
            vm.drawerLoading = true;
            vm.drawerUser = null;
            vm.drawerError = null;
            vm.saveError = null;
            vm.imgPreview = null;
            vm.imgUploadError = null;
            vm.imgUploadSuccess = false;
            vm.drawerImgErr = false;
            vm.dobError = '';
            vm.ageError = '';
            document.body.style.overflow = 'hidden';

            AdminUsersService.getUser(user.id)
                .then(function (res) {
                    if (res.data.isSuccess) {
                        vm.drawerUser = res.data.data;
                        _populateEdit(vm.drawerUser);
                    } else {
                        vm.drawerError = res.data.message || 'Failed to load user';
                    }
                })
                .catch(function (err) {
                    vm.drawerError = (err && err.data && err.data.message)
                        ? err.data.message
                        : 'Failed to load user details.';
                })
                .finally(function () { vm.drawerLoading = false; });
        };

        vm.closeDrawer = function () {
            if (vm.saving || vm.imgUploading) return;
            vm.drawerOpen = false;
            document.body.style.overflow = '';
            $timeout(function () {
                vm.drawerUser = null;
                vm.edit = {};
                vm.saveError = null;
                vm.imgPreview = null;
            }, 300);
        };

       
        function _populateEdit(u) {
            let dob = null;

            if (u.dateOfBirth) {

                dob = new Date(u.dateOfBirth);

                if (isNaN(dob.getTime())) {
                    dob = null;
                }
            }
            const normState = _normaliseState(u.state);

            const normCity = _cap(u.city);

            vm.edit = {
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                displayName: u.displayName || '',
                gender: u.gender,                   
                address: u.address || '',
                state: normState,
                city: normCity,
                zipCode: u.zipCode ? String(u.zipCode) : '',
                mobile: u.mobile || '',
                phone: u.phone || '',
                dobDay: dob ? dob.getDate() : '',
                dobMonth: dob ? dob.getMonth() + 1 : '',
                dobYear: dob ? dob.getFullYear() : ''
            };

           
            vm.cities = CITY_MAP[normState] || [];
        }

        vm.onStateChange = function () {
            vm.edit.city = '';
            vm.cities = CITY_MAP[vm.edit.state] || [];
        };

        vm.loadCities = vm.onStateChange;


        vm.validateDOB = function () {
            const day = vm.edit.dobDay;
            const month = vm.edit.dobMonth;
            const year = vm.edit.dobYear;

            vm.dobError = '';
            vm.ageError = '';
            if (!day || !month || !year) return;

            const dob = new Date(year, month - 1, day);
            const today = new Date();

            if (dob.getFullYear() !== +year ||
                dob.getMonth() !== month - 1 ||
                dob.getDate() !== +day) {
                vm.dobError = 'Invalid date';
                return;
            }
            if (dob > today) {
                vm.dobError = 'Date of birth cannot be in the future';
                return;
            }

            let age = today.getFullYear() - +year;
            if (today < new Date(today.getFullYear(), month - 1, day)) age--;
            if (age < MIN_AGE) vm.ageError = `Minimum age is ${MIN_AGE} years`;
        };

        vm.saveUser = function (form) {
            vm.saveError = null;
            form.$setSubmitted();

            if (form.$invalid) return;

            vm.validateDOB();
            if (vm.dobError || vm.ageError) return;

            if (vm.edit.gender === undefined || vm.edit.gender === null) {
                vm.saveError = 'Please select a gender';
                return;
            }

            if (!PHONE_RE.test(vm.edit.phone)) {
                vm.saveError = 'Phone must be a valid 10-digit number';
                return;
            }

            if (vm.edit.mobile && !PHONE_RE.test(vm.edit.mobile)) {
                vm.saveError = 'Mobile must be a valid 10-digit number';
                return;
            }

            if (!ZIP_RE.test(vm.edit.zipCode)) {
                vm.saveError = 'Enter a valid 6-digit ZIP code';
                return;
            }

            const { dobDay, dobMonth, dobYear } = vm.edit;


            const dateString = dobYear + '-' +
                String(dobMonth).padStart(2, '0') + '-' +
                String(dobDay).padStart(2, '0');

            const payload = {
                firstName: vm.edit.firstName.trim(),
                lastName: vm.edit.lastName.trim(),
                displayName: vm.edit.displayName.trim(),
                dateOfBirth: dateString,
                gender: vm.edit.gender,
                address: vm.edit.address.trim(),
                city: vm.edit.city,
                state: vm.edit.state,
                zipCode: parseInt(vm.edit.zipCode, 10),
                phone: vm.edit.phone,
                mobile: vm.edit.mobile || null
            };

            vm.saving = true;

            AdminUsersService.updateUser(vm.drawerUser.id, payload)
                .then(function (res) {
                    if (res.data.isSuccess) {

                        const idx = vm.users.findIndex(u => u.id === vm.drawerUser.id);
                        if (idx !== -1) {
                            vm.users[idx].firstName = payload.firstName;
                            vm.users[idx].lastName = payload.lastName;
                            vm.users[idx].phone = payload.phone;
                        }
                        toastr.success(res.data.message || 'User updated successfully');
                        vm.closeDrawer();
                    } else {
                        return $q.reject({ data: { message: res.data.message } });
                    }
                })
                .catch(function (err) {
                    vm.saveError = (err && err.data && err.data.message)
                        ? err.data.message
                        : 'Save failed. Please try again.';
                })
                .finally(function () { vm.saving = false; });
        };

        function _normaliseState(s) {
            if (!s) return '';
            const lower = s.toLowerCase().trim();
            if (lower === 'kerala') return 'Kerala';
            if (lower === 'tamilnadu' || lower === 'tamil nadu') return 'Tamilnadu';
            if (lower === 'karnataka') return 'Karnataka';

            return s.charAt(0).toUpperCase() + s.slice(1);
        }

        function _cap(s) {
            if (!s) return '';
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        }


        $scope.$on('$destroy', function () {
            document.body.style.overflow = '';
        });
    });