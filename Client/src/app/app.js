angular.module( 'meshApp', [
  'templates-app',
  'templates-common',
  'meshApp.config',
  'meshApp.login',
  'meshApp.register',
  'meshApp.model',
  'meshApp.home',
  'meshApp.profile',
  'meshApp.messages',
  'meshApp.group',
  'meshApp.search',
  'meshApp.modelUpload',
  'ui.router',
  'ui.bootstrap',
  'ui.mesh.verticalTabs',
  'ui.mesh.breadcrum',
  'ui.mesh.modelthumbnail',
  'angularMoment',
  'ngTagsInput'
])

.constant('_', window._)
.constant('angularMomentConfig', {
        preprocess: 'utc'/*,
        timezone: 'Europe/London'*/
    }
)
.config( function myAppConfig ( $stateProvider, $urlRouterProvider, $httpProvider ) {
  // $httpProvider.responseInterceptors.push('httpInterceptor');
  $urlRouterProvider.otherwise( '/login' );
})
.run( function run ($rootScope, meshApi) {
  $rootScope._ = window._;
  meshApi.init();
})
.config(['$httpProvider', function ($httpProvider) {
  // Reset headers to avoid OPTIONS request (aka preflight)
  $httpProvider.defaults.headers.common = {};
  $httpProvider.defaults.headers.post = { 'Content-Type': 'application/json'};
  $httpProvider.defaults.headers.put = { 'Content-Type': 'application/json'};
  $httpProvider.defaults.headers.patch = { 'Content-Type': 'application/json'};
}])
.controller( 'AppCtrl', function AppCtrl ( $scope, $http, $location ) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if ( angular.isDefined( toState.data.pageTitle ) ) {
      $scope.pageTitle = toState.data.pageTitle;
      $scope.loadTags = function ($query, server) {
          return $http.get(server.url + '/tags?filter=' + $query);
      };
    }
  });
})
;

