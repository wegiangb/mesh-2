angular.module('meshApp.profile', [
    'ui.router'
])
    .config(function config($stateProvider) {
        $stateProvider.state('home.profile', {
            url: '/profile/:id',
            controller: 'ProfileCtrl',
            templateUrl: 'profile/profile.tpl.html',
            data: { pageTitle: 'profile' }
        });
    })

    .controller('ProfileCtrl', function ProfileController($scope, $stateParams, $http) {
        $http.get('http://meshdev.ddns.net:8000/users/' + $stateParams.id). // TODO: make url configurable?
            success(function (data, status, headers, config) {
                $scope.user = data;
            });
    });
