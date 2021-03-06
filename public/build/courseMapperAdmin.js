var admin = angular.module('courseMapperAdmin', ['courseMapper', 'ngResource', 'ngRoute', 'toastr']);

admin.filter('capitalize', function() {
    return function(input, all) {
        return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) : '';
    }
});

;admin.controller('applicationsController', function ($scope, $route, $routeParams, $location, $http, $timeout) {
    $scope.route = $route;
    $scope.location = $location;
    $scope.routeParams = $routeParams;
    $scope.widgets = null;

    $scope.sortType = 'location';
    $scope.sortReverse = false;

    $scope.init = function () {
        $http.get('/api/widgets/all')
            .success(function (res) {
                if (res.result && res.widgets) {
                    $scope.widgets = res.widgets;
                }
            });
    };

    function updateWidgetResult(updated, widgets) {
        for (var i in widgets) {
            var wdg = widgets[i];
            if (wdg.name == updated.name) {
                wdg.isActive = updated.isActive;
            }
        }

        $timeout(function () {
            $scope.$apply()
        });
    }

    $scope.activate = function (app, widgetName) {
        $http.put('/api/widgets/' + app + '/' + widgetName, {
            isActive: true
        }).success(function (res) {
            if (res.result && res.widget) {
                res.widget.isActive = true;
                updateWidgetResult(res.widget, $scope.widgets);
            }
        });
    };

    $scope.deactivate = function (app, widgetName) {
        $http.put('/api/widgets/' + app + '/' + widgetName, {
            isActive: false
        }).success(function (res) {
            if (res.result && res.widget) {
                res.widget.isActive = false;
                updateWidgetResult(res.widget, $scope.widgets);
            }
        });
    };

    $scope.init();

});;admin.controller('CategoryListController', function ($scope, $http, $rootScope, $timeout, toastr) {

    $scope.initData = function () {
        $http.get('/api/categories').success(function (data) {
            $scope.categories = data.categories;
        });
    };

    $scope.initData();

    $scope.$on('sidebarInit', function (ngRepeatFinishedEvent) {
        $.AdminLTE.tree('.sidebar');
    });

    $scope.$on('init', function (event, args) {
        $scope.initData();
    });

    $scope.deleteCategory = function(catId){
        if(!confirm('Delete this category and its childs?'))
            return;

        $http.delete('/api/category/' + catId)
            .success(function(data){
                if(data.result){
                    toastr.success('Successfully deleted');

                    $scope.$emit('init');
                }
            })
            .error(function(data){
                $scope.errors = data.errors;
            });
    };

    $scope.editCategory = function(data){
        // toggle edit mode
        if($scope.editMode){
            $scope.editMode = false;
            return;
        }

        $scope.editMode = true;
        $scope.editData = {
            _id: data._id,
            name: data.name
        };

        $('#editCategoryModal').modal('show');
    };

    $scope.saveEditCategory = function(isValid){
        if(!isValid)
            return;

        var d = transformRequest($scope.editData);
        $http({
            method: 'PUT',
            url: '/api/category/' + $scope.editData._id,
            data: d, // pass in data as strings
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {

                if (data.result) {
                    // if successful, bind success message to message
                    //$scope.categories[data.category._id] = data.category;

                    toastr.success('category edited');
                    $('#editCategoryModal').modal('hide');
                    $scope.$emit('init');

                }
            })
            .error(function (data) {
                $scope.errors = data.errors;
            });
    };
});

admin.controller('categoryFormController', function ($scope, $http) {
    $scope.formData = [];

    $scope.processForm = function (catId) {
        var d = transformRequest($scope.formData[catId]);
        $http({
            method: 'POST',
            url: '/api/categories',
            data: d, // pass in data as strings
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                //console.log(data);
                if (data.result) {
                    // if successful, bind success message to message
                    $scope.newCategory = data.category;

                    $scope.$emit('init');
                }
            })
            .error(function (data) {
                $scope.errors = data.errors;
            });
    };
});

admin.controller('tagFormController', function ($scope, $http) {
    $scope.formData = {};

    $scope.setCategory = function (cat) {
        $scope.formData.category = cat;
    };

    $scope.processForm = function () {
        var d = transformRequest($scope.formData);
        $http({
            method: 'POST',
            url: '/api/courseTags',
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                //console.log(data);
                if (data.result) {
                    // if successful, bind success message to message
                    $scope.newTag = data.tag;
                    $scope.$emit('init');
                }
            })
            .error(function (data) {
                $scope.errors = data.errors;
            });
    };
});

admin.controller('courseFormController', function ($scope, $http) {
    $scope.formData = {};

    $scope.setCategory = function (cat) {
        $scope.formData.category = cat;
    };

    $scope.processForm = function () {
        var d = transformRequest($scope.formData);
        $http({
            method: 'POST',
            url: '/api/courses',
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                //console.log(data);
                if (data.result) {
                    // if successful, bind success message to message
                    $scope.newCourse = data.course;
                    $scope.$emit('init');
                }
            })
            .error(function (data) {
                if (!data.result) {
                    $scope.errorName = data.errors.name;
                    console.log(data.errors);
                }
            });
    };
});

admin.controller('CourseListController', function ($scope, $http, $rootScope) {
    $http.get('/api/courses').success(function (data) {
        $scope.courses = data.courses;
    });
});

admin.controller('categoryDetailController', function ($scope, $http, $routeParams) {
    $scope.category = '';
    $scope.courses = {};
    $scope.courseTags = {};

    $http.get('/api/category/' + $routeParams.category).success(function (data) {
        if (data.category) {
            $scope.category = data.category;
            $scope.courseTags = data.category.courseTags;
        }
    });

    $scope.getCourses = function () {
        $http.get('/api/category/' + $scope.category._id + '/courses').success(function (data) {
            $scope.courses = data.courses;
        });
    };

    $scope.getCourseTags = function () {
        $http.get('/api/category/' + $scope.category._id + '/courseTags').success(function (data) {
            $scope.tags = data.courseTags;
        });
    };

    $scope.$watch('category', function (newValue, oldValue) {
        if ($scope.category) {
            $scope.getCourses();
            $scope.getCourseTags();
        }
    });

    $scope.initData = function () {
        $scope.getCourses();
        $scope.getCourseTags();
    };

    $scope.$on('init', function (event, args) {
        $scope.initData();
    });

});;admin.controller('CategoryRecommendationsController', function ($scope, $route, $routeParams, $location, $http, $timeout) {
    $scope.route = $route;
    $scope.location = $location;
    $scope.routeParams = $routeParams;
    $scope.categories = [];

    $scope.init = function () {
        $http.get('/api/categories/recommendations').success(function (res) {
            if (res.result && res.categories) {
                $scope.categories = res.categories;
            }
        });
    };

    $scope.delete = function (recId) {
        $http.delete('/api/categories/recommendation/' + recId, {})
            .success(function (res) {
                if (res.result) {
                    for (var i = 0; i < $scope.categories.length; i++) {
                        $scope.categories.splice(i, 1);
                        break;
                    }

                    $timeout(function () {
                        $scope.$apply();
                    })
                }
            });
    };

    $scope.init();

});;admin.controller('adminController', function($scope, $route, $routeParams, $location) {
    $scope.$route = $route;
    $scope.$location = $location;
    $scope.$routeParams = $routeParams;
});;admin.controller('adminHomeController', function ($scope, $route, $routeParams, $location, $http, $timeout) {
    $scope.route = $route;
    $scope.location = $location;
    $scope.routeParams = $routeParams;

    $scope.init = function () {

    };

    $scope.init();
});;admin.controller('MainMenuController', function($scope, $http, $rootScope) {
    $http.get('/api/account').success(function(data) {
        $scope.user = data;
        $rootScope.user = data;
 
        $rootScope.$broadcast('onAfterInitUser', $rootScope.user);
    });
});;admin.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
        when('/categories', {
            templateUrl: '/cm-admin/categories',
            controller: 'adminController',
            resolve: {
                pd: function ($q) {
                    return ( {
                        title: 'Manage Categories',
                        breads: [
                            {a: '', active: true, title: 'Categories'}
                        ]
                    } );
                }
            }
        }).

        when('/categories/:category', {
            templateUrl: '/cm-admin/category',
            controller: 'adminController',
            resolve: {
                pd: function ($q) {
                    return ( {
                        title: 'Manage Category',
                        breads: [
                            {a: '#/categories', active: false, title: 'Categories'}
                        ]
                    });
                }
            }
        }).

        when('/widgets', {
            templateUrl: '/cm-admin/applications',
            controller: 'applicationsController',
            resolve: {
                pd: function ($q) {
                    return ( {
                        title: 'Manage Widgets and Background Plugins',
                        breads: [
                            {a: '#/widgets', active: false, title: 'Widgets and Background Plugins'}
                        ]
                    });
                }
            }
        }).

        when('/tabs', {
            templateUrl: '/cm-admin/tabs',
            controller: 'tabsController',
            resolve: {
                pd: function ($q) {
                    return ( {
                        title: 'Manage Tabs',
                        breads: [
                            {a: '#/tabs', active: false, title: 'Tabs'}
                        ]
                    });
                }
            }
        }).

        when('/adminusers', {
            templateUrl: '/cm-admin/adminusers',
            controller: 'AdminUserController',
            resolve: {
                pd: function ($q) {
                    return ( {
                        title: 'Manage Admin Users',
                        breads: [
                            {a: '#/adminusers', active: false, title: 'Admin Users'}
                        ]
                    });
                }
            }
        }).

        when('/cm-admin', {
            templateUrl: '/cm-admin-html.tpl',
            controller: 'adminHomeController',
            resolve: {
                pd: function ($q) {
                    return ( {
                        title: 'Admin Home',
                        breads: [
                            {a: '#/home', active: false, title: 'Home'}
                        ]
                    });
                }
            }
        }).

        when('/category-recommendations', {
            templateUrl: '/cm-admin/category-recommendations',
            controller: 'CategoryRecommendationsController',
            resolve: {
                pd: function ($q) {
                    return ( {
                        title: 'Category Recommendations',
                        breads: [
                            {a: '#/home', active: false, title: 'category recommendations'}
                        ]
                    });
                }
            }
        }).

        otherwise({
            redirectTo: '/cm-admin'
        });
    }]);


