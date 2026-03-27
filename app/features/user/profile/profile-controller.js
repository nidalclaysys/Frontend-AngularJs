angular.module('app.profile')
    .controller('ProfileController', function (ProfileService, SessionService, $q, $scope, $rootScope, toastr) {



        const vm = this;

        vm.profile = null;
        vm.edit = {};
        vm.editMode = false;
        vm.loading = true;
        vm.saving = false;

        vm.loadError = null;
        vm.saveError = null;

        vm.imgPreview = null;
        vm.imgUploading = false;
        vm.imgUploadError = null;
        vm.imgUploadSuccess = false;

        vm.baseUrl = 'https://localhost:7180';

        vm.initials = '??';
        vm.cities = [];

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

        vm.mobilePattern = /^[0-9]{10}$/;

        vm.loadProfile = loadProfile;
        vm.loadProfile();

        function syncSession(updatedProfile) {

            const currentSession = SessionService.getUserProfile() || {};
            if (!updatedProfile.userName) {
                updatedProfile.userName = currentSession.userName;
            }

            SessionService.saveUserProfile(updatedProfile);
            $rootScope.$emit('auth-changed');
        }
        function loadProfile() {
            vm.loading = true;

            return ProfileService.getProfile()
                .then(res => {
                    vm.profile = res.data.data;
                    syncSession(vm.profile);
                    vm.initials = ProfileService.buildInitials(vm.profile);
                })
                .catch(() => vm.loadError = 'Failed to load profile')
                .finally(() => vm.loading = false);
        }

        vm.startEdit = function () {
            const p = vm.profile;
            const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;

            vm.edit = {
                firstName: p.firstName,
                lastName: p.lastName,
                displayName: p.displayName,
                gender: p.gender,
                address: p.address,
                state: ProfileService.capitalise(p.state),
                city: ProfileService.capitalise(p.city),
                zipCode: String(p.zipCode),
                mobile: p.mobile,
                phone: p.phone || '',
                dobDay: dob ? dob.getDate() : '',
                dobMonth: dob ? dob.getMonth() + 1 : '',
                dobYear: dob ? dob.getFullYear() : ''
            };

            vm.cities = ProfileService.CITY_MAP[vm.edit.state] || [];
            vm.editMode = true;
        };

        vm.cancelEdit = () => vm.editMode = false;

        vm.saveProfile = function (form) {

            form.$setSubmitted();

            console.log("validated");

            const dobCheck = ProfileService.validateDOB(
                vm.edit.dobDay,
                vm.edit.dobMonth,
                vm.edit.dobYear
            );

            if (!dobCheck.valid) {
                vm.saveError = dobCheck.error || dobCheck.ageError;
                return;
            }

            const payload = {
                ...vm.edit,
                dateOfBirth: `${vm.edit.dobYear}-${String(vm.edit.dobMonth).padStart(2, '0')}-${String(vm.edit.dobDay).padStart(2, '0')}`,
                zipCode: parseInt(vm.edit.zipCode, 10)
            };

            vm.saving = true;

            ProfileService.updateProfile(payload)
                .then(function (res) {

                    if (!res.data.isSuccess) {
                        toastr.error(res.data.message || 'Update failed');
                        return $q.reject(res);
                    }

                    toastr.success(res.data.message || 'Profile updated successfully');

                    return ProfileService.getProfile();
                })
                .then(function (res) {

                    if (res.data.isSuccess) {
                        vm.profile = res.data.data;
                        syncSession(vm.profile);
                        vm.initials = ProfileService.buildInitials(vm.profile);
                        vm.editMode = false;
                    } else {
                        toastr.error(res.data.message || 'Failed to reload profile');
                    }
                })
                .catch(function (err) {


                    vm.saveError = (err && err.data && err.data.message)
                        ? err.data.message
                        : 'Something went wrong';

                    toastr.error(vm.saveError);
                })
                .finally(function () {
                    vm.saving = false;
                });
        }

        vm.triggerFilePicker = function () {
            const fileInput = document.getElementById('profileImageInput');
            if (fileInput) {
                fileInput.click();
            }
        };

        vm.onFileSelected = function (inputEl) {
            const file = inputEl.files && inputEl.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                $scope.$apply(() => {
                    vm.imgUploadError = "File is too large (Max 2MB)";
                });
                return;
            }

            vm.imgUploadError = null;
            vm.imgUploadSuccess = false;
            vm.imgUploading = true;

            const reader = new FileReader();
            reader.onload = function (e) {
                $scope.$apply(() => {
                    vm.imgPreview = e.target.result;
                });
            };
            reader.readAsDataURL(file);

            ProfileService.uploadProfileImage(file)
                .then(function (res) {
                    vm.imgUploadSuccess = true;
                    return loadProfile();
                })
                .catch(function (err) {
                    vm.imgUploadError = "Upload failed. Please try again.";
                    vm.imgPreview = null;
                })
                .finally(function () {
                    vm.imgUploading = false;
                    inputEl.value = '';
                });
        };
    });
    
