angular.module('meshApp.groupCreate', [
    'ui.router'
])
    .config(function ($stateProvider) {
        $stateProvider.state('home.groupCreate', {
            url: '/groupCreate',
            templateUrl: 'groupCreate/groupCreate.tpl.html',
            data: {
                pageTitle: "Create Group"
            }
        });
    })
    .controller("GroupCreateCtrl", function ($scope, $state, meshApi, usSpinnerService, ngDialog) {
        $scope.group = {};
        $scope.registerPending = false;
        $scope.group.visibility = 'public';

        $scope.createGroup = function (group) {
            usSpinnerService.spin('spinner');
            $scope.registerPending = true;

            meshApi.createGroup(group.name, group.description, group.visibility)
                .success(function (data) {
                    usSpinnerService.stop('spinner');
                    $scope.registerPending = false;
                    ngDialog.open({
                        template: 'groupCreateSuccessId',
                        className: 'ngdialog-theme-default'
                    }).closePromise.then(function() {

                        $state.go('home.group', {
                            name: data.name
                        });
                    });

                })
                .error(function (data) {
                    usSpinnerService.stop('spinner');
                    $scope.registerPending = false;
                    $scope.groupRegisterError = data.error;
                });
        };
    });