;admin.controller('tabsController', function ($scope, $route, $routeParams, $location, $http, $timeout) {
    $scope.route = $route;
    $scope.location = $location;
    $scope.routeParams = $routeParams;
    $scope.tabs = null;

    $scope.init = function () {
        $http.get('/api/tabs/all').success(function (res) {
            if (res.result && res.tabs) {
                $scope.tabs = res.tabs;
            }
        });
    };

    function updateTabResult(updated, tabs) {
        for (var i in tabs) {
            var wdg = tabs[i];
            if (wdg.name == updated.name) {
                wdg.isActive = updated.isActive;
            }
        }

        $timeout(function () {
            $scope.$apply()
        });
    }

    $scope.activate = function (tabName) {
        $http.put('/api/tabs/' + tabName, {
            isActive: true
        }).success(function (res) {
            if (res.result && res.tab) {
                res.tab.isActive = true;
                updateTabResult(res.tab, $scope.tabs);
            }
        });
    };

    $scope.deactivate = function (tabName) {
        $http.put('/api/tabs/' + tabName, {
                isActive: false
            })
            .success(function (res) {
                if (res.result && res.tab) {
                    res.tab.isActive = false;
                    updateTabResult(res.tab, $scope.tabs);
                }
            });
    };

    $scope.init();

});;admin.controller('AdminUserController', function ($scope, $route, $routeParams, authService,
                                                  $location, $http, $timeout, toastr) {
    $scope.route = $route;
    $scope.location = $location;
    $scope.routeParams = $routeParams;
    $scope.users = null;
    $scope.formData = {};
    $scope.currentUser = null;

    $scope.init = function () {
        $http.get('/api/accounts/all').success(function (res) {
            if (res.result && res.users) {
                $scope.users = res.users;
            }
        });
    };

    $scope.$on('onAfterInitUser', function (event, user) {
        $scope.currentUser = user.user;
    });


    /*$scope.activate = function (tabName) {
     $http.put('/api/tabs/' + tabName, {
     isActive: true
     }).success(function (res) {
     if (res.result && res.tab) {
     res.tab.isActive = true;
     updateTabResult(res.tab, $scope.tabs);
     }
     });
     };

     $scope.deactivate = function (tabName) {
     $http.put('/api/tabs/' + tabName, {
     isActive: false
     })
     .success(function (res) {
     if (res.result && res.tab) {
     res.tab.isActive = false;
     updateTabResult(res.tab, $scope.tabs);
     }
     });
     };*/

    $scope.saveUserForm = function () {
        $scope.formData.role = 'admin';

        $scope.isLoading = true;
        authService.signUp($scope.formData,
            function (user) {
                $scope.isLoading = false;
                toastr.success('User was added.');
                $scope.init();
                $scope.formData.username = '';
                $scope.formData.email = '';
                $scope.formData.password = '';
            },
            function error(data) {
                if (data.errors) {
                    $scope.errors = data.errors;
                }
                $scope.isLoading = false;
            }
        );
    };

    $scope.deleteUser = function (_id) {
        if (confirm("Are you sure you want to delete this user?")) {
            $http.delete('/api/account/' + _id).success(function (res) {
                if (res.result) {
                    $scope.init();
                    $scope.formData.username = '';
                    $scope.formData.email = '';
                    $scope.formData.password = '';
                } else {
                    toastr.error('Failed deleting user.');
                }
            });
        }
    };

    $scope.init();

});