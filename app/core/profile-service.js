
angular.module('app')
    .service('ProfileService', function (ApiService,$q) {

        const API = '/user/profile'; 

        

        this.getProfile = function () {
            return ApiService.get(API);
        };

        this.updateProfile = function (payload) {
            return ApiService.put(API, payload);
        };

        this.uploadImage = function (formData) {
            return ApiService.postFormData(`${API}/image`, formData, {
                headers: { 'Content-Type': undefined },
                transformRequest: angular.identity
            });
        };


        this.MIN_AGE = 13;

        this.PHONE_PATTERN = /^[0-9]{10}$/;
        this.ZIP_PATTERN = /^[0-9]{6}$/;

        this.CITY_MAP = {
            'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kannur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kottayam', 'Idukki', 'Wayanad', 'Pathanamthitta', 'Kasaragod'],
            'Tamilnadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Kancheepuram'],
            'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari', 'Shivamogga', 'Vijayapura', 'Tumakuru', 'Udupi']
        };

        const MAX_SIZE = 2 * 1024 * 1024;
        const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

        this.buildInitials = function (p) {
            if (p.firstName && p.lastName)
                return (p.firstName[0] + p.lastName[0]).toUpperCase();
            if (p.firstName) return p.firstName.slice(0, 2).toUpperCase();
            return '??';
        };

        this.capitalise = function (str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        this.validateImage = function (file) {

            if (!file) {
                return { valid: false, error: 'No file selected' };
            }

            if (!ALLOWED_TYPES.includes(file.type)) {
                return { valid: false, error: 'Only JPG and PNG files are allowed' };
            }

            if (file.size > MAX_SIZE) {
                return { valid: false, error: 'Max file size is 2MB' };
            }

            return { valid: true };
        };

        this.uploadProfileImage = function (file) {

            const validation = this.validateImage(file);
            if (!validation.valid) {
                return $q.reject({ message: validation.error });
            }

            const formData = new FormData();
            formData.append('File', file);

            return this.uploadImage(formData)
                .then(res => {
                    if (!res.data.isSuccess) {
                        return $q.reject({ message: res.data.message });
                    }
                    return this.getProfile();
                });
        };

        this.validateDOB = function (day, month, year) {
            if (!day || !month || !year) return { valid: true };

            const dob = new Date(year, month - 1, day);
            const today = new Date();

            if (
                dob.getFullYear() !== +year ||
                dob.getMonth() !== month - 1 ||
                dob.getDate() !== +day
            ) {
                return { valid: false, error: 'Invalid date' };
            }

            if (dob > today) {
                return { valid: false, error: 'Future date not allowed' };
            }

            let age = today.getFullYear() - +year;
            if (today < new Date(today.getFullYear(), month - 1, day)) age--;

            if (age < this.MIN_AGE) {
                return { valid: false, ageError: `Minimum age is ${this.MIN_AGE}` };
            }

            return { valid: true };
        };
    });