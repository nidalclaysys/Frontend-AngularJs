// auth.service.js
angular.module('app.auth')
    .service('AuthService', function (ApiService, $q) {

        // ── Static city data (replace getCities API call if backend not ready) ──
        const CITY_MAP = {
            'Kerala': [
                'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur',
                'Kannur', 'Kollam', 'Palakkad', 'Alappuzha',
                'Malappuram', 'Kottayam', 'Idukki', 'Wayanad',
                'Pathanamthitta', 'Kasaragod'
            ],
            'Tamilnadu': [
                'Chennai', 'Coimbatore', 'Madurai', 'Salem',
                'Tiruchirappalli', 'Tirunelveli', 'Vellore', 'Erode',
                'Thoothukudi', 'Dindigul', 'Thanjavur', 'Kancheepuram'
            ],
            'Karnataka': [
                'Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi',
                'Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari',
                'Shivamogga', 'Vijayapura', 'Tumakuru', 'Udupi'
            ]
        };

        // ── Auth API calls ──

        this.login = function (data) {
            return ApiService.post('/account/login', data);
        };

        this.register = function (data) {

            // ✅ Convert DOB to ISO format
            const dob = new Date(
                data.year,
                data.month - 1,
                data.day
            );
            const payload = {
                userName: data.userName,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
                displayName: data.displayName,
                dateOfBirth: dob.toISOString(),
                gender: data.gender,   
                address: data.address,
                city: data.city,
                state: data.state,
                zipCode: parseInt(data.zipCode) || 0, 
                phone: data.phone,
                mobile: data.mobile
            };
            return ApiService.post('/account/register', payload);
        };

        this.forgotPassword = function (data) {
            return ApiService.post('/account/forgot-password', { email: data.userName });
        };

        this.getCities = function (state) {
            if (!state) return $q.resolve({ data: [] });

            const local = CITY_MAP[state] || [];
            return $q.resolve({ data: local });

        };
    });