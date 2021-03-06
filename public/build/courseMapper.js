var app = angular.module('courseMapper', [
    'ngResource', 'ngRoute', 'ngCookies',
    'ngTagsInput', 'ngFileUpload', 'oc.lazyLoad',
    'relativeDate', 'angular-quill',
    'VideoAnnotations', 'SlideViewerAnnotationZones',
    'LearningHub',
    'ngAnimate', 'toastr', 'externalApp', 'daterangepicker', 'uiSwitch']);

app.config(function (toastrConfig) {
    angular.extend(toastrConfig, {
        positionClass: 'toast-top-center',
        preventOpenDuplicates: true,
        maxOpened: 1
    });
});;app.config(['$routeProvider', '$locationProvider',

    function ($routeProvider, $locationProvider) {

        $routeProvider.
        when('/static/about', {
            templateUrl: '/static/about',
            controller: 'staticController',
            reloadOnSearch: false
        }).

        when('/static/privacy', {
            templateUrl: '/static/privacy',
            controller: 'staticController',
            reloadOnSearch: false
        }).

        when('/category/:slug', {
            templateUrl: 'courses_list.html',
            controller: 'CourseListController',
            reloadOnSearch: false
        }).

        when('/cid/:courseId/nid/:nodeId', {
            templateUrl: function (params) {
                var tUrl = '/treeNode/' + params.courseId + '/nodeDetail/' + params.nodeId;
                if (params.iframe === 'true' || params.iframe === 'false')
                    tUrl += '?iframe=' + params.iframe;
                return tUrl;
            },
            controller: 'NodeRootController',
            reloadOnSearch: false
        }).

        when('/cid/:courseId', {
            templateUrl: function (params) {
                var tUrl = '/course/courseDetail/' + params.courseId;
                if (params.iframe === 'true' || params.iframe === 'false')
                    tUrl += '?iframe=' + params.iframe;
                return tUrl;
            },
            controller: 'CourseRootController',
            reloadOnSearch: false
        }).

        otherwise({
            redirectTo: '/'
        });

    }]);
;app.controller('AdvancedSearchController', function ($rootScope, $scope, $http, $routeParams, $location) {

    var queries = {};
    var loadRelevant = function (term) {
        if (queries[term]) {
            $scope.relevant = queries[term];
            return;
        }
        $http.get('/api/relevant-search?term=' + term + '&resources=contentNodes,courses')
            .success(function (data) {
                $scope.relevant = _.take(_.shuffle(data), 5);
                queries[term] = $scope.relevant;
                setBusy(false);
            });
    };

    var loadPopular = function (term) {
        $http.get('/api/relevant-search?term=' + term + '&resources=courses')
            .success(function (data) {
                orderPopular(data);
                setBusy(false);
            });
    };

    var orderPopular = function (data) {
        $scope.popular = _.take(_.sortBy(data, $scope.popularBy, 'desc'), 10);
    };

    var search = function () {

        var term = $scope.searchTerm;

        // Check if search is empty
        if (!term || term.length == 0) {
            // Clear previous result
            $scope.result = null;
            $scope.relevant = null;
            return;
        }

        setBusy(true);

        // Build query
        var user = $rootScope.user;
        var query = '?term=' + term;

        // Configure resource query
        var allowedResources = [];
        for (var resourceType in $scope.resources) {
            var r = $scope.resources[resourceType];
            if (r.selected) {
                allowedResources.push(resourceType);
            }
        }
        query += '&resources=' + allowedResources.join();

        // Configure network query
        switch ($scope.network) {
            case "owned":
                query += '&owner=' + user._id;
                break;
        }

        // Find matching results
        $http.get('/api/advanced-search' + query)
            .success(function (data) {

                var startAt = $scope.filterDate.startDate;
                var endAt = $scope.filterDate.endDate;

                if (startAt && endAt) {
                    $scope.result = _.filter(data, function (o) {
                        return $scope.filterDate.startDate.isBefore(o.updated) &&
                            $scope.filterDate.endDate.isAfter(o.updated);
                    });
                }
                else {
                    $scope.result = data;
                }

                setBusy(false);

                loadRelevant(term);
                loadPopular(term);
            });
    };

    var setBusy = function (isBusy) {
        $scope.isBusy = isBusy;
    };

    function init() {

        setBusy(false);
        $scope.popularBy = '-activity';
        $scope.result = null;
        $scope.relevant = null;
        $scope.network = 'global';
        $scope.resources = {
            categories: {selected: true},
            contentNodes: {selected: true},
            courses: {selected: true},
            videoAnnotations: {selected: false},
            pdfAnnotations: {selected: false},
            extResources: {selected: false}
        };

        $scope.filterDate = {startDate: null, endDate: null};

        // Monitor changes of filters
        $scope.$watch('network', search);
        $scope.$watch('resources', search, true);
        $scope.$watch('filterDate', search, true);
        $scope.$watch('popularBy', function () {
            loadPopular($scope.searchTerm);
        }, true);

        // Subscribe to menu query text changes
        $scope.$on('searchQueryChanged', function (event, args) {
            $scope.searchTerm = args.state;
            search();
        })
    }

    // Initialize controller
    init();
});;app.controller('VideoContentPreviewController', function($scope) {
    $scope.API = null;

    $scope.onPlayerReady = function (API) {
        $scope.API = API;
    };

    $scope.$watch('isPlaying', function(newVal, oldVal){
        if(!$scope.isPlaying && $scope.API){
            $scope.API.pause();
        }
    });

});;app.controller('actionBarCoursePreviewController', function ($scope, courseService, authService, toastr, $timeout) {

    $scope.loading = false;

    $scope.enroll = function () {
        $scope.loading = true;
        courseService.enroll(authService.user,

            function () {
                $scope.loading = false;
                toastr.success('You are now enrolled');
                $timeout(function(){
                    window.location.reload();
                });
            },

            function (res) {
                $scope.loading = false;
                toastr.error(JSON.stringify(res.errors));
            }
        );

    };

    $scope.leave = function () {
        $scope.loading = true;

        courseService.leave(authService.user,
            function () {
                $scope.loading = false;
                toastr.success('You left the course');
                $timeout(function(){
                    window.location.reload();
                });
            },

            function () {
                $scope.loading = false;
                toastr.error(JSON.stringify(res.errors));
            }
        );
    };
});
;app.controller('CategoryListController', function($scope, $http, $rootScope) {

    $http.get('/api/categories').success(function (data) {
        $scope.categories = data.categories;
    });

    $scope.$on('sidebarInit', function (ngRepeatFinishedEvent) {
        $.AdminLTE.tree('.sidebar');
    });

});
;app.controller('CourseController', function ($scope, $rootScope, $filter, $http,
                                             $location, $routeParams, $timeout,
                                             courseService, authService, toastr, Page) {

  $scope.courseId = $routeParams.courseId;
  $scope.course = null;
  $scope.videoSources = false;
  $scope.isPlaying = false;
  $scope.isDeleted = false;
  $scope.isFavorite = null;

  var checkFavorite = function () {
    var course = $scope.course;
    if (!course) return;

    $http.get('/api/favorites/' + course._id)
      .then(function (result) {
        $scope.isFavorite = result.data.isFavorite;
      })
  };

  $scope.tabOpened = function () {
    if (courseService.course) {
      $scope.course = courseService.course;
      $scope.initTab($scope.course);
    } else {
      $scope.$on('onAfterInitCourse', function (event, course, refreshPicture) {
        $scope.initTab(course, refreshPicture);
      });
    }
    checkFavorite();
    $rootScope.$broadcast('onCoursePreviewTabOpened', $scope.currentTab);
  };

  $scope.initTab = function (course, refreshPicture) {
    $scope.course = course;

    if (refreshPicture) {
      if ($scope.course.picture) {
        $scope.course.picture = $scope.course.picture + '?' + new Date().getTime();
      }
    }

    if ($scope.course.video) {
      $scope.videoSources = [{
        src: $scope.course.video,
        type: 'video/mp4'
      }];
    }

    Page.setTitleWithPrefix($scope.course.name + ' > Preview');
  };

  $scope.playVideo = function () {
    $scope.isPlaying = true;
  };

  $scope.stopVideo = function () {
    $scope.isPlaying = false;
  };

  $scope.enroll = function () {
    $scope.loading = true;
    if (!authService.user) {
      toastr.warning("Please Login to Enroll.", {preventDuplicates: false});
    }
    else
      courseService.enroll(authService.user,

        function () {
          $scope.loading = false;
          toastr.success('You are now enrolled.');
          $timeout(function () {
            window.location.reload();
          });
        },

        function (res) {
          $scope.loading = false;
          toastr.error(JSON.stringify(res.errors));
        }
      );
  };

  $scope.toggleFavorite = function () {
    if ($scope.isFavorite === null) return;

    var method = $scope.isFavorite === true ? 'DELETE' : 'POST';

    $http({
      method: method,
      url: '/api/favorites/' + $scope.course._id
    }).then(
      function (result) {
        $scope.isFavorite = !$scope.isFavorite;
        if ($scope.isFavorite) {
          toastr.success('Added course to favorites.');
        } else {
          toastr.success('Removed course from favorites.');
        }
        $scope.$emit('favorites.update');
      },
      function (err) {
        var op = $scope.isFavorite ? 'remove from' : 'add to';
        toastr.error('Failed to ' + op + ' favorites.');
      })
  };

  /**
   * init tabs
   */
  $scope.tabOpened();
});
;app.controller('CourseConfigController', function ($scope, $http, toastr, $window, $timeout) {
    $scope.courseEdit = null;
    $scope.errors = [];
    $scope.managersRaw = [];
    $scope.managersIdRaw = [];
    $scope.username = '';
    $scope.isLoading = false;
    $scope.tabsActive = {};
    $scope.settings = {
        disableControls: false,
        disableTop: false
    };

    $scope.$on('onAfterInitCourse', function (event, course) {
        $scope.init(course);
    });

    $scope.init = function (course) {
        if (!course)
            return;

        $scope.managersRaw = [];

        $('#usernameSearchBox').on('keydown', function (event) {
            var x = event.which;
            if (x === 13) {
                event.preventDefault();
                $scope.findUsername();
            }
        });

        $scope.courseEdit = cloneSimpleObject(course);

        $('#managerTagForm input').attr('readonly', 'readonly');

        if ($scope.courseEdit) {
            if ($scope.courseEdit.managers && $scope.courseEdit.managers.length > 0) {
                for (var i in $scope.courseEdit.managers) {
                    var t = $scope.courseEdit.managers[i];
                    $scope.managersRaw.push({"text": t.username, "_id": t._id});
                }
            }
        }
    };

    $scope.findUsername = function () {
        $scope.errors = [];

        if ($scope.username.trim() != '') {
            $scope.isLoading = true;
            $http.get('/api/course/' + $scope.courseEdit._id + '/checkUsername/' + $scope.username)
                .success(function (res) {
                    if (res.result) {
                        if (res.user.username == $scope.username) {
                            if (!_.find($scope.managersRaw, {'text': $scope.username}, 'text')) {
                                $scope.managersRaw.push({"text": res.user.username, '_id': res.user._id});
                            }
                        }
                    }

                    $scope.username = '';
                    $scope.isLoading = false;
                })
                .error(function (res) {
                    $scope.errors = res.errors;
                    $scope.isLoading = false;
                });
        }
    };

    $scope.saveCourseSetting = function (isValid) {
        if (!isValid)
            return;

        $scope.managersIdRaw = [];

        var url = '/api/course/' + $scope.courseEdit._id + '/settings';
        $scope.managersIdRaw = [];
        if ($scope.managersRaw.length > 0) {
            for (var i in $scope.managersRaw) {
                $scope.managersIdRaw.push($scope.managersRaw[i]._id);
            }
        }

        var params = {
            managers: JSON.stringify($scope.managersIdRaw)
        };

        if ($scope.tabsActive) {
            params.tabsActive = $scope.tabsActive;
        }
        if ($scope.settings) {
            params.settings = $scope.settings;
        }

        $scope.isLoading = true;
        $http.put(url, params)
            .success(function (res) {
                if (res.result) {
                    toastr.success('Successfully Saved');
                }

                $scope.managersIdRaw = [];

                $scope.isLoading = false;
                $('#configView').modal('hide');
                $scope.errors = [];

                $window.location.reload();
            })
            .error(function (res) {
                $scope.errors = res.errors;
                $scope.isLoading = false;
            });
    };

    $scope.removeUsername = function ($tag) {
        console.log('removed ' + JSON.stringify($tag));
    };

    $scope.cancel = function () {
        $scope.courseEdit = cloneSimpleObject($scope.$parent.course);
    };

    $scope.deleteCourse = function () {
        if (confirm('Are you sure you want to delete this course?')) {
            $http.delete('/api/course/' + $scope.courseId)
                .success(function (data) {
                    if (data.result) {
                        toastr.success('Successfully deleted');

                        $timeout(function () {
                            $('#configView').modal('hide');
                            $('.content-course').css('display', 'none');
                            $('.action-header').css('visibility', 'hidden');
                            $scope.$parent.isDeleted = true;
                        });
                    }
                })
                .error(function (data) {
                    $scope.errors = data.errors;
                });
        }
    };
});
;app.controller('CourseEditController', function ($scope, $filter, $http, $location, Upload, toastr) {
  $scope.createdDate = new Date();
  $scope.courseEdit = null;
  $scope.tagsRaw = [];
  $scope.files = [];
  $scope.filespicture = false;
  $scope.filesvideo = false;

  $scope.isLoading = false;
  $scope.errors = [];

  $scope.progressPercentage = 0;

  $scope.$on('onAfterInitCourse', function (event, course) {
    $scope.init(course);
  });

  $scope.init = function (course) {
    if (!course)
      return;
    $scope.tagsRaw = [];
    $scope.courseEdit = cloneSimpleObject(course);

    if ($scope.courseEdit)
      if ($scope.courseEdit.courseTags && $scope.courseEdit.courseTags.length > 0) {
        for (var i in $scope.courseEdit.courseTags) {
          var t = $scope.courseEdit.courseTags[i];
          $scope.tagsRaw.push({"text": t.name});
        }
      }
  };

  $scope.saveCourse = function () {
    if ($scope.tagsRaw) {
      $scope.courseEdit.tags = JSON.stringify($scope.tagsRaw);
    }

    var uploadParams = {
      url: '/api/course/' + $scope.courseEdit._id,
      fields: {
        name: $scope.courseEdit.name,
        description: $scope.courseEdit.description,
        smallDescription: $scope.courseEdit.smallDescription,
        tags: $scope.courseEdit.tags
      }
    };

    uploadParams.file = [];
    // we only take one picture file
    if ($scope.filespicture) {
      uploadParams.file.push($scope.filespicture);
    }
    // we only take one vid file
    if ($scope.filesvideo) {
      uploadParams.file.push($scope.filesvideo);
    }

    $scope.isLoading = true;
    $scope.upload = Upload.upload(
      uploadParams
    )
      .progress(function (evt) {
        if (!evt.config.file)
          return;

        $scope.progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
      })

      .success(function (data) {
        $scope.$emit('onAfterEditCourse', data.course);

        $scope.filespicture = false;
        $scope.filesvideo = false;

        $scope.isLoading = false;
        $('#editView').modal('hide');

        $scope.progressPercentage = 0;

        var slg = data.course.slug;
        if (data.course.name != $scope.$parent.course.name)
          window.location.href = '/course/' + slg + '/#/cid/' + data.course._id + '?tab=preview';
        else
          window.location.reload();
      })

      .error(function (data) {
        $scope.isLoading = false;
        $scope.errors = data.errors;

        $scope.progressPercentage = 0;
      });
  };

  $scope.deleteVideo = function () {
    $http.post('/api/course/' + $scope.courseEdit._id, {
      video: "delete",
      name: $scope.courseEdit.name
    })
      .success(function (data) {
        $scope.courseEdit.video = false;
        $scope.$emit('onAfterEditCourse', data.course);
        toastr.success('Video deleted');
      })
      .error(function () {
        toastr.error('Video delete failed');
      });
  };

  $scope.deletePicture = function () {
    $http.post('/api/course/' + $scope.courseEdit._id, {
      picture: "delete",
      name: $scope.courseEdit.name
    })
      .success(function (data) {
        $scope.courseEdit.video = false;
        $scope.$emit('onAfterEditCourse', data.course);
        toastr.success('Picture deleted');
      })
      .error(function () {
        toastr.error('Picture delete failed');
      });
  };

  $scope.cancel = function () {
    $scope.courseEdit = cloneSimpleObject($scope.$parent.course);

    if ($scope.upload) {
      $scope.upload.abort();
    }
  };
});
;
app.controller('NewCourseController', function($scope, $filter, $http, $location) {
    $scope.submitted = false;
    $scope.isLoading = false;
    $scope.errors = [];

    $scope.course = {
        name: null,
        category: null,
        description: '',
        smallDescription: ''
    };

    $scope.tagsRaw = null;
    $scope.errors = [];

    $scope.loadTags = function(query) {
        return $http.get('/api/category/' + $scope.category._id + '/courseTags?query=' + query);
    };

    $scope.saveCourse = function(isValid) {
        if (isValid) {

            if ($scope.tagsRaw) {
                $scope.course.tags = JSON.stringify($scope.tagsRaw);
            }

            $scope.course.category = $scope.$parent.category._id;

            $scope.isLoading = true;
            var d = transformRequest($scope.course);
            $http({
                method: 'POST',
                url: '/api/courses',
                data: d,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {
                    console.log(data);
                    if (data.result) {
                        $scope.$emit('onAfterCreateNewCourse');
                        window.location.href = '/course/' + data.course.slug + '/#/cid/' + data.course._id + '?new=1';
                    }

                    $scope.isLoading = false;
                })
                .error(function(data){
                    $scope.isLoading = false;
                    $scope.errors = data.errors;
                });
        }
    };
});
;app.controller('CourseRootController', function ($scope, $rootScope, $filter, $http,
                                                 $location, $routeParams, $timeout,
                                                 courseService, authService, toastr, Page) {

    $scope.courseId = $routeParams.courseId;
    $scope.course = null;

    $scope.isOwner = false;
    $scope.isEnrolled = false;
    $scope.isManager = false;
    $scope.isAdmin = false;

    $scope.currentUrl = window.location.href;

    $scope.currentTab = "preview";
    $scope.tabDisplayName = "preview";
    $scope.defaultPath = "preview";

    $scope.include = null;
    $scope.includeActionBar = null;

    $scope.changeTab = function () {
        var q = $location.search();

        if (!q.tab) {
            q.tab = $scope.defaultPath;
        }

        $scope.currentTab = q.tab;

        $timeout(function () {
            if (!authService.isLoggedIn && $scope.currentTab != $scope.defaultPath) {
                authService.showLoginForm();
            } else {
                $scope.include = '/course/tab/' + $scope.currentTab;
                $scope.includeActionBar = '/course/actionBar/' + $scope.currentTab;
            }
        }, 120);

        if ($scope.course)
            Page.setTitleWithPrefix($scope.course.name + ' > ' + q.tab);

        $scope.getTabDisplayName($scope.currentTab);

        $rootScope.$broadcast('onCourseTabChange', $scope.currentTab);
    };

    $scope.getTabDisplayName = function (name) {
        $scope.tabDisplayName = $('li.' + name).attr('data-displayName');
    };

    $scope.init = function (refreshPicture) {
        courseService.init(
            $scope.courseId,

            function (course) {
                $scope.course = course;
                Page.setTitleWithPrefix($scope.course.name);

                $scope.setCapabilities();

                if ($scope.currentTab != $scope.defaultPath) {
                    if ($scope.course && !$scope.isAuthorized() && !$scope.isEnrolled) {
                        if (authService.isLoggedIn)
                            $scope.showEnrollForm();
                    }
                }

                $rootScope.$broadcast('onAfterInitCourse', $scope.course, refreshPicture);
            },

            function (res) {
                $scope.errors = res.errors;
                toastr.error('Failed getting course');
            },

            true
        );

        $scope.changeTab();
    };

    $scope.isAuthorized = function () {
        return ($scope.isAdmin || $scope.isOwner || $scope.isManager);
    };

    $scope.showEnrollForm = function () {
        $('#enrollForm').modal({backdrop: 'static', keyboard: false});
    };

    /**
     * show new course notification/guide if it is a new course
     */
    $scope.newCourseNotification = function () {
        var loc = $location.search();
        if (loc.new && loc.new == 1) {
            toastr.info('<p>You are now in a newly created course. </p>' +
                '<p>You can start by customizing this course by uploading introduction picture and video on the edit panel.</p>' +
                '<p>Collaborate and Annotate on course map and its contents in <i class="ionicons ion-map"></i> <b>Map Tab</b></p>' +
                '<p>Discuss related topic in <i class="ionicons ion-ios-chatboxes"></i> <b>Discussion Tab.</b></p>' +
                '<p>Adding widgets on <i class="ionicons ion-stats-bars"></i> <b>Analytics tab</b>.</p>' +
                '<p>Or wait for your students to enroll in to this course and start collaborating.</p>'
                , 'New course created'
                , {
                    allowHtml: true,
                    closeButton: true,
                    autoDismiss: false,
                    tapToDismiss: false,
                    toastClass: 'toast wide',
                    extendedTimeOut: 30000,
                    timeOut: 30000,
                    onHidden: function () {
                        $location.search('new', null);
                        $timeout(function () {
                            $rootScope.$apply();
                        });
                        //$location.url($location.path())
                    }
                });
        }
    };

    /**
     * initiate course when user hast tried to log in
     */
    $scope.$watch(function () {
        return authService.isLoggedIn;
    }, function () {
        if (authService.hasTriedToLogin && !$scope.course) {
            $scope.init();
        }
    });

    $scope.setCapabilities = function () {
        $scope.isEnrolled = courseService.isEnrolled();
        $scope.isManager = courseService.isManager(authService.user);
        $scope.isAdmin = authService.isAdmin();
        if (authService.user)
            $scope.isOwner = authService.user._id == $scope.course.createdBy._id;
        else
            $scope.isOwner = false;
    };

    $scope.$on('$routeUpdate', function () {
        $scope.changeTab();
    });

    $scope.$on('onAfterEditCourse', function (events, course) {
        $scope.init(true);
    });

    $scope.newCourseNotification();
});
;app.controller('CourseListController', function ($scope, $rootScope, $http,
                                                 $routeParams, $location, $sce,
                                                 Page, courseListService, authService) {
    $scope.slug = $routeParams.slug;

    // chosen filter
    $scope.filterTags = [];
    $scope.filterTagsText = [];
    // this will be displayed on the available filter
    $scope.availableTags = [];
    // the original list
    $scope.courseTags = [];
    $scope.category = null;
    $scope.courses = null;
    $scope.coursesLength = 0;

    $scope.orderBy = -1;
    $scope.sortBy = 'dateAdded';
    $scope.currentPage = 1;
    $scope.pageReset = false;
    $scope.lastPage = false;

    $scope.orderingOptions = [
        {id: 'dateAdded.-1', name: 'Newest First'},
        {id: 'dateAdded.1', name: 'Oldest First'},
        {id: 'totalEnrollment.-1', name: 'Most Popular'}
    ];

    $scope.widgets = [];

    $scope.isLoggedIn = function () {
        return (authService.user ? true : false);
    };

    $scope.getCoursesFromThisCategory = function (force) {

        courseListService.setPageParams({
            sortBy: $scope.sortBy,
            orderBy: $scope.orderBy,
            limit: 12,
            lastPage: false
        });

        courseListService.init($scope.category._id, $scope.filterTags,
            function (courses) {
                $scope.courses = courses;
                $scope.coursesLength = courses.length;
            },
            function (errors) {
                console.log(JSON.stringify(errors));
            }
            , force
        );
    };

    $scope.newRowsFetched = function (newRows, allRows) {
        if (newRows) {
            $scope.courses = allRows;
            $scope.coursesLength = $scope.courses.length;
        }
    };

    $scope.initTagFromSearch = function () {
        var tagSearch = $location.search();
        if (tagSearch && tagSearch.tags) {
            var tags = tagSearch.tags.split(',');
            if (tags)
                for (var i in tags) {
                    var tag = tags[i];
                    if ($scope.availableTags)
                        for (var j in $scope.availableTags) {
                            var t = $scope.availableTags[j];
                            if (t.slug == tag)
                                $scope.applyFilter(t, true);
                        }
                }
        }

        $scope.getCoursesFromThisCategory();

        $scope.$watch(function () {
            return $location.search()
        }, function (newVal, oldVal) {
            if (newVal && newVal !== oldVal)
                $scope.getCoursesFromThisCategory();
        }, true);
    };

    $scope.getCourseAnalytics = function (cid) {
        $http.get('/api/server-widgets/course-listing/?cid=' + cid).success(
            function (res) {
                if (res.result) {
                    $scope.widgets[cid] = $sce.trustAsHtml(res.widgets);
                }
            }
        ).error(function () {

        });
    };

    $scope.applyFilter = function (tag, dontgo) {
        if (arrayObjectIndexOf($scope.filterTags, tag, 'name') < 0) {
            $scope.filterTags.push(tag);
            $scope.filterTagsText.push(tag.slug);
            removeObjectFromArray($scope.availableTags, tag, 'name');
            if (!dontgo)
                $scope.go();
        }
    };

    $scope.go = function () {
        if ($scope.filterTags.length > 0) {
            $location.search({tags: $scope.filterTagsText.join(',')});
        }
        else
            $location.search({});

        $scope.getCoursesFromThisCategory(true);
        $scope.pageReset = Math.random();
    };

    $scope.removeFilter = function (tag) {
        if (arrayObjectIndexOf($scope.availableTags, tag, 'name') < 0) {
            $scope.availableTags.push(tag);
            removeObjectFromArray($scope.filterTags, tag, 'name');

            for (var i = $scope.filterTagsText.length - 1; i >= 0; i--) {
                if ($scope.filterTagsText[i] === tag.slug) {
                    $scope.filterTagsText.splice(i, 1);
                    break;
                }
            }
            $scope.go();
        }
    };

    /**
     * init category data by slug
     */
    $http.get('/api/category/' + $scope.slug)
        .success(function (data) {
            $scope.category = data.category;

            Page.setTitleWithPrefix($scope.category.name);

            // once we get the complete category structure, we operate by id
            $http.get('/api/category/' + $scope.category._id + '/courseTags').success(function (data) {
                $scope.courseTags = data.courseTags;
                $scope.availableTags = data.courseTags;

                $scope.initTagFromSearch();
            });
        })
        .error(function (err) {
            $scope.error = err;
        });

    $scope.paginationReset = function () {
        return $scope.pageReset;
    };

    $scope.$watch('orderType', function (newVal, oldVal) {
        if (newVal != oldVal) {
            var spl = newVal.id.split('.');

            courseListService.setPageParams({
                sortBy: spl[0],
                orderBy: parseInt(spl[1]),
                limit: 12,
                lastPage: false
            });

            $scope.sortBy = spl[0];
            $scope.orderBy = parseInt(spl[1]);
            // reset the page
            $scope.currentPage = 0;
            $scope.lastPage = false;
            $scope.pageReset = Math.random();

            courseListService.init($scope.category._id, $scope.filterTags,
                function (courses) {
                    $scope.courses = courses;
                    $scope.coursesLength = courses.length;
                },
                function (errors) {
                    console.log(JSON.stringify(errors));
                }
                , true
            );
        }
    });

});
;app.controller('MapController', function ($scope, $http, $rootScope, $element, $filter,
                                          $timeout, $sce, $location, authService, socket,
                                          toastr, mapService, courseService, collapseService) {
  $scope.treeNodes = [];
  $scope.jsPlumbConnections = [];
  $scope.widgets = [];
  $scope.isTreeInitiated = false;
  $scope.infoToast = null;
  $scope.infoEmptyToast = null;
  $scope.instance = null;
  $scope.nodeModaltitle = "";
  $scope.currentNodeAction = {};
  // for our view to show plus/minus button
  $scope.collapseStatus = {};

  // {"0": {nodeId:isCollapsed},}
  $scope.nodeChildrens = {};
  $scope.firstloaded = true;
  $scope.queryText = '';
  $scope.matchesFound = {};
  var markedNode = '';
  var searchMatches;
  var searchMatchIndex = 0;

  /**
   * find node recursively
   *
   * @param obj
   * @param col next search will be the array value of this key
   * @param searchKey
   * @param searchValue
   * @returns []
   */
  var findNodes = function (obj, col, searchKey, searchValue) {
    var result = [];
    if (!searchValue) return result;

    var findInternal = function (obj, col, searchKey, searchValue) {
      for (var i in obj) {
        var tn = obj[i];
        var isMatch = tn[searchKey].toLowerCase().indexOf(searchValue.toLowerCase()) > -1;
        if (tn[searchKey] && isMatch) {
          result.push(tn);
        }
        if (tn[col] && tn[col].length > 0) {
          findInternal(tn[col], col, searchKey, searchValue);
        }
      }
      return result;
    };
    return findInternal(obj, col, searchKey, searchValue);
  };

  var hideNodeTargetEdges = function (node) {
    _.each($element.find("[data-target='t" + node._id + "']"), function (c) {
      c.style.opacity = node.isHidden ? 0.15 : 1.0;
      c.style['-webkit-filter'] = 'grayscale(' + (node.isHidden ? 100 : 0) + '%)';
    });
  };

  $scope.findNextMatch = function () {
    if (!searchMatches || searchMatches.length <= 0) {
      return;
    }
    searchMatchIndex++;
    if (searchMatchIndex >= searchMatches.length) {
      searchMatchIndex = 0;
    }
    positionCanvasToNode(searchMatches[searchMatchIndex]);
  };

  $scope.getNodeStyle = function (node) {
    var style = {};
    var isSearching = $scope.queryText != '' || markedNode != '';
    if (isSearching) {
      style.opacity = ($scope.matchesFound[node._id] !== true) ? 0.25 : 1.0;
    } else {
      hideNodeTargetEdges(node);
    }
    return style;
  };

  $scope.findNode = function (obj, col, searchKey, searchValue) {
    return findNodes(obj, col, searchKey, searchValue)[0];
  };

  var updateMatchedResults = function (items) {
    _.each(items, function (item) {
      $scope.matchesFound[item._id] = true;
      var parent = findNodes($scope.treeNodes, 'childrens', '_id', item.parent)[0];
      while (parent) {
        collapseService.setExpand(parent._id);
        collapseService.affectVisual(false, parent, parent._id);
        $scope.collapseStatus[parent._id] = false;
        parent = findNodes($scope.treeNodes, 'childrens', '_id', parent.parent)[0];
      }
    });
    if (items && items.length > 0) {
      positionCanvasToNode(items[0]);
    }
    setConnectorsOpacity(!(_.isEmpty($scope.matchesFound)) ? 0.25 : 1.0)
  };

  $scope.lookupInTree = function () {
    $scope.matchesFound = {};
    searchMatches = null;
    searchMatches = findNodes($scope.treeNodes, 'childrens', 'name', $scope.queryText);
    if (searchMatches.length <= 0) {
      return;
    }
    updateMatchedResults(searchMatches);
  };

  //find the node from the query string and highlight it
  function highlightMarkedNode() {
    $scope.matchesFound = {};
    markedNode = $location.search().markedNode || '';
    if (!markedNode) {
      return;
    }
    var items = findNodes($scope.treeNodes, 'childrens', '_id', markedNode);
    if (items.length <= 0) {
      markedNode = '';
      toastr.warning(
        'Node does not exist', {
          allowHtml: true,
          autoDismiss: true,
          tapToDismiss: true,
          extendedTimeOut: 2000,
          timeOut: 5000,
          toastClass: 'toast wide'
        });
      return;
    }

    $timeout(function () {
      items.forEach(function (item) {
        item.isMarked = true;
      });
      updateMatchedResults(items);
      setConnectorsOpacity(0.15);
    }, 600);

    $timeout(function () {
      $scope.matchesFound = {};
      items.forEach(function (item) {
        item.isMarked = false;
      });
      $location.search('markedNode', null);
      markedNode = '';
      updateMatchedResults(items);
      setConnectorsOpacity(1.0);
    }, 5000)
  }

  var positionCanvasToNode = function (node) {
    if (!node) return;
    var offsetX = node.positionFromRoot.x;
    var offsetY = node.positionFromRoot.y;
    var pos = {
      left: Canvas.centerX - offsetX + 'px',
      top: Canvas.centerY - offsetY + 'px'
    };
    Canvas.position(pos, true);
  };

  var setConnectorsOpacity = function (opacity) {
    _.each($element.find('._jsPlumb_connector'), function (c) {
      c.style.opacity = opacity;
    });
  };

  $scope.initDropDownMenuHybrid = function () {
    $('#tree .course-map').on('click', function (event) {
      var target = $(event.target);
      var k = target.parents('div');
      if (k.hasClass('ui-draggable') && k.hasClass('w')) {
        return true;
      } else if (k.hasClass('center-course')) {
        return true;
      } else if (target.hasClass('w')) {
        return true;
      }

      if ($('.open').length > 0) {
        $('.open').removeClass('open');
        return false;
      }
    });
  };

  /**
   * get all categories, recursived on the server
   */
  $scope.initTab = function (course) {
    // add hover to center instantiate on hover
    $scope.initDropDown('center');

    mapService.init(course._id,

      function (treeNodes) {
        if (treeNodes.length > 0) {
          $scope.treeNodes = treeNodes;
          highlightMarkedNode();
        } else {
          $scope.initJSPlumb();
          $scope.showMapEmptyInfo();
        }

        socket.subscribe('map/' + course._id);
      },

      function (err) {
        console.log(err);
        //toastr.error('cannot load course tree');
      }
    );
  };

  $scope.tabOpened = function () {

    if (courseService.course) {
      $scope.course = courseService.course;

      if (mapService.treeNodes) {
        $scope.treeNodes = mapService.treeNodes;
      }

      $scope.initTab(courseService.course);
    } else {

      $scope.$on('onAfterInitCourse', function (event, course) {
        $scope.initTab(course);
      });
    }

    $rootScope.$broadcast('onCoursePreviewTabOpened', $scope.currentTab);
  };

  // initiate draggable jqUI to the topic node
  $scope.initDraggable = function (jsPlumbInstance) {
    var w = window.innerWidth;
    var h = window.innerHeight;

    // let us drag and drop the cats
    var mapEl = jsPlumb.getSelector(".course-map .w");
    jsPlumbInstance.draggable(mapEl, {
      start: function (params) {
        var el = $(params.el);
        var nId = el.attr('id').substring(1);
        var simulated = el.attr('is-simulated');
        if (simulated && simulated == 'simulated') {
          return;
        }

        var owned = el.hasClass('owned');
        if (!owned) {
          params.drag.abort();
        }

        if (collapseService.isCollapsed(nId) !== false) {
          params.drag.abort();
        }
      },

      // update position on drag stop
      stop: function (params) {
        var el = $(params.el);
        var pos = el.position();
        var distanceFromCenter = {
          x: pos.left - Canvas.w / 2,
          y: pos.top - Canvas.h / 2
        };

        var simulated = el.attr('is-simulated');
        if (simulated && simulated == 'simulated') {
          el.attr('is-simulated', '');
          return;
        }

        var nId = el.attr('id').substring(1); // remove 't' from the node id
        found = false;
        var pNode = $scope.findNode($scope.treeNodes, 'childrens', '_id', nId);

        $scope.sendPosition(nId, distanceFromCenter, pNode);
      }
    });
  };

  $scope.sendPosition = function (nId, distanceFromCenter, pNode) {
    $http.put('/api/treeNodes/' + nId + '/positionFromRoot', distanceFromCenter)
      .success(function (res, status) {
        //console.log(res);
        if (pNode)
          pNode.positionFromRoot = distanceFromCenter;
      })
      .error(function (res, status) {
        console.log('err');
        console.log(res);
      });
  };

  $scope.initJSPlumb = function () {
    jQuery('.tree-container').css('visibility', 'hidden');
    Tree.init(Canvas.w, Canvas.h);
    jsPlumb.ready(function () {
      $scope.instance = jsPlumb.getInstance({
        Endpoint: ["Blank", {
          radius: 2
        }],
        //HoverPaintStyle: {strokeStyle: "#3C8DBC", lineWidth: 2},
        PaintStyle: {
          strokeStyle: "#3C8DBC",
          lineWidth: 2
        },
        ConnectionOverlays: [],
        Container: "course-map"
      });

      $scope.initDraggable($scope.instance);

      // initialise all '.w' elements as connection targets.
      $scope.instance.batch(function () {
        /* connect center to first level cats recursively*/
        $scope.interConnect('center', $scope.treeNodes, $scope.instance);

        /*blanket on click to close dropdown menu*/
        $scope.initDropDownMenuHybrid();
      });

      $timeout(function () {
        $scope.firstCollapse($scope.treeNodes);

        $scope.initiateCollapse();
        jQuery('.tree-container').css('visibility', 'visible');
      })
    });
  };

  $scope.firstCollapse = function (treeNodes) {
    if (!$scope.firstloaded)
      return;

    $scope.firstloaded = false;
    for (var i = 0; i < treeNodes.length; i++) {
      var child = treeNodes[i];

      if (child.isDeletedForever)
        continue;

      $scope.getChildLength(child._id, 0, child);
    }

    // collapse on first level
    for (var j in $scope.nodeChildrens[1]) {
      var totalKids = $scope.nodeChildrens[1][j];
      if (totalKids > 0) {
        collapseService.setCollapse(j);
        $scope.collapseStatus[j] = true;
      } else {
        collapseService.setExpand(j);
        $scope.collapseStatus[j] = false;
      }
    }
  };

  $scope.initiateCollapse = function () {
    for (var i in collapseService.collapsed) {
      var colEl = 't' + collapseService.collapsed[i];
      $scope.collapse(colEl, true);
    }
  };

  $scope.getChildLength = function (nid, level, treeNodes) {
    if ($scope.nodeChildrens[level] == undefined) {
      $scope.nodeChildrens[level] = {};
    }

    if ($scope.nodeChildrens[level][nid] == undefined) {
      $scope.nodeChildrens[level][nid] = 0;
    }

    var add = 0;
    if (treeNodes.childrens && treeNodes.childrens.length > 0)
      add = 1;

    $scope.nodeChildrens[level][nid] += add;

    if (level > 1) {
      if ($scope.nodeChildrens[level][nid] > 0) {
        collapseService.setCollapse(nid);
        $scope.collapseStatus[nid] = true;
      }
    }

    if (treeNodes.childrens && treeNodes.childrens.length > 0) {
      level++;
      for (var e in treeNodes.childrens) {
        var ch = treeNodes.childrens[e];
        $scope.getChildLength(ch._id, level, ch);
      }
    } else {
      //console.log(level + ' ' + JSON.stringify($scope.nodeChildrens[level]));
    }
  };

  $scope.initDropDown = function (slug) {
    $('#' + slug)
      .on('click mousedown mouseup touchstart', function (event) {

        if (
          event.type == 'touchstart' && (
          event.target.className.indexOf('fa-plus-square') > -1 ||
          event.target.className.indexOf('fa-minus-square') > -1)
        ) {
          var el = event.target.parentNode;
          $timeout(function () {
            angular.element(el).triggerHandler('click');
          }, 0);
        }

        if ($(this).find('ul').hasClass('open')) {
          if ($(this).find('ul').hasClass('dropdown-course')) {
            if (event.type == 'touchstart') {
              if (event.target.href) {
                window.location.href = event.target.href;
              } else if (event.target.innerText == ' Edit' ||
                event.target.innerText == ' Delete' ||
                event.target.innerText == ' Delete Forever' ||
                event.target.innerText.indexOf('Add') > -1
              ) {
                var el = event.target;
                $timeout(function () {
                  angular.element(el).triggerHandler('click');
                  var mdlName = $(el).attr('data-target');
                  if (mdlName)
                    $(mdlName).modal('show');
                }, 0);

                return true;
              }
            } else
              return true;
          }

          $('.open').removeClass('open');
          return false;
        }

        var simulated = $(this).attr('is-simulated');
        if (simulated && simulated == 'simulated') {
          return true;
        }

        $('.open').not($(this).parents('ul')).removeClass('open');
        $(this).find('ul').addClass('open');

        if (event.type == 'touchstart') {
          $scope.requestIconAnalyitics(slug);
          return true;
        }

        return false;
      })
      .on('mouseenter', function () {
        if ($(this).hasClass('subTopic')) {
          return true;
        }
        if ($(this).hasClass('deleted')) {
          return true;
        }
        $scope.requestIconAnalyitics(slug);
      });
  };

  $scope.showMapInfo = function () {
    if (!$scope.infoToast) {
      $scope.infoToast = toastr.info(
        'To add a pdf or a video node (which we call "Content Node"), ' +
        '<br>you need to have at least a subtopic node that acts as a hub.' +
        '<br>' +
        '<br>Hover over the node to see available actions, such as create subtopic or content node', {
          allowHtml: true,
          autoDismiss: false,
          onHidden: function () {
            if ($scope.infoToast) $scope.infoToast = null;
          },
          tapToDismiss: true,
          extendedTimeOut: 10000,
          timeOut: 10000,
          toastClass: 'toast wide',
        });
    } else {
      toastr.clear();
      $scope.infoToast = null;
    }
  };

  $scope.showMapEmptyInfo = function () {
    if (!$scope.infoEmptyToast) {
      toastr.clear();
      $scope.infoEmptyToast = toastr.info(
        'Hi, this course is new, Please add a subtopic first, ' +
        '<br>from there, you can add a content node, then upload a pdf or a video.' +
        '<br>' +
        '<br>Hover over the center node to see available actions.', {
          allowHtml: true,
          autoDismiss: false,
          onHidden: function () {
            if ($scope.infoEmptyToast) $scope.infoEmptyToast = null;
          },
          tapToDismiss: true,
          extendedTimeOut: 10000,
          timeOut: 10000,
          toastClass: 'toast wide'
        });
    } else {
      $scope.infoEmptyToast = null;
    }
  };

  $scope.interConnect = function (parent, treeNodes, instance) {
    // added "t" in id because id cannot start with number
    for (var i = 0; i < treeNodes.length; i++) {
      var child = treeNodes[i];
      var childId = 't' + child._id;

      if (child.isDeletedForever)
        continue;

      // instantiate on hover
      $scope.initDropDown(childId);

      // connecting parent and chidlern
      var conn = instance.connect({
        source: parent,
        target: childId,
        anchors: [
          ["Perimeter", {
            shape: jsPlumb.getSelector('#' + parent)[0].getAttribute("data-shape")
          }],
          ["Perimeter", {
            shape: jsPlumb.getSelector('#' + childId)[0].getAttribute("data-shape")
          }]
        ],
        deleteEndpointsOnDetach: true,
        connector: ["Bezier", {
          curviness: 5
        }]
      });

      $(conn.connector.canvas).attr('data-source', parent);
      $(conn.connector.canvas).attr('data-target', childId);

      var cc = {
        source: parent,
        target: childId,
        conn: conn
      };

      $scope.jsPlumbConnections.push(cc);

      if (child.childrens)
        $('#' + parent + ' .collapse-button').addClass('hasChildren');
      if (child.childrens && child.childrens.length > 0) {
        $scope.interConnect(childId, child.childrens, instance);
      }
    }
  };

  $scope.setMode = function (mode, type, parent) {
    switch (mode) {
      case 'add':
        $scope.currentNodeAction.mode = "add";
        break;
      case 'edit':
        $scope.currentNodeAction.mode = "edit";
        break;
    }

    switch (type) {
      case 'subTopic':
        $scope.currentNodeAction.type = "subTopic";
        $scope.currentNodeAction.typeText = "Sub Topic";
        break;

      case 'contentNode':
        $scope.currentNodeAction.type = "contentNode";
        $scope.currentNodeAction.typeText = "Content Node";
        break;
    }

    $scope.nodeModaltitle = $scope.currentNodeAction.mode + " " + $scope.currentNodeAction.typeText;

    if (parent) {
      $scope.currentNodeAction.parent = parent;
      if (mode == 'add')
        $scope.nodeModaltitle += " under " + parent.name;
    } else
      $scope.currentNodeAction.parent = false;

    $rootScope.$broadcast('onAfterSetMode', $scope.course);
  };

  $scope.parseResources = function () {
    for (var i = 0; i < $scope.currentNodeAction.parent.resources.length; i++) {
      var content = $scope.currentNodeAction.parent.resources[i];
      if (content['type'] == 'mp4' || content['type'] == 'video' || content['type'] == 'videoLink') {
        $scope.currentNodeAction.parent.videoFile = content;
      } else if (content['type'] == 'pdf' || content['type'] == 'pdfLink') {
        $scope.currentNodeAction.parent.pdfFile = content;
      }
    }
  };

  /**
   * remove all svg generated by js plumb.
   */
  $scope.destroyJSPlumb = function () {
    for (var i in $scope.jsPlumbConnections) {
      var conn = $scope.jsPlumbConnections[i].conn;
      jsPlumb.detach(conn);
    }

    $scope.jsPlumbConnections = [];
  };

  $scope.reInitiateJSPlumb = function (cb) {
    $scope.treeNodes = angular.copy($scope.treeNodes);
    $timeout(
      function () {
        $scope.$apply();
        $scope.initJSPlumb();

        if (cb) {
          cb();
        }
      });
  };

  $scope.resourceIcon = function (filetype) {
    switch (filetype) {
      case 'pdf':
      case 'pdfLink':
        return 'fa fa-file-pdf-o';

      case 'mp4':
      case 'videoLink':
      case 'video':
        return 'fa fa-file-video-o';
    }
  };

  $scope.hasPdf = function (resources) {
    for (var i in resources) {
      if (resources[i].type == 'pdf') {
        return true;
      }
    }

    return false;
  };

  $scope.getPdfLink = function (resources) {
    for (var i in resources) {
      if (resources[i].type == 'pdf') {
        return resources[i].link;
      }
    }

    return false;
  };

  $scope.getDataShape = function (nodeType) {
    if (nodeType == 'subTopic')
      return 'Ellipse';

    return 'Rectangle';
  };

  $scope.requestIconAnalyitics = function (nodeId) {
    nodeId = nodeId.substring(1);
    if (nodeId == 'enter')
      return;

    $http.get('/api/server-widgets/topic-icon-analytics/?nodeId=' + nodeId).success(
      function (res) {
        $scope.isRequesting = false;
        if (res.result) {
          $scope.widgets[nodeId] = $sce.trustAsHtml(res.widgets);
        }
      }
    ).error(function () {
      $scope.isRequesting = false;
    });
  };

  $scope.getContentNodeLink = function (d) {
    return '/treeNode/' + d._id + '/#/cid/' + $scope.course._id + '/nid/' + d._id;
  };

  $scope.deleteNode = function (data) {
    var msg = '';
    if (data.type == 'subTopic') {
      msg = 'Are you sure you want to delete this sub topic?';
    } else {
      msg = 'Are you sure you want to delete this content node?';
    }

    if (confirm(msg)) {
      $http({
        method: 'DELETE',
        url: '/api/treeNodes/' + data._id,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
        .success(function (res) {
          //console.log(res);
          if (res.result) {
            data.isDeleted = true;
            data.name = '[DELETED]';

            // destroy the jsplumb instance and svg rendered
            $scope.destroyJSPlumb();

            // this will reinitiate the model, and thus also jsplumb connection
            $scope.reInitiateJSPlumb();

          } else {
            if (data.result != null && !data.result) {
              $scope.errors = data.errors;
              console.log(data.errors);
            }
          }
        });
    }
  };

  $scope.deleteNodeForever = function (data) {
    var msg = 'Are you sure you want to delete this content node forever?';
    if (data.type == 'subTopic') {
      msg = 'Are you sure you want to delete this sub topic forever?';
    }

    if (confirm(msg)) {
      $http({
        method: 'DELETE',
        url: '/api/treeNodes/' + data._id,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
        .success(function (res) {
          if (res.result) {
            data.isDeleted = true;
            data.isDeletedForever = true;
            data.name = '[DELETED]';

            // destroy the jsplumb instance and svg rendered
            $scope.destroyJSPlumb();

            // this will reinitiate the model, and thus also jsplumb connection
            $scope.reInitiateJSPlumb();

            mapService.deleteNode(data);
          }
        })
        .error(function (data) {
          $scope.errors = data.errors;
          toastr.error(data.errors);
        });
    }
  };

  $scope.isNodeOwner = function (tn) {
    if (tn.createdBy._id == $scope.user._id)
      return true;
    else if (tn.createdBy == $scope.user._id)
      return true;

    return false;
  };

  $scope.toggleNodeVisibility = function (node) {

    var isHidden = !node.isHidden; //toggle visibility

    $http.put('/api/visibility/' + node._id + '/' + isHidden)
      .then(function (res) {
        node.isHidden = isHidden;
      });
  };

  $scope.isAuthorized = function (tn) {
    return ($scope.isNodeOwner(tn) || $scope.isAdmin || $scope.isManager || $scope.isOwner);
  };

  /// Node.name == 'java'
  /*
   var $scope.findNode($scope.treeNodes, 'childrens', 'name', queryText)

   */

  $scope.addNewNodeIntoPool = function (treeNode) {
    if (treeNode.parent) {
      found = false;
      var pNode = $scope.findNode($scope.treeNodes, 'childrens', '_id', treeNode.parent);

      if (pNode) {
        pNode.childrens.push(treeNode);
      }
    } else
      $scope.treeNodes.push(treeNode);

    $timeout(function () {
      $scope.$apply();

      // destroy the jsplumb instance and svg rendered
      $scope.destroyJSPlumb();

      // this will reinitiate the model, and thus also jsplumb connection
      $scope.reInitiateJSPlumb(function () {
        $scope.donotInit = true;
        if ($('.open').length > 0) {
          $('.open').removeClass('open');
          return true;
        }
      });
    });

  };

  $scope.afterEditNode = function (treeNode) {
    if (treeNode) {
      found = false;
      var pNode = $scope.findNode($scope.treeNodes, 'childrens', '_id', treeNode._id);
      if (pNode) {
        pNode.name = treeNode.name;
      }
    }

    $timeout(
      function () {
        $scope.$apply();
      });
  };

  $scope.afterEditContentNode = function (treeNode) {
    if (treeNode) {
      found = false;
      var pNode = $scope.findNode($scope.treeNodes, 'childrens', '_id', treeNode._id);
      if (pNode) {
        pNode.name = treeNode.name;
        pNode.resources = [];
        if (treeNode.resources.length > 0) {
          for (var i in treeNode.resources) {
            pNode.resources.push(treeNode.resources[i]);
          }
        }
      }
    }

    $timeout(
      function () {
        $scope.$apply();
      });
  };

  $scope.collapse = function (el, isInit) {
    var nodeId = el.substring(1);

    found = false;
    var pNode = $scope.findNode($scope.treeNodes, 'childrens', '_id', nodeId);
    if (pNode) {
      var hide = false;

      if (isInit === true)
        hide = collapseService.isCollapsed(nodeId);
      else
        hide = collapseService.toggle(nodeId);

      if (hide === false) {
        $scope.collapseStatus[nodeId] = false;
        $('#' + el).addClass('aborted');
        collapseService.affectVisual(false, pNode, nodeId);
      } else if (hide >= 0 || hide == true) {
        $scope.collapseStatus[nodeId] = true;
        collapseService.affectVisual(true, pNode, nodeId);
        $('#' + el).removeClass('aborted');
      }

    }
  };

  $scope.$on('onAfterCreateNode', function (event, treeNode) {
    $scope.addNewNodeIntoPool(treeNode);
  });

  $scope.$on('onAfterEditNode', function (event, treeNode) {
    $scope.afterEditNode(treeNode);
  });

  $scope.$on('onAfterEditContentNode', function (event, treeNode) {
    $scope.afterEditContentNode(treeNode);
  });

  $scope.$on('jsTreeInit', function (ngRepeatFinishedEvent) {
    if (!$scope.isTreeInitiated && !$scope.donotInit) {
      $scope.isTreeInitiated = true;
      $scope.initJSPlumb();
    } else {
      $scope.donotInit = true;
    }
  });

  $scope.$on('onAfterSetMode', function (event, course) {
    if ($scope.currentNodeAction.type == "contentNode") {
      $scope.parseResources();
    }
  });

  $(document).ready(function () {
    $scope.width = jQuery(window).width();
    $scope.height = jQuery(window).height();
    $scope.center = {
      x: $scope.width / 2,
      y: ($scope.height / 2) - 100
    };
  });

  $scope.tabOpened();

  socket.on('joined', function (data) {
    //console.log(JSON.stringify(data));
  });

  socket.on('positionUpdated', function (data) {
    if (authService.user && data.userId == authService.user._id)
      return;

    var nd = data.nodeId;
    if (nd) {
      var elName = 't' + nd;
      var lv = Tree.leaves[elName];
      if (lv) {
        lv.fromCenter.x = data.x + 70;
        lv.fromCenter.y = data.y + 5;
        var oldPos = lv.el.position();
        var newPos = lv.getNewPosition(Tree.w, Tree.h);

        var dx = newPos.x - oldPos.left;
        var dy = newPos.y - oldPos.top;

        $('#' + elName).attr("is-simulated", 'simulated');
        $('#' + elName).simulate("drag-n-drop", {
          dx: dx,
          dy: dy
        })
      }

      found = false;
      var pNode = $scope.findNode($scope.treeNodes, 'childrens', '_id', nd);
      if (pNode) {
        pNode.positionFromRoot = {
          x: data.x,
          y: data.y
        };
        mapService.updatePosition(nd, data);
        $timeout(function () {
          $scope.$apply();
        });
      }

    }
  });

  socket.on('nodeCreated', function (data) {
    if (authService.user && data.userId == authService.user._id)
      return;

    $scope.addNewNodeIntoPool(data);
    mapService.addNode(data);
  });

  socket.on('nodeUpdated', function (data) {
    if (authService.user && data.userId == authService.user._id)
      return;

    if (data.type == 'contentNode') {
      $scope.afterEditContentNode(data);
    } else {
      $scope.afterEditNode(data);
    }
    mapService.updateNode(data);
  });

  socket.on('nodeDeleted', function (data) {
    if (authService.user && data.userId == authService.user._id)
      return;

    found = false;
    var pNode = $scope.findNode($scope.treeNodes, 'childrens', '_id', data.nodeId);
    if (pNode) {
      pNode.isDeleted = true;
      if (data.isDeletedForever)
        pNode.isDeletedForever = true;

      pNode.name = '[DELETED]';

      mapService.deleteNode(data);

      // destroy the jsplumb instance and svg rendered
      $scope.destroyJSPlumb();

      // this will reinitiate the model, and thus also jsplumb connection
      $scope.reInitiateJSPlumb();
    }
  })
});
;app.controller('NodeConfigController', function ($scope, $http, toastr, $window) {
    $scope.nodeEdit = null;
    $scope.errors = [];
    $scope.username = '';
    $scope.isLoading = false;
    $scope.tabsActive = {};
    $scope.settings = {
        disableControls: false,
        disableTop: false
    };

    $scope.$on('onAfterInitTreeNode', function (event, treeNode) {
        $scope.init(treeNode);
    });

    $scope.init = function (treeNode) {
        if (!treeNode)
            return;

        $scope.nodeEdit = cloneSimpleObject(treeNode);
    };

    $scope.saveNodeSetting = function (isValid) {
        if (!isValid)
            return;

        var url = '/api/treeNodes/' + $scope.nodeEdit._id;

        var params = {};

        if ($scope.tabsActive) {
            params.tabsActive = $scope.tabsActive;
        }
        if ($scope.settings) {
            params.settings = $scope.settings;
        }

        $scope.isLoading = true;
        $http.put(url, params)
            .success(function (res) {
                if (res.result) {
                    toastr.success('Successfully Saved');
                }

                $scope.isLoading = false;
                $('#configView').modal('hide');
                $scope.errors = [];

                $window.location.reload();
            })
            .error(function (res) {
                $scope.errors = res.errors;
                $scope.isLoading = false;
            });
    };

    $scope.cancel = function () {
        $scope.nodeEdit = cloneSimpleObject($scope.$parent.treeNode);
    };
});
;app.controller('NodeEditController', function ($scope, $http, $rootScope, Upload, toastr, $timeout) {

  $scope.formData = {};
  $scope.filespdf = false;
  $scope.filesvideo = false;
  $scope.currentEditNode = false;
  $scope.progressPercentage = 0;
  $scope.videoHostLink = '';
  $scope.pdfHostLink = '';

  $scope.isLoading = false;
  $scope.errors = [];

  $scope.init = function () {
  };

  $scope.$on('onAfterSetMode', function (event, course, treeNode) {
    $scope.formData.courseId = course._id;

    if ($scope.currentNodeAction.parent)
      $scope.formData.parent = $scope.currentNodeAction.parent._id;
    else {
      if ($scope.formData.parent)
        delete $scope.formData.parent;
    }

    $scope.currentEditNode = $scope.currentNodeAction.parent;
    $scope.currentEditNodeOriginal = cloneSimpleObject($scope.currentNodeAction.parent);
    $scope.formData.type = $scope.currentNodeAction.type;

    if (treeNode) {
      $scope.formData.name = treeNode.name;
      //$scope.formData.isPrivate = treeNode.isPrivate;
      $scope.formData.nodeId = treeNode._id;
      $scope.currentEditNode = treeNode;
    }
  });

  $scope.parseNgFile = function (ngFile) {
    var t = ngFile.type.split('/')[1];

    var ret = {
      type: t
    };

    return ret;
  };

  /**
   * save add sub topic node
   */
  $scope.saveNode = function (isValid) {
    if (!isValid)
      return;

    $scope.isLoading = true;
    var d = transformRequest($scope.formData);
    $http({
      method: 'POST',
      url: '/api/treeNodes',
      data: d,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .success(function (data) {
        if (data.result) {
          $rootScope.$broadcast('onAfterCreateNode', data.treeNode);

          $('#addSubTopicModal').modal('hide');
          $('#addContentNodeModal').modal('hide');

          // cleaining up formData
          if ($scope.formData.parent) {
            delete $scope.formData.parent;
            $timeout(function () {
              $scope.$apply()
            });
          }
          $scope.formData.name = "";
          $scope.formData.isPrivate = true;

          $scope.isLoading = false;
          $scope.addSubTopicForm.$setPristine();

          toastr.success('Successfully Saved, You can move it away from its default position');
        }
      })
      .error(function (data) {
        $scope.errors = data.errors;
        $scope.isLoading = false;

        toastr.error('Saving Failed');
      })
    ;
  };

  /**
   * save edit sub topic node
   */
  $scope.saveEditNode = function (isValid) {
    if (!isValid)
      return;

    var updateValue = {
      name: $scope.currentEditNode.name,
      // isPrivate: $scope.currentEditNode.isPrivate
    };

    $scope.isLoading = true;

    var d = transformRequest(updateValue);
    $http({
      method: 'PUT',
      url: '/api/treeNodes/' + $scope.currentEditNode._id,
      data: d,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .success(function (data) {
        $scope.isLoading = false;
        if (data.result) {
          $rootScope.$broadcast('onAfterEditNode', data.treeNode);

          if ($scope.formData.parent) {
            $scope.currentEditNode = {};
            delete $scope.formData.parent;
            $timeout(function () {
              $scope.$apply()
            });
          }

          $('#editSubTopicModal').modal('hide');
          $('#editContentNodeModal').modal('hide');

          $scope.editSubTopicForm.$setPristine();
          toastr.success('Successfully Saved');
        }
      })
      .error(function (data) {
        $scope.isLoading = false;
        $scope.errors = data.errors;
        toastr.error('Saving Failed');
      });
  };

  /**
   * save add content node
   * save edit content node
   */
  $scope.saveContentNode = function (isValid) {
    if (!isValid)
      return;

    if ($scope.currentNodeAction.mode == 'edit') {
      $scope.formData = $scope.currentEditNode;
    }

    if ($scope.videoHostLink.trim() != '') {
      $scope.formData.videoHostLink = $scope.videoHostLink;
    }
    if ($scope.pdfHostLink.trim() != '') {
      $scope.formData.pdfHostLink = $scope.pdfHostLink;
    }
    var uploadParams = {
      url: '/api/treeNodes',
      fields: $scope.formData
    };

    uploadParams.file = [];

    // we only take one pdf file
    if ($scope.filespdf) {
      uploadParams.file.push($scope.filespdf);
    }
    // we only take one vid file
    if ($scope.filesvideo) {
      uploadParams.file.push($scope.filesvideo);
    }

    $scope.isLoading = true;

    $scope.upload = Upload.upload(
      uploadParams
    ).progress(function (evt) {
      if (!evt.config.file)
        return;

      $scope.progressPercentage = parseInt(100.0 * evt.loaded / evt.total);

    }).success(function (data, status, headers, config) {

      if (data.result) {
        if (uploadParams.file.length > 0) {
          /*data.treeNode['resources'] = [];
           for (var i in uploadParams.file) {
           var f = uploadParams.file[i];
           var resTemp = $scope.parseNgFile(f);
           data.treeNode['resources'].push(resTemp);
           }*/

          /*if ($scope.videoHostLink != '') {
           data.treeNode['resources'].push({
           type: 'videoLink'
           });
           }*/

          /*if ($scope.pdfHostLink != '') {
           data.treeNode['resources'].push({
           type: 'pdfLink'
           });
           }*/
        }
      }

      if ($scope.addContentNodeForm) {
        $rootScope.$broadcast('onAfterCreateNode', data.treeNode);

        $('#addSubTopicModal').modal('hide');
        $('#addContentNodeModal').modal('hide');

        // cleaning up formData
        $scope.formData.name = "";
        $scope.formData.isPrivate = true;

        $scope.filespdf = false;
        $scope.filesvideo = false;

        if ($scope.formData.parent)
          delete $scope.formData.parent;

        $scope.addContentNodeForm.$setPristine();

        toastr.success('Content Node has been created, You can move it away from its default position');
      } else if ($scope.editContentNodeForm) {
        $rootScope.$broadcast('onAfterEditContentNode', data.treeNode);

        $('#editContentNodeModal').modal('hide');
        $scope.editContentNodeForm.$setPristine();

        toastr.success('Successfully Saved');
      }

      $scope.videoHostLink = '';
      $scope.pdfHostLink = '';
      $scope.formData.videoHostLink = '';
      $scope.formData.pdfHostLink = '';
      uploadParams.file = [];
      $scope.progressPercentage = 0;

      $scope.isLoading = false;
    })
      .error(function (data) {
        $scope.isLoading = false;
        $scope.errors = data.errors;

        $scope.progressPercentage = 0;

        toastr.error('Saving Failed');
      });

  };

  $scope.cancel = function () {
    if ($scope.upload) {
      $scope.upload.abort();
    }

    $scope.currentEditNode.name = $scope.currentEditNodeOriginal.name;
    $scope.currentEditNode.isPrivate = $scope.currentEditNodeOriginal.isPrivate;
  };

  $scope.clearVideo = function () {
    $scope.filesvideo = false;
    $timeout(function () {
      $scope.$apply()
    });
  };

  $scope.clearPdf = function () {
    $scope.filespdf = false;
    $timeout(function () {
      $scope.$apply()
    });
  };
});
;app.controller('NodeRootController', function ($scope, $rootScope, $filter, $http, $location,
                                               $routeParams, $timeout, ActionBarService, authService,
                                               courseService, treeNodeService, Page, toastr) {
    $scope.treeNode = null;
    $scope.course = null;
    $scope.nodeId = $routeParams.nodeId;
    $scope.courseId = $routeParams.courseId;

    $scope.isNodeOwner = false;
    $scope.isAdmin = false;
    $scope.isManager = false;
    $scope.isOwner = false;
    $scope.isEnrolled = false;
    $scope.videoFile = false;
    $scope.pdfFile = false;

    $scope.currentTab = "";
    $scope.tabDisplayName = "";
    $scope.currentPdfPage = 1;
    $scope.defaultPath = "";
    $scope.includeActionBar = "";
    $scope.currentNodeAction = {};

    $scope.manageActionBar = function () {
        if (($scope.currentTab == 'video' || $scope.currentTab == 'pdf') && $scope.treeNode) {
            if ($scope.treeNode.createdBy == $rootScope.user._id) {

                ActionBarService.extraActionsMenu = [];
                ActionBarService.extraActionsMenu.push({
                    clickAction: $scope.deleteNode,
                    clickParams: $scope.treeNode._id,
                    title: '<i class="ionicons ion-close"></i> &nbsp;DELETE',
                    aTitle: 'DELETE THIS NODE AND ITS CONTENTS'
                });
            }
        }
    };

    $scope.changeTab = function () {
        var q = $location.search();

        if (!q.tab) {
            jQuery('li.video').removeClass('active');
            jQuery('li.pdf').removeClass('active');

            if ($scope.videoFile && $scope.pdfFile) {
                jQuery('li.video').addClass('active');
            } else if ($scope.pdfFile) {
                jQuery('li.pdf').addClass('active');
            } else {
                jQuery('li.video').addClass('active');
            }
        }

        if ($scope.videoFile || ($scope.videoFile && $scope.pdfFile)) {
            $scope.defaultPath = 'video';
        } else if ($scope.pdfFile) {
            $scope.defaultPath = 'pdf';
        }

        $scope.currentTab = $scope.defaultPath;
        if (q.tab) {
            $scope.currentTab = q.tab;
        }

        $scope.include = '/treeNode/tab/' + $scope.currentTab;
        $scope.includeActionBar = '/treeNode/actionBar/' + $scope.currentTab;

        $rootScope.$broadcast('onNodeTabChange', $scope.currentTab);

        $scope.getTabDisplayName($scope.currentTab);

        $scope.manageActionBar();
    };

    $scope.getTabDisplayName = function (name) {
        $scope.tabDisplayName = $('li.' + name).attr('data-displayName');
    };

    $scope.showEnrollForm = function () {
        $('#enrollForm').modal('show');
    };

    $scope.isAuthorized = function () {
        return ($scope.isAdmin || $scope.isOwner || $scope.isManager || $scope.isNodeOwner);
    };

    $scope.initNode = function () {
        courseService.init(
            $scope.courseId,

            function (course) {
                $scope.course = course;
                $scope.setCapabilities();

                $timeout(function () {
                    if (!authService.isLoggedIn && $scope.course) {
                        var q = $location.search();
                        if (q.tab)
                            $scope.currentTab = q.tab;

                        authService.showLoginForm();
                    }
                    else if ($scope.course && !$scope.isAuthorized() && !$scope.isEnrolled) {
                        $scope.showEnrollForm();
                    } else {
                        treeNodeService.init($scope.nodeId,
                            function (treeNode) {
                                $scope.treeNode = treeNode;
                                $scope.videoFile = treeNodeService.videoFile;
                                $scope.pdfFile = treeNodeService.pdfFile;

                                Page.setTitleWithPrefix($scope.course.name + ' > Map > ' + $scope.treeNode.name);

                                if ($scope.treeNode.createdBy == $rootScope.user._id)
                                    $scope.isNodeOwner = true;

                                if ($scope.isAuthorized()) {
                                    $scope.setEditMode();
                                }

                                $scope.changeTab();

                                $timeout(function () {
                                    $scope.$broadcast('onAfterInitTreeNode', $scope.treeNode);
                                });
                            },
                            function (err) {
                                $scope.nodeError = true;
                                $scope.error = err;
                            }
                        );
                    }
                }, 120);
            },

            function (res) {
                $scope.errors = res.errors;
                //toastr.error('Failed getting course');
            },

            true
        );
    };

    $scope.setEditMode = function () {
        $scope.currentNodeAction.mode = "edit";
        $scope.currentNodeAction.type = "contentNode";
        $scope.currentNodeAction.typeText = "Content Node";
        $scope.currentNodeAction.parent = $scope.treeNode;
        $scope.nodeModaltitle = "Edit " + $scope.currentNodeAction.typeText;
        $rootScope.$broadcast('onAfterSetMode', $scope.course, $scope.treeNode);
    };

    $scope.setCapabilities = function () {
        $scope.isEnrolled = courseService.isEnrolled();
        $scope.isManager = courseService.isManager(authService.user);

        if (authService.user)
            $scope.isOwner = authService.user._id == $scope.course.createdBy._id;
        else
            $scope.isOwner = false;

        $scope.isAdmin = authService.isAdmin();
    };

    $scope.$on('onAfterEditContentNode', function (event, oldTreeNode) {
        window.location.reload();
    });

    /**
     * ping server on our latest page read
     */
    $scope.$on('onPdfPageChange', function (event, params) {
        $http.get('/slide-viewer/read/' + $scope.courseId + '/' + $scope.nodeId + '/' + $scope.pdfFile._id + '/' + params[0] + '/' + params[1]);
    });

    /**
     * ping server on some actions
     */
    var pdfPageChangeListener = $scope.$on('onPdfPageChange', function (event, params) {
        $http.get('/slide-viewer/read/' + $scope.courseId + '/' + $scope.nodeId + '/' + $scope.pdfFile._id + '/' + params[0] + '/' + params[1]);

        if (params[0] && params[0] != 1)
            $scope.currentPdfPage = params[0];
    });

    $scope.$on('onVideoUpdateState', function (e, data) {
        $http.put('/api/treeNodes/watch/' + $scope.courseId + '/' + $scope.nodeId + '/' + $scope.videoFile._id,
            {
                state: data.state,
                totalTime: data.API.totalTime,
                currentTime: data.API.currentTime,
                timeLeft: data.API.timeLeft,
                volume: data.API.volume
            }
            )
            .error(function (data) {
                console.log('ping server error');
            });
    });

    $scope.$on('$destroy', pdfPageChangeListener);

    $scope.$on('$routeUpdate', function () {
        var q = $location.search();

        if (q.tab) {
            if ($scope.currentTab && $scope.currentTab != q.tab) {
                $scope.changeTab();
            }
        }
        else
            $scope.changeTab();
    });

    /**
     * initiate course when user hast tried to log in
     */
    $scope.$watch(function () {
        return authService.isLoggedIn;
    }, function () {
        if (authService.hasTriedToLogin && !$scope.course) {
            $scope.initNode();
        }
    });
});
;app.controller('PdfTabController', function ($scope, $rootScope, $filter, $http, $location,
                                             $routeParams, $timeout, ActionBarService) {

    $scope.init = function () {
        if ($scope.currentPdfPage > 1) {
            var slidePage = $location.search().slidePage;
            if (!slidePage || (slidePage && slidePage == 1)) {
                $location.search('slidePage', $scope.currentPdfPage).replace();
            }
        }
    };

    $scope.init();
});
;app.controller('ProfileController', function(  Page) {
    Page.setTitleWithPrefix('My Account');
});
app.controller('AppSettingController', function(  Page) {
    Page.setTitleWithPrefix('3rd Party App Settings');
});
;app.controller('RecommendController', function ($scope, $filter, $http, toastr, Page) {
    $scope.submitted = false;
    $scope.isLoading = false;
    $scope.errors = [];

    $scope.category = {
        name: '',
        description: ''
    };

    Page.setTitleWithPrefix('Recommend a Category');

    $scope.recommend = function (isValid) {
        if (isValid) {

            $scope.isLoading = true;
            var d = transformRequest($scope.category);
            $http({
                method: 'POST',
                url: '/api/categories/recommend',
                data: d,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {
                    console.log(data);
                    if (data.result) {
                        toastr.success('Recommendation saved');
                    }

                    $scope.isLoading = false;

                    $scope.category = {
                        name: '',
                        description: ''
                    };

                    $scope.recommendForm.$setPristine();
                })
                .error(function (data) {
                    $scope.isLoading = false;
                    $scope.errors = data.errors;
                    toastr.success('Sending recommendation failed');

                    $scope.category = {
                        name: '',
                        description: ''
                    }

                });
        }
    };
});
;app.controller('ResetPasswordController', function ($scope, $filter, $http, toastr, Page, $timeout, $routeParams) {
    $scope.submitted = false;
    $scope.isLoading = false;
    $scope.errors = [];
    $scope.loginData = {};

    Page.setTitleWithPrefix('Reset Password');

    if($routeParams.tokenInvalid && $routeParams.tokenInvalid == '1'){
        toastr.error("Token is invalid or expired, please do another request");
    }

    $scope.resetPassword = function (isValid) {
        var url = window.location.href.split('/');
        var token = url[url.length - 1];

        if (isValid) {
            $scope.isLoading = true;
            var d = transformRequest($scope.loginData);
            $http({
                method: 'POST',
                url: '/api/accounts/reset/' + token,
                data: d,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {
                    if (data.result) {
                        toastr.success('Your password has been reset, Please login with your new password');
                    }

                    $scope.isLoading = false;
                    $scope.loginData = {};

                    $scope.resetForm.$setPristine();

                    $timeout(function () {
                        window.location.href = '/accounts/login';
                    }, 500);
                })
                .error(function (data) {
                    $scope.isLoading = false;
                    if (data.errors) {
                        $scope.errors = data.errors;
                    }
                    toastr.success('Sending Request failed');
                    $scope.loginData = {};

                });
        }
    };

    $scope.requestReset = function (isValid) {
        if (isValid) {

            $scope.isLoading = true;
            var d = transformRequest($scope.loginData);
            $http({
                method: 'POST',
                url: '/api/accounts/resetPassword',
                data: d,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {
                    if (data.result) {
                        toastr.success('Reset Password Requested, Please check your email');
                    }

                    $scope.isLoading = false;
                    $scope.loginData = {};

                    $scope.resetForm.$setPristine();
                })
                .error(function (data) {
                    $scope.isLoading = false;
                    if (data.errors) {
                        $scope.errors = data.errors;
                    }

                    toastr.error('Sending Request failed');
                    $scope.loginData = {};

                });
        }
    };
});
;app.controller('VideoTabController', function ($scope, $rootScope, $filter, $http, $location,
                                               $routeParams, $timeout, ActionBarService) {

});
;app.directive('comment', function ($compile, $timeout) {
  return {
    restrict: 'E',
    terminal: true,
    scope: {
      postedBy: '@',
      postedDate: '@',
      showControl: '=',
      showReplyButton: '=',
      showEditButton: '=',
      showDeleteButton: '=',
      authorClickAction: '&',
      authorClickable: '=',
      postContent: '=',
      isPostOwner: '=',
      isDeleted: '=',
      postId: '@',
      editAction: '&',
      deleteAction: '&',
      replyAction: '&'
    },

    templateUrl: '/partials/discussion.reply.html'/*,
     link: function (scope, element, attrs) {
     $timeout(function () {
     scope.$apply();
     });
     $compile(element.contents())(scope.$new());
     }*/
  };
});;app.directive('errorBlock',
    function () {
        return {
            restrict: 'E',
            scope: {
                messages: '='
            },
            template: '<div class="errors">' +
                      '<div class="alert alert-danger" role="alert" ng-repeat="m in messages">{{m}}</div>' +
                      '</div>'
        };
    });;app.directive('facebookButton',
    function () {
        return {
            restrict: 'E',
            scope: {
                loginUrl: '@'
            },
            template: '<div class="control-group">' +
            '<a href="{{loginUrl}}">' +
            '<img src="/img/admin-lte/fb.png">' +
            '</a>' +
            '</div>',
            compile: function (element, attrs) {
                if (!attrs.loginUrl) {
                    attrs.$set('loginUrl', '/api/accounts/login/facebook');
                }
            }
        };
    });;
app.directive('onFinishRender', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit(attr.onFinishRender);
                });
            }
        }
    }
});

app.directive('script', function($parse, $rootScope, $compile) {
    return {
        restrict: 'E',
        terminal: true,
        link: function(scope, element, attr) {
            if (attr.ngSrc) {
                var domElem = '<script src="'+attr.ngSrc+'" async defer></script>';
                $(element).append($compile(domElem)(scope));
            }
        }
    };
});;app.directive('modalBox',
    function ($compile, $timeout, $rootScope) {
        return {
            restrict: 'E',

            terminal: true,
            transclude: true,

            scope: {
                mid: '@',
                title: '@'
            },

            templateUrl: '/partials/modal-box.html',

            link: function (scope, el, attrs) {
            }
        };
    });
;app.directive('cancel',
    function () {
        return {
            restrict: 'E',
            template: '<button type="button" class="btn btn-warning"' +
            'data-dismiss="modal" aria-label="Close"' +
            'ng-click="cancel()">' +
            '<span aria-hidden="true">Cancel</span>' +
            '</button>'
        };
    });

app.directive('modalClose',
    function () {
        return {
            restrict: 'E',
            template: '<div class="box-tools pull-right"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>'
        };
    });;/*jslint node: true */
'use strict';

app.directive('movable', function () {
  var getRelativePosition = function (position, parent) {
    return {
      left: Math.round((100 * position.left / parent.clientWidth)),
      top: Math.round((100 * position.top / parent.clientHeight))
    };
  };

  var getRelativeSize = function (size, parent) {
    return {
      width: Math.round((100 * size.width / parent.clientWidth)),
      height: Math.round((100 * size.height / parent.clientHeight))
    };
  };

  return {
    restrict: 'A',
    scope: {
      onMoved: '=',
      canMove: '@'
    },
    link: function (scope, element, attrs) {
      attrs.$observe('canMove', function (value) {
        if (value === 'false') {
          element
            .draggable({disabled: true})
            .resizable({disabled: true});
        } else {
          element
            .draggable({disabled: false})
            .resizable({disabled: false});
        }
      });

      element
        .draggable({
          containment: 'parent',
          cursor: 'move',
          stop: function (event, ui) {
            if (scope.onMoved) {
              scope.onMoved({
                position: getRelativePosition(ui.position, element.parent()[0])
              });
            }
          }
        })
        .resizable({
          containment: 'parent',
          handles: 'ne, se, sw, nw',
          stop: function (event, ui) {
            if (scope.onMoved) {
              var parent = element.parent()[0];
              scope.onMoved({
                position: getRelativePosition(ui.position, parent),
                size: getRelativeSize(ui.size, parent)
              });
            }
          }
        });

      // remove event handlers
      scope.$on('$destroy', function () {
        element.off('**');
      });
    }
  };
});
;/*jslint node: true */
'use strict';

app.directive('movablePdf', function() {
    var getRelativePosition = function(position, parent) {
        return {
            left: 1.0 * position.left / $("#annotationZone").width(),
            top: 1.0 * position.top / $("#annotationZone").height()
        };
    };

    var getRelativeSize = function(size, parent) {
        return {
            width: 1.0 * size.width / $("#annotationZone").width(),
            height: 1.0 * size.height / $("#annotationZone").height()
        };
    };

      return {
        restrict: 'A',
        scope: {
            onMoved: '=',
            canMove: '@'
        },
        link: function(scope, element, attrs) {
            attrs.$observe('canMove', function(value) {
                if (value === 'false') {
                    element.draggable({
                        disabled: true
                    }).resizable({
                        disabled: true
                    });
                } else {
                    element.draggable({
                        disabled: false
                    }).resizable({
                        disabled: false
                    });
                }
            });

            element
                .draggable({
                    containment: $("#annotationZone"),
                    cursor: 'move',
                    stop: function(event, ui) {
                        if (scope.onMoved) {
                            scope.onMoved({
                                position: getRelativePosition(ui.position, $("#annotationZone"))
                            });
                        }
                    }
                })
                .resizable({
                    containment: $("#annotationZone"),
                    handles: 'ne, se, sw, nw',
                    stop: function(event, ui) {
                        if (scope.onMoved) {
                            var parent = $("#annotationZone");
                            
                            scope.onMoved({
                                position: getRelativePosition(ui.position, parent),
                                size: getRelativeSize(ui.size, parent)
                            });
                        }
                    }
                });

            // remove event handlers
            scope.$on('$destroy', function() {
                element.off('**');
            });
        }
    };
});
;app.directive('pagination',
    function ($compile, $timeout) {
        return {
            restrict: 'E',

            scope: {
                totalRows: '=',
                limit: '=',
                useSearch: '=',
                terms: '=',
                objectService: '@',
                sortBy: '@',
                orderBy: '@',
                currentPage: '@',
                successCb: '=',
                lastPage: '@',
                setReset: '='
            },

            templateUrl: '/partials/pagination.html',

            link: function (scope, element, attrs) {
                attrs.$observe('objectService', function () {
                    var factoryInstance = element.injector().get(scope.objectService);
                    scope.objectServiceInstance = factoryInstance;
                    factoryInstance.setPageParams(scope);
                });

                attrs.$observe('terms', function () {
                    scope.terms = attrs.terms;
                });
            },

            controller: function ($http, $scope, $location) {
                $scope.showMoreButton = false;

                if ($scope.currentPage == undefined)
                    $scope.currentPage = 0;
                else
                    $scope.currentPage = parseInt($scope.currentPage);

                $scope.lastPage = $scope.currentPage * $scope.limit;

                $scope.$watch('totalRows', function () {
                    $scope.currentPage = parseInt($scope.currentPage);
                    if ($scope.totalRows / $scope.currentPage >= $scope.limit) {
                        $scope.showMoreButton = true;
                    } else
                        $scope.showMoreButton = false;
                });

                $scope.$watch('setReset', function (newVal, oldVal) {
                    if (newVal !== oldVal) {
                        $scope.currentPage = 1;
                        $scope.lastPage = $scope.currentPage * $scope.limit;
                    }
                });

                $scope.showMoreRows = function () {
                    $scope.objectServiceInstance.setPageParams($scope);
                    $scope.objectServiceInstance.getMoreRows(function (newRows, allRows) {
                        if (newRows) {
                            $scope.totalRows = newRows.length;
                            // show more button if it has possibilities of having more pages
                            if ($scope.totalRows >= $scope.limit) {
                                $scope.showMoreButton = true;
                            } else
                                $scope.showMoreButton = false;
                        }
                        else
                            $scope.showMoreButton = false;

                        $scope.successCb(newRows, allRows);
                    });

                    $scope.currentPage++;
                    $scope.lastPage = $scope.currentPage * $scope.limit;

                    if (!$scope.useSearch)
                        return;

                    $location.search('limit', $scope.limit);
                    $location.search('sortBy', $scope.sortBy);
                    $location.search('orderBy', $scope.orderBy);
                    $location.search('lastPage', $scope.lastPage);
                };
            }
        };
    });;app.directive('pdfAnnotationZone',
    function ($compile, $timeout) {
        return {
            restrict: 'E',

            terminal: true,
            require: 'movable-pdf',
            scope: {
              relativePositionX: '=',
              relativePositionY: '=',
              relativeSizeX: '=',
              relativeSizeY: '=',
              color: '=',
              tagName: '=',
              editTagNameTemp: '=',
              dragable: '=',
              isBeingCreated: '=',
              canBeEdited: '=',
              annZoneId: '=',
              divCounter: '=',
              listId: '=',
              switchShowAnnoZones: '=',
              tagNameIsValidated: '=',
              setEditZoneMode: '&',
              resetEditZoneMode: '&',
              updateAnnZone: '&',
              removeAnnotationZone: '&',
              addReference: '&',
            },

            templateUrl: '/partials/pdf-annotation-zone.html',
            //replace: true,
            //transclude: true,
            controller: function($http, $scope, $rootScope, $sce, $timeout, $parse){




/*              $scope.$watch('currCanWidth', function(newVal, oldVal){
              scope.localCanWidth = newVal;
              });

              $scope.$watch('currCanHeight', function(newVal, oldVal){
                $scope.localCanHeight = newVal;
              });
*/

              $scope.localCanWidth = $('#annotationZone').width();
              $scope.localCanHeight = $('#annotationZone').height();

              $scope.localSetEditZoneMode = function(annId){
                $scope.setEditZoneMode({id:annId});
              };

              $scope.localResetEditZoneMode = function(){
                $scope.resetEditZoneMode();
              };

              $scope.localUpdateAnnZone = function(annId){
                $scope.updateAnnZone({id:annId});
              };

              $scope.localRemoveAnnotationZone = function(annId){
                $scope.removeAnnotationZone({id:annId});
              };

              $scope.localAddReference = function(annId){
                if(!$scope.isDragging){
                  $scope.addReference({id:annId});
                  $scope.isDragging=false;
                }
              };


              $scope.updateAnnZonePos = function(posSize){
                $scope.relativePositionY=posSize.position.top;
                $scope.relativePositionX= posSize.position.left;
                if(posSize.size != undefined){
                  $scope.relativeSizeX = posSize.size.width;
                  $scope.relativeSizeY = posSize.size.height;
                }
                $timeout(function(){
                  $scope.$apply();
                });
              };





              $rootScope.$on('pdfScaleChanged', function(event,params){

                $scope.localCanWidth = params[0];
                $scope.localCanHeight = params[1];
                $timeout(function(){
                  $scope.$apply();
                });
              });

              $scope.inEditMode = false;

              $rootScope.$on('editZoneModeChanged', function(event,param){
                if($scope.listId == param){
                  $scope.inEditMode = true;
                }
                else {
                  $scope.inEditMode = false;
                }
              });


              $scope.canMove = $scope.dragable;
              $scope.annZoneID = $scope.listId;
              $scope.opacityFactorHighlight = "0.75";
              $scope.tagName = $scope.tagName.slice(1);
              $scope.dataRelCoord = $scope.relativePositionX+";"+$scope.relativePositionY;
              $scope.isDragging =false;

              $timeout(function(){
                $scope.$apply();
              });

              $timeout(function(){

                var thisElem = $("#caRect-" + $scope.divCounter);


                thisElem.find('select[name="colorpicker-change-background-color"]').simplecolorpicker({picker: true, theme: 'glyphicons'});

                thisElem.find('.simplecolorpicker').click(function(event){
                    event.stopPropagation();
                });
                thisElem.find('select[name="colorpicker-change-background-color"]').simplecolorpicker();


                thisElem.find('select[name="colorpicker-change-background-color"]').simplecolorpicker('selectColor', $scope.color);

                $('#destroy').on('click', function() {

                  $('select').simplecolorpicker('destroy');
                });
                // By default, activate simplecolorpicker plugin on HTML selects
                $('#init').trigger('click');

              });


            }
        };
    }
);
;app.directive('pdfComment', function ($compile, $timeout) {
  return {
    restrict: 'E',
    terminal: true,
    scope: {
      postedBy: '@',
      postedDate: '@',
      showControl: '=',
      showReplyButton: '=',
      //showEditButton: '=',
      //showDeleteButton: '=',
      authorClickAction: '&',
      authorClickable: '=',
      postContent: '=',
      isPostOwner: '=',
      postOwner: '=',
      isDeleted: '=',
      postId: '@',
      editAction: '&',
      deleteAction: '&',
      replyAction: '&',
      showCommentingArea: '=',
      comments: '=',
      postComment: '&',
      recentSubmitOnAnnotation: '=',
      commentText: '=',
      removeFunction: '&',
      isPrivate: '='
    },
    templateUrl: '/partials/pdf-comment.html',
    controller: function ($http, $scope, $rootScope, $sce) {
      $scope.removeComment = function (commentId) {
        $scope.removeFunction({id: commentId});
      };

      var user = $rootScope.user;
      var isAuthor = $scope.postOwner === user.username;
      var isAdmin = user.role === 'admin';
      var hasPermission = (isAuthor || isAdmin);

      $scope.isAdmin = isAdmin;
      $scope.showEditButton = hasPermission;
      $scope.showDeleteButton = hasPermission;
      $scope.toggle = $scope.recentSubmitOnAnnotation;
      $scope.postedDate = new Date($scope.postedDate);
    }
  };
});;app.directive('pdfViewer', function ($compile, $timeout, $rootScope, $http, $location, $routeParams) {
  return {
    restrict: 'E',
    terminal: true,
    scope: {
      source: '@',
      currentPageNumber: '=',
      showControl: '=',
      pdfId: '@'
    },
    templateUrl: '/partials/pdf-viewer.html',
    link: function (scope, element, attrs) {
      if (!PDFJS.PDFViewer || !PDFJS.getDocument) {
        alert('Please build the library and components using\n' +
          '  `node make generic components`');
      }

      scope.pageToView = 1;
      scope.scale = 1.0;
      scope.totalPage = 1;
      scope.container = element[0].getElementsByClassName('viewerContainer')[0];
      scope.config = {
        countMap: {
          segments: [],
          filter: {},
          isPersonal: false
        }
      };

      // Initialize CountMap
      var countMap = new CountMap({container: '#countmap'});
      countMap.itemClicked = function (number) {
        $rootScope.setPageNumber(number);
      };

      scope.updateCountMap = function () {
        var segments = _.filter(scope.config.countMap.segments, scope.config.countMap.filter);
        var options = {
          segmentKey: 'page',
          segments: segments,
          totalSegments: scope.totalPage,
          maxValue: 10,
          colorful: false
        };
        countMap.buildHeatMap(options);
      };

      scope.calculateSlideNavigationProgress = function (currentPageNum) {
        if (scope.totalPage <= 0) {
          return;
        }

        var pdfId = $rootScope.pdfId;
        var totalPages = scope.totalPage;

        // Update CountMap
        $http.get('/slide-viewer/countmap/' + pdfId)
          .success(function (segments) {
            scope.config.countMap.segments = segments;
            scope.updateCountMap();
          })
          .finally(function () {
              var progressBar = $('#progress-bar');
              var pointer = $('#progress-indicator');
              var indicatorWidth = progressBar.width() / totalPages;
              var offset = ((currentPageNum - 1) / totalPages * 100);
              pointer.css('margin-left', offset + '%');
              pointer.css('width', indicatorWidth + 'px');
            }
          );
      };

      attrs.$observe('pdfId', function (pdfId) {
        $rootScope.pdfId = pdfId;
      });

      attrs.$observe('source', function (pdfFilePath) {
        //console.log(pdfFilePath);
        if (pdfFilePath) {
          PDFJS.getDocument(pdfFilePath).then(function (pdfDocument) {
            if (attrs.currentPageNumber) {
              scope.pageToView = parseInt(attrs.currentPageNumber);
            }
            //console.log("Started loading pdf");
            scope.totalPage = pdfDocument.numPages;
            function getRandomInt(min, max) {
              return Math.floor(Math.random() * (max - min + 1)) + min;
            }

            scope.calculateSlideNavigationProgress(scope.currentPageNumber);
            // this will apply totalpage to the html
            $timeout(function () {
              scope.$apply();
            });

            // Document loaded, retrieving the page.
            return pdfDocument.getPage(scope.pageToView).then(function (pdfPage) {

              // Creating the page view with default parameters.
              scope.pdfPageView = new PDFJS.PDFPageView({
                container: scope.container,
                id: scope.pageToView,
                scale: scope.scale,
                defaultViewport: pdfPage.getViewport(scope.scale),

                // We can enable text/annotations layers, if needed
                textLayerFactory: new PDFJS.DefaultTextLayerFactory(),
                annotationsLayerFactory: new PDFJS.DefaultAnnotationsLayerFactory()
              });

              // Associates the actual page with the view, and drawing it
              scope.pdfPageView.setPdfPage(pdfPage);
              scope.scale = scope.scale * scope.container.clientWidth / scope.pdfPageView.width;
              scope.pdfPageView.update(scope.scale, 0);
              scope.pdfIsLoaded = true;
              $rootScope.$broadcast('onPdfPageChange', [scope.currentPageNumber, scope.totalPage]);
              return scope.pdfPageView.draw();
            });
          });
        }
      });

    }, /*end link*/

    controller: function ($scope, $rootScope, $compile, $http, $attrs, $location, $routeParams) {
      $scope.currentPageNumber = 1;
      $scope.pdfIsLoaded = false;
      $scope.totalPage = 0;
      $scope.currentTab = "";
      $scope.currentNavPageNumber = $scope.currentPageNumber;
      $rootScope.switchShowAnnoZones = "On";

      $scope.isAMapPersonalChange = function () {
        $scope.$emit('showPersonalPdfAnnotations', $scope.config.countMap.isPersonal);
        if ($scope.config.countMap.isPersonal) {
          $scope.config.countMap.filter = function (annotation) {
            return annotation.authorId === $rootScope.user._id;
          };
        }
        else {
          $scope.config.countMap.filter = null;
        }
        $scope.updateCountMap();
      };

      $scope.$watch("currentPageNumber", function (newVal, oldVal) {
        if (newVal != oldVal) {
          $scope.currentNavPageNumber = newVal;

          $timeout(function () {
            $scope.$apply();
          });
        }
      });

      $scope.$watch("currentNavPageNumber", function (newVal, oldVal) {
        if (newVal != oldVal) {
          if (newVal.length == 0) {
            return;
          } else if (isNaN(newVal)) {
            $scope.currentNavPageNumber = oldVal;
          } else if (!(parseInt(newVal) >= 1 && parseInt(newVal) <= $scope.totalPage)) {
            $scope.currentNavPageNumber = oldVal;
          }
        }
      });

      $("#inpFieldCurrPage").bind("keydown keypress", function (event) {
        if (event.which === 13) {
          $timeout(function () {
            $rootScope.setPageNumber(parseInt($scope.currentNavPageNumber));
            $scope.$apply();
          });
          event.preventDefault();
        }
      });

      $scope.changePageNumber = function (value) {
        $rootScope.setPageNumber($scope.currentPageNumber + value);
      };

      $rootScope.setPageNumber = function (value) {
        if ((value) <= $scope.totalPage && (value) >= 1) {
          $scope.currentPageNumber = parseInt(value);
          $scope.setHistoryStack($scope.currentPageNumber);
          $timeout(function () {
            $scope.changeSlide($scope.currentPageNumber);
            $scope.$apply();
          });
        }
      };

      $scope.changeSlide = function (newSlideNumber) {
        $rootScope.clearTagNameErrors();
        $scope.pdfIsLoaded = false;
        $scope.pageToView = newSlideNumber;
        $scope.calculateSlideNavigationProgress(newSlideNumber);

        PDFJS.getDocument($scope.source).then(function (pdfDocument) {
          pdfDocument.getPage($scope.pageToView).then(function (pdfPage) {
            $scope.pdfPageView.setPdfPage(pdfPage);
            $scope.pdfPageView.draw().catch(function () {
            });

            //console.log("Slide Changed");
            $scope.pdfIsLoaded = true;
            $rootScope.$broadcast('onPdfPageChange', [newSlideNumber, $scope.totalPage]);
            /* todo: move this somewhere else
             drawAnnZonesWhenPDFAndDBDone();
             */
          });
        });
      };

      $scope.setHistoryStack = function (pageNumber) {
        $location.search('slidePage', pageNumber);
      };

      $scope.changePageNumberBasedOnUrl = function () {
        var q = $location.search();
        if (q.slidePage) {
          var pageNumFromUrl = parseInt(q.slidePage);
          if ($scope.currentPageNumber != pageNumFromUrl && pageNumFromUrl > 0 && pageNumFromUrl <= $scope.totalPage) {
            // we are back from somewhere we read it from the url.
            $scope.currentPageNumber = pageNumFromUrl;
            $scope.changeSlide($scope.currentPageNumber);
          }
        }
      };

      $scope.switchShowAnnotationZone = function () {
        if ($rootScope.switchShowAnnoZones == "On") {
          $rootScope.switchShowAnnoZones = "Off";
        } else {
          $rootScope.switchShowAnnoZones = "On";
        }
      };

      function adjustPdfScale() {
        //console.log("Adjusting PDF Scale");
        if (typeof $scope.pdfPageView != 'undefined') {
          if ($scope.scale == 0)
            $scope.scale = 1.0;

          $scope.scale = $scope.scale * $scope.container.clientWidth / $scope.pdfPageView.width;
          $scope.pdfPageView.update($scope.scale, 0);
          $scope.pdfPageView.draw().catch(function () {
          });
          $rootScope.currCanWidth = $('#annotationZone').width();
          $rootScope.currCanHeight = $('#annotationZone').height();
          $rootScope.$broadcast("pdfScaleChanged", [$rootScope.currCanWidth, $rootScope.currCanHeight]);
        }
      };

      $(window).resize(function (event) {
        //console.log("Registered resize. Got tab: " + $scope.currentTab +", callerId: "+event.target);
        //console.log($location.search().tab)
        if (($location.search().tab == "pdf" || $location.search().tab == undefined || $location.search().tab == "no") && $.isWindow(event.target)) {
          //console.log("Got called on resize");
          adjustPdfScale();
        }
      });

      $scope.$on('onAfterInitTreeNode', function (node) {
        //console.log("Got called");
        //if($scope.pdfReady) {
        //console.log(node);
        $rootScope.pdfId = node.targetScope.pdfFile._id;
        //}
      });

      $scope.$on('onNodeTabChange', function (event, tab) {
        //console.log("Registered tab change. Got tab: " + tab);
        $scope.currentTab = tab;
        if (tab == "pdf") {
          adjustPdfScale();
        }
      });

      $scope.$on('onPdfPageChange', function (event, params) {
        setCurrentCanvasHeight(parseInt($('#annotationZone').height()));
        $rootScope.currCanWidth = $('#annotationZone').width();
        $rootScope.currCanHeight = $('#annotationZone').height();
        $rootScope.$broadcast("pdfScaleChanged", [$rootScope.currCanWidth, $rootScope.currCanHeight]);
      });


      // onload
      $scope.$watch('totalPage', function (newVal, oldVal) {
        if (oldVal !== newVal) {
          $scope.changePageNumberBasedOnUrl();
        }
      });

      $scope.$on('$routeUpdate', function (next, current) {
        if (!$location.search().slidePage) {
          if (current.params.tab && current.params.tab == 'pdf')
            $scope.setHistoryStack($scope.currentPageNumber);
        } else {
          var sp = parseInt($location.search().slidePage);
          if (sp > 0 && sp != $scope.currentPageNumber && sp <= $scope.totalPage) {
            $scope.changePageNumberBasedOnUrl();
          }
        }
      });
    }
  };
});
;/*
 takenfrom:http://blog.brunoscopelliti.com/
 */
app.directive('pwCheck', [function () {
    return {
        require: "ngModel",
        scope: {
            original: "="
        },
        link: function (scope, elem, attrs, ctrl) {
            var firstPassword = '#' + attrs.pwCheck;

            elem.add(firstPassword).on('keyup', function () {
                scope.$apply(function () {
                    var v = elem.val()===$(firstPassword).val();
                    ctrl.$setValidity('pwmatch', v);
                });
            });
        }
    };
}]);;app.directive('simplecolorpicker', function() {
  return {
    restrict: 'A',
    require: 'ngModel',

    link: function(scope, element, attrs, ngModel) {
      var colorPicker = null;
      var initialSelectedColor = null;

      function selectColor(color) {
        initialSelectedColor = null;
        element.val(color);
        element.simplecolorpicker('selectColor', element.val());
      }

      // HACK Wait for the AngularJS expressions inside element to be compiled
      setTimeout(function() {
        colorPicker = element.simplecolorpicker();
        if (initialSelectedColor !== null) {
          // Initializes the colorpicker with a color if one exists
          selectColor(initialSelectedColor);
        }

        // View -> model
        colorPicker.on('change', function() {
          scope.$apply(function() {
            ngModel.$setViewValue(element.val());
          });
        });
      }, 0); // Works with no delay

      // Model -> view
      ngModel.$render = function() {
        if (colorPicker !== null) {
          selectColor(ngModel.$viewValue);
        } else {
          initialSelectedColor = ngModel.$viewValue;
        }
      };

      // Cleanup
      element.on('$destroy', function() {
        if (colorPicker !== null) {
          element.simplecolorpicker('destroy');
        }
      });

    }
  };
});
;function Spinner($timeout) {
    return {
        restrict: 'E',
        template: '<i class="fa fa-cog fa-spin"></i>',
        scope: {
            show: '=',
            delay: '@'
        },
        link: function(scope, elem, attrs) {
            var showTimer;

            //This is where all the magic happens!
            // Whenever the scope variable updates we simply
            // show if it evaluates to 'true' and hide if 'false'
            scope.$watch('show', function(newVal){
                newVal ? showSpinner() : hideSpinner();
            });

            function showSpinner() {
                //If showing is already in progress just wait
                if (showTimer) return;

                //Set up a timeout based on our configured delay to show
                // the element (our spinner)
                showTimer = $timeout(showElement.bind(this, true), getDelay());
            }

            function hideSpinner() {
                //This is important. If the timer is in progress
                // we need to cancel it to ensure everything stays
                // in sync.
                if (showTimer) {
                    $timeout.cancel(showTimer);
                }

                showTimer = null;

                showElement(false);
            }

            function showElement(show) {
                show ? elem.css({display:''}) : elem.css({display:'none'});
            }

            function getDelay() {
                var delay = parseInt(scope.delay);

                return isNaN(delay) ? 200 : delay;
            }
        }
    };
}

app.directive('spinner', Spinner);
;'use strict';

videoAnnotationsModule.directive('cmTimepicker', function ($timeout) {
  function msToTime(s) {
    function addZ(n) {
      return (n < 10 ? '0' : '') + n;
    }

    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
    return addZ(hrs) + ':' + addZ(mins) + ':' + addZ(secs);
  }

  function timeToMs(time) {
    var a = time.split(':'); // split it at the colons
    // minutes are worth 60 seconds. Hours are worth 60 minutes.
    var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
    return seconds * 1000;
  }

  return {
    restrict: 'EA',
    template: '<div class="input-group bootstrap-timepicker timepicker">' +
    '<input id="timepicker2" type="text" class="form-control input-small"></div>',
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {
      var tp = element.find('input');
      var value = parseInt(scope.$eval(attrs.ngModel));

      tp.timepicker({
        minuteStep: 1,
        template: 'modal',
        secondStep: 1,
        appendWidgetTo: 'body',
        showSeconds: true,
        showMeridian: false,
        defaultTime: false
      });

      tp.timepicker('setTime', msToTime(value));

      tp.on('changeTime.timepicker', function (e) {
        var time = timeToMs(e.time.value);
        ngModel.$setViewValue(time);
        ngModel.$render();
        $timeout(function () {
          scope.$apply();
        });
      });

      scope.$on('$destroy', function () {
        element.off('**');
      });
    }
  };
});;app.directive('voting',
    function () {
        return {
            restrict: 'E',

            scope: {
                voteType: '@',
                voteTypeId: '@',
                voteValue: '@',
                voteTotal: '@',
                voteDisplay: '@',
                mode: '@'
            },

            templateUrl: function (elem, attrs) {
                var mode = 'vertical';
                if (attrs['mode'])
                    mode = attrs['mode'];

                var tmplt = '/partials/vote-' + mode + '.html';

                return tmplt;
            },

            controller: function ($scope, $compile, $http, $attrs, toastr) {
                $scope.errors = [];

                if ($attrs.voteTotal)
                    $scope.voteDisplay = $attrs.voteTotal;
                else
                    $scope.voteDisplay = 0;

                $scope.$watchGroup(['voteType', 'voteTypeId'], function () {
                    if ($scope.voteType != null && $scope.voteTypeId != "" && $scope.voteTotal == null) {
                        $scope.getVoteTotal();
                    }
                });

                $scope.getVoteTotal = function () {
                    $scope.isLoading = true;
                    $http.get('/api/votes/' + $scope.voteType + '/id/' + $scope.voteTypeId)
                        .success(function (data) {
                            if (data.result && data.vote.length > 0) {
                                $scope.voteTotal = data.vote[0].total;
                                $scope.voteDisplay = data.vote[0].total;

                                if (data.vote[0].isVotingObject) {
                                    $scope.voteValue = data.vote[0].isVotingObject.voteValue;
                                    if ($scope.voteValue == 1)
                                        $scope.voteTotal -= 1;
                                    else if ($scope.voteValue == -1)
                                        $scope.voteTotal += 1;

                                    $scope.voteDisplay = $scope.voteTotal + $scope.voteValue;
                                }
                            }
                            $scope.isLoading = false;
                        })
                        .error(function (data) {
                            $scope.errors = data.errors;
                            $scope.isLoading = false;
                        });
                };

                $scope.getClassUp = function () {
                    // this person is voting up this content
                    if ($scope.voteValue == 1) {
                        return 'voted';
                    }
                };

                $scope.getClassDown = function () {
                    // this person is voting up this content
                    if ($scope.voteValue == -1) {
                        return 'voted';
                    }
                };

                $scope.sendVote = function (val) {
                    $scope.isLoading = true;

                    if (($scope.voteValue == 1 && val == 'up') || ($scope.voteValue == -1 && val == 'down')) {
                        val = 'reset';
                    }

                    $http({
                        method: 'POST',
                        url: '/api/votes/' + $scope.voteType + '/id/' + $scope.voteTypeId + '/' + val,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    })
                        .success(function (data) {
                            if (data.result) {
                                if (val == 'up') {
                                    $scope.voteValue = 1;

                                } else if (val == 'down') {
                                    $scope.voteValue = -1;

                                } else {
                                    $scope.voteValue = 0;
                                }

                                if (typeof($scope.voteTotal) == 'undefined')
                                    $scope.voteTotal = 0;

                                if (val == 'reset') {
                                    toastr.success('Vote Removed');
                                }
                                else {
                                    toastr.success('Successfully Voted');
                                }

                                $scope.voteDisplay = $scope.voteTotal + $scope.voteValue;
                            }

                            $scope.isLoading = false;
                        })
                        .error(function (data) {
                            $scope.isLoading = false;
                            $scope.errors = data.errors;

                            toastr.error('Voting Failed');
                        });
                };
            }

        };
    });;app.controller('DiscussionController', function ($scope, $rootScope, $http, $location, $sce,
                                                 $compile, ActionBarService, courseService,
                                                 discussionService, $timeout,
                                                 toastr, Page, $window) {
    $scope.formData = {
        content: ''
    };

    $scope.pageTitleOnDiscussion = "";
    $scope.course = null;
    $scope.currentReplyingTo = false;
    $scope.currentEditPost = {};
    $scope.currentTopic = false;
    $scope.originalCurrentTopic = {};
    $scope.pid = false;
    $scope.isLoading = false;
    $scope.errors = [];
    $scope.topics = [];
    $scope.topicsLength = 0;
    $scope.replies = [];

    $scope.orderBy = -1;
    $scope.sortBy = 'dateAdded';
    $scope.currentPage = 1;
    $scope.pageReset = false;

    $scope.orderingOptions = [
        {id: 'dateAdded.-1', name: 'Newest First'},
        {id: 'dateAdded.1', name: 'Oldest First'},
        {id: 'totalVotes.-1', name: 'Most Popular'}
    ];

    $scope.newRowsFetched = function (newRows, allRows) {
        if (newRows) {
            $scope.topics = allRows;
            $scope.topicsLength = $scope.topics.length;
        }
    };

    $scope.initiateTopic = function () {
        $scope.pid = $location.search().pid;

        if ($scope.pid) {
            $scope.getReplies($scope.pid);
            $scope.manageBreadCrumb();
        }

        $scope.manageActionBar();
    };

    $scope.manageBreadCrumb = function () {
        var dt = $('.action-header .breadcrumb').find('li.discussionTitle');
        $('.action-header .breadcrumb li').removeClass('active');
        var u = '#/cid/' + $scope.course._id + '?tab=discussion';
        if (dt.length > 0) {
            dt.html($scope.currentTopic.title);
        } else {
            if ($scope.pid) {
                $('.action-header .breadcrumb').find('li.tab').wrapInner('<a class="discussionTabLink" href="' + u + '"></a>');
                var newEl = '<li class="discussionTitle active">' + $scope.currentTopic.title + '</li>';
                $('.action-header .breadcrumb').append(newEl);
            }
        }
    };

    $scope.saveNewPost = function (isValid) {
        if (!isValid)
            return;

        $scope.isLoading = true;
        var d = transformRequest($scope.formData);
        $http({
            method: 'POST',
            url: '/api/discussions/' + $scope.course._id,
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                if (data.result) {
                    $scope.$emit('onAfterCreateNewTopic', data.post);
                    $scope.topics.unshift(data.post);
                    $scope.formData = {};
                    $scope.addTopicForm.$setPristine();

                    $('#addNewTopicModal').modal('hide');
                    toastr.success('Successfully Saved');

                    $timeout(function () {
                        $scope.$apply();
                    });
                }

                $scope.isLoading = false;
            })
            .error(function (data) {
                $scope.errors = data.errors;
                $scope.isLoading = false;

                toastr.error('Saving Failed');
            });
    };

    $scope.saveEditPost = function (isValid) {
        if (!isValid)
            return;

        var d = transformRequest($scope.currentTopic);
        $http({
            method: 'PUT',
            url: '/api/discussion/' + $scope.currentTopic._id,
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                if (data.result) {
                    $scope.$emit('onAfterEditTopic', data.post);

                    $('#editTopicModal').modal('hide');

                    var i = _.findIndex($scope.topics, {'_id': data.post._id});
                    $scope.topics[i] = data.post;
                    $timeout(function () {
                        $scope.$apply()
                    });

                    $scope.editTopicForm.$setPristine();
                    $scope.isLoading = false;

                    toastr.success('Successfully Saved');
                }
            })
            .error(function (data) {
                $scope.errors = data.errors;
                $scope.isLoading = false;

                toastr.error('Saving Failed');
            });
    };

    $scope.editReply = function (re) {
        $('#editReplyModal').modal('show');

        $scope.currentEditPost = re;
        $scope.$broadcast('onEditReplyClicked', re);
    };

    $scope.deletePost = function (postId) {
        var r = confirm("Are you sure you want to delete this reply?");

        if (r == true) {
            $http({
                method: 'DELETE',
                url: '/api/discussion/' + postId,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {

                    if (data.result) {
                        $scope.$emit('onAfterDeletePost', postId);

                        toastr.success('Successfully Deleted');

                    }
                })

                .error(function (data) {
                    $scope.errors = data.errors;
                    $scope.isLoading = false;

                    toastr.error('Delete Failed');
                });
        }
    };

    $scope.deleteTopic = function (postId) {
        var r = confirm("Are you sure you want to delete this topic?");

        if (r == true) {
            $http({
                method: 'DELETE',
                url: '/api/discussions/' + $scope.course._id + '/topic/' + postId,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {

                    if (data.result) {
                        $scope.$emit('onAfterDeleteTopic', postId);

                        toastr.success('Successfully Deleted');
                    }
                })

                .error(function (data) {
                    $scope.errors = data.errors;
                    $scope.isLoading = false;

                    toastr.error('Delete Failed');
                });
        }
    };

    $scope.manageActionBar = function () {
        if ($scope.$parent.currentTab != 'discussion')
            return;

        if ($scope.pid) {
            ActionBarService.extraActionsMenu = [];

            ActionBarService.extraActionsMenu.push({
                separator: true
            });

            ActionBarService.extraActionsMenu.push(
                {
                    'html': '<a style="cursor: pointer;"' +
                    ' data-toggle="modal" data-target="#addNewReplyModal"' +
                    ' title="Reply">' +
                    '&nbsp;&nbsp; <i class="ionicons ion-reply"></i> &nbsp; REPLY</a>'
                }
            );

            if ($scope.currentTopic && $scope.currentTopic.createdBy &&
                ($scope.isAdmin || $scope.isManager ||
                $scope.isOwner || $scope.currentTopic.createdBy._id == $rootScope.user._id)
            ) {

                ActionBarService.extraActionsMenu.push({
                    'html': '<a style="cursor: pointer;"' +
                    ' data-toggle="modal" data-target="#editTopicModal"' +
                    ' title="Edit">' +
                    '&nbsp;&nbsp; <i class="ionicons ion-edit"></i> &nbsp; EDIT</a>'
                });

                ActionBarService.extraActionsMenu.push({
                    clickAction: $scope.deleteTopic,
                    clickParams: $scope.currentTopic._id,
                    title: '<i class="ionicons ion-close"></i> &nbsp;DELETE',
                    aTitle: 'DELETE THIS TOPIC AND ITS REPLIES'
                });
            }

        }
        else if (!$scope.pid) {
            $scope.currentTopic = {};
            ActionBarService.extraActionsMenu = [];
        }
    };

    $scope.getReplies = function (postId) {
        var i = _.findIndex($scope.topics, {'_id': postId});
        if ($scope.topics[i]) {
            $scope.currentTopic = cloneSimpleObject($scope.topics[i]);

            Page.setTitle($scope.pageTitleOnDiscussion + ' > ' + $scope.currentTopic.title);

            $scope.currentTopic.createdBy = $scope.topics[i].createdBy;

            $scope.originalCurrentTopic = cloneSimpleObject($scope.topics[i]);

            $scope.currentReplyingTo = $scope.currentTopic._id;

            $http.get('/api/discussion/' + postId + '/posts').success(function (res) {
                if (res.result) {
                    $scope.replies = res.posts;
                }
            });
        }
    };

    $scope.cancel = function () {
        $scope.currentTopic = $scope.originalCurrentTopic;
        $scope.editTopicForm.$setPristine();
        $scope.addTopicForm.$setPristine();
        $scope.errors = [];
    };

    $scope.initTab = function (courseId) {
        discussionService.init(courseId,

            function (posts) {
                $scope.topics = posts;
                $scope.topicsLength = $scope.topics.length;
                $scope.pageTitleOnDiscussion = Page.title();
                $scope.initiateTopic();
            },

            function (errors) {
                //toastr.error(errors);
            }
        );
    };

    $scope.tabOpened = function () {

        if (courseService.course) {
            $scope.course = courseService.course;

            if (discussionService.posts) {
                $scope.posts = discussionService.posts;
            }

            $scope.initTab(courseService.course._id);
        } else {
            $scope.$on('onAfterInitCourse', function (e, course) {
                $scope.course = course;
                $scope.initTab(course._id);
            });
        }

        $rootScope.$broadcast('onCoursePreviewTabOpened', $scope.currentTab);
    };

    $scope.$on('$routeUpdate', function () {
        $scope.initiateTopic();

        if (!$scope.pid) {
            $('li.discussionTitle').remove();
            var te = $('a.discussionTabLink').text();
            $('.action-header .breadcrumb li.tab').html(te);
        }
    });

    $scope.$on('onAfterCreateNewTopic', function (e, f) {
    });

    $scope.$on('onAfterEditReply', function (e, f) {
        var i = _.findIndex($scope.replies, {'_id': f._id});
        $scope.replies[i].content = f.content;
        $timeout(function () {
            $scope.$apply();
        });
    });

    $scope.$on('onAfterDeletePost', function (e, postId) {
        var i = _.findIndex($scope.replies, {'_id': postId});
        $scope.replies[i].content = '[DELETED]';
        $timeout(function () {
            $scope.$apply();
        });
    });

    $scope.$on('onAfterDeleteTopic', function (e, postId) {
        var i = _.findIndex($scope.topics, {'_id': postId});
        //$scope.topics[i].isDeleted = true;
        if (i >= 0) {
            $scope.topics.splice(i, 1);
            $scope.currentTopic = false;
            $scope.replies = [];
            $scope.pid = false;
            $location.search('pid', '');
            $scope.initiateTopic();

            $timeout(function () {
                $scope.$apply();
            });
        }
    });

    $scope.$on('onAfterCreateReply', function (e, reply) {
        if (reply) {
            reply.createdBy = $rootScope.user;
            $scope.replies.unshift(reply);
        }
    });

    /**
     * watch for different window size
     */
    $scope.wSize = 'lg';
    $scope.$watch(function () {
        return $window.innerWidth;
    }, function (value) {
        $scope.wSize = Page.defineDevSize(value);
    });

    $scope.$watch('orderType', function (newVal, oldVal) {
        if (newVal != oldVal) {
            var spl = newVal.id.split('.');

            discussionService.setPageParams({
                sortBy: spl[0],
                orderBy: parseInt(spl[1]),
                limit: 10,
                lastPage: false
            });

            $scope.sortBy = spl[0];
            $scope.orderBy = parseInt(spl[1]);
            // reset the page
            $scope.currentPage = 0;
            $scope.lastPage = false;
            $scope.pageReset = Math.random();

            discussionService.init(courseService.course._id,

                function (posts) {
                    $scope.topics = posts;
                    $scope.topicsLength = $scope.topics.length;
                    $scope.pageTitleOnDiscussion = Page.title();
                    $scope.initiateTopic();
                },

                function (errors) {
                }, true
            );
        }
    });

    $scope.paginationReset = function () {
        return $scope.pageReset;
    };

    $scope.$watch('orderTypeReply', function (newVal, oldVal) {
        if (newVal != oldVal) {
            var spl = newVal.id.split('.');

            var sortBy = spl[0];
            var orderBy = parseInt(spl[1]);

            $http.get('/api/discussion/' + $scope.pid + '/posts?sortBy=' + sortBy + '&orderBy=' + orderBy).success(function (res) {
                if (res.result) {
                    $scope.replies = res.posts;
                    $timeout(function () {
                        $scope.$apply()
                    });
                }
            });
        }
    });

    $scope.tabOpened();
});
;app.controller('ReplyController', function ($scope, $http, $timeout, toastr) {
    $scope.isLoading = false;
    $scope.errors = [];

    $scope.EditFormData = {
        title: " ",
        content: ""
    };

    $scope.AddFormData = {
        title: " ",
        content: ""
    };

    $scope.$on('onEditReplyClicked', function (e, post) {
        $scope.EditFormData.content = post.content;
        $scope.EditFormData.postId = post._id;
    });

    $scope.saveNewReply = function (isValid) {
        if (!isValid)
            return;

        $scope.AddFormData.parentPost = $scope.$parent.currentReplyingTo;

        $scope.isLoading = true;

        var d = transformRequest($scope.AddFormData);
        $http({
            method: 'POST',
            url: '/api/discussion/replies/',
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                console.log(data);
                if (data.result) {
                    $scope.$emit('onAfterCreateReply', data.post);

                    $('#addNewReplyModal').modal('hide');

                    $scope.AddFormData.content = "";

                    $timeout(function () {
                        $scope.$apply()
                    });

                    $scope.addNewReplyForm.$setPristine();
                    $scope.isLoading = false;
                    $scope.errors = [];

                    toastr.success('Successfully Saved');
                }
            })
            .error(function (data) {
                $scope.errors = data.errors;
                $scope.isLoading = false;
                toastr.error('Saving Failed');
            });
    };

    $scope.cancel = function () {
        $scope.EditFormData.content = "";
        $scope.AddFormData.content = "";
        if ($scope.addNewReplyForm)
            $scope.addNewReplyForm.$setPristine();

        if ($scope.editReplyForm)
            $scope.editReplyForm.$setPristine();

        $scope.errors = [];
    };

    $scope.saveEditReply = function (isValid) {
        if (!isValid)
            return;

        $scope.isLoading = true;

        var d = transformRequest($scope.EditFormData);
        $http({
            method: 'PUT',
            url: '/api/discussion/' + $scope.$parent.currentEditPost._id,
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {

                if (data.result) {
                    $scope.$emit('onAfterEditReply', data.post);

                    $scope.EditFormData.content = "";
                    $timeout(function () {
                        $scope.$apply()
                    });

                    $('#editReplyModal').modal('hide');

                    toastr.success('Successfully Saved');
                }

                $scope.editReplyForm.$setPristine();
                $scope.isLoading = false;
            })
            .error(function (data) {
                $scope.errors = data.errors;
                $scope.isLoading = false;

                toastr.error('Saving Failed');
            });
    };

    /**
     * deleting root topic
     * @param postId
     */
    $scope.deletePost = function (postId) {
        $http({
            method: 'DELETE',
            url: '/api/discussion/' + postId,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {

                if (data.result) {
                    $scope.$emit('onAfterDeletePost', postId);

                    toastr.success('Successfully Deleted');
                }
            })
            .error(function(data){
                $scope.errors = data.errors;
                toastr.error('Delete Failed');
            });
    };

});;var externalApp = angular.module('externalApp', [
    'ngResource', 'ngRoute', 'ngCookies', 'oc.lazyLoad',
    'relativeDate']);;externalApp.controller('CreateAppController', function ($scope, $rootScope, $http, $location, $sce,
                                                        $compile, $timeout,
                                                        toastr, Page, $window) {

    $scope.name = "";
    $scope.description = "";

    $scope.saveApp = function (isValid) {
        if (isValid) {
            $scope.isLoading = true;
            var params = {
                name: $scope.name,
                description: $scope.description
            };

            var d = transformRequest(params);
            $http({
                method: 'POST',
                url: '/api/oauth2/apps',
                data: d,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {
                    console.log(data);
                    if (data.result) {
                        $scope.$emit('onAfterCreateApplication');
                    }

                    $scope.isLoading = false;
                    toastr.success('Application is created.');
                    window.location.href = "/settings/apps/#/app/" + data.app._id;
                })
                .error(function (data) {
                    $scope.isLoading = false;
                    $scope.errors = data.errors;
                });
        }
    };
});;externalApp.controller('CreatedAppController', function ($scope, $rootScope, $http, $location, $sce,
                                                         $compile, $timeout, $routeParams,
                                                         toastr, Page, externalAppService) {

    $scope.app = false;
    $scope.originalApp = false;
    $scope.appId = $routeParams.appId;

    externalAppService.getAppDetail($scope.appId, function (app) {
        $scope.originalApp = app;
        $scope.app = angular.copy(app);
    }, function (err) {
        $scope.errors = err;
    });

    $scope.editApp = function (isValid) {
        if (!isValid)
            return;

        $scope.isLoading = true;
        var params = {
            name: $scope.app.name,
            description: $scope.app.description,
            callbackUrl: $scope.app.callbackUrl
        };

        var d = transformRequest(params);
        $http({
            method: 'PUT',
            url: '/api/oauth2/app/' + $scope.app._id,
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                if (data.result) {
                    $scope.$emit('onAfterEditApplication');
                }

                $scope.isLoading = false;
                toastr.success('Application saved.');
            })
            .error(function (data) {
                $scope.isLoading = false;
                $scope.errors = data.errors;
            });
    };

    $scope.deleteApp = function () {
        if (!window.confirm('Are you sure you want to delete this application?'))
            return;

        $scope.isLoadingDelete = true;

        $http({
            method: 'DELETE',
            url: '/api/oauth2/app/' + $scope.app._id,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                if (data.result) {
                    $scope.$emit('onAfterDeleteApplication');
                }

                $scope.isLoadingDelete = false;
                toastr.success('Application Deleted.');
                $location.path('/installed').replace();
            })
            .error(function (data) {
                $scope.isLoadingDelete = false;
                $scope.errors = data.errors;
            });
    };

    $scope.cancel = function () {
        $scope.app = angular.copy($scope.originalApp);
    }
});
;externalApp.controller('CreatedAppsController', function ($scope, $rootScope, $http, $location, $sce,
                                                          $compile, $timeout,
                                                          toastr, Page, $window) {

});;externalApp.factory('externalAppService', [
    '$rootScope', '$http',

    function ($rootScope, $http) {
        return {
            installedApps: null,
            createdApps: null,

            getCreatedApps: function (success, error, force) {
                var self = this;

                if (!force && self.createdApps) {
                    if (success)
                        success(self.createdApps);
                }

                else if (force || !self.createdApps)
                    $http.get('/api/oauth2/apps/created')
                        .success(function (data) {
                            if (data.result && data.apps) {
                                self.createdApps = data.apps;
                                if (success)
                                    success(self.createdApps);
                            }
                        })
                        .error(function (data) {
                            if (error)
                                error(data.errors);
                        });
            },

            getInstalledApps: function (success, error, force) {
                var self = this;

                if (!force && self.installedApps) {
                    if (success)
                        success(self.installedApps);
                }
                else if (force || !self.installedApps)
                    $http.get('/api/oauth2/apps/installed')
                        .success(function (data) {
                            if (data.result && data.apps) {
                                self.installedApps = data.apps;
                                if (success)
                                    success(self.installedApps);
                            }
                        })
                        .error(function (data) {
                            if (error)
                                error(data.errors);
                        });
            },

            getAppDetail: function (appId, success, error) {
                $http.get('/api/oauth2/app/' + appId)
                    .success(function (data) {
                        if (data.result && data.app) {
                            if (success)
                                success(data.app);
                        }
                    })
                    .error(function (data) {
                        if (error)
                            error(data.errors);
                    });
            },

            deleteInstallation: function (installId, success, error) {
                $http.delete('/api/oauth2/installedApp/' + installId)
                    .success(function (data) {
                        if (data.result) {
                            success(data);
                        }
                    })
                    .error(function (data) {
                        if (error)
                            error(data.errors);
                    });
            }
        }
    }
]);;externalApp.controller('ExternalAppsController', function ($scope, $rootScope, $http, $location, $sce,
                                                           $compile, ActionBarService, courseService,
                                                           discussionService, $timeout,
                                                           toastr, Page, $window, externalAppService) {
    $scope.createdApps = [];
    $scope.installedApps = [];
    $scope.errors = [];

    externalAppService.getCreatedApps(
        function (apps) {
            $scope.createdApps = apps;
        },
        function (err) {
            $scope.errors = err;
        }
    );

    externalAppService.getInstalledApps(
        function (apps) {
            $scope.installedApps = apps;
        },
        function (err) {
            $scope.errors = err;
        }
    );

    $scope.isEmptyObject = function(obj) {
        for(var prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                return false;
            }
        }
        return true;
    }

});;externalApp.config(['$routeProvider', '$locationProvider',

    function ($routeProvider, $locationProvider) {

        $routeProvider.
        when('/createExternalApp', {
            templateUrl: '/settings/apps/createExternalApp',
            controller: 'CreateAppController',
            reloadOnSearch: false
        }).

        when('/createdApps', {
            templateUrl: '/settings/apps/createdApps',
            controller: 'CreatedAppsController',
            reloadOnSearch: false
        }).

        when('/installed', {
            templateUrl: '/settings/apps/installed',
            controller: 'InstalledAppsController',
            reloadOnSearch: false
        }).

        when('/documentation', {
            templateUrl: '/settings/apps/documentation',
            controller: 'CreatedAppsController',
            reloadOnSearch: false
        }).

        when('/app/:appId', {
            templateUrl: '/settings/apps/appDetail',
            controller: 'CreatedAppController',
            reloadOnSearch: false
        }).

        otherwise({
            redirectTo: '/'
        });

    }]);
;externalApp.controller('InstalledAppsController', function ($scope, $rootScope, $http, $location, $sce,
                                                            $compile, $timeout,
                                                            toastr, externalAppService) {

    $scope.deleteInstallation = function (installId) {
        if (confirm('This application will not have access to your data anymore.')) {
            externalAppService.deleteInstallation(installId,
                function () {
                    toastr.success('Application deleted.');
                    var deleted = _.remove($scope.$parent.installedApps, {clientId: installId});
                },
                function () {
                    toastr.error('Delete failed.');
                }
            );
        }
    }
});;app.factory('authService', [
    '$rootScope', '$http',

    function ($rootScope, $http) {
        return {
            user: null,

            isCheckingForLogin: false,

            showLoginModal: false,
            /**
             * default value is null  because its used on a watch check
             *
             * if you want to use isLogged, you have to be sure that it already tried to login, or called loginCheck
             * otherwise just use loginCheck
             */
            isLoggedIn: false,
            hasTriedToLogin: false,

            loginCheck: function (successCallback, errorCallback) {
                var self = this;

                if (self.user) {
                    self.isLoggedIn = true;
                    successCallback(self.user);
                }
                else {
                    if (self.isCheckingForLogin)
                        return;

                    self.isCheckingForLogin = true;

                    $http.get('/api/account').success(function (data) {
                        self.isCheckingForLogin = false;

                        self.hasTriedToLogin = true;

                        if (data.result) {
                            self.user = data.user;
                            self.isLoggedIn = true;
                            $rootScope.user = data.user;

                            $rootScope.$broadcast('onAfterInitUser', self.user);
                            successCallback(self.user);
                        }
                    }).error(function (data) {
                        self.isCheckingForLogin = false;
                        self.isLoggedIn = false;
                        self.hasTriedToLogin = true;

                        if (errorCallback)
                            errorCallback(data);
                    });
                }
            },

            isAdmin: function () {
                if (this.user && this.user.role == 'admin')
                    return true;

                return false;
            },

            login: function (loginData, successCallback, errorCallback) {
                var self = this;

                var d = transformRequest(loginData);
                $http({
                    method: 'POST',
                    url: '/api/accounts/login',
                    data: d,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
                    .success(
                        function success(data) {
                            if (data.result) {
                                $rootScope.user = data.user;
                                self.user = data.user;
                                self.isLoggedIn = true;
                                $rootScope.$broadcast('onAfterInitUser', $rootScope.user);
                                successCallback($rootScope.user);
                            }
                        })
                    .error(
                        function (data) {
                            self.isLoggedIn = false;
                            errorCallback(data);
                        });
            },

            signUp: function (loginData, successCallback, errorCallback) {
                var d = transformRequest(loginData);
                $http({
                    method: 'POST',
                    url: '/api/accounts/signUp',
                    data: d,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
                    .success(
                        function success(data) {
                            if (data.result) {
                                //$rootScope.user = data.user;
                                $rootScope.$broadcast('onAfterUserRegistration', data.user);

                                successCallback(data.user);
                            } else {
                                errorCallback(data);
                            }
                        }).error(
                    function (data) {
                        errorCallback(data);
                    }
                );
            },

            showLoginForm: function () {
                $('#loginFormModal').modal({backdrop: 'static', keyboard: false});
            }
        }
    }
]);;app.factory('collapseService', ['$rootScope', '$http', function ($rootScope, $http) {
  return {
    collapsed: [],

    isCollapsed: function (nodeId) {
      var idx = this.collapsed.indexOf(nodeId);
      if (idx != -1) {
        return idx;
      }

      return false;
    },

    /**
     *
     * @param nodeId
     * @returns {boolean} true: hide, false: show
     */
    toggle: function (nodeId) {
      var idx = this.isCollapsed(nodeId);
      if (idx === false) {
        // hidden, now set it to hide
        this.collapsed.push(nodeId);
        this.localStorageSave(nodeId, 1);
        // true means hide
        return true;
      } else {
        // show back
        this.collapsed.splice(idx, 1);
        this.localStorageSave(nodeId, 0);
        return false;
      }
    },

    setCollapse: function (nodeId) {
      var idx = this.isCollapsed(nodeId);
      if (idx === false) {
        // hidden, now set it to hide
        this.collapsed.push(nodeId);
        this.localStorageSave(nodeId, 1);
        // true means hide
        return true;
      }
      return false;
    },

    setExpand: function (nodeId) {
      var idx = this.isCollapsed(nodeId);
      if (idx !== false) {
        // show back
        this.collapsed.splice(idx, 1);
        this.localStorageSave(nodeId, 0);
        return true;
      }
      return false;
    },


    setCollapseFirst: function (nodeId) {
      var idx = this.isCollapsed(nodeId);
      if (idx === false) {
        // hidden, now set it to hide
        this.collapsed.push(nodeId);
        // true means hide
        return true;
      }
      return false;
    },

    setExpandFirst: function (nodeId) {
      var idx = this.isCollapsed(nodeId);
      if (idx !== false) {
        // show back
        this.collapsed.splice(idx, 1);
        return true;
      }
      return false;
    },

    affectVisual: function (hide, pNode, nodeId) {
      var self = this;

      for (var i in pNode.childrens) {
        var chs = pNode.childrens[i];
        if (hide === true) {
          $('#t' + chs._id).hide();
          if (chs.childrens.length > 0) {
            self.affectVisual(true, chs, chs._id);
          }
        }
        else {
          $('#t' + chs._id).show();

          if (chs.childrens.length > 0) {
            var isChildrenCollapsed = self.isCollapsed(chs._id);
            if (isChildrenCollapsed === false)
              self.affectVisual(false, chs, chs._id);
            else if (isChildrenCollapsed >= 0 || isChildrenCollapsed === true)
              self.affectVisual(true, chs, chs._id);
          }
        }
      }

      // hide svg
      if (hide === true)
        $("svg[data-source='t" + nodeId + "'").hide();
      else
        $("svg[data-source='t" + nodeId + "'").show();
    },

    affectVisualCat: function (hide, pNode, slug) {
      var self = this;

      for (var i in pNode.subCategories) {
        var chs = pNode.subCategories[i];
        if (hide === true) {
          $('#' + chs.slug).hide();
          if (chs.subCategories.length > 0) {
            self.affectVisual(true, chs, chs.slug);
          }
        }
        else {
          $('#' + chs.slug).show();

          if (chs.subCategories.length > 0) {
            var isChildrenCollapsed = self.isCollapsed(chs._id);
            if (isChildrenCollapsed === false)
              self.affectVisual(false, chs, chs.slug);
            else if (isChildrenCollapsed >= 0 || isChildrenCollapsed === true)
              self.affectVisual(true, chs, chs.slug);
          }
        }
      }

      // hide svg
      if (hide === true)
        $("svg[data-source='" + slug + "'").hide();
      else
        $("svg[data-source='" + slug + "'").show();
    },

    localStorageSave: function (_id, val) {
      if (typeof(localStorage) == "undefined")
        return;

      localStorage['collapse.' + _id] = val;
    }
  }
}]);;app.factory('courseService', [
    '$rootScope', '$http',

    function ($rootScope, $http) {
        return {
            course: null,

            init: function (courseId, success, error, force) {
                var self = this;

                if (!force && self.course) {
                    if (success)
                        success(self.course);
                }
                else if (force || !self.course)
                    $http.get('/api/course/' + courseId)
                        .success(function (res) {
                            if (res.result) {
                                self.course = res.course;

                                if (success)
                                    success(res.course);
                            }
                        })
                        .error(function (res) {
                            if (error)
                                error(res);
                        });
            },

            isEnrolled: function () {
                if (!this.isInitialized()) return false;

                return this.course.isEnrolled;
            },

            isOwner: function (user) {
                var self = this;

                if (!user) {
                    return false;
                }

                if (!self.isInitialized()) return false;

                return (user._id == self.course.createdBy._id);
            },

            isManager: function (user) {
                var self = this;

                if (!user) {
                    return false;
                }

                if (!self.isInitialized()) return false;

                var mgr = _.find(self.course.managers, {_id: user._id});

                if (mgr) {
                    return true;
                }

                return false;
            },

            leave: function (user, success, error) {
                var self = this;

                if (!user) {
                    return false;
                }

                if (!self.isInitialized()) return false;

                var url = '/api/course/' + self.course._id + '/leave';

                $http.put(url, {})
                    .success(function (res) {
                        if (res.result) {
                            // success leaving
                            self.course.isEnrolled = false;
                        }

                        if (success)
                            success(self.course.isEnrolled);
                    })
                    .error(function (res) {
                        if (error)
                            error(res);
                    });
            },

            enroll: function (user, success, error) {
                var self = this;

                if (!user) {
                    return false;
                }

                if (!self.isInitialized()) return false;

                var url = '/api/course/' + self.course._id + '/enroll';

                $http.put(url, {})
                    .success(function (res) {
                        if (res.result)
                            self.course.isEnrolled = true;

                        if (success)
                            success(self.course.isEnrolled);
                    })
                    .error(function (res) {
                        if (error)
                            error(res);
                    });
            },

            isInitialized: function () {
                if (!this.course) {
                    return false;
                }

                return true;
            }
        }
    }
]);;app.factory('courseListService', [
    '$rootScope', '$http',

    function ($rootScope, $http) {
        return {
            courses: null,
            pageUrl: '',
            filterTags: [],

            pageParams: {
                limit: 12,
                sortBy: '_id',
                orderBy: '-1',
                lastPage: false
            },

            init: function (categoryId, filterTags, success, error, force) {
                var self = this;

                self.filterTags = filterTags;
                self.categoryId = categoryId;
                self.setPageUrl();

                if (!force && self.courses) {
                    if (success)
                        success(self.courses);
                }

                else if (force || !self.courses) {
                    var url = '/api/category/' + self.categoryId + '/courses' + self.pageUrl;

                    $http.get(url)
                        .success(function (data) {
                            self.courses = data.courses;
                            success(data.courses)
                        })
                        .error(function (data) {
                            if (error)
                                error(data.errors);
                        });
                }
            },

            getMoreRows: function (success, error) {
                var self = this;

                self.setPageUrl();
                $http.get('/api/category/' + self.categoryId + '/courses' + self.pageUrl)
                    .success(function (data) {
                        if (data.result && data.courses && data.courses.length > 0) {
                            self.courses = self.courses.concat(data.courses);

                            if (success)
                                success(data.courses, self.courses);
                        }
                        else
                            success(false);
                    })
                    .error(function (data) {
                        if (error)
                            error(data.errors);
                    });
            },

            setPageUrl: function () {
                this.pageUrl = '?';

                var ps = [];
                for (var k in this.pageParams) {
                    ps.push(k + '=' + this.pageParams[k]);
                }

                var t = [];
                if (this.filterTags && this.filterTags.length > 0) {
                    for (var i in this.filterTags)
                        t.push(this.filterTags[i]._id);

                    ps.push('tags=' + t.join(','));
                }

                this.pageUrl += ps.join('&');
            },

            setPageParams: function (scp) {
                var self = this;

                self.pageParams.limit = scp.limit;
                self.pageParams.sortBy = scp.sortBy;
                self.pageParams.orderBy = scp.orderBy;
                self.pageParams.lastPage = scp.lastPage;
            },

            isInitialized: function () {
                if (!this.courses) {
                    return false;
                }

                return true;
            }
        }
    }
]);;app.factory('discussionService', [
    '$rootScope', '$http',

    function ($rootScope, $http) {
        return {
            posts: null,
            pageUrl: '',
            courseId: null,

            pageParams: {
                limit: 10,
                sortBy: 'dateAdded',
                orderBy: -1,
                lastPage: false
            },

            init: function (courseId, success, error, force) {
                var self = this;

                self.courseId = courseId;
                self.setPageUrl();

                if (!force && self.posts) {
                    if (success)
                        success(self.posts);
                }

                else if (force || !self.posts)
                    $http.get('/api/discussions/' + courseId + self.pageUrl)
                        .success(function (data) {
                            if (data.result && data.posts) {
                                self.posts = data.posts;
                                if (success)
                                    success(self.posts);
                            }
                        })
                        .error(function (data) {
                            if (error)
                                error(data.errors);
                        });
            },

            getMoreRows: function (success, error) {
                var self = this;

                self.setPageUrl();
                $http.get('/api/discussions/' + self.courseId + self.pageUrl)
                    .success(function (data) {
                        if (data.result && data.posts && data.posts.length > 0) {
                            self.posts = self.posts.concat(data.posts);

                            if (success)
                                success(data.posts, self.posts);
                        }
                        else
                            success(false);
                    })
                    .error(function (data) {
                        if (error)
                            error(data.errors);
                    });
            },

            setPageUrl: function () {
                this.pageUrl = '?';

                var ps = [];
                for (var k in this.pageParams) {
                    ps.push(k + '=' + this.pageParams[k]);
                }

                this.pageUrl += ps.join('&');
            },

            setPageParams: function (scp) {
                var self = this;

                self.pageParams.limit = scp.limit;
                self.pageParams.sortBy = scp.sortBy;
                self.pageParams.orderBy = scp.orderBy;
                self.pageParams.lastPage = scp.lastPage;
            },

            isInitialized: function () {
                if (!this.posts) {
                    return false;
                }

                return true;
            }
        }
    }
]);;app.factory('linkService', [
    '$rootScope', '$http',

    function ($rootScope, $http) {
        return {
            posts: null,
            nodeId: null,

            pageParams: {
                limit: 10,
                sortBy: 'dateAdded',
                orderBy: -1,
                lastPage: false
            },

            getMoreRows: function (success, error) {
                var self = this;

                self.setPageUrl();
                $http.get('/api/links/' + self.nodeId + self.pageUrl)
                    .success(function (data) {
                        if (data.result && data.posts && data.posts.length > 0) {
                            self.posts = self.posts.concat(data.posts);

                            if (success)
                                success(data.posts, self.posts);
                        }
                        else
                            success(false);
                    })
                    .error(function (data) {
                        if (error)
                            error(data.errors);
                    });
            },

            setPageUrl: function () {
                this.pageUrl = '?';

                var ps = [];
                for (var k in this.pageParams) {
                    ps.push(k + '=' + this.pageParams[k]);
                }

                this.pageUrl += ps.join('&');
            },

            setPageParams: function (scp) {
                var self = this;

                self.pageParams.limit = scp.limit;
                self.pageParams.sortBy = scp.sortBy;
                self.pageParams.orderBy = scp.orderBy;
                self.pageParams.lastPage = scp.lastPage;
            },

            init: function (nodeId, success, error, force) {
                var self = this;

                self.nodeId = nodeId;

                if (!force && self.posts) {
                    if (success)
                        success(self.posts);
                }

                else if (force || !self.posts) {
                    self.setPageUrl();
                    $http.get('/api/links/' + nodeId + self.pageUrl)
                        .success(function (data) {
                            if (data.result && data.posts) {
                                self.posts = data.posts;
                                if (success)
                                    success(self.posts);
                            }
                        })
                        .error(function (data) {
                            if (error)
                                error(data.errors);
                        });
                }
            },

            isInitialized: function () {
                if (!this.posts) {
                    return false;
                }

                return true;
            }
        }
    }
]);;app.factory('mapService', ['$rootScope', '$http', function ($rootScope, $http) {
  return {
    treeNodes: null,
    /*var for testing in findNode function*/
    found: false,

    init: function (courseId, success, error, force) {
      var self = this;

      if (!force && self.treeNodes) {
        if (success)
          success(self.treeNodes);
      }

      else if (force || !self.treeNodes)
        $http.get('/api/treeNodes/course/' + courseId)
          .success(function (data) {
            if (data.result) {
              self.treeNodes = data.treeNodes;
              if (success)
                success(self.treeNodes);
            }
          })

          .error(function (data) {
            if (error)
              error(data.errors);
          });
    },

    //socket method
    updatePosition: function (nid, data) {
      this.found = false;
      var pNode = this.findNode(this.treeNodes, 'childrens', '_id', nid);
      if (pNode) {
        pNode.positionFromRoot = {x: data.x, y: data.y};
      }
    },

    // socket method
    updateNode: function (treeNode) {
      this.found = false;
      var pNode = this.findNode(this.treeNodes, 'childrens', '_id', treeNode._id);
      if (pNode) {
        pNode.name = treeNode.name;
        if (pNode.type == 'contentNode') {
          pNode.resources = [];
          if (treeNode.resources.length > 0) {
            for (var i in treeNode.resources) {
              pNode.resources.push(treeNode.resources[i]);
            }
          }
        }
      }
    },

    // socket method
    deleteNode: function (treeNode) {
      this.found = false;
      var pNode = this.findNode(this.treeNodes, 'childrens', '_id', treeNode._id);
      if (pNode) {
        pNode.isDeleted = true;
        if (treeNode.isDeletedForever)
          pNode.isDeletedForever = true;

        pNode.name = '[DELETED]';
      }
    },

    // socket method
    addNode: function (treeNode) {
      this.found = false;
      var pNode = this.findNode(this.treeNodes, 'childrens', '_id', treeNode.parent);

      if (!pNode) {
        if (treeNode.parent) {
          this.found = false;
          var pNode = this.findNode(this.treeNodes, 'childrens', '_id', treeNode.parent);

          if (pNode) {
            pNode.childrens.push(treeNode);
          }
        }
        else
          this.treeNodes.push(treeNode);
      }
    },

    findNode: function (obj, col, searchKey, searchValue) {
      if (this.found)
        return this.found;

      for (var i in obj) {
        var tn = obj[i];

        if (tn[searchKey] && tn[searchKey] == searchValue) {
          this.found = tn;
          return tn;
        }
        else if (tn[col] && tn[col].length > 0) {
          // search again
          this.findNode(tn[col], col, searchKey, searchValue);
        }
      }

      if (this.found)
        return this.found;
    },

    isInitialized: function () {
      if (!this.treeNodes) {
        return false;
      }

      return true;
    }
  }
}
]);;app.factory('Page', function($window) {
    var prefix = 'CourseMapper';
    var title = 'CourseMapper';
    return {
        title: function() {
            return title;
        },

        setTitle: function(newTitle) {
            title = newTitle;
            $window.document.title = title;
        },

        setTitleWithPrefix: function(newTitle) {
            title = prefix + ': ' + newTitle;
            $window.document.title = title;
        },

        xs: 768,
        sm: 992,
        md: 1200,

        defineDevSize: function(width){
            if(width < this.xs){
                return 'xs';
            } else if(width > this.xs && width <= this.sm){
                return 'sm';
            } else if(width > this.sm && width <= this.md){
                return 'md';
            } else if(width > this.md){
                return 'lg';
            }
        }
    };
});;/*jslint node: true */
'use strict';

app.factory('socket', function ($rootScope) {
    var socket = io.connect();

    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },

        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        },

        subscribe: function (room) {
            socket.emit("subscribe", {room: room});
        },

        unSubscribe: function (room) {
            socket.emit("unSubscribe", {room: room});
        }
    };
});
;app.factory('treeNodeService', [
    '$rootScope', '$http',

    function ($rootScope, $http) {
        return {
            treeNode: null,
            pdfFile: null,
            videoFile: null,

            init: function (nodeId, success, error, force) {
                var self = this;

                if (!force && self.treeNode) {
                    if (success)
                        success(self.treeNode);
                }
                else if (force || !self.treeNode) {
                    $http.get('/api/treeNode/' + nodeId)
                        .success(function (res) {
                            if (res.result) {
                                self.treeNode = res.treeNode;
                                self.parseResources();

                                if (success)
                                    success(res.treeNode);
                            }
                        })
                        .error(function (res) {
                            if (error)
                                error(res);
                        });
                }
            },

            parseResources: function () {
                var self = this;
                for (var i = 0; i < self.treeNode.resources.length; i++) {
                    var content = self.treeNode.resources[i];
                    if (content['type'] == 'mp4'
                        || content['type'] == 'video'
                        || content['type'] == 'videoLink'
                    ) {
                        self.videoFile = content;
                        self.treeNode.videoFile = content;
                    } else if (content['type'] == 'pdf'
                        || content['type'] == 'pdfLink'
                    ) {
                        self.pdfFile = content;
                        self.treeNode.pdfFile = content;
                    }
                }
            },

            isOwner: function (user) {
                var self = this;

                if (!user) {
                    return false;
                }

                if (!self.isInitialized()) return false;

                return (user._id == self.treeNode.createdBy._id);
            },

            isInitialized: function () {
                if (!this.treeNode) {
                    return false;
                }

                return true;
            }
        }
    }
]);;app.factory('widgetService', [
    '$http', '$rootScope', '$ocLazyLoad', '$timeout',

    function ($http, $rootScope, $ocLazyLoad, $timeout) {
        return {
            widgets: [],
            uninstalledwidgets: [],
            installedWidgets: [],

            getWidgetsOnLocation: function (location, id, success, error, force) {
                var self = this;

                if (!force && self.installedWidgets[location]) {
                    self.initializeWidgets(self.installedWidgets[location], location, function () {
                        if (success) {
                            success(self.installedWidgets[location]);
                        }
                    });
                }

                else if (force || !self.widgets[location])
                    $http.get('/api/widgets/' + location + '/' + id)
                        .success(function (data) {
                            self.installedWidgets[location] = [];

                            if (data.result) {
                                self.installedWidgets[location] = data.widgets;

                                self.initializeWidgets(data.widgets, location, function () {
                                    if (success) {
                                        success(self.widgets[location]);
                                    }
                                });
                            } else if (error)
                                error(data.errors);
                        })
                        .error(function (data) {
                            if (error)
                                error(data.errors);
                        });
            },

            lazyLoad: function (wdg, currentIndex, widgetJsArray, fileToLoad, location) {
                var self = this;

                (function (wdg) {
                    var jsfn = '/' + wdg.application + '/' + fileToLoad;

                    $ocLazyLoad.load(jsfn).then(function () {
                        // the last one has been loaded
                        var l = wdg.widgetId.widgetJavascript.length - 1;
                        if (fileToLoad == wdg.widgetId.widgetJavascript[l]) {
                            // only push to main widgets array when it is the last js to load
                            self.widgets[location].push(wdg);
                        } else {
                            var nextFile = widgetJsArray[currentIndex++];
                            self.lazyLoad(wdg, currentIndex, widgetJsArray, nextFile);
                        }
                    });
                })(wdg);
            },

            initializeWidgets: function (widgets, location, finishedCB) {
                var self = this;

                self.widgets[location] = [];

                for (var i in widgets) {
                    var wdg = widgets[i];

                    // loop to load the js (if exist)
                    if (wdg.widgetId != null && wdg.widgetId.widgetJavascript) {
                        this.lazyLoad(wdg, 0, wdg.widgetId.widgetJavascript, wdg.widgetId.widgetJavascript[0], location);
                    } else {
                        self.widgets[location].push(wdg);
                    }
                }

                if (finishedCB)
                    finishedCB(self.widgets[location]);
            },

            isInitialized: function (location) {
                if (!this.widgets[location]) {
                    return false;
                }

                return true;
            },

            addWidget: function (location, id) {
                var self = this;

                var loc = '#' + location + '-widgets';
                var grid = $(loc).data('gridstack');

                var el = '#w' + id;

                // get width and height
                var i = _.findIndex(self.widgets[location], {'_id': id});
                var wdg = self.widgets[location][i];

                //add_widget(el, x, y, width, height, auto_position)
                var x = 0;
                var y = 0;
                if (wdg.position) {
                    x = wdg.position.x;
                    y = wdg.position.y;
                }

                grid.addWidget(el, x, y, wdg.width, wdg.height, false);
            },

            initWidgetButton: function (location, id) {
                //$.AdminLTE.boxWidget.activate();
                this.addWidget(location, id);

                var h = $('#w' + id);
                $('#w' + id + ' .grid-stack-item-content .box-body').css('height', (h.innerHeight() - 40) + 'px');
            },

            install: function (location, application, name, extraParams, successCb, errorCb) {
                var params = {
                    application: application,
                    widget: name,
                    location: location
                };

                params = _.merge(params, extraParams);

                $http.put('/api/widgets/install', params)
                    .success(function (data) {
                        if (data.result) {
                            if (successCb)
                                successCb(data.installed);
                        } else if (errorCb)
                            errorCb(data.errors);
                    })
                    .error(function (data) {
                        if (errorCb)
                            errorCb(data.errors);
                    });
            },

            uninstall: function (installId, extraParams, successCb, errorCb) {
                var self = this;

                $http.put('/api/widgets/uninstall/' + installId, extraParams)
                    .success(function (data) {
                        if (data.result) {
                            self.uninstalledwidgets.push(installId);

                            if (successCb)
                                successCb(data.uninstalled);
                        }
                        else if (errorCb)
                            errorCb(data.errors);
                    })
                    .error(function (data) {
                        if (errorCb)
                            errorCb(data.errors);
                    });
            },

            setPosition: function (wId, x, y, success, error) {
                $http.put('/api/widget/' + wId + '/setPosition', {
                        x: x, y: y
                    })
                    .success(function (res) {
                        if (success)
                            success(res);
                    })
                    .error(function (data) {
                        if (error)
                            error(data.errors);
                    });
            },

            initiateDraggableGrid: function (locs, enableDragging) {
                var loc = '#' + locs + '-widgets';

                var options = {
                    cellHeight: 340,
                    verticalMargin: 10,
                    resizable: false
                };

                if (!enableDragging) {
                    options.disableDrag = true;
                }

                var $gs = $(loc);
                $gs.gridstack(options);
            },

            onchangelistener: function (evt, node) {
                var self = this;
                for (var i in node) {
                    var nd = node[i];
                    var c = $(nd.el);
                    if (c) {
                        var wId = c.attr('id').substr(1);
                        //if (nd._updating)
                        {
                            var x = nd.x;
                            var y = nd.y;

                            self.setPosition(wId, x, y);
                            self.setLocalPosition(wId, x, y);
                        }
                    }
                }
            },

            setLocalPosition: function (wId, x, y) {
                for (var i in this.widgets) {
                    var wdgs = this.widgets[i];
                    for (var j in wdgs) {
                        var wdg = wdgs[j];
                        if (wdg && wdg._id == wId) {
                            this.widgets[i][j].position.x = x;
                            this.widgets[i][j].position.y = y;
                            wdg.position.x = x;
                            wdg.position.y = y;
                        }
                    }
                }
            },

            initiateDragStop: function (locs) {
                var self = this;

                var loc = '#' + locs + '-widgets';
                var $gs = $(loc);
                //$gs.off('change', self.onchangelistener);
                $gs.on('change', function (evt, node) {
                    for (var i in node) {
                        var nd = node[i];
                        var c = $(nd.el);
                        if (c) {
                            var wId = c.attr('id').substr(1);
                            //if (nd._updating)
                            {
                                var x = nd.x;
                                var y = nd.y;

                                self.setPosition(wId, x, y);
                                self.setLocalPosition(wId, x, y);
                            }
                        }
                    }
                });
            }
        }
    }
]);;app.filter('capitalize', function () {
  return function (input, all) {
    return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }) : '';
  }
});

app.filter('base64Encode', function () {
  return function (input, all) {
    return (!!input) ? Base64.encode(input) : '';
  }
});

app.filter('base64Decode', function () {
  return function (input, all) {
    return (!!input) ? Base64.decode(input) : '';
  }
});

app.filter('unsafe', function ($sce) {
  return $sce.trustAsHtml;
});

app.filter('trustUrl', function ($sce) {
  return function(url) {
    return $sce.trustAsResourceUrl(url);
  };
});

app.filter('trustHtml', function ($sce) {
  return function(html) {
    return $sce.trustAsHtml(html);
  };
});

app.filter('cut', function () {
  return function (value, wordwise, max, tail) {
    if (!value) return '';

    max = parseInt(max, 10);
    if (!max) return value;
    if (value.length <= max) return value;

    value = value.substr(0, max);
    if (wordwise) {
      var lastspace = value.lastIndexOf(' ');
      if (lastspace != -1) {
        //Also remove . and , so its gives a cleaner result.
        if (value.charAt(lastspace - 1) == '.' || value.charAt(lastspace - 1) == ',') {
          lastspace = lastspace - 1;
        }
        value = value.substr(0, lastspace);
      }
    }

    return value + (tail || ' ???');
  };
});;app.filter('htmlToPlaintext', function () {
    return function (text) {
      return angular.element(text).text();
    }
  }
);;app.filter('msToTime', function() {
    return function msToTime(s) {
        function addZ(n) {
            return (n < 10 ? '0' : '') + n;
        }

        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;
        return addZ(hrs) + ':' + addZ(mins) + ':' + addZ(secs);
    };
});
;app.filter('secondsToDateTime', [function() {
    return function(seconds) {
        return new Date(1970, 0, 1).setSeconds(seconds);
    };
}]);
;app.controller('aggregationController',['$scope','$sce','$http', function($scope,$sce,$http){
    /**
     * Declare and initialise the posts[], postType(s), sortTime(s),enabled(personal space)
     */
    $scope.posts = [];
    $scope.personalPosts=[];
    //console.log("here");
    $scope.currentSpace= 'Public';
    $scope.query='';
    $scope.enabled = false;
    $scope.sort = "";

    /**
     * Initialize for pagination
     */
    $scope.currentPagePublic = 1;
    $scope.currentPagePersonal = 1;
    $scope.postsLength = 0;
    $scope.personalPostsLength = 0;
    $scope.publicView = [];
    $scope.personalView = [];
    /**
     * initialize the environment i.e either public or personal
     */
    $scope.init=function(){
        if($scope.enabled){
            $scope.loadPersonal();
        }else{
            $scope.loadlink();
        }
    };

    /**
     * get all the posts for public space
     */
    $scope.loadlink=function(){
        $http.get('/api/learningHub/posts/',{
            params:{
                nodeId: $scope.treeNode._id,
                type: $scope.postType,
                sortBy : $scope.sortTime,
                searchQuery : $scope.query
            }
        }).success(function(data){
            $scope.postsLength = data.length;
            $scope.posts = data;
            $scope.publicView = [];
            $scope.publicView = $scope.postsSlice($scope.posts, $scope.currentPagePublic);
        }).error(function(data){
            console.log(data);
        });
    };

    /**
     * get all the posts for persoanl space
     */
    $scope.loadPersonal = function() {
        $http.get('/api/learningHub/personalPosts/'+ $scope.treeNode._id,{
            params:{
                type: $scope.postType,
                sortBy : $scope.sortTime,
                searchQuery : $scope.query
            }
        }).success(function(data){
                $scope.personalPostsLength = data.length;
                $scope.personalPosts = data;
                $scope.personalView = [];
                $scope.personalView = $scope.postsSlice($scope.personalPosts, $scope.currentPagePersonal);

        }).error(function(data){
            console.log(data);
        });
    };

    /**
     * search for the posts based on search query
     */
    $scope.search = function() {
        $scope.init();
    };

    /**
     * select types of posts
     */
    $scope.typeChange = function() {
        if($scope.sortTime === 'votes'){
            $scope.sort = "voteDisplay";
        }else{
            $scope.sort="";
            $scope.init();
        }
    };

    $scope.$on('LinkForm', function(event, data){
        $scope.loadlink();

    });

    /**
     * handle the post edit and delete event emitted in hublink.js
     */
    $scope.$on('LinkEditDelete', function(event, data){
        if($scope.enabled){
            $scope.loadPersonal();
        }else{
            $scope.loadlink();
        }
    });

    /**
     * handle the toggle between the personal and private space
     */
    $scope.$watch('enabled', function(){
        $scope.postTypes = ['all', 'video', 'audio', 'slide', 'doc', 'story', 'pdf', 'link'];
        $scope.sortTimes = $scope.enabled ? ['Newest First', 'Oldest First'] : ['Newest First', 'Oldest First', 'Most Popular', 'Most Commented'];
        $scope.sortTime = $scope.sortTimes[0];
        $scope.postType = $scope.postTypes[0];
        $scope.init();
    });

    $scope.publicPageChanged = function(){
        $scope.publicView = [];
        $scope.publicView = $scope.postsSlice($scope.posts, $scope.currentPagePublic);
    };

    $scope.personalPageChanged = function(){
        $scope.personalView = [];
        $scope.personalView = $scope.postsSlice($scope.personalPosts, $scope.currentPagePersonal);
    };

    $scope.postsSlice = function(p,currentPage){
        var len = p.length;
        var end = currentPage * 10;
        var start = end -10;
        if(end > len){
            end = start + (len % 10);
        }
       console.log(p.slice(start, end));
        return p.slice(start, end);
    };

}]);
;/**
 * bootstrapping the learningHub module
 */
'use-strict';
var learningHubModule = angular.module('LearningHub', [
    'ngSanitize',
    'ngRoute',
    'ui.bootstrap',
    'toastr'] );;// select the template to use based on the type of post
learningHubModule.directive('hubLink', function () {
        var setTemplate = function (post) {
            var postType = post.type;
            var templateUrl = '/learningHubTemplates/hublinknothumb.html';
            switch (postType) {
                case 'video':
                    templateUrl = '/learningHubTemplates/hubvideo.html';
                    break;
                case 'pdf':
                    templateUrl = '/learningHubTemplates/hubpdf.html';
                    break;
                case 'audio':
                    templateUrl = '/learningHubTemplates/hubaudio.html';
                    break;
                case 'slide':
                    templateUrl = '/learningHubTemplates/hubslide.html';
                    break;
                case 'image':
                    templateUrl = '/learningHubTemplates/hubimage.html';
                    break;
                case 'doc':
                    templateUrl = '/learningHubTemplates/hubdoc.html';
                    break;
                case 'link':{
                    if(post.image){
                        templateUrl = '/learningHubTemplates/hublinkthumb.html';
                    }else{
                        templateUrl = '/learningHubTemplates/hublinknothumb.html';
                    }
                    break;
                }
            }
            return templateUrl;
        };
        return {
            restrict: 'E',
            bindToController: true,
            controller: "HubLinkController as vm",
            scope: {
                post: '=',
                space: "="
            },
            link: function (scope) {
               scope.templateUrl = setTemplate(scope.vm.post);
            },
            template: "<div ng-include='templateUrl'></div>"
        };
    })
    .controller( 'HubLinkController', [ '$rootScope', '$scope', '$sce','$http','socket','toastr', '$uibModal', 'treeNodeService', 'authService',function ($rootScope,$scope, $sce, $http, socket, toastr, $uibModal, treeNodeService, authService) {
        // view data preparation
        var vm = this;
        // set whether the post is added to the persnal space of the user
        vm.pa = false;
        // local copy of the contents of the post
        var dupVm = angular.copy($scope.vm.post);
        // comment related initialisation
        vm.toggle = false;
        vm.commentText = '';
        vm.commentSliderId = "c" + vm.post.postId;
        // check owner and space to show the edit delete
        if(vm.space){
            vm.owner = false;
            vm.pa = true;
        }else{
            var user = authService.user;
            var isAdmin = user.role === 'admin';
            vm.owner = (vm.post.userId == authService.user._id) || isAdmin;
            vm.pa = false;
            for(var i = 0; i < vm.post.personalUsers.length; i++) {
                if (vm.post.personalUsers[i].userId == authService.user._id) {
                    vm.pa = true;
                    break;
                }
            }
        }

        // post edit methods
        var editInstance;
        vm.edit = function(){
            editInstance = $uibModal.open({
                templateUrl: '/learningHubTemplates/hubPostEdit.html',
                scope: $scope, //passed current scope to the modal
                size: 'lg',
                backdrop: false
            });
        };

        vm.confirmEdit = function(post){
            post.tags = vm.validTags(post.tags);
            $http.post('/api/learningHub/edit/' + treeNodeService.treeNode._id,
                post)
                .success( function(data){
                    //update the copy if it is edited in the edit dialog
                    dupVm = angular.copy($scope.vm.post);
                    $('#editPost').modal('hide');
                    toastr.success("Successfully Edited", vm.post.title);
                    // emit the edit success event
                    $scope.$emit('LinkEditDelete', {
                        linkAction : "linkEdit"
                    });
                })
                .error( function(data){
                    $('#EditPost').modal('hide');
                    toastr.error("Error in Editing", vm.post.title);
                    window.location.reload();
                });

        };

        vm.cancelEdit = function(){
            $scope.vm.post = dupVm;
            editInstance.close();
        };

        //post delete methods
        var deleteInstance;
        vm.delete = function(post){
            deleteInstance = $uibModal.open({
                templateUrl: '/learningHubTemplates/hubPostDelete.html',
                scope: $scope, //passed current scope to the modal
                size: 'lg',
                backdrop: false
            });
        };

        vm.confirmDelete = function(postId){
            $http.delete('/api/learningHub/delete/'+treeNodeService.treeNode._id,
                {
                    params:{
                        'postId' : postId
                    }
                })
                .success( function(data){
                    toastr.success("Successfully Deleted", vm.post.title);
                    $scope.$emit('LinkEditDelete', {
                        linkAction : "linkDelete"
                    });
                })
                .error( function(data){
                    toastr.error("Error in deleting", vm.post.title);
                    window.location.reload();
                });
        };

        vm.deleteClose = function(){
            deleteInstance.close();
            $('#postDelete').modal('hide');
        };
        // validate and formatt the tags
        vm.validTags=function(unformattedTags){
            var formattedTags = [];
            Object.keys(unformattedTags).forEach(function(tag){
                formattedTags.push(unformattedTags[tag].text)
            });
            return formattedTags;
        };
        // add or remove post to personal space
        vm.togglePersonal = function(post) {
            vm.pa = !vm.pa;
            if(vm.pa){
                $http.post('/api/learningHub/addPersonal/' + treeNodeService.treeNode._id,
                    dupVm)
                    .success( function(data){
                        toastr.success("Successfully added to personal space", vm.post.title);
                    })
                    .error( function(data){
                        toastr.error("Error in adding to personal space", vm.post.title);
                        window.location.reload();
                    });
            }

            if(!vm.pa){
                $http.delete('/api/learningHub/deletePersonal/'+treeNodeService.treeNode._id,
                    {
                        params:{
                            'postId' : vm.post.postId
                        }
                    })
                    .success( function(data){
                        toastr.success("Successfully deleted from personal space ", vm.post.title);
                        console.log("delete before emit");
                        $scope.$emit('LinkEditDelete', {
                            linkAction : "linkDelete"
                        });
                    })
                    .error( function(data){

                        toastr.error("Error in deleting from personal space", vm.post.title);
                        window.location.reload();

                    });
            }
        };
        // comments related methods
        markAuthoredComments(vm.post.comments);
        function markAuthoredComments(comments) {
            var user = authService.user;
            var isAdmin = user.role === 'admin';

            _.forEach(comments, function (comment) {
                if (isAdmin) {
                    comment.canEdit = true;
                } else {
                    var isAuthor = comment.author === user.username;
                    comment.canEdit = isAuthor;
                }
            });
        }
        // add comment emit event
        vm.postComment = function(post){
            var postId = vm.post._id;
            var commentText = vm.commentText;
            if (!commentText || !postId) {
                return;
            }

            var params = {
                postId: postId,
                text: commentText
            };

            socket.emit('comments:post', params);
            vm.commentText = '';
            vm.commentDisplayText(vm.post.comments.length);
        };
        // remove comment emit event
        vm.removeComment = function (commentId) {
            var params = {
                postId: vm.post._id,
                commentId: commentId
            };
            socket.emit('comments:remove', params);
            vm.commentText = '';
        };
        // recieve the comment list updated event
        socket.on(vm.post._id + ':comments:updated', function (params) {
            markAuthoredComments(params.comments);
            vm.post.comments = params.comments;
        });

        vm.commentDisplayText = function(commentLength) {
            if(commentLength == 0){
                return "No Comments"
            }else{
                return commentLength + (commentLength > 1 ? " Comments" : " Comment");
            }
        };

        if(!vm.space){
            vm.commentHeadingText = vm.commentDisplayText(vm.post.comments.length);
        }
    }] );

;
learningHubModule.directive('hubPostDelete', function () {
        return {
            restrict:'E',
            templateUrl: 'js/learningHub/learningHubDirectives/hubPostDelete.html'
        }
    });
;
learningHubModule.directive('hubPostEdit', function() {
        return {
            restrict: 'E',
            templateUrl: './templates/HubLink/hubPostEdit.html',
            scope: {
                post: '='
            }
        }
    });
;/**
 * troller to handle the form for scraping and adding posts
 */
learningHubModule.controller("hubaddLinkController",[ '$rootScope','$scope', '$http', '$window', function ($rootScope, $scope, $http, $window){
    $scope.loading=false;
    $scope.scraped=true;
    $scope.courseId=001;
    $scope.formData={
        'url':"",
        'title':"",
        'type': "",
        'description':"",
        'tags':[],
        'userId' : 1,
        "html" : "",
        "image":"",
        "favicon":"",
        "hostName":""
    };
    $scope.unformattedtags = [];

    /**
     * funciton to scrape the link
     * @param isValid
     * @param form
     */
    $scope.scrapelink=function(isValid,form){
        if(isValid){
            $scope.loading=true;
            $http.get('/api/learningHub/scrape', {params:{
                'url':$scope.formData.url
            }}).success( function (data)  {
                //check data for error
                if(data=="invalid link"){
                    $scope.loading=false;
                    form.$setPristine(true);
                    $scope.linkInvalid=true;
                }else{
                    console.log(data);
                    $scope.linkInvalid=false;
                    $scope.formData.url = data.url;
                    if(data.type){
                        $scope.formData.type = data.type;
                    }
                    if(data.title){
                        $scope.formData.title=data.title;
                    }
                    if(data.description){
                        $scope.formData.description=$scope.descriptionValid(data.description);
                    }
                    //show or hide description
                    if(data.type==="image" || data.type==="audio" || data.type==="slide" || data.type==="doc" || data.type==="pdf" || data.type==="story"){
                        $scope.des_hide=true;
                    }else{
                        $scope.des_hide=false;
                    }

                    if(data.html){
                        $scope.formData.html = data.html;
                    }
                    if(data.image){
                        $scope.formData.image = data.image;
                    }
                    if(data.name){
                        $scope.formData.hostName = data.name;
                    }
                    if(data.favicon){
                        $scope.formData.favicon = data.favicon;
                    }

                    //end loading and show the form
                    $scope.loading=false;
                    $scope.scraped=false;
                }
            }).error( function (data) {
                $scope.loading=false;
                console.log(data);
            });
        }

    };

    //util methods
    $scope.descriptionValid=function(description){
        if(description.length>700){
            return description.slice(0,600)+"...";
        }else{
            return description;
        }
    };

    /**
     * function to reset the form
     */
    $scope.reset=function(form1,form2){
        $scope.formData={
            'url':"",
            'title':"",
            'type': "",
            'description':"",
            'tags':[],
            'userId' : 1,
            "html" : ""
        };
        form1.$setPristine(true);
        form2.$setPristine(true);
        $scope.scraped=true;

    };

    /**
     *function to add the scraped link to the database
     * @param isValid
     */
    $scope.add= function (isValid) {

        if($scope.unformattedtags) {
            $scope.formData.tags = $scope.validTags($scope.unformattedtags);
        }

        if (!$scope.des_hide) {
            $scope.formData.description=$scope.descriptionValid($scope.formData.description);
        }
        console.log($scope.formData);
        $http.post('/api/learningHub/add/'+ $scope.treeNode._id,$scope.formData).success(function (data){
            $scope.unformattedtags="";
            $scope.des_hide=false;
            $scope.scraped=true;
            $scope.$emit('LinkForm', {
                formAction : "newPost"
            });
            $('#Hubaddlink').modal('hide');
        }).error( function(err){
            console.log(err);
            $scope.reset();
            $('#Hubaddlink').modal('hide');
        });

        $scope.reset($scope.aggregateData,$scope.aggregateUrl);
    };

    /**
     *
     * @param unformattedTags
     * @returns {Array|*}
     */
    $scope.validTags=function(unformattedTags){
        var formattedTags = [];
        Object.keys(unformattedTags).forEach(function(tag){
            formattedTags.push(unformattedTags[tag].text)
        });
        return formattedTags;
    };

    $scope.closeForm = function(){
        $scope.formData.url = '';
        $scope.loading = false;
        $('#Hubaddlink').modal('hide');
    }

}]);


;app.
controller('LinksController', function ($scope, $rootScope, $http, $location,
                                        $sce, $compile, ActionBarService, $timeout,
                                        toastr, Page, $window, treeNodeService,
                                        authService, courseService, linkService) {
    $scope.formData = {};
    $scope.currentLink = false;
    $scope.originalCurrentLink = {};
    $scope.pid = false;
    $scope.currentLinkUrl = "";
    $scope.links = [];
    $scope.errors = [];
    $scope.isLoading = false;
    $scope.orderType = 'dateAdded.-1';
    $scope.orderBy = -1;
    $scope.sortBy = 'dateAdded';
    $scope.currentPage = 1;
    $scope.pageReset = false;

    $scope.orderingOptions = [
        {id: 'dateAdded.-1', name: 'Newest First'},
        {id: 'dateAdded.1', name: 'Oldest First'},
        {id: 'totalVotes.-1', name: 'Most Popular'}
    ];

    $scope.initiateLink = function (pid) {
        $scope.pid = pid;
        $location.search('pid', pid);

        if ($scope.pid) {
            $scope.setCurrentLink($scope.pid)
        }

        $scope.manageActionBar();
    };

    $scope.newRowsFetched = function (newRows, allRows) {
        if (newRows) {
            $scope.links = allRows;
        }
    };

    $scope.linksLength = function () {
        return $scope.links.length;
    };

    $scope.paginationReset = function () {
        return $scope.pageReset;
    };

    $scope.initTab = function (node) {
        linkService.init(node._id,

            function (posts) {
                $scope.links = posts;
                $scope.pageTitleOnLink = Page.title();
                $scope.initiateLink();
            },

            function (errors) {
                toastr.error(errors);
            }
        );
    };

    $scope.tabOpened = function () {
        if (treeNodeService.treeNode) {

            if (linkService.posts) {
                $scope.posts = linkService.posts;
            }

            $scope.initTab(treeNodeService.treeNode);
        } else {
            $scope.$on('onAfterInitTreeNode', function (e, contentNode) {
                $scope.initTab(contentNode);
            });
        }

        $scope.manageActionBar();
        $rootScope.$broadcast('onNodeLinkTabOpened', $scope.currentTab);
    };

    $scope.saveNewPost = function (isValid) {
        if (!isValid)
            return;

        $scope.isLoading = true;

        var d = transformRequest($scope.formData);
        $http({
            method: 'POST',
            url: '/api/links/' + $scope.treeNode._id,
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {

                if (data.result) {
                    $scope.$emit('onAfterCreateNewLink', data.post);
                    data.post.createdBy = authService.user;
                    $scope.links.unshift(data.post);
                    $timeout(function () {
                        $scope.$apply()
                    });

                    $scope.formData = {};
                    $scope.AddLinkForm.$setPristine();

                    $('#AddLinksModal').modal('hide');
                }

                toastr.success('Successfully Saved');
                $scope.isLoading = false;
            })
            .error(function (data) {
                $scope.isLoading = false;
                $scope.errors = data.errors;
                toastr.error('Saving Failed');
            });
    };

    $scope.saveEditPost = function (isValid) {
        if (!isValid)
            return;

        $scope.isLoading = true;

        var d = transformRequest($scope.currentLink);
        $http({
            method: 'PUT',
            url: '/api/links/' + $scope.currentLink._id,
            data: d,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                if (data.result) {
                    $scope.$emit('onAfterEditLinks', $scope.currentLink);

                    $('#EditLinksModal').modal('hide');

                    var i = _.findIndex($scope.links, {'_id': data.post._id});
                    $scope.links[i] = $scope.currentLink;
                    $timeout(function () {
                        $scope.$apply()
                    });

                    toastr.success('Successfully Saved');
                }

                $scope.AddLinkForm.$setPristine();
                $scope.isLoading = false;
            })
            .error(function (data) {
                $scope.isLoading = false;
                $scope.errors = data.errors;
                toastr.error('Saving Failed');
            });
    };

    $scope.deletePost = function (postId) {
        var r = confirm("Are you sure you want to delete this link?");

        if (r == true) {
            $http({
                method: 'DELETE',
                url: '/api/links/' + $scope.treeNode._id + '/link/' + postId,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .success(function (data) {
                    if (data.result) {
                        $scope.$emit('onAfterDeleteLink', postId);

                        toastr.success('Successfully Deleted');
                    }
                })
                .error(function (data) {
                    $scope.errors = data.errors;
                    toastr.error('Delete Failed');
                });
        }
    };

    $scope.manageActionBar = function () {
        if ($location.search().tab != 'links')
            return;

        if ($scope.pid) {
            ActionBarService.extraActionsMenu = [];

            if ($scope.isAdmin || $scope.isOwner || $scope.isManager ||
                $scope.currentLink.createdBy._id == authService.user._id ||
                $scope.currentLink.createdBy == authService.user._id
            ) {
                ActionBarService.extraActionsMenu.unshift({
                    separator: true
                });

                ActionBarService.extraActionsMenu.push({
                    'html': '<a style="cursor: pointer;"' +
                    ' data-toggle="modal" data-target="#EditLinksModal"' +
                    ' title="Edit">' +
                    '&nbsp;&nbsp; <i class="ionicons ion-edit"></i> &nbsp; EDIT</a>'
                });

                ActionBarService.extraActionsMenu.push({
                    clickAction: $scope.deletePost,
                    clickParams: $scope.pid,
                    title: '<i class="ionicons ion-close"></i> &nbsp;DELETE',
                    aTitle: 'DELETE'
                });
            }
        }
        else if (!$scope.pid) {
            $scope.currentLink = {};
            ActionBarService.extraActionsMenu = [];
        }
    };

    $scope.setCurrentLink = function (postId) {
        var i = _.findIndex($scope.links, {'_id': postId});
        if ($scope.links[i]) {
            $scope.currentLink = cloneSimpleObject($scope.links[i]);
            $scope.currentLink.createdBy = $scope.links[i].createdBy;
            $scope.originalCurrentLink = cloneSimpleObject($scope.links[i]);
            $scope.currentLinkUrl = $sce.trustAsResourceUrl($scope.currentLink.content);
        }
    };

    $scope.cancel = function () {
        $scope.currentLink = $scope.originalCurrentLink;
        if ($scope.AddLinkForm)
            $scope.AddLinkForm.$setPristine();
        if ($scope.EditLinkForm)
            $scope.EditLinkForm.$setPristine();
    };

    $scope.getSrc = function (url) {
        return $sce.trustAsResourceUrl(url);
    };

    $scope.$on('onAfterDeleteLink', function (e, postId) {
        var i = _.findIndex($scope.links, {'_id': postId});
        if (i >= 0) {
            //$scope.links[i].isDeleted = true;
            $scope.links.splice(i, 1);
            $scope.currentLink = false;
            $scope.pid = false;
            $location.search('pid', '');
            $scope.initiateLink();

            $timeout(function () {
                $scope.$apply();
            });
        }
    });

    /**
     * watch for different window size
     */
    $scope.wSize = 'lg';
    $scope.$watch(function () {
        return $window.innerWidth;
    }, function (value) {
        $scope.wSize = Page.defineDevSize(value);
    });

    $scope.$watch('orderType', function (newVal, oldVal) {
        if (newVal != oldVal) {
            var spl = newVal.id.split('.');

            linkService.setPageParams({
                sortBy: spl[0],
                orderBy: parseInt(spl[1]),
                limit: 10,
                lastPage: false
            });

            $scope.sortBy = spl[0];
            $scope.orderBy = parseInt(spl[1]);
            // reset the page
            $scope.currentPage = 0;
            $scope.pageReset = Math.random();

            linkService.init(treeNodeService.treeNode._id,

                function (posts) {
                    $scope.links = posts;
                    $scope.pageTitleOnLink = Page.title();
                    $scope.initiateLink();
                },

                function (errors) {
                    toastr.error(errors);
                }, true
            );
        }
    });

    $scope.tabOpened();
});
;app.controller('AnnotationZoneListController', function ($scope, $http, $rootScope, $sce, $timeout, $injector) {

  $scope.storedAnnZones = [];
  $scope.storedAnnZoneColors = [];
  $rootScope.tagNameErrors = {};
  //$rootScope.pdfId = "";
  $scope.tagNamesList = JSON.parse(JSON.stringify({}));
  $scope.editZoneMode = -1;
  $scope.editZoneValues = [];
  $scope.annotationZoneList = JSON.parse(JSON.stringify({}));
  $scope.divCounter = 0;
  $rootScope.annotationZonesOnOtherSlides = JSON.parse(JSON.stringify({}));
  $rootScope.annotationSubmitPage = -1;
  $scope.previousPageNumber = -1;
  //$rootScope.annZoneBoxSizeX = 0;
  //$rootScope.annZoneBoxSizeY = 0;
  $rootScope.currCanWidth = 0;
  $rootScope.currCanHeight = 0;
  $scope.updateAnnZonePos = function (posObj) {
    //console.log(posObj);
  };

  $rootScope.createMovableAnnZone = function () {
    var element = $scope.addAnnotationZone(0, 0, 0.3, 0.3, "#ac725e", "", true, false, "");
    //addAnnotationZoneElement(element);
    var annZoneId = element.id;
    $scope.tagNamesList[annZoneId] = "";
  };

  $rootScope.getTagNamesList = function () {
    return $scope.tagNamesList;
  };

  $rootScope.getAnnotationZoneList = function () {
    return $scope.annotationZoneList;
  };

  $scope.addAnnotationZone = function (relLeft, relTop, relWidth, relHeight, color, tagName, isBeingCreated, canBeEdited, annZoneId) {


    var newAnnZone = {
      relativePosition: {
        x: relLeft,
        y: relTop
      },
      relativeSize: {
        x: relWidth,
        y: relHeight
      },
      color: color,
      colorBeforeEdit: color,
      tagName: tagName,
      editTagNameTemp: tagName.slice(1),
      dragable: isBeingCreated,
      isBeingCreated: isBeingCreated,
      canBeEdited: canBeEdited,
      annZoneId: annZoneId,
      divCounter: $scope.divCounter,
      id: 'rect-' + $scope.divCounter,
      tagNameIsValidated: false,
    };
    $scope.annotationZoneList[newAnnZone.id] = newAnnZone;
    $scope.divCounter += 1;
    //console.log("ADDED ZONE");
    //console.log("DivC after: "+ $scope.divCounter);
    //console.log($scope.annotationZoneList);

    $timeout(function () {

      $scope.$apply();

    });
    return newAnnZone;
  };


  //$scope.annZoneMov = [];
  /*$scope.$watchCollection("storedAnnZones",function(newValue,oldValue){
   console.log($scope.storedAnnZones);
   });*/

  /*$scope.annZoneMov.reposition = function(params) {
   if (params.position) {
   annZoneMov.position = params.position;
   }
   if (params.size) {
   annZoneMov.size = params.size;
   }
   };*/

  $scope.setEditZoneMode = function (id) {
    $rootScope.resetEditAndReplyMode();

    $scope.editZoneMode = id;
    //console.log("setEditZoneMode");
    //console.log(id);

    $scope.annotationZoneList[id].colorBeforeEdit = $scope.annotationZoneList[id].color;
    $rootScope.$broadcast('editZoneModeChanged', $scope.editZoneMode);


    /*      var ele = $('select[name="colorpicker-change-background-color2"]');
     ele.parent().find(".simplecolorpicker").remove();
     ele.parent().css({"margin-left":"0px"});
     ele.remove();


     var nColorPickerEditInput = $('<select/>');
     nColorPickerEditInput.attr("name","colorpicker-change-background-color2");
     nColorPickerEditInput.append('<option value="#ac725e">#ac725e</option>  <option value="#d06b64">#d06b64</option>  <option value="#f83a22">#f83a22</option>  <option value="#fa573c">#fa573c</option>  <option value="#ff7537">#ff7537</option>  <option value="#ffad46">#ffad46</option>  <option value="#42d692">#42d692</option>  <option value="#16a765">#16a765</option>  <option value="#7bd148">#7bd148</option>  <option value="#b3dc6c">#b3dc6c</option>  <option value="#fbe983">#fbe983</option>  <option value="#fad165">#fad165</option>  <option value="#92e1c0">#92e1c0</option>  <option value="#9fe1e7">#9fe1e7</option>  <option value="#9fc6e7">#9fc6e7</option>  <option value="#4986e7">#4986e7</option>  <option value="#9a9cff">#9a9cff</option>  <option value="#b99aff">#b99aff</option>  <option value="#c2c2c2">#c2c2c2</option>  <option value="#cabdbf">#cabdbf</option>  <option value="#cca6ac">#cca6ac</option>  <option value="#f691b2">#f691b2</option><option value="#cd74e6">#cd74e6</option><option value="#a47ae2">#a47ae2</option>');
     nColorPickerEditInput.attr("id", "colorPickerEditInput-" + divCounter);
     nColorPickerEditInput.addClass("slideRectColorPickerEdit");
     nColorPickerEditInput = angular.element($("#annZoneList")).scope().compileMovableAnnotationZone(nColorPickerEditInput);


     $scope.editZoneValues[id].color = color;

     var wrapperElement = $("#slideRectWrapper-"+divCounter);
     wrapperElement.prepend(nColorPickerEditInput);
     wrapperElement.css({"margin-left":"-20px"});

     $("#rect-"+divCounter).hover(function () {
     $(this).stop().fadeTo("fast", "0.75");
     }, function () {
     $(this).stop().fadeTo("fast", "0.75");
     });
     $("#rect-"+divCounter).css('border', ' 1px dashed white');

     $('select[name="colorpicker-change-background-color2"]').simplecolorpicker({picker: true, theme: 'glyphicons'});
     $('select[name="colorpicker-change-background-color2"]').simplecolorpicker("selectColor",color);




     nColorPickerEditInput.on('change', function() {
     $(this).parent().parent().parent().css('background-color', $(this).val());
     $(this).attr("value",$(this).val());
     $scope.editZoneValues[id].color = $(this).val();
     $timeout(function(){
     $scope.$apply();
     });
     });
     */

  };

  $rootScope.resetEditZoneMode = function () {
    //$rootScope.$broadcast('reloadTags');

    var id = $scope.editZoneMode;

    $scope.writeCommentMode = false;
    $scope.replyRawText = [];
    $scope.replyMode = -1;
    $scope.editZoneMode = -1;
    $rootScope.$broadcast('editZoneModeChanged', $scope.editZoneMode);


    /*var ele = $('select[name="colorpicker-change-background-color2"]');
     ele.parent().find(".simplecolorpicker").remove();
     ele.parent().css({"margin-left":"0px"});
     ele.remove();
     */
    if (id != -1) {
      $scope.annotationZoneList[id].editTagNameTemp = $scope.annotationZoneList[id].tagName;
      $scope.annotationZoneList[id].color = $scope.annotationZoneList[id].colorBeforeEdit;

      $timeout(function () {
        $scope.$apply();
      });
    }
  };

  $scope.updateAnnZone = function (id) {

    $scope.annotationZoneList[id].tagName = $scope.annotationZoneList[id].editTagNameTemp;

    var config = {
      params: {
        updateId: $scope.annotationZoneList[id].annZoneId,
        author: $scope.currentUser.username,
        authorId: $scope.currentUser._id,
        updatedAnnZone: {
          annotationZoneName: "#" + $scope.annotationZoneList[id].tagName,
          color: $scope.annotationZoneList[id].color,
          pageNumber: $scope.currentPageNumber

        },
        pdfId: $scope.pdfFile._id,
      }
    };

    //console.log(config);


    $http.post("/slide-viewer/updateAnnZone/", null, config)
      .success(function (data, status, headers, config) {
        $scope.updateScope($scope.commentGetUrl);
        //$scope.savedZones = data.annotationZones;

        if (data.result == false) {
          $rootScope.displayCommentSubmissionResponse(data.error);
        }
        else {
          $rootScope.displayCommentSubmissionResponse("Annotation zone update successful!");

          //TODO: reset everything
        }

        //console.log("updateAnnZoneEv");

        $rootScope.resetEditZoneMode();
        $scope.$emit('reloadTags');

      })
      .error(function (data, status, headers, config) {
        $rootScope.displayCommentSubmissionResponse("Error: Unexpected Server Response!");
      });
  };

  /*$rootScope.removeAllActiveAnnotationZones = function () {
   for(var inputId in $scope.tagNamesList) {
   var element = $("#annotationZone #"+inputId);

   delete angular.element($("#annZoneList")).scope().tagNamesList[inputId];
   angular.element($("#annZoneList")).scope().timeout();

   element.remove();

   delete $rootScope.tagNameErrors[inputId];
   delete $scope.tagNamesList[inputId];

   }
   };*/

  $rootScope.removeAllActiveAnnotationZones = function () {
    for (var inputId in $scope.annotationZoneList)
      if ($scope.annotationZoneList[inputId].isBeingCreated == true)
        delete $scope.annotationZoneList[inputId];


    for (var inputId in $scope.tagNamesList) {

      delete $scope.tagNameErrors[inputId];
      delete $scope.tagNamesList[inputId];

    }
    var ret = $rootScope.annotationSubmitPage;
    $rootScope.annotationZonesOnOtherSlides = JSON.parse(JSON.stringify({}));
    $rootScope.annotationSubmitPage = -1;

    $timeout(function () {
      $scope.$apply();
    });
    return ret;

  };

  /*$rootScope.removeAnnotationZone = function (id) {
   var element = $("#annotationZone #"+id);

   //var annotationInList = $("#annotationZoneSubmitList div").find("[value='"+id+"']");

   var inputId = element.attr("id");

   //delete angular.element($("#annZoneList")).scope().tagNamesList[inputId];
   delete $scope.tagNamesList[inputId];
   $scope.timeout();

   //annotationInList.parent().remove();
   element.remove();

   delete $scope.tagNameErrors[id];
   delete $scope.tagNamesList[id];

   };
   */
  $rootScope.removeAnnotationZone = function (id) {

    delete $scope.annotationZoneList[id];

    delete $scope.tagNamesList[id];


    delete $rootScope.tagNameErrors[id];

    $scope.timeout();

  };

  $scope.refreshTags = function () {
    $scope.refreshTagsWithCallbacks(function () {
    });
  };

  $scope.refreshTagsWithCallbacks = function (callback) {
    $http.get('/slide-viewer/disAnnZones/' + $scope.pdfId + '/' + $scope.currentPageNumber).success(function (data) {
      $scope.annZones = data.annZones;

      //tagListLoaded($scope.annZones);

      $scope.tagListLoaded();

      $timeout(function () {
        $scope.$apply();
      });
      //console.log($scope.annotationZoneList);
      callback();
    });
  };

  $scope.tagListLoaded = function () {
    for (var i = 0; i < $scope.annZones.length; i++) {
      var ele = $scope.annZones[i];
      var isAuthor = (ele.author == angular.element($("#annZoneList")).scope().currentUser.username);
      var isAdmin = angular.element($("#annZoneList")).scope().$root.user.role == "admin";
      var allowedToEdit = (isAdmin || isAuthor);

      if (ele.color[0] != '#')
        ele.color = '#' + ele.color;

      $scope.addAnnotationZone(ele.relPosX, ele.relPosY, ele.relWidth, ele.relHeight, ele.color, ele.name, false, allowedToEdit, ele.id)
    }
  };


  var pdfPageChangeListener = $rootScope.$on('onPdfPageChange', function (e, params) {
    //Find relevant AnnZones
    var nextPageNumber = params[0];

    if ($scope.previousPageNumber != -1) {
      var unfinishedAnnZonesList = [];
      for (var key in $scope.annotationZoneList) {
        if ($scope.annotationZoneList[key].isBeingCreated == true) {
          if ($scope.annotationZoneList[key].tagName[0] != '#')
            $scope.annotationZoneList[key].tagName = '#' + $scope.annotationZoneList[key].tagName;
          unfinishedAnnZonesList.push($scope.annotationZoneList[key]);
        }
      }
      //console.log("PDF PAGE CHANGE");
      //console.log(unfinishedAnnZonesList.length);
      //console.log($scope.previousPageNumber);
      //Store them
      if (unfinishedAnnZonesList.length != 0) {
        $rootScope.annotationZonesOnOtherSlides[$scope.previousPageNumber] = unfinishedAnnZonesList;
        $timeout(function () {
          $scope.$apply();
        });
      }
    }
    $scope.$emit('reloadTagsWCallback', function () {
      //Add previous ones
      if ($scope.previousPageNumber != -1) {
        if (nextPageNumber in $rootScope.annotationZonesOnOtherSlides) {
          //console.log($rootScope.annotationZonesOnOtherSlides[nextPageNumber]);
          for (var key  in $rootScope.annotationZonesOnOtherSlides[nextPageNumber]) {
            var elem = $rootScope.annotationZonesOnOtherSlides[nextPageNumber][key];
            elem.id = 'rect-' + $scope.divCounter;
            if (elem.id in $scope.annotationZoneList) {
              console.log("ERROR: Annzone overwritten, should not occur");
            }
            $scope.annotationZoneList[elem.id] = elem;
            $scope.divCounter += 1;


          }

          //$scope.annotationZoneList.concat($rootScope.annotationZonesOnOtherSlides[nextPageNumber]);
          delete $rootScope.annotationZonesOnOtherSlides[nextPageNumber];
        }
      }
      $scope.previousPageNumber = nextPageNumber;
    });
  });

  $scope.$on('$destroy', pdfPageChangeListener);


  var reloadTagsEventListener = $scope.$on('reloadTags', function (event) {
    $scope.$emit('reloadTagsWCallback', function () {
    });
  });

  var reloadTagsEventListenerWithCallback = $scope.$on('reloadTagsWCallback', function (event, callback) {
    //$(".slideRect").remove();
    //$scope.annotationZoneList = new Array();
    $scope.annotationZoneList = JSON.parse(JSON.stringify({}));
    $scope.divCounter = 0;

    annotationZonesAreLoaded = false;

    toDrawAnnotationZoneData = [];

    $timeout(function () {
      $scope.$apply();
    });

    $scope.refreshTagsWithCallbacks(callback);
  });

  /*TODO:ANGANNZONE
   var reloadTagsEventListener = $scope.$on('reloadTags', function(event) {
   $scope.annotationZoneList = new Array();
   $scope.divCounter = 0;

   annotationZonesAreLoaded = false;

   toDrawAnnotationZoneData = [];
   $scope.refreshTags();
   });
   */


  $scope.$on('$destroy', reloadTagsEventListener);


  $scope.compileMovableAnnotationZone = function (element) {
    return angular.element(
      $injector.get('$compile')(element)($scope)
    );
  };

  //Check if names of new annZones are correct
  $scope.$watch("annotationZoneList", function (newValue, oldValue) {
    if (newValue != oldValue) {
      if (typeof $scope.annotationZoneList != "undefined") {
        for (var key in newValue) {
          var annZone = newValue[key];
          if (annZone.isBeingCreated) {

            var tName = newValue[key].tagName;
            //console.log(newValue[key]);
            var response = $rootScope.checkTagName(tName);
            if (response.length != 0) {
              changeValidationDisplay(key, tName, false, response);
              $scope.annotationZoneList[key].hasErrors = true;
            }
            else {
              changeValidationDisplay(key, tName, true, response);
              $scope.annotationZoneList[key].hasErrors = false;
            }
          }
        }
      }
    }
  }, true);

  $rootScope.checkTagName = function (tagName) {
    if (!(/^[a-zA-Z0-9]*$/.test(tagName))) {
      return "Annotation zone contains illegal characters (only alphanumeric allowed)";
    }
    if (!(tagName.length >= 3)) {
      return "Annotation zone name is too short (>=3 characters)";
    }
    if (!(tagName.length < 10)) {
      return "Annotation zone name is too long (<10 characters)";
    }
    if (inOldTagList(tagName)) {
      return "Annotation zone name is already taken (unique over entire document)";
    }

    return "";
  }

  function inOldTagList(tagName) {
    //console.log($scope.annZones);
    for (var key in $scope.annZones) {
      if ($scope.annZones[key].name == "#" + tagName) {
        return true;
      }
    }
    return false;
  }

  function changeValidationDisplay(key, name, success, text) {
    $scope.annotationZoneList[key].tagNameIsValidated = success;

    if (success) {
      /*$("#"+key).find(".validationIcon").addClass("glyphicon");
       $("#"+key).find(".validationIcon").removeClass("glyphicon-remove-sign");
       $("#"+key).find(".validationIcon").addClass("glyphicon-ok-sign");
       */
      delete $rootScope.tagNameErrors[key];
      $timeout(function () {
        $scope.$apply($rootScope.tagNameErrors);
      });
    }
    else {
      $rootScope.tagNameErrors[key] = {name: name, text: text};

      $timeout(function () {
        $scope.$apply($rootScope.tagNameErrors);
      });
    }
  }

  $rootScope.nameHasNoError = function (name) {

    for (var key in $rootScope.tagNameErrors) {
      if ($rootScope.tagNameErrors[key].name == name.substring(1)) {
        if ($rootScope.tagNameErrors[key].text == "") {
          return true;
        }
        else {
          return false;
        }
      }
    }
    return true;
  };

  $rootScope.deleteCurrentAnnotationZones = function (page, key) {
    $rootScope.annotationZonesOnOtherSlides[page].splice(key, 1);
    if ($rootScope.annotationZonesOnOtherSlides[page].length == 0) {
      //$rootScope.annotationZonesOnOtherSlides.splice(page,1);
    }
  };

  $rootScope.clearTagNameErrors = function () {
    /*for(var key in $scope.tagNameErrors) {
     delete $scope.tagNameErrors[key];
     //console.log($scope.tagNameErrors[key]);
     }*/
    $rootScope.tagNameErrors = JSON.parse(JSON.stringify({}));
    $scope.tagNamesList = JSON.parse(JSON.stringify({}));

    $timeout(function () {
      $scope.$apply($rootScope.tagNameErrors);
    });
  };

  $scope.timeout = function () {
    $timeout(function () {
      $scope.$apply($rootScope.tagNameErrors);
    });
  };


});
;app.controller('CommentListController', function ($scope, $http, $rootScope, $sce, $timeout, ActionBarService) {

  $scope.recentSubmitOnAnnotation = "";
  $scope.comment = {};
  $scope.editRawText = [];
  $scope.editMode = -1;
  $scope.replyRawText = [];
  $scope.replyMode = -1;
  $scope.comments = [];
  $scope.replies = [];
  $scope.orderType = false;
  $scope.orderBy = false;
  $scope.ascending = "true";
  $scope.filters = '{}';
  $scope.filtersRaw = {};
  $scope.currentPageNumber = 1;
  $scope.annotationZones = [];
  $scope.rawSearchTerm = "";
  var baseFilterString = "Currently no filters are active";
  $scope.activeFilterString = baseFilterString;
  /*var visibleString = "visibility: visible;";
   var invisibleString = "visibility: hidden;";
   $scope.removeFiltersVisible = visibleString;
   */
  // zones
  $scope.tagNames = [];
  $scope.tagRelPos = [];
  $scope.tagRelCoord = [];
  $scope.tagColor = [];
  $scope.writeCommentMode = false;
  $scope.decouplePDFAndComments = false;

  var pdfPageChangeListener = $rootScope.$on('onPdfPageChange', function (e, params) {
    $scope.currentPageNumber = params[0];
    $scope.getComment($scope.orderType.id);
  });

  $rootScope.$on('$destroy', pdfPageChangeListener);

  $scope.orderingOptions = [
    //{id: 'dateOfCreation.descending', name: '-- Sort by --', disabled: 'false'},
    {id: 'dateOfCreation.descending', name: 'Newest First'},
    {id: 'dateOfCreation.ascending', name: 'Oldest First'},
    {id: 'author.descending', name: 'Author (descending)'},
    {id: 'author.ascending', name: 'Author (ascending)'}
    //todo: {id: 'relevance', name: 'Relevance'}
  ];

  $scope.orderingOptionsDefault = {id: 'dateOfCreation.descending', name: '-- Sort by --'};

  /*
   $scope.populateAnnotationZone = function () {
   $scope.annotationZones = [];

   // look for zones that are inside wrapper of the annotation zones
   var annotationList = $("#annotationZoneSubmitList div");

   //console.log(annotationList);

   for (var i = 0; i < annotationList.length; i++) {
   //console.log("added tag");
   //TODO: Adapt to next rectangle iteration
   var elementId = $("#annotationZoneSubmitList #rectangleId").eq(i).val();
   var element = $("#" + elementId);
   var relPosX = element.position().left / $('#annotationZone').width();
   var relPosY = element.position().top / $('#annotationZone').height();
   var relWidth = element.width() / $('#annotationZone').width();
   var relHeight = element.height() / $('#annotationZone').height();

   var name = element.find(".slideRectInput").val();
   //console.log("Name found: "+element.find(".slideRectInput").length);
   //var name = $("#annotationZoneSubmitList #annotationZoneSubmitName").eq(i).val();
   var color = element.find(".slideRectColorPicker").val().substring(1);
   //console.log("Color found: "+color);
   //var color = $("#annotationZoneSubmitList #annotationZoneSubmitColor").eq(i).val();

   if (name == "") {
   //console.log("Error encountered while extracting annotation zone during submission.");
   return false;
   }
   else if($rootScope.checkTagName(name) != "") {
   //console.log("TAGNAME NOT ACCEPTABLE");
   return false;
   }
   else {
   $scope.addAnnotationZoneData("#" + name, relPosX, relPosY, relWidth, relHeight, color, $scope.pdfFile._id, $scope.currentPageNumber );
   }
   }

   $scope.comment.tagNames = $scope.tagNames.join(',');
   $scope.comment.tagRelPos = $scope.tagRelPos.join(',');
   $scope.comment.tagRelCoord = $scope.tagRelCoord.join(',');
   $scope.comment.tagColor = $scope.tagColor.join(',');

   //TODO: Check integrity of the input
   //console.log("got here");
   return true;
   };
   */
  $scope.populateAnnotationZone = function () {
    $scope.annotationZones = [];

    var tagNamesList = $rootScope.getTagNamesList();
    var annotationZoneList = $rootScope.getAnnotationZoneList();
    for (var inputId in annotationZoneList) {
      if (annotationZoneList[inputId].isBeingCreated == true) {
        var relPosX = annotationZoneList[inputId].relativePosition.x;
        var relPosY = annotationZoneList[inputId].relativePosition.y;
        var relWidth = annotationZoneList[inputId].relativeSize.x;
        var relHeight = annotationZoneList[inputId].relativeSize.y;
        var name = annotationZoneList[inputId].tagName;
        var color = annotationZoneList[inputId].color;
        var errorText = $rootScope.checkTagName(name);
        if (annotationZoneList[inputId].hasErrors) {
          return "The annotation zone with name " + name + " has errors and could not be submitted.";
        }
        else {
          $scope.addAnnotationZoneData("#" + name, relPosX, relPosY, relWidth, relHeight, color, $scope.pdfFile._id, $scope.currentPageNumber);
        }
      }
    }

    for (var page in $rootScope.annotationZonesOnOtherSlides) {
      for (var annZoneKey in $rootScope.annotationZonesOnOtherSlides[page]) {
        var annZone = $rootScope.annotationZonesOnOtherSlides[page][annZoneKey];
        var relPosX = annZone.relativePosition.x;
        var relPosY = annZone.relativePosition.y;
        var relWidth = annZone.relativeSize.x;
        var relHeight = annZone.relativeSize.y;
        var name = annZone.tagName;
        var color = annZone.color;
        //var errorText = $rootScope.checkTagName(name);
        if (annZone.hasErrors == true) {
          return "An annotation zone on page " + page + " and name " + name + " has errors and prevents submission";
        }
        else {
          $scope.addAnnotationZoneData(name, relPosX, relPosY, relWidth, relHeight, color, $scope.pdfFile._id, page);
        }
      }
    }

    /*$scope.comment.tagNames = $scope.tagNames.join(',');
     $scope.comment.tagRelPos = $scope.tagRelPos.join(',');
     $scope.comment.tagRelCoord = $scope.tagRelCoord.join(',');
     $scope.comment.tagColor = $scope.tagColor.join(',');
     */
    return "";
  };


  $scope.addAnnotationZoneData = function (name, relPosX, relPosY, relWidth, relHeight, color, pdfId, pdfPageNumber) {
    $scope.tagNames.push(name);
    $scope.tagRelPos.push(relPosX + ";" + relPosY);
    $scope.tagRelCoord.push(relWidth + ";" + relHeight);
    $scope.tagColor.push(color);

    var zone = {
      annotationZoneName: name,
      relativeCoordinates: {X: relPosX, Y: relPosY},
      relativeDimensions: {X: relWidth, Y: relHeight},
      color: color,
      pdfId: pdfId,
      pdfPageNumber: pdfPageNumber,
      author: $scope.currentUser.username,
      authorID: $scope.currentUser._id
    };

    /*var oldText;
     oldText = $("#tagNames").val();
     if (oldText.length != 0) {
     oldText = oldText + ",";
     }

     $("#tagNames").val(oldText + "" + name);
     oldText = $("#tagRelPos").val();
     if (oldText.length != 0) {
     oldText = oldText + ",";
     }
     $("#tagRelPos").val(oldText + "" + relPosX + ";" + relPosY);
     oldText = $("#tagRelCoord").val();
     if (oldText.length != 0) {
     oldText = oldText + ",";
     }
     $("#tagRelCoord").val(oldText + "" + relWidth + ";" + relHeight);
     oldText = $("#tagColor").val();
     if (oldText.length != 0) {
     oldText = oldText + ",";
     }
     $("#tagColor").val(oldText + "" + color);*/

    $scope.annotationZones.push(zone);
    //$scope.annotationZones[$scope.annotationZones.length]=zone;

  };

  $scope.submitReply = function (id) {
    var config = {
      params: {
        rawText: $scope.replyRawText[id],
        author: $scope.currentUser.username,
        authorID: $scope.currentUser._id,
        authorDisplayName: $scope.currentUser.displayName,
        pageNumber: $scope.currentPageNumber,
        numOfAnnotationZones: 0,
        pdfId: $scope.pdfFile._id,
        hasParent: true,
        parentId: id
      }
    };

    $http.post("/slide-viewer/submitComment/", null, config)
      .success(function (data, status, headers, config) {
        $scope.updateScope($scope.commentGetUrl);
        //$scope.savedZones = data.annotationZones;
        if (data.result == false) {
          displayCommentSubmissionResponse(data.error);
        }
        else {
          displayCommentSubmissionResponse("Comment submission successful!");
          //TODO: reset everything
        }
        //console.log("commReplyEv");
        $scope.recentSubmitOnAnnotation = id;
        //console.log("Recent: "+ $scope.recentSubmitOnAnnotation);
        $rootScope.$broadcast('reloadTags');
        $scope.writeCommentMode = false;
        $scope.replyRawText = [];
        $scope.replyMode = -1;
      })
      .error(function (data, status, headers, config) {
        displayCommentSubmissionResponse("Error: Unexpected Server Response!");
      });
  };

  $scope.deleteCommentById = function (id) {
    //console.log(id);
    var config = {
      params: {
        deleteId: id,
        author: $scope.currentUser.username,
        authorId: $scope.currentUser._id
      }
    };

    $http.post("/slide-viewer/deleteComment/", null, config)
      .success(function (data, status, headers, config) {
        $scope.updateScope($scope.commentGetUrl);
        //$scope.savedZones = data.annotationZones;
        if (data.result == false) {
          displayCommentSubmissionResponse(data.error);
        }
        else {
          displayCommentSubmissionResponse("Comment deletion successful!");
        }
        //console.log("commDeleteEv");
        $rootScope.$broadcast('reloadTags');
      })
      .error(function (data, status, headers, config) {
        displayCommentSubmissionResponse("Error: Unexpected Server Response!");
      });
  };

  $scope.submitComment = function (resultVarName) {
    var annZoneCheckResult = $scope.populateAnnotationZone();
    if (annZoneCheckResult != "") {
      displayCommentSubmissionResponse("Client Error: Some annotation zones are invalid: " + annZoneCheckResult);
      return false;
    }
    $rootScope.clearTagNameErrors();
    var submitPage = ($rootScope.annotationSubmitPage != -1) ? $rootScope.annotationSubmitPage : $scope.currentPageNumber;
    var annTextWOWhitespace = $scope.comment.rawText.replace(/&nbsp;/gi, '');
    annTextWOWhitespace = annTextWOWhitespace.replace(/<[a-zA-Z]+>/gi, '');
    annTextWOWhitespace = annTextWOWhitespace.replace(/<\/[a-zA-Z]+>/gi, '');
    annTextWOWhitespace = $.trim(annTextWOWhitespace);

    if (annTextWOWhitespace == "") {
      displayCommentSubmissionResponse("Client Error: Your annotation was not submitted, since it does not contain any text yet.");
      return false;
    }

    var config = {
      params: {
        rawText: $scope.comment.rawText,
        author: $scope.currentUser.username,
        authorID: $scope.currentUser._id,
        authorDisplayName: $scope.currentUser.displayName,
        pageNumber: $rootScope.annotationSubmitPage,
        tagNames: $scope.comment.tagNames,
        tagRelPos: $scope.comment.tagRelPos,
        tagRelCoord: $scope.comment.tagRelCoord,
        tagColor: $scope.comment.tagColor,
        annotationZones: $scope.annotationZones,
        numOfAnnotationZones: $scope.annotationZones.length,
        pdfId: $scope.pdfFile._id,
        hasParent: false,
        isPrivate: $scope.comment.isPrivate
      }
    };

    $http.post("/slide-viewer/submitComment/", null, config)
      .success(function (data, status, headers, config) {
        $scope.updateScope($scope.commentGetUrl);
        //$scope.savedZones = data.annotationZones;

        if (data.result == false) {
          displayCommentSubmissionResponse(data.error);
        }
        else {
          displayCommentSubmissionResponse("Comment submission successful!");

          $scope.comment.rawText = '';
          $scope.setQuillSelection();
          $scope.comment.tagNames = '';
          $scope.comment.tagRelPos = '';
          $scope.comment.tagRelCoord = '';
          $scope.comment.tagColor = '';

          $("#annotationZoneSubmitList div").remove();
        }
        //console.log("commSubmitEv");
        $rootScope.$broadcast('reloadTags');

        $scope.writeCommentMode = false;
      })
      .error(function (data, status, headers, config) {
        displayCommentSubmissionResponse("Error: Unexpected Server Response!");
      });
  };


  $scope.submitEdit = function (comment) {

    var config = {
      params: {
        updateId: comment._id,
        author: $scope.currentUser.username,
        authorId: $scope.currentUser._id,
        authorDisplayName: $scope.currentUser.displayName,
        rawText: $scope.editRawText[$scope.editMode],
        pageNumber: $scope.currentPageNumber,
        pdfId: $scope.pdfFile._id,
        isPrivate: comment.isPrivate
      }
    };

    $http.post("/slide-viewer/updateComment/", null, config)
      .success(function (data, status, headers, config) {
        $scope.updateScope($scope.commentGetUrl);
        //$scope.savedZones = data.annotationZones;

        if (data.result == false) {
          displayCommentSubmissionResponse(data.error);
        }
        else {
          displayCommentSubmissionResponse("Comment edit successful!");

          $scope.comment.rawText = '';
          $scope.setQuillSelection();
        }
        //console.log("commEditEv");
        $rootScope.$broadcast('reloadTags');

        $scope.writeCommentMode = false;
      })
      .error(function (data, status, headers, config) {
        displayCommentSubmissionResponse("Error: Unexpected Server Response!");
      });
  };

  $rootScope.isInWriteCommentMode = function () {
    return $scope.writeCommentMode;
  };

  $scope.setQuillSelection = function () {
    for (var i = 0; i < Quill.editors.length; i++) {
      if (Quill.editors[i].quillId == '#rawText') {
        Quill.editors[i].setSelection(0, 0);
      }
    }
  };

  function displayCommentSubmissionResponse(text) {
    var label = $("#commentSubmissionResponse");
    label.text(text);
    label.show();
    label.fadeOut(5000);
    //label.animate({opacity:0.0},5000);
  };

  $scope.currentUser = "";
  $rootScope.$watch('user', function () {
    if ($rootScope.user) {
      $scope.currentUser = $rootScope.user;
    }
  });

  $rootScope.displayCommentSubmissionResponse = function (text) {
    displayCommentSubmissionResponse(text);
  };

  //$scope.pageFilter;
  $scope.commentGetUrl = '/slide-viewer/disComm/{"type":"' + $scope.orderBy + '","ascending":"' + $scope.ascending + '"}/' + $scope.filters;
  $scope.setRegexFilter = function (value) {
    if (typeof $scope.filtersRaw['rawText'] == 'undefined') {
      $scope.filtersRaw['rawText'] = {'regex': value};
    }
    else
      $scope.filtersRaw['rawText'].regex = value;
    $scope.$broadcast('onFiltersRawChange');
  };

  $scope.switchRegexHashFilter = function (value) {
    //console.log("switchRegexHashFilter CALLED");
    if (typeof $scope.filtersRaw['renderedText'] == 'undefined')
      $scope.filtersRaw['renderedText'] = {'regex_hash': value.substring(1)};
    else if ($scope.filtersRaw['renderedText'].regex_hash != value.substring(1))
      $scope.filtersRaw['renderedText'].regex_hash = value.substring(1);
    else
      delete $scope.filtersRaw['renderedText'];
    //console.log($scope.filtersRaw);

    $scope.$broadcast('onFiltersRawChange');
  };

  $scope.authorLabelClick = function (authorName) {
    //console.log("AUTHORLABELCLICK CALLED");
    if ($scope.filtersRaw['author'] == authorName)
      delete $scope.filtersRaw['author'];
    else
      $scope.filtersRaw['author'] = authorName;

    $scope.$broadcast('onFiltersRawChange');
  };

  $scope.$on('onFiltersRawChange', function () {
    var temp = "You are currently filtering for posts";
    var add = "";
    if (typeof $scope.filtersRaw['author'] != 'undefined' && $scope.filtersRaw['author'] != "")
      add += " authored by '" + $scope.filtersRaw['author'] + "'";
    if (typeof $scope.filtersRaw['renderedText'] != 'undefined')
      if (typeof $scope.filtersRaw['renderedText'].regex_hash != 'undefined' && $scope.filtersRaw['renderedText'].regex_hash != "")
        add += " referencing the annotation zone '" + $scope.filtersRaw['renderedText'].regex_hash + "'";
    /*if(typeof $scope.filtersRaw['rawText'] != 'undefined')
     if ( $scope.filtersRaw['rawText'].regex != 'undefined' && $scope.filtersRaw['rawText'].regex != "")
     temp += " containing the term '" + $scope.filtersRaw['renderedText'].regex_hash + "'";
     */
    if (add.length == 0) {
      $scope.activeFilterString = baseFilterString;
      //$scope.removeFiltersVisible = invisibleString;

    }
    else {
      $scope.activeFilterString = temp + add;
      //$scope.removeFiltersVisible = visibleString;

    }

    $timeout(function () {
      $scope.$apply();
      $scope.commentsLoaded();
    });

  });

  $scope.removeActiveFilters = function () {
    if (typeof $scope.filtersRaw['author'] != 'undefined' && $scope.filtersRaw['author'] != "")
      delete $scope.filtersRaw['author'];
    if (typeof $scope.filtersRaw['renderedText'] != 'undefined')
      delete $scope.filtersRaw['renderedText'];
    $scope.$broadcast('onFiltersRawChange');
  };

  //TODO:ANGANNZONE
  $scope.commentsLoaded = function () {
    var element = $("#commentList .annotationZoneReference").not('.hasOnClick');
    if ($("#commentList .annotationZoneReference").not('.hasOnClick').length != 0) {
      //console.log("ADDED CLICK FUNCTION");
      //console.log($("#commentList .annotationZoneReference").length);
      $("#commentList .annotationZoneReference").not('.hasOnClick').click(function () {
        //console.log("switchRegexHashFilter CALLED");
        $scope.switchRegexHashFilter($(this).html());
      });

      $("#commentList .annotationZoneReference").not('.hasOnClick').addClass("hasOnClick");

      element.hover(function () {
        var rectId = $(this).html();
        $("#annotationZone [data-tagName='" + rectId + "']").stop().fadeTo("fast", opacityFactorHighlight);
        //$(this).find(".slideRectSpan").stop().fadeTo("fast",1.0); //can be deleted because parent inherit its opacity
      }, function () {
        var rectId = $(this).html();
        $("#annotationZone [data-tagName='" + rectId + "']").stop().fadeTo("fast", opacityFactor);
        //$(this).find(".slideRectSpan").stop().fadeTo("fast",opacityFactor);//can be deleted because parent inherit its opacity
      });

    }
  };

  $scope.changeEditMode = function (id, bool) {
    //$scope.finalEditRawText = "";
    $scope.editRawText = [];
    if (bool) {
      $scope.editMode = id;
      $scope.replyMode = -1;
      $scope.writeCommentMode = false;
      $rootScope.resetEditZoneMode();
    }
    else if ($scope.editMode == id) {
      $scope.editMode = -1;
    }
  };

  $rootScope.resetEditAndReplyMode = function () {
    $scope.editMode = -1;
    $scope.replyMode = -1;
    $scope.writeCommentMode = false;

  };

  $scope.changeReplyMode = function (id, bool) {
    //$scope.finalEditRawText = "";
    $scope.replyRawText = [];
    if (bool) {
      $scope.replyMode = id;
      $scope.editMode = -1;
      $scope.writeCommentMode = false;
      $rootScope.resetEditZoneMode();
    }
    else if ($scope.replyMode == id) {
      $scope.replyMode = -1;
    }
  };

  $scope.showPersonal = false;

  $scope.$on('showPersonalPdfAnnotations', function (event, value) {
    $scope.showPersonal = value;
  });

  $scope.updateScope = function (url) {
    $http.get(url).success(function (data) {
      //console.log('COMMENTS UPDATED');
      //console.log("url: " + url);
      $scope.editMode = -1;
      /*for (var i in $scope.comments) {
       var cmnt = $scope.comments[i];
       //cmnt.html = $sce.trustAsHtml(cmnt.html);
       }*/
      $scope.comments = [];
      $scope.replies = [];

      for (var item in data.comments) {
        if (data.comments[item].hasParent == false) {
          //data.comments[item].isAuthor = true;
          $scope.comments.push(data.comments[item]);
        }
        else if (data.comments[item].hasParent == true) {
          if (typeof $scope.replies[data.comments[item].parentId] == 'undefined') {
            $scope.replies[data.comments[item].parentId] = [];
          }
          //console.log($scope.currentUser.username);
          //console.log(data.comments[item].author);
          data.comments[item].isAuthor = (data.comments[item].author == $scope.currentUser.username);
          $scope.replies[data.comments[item].parentId].push(data.comments[item]);
        }
      }

      //$scope.comments = data.comments;


      $timeout(function () {
        $scope.$apply();
        $scope.commentsLoaded();
      });

    });
  };

  function getCurrentFilters() {
    /*
     refactored by using array of filtersRaw. will be converted with JSON.stringify.
     regex_has and regex is replaced by using scope.switchregex... function

     var finalFilters;

     var filterStrings = $scope.filtersRaw.split(';');
     //console.log("FOUND RAW FILTERS: " + $scope.filtersRaw);
     finalFilters = '{';
     if(filterStrings.length >= 1) if(filterStrings[0]!=""){

     for(var i=0; i < filterStrings.length; i++){
     //console.log("APPLIED A FILTER");
     var temp = filterStrings[i].split(',');
     if(temp.length != 1)
     finalFilters = finalFilters + '"' + temp[0] + '":"' + temp[1] + '"';
     else
     {
     temp = filterStrings[i].split(':');
     if(typeof temp[1] != 'undefined') {
     if(temp[1].charAt(0) == "#")
     finalFilters = finalFilters + '"' + temp[0] + '":{"regex_hash": "' + temp[1].substring(1) + '"}';
     else {
     finalFilters = finalFilters + '"' + temp[0] + '":{"regex": "' + temp[1].substring(1) + '"}';
     }
     }
     }


     //if(i != filterStrings.length-1)
     finalFilters = finalFilters + ',';
     }
     }*/

    if (!isNaN($scope.internalPageNumber)) {
      $scope.filtersRaw['pdfPageNumber'] = $scope.internalPageNumber;
    }
    else {
      return null;
    }
    if (!(typeof ($scope.pdfFile._id) == "undefined")) {
      $scope.filtersRaw['pdfId'] = $scope.pdfFile._id;
    }
    else {
      return null;
    }


    //console.log($scope.filtersRaw);
    var finalFilters = JSON.stringify($scope.filtersRaw);

    //console.log("Final Filters: " + finalFilters);
    return finalFilters;
  }

  $scope.parseOrderType = function (orderType) {
    var orderSplit = orderType.split('.');
    $scope.orderBy = orderSplit[0];
    if (orderSplit[1]) {
      $scope.ascending = (orderSplit[1] == 'ascending') ? true : false;
    } else
      $scope.ascending = false;
  };

  $scope.getComment = function (orderType) {
    $scope.parseOrderType(orderType);

    $scope.filters = getCurrentFilters($scope.filtersRaw);
    if ($scope.filters != null) {
      $scope.commentGetUrl = '/slide-viewer/disComm/{"type":"' + $scope.orderBy + '","ascending":"' + $scope.ascending + '"}/' + $scope.filters;
      //console.log("commentGetUrl: " + $scope.commentGetUrl);
      $scope.updateScope($scope.commentGetUrl);
    }
  };

  $scope.manageActionBar = function () {
    if ($scope.currentTab == 'pdf') {

      //commented because we want to use own toolbar
      /*  ActionBarService.extraActionsMenu.push({
       clickAction: $scope.switchCommentSubmissionDisplay,
       title: '<i class="ionicons ion-edit"></i> &nbsp;ADD COMMENT',
       aTitle: 'Write a comment on this slide'
       });*/
    }
  };

  $scope.init = function () {
    //$scope.getComment($scope.orderingOptions[0].id); // commented, because it will get called once pdf get loaded
  };

  $scope.$watch("orderType", function (newValue, oldValue) {
    if (newValue !== oldValue) {
      $scope.orderType = newValue;
      $scope.getComment(newValue.id);
    }
  });

  /*$scope.$watch("filtersRaw", function (newValue, oldValue) {
   if (newValue !== oldValue) {
   $scope.parseOrderType($scope.orderType.id);
   //console.log("NOTICED FILTERS CHANGE");
   $scope.filters = getCurrentFilters($scope.filtersRaw);
   $scope.commentGetUrl = '/slide-viewer/disComm/{"type":"' + $scope.orderBy + '","ascending":"' + $scope.ascending + '"}/' + $scope.filters;
   //console.log("commentGetUrl: " + $scope.commentGetUrl);
   $scope.updateScope($scope.commentGetUrl);
   }
   });*/

  $scope.$on('onFiltersRawChange', function () {
    $scope.parseOrderType($scope.orderType.id);
    //console.log("NOTICED FILTERS CHANGE");
    $scope.filters = getCurrentFilters($scope.filtersRaw);
    if ($scope.filters != null) {
      $scope.commentGetUrl = '/slide-viewer/disComm/{"type":"' + $scope.orderBy + '","ascending":"' + $scope.ascending + '"}/' + $scope.filters;
      //console.log("commentGetUrl: " + $scope.commentGetUrl);
      $scope.updateScope($scope.commentGetUrl);
    }
  });

  $scope.$watch("currentPageNumber", function (newValue, oldValue) {
    if (!$scope.decouplePDFAndComments) {
      $scope.internalPageNumber = newValue;
      $timeout(function () {
        $scope.$apply();
      });
    }
  });

  $scope.$watch("internalPageNumber", function (newValue, oldValue) {
    if (newValue !== oldValue) {
      $scope.parseOrderType($scope.orderType.id);
      $scope.filters = getCurrentFilters($scope.filtersRaw);
      if ($scope.filters != null) {
        $scope.commentGetUrl = '/slide-viewer/disComm/{"type":"' + $scope.orderBy + '","ascending":"' + $scope.ascending + '"}/' + $scope.filters;
        //console.log("commentGetUrl: " + $scope.commentGetUrl);
        $scope.updateScope($scope.commentGetUrl);
      }
    }
  });

  $scope.$watch("rawSearchTerm", function (newValue, oldValue) {
    if (newValue != oldValue) {
      $scope.setRegexFilter(newValue);
    }
  });

  $scope.$watch("writeCommentMode", function (newValue, oldValue) {
    if (newValue == true) {
      $scope.editMode = -1;
      $scope.replyMode = -1;
      $rootScope.annotationSubmitPage = $scope.currentPageNumber;
      $rootScope.resetEditZoneMode();
      $scope.decouplePDFAndComments = true;
    }
    else if (newValue == false) {
      var gotoPage = $rootScope.removeAllActiveAnnotationZones();
      $scope.comment.rawText = "";
      $scope.decouplePDFAndComments = false;
      if (gotoPage != -1)
        $rootScope.setPageNumber(parseInt(gotoPage));

    }
  });

  $scope.annotationZoneAction = function () {
    // in slideviewer.js
    $rootScope.switchShowAnnoZones = "On"
    //createMovableAnnZone();
    //TODO:ANGANNZONE
    $rootScope.createMovableAnnZone();
  };

  $scope.switchCommentSubmissionDisplay = function () {
    $scope.comment.isPrivate = false;
    $scope.comment.rawText = "";
    $scope.writeCommentMode = true;
  };

  $scope.$on('onAfterInitTreeNode', function (event, treeNode) {
    /**
     * get comments on page load
     */
    $scope.init();

    /**
     * add some action to the menu
     */
    $scope.manageActionBar();
  });

  $scope.$on('$routeUpdate', function () {
    $scope.manageActionBar();
  });

  /*
   $scope.addReference = function(name) {
   //$rootScope.safeApply(function() {
   if($rootScope.nameHasNoError(name)){
   if(name !="#")
   if($scope.writeCommentMode) {
   if(typeof $scope.comment.rawText == 'undefined')
   $scope.comment.rawText = name + ' ';
   else {
   var len = $scope.comment.rawText.length;
   var firstPart = $scope.comment.rawText.substring(0,len-6);
   var lastPart = $scope.comment.rawText.substring(len-6);
   $scope.comment.rawText = firstPart + ' ' + name + ' ' + lastPart;
   }
   }
   else if($scope.editMode != -1){
   if(typeof $scope.editRawText[$scope.editMode] == 'undefined')
   $scope.editRawText[$scope.editMode] = name + ' ';
   else {
   var len = $scope.editRawText[$scope.editMode].length;
   var firstPart = $scope.editRawText[$scope.editMode].substring(0,len-6);
   var lastPart = $scope.editRawText[$scope.editMode].substring(len-6);
   $scope.editRawText[$scope.editMode] = firstPart + ' ' + name + ' ' + lastPart;
   }
   }
   else if($scope.replyMode != -1){
   if(typeof $scope.replyRawText[$scope.replyMode] == 'undefined')
   $scope.replyRawText[$scope.replyMode] = name + ' ';
   else {
   var len = $scope.replyRawText[$scope.replyMode].length;
   var firstPart = $scope.replyRawText[$scope.replyMode].substring(0,len-6);
   var lastPart = $scope.replyRawText[$scope.replyMode].substring(len-6);
   $scope.replyRawText[$scope.replyMode] = firstPart + ' ' + name + ' ' + lastPart;
   }
   }

   $timeout(function () {
   $scope.$apply();
   $scope.commentsLoaded();
   });
   }
   };
   */
  $rootScope.addReference = function (id) {
    var annZoneList = $rootScope.getAnnotationZoneList();
    var name = "#" + annZoneList[id].tagName;

    //$rootScope.safeApply(function() {
    if ($rootScope.nameHasNoError(name)) {
      if (name != "#") {
        if ($rootScope.annotationSubmitPage != -1 &&
          $rootScope.annotationSubmitPage != $scope.currentPageNumber) {
          name += "@p" + $scope.currentPageNumber;
        }

        if ($scope.writeCommentMode) {
          if (typeof $scope.comment.rawText == 'undefined')
            $scope.comment.rawText = name + ' ';
          else {
            var len = $scope.comment.rawText.length;
            var firstPart = $scope.comment.rawText.substring(0, len - 6);
            var lastPart = $scope.comment.rawText.substring(len - 6);
            $scope.comment.rawText = firstPart + ' ' + name + ' ' + lastPart;
          }
        }
        else if ($scope.editMode != -1) {
          if (typeof $scope.editRawText[$scope.editMode] == 'undefined')
            $scope.editRawText[$scope.editMode] = name + ' ';
          else {
            var len = $scope.editRawText[$scope.editMode].length;
            var firstPart = $scope.editRawText[$scope.editMode].substring(0, len - 6);
            var lastPart = $scope.editRawText[$scope.editMode].substring(len - 6);
            $scope.editRawText[$scope.editMode] = firstPart + ' ' + name + ' ' + lastPart;
          }
        }
        else if ($scope.replyMode != -1) {
          if (typeof $scope.replyRawText[$scope.replyMode] == 'undefined')
            $scope.replyRawText[$scope.replyMode] = name + ' ';
          else {
            var len = $scope.replyRawText[$scope.replyMode].length;
            var firstPart = $scope.replyRawText[$scope.replyMode].substring(0, len - 6);
            var lastPart = $scope.replyRawText[$scope.replyMode].substring(len - 6);
            $scope.replyRawText[$scope.replyMode] = firstPart + ' ' + name + ' ' + lastPart;
          }
        }
      }

      $timeout(function () {
        $scope.$apply();
        $scope.commentsLoaded();
      });
    }
  };

  $scope.setEditRawText = function (id, newText) {
    $scope.editRawText[id] = strip(newText);
    $timeout(function () {
      $scope.$apply();
    });
  };

  $scope.setReplyRawText = function (id, newText) {
    $scope.replyRawText[id] = newText;
    $timeout(function () {
      $scope.$apply();
    });
  };

  function strip(html) {
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  /*$scope.$watch("editRawText", function (newValue, oldValue) {
   console.log("REGISTERED CHANGE");
   });*/

  $rootScope.safeApply = function (fn) {
    var phase = this.$root.$$phase;
    if (phase == '$apply' || phase == '$digest') {
      if (fn && (typeof(fn) === 'function')) {
        fn();
      }
    } else {
      this.$apply(fn);
    }
  };

  $scope.removeFilterRawField = function (id) {
    delete $scope.filtersRaw[id];
    $scope.$broadcast('onFiltersRawChange');
  };
});;app.controller('PeerAssessmentController', function($scope, $http, courseService, toastr, $window, Upload, $location, ActionBarService) {
    $scope.course = null;
    $scope.peerreviews = null;
    $scope.vName = null;

    $scope.extraActionsMenu = [];

    $scope.$watch(function(){
            return ActionBarService.extraActionsMenu;
        },
        function (newValue) {
            $scope.extraActionsMenu = ActionBarService.extraActionsMenu;
        });

    $scope.tabOpened = function() {
        if (courseService.course) {
            $scope.course = courseService.course;

            $scope.initTab(courseService.course._id);
        } else {
            $scope.$on('onAfterInitCourse', function (e, course) {
                $scope.course = course;
                $scope.initTab(course._id);
            });
        }
    }

    $scope.initTab = function (courseId) {

        var url = '/api/peerassessment/' + courseId + '/peerreviews';
        $http.get(url).then( function(response) {
            _.each(response.data.peerreviews, function(review) {
                review.publicationDate = new Date(review.publicationDate);
                review.dueDate = new Date(review.dueDate);
                // check if they are needed
                //review.solutionPublicationDate = new Date(review.solutionPublicationDate);
                //review.ssPublicationDate = review.solutionPublicationDate;
                //delete review.solutionPublicationDate;
                //review.reviewDescription = review.description;
                //delete review.description;
            });
            $scope.peerreviews = response.data.peerreviews;
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        });

        $scope.initiateView();
    }

    // Reviews Assignment
    $scope.reviewAssignment = function(peerReviewId) {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=reviewAssignment&vId=' + peerReviewId;
    }

    // Peer Reviews
    $scope.openDeleteConfirmationModal = function(reviewDocId, event) {
        if(event) {
            event.stopPropagation();
        }
        $scope.deleteReviewId = reviewDocId;
        $('#confirmDeleteAssignmentModal').modal('show');
    }

    $scope.deletePeerReview = function(reviewId) {
        var url = '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + reviewId;

        $http.delete(url).then( function(response) {
            for( var i=0; i<$scope.peerreviews.length; i++) {
                if($scope.peerreviews[i]._id == reviewId) {
                    break;
                }
            }
            $scope.peerreviews.splice(i,1);
            if($scope.vName || $scope.vId) {
                $scope.redirectPRHome();
            }
        }, function(err) {
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        });

        $('#confirmDeleteAssignmentModal').modal('hide');
    }

    $scope.goBack = function() {
        window.history.back();
    }

    $scope.editPeerReview = function(review, event) {
        if(event) {
            event.stopPropagation();
        }
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=editPeerReview&vId=' + review._id;
    }

    $scope.viewPeerReview = function(peerReviewId) {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=viewPeerReview&vId=' + peerReviewId;
    }

    $scope.newPeerReview = function() {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=newPeerReview';
    }

    // Solutions
    $scope.openAddEditSolutionModal = function(paramsObj) {
        console.log('review', paramsObj);
        var config = {};
        // Check if we are coming from solution List
        if(paramsObj.path == 'solutionList') {
            config.method = 'GET'
            config.url = '/api/peerassessment/' + $scope.course._id + '/solutions/' + paramsObj._id;
        } else {
            config.method = 'POST';
            config.url = '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + paramsObj._id + '/solutions';
            // Check whether this is needed ?
            config.params = {
                reviewTitle: paramsObj.title
            }
        }

        $http(config).then(function(response) {
            console.log('response', response);
            if (response.data.result) {
                $scope.solutionObj = response.data.solution;
                if (paramsObj.path !== 'solutionList') {
                    $scope.solutionObj.peerReviewTitle = response.data.title;
                }

                if ($scope.solutionObj && $scope.solutionObj.solutionDocuments && $scope.solutionObj.solutionDocuments.length > 0) {
                    $scope.solutionObj.displayDocumentsList = [];
                    _.each($scope.solutionObj.solutionDocuments, function (docName) {
                        var temp = {};
                        temp.link = window.location.origin + docName;
                        var tempArr = docName.split('/');
                        temp.name = tempArr[tempArr.length - 1];
                        $scope.solutionObj.displayDocumentsList.push(temp);
                    })
                }

                $('#addEditSolutionModal').modal('show');
            } else {
                toastr.warning('Deadline has been passed. Unable to upload the solution');
            }
        }, function(err) {
            console.log('err', err);
        })
    }

    $scope.giveFeedback = function(solutionId) {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=giveFeedback&vId=' + solutionId;
    }

    // Was used in adminfeeback which has now been changed so its not needed any more but still verify
    $scope.viewSolution = function(solutionId) {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=viewSolution&vId=' + solutionId;
    }

    $scope.viewAllSolutions = function() {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=viewSolutionsList';
    }

    $scope.viewReviewsList = function() {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=viewReviewsList';
    }

    $scope.openDeleteSolutionConfirmationModal = function(solutionId, event) {
        if(event) {
            event.stopPropagation();
        }
        $scope.deleteSolutionId = solutionId;
        $('#confirmDeleteSolutionModal').modal('show');
    }

    $scope.manageRubrics = function() {
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=manageRubrics';
    }

    $scope.openRubric = function() {
        $('#addEditRubricModal').modal('show');
    }

    // Home
    $scope.redirectPRHome = function() {
        $scope.vName = false;
        $scope.vId = false;
        $location.search('vName', '');
        $location.search('vId', '');
        // window.location.reload();
    }

    $scope.$on('$routeUpdate', function () {
        $scope.initiateView();

        if (!$scope.vName) {
            $('li.peerAssessmentTitle').remove();
            $scope.tabOpened();
            //var te = $('a.discussionTabLink').text();
            //$('.action-header .breadcrumb li.tab').html(te);
        }
    });

    $scope.initiateView = function() {
        $scope.vName = $location.search().vName;
        if($scope.vName) {
            if($scope.vName == 'viewPeerReview') {
                $scope.currentView = 'viewAssignment.tpl';
                $scope.manageBreadCrumb('View Peer Review');
            } else if($scope.vName == 'viewSolutionsList') {
                $scope.currentView = 'seeAllSolutions.tpl';
                $scope.manageBreadCrumb('See All Solutions');
            } else if($scope.vName == 'viewSolution') {
                $scope.currentView = 'viewSolution.tpl';
                $scope.manageBreadCrumb('View Solution');
            } else if($scope.vName == 'newPeerReview') {
                $scope.currentView = 'addNewAssignment.tpl'
                $scope.manageBreadCrumb('New Peer Review');
            } else if($scope.vName == 'editPeerReview') {
                $scope.currentView = 'editAssignment.tpl'
                $scope.manageBreadCrumb('Edit Peer Review');
            } else if($scope.vName == 'reviewAssignment') {
                $scope.currentView = 'reviewAssignment.tpl'
                $scope.manageBreadCrumb('Assign Reviews');
            } else if($scope.vName == 'viewReviewsList') {
                $scope.currentView = 'reviewList.tpl'
                $scope.manageBreadCrumb('See All Reviews');
            } else if($scope.vName == 'manageRubrics') {
                $scope.currentView = 'manageRubrics.tpl'
                $scope.manageBreadCrumb('Manage Rubrics');
            } else if($scope.vName == 'reviewSubmission') {
                $scope.currentView = 'reviewSubmission.tpl'
                $scope.manageBreadCrumb('Submit Review');
            } else if($scope.vName == 'giveFeedback') {
                $scope.currentView = 'adminFeedback.tpl'
                $scope.manageBreadCrumb('Feedback')
            }  else if($scope.vName == 'viewFeedback') {
                $scope.currentView = 'viewFeedback.tpl'
                $scope.manageBreadCrumb('View Feedback')
            }
        } else {
            $scope.currentView = 'main.tpl';
            ActionBarService.extraActionsMenu = [];
            if($scope.isAdmin || $scope.isManager || $scope.isOwner) {
                ActionBarService.extraActionsMenu.push(
                    //{
                    //    'html': '<a style="cursor: pointer;"' +
                    //    ' data-toggle="modal" data-target="#addNewAssignmentModal"' +
                    //    ' title="New Peer Review">' +
                    //    '&nbsp;&nbsp; <i class="ionicons ion-android-add"></i> &nbsp; NEW PEER REVIEW</a>'
                    //},
                    {
                        clickAction: $scope.newPeerReview,
                        title: '&nbsp;&nbsp; <i class="ionicons ion-android-add"></i> &nbsp; NEW PEER REVIEW',
                        aTitle: 'New Peer Review'
                    },
                    {
                        separator: true
                    },
                    {
                        clickAction: $scope.viewAllSolutions,
                        title: '&nbsp;&nbsp; <i class="ionicons ion-ios-paper"></i> &nbsp; SEE ALL SOLUTIONS',
                        aTitle: 'See All Solutions'
                    }
                );
            }

            ActionBarService.extraActionsMenu.push(
                {
                    clickAction: $scope.viewReviewsList,
                    title: '&nbsp;&nbsp; <i class="ionicons ion-android-done-all"></i> &nbsp; ASSIGNED REVIEWS',
                    aTitle: 'Assigned Reviews'
                }
            )

            if($scope.isAdmin || $scope.isManager || $scope.isOwner) {
                ActionBarService.extraActionsMenu.push(
                    {
                        separator: true
                    },
                    {
                        clickAction: $scope.manageRubrics,
                        title: '&nbsp;&nbsp; <i class="ionicons ion-settings"></i> &nbsp; MANAGE RUBRICS',
                        aTitle: 'Manage Rubrics'
                    }
                )
            }
        }

    }

    $scope.manageBreadCrumb = function (crumb) {
        var dt = $('.action-header .breadcrumb').find('li.peerAssessmentTitle');
        $('.action-header .breadcrumb li').removeClass('active');
        // var u = '#/cid/' + $scope.course._id + '?tab=discussion';
        if (dt.length > 0) {
            dt.html(crumb);
        } else {
            if ($scope.vName) {
                // $('.action-header .breadcrumb').find('li.tab').wrapInner('<a class="discussionTabLink" href="' + u + '"></a>');
                var newEl = '<li class="peerAssessmentTitle active">' + crumb + '</li>';
                $('.action-header .breadcrumb').append(newEl);
            }
        }
    };

    $scope.tabOpened();
});
;app.controller('BlindController', function($scope) {
    console.log('Debug: BlindController')
    // Setup default values for the view to be populated correctly
    if($scope.newAssignObj && $scope.newAssignObj.reviewSettings && !$scope.newAssignObj.reviewSettings.blind) {
        $scope.newAssignObj.reviewSettings.blind = 'double'
    }

    //$scope.toottip = "<b>Single: </b> The reviewer knows the student identity <br/>" +
    //                 "<b>Double: </b> Both reviewer and student identity is confidential <br/>" +
    //                 "<b>None: </b> Both reviewer and student knows each other's identity <br/>"

    $scope.tooltip = "States who can see the identity during the process"
});app.controller('LoopController', function($scope) {
    console.log('Debug: LoopController')
    // Setup default values for the view to be populated correctly
    $scope.$watch(function(){
        return $scope.newAssignObj;
    }, function(newAssignObj) {
        if(newAssignObj && newAssignObj.reviewSettings && $scope.newAssignObj.reviewSettings.loop == 'multiple'){
            $scope.multipleView = true
        } else {
            $scope.multipleView = false
        }
    })

    if($scope.newAssignObj && $scope.newAssignObj.reviewSettings && !$scope.newAssignObj.reviewSettings.loop) {
        $scope.newAssignObj.reviewSettings.loop = 'single'
        $scope.multipleView = false
    } else if($scope.newAssignObj) {
        if($scope.newAssignObj.reviewSettings.loop == 'single'){
            $scope.multipleView = false
        } else {
            $scope.multipleView = true;
        }
    }
    $scope.toggleView = function(val) {
        console.log('Checking object', $scope.newAssignObj)
        if(val == 'multiple') {
            $scope.multipleView = true
        } else {
            $scope.multipleView = false
        }
    }

    $scope.tooltip = "States the number of time the review process will happen"
});app.controller('ReviewAssignmentTypeController', function($scope) {
    console.log('Debug: ReviewAssignmentController')
    // Setup default values for the view to be populated correctly
    if($scope.newAssignObj && $scope.newAssignObj.reviewSettings && !$scope.newAssignObj.reviewSettings.reviewAssignment) {
        $scope.newAssignObj.reviewSettings.reviewAssignment = 'single'
    }

    $scope.tooltip = "States if the solution will be reviewed by 1 or multiple"
});app.controller('ReviewPercentageController', function($scope) {
    console.log('Debug: ReviewPercentageController')
    // Setup default values for the view to be populated correctly
    if($scope.newAssignObj && $scope.newAssignObj.reviewSettings && !$scope.newAssignObj.reviewSettings.studentPercentage) {
        $scope.newAssignObj.reviewSettings.studentPercentage = 0
    }
});app.controller('AddEditRubricModalController', function($scope, $http, toastr) {
    $scope.saveRubric = function() {
        // Check for client side validation here

        var url = '/api/peerassessment/' + $scope.course._id + '/rubrics'
        if($scope.rubric._id) {
            url = url + '/' + $scope.rubric._id
        }

        $http.post(url, {title: $scope.rubric.title, description: $scope.rubric.description}).then(function(response) {
            toastr.success('Rubric saved');
            window.location.reload();
        }, function(err) {
            toastr.error('Internal Server Error. Please try again later.');
        })
    }
});app.controller('ManageRubricsController', function($scope, ActionBarService, $http, toastr) {
    console.log('Debug: ManageRubricsController')

    fetchRubrics = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/rubrics'
        $http.get(url).then(function(response) {
            if(response && response.data) {
                $scope.rubrics = response.data.rubrics;
            }
        }, function(err) {
            toastr.error('Internal Server Error. Please try again later.');
        })
    }

    if($scope.vName) {
        ActionBarService.extraActionsMenu = [];
        ActionBarService.extraActionsMenu.push(
            {
                clickAction: $scope.goBack,
                title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
                aTitle: 'Back'
            },
            {
                separator: true
            },
            {
                clickAction: $scope.redirectPRHome,
                title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
                aTitle: 'Peer Review Home'
            },
            {
                separator: true
            },
            {
                clickAction: $scope.openRubric,
                title: '<i class="ionicons ion-android-add"></i> &nbsp; NEW RUBRIC',
                aTitle: 'New Rubric'
            }
        );

        fetchRubrics()
    }

    //$scope.saveRubric = function() {
    //    // Check for client side validation here
    //
    //    var url = '/api/peerassessment/' + $scope.course._id + '/rubrics'
    //    if($scope.rubric._id) {
    //        url = url + '/' + $scope.rubric._id
    //    }
    //
    //    $http.post(url, {title: $scope.rubric.title, description: $scope.rubric.description}).then(function(response) {
    //        toastr.success('Rubric saved');
    //        window.location.reload();
    //    }, function(err) {
    //        toastr.error('Internal Server Error. Please try again later.');
    //    })
    //}

    $scope.viewRubric = function(rubric) {
        console.log('Rubric: ', rubric)
        $scope.rubric = rubric
        $('#viewRubricModal').modal('show');
    }

    $scope.editRubric = function(rubric, event) {
        if(event)
            event.stopPropagation();
        if(rubric)
            $scope.rubric = rubric
        $('#addEditRubricModal').modal('show');
    }

    $scope.deleteRubric = function(rubricId, event) {
        if(event)
            event.stopPropagation();
        var url = '/api/peerassessment/' + $scope.course._id + '/rubrics/' + rubricId
        $http.delete(url).then(function(response) {
            toastr.success('Rubric successfully deleted');
            window.location.reload();
        }, function(err) {
            toastr.error('Internal Server Error. Please try again later.');
        })
    }

    // Setting rubric object to null for the reusability of the modal
    $("#addEditRubricModal").on('hidden.bs.modal', function () {
        $(this).data('bs.modal', null);
        $scope.rubric = null;
    });

    $("#viewRubricModal").on('hidden.bs.modal', function () {
        $scope.rubric = null;
    });

});app.controller('RubricController', function($scope, ActionBarService, $http, toastr) {
    fetchRubrics = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/rubrics'
        $http.get(url).then(function(response) {
            if(response && response.data) {
                $scope.rubrics = response.data.rubrics;
            }
        }, function(err) {
            toastr.error('Internal Server Error. Please try again later.');
        })
    }

    fetchRubrics()

    $scope.toggleSelection = function(rId) {
        var idx = $scope.newAssignObj.reviewSettings.rubrics.indexOf(rId);
        if(idx > -1) {
            $scope.newAssignObj.reviewSettings.rubrics.splice(idx, 1);
        } else {
            $scope.newAssignObj.reviewSettings.rubrics.push(rId);
        }
        console.log($scope.newAssignObj.reviewSettings.rubrics);
    }

    if($scope.newAssignObj && $scope.newAssignObj.reviewSettings && !$scope.newAssignObj.reviewSettings.rubrics) {
        $scope.newAssignObj.reviewSettings.rubrics = []
    }
});app.controller('EditPeerReviewController', function($scope, $http, toastr, $window, Upload, ActionBarService, $location) {
    console.log('Debug: EditPeerReviewController')
    ActionBarService.extraActionsMenu = [];

    ActionBarService.extraActionsMenu.push(
        {
            clickAction: $scope.goBack,
            title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
            aTitle: 'Back'
        },
        {
            separator: true
        },
        {
            clickAction: $scope.redirectPRHome,
            title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
            aTitle: 'Peer Review Home'
        }
    );

    $scope.reviewDocuments = false;
    $scope.sampleSolutions = false;
    $scope.progress = 0;
    //$scope.newAssignObj.deletedUploadedFiles = [];
    //$scope.newAssignObj.deletedUploadedSolutions = [];

    $scope.deleteUploadedFiles = function(fileName) {
        for(var i=0; i<$scope.newAssignObj.displayDocumentsList.length; i++) {
            if ($scope.newAssignObj.displayDocumentsList[i].link == fileName) {
                if(!$scope.newAssignObj.deletedUploadedFiles) {
                    $scope.newAssignObj.deletedUploadedFiles = [];
                }
                $scope.newAssignObj.deletedUploadedFiles.push($scope.newAssignObj.documents[i]);
                $scope.newAssignObj.documents.splice(i,1);
                $scope.newAssignObj.displayDocumentsList.splice(i,1);
                break;
            }
        }
        console.log('Check deleted Objects', $scope.newAssignObj.deletedUploadedFiles, $scope.newAssignObj.documents, $scope.newAssignObj.displayDocumentsList);
    }

    $scope.deleteSelectedFiles = function(fileName) {
        console.log('Review Docs Selected', $scope.reviewDocuments, fileName);
        for(var i=0; i<$scope.reviewDocuments.length; i++) {
            if($scope.reviewDocuments[i].name == fileName) {
                $scope.reviewDocuments.splice(i,1);
                break;
            }
        }
    }

    $scope.deleteUploadedSolutions = function(fileName) {
        for(var i=0; i<$scope.newAssignObj.displaySolutionsList.length; i++) {
            if ($scope.newAssignObj.displaySolutionsList[i].link == fileName) {
                if(!$scope.newAssignObj.deletedUploadedSolutions) {
                    $scope.newAssignObj.deletedUploadedSolutions = [];
                }
                $scope.newAssignObj.deletedUploadedSolutions.push($scope.newAssignObj.solutions[i]);
                $scope.newAssignObj.solutions.splice(i,1);
                $scope.newAssignObj.displaySolutionsList.splice(i,1);
                break;
            }
        }
        console.log('Check deleted Objects', $scope.newAssignObj.deletedUploadedSolutions, $scope.newAssignObj.solutions, $scope.newAssignObj.displaySolutionsList);
    }

    $scope.deleteSelectedSolutions = function(fileName) {
        console.log('Review Docs Selected', $scope.sampleSolutions, fileName);
        for(var i=0; i<$scope.sampleSolutions.length; i++) {
            if($scope.sampleSolutions[i].name == fileName) {
                $scope.sampleSolutions.splice(i,1);
                break;
            }
        }
    }

    $scope.initiateController = function() {
        var vId = $location.search().vId;
        if($scope.vName && vId) {
            $scope.newAssignObj = null;

            var url = '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + vId;
            $http.get(url).then(function (response) {
                console.log('Resp', response);
                var review = response.data.peerReview;
                if (review.publicationDate) {
                    review.publicationDate = new Date(review.publicationDate);
                }
                if (review.dueDate) {
                    review.dueDate = new Date(review.dueDate);
                }
                if (review.solutionPublicationDate) {
                    review.solutionPublicationDate = new Date(review.solutionPublicationDate);
                    review.ssPublicationDate = review.solutionPublicationDate;
                    delete review.solutionPublicationDate;
                }
                review.reviewDescription = review.description;
                delete review.description;

                if (review.documents && review.documents.length > 0) {
                    review.displayDocumentsList = [];
                    _.each(review.documents, function (docName) {
                        var temp = {};
                        temp.link = window.location.origin + docName;
                        var tempArr = docName.split('/');
                        temp.name = tempArr[tempArr.length - 1];
                        review.displayDocumentsList.push(temp);
                    })
                }

                if (review.solutions && review.solutions.length > 0) {
                    review.displaySolutionsList = [];
                    _.each(review.solutions, function (docName) {
                        var temp = {};
                        temp.link = window.location.origin + docName;
                        var tempArr = docName.split('/');
                        temp.name = tempArr[tempArr.length - 1];
                        review.displaySolutionsList.push(temp);
                    })
                }

                // Processing review settings
                if (review.reviewSettings && review.reviewSettings.reviewStartDate) {
                    review.reviewSettings.reviewStartDate = new Date(review.reviewSettings.reviewStartDate)
                }
                if (review.reviewSettings && review.reviewSettings.reviewEndDate) {
                    review.reviewSettings.reviewEndDate = new Date(review.reviewSettings.reviewEndDate)
                }
                if (review.reviewSettings && review.reviewSettings.secondDueDate) {
                    review.reviewSettings.secondDueDate = new Date(review.reviewSettings.secondDueDate)
                }
                if (review.reviewSettings && review.reviewSettings.secondReviewStartDate) {
                    review.reviewSettings.secondReviewStartDate = new Date(review.reviewSettings.secondReviewStartDate)
                }
                if (review.reviewSettings && review.reviewSettings.secondReviewEndDate) {
                    review.reviewSettings.secondReviewEndDate = new Date(review.reviewSettings.secondReviewEndDate)
                }

                $scope.newAssignObj = review;

            }, function (err) {
                // Check for proper error message later
                toastr.error('Internal Server Error. Please try again later.');
            });
        }
    }

    $scope.dateValidationObject = {
        publicationDate : { valid: true, message: '' },
        dueDate : { valid: true, message: '' },
        solutionDate : { valid: true, message: '' },
        reviewStartDate : { valid: true, message: '' },
        reviewEndDate : { valid: true, message: '' },
        secondDueDate : { valid: true, message: '' },
        secondReviewStartDate : { valid: true, message: '' },
        secondReviewEndDate : { valid: true, message: '' },
    }

    var clearValidation = function() {
        $scope.dateValidationObject.publicationDate.valid = true
        $scope.dateValidationObject.dueDate.valid = true
        $scope.dateValidationObject.solutionDate.valid = true
        $scope.dateValidationObject.reviewStartDate.valid = true
        $scope.dateValidationObject.reviewEndDate.valid = true
        $scope.dateValidationObject.secondDueDate.valid = true
        $scope.dateValidationObject.secondReviewStartDate.valid = true
        $scope.dateValidationObject.secondReviewEndDate.valid = true
    }

    $scope.formValidation = function() {
        clearValidation()
        if($scope.newAssignObj.dueDate) {
            if(!$scope.newAssignObj.publicationDate) {
                $scope.dateValidationObject.publicationDate.valid = false;
                $scope.dateValidationObject.publicationDate.message = 'Publication date is required for due date';
            } else if ($scope.newAssignObj.publicationDate >= $scope.newAssignObj.dueDate) {
                $scope.dateValidationObject.dueDate.valid = false;
                $scope.dateValidationObject.dueDate.message = 'Due date should be greater than publication date';
            }
        }
        if($scope.newAssignObj.ssPublicationDate) {
            if(!$scope.newAssignObj.dueDate) {
                $scope.dateValidationObject.dueDate.valid = false;
                $scope.dateValidationObject.dueDate.message = 'Due date is required for solution publication date';
            } else if ($scope.newAssignObj.dueDate >= $scope.newAssignObj.ssPublicationDate) {
                $scope.dateValidationObject.solutionDate.valid = false;
                $scope.dateValidationObject.solutionDate.message = 'Solution publication date should be greater than due date';
            }
        }

        if($scope.newAssignObj.reviewSettings.reviewStartDate) {
            if(!$scope.newAssignObj.dueDate) {
                $scope.dateValidationObject.dueDate.valid = false;
                $scope.dateValidationObject.dueDate.message = 'Due date is required for review process';
            } else if ($scope.newAssignObj.dueDate >= $scope.newAssignObj.reviewSettings.reviewStartDate) {
                $scope.dateValidationObject.reviewStartDate.valid = false;
                $scope.dateValidationObject.reviewStartDate.message = 'Review start date should be greater than than due date';
            }
        }

        if($scope.newAssignObj.reviewSettings.reviewEndDate) {
            if(!$scope.newAssignObj.reviewSettings.reviewStartDate) {
                $scope.dateValidationObject.reviewStartDate.valid = false;
                $scope.dateValidationObject.reviewStartDate.message = 'Review start date is required';
            } else if ($scope.newAssignObj.reviewSettings.reviewStartDate >= $scope.newAssignObj.reviewSettings.reviewEndDate) {
                $scope.dateValidationObject.reviewEndDate.valid = false;
                $scope.dateValidationObject.reviewEndDate.message = 'Review end date should be greater than review start date';
            }
        }
        if($scope.newAssignObj.reviewSettings.loop == 'multiple') {
            if($scope.newAssignObj.reviewSettings.secondDueDate) {
                if(!$scope.newAssignObj.reviewSettings.reviewEndDate) {
                    $scope.dateValidationObject.reviewEndDate.valid = false;
                    $scope.dateValidationObject.reviewEndDate.message = 'Review end date is required';
                } else if ($scope.newAssignObj.reviewSettings.reviewEndDate >= $scope.newAssignObj.reviewSettings.secondDueDate) {
                    $scope.dateValidationObject.secondDueDate.valid = false;
                    $scope.dateValidationObject.secondDueDate.message = 'Second due date should be greater than review end date';
                }
            }

            if($scope.newAssignObj.reviewSettings.secondReviewStartDate) {
                if(!$scope.newAssignObj.reviewSettings.secondDueDate) {
                    $scope.dateValidationObject.secondDueDate.valid = false;
                    $scope.dateValidationObject.secondDueDate.message = 'Second due date is required';
                } else if ($scope.newAssignObj.reviewSettings.secondDueDate >= $scope.newAssignObj.reviewSettings.secondReviewStartDate) {
                    $scope.dateValidationObject.secondReviewStartDate.valid = false;
                    $scope.dateValidationObject.secondReviewStartDate.message = 'Second review start date should be greater than second due date';
                }
            }

            if($scope.newAssignObj.reviewSettings.secondReviewEndDate) {
                if(!$scope.newAssignObj.reviewSettings.secondReviewStartDate) {
                    $scope.dateValidationObject.secondReviewStartDate.valid = false;
                    $scope.dateValidationObject.secondReviewStartDate.message = 'Second review start date is required';
                } else if ($scope.newAssignObj.reviewSettings.secondReviewStartDate >= $scope.newAssignObj.reviewSettings.secondReviewEndDate) {
                    $scope.dateValidationObject.secondReviewEndDate.valid = false;
                    $scope.dateValidationObject.secondReviewEndDate.message = 'Second review end date should be greater than second review start date';
                }
            }
        }
    }

    $scope.isFormValid = function() {
        if ($scope.form.$error.min && $scope.form.$error.min.length) {
            return false
        } else if ($scope.form.$error.number && $scope.form.$error.number.length) {
            return false
        } else if ($scope.form.$error.required && $scope.form.$error.required.length) {
            return false
        } else {
            for (var key in $scope.dateValidationObject) {
                if ($scope.dateValidationObject[key].valid == false) {
                    return false
                }
            }
        }
        return true
    }

    $scope.editPeerReview = function() {
        console.log('Form Object', $scope.form)
        $scope.isLoading = true;
        var uploadParams = {
            method: 'PUT',
            url: '/api/peerassessment/' + $scope.$parent.course._id + '/peerreviews/' + $scope.newAssignObj._id,
            fields: $scope.newAssignObj
        };
        uploadParams.file = [];
        if($scope.reviewDocuments) {
            uploadParams.file.push({'reviewDocuments':$scope.reviewDocuments});
        }
        if($scope.sampleSolutions) {
            uploadParams.file.push({'sampleSolutions':$scope.sampleSolutions});
        }

        $scope.upload = Upload.upload(
            uploadParams
            )
            .progress(function (evt) {
                if (!evt.config.file)
                    return;

                $scope.progress = parseInt(100.0 * evt.loaded / evt.total);
                // console.log("Progress", $scope.progress);
            })
            .success(function (data) {

                $scope.progress = 0;
                if (data.result) {
                    toastr.success('Successfully Saved');
                } else {
                    toastr.error('Updating Peer Review Failed');
                }
                $scope.isLoading = false;
                window.location.reload();
            })
            .error(function (data) {
                toastr.error('Updating Peer Review Failed');
                $scope.errors = data.errors;
                $scope.progress = 0;
                $scope.isLoading = false;
            });
    }

    $scope.initiateController();
});;app.controller('NewPeerReviewController', function($scope, $http, toastr, $window, Upload, ActionBarService) {
    console.log('Debug: NewPeerReviewController')
    ActionBarService.extraActionsMenu = [];

    ActionBarService.extraActionsMenu.push(
        {
            clickAction: $scope.goBack,
            title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
            aTitle: 'Back'
        },
        {
            separator: true
        },
        {
            clickAction: $scope.redirectPRHome,
            title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
            aTitle: 'Peer Review Home'
        }
    );

    $scope.newAssignObj = {
        title: "",
        reviewDescription: "",
        groupSubmission: false,
        totalMarks: 0,
        publicationDate: null,
        dueDate: null,
        ssPublicationDate: null,
        reviewSettings: {}
    }
    $scope.reviewDocuments = false;
    $scope.sampleSolutions = false;
    $scope.progress = 0;

    $scope.deleteSelectedFiles = function(fileName) {
        console.log('Review Docs Selected', $scope.reviewDocuments, fileName);
        for(var i=0; i<$scope.reviewDocuments.length; i++) {
            if($scope.reviewDocuments[i].name == fileName) {
                $scope.reviewDocuments.splice(i,1);
                break;
            }
        }
    }

    $scope.deleteSelectedSolutions = function(fileName) {
        console.log('Review Docs Selected', $scope.sampleSolutions, fileName);
        for(var i=0; i<$scope.sampleSolutions.length; i++) {
            if($scope.sampleSolutions[i].name == fileName) {
                $scope.sampleSolutions.splice(i,1);
                break;
            }
        }
    }

    $scope.dateValidationObject = {
        publicationDate : { valid: true, message: '' },
        dueDate : { valid: true, message: '' },
        solutionDate : { valid: true, message: '' },
        reviewStartDate : { valid: true, message: '' },
        reviewEndDate : { valid: true, message: '' },
        secondDueDate : { valid: true, message: '' },
        secondReviewStartDate : { valid: true, message: '' },
        secondReviewEndDate : { valid: true, message: '' },
    }

    var clearValidation = function() {
        $scope.dateValidationObject.publicationDate.valid = true
        $scope.dateValidationObject.dueDate.valid = true
        $scope.dateValidationObject.solutionDate.valid = true
        $scope.dateValidationObject.reviewStartDate.valid = true
        $scope.dateValidationObject.reviewEndDate.valid = true
        $scope.dateValidationObject.secondDueDate.valid = true
        $scope.dateValidationObject.secondReviewStartDate.valid = true
        $scope.dateValidationObject.secondReviewEndDate.valid = true
    }

    $scope.formValidation = function() {
        clearValidation()
        if($scope.newAssignObj.dueDate) {
            if(!$scope.newAssignObj.publicationDate) {
                $scope.dateValidationObject.publicationDate.valid = false;
                $scope.dateValidationObject.publicationDate.message = 'Publication date is required for due date';
            } else if ($scope.newAssignObj.publicationDate >= $scope.newAssignObj.dueDate) {
                $scope.dateValidationObject.dueDate.valid = false;
                $scope.dateValidationObject.dueDate.message = 'Due date should be greater than publication date';
            }
        }
        if($scope.newAssignObj.ssPublicationDate) {
            if(!$scope.newAssignObj.dueDate) {
                $scope.dateValidationObject.dueDate.valid = false;
                $scope.dateValidationObject.dueDate.message = 'Due date is required for solution publication date';
            } else if ($scope.newAssignObj.dueDate >= $scope.newAssignObj.ssPublicationDate) {
                $scope.dateValidationObject.solutionDate.valid = false;
                $scope.dateValidationObject.solutionDate.message = 'Solution publication date should be greater than due date';
            }
        }

        if($scope.newAssignObj.reviewSettings.reviewStartDate) {
            if(!$scope.newAssignObj.dueDate) {
                $scope.dateValidationObject.dueDate.valid = false;
                $scope.dateValidationObject.dueDate.message = 'Due date is required for review process';
            } else if ($scope.newAssignObj.dueDate >= $scope.newAssignObj.reviewSettings.reviewStartDate) {
                $scope.dateValidationObject.reviewStartDate.valid = false;
                $scope.dateValidationObject.reviewStartDate.message = 'Review start date should be greater than than due date';
            }
        }

        if($scope.newAssignObj.reviewSettings.reviewEndDate) {
            if(!$scope.newAssignObj.reviewSettings.reviewStartDate) {
                $scope.dateValidationObject.reviewStartDate.valid = false;
                $scope.dateValidationObject.reviewStartDate.message = 'Review start date is required';
            } else if ($scope.newAssignObj.reviewSettings.reviewStartDate >= $scope.newAssignObj.reviewSettings.reviewEndDate) {
                $scope.dateValidationObject.reviewEndDate.valid = false;
                $scope.dateValidationObject.reviewEndDate.message = 'Review end date should be greater than review start date';
            }
        }
        if($scope.newAssignObj.reviewSettings.loop == 'multiple') {
            if($scope.newAssignObj.reviewSettings.secondDueDate) {
                if(!$scope.newAssignObj.reviewSettings.reviewEndDate) {
                    $scope.dateValidationObject.reviewEndDate.valid = false;
                    $scope.dateValidationObject.reviewEndDate.message = 'Review end date is required';
                } else if ($scope.newAssignObj.reviewSettings.reviewEndDate >= $scope.newAssignObj.reviewSettings.secondDueDate) {
                    $scope.dateValidationObject.secondDueDate.valid = false;
                    $scope.dateValidationObject.secondDueDate.message = 'Second due date should be greater than review end date';
                }
            }

            if($scope.newAssignObj.reviewSettings.secondReviewStartDate) {
                if(!$scope.newAssignObj.reviewSettings.secondDueDate) {
                    $scope.dateValidationObject.secondDueDate.valid = false;
                    $scope.dateValidationObject.secondDueDate.message = 'Second due date is required';
                } else if ($scope.newAssignObj.reviewSettings.secondDueDate >= $scope.newAssignObj.reviewSettings.secondReviewStartDate) {
                    $scope.dateValidationObject.secondReviewStartDate.valid = false;
                    $scope.dateValidationObject.secondReviewStartDate.message = 'Second review start date should be greater than second due date';
                }
            }

            if($scope.newAssignObj.reviewSettings.secondReviewEndDate) {
                if(!$scope.newAssignObj.reviewSettings.secondReviewStartDate) {
                    $scope.dateValidationObject.secondReviewStartDate.valid = false;
                    $scope.dateValidationObject.secondReviewStartDate.message = 'Second review start date is required';
                } else if ($scope.newAssignObj.reviewSettings.secondReviewStartDate >= $scope.newAssignObj.reviewSettings.secondReviewEndDate) {
                    $scope.dateValidationObject.secondReviewEndDate.valid = false;
                    $scope.dateValidationObject.secondReviewEndDate.message = 'Second review end date should be greater than second review start date';
                }
            }
        }
    }

    $scope.isFormValid = function() {
        if ($scope.form.$error.min && $scope.form.$error.min.length) {
            return false
        } else if ($scope.form.$error.number && $scope.form.$error.number.length) {
            return false
        } else if ($scope.form.$error.required && $scope.form.$error.required.length) {
            return false
        } else {
            for (var key in $scope.dateValidationObject) {
                if ($scope.dateValidationObject[key].valid == false) {
                    return false
                }
            }
        }
        return true
    }

    $scope.createPeerReview = function() {
        console.log('Form object', $scope.form)
        console.log('Date validation object', $scope.dateValidationObject)
        $scope.isLoading = true;
        var uploadParams = {
            url: '/api/peerassessment/' + $scope.$parent.course._id + '/peerreviews',
            fields: $scope.newAssignObj
        };
        uploadParams.file = [];
        if($scope.reviewDocuments) {
            uploadParams.file.push({'reviewDocuments':$scope.reviewDocuments});
        }
        if($scope.sampleSolutions) {
            uploadParams.file.push({'sampleSolutions':$scope.sampleSolutions});
        }

        $scope.upload = Upload.upload(
            uploadParams
            )
            .progress(function (evt) {
                if (!evt.config.file)
                    return;

                $scope.progress = parseInt(100.0 * evt.loaded / evt.total);
                // console.log("Progress", $scope.progress);
            })
            .success(function (data) {

                $scope.progress = 0;
                if (data.result) {
                    toastr.success('Successfully Saved');
                } else {
                    toastr.error('Error Creating Peer Review');
                }
                $scope.isLoading = false;

                window.history.back();
            })
            .error(function (data) {
                $scope.errors = data.errors;
                $scope.progress = 0;
                $scope.isLoading = false;
            });
    }
});;app.controller('ViewPeerReviewController', function($scope, $location, $http, toastr, ActionBarService) {
    console.log('Debug: ViewPeerReviewController')
    $scope.vId = $location.search().vId;
    if($scope.vName && $scope.vId) {
        $scope.viewReview = null;
        ActionBarService.extraActionsMenu = [];

        ActionBarService.extraActionsMenu.push(
            {
                clickAction: $scope.goBack,
                title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
                aTitle: 'Back'
            },
            {
                separator: true
            },
            {
                clickAction: $scope.redirectPRHome,
                title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
                aTitle: 'Peer Review Home'
            }
        );

        ActionBarService.extraActionsMenu.push({
            separator: true
        });

        var url = '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + $scope.vId;
        $http.get(url).then( function(response) {
            var review = response.data.peerReview;
            review.publicationDate = new Date(review.publicationDate);
            review.dueDate = new Date(review.dueDate);
            review.solutionPublicationDate = new Date(review.solutionPublicationDate);
            review.ssPublicationDate = review.solutionPublicationDate;
            delete review.solutionPublicationDate;
            review.reviewDescription = review.description;
            delete review.description;

            if(review.reviewSettings.reviewStartDate) {
                review.reviewSettings.reviewStartDate = new Date(review.reviewSettings.reviewStartDate)
            }
            if(review.reviewSettings.reviewEndDate) {
                review.reviewSettings.reviewEndDate = new Date(review.reviewSettings.reviewEndDate)
            }
            if(review.reviewSettings.secondDueDate) {
                review.reviewSettings.secondDueDate = new Date(review.reviewSettings.secondDueDate)
            }
            if(review.reviewSettings.secondReviewStartDate) {
                review.reviewSettings.secondReviewStartDate = new Date(review.reviewSettings.secondReviewStartDate)
            }
            if(review.reviewSettings.secondReviewEndDate) {
                review.reviewSettings.secondReviewEndDate = new Date(review.reviewSettings.secondReviewEndDate)
            }

            if(review.documents && review.documents.length>0) {
                review.displayDocumentsList = [];
                _.each(review.documents, function(docName) {
                    var temp = {};
                    temp.link = window.location.origin + docName;
                    var tempArr = docName.split('/');
                    temp.name = tempArr[tempArr.length-1];
                    review.displayDocumentsList.push(temp);
                })
            }

            if(review.solutions && review.solutions.length>0) {
                review.displaySolutionsList = [];
                _.each(review.solutions, function(docName) {
                    var temp = {};
                    temp.link = window.location.origin + docName;
                    var tempArr = docName.split('/');
                    temp.name = tempArr[tempArr.length-1];
                    review.displaySolutionsList.push(temp);
                })
            }

            $scope.viewReview = review;
            console.log('ViewPeerReview: ', review)
            if($scope.isAdmin || $scope.isManager || $scope.isOwner) {
                ActionBarService.extraActionsMenu.push(
                    {
                        clickAction: $scope.editPeerReview,
                        clickParams: $scope.viewReview,
                        title: '&nbsp;&nbsp; <i class="ionicons ion-edit"></i> &nbsp; EDIT',
                        aTitle: 'Edit Peer Review'
                    },
                    {
                        clickAction: $scope.openDeleteConfirmationModal,
                        clickParams: $scope.viewReview._id,
                        title: '&nbsp;&nbsp; <i class="ionicons ion-ios-trash"></i> &nbsp; DELETE',
                        aTitle: 'Delete Peer Review'
                    },
                    {
                        separator: true
                    },
                    {
                        clickAction: $scope.reviewAssignment,
                        clickParams: $scope.viewReview._id,
                        title: '&nbsp;&nbsp; <i class="ionicons ion-android-done-all"></i> &nbsp; ASSIGN REVIEWS',
                        aTitle: 'Assign Reviews'
                    }
                );
            }

            if($scope.isEnrolled) {
                ActionBarService.extraActionsMenu.push(
                    {
                        clickAction: $scope.openAddEditSolutionModal,
                        clickParams: $scope.viewReview,
                        title: '&nbsp;&nbsp; <i class="ionicons ion-ios-paper"></i> &nbsp; ADD/EDIT SOLUTION',
                        aTitle: 'Add/Edit Solution'
                    },
                    {
                        separator: true
                    },
                    {
                        clickAction: function() { window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=viewFeedback&vId=' + $scope.viewReview._id; },
                        title: '&nbsp;&nbsp; <i class="ionicons ion-checkmark-circled"></i> &nbsp; VIEW FEEDBACK',
                        aTitle: 'View Feedback'
                    }
                );
            }
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        });
    }
});app.controller('AdminFeedbackController', function($scope, $http, toastr, $window, $location, ActionBarService, Upload) {
    vId = $location.search().vId;
    if(!vId) {
        return
    }

    ActionBarService.extraActionsMenu = [];

    ActionBarService.extraActionsMenu.push(
        {
            clickAction: $scope.goBack,
            title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
            aTitle: 'Back'
        },
        {
            separator: true
        },
        {
            clickAction: $scope.redirectPRHome,
            title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
            aTitle: 'Peer Review Home'
        }
    );

    var fetchSolution = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/solutions/' + vId;
        $http.get(url).then( function(response) {
            if(response.data.solution) {
                var solution = response.data.solution;
                if(solution.solutionDocuments && solution.solutionDocuments.length>0) {
                    solution.displayDocumentsList = [];
                    _.each(solution.solutionDocuments, function(docName) {
                        var temp = {};
                        temp.link = window.location.origin + docName;
                        var tempArr = docName.split('/');
                        temp.name = tempArr[tempArr.length-1];
                        solution.displayDocumentsList.push(temp);
                    })
                }
                $scope.solution = solution;
                console.log('Solution', solution)
            }
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        })
    }

    var reviews;
    var fetchPeerReviews = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/reviews?rName=AFCFetchPeerReviews&solutionId=' + vId + '&isAdminReview=false&isSubmitted=true';
        $http.get(url).then( function(response) {
            console.log('Students', response)
            if(response.data.reviews) {
                reviews = response.data.reviews
                var oldReviewsID = []
                _.each(reviews, function(review) {
                    // handling removal of old reviews if there is a second loop review
                    if(review.oldReviewId) {
                        oldReviewsID.push(review.oldReviewId)
                    }
                });
                $scope.reviews = _.filter(reviews, function(review) {
                    if (_.indexOf(oldReviewsID, review._id) == -1 || review.isSecondLoop) {
                        return review
                    }
                })
                //$scope.reviews = response.data.reviews
            }
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        })
    }

    var fetchAdminReview = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/reviews?rName=AFCFetchPeerReviews&solutionId=' + vId + '&isAdminReview=true';
        $http.get(url).then( function(response) {
            console.log('Admin', response)
            $scope.existingReview = false
            if(response.data.reviews && response.data.reviews.length) {
                var review = response.data.reviews[0]
                if (review.documents && review.documents.length > 0) {
                    review.displayDocumentsList = [];
                    _.each(review.documents, function (docName) {
                        console.log(docName)
                        var temp = {};
                        temp.link = window.location.origin + docName;
                        var tempArr = docName.split('/');
                        temp.name = tempArr[tempArr.length - 1];
                        review.displayDocumentsList.push(temp);
                    })
                }
                $scope.review = review
                $scope.existingReview = true
            }
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        })
    }

    fetchSolution()
    fetchPeerReviews()
    fetchAdminReview()

    $scope.reviewDocuments = false;
    $scope.deleteUploadedFiles = function(fileName) {
        for(var i=0; i<$scope.review.displayDocumentsList.length; i++) {
            if ($scope.review.displayDocumentsList[i].link == fileName) {
                if(!$scope.review.deletedUploadedFiles) {
                    $scope.review.deletedUploadedFiles = [];
                }
                $scope.review.deletedUploadedFiles.push($scope.review.documents[i]);
                $scope.review.documents.splice(i,1);
                $scope.review.displayDocumentsList.splice(i,1);
                break;
            }
        }
    }

    $scope.deleteSelectedFiles = function(fileName) {
        console.log('Review Docs Selected', $scope.reviewDocuments, fileName);
        for(var i=0; i<$scope.reviewDocuments.length; i++) {
            if($scope.reviewDocuments[i].name == fileName) {
                $scope.reviewDocuments.splice(i,1);
                break;
            }
        }
    }

    $scope.isFormValid = function() {
        if ($scope.form.$error.min && $scope.form.$error.min.length) {
            return false
        } else if ($scope.form.$error.number && $scope.form.$error.number.length) {
            return false
        } else if ($scope.form.$error.required && $scope.form.$error.required.length) {
            return false
        } else if ($scope.form.$error.max && $scope.form.$error.max.length) {
            return false
        }
        return true
    }

    $scope.submitReview = function() {
        console.log($scope.review)
        $scope.isLoading = true;
        var uploadParams;
        if($scope.existingReview) {
             uploadParams = {
                method: 'PUT',
                url: '/api/peerassessment/' + $scope.course._id + '/reviews/' + $scope.review._id,
                fields: $scope.review
            };
        } else {
            console.log(_.extend($scope.review, {solutionId: $scope.solution._id}))
            uploadParams = {
                method: 'POST',
                url: '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + $scope.solution.peerReviewId._id +'/reviews/add',
                fields: _.extend($scope.review, {solutionId: $scope.solution._id})
            };
        }
        uploadParams.file = [];
        if($scope.reviewDocuments) {
            uploadParams.file.push({'reviewDocuments':$scope.reviewDocuments});
        }

        $scope.upload = Upload.upload(
            uploadParams
            )
            .progress(function (evt) {
                if (!evt.config.file)
                    return;

                $scope.progress = parseInt(100.0 * evt.loaded / evt.total);
                // console.log("Progress", $scope.progress);
            })
            .success(function (data) {
                $scope.progress = 0;
                if (data.result) {
                    toastr.success('Successfully Saved');
                } else {
                    toastr.error(data.errors[0] || 'Failed');
                }
                $scope.isLoading = false;
                window.location.reload();
            })
            .error(function (data) {
                toastr.error('Internal Server Error');
                $scope.errors = data.errors;
                $scope.progress = 0;
                $scope.isLoading = false;
            });
    }

    $scope.openReview = function(review) {
        populateRubrics(review)
        populateDisplayDocumentList(review)
        $scope.peerReview = review

        if(review.isSecondLoop && review.oldReviewId) {
            reviews.every(function(r) {
                if(review.oldReviewId == r._id) {
                    populateRubrics(r)
                    populateDisplayDocumentList(r)
                    $scope.firstReview = r
                    return false
                }
                return true
            })
        }
        console.log(review);
        $('#viewReviewModal').modal('show');
    }

    populateRubrics = function(review) {
        if(review.peerReviewId.reviewSettings.rubrics && review.peerReviewId.reviewSettings.rubrics.length) {
            review.rubrics = review.peerReviewId.reviewSettings.rubrics
        }
    }

    populateDisplayDocumentList = function(review) {
        if(review.documents && review.documents.length>0) {
            review.displayDocumentsList = [];
            _.each(review.documents, function(docName) {
                var temp = {};
                temp.link = window.location.origin + docName;
                var tempArr = docName.split('/');
                temp.name = tempArr[tempArr.length-1];
                review.displayDocumentsList.push(temp);
            })
        }
    }
});app.controller('ReviewController', function($scope, $http, ActionBarService, toastr) {
    if($scope.vName) {
        ActionBarService.extraActionsMenu = [];
        ActionBarService.extraActionsMenu.push(
            {
                clickAction: $scope.goBack,
                title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
                aTitle: 'Back'
            },
            {
                separator: true
            },
            {
                clickAction: $scope.redirectPRHome,
                title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
                aTitle: 'Peer Review Home'
            }
        );
    }

    var requestData = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/reviews?rName=RCRequestData';
        $http.get(url).then( function(response) {
            var oldReviewsID = [];
            console.log('Reviews', response.data.reviews);
            _.each(response.data.reviews, function(review) {
                // handling removal of old reviews if there is a second loop review
                if(review.oldReviewId) {
                    oldReviewsID.push(review.oldReviewId)
                }
            });
            $scope.reviews = _.filter(response.data.reviews, function(review) {
                if (_.indexOf(oldReviewsID, review._id) == -1 || review.isSecondLoop) {
                    return review
                }
            })
            console.log('Reviews', $scope.reviews);
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        });
    }

    requestData();

    $scope.openReview = function(review, event) {
        if(event) {
            event.stopPropagation();
        }
        console.log('Opening Review: ', review);
        window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=reviewSubmission&vId=' + review._id;
    }
});app.controller('ReviewAssignmentController', function($scope, $http, toastr, $window, $location, ActionBarService) {
    console.log('Debug: ReviewAssignmentController')
    vId = $location.search().vId;
    if(!vId) {
        return
    }
    $scope.user = null;
    $scope.solution = null;
    ActionBarService.extraActionsMenu = [];

    ActionBarService.extraActionsMenu.push(
        {
            clickAction: $scope.goBack,
            title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
            aTitle: 'Back'
        },
        {
            separator: true
        },
        {
            clickAction: $scope.redirectPRHome,
            title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
            aTitle: 'Peer Review Home'
        }
    );

    console.log('Peer Review Id: ', vId)
    var url = '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + vId + '/reviews/new';
    $http.get(url).then(function (response) {
        console.log(response.data);
        if(response && response.data) {
            $scope.assignedReviews = response.data.assignedReviews;
            $scope.users = response.data.users;
            $scope.solutions = response.data.solutions;
            if($scope.users.length)
                $scope.user = $scope.users[0]._id;
            if($scope.solutions.length)
                $scope.solution = $scope.solutions[0]._id;
        }
    }, function(err) {
        toastr.error('Internal Server error. Please try again later');
    });

    $scope.assignReview = function() {
        if(!$scope.user || !$scope.solution) {
            toastr.error('Please select a valid student and solution before assigning');
            return;
        }
        console.log($scope.user, $scope.solution)

        var url = '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + vId + '/reviews/assign';
        $http.post(url, {assignedTo: $scope.user, solutionId: $scope.solution}).then(function(response) {
            console.log($scope.solution)
            if(response && response.data && response.data.result) {
                toastr.success('Review successfully created');
                window.location.reload();
            } else {
                toastr.error('Internal Server error. Please try again later');
            }
        }, function(err) {
            toastr.error('Internal Server error. Please try again later');
        });
    }

    $scope.deleteReview = function(id, e) {
        var url = '/api/peerassessment/' + $scope.course._id + '/peerreviews/' + vId + '/reviews/' + id;
        $http.delete(url).then(function(response) {
            if(response && response.data && response.data.result) {
                toastr.success('Review successfully deleted');
                window.location.reload();
            } else {
                toastr.error('Internal Server error. Please try again later');
            }
        }, function(err) {
            toastr.error('Internal Server error. Please try again later');
        })
    }
});app.controller('ReviewSubmissionController', function($scope, $http, toastr, $window, $location, ActionBarService, Upload) {
    vId = $location.search().vId;
    if(!vId) {
        return
    }

    ActionBarService.extraActionsMenu = [];

    ActionBarService.extraActionsMenu.push(
        {
            clickAction: $scope.goBack,
            title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
            aTitle: 'Back'
        },
        {
            separator: true
        },
        {
            clickAction: $scope.redirectPRHome,
            title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
            aTitle: 'Peer Review Home'
        }
        //{
        //    clickAction: $scope.viewReviewsList,
        //    title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
        //    aTitle: 'Back'
        //}
    );

    var requestData = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/reviews/'+ vId;
        $http.get(url).then( function(response) {
            var review = response.data.review;
            if(review.solutionId.solutionDocuments && review.solutionId.solutionDocuments.length) {
                var solutionDocumentsList = [];
                _.each(review.solutionId.solutionDocuments, function(docName) {
                    var temp = {};
                    temp.link = window.location.origin + docName;
                    var tempArr = docName.split('/');
                    temp.name = tempArr[tempArr.length-1];
                    solutionDocumentsList.push(temp);
                })
                $scope.solutionDocumentsList = solutionDocumentsList
            }
            if(review.peerReviewId.reviewSettings.rubrics && review.peerReviewId.reviewSettings.rubrics.length) {
                $scope.rubrics = review.peerReviewId.reviewSettings.rubrics
            }
            if (review.documents && review.documents.length > 0) {
                review.displayDocumentsList = [];
                _.each(review.documents, function (docName) {
                    console.log(docName)
                    var temp = {};
                    temp.link = window.location.origin + docName;
                    var tempArr = docName.split('/');
                    temp.name = tempArr[tempArr.length - 1];
                    review.displayDocumentsList.push(temp);
                })
            }
            $scope.review = review
            console.log('Review', $scope.review);
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        });
    }
    requestData()

    $scope.reviewDocuments = false;
    $scope.deleteUploadedFiles = function(fileName) {
        for(var i=0; i<$scope.review.displayDocumentsList.length; i++) {
            if ($scope.review.displayDocumentsList[i].link == fileName) {
                if(!$scope.review.deletedUploadedFiles) {
                    $scope.review.deletedUploadedFiles = [];
                }
                $scope.review.deletedUploadedFiles.push($scope.review.documents[i]);
                $scope.review.documents.splice(i,1);
                $scope.review.displayDocumentsList.splice(i,1);
                break;
            }
        }
    }

    $scope.deleteSelectedFiles = function(fileName) {
        console.log('Review Docs Selected', $scope.reviewDocuments, fileName);
        for(var i=0; i<$scope.reviewDocuments.length; i++) {
            if($scope.reviewDocuments[i].name == fileName) {
                $scope.reviewDocuments.splice(i,1);
                break;
            }
        }
    }

    $scope.isFormValid = function() {
        if ($scope.form.$error.min && $scope.form.$error.min.length) {
            return false
        } else if ($scope.form.$error.number && $scope.form.$error.number.length) {
            return false
        } else if ($scope.form.$error.required && $scope.form.$error.required.length) {
            return false
        } else if ($scope.form.$error.max && $scope.form.$error.max.length) {
            return false
        }
        return true
    }

    $scope.submitReview = function() {
        console.log($scope.review)
        $scope.isLoading = true;
        var uploadParams = {
            method: 'PUT',
            url: '/api/peerassessment/' + $scope.course._id + '/reviews/' + $scope.review._id,
            fields: $scope.review
        };
        uploadParams.file = [];
        if($scope.reviewDocuments) {
            uploadParams.file.push({'reviewDocuments':$scope.reviewDocuments});
        }

        $scope.upload = Upload.upload(
            uploadParams
            )
            .progress(function (evt) {
                if (!evt.config.file)
                    return;

                $scope.progress = parseInt(100.0 * evt.loaded / evt.total);
                // console.log("Progress", $scope.progress);
            })
            .success(function (data) {
                $scope.progress = 0;
                if (data.result) {
                    toastr.success('Successfully Saved');
                } else {
                    toastr.error(data.errors[0] || 'Failed');
                }
                $scope.isLoading = false;
                if(data.reviewId == vId) {
                    window.location.reload();
                } else {
                    window.history.replaceState({},"", '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=reviewSubmission&vId=' + data.reviewId)
                    //window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=reviewSubmission&vId=' + data.reviewId;
                    window.location.reload();
                }
            })
            .error(function (data) {
                toastr.error('Internal Server Error');
                $scope.errors = data.errors;
                $scope.progress = 0;
                $scope.isLoading = false;
            });
    }
});app.controller('ViewFeedbackController', function($scope, $http, toastr, $window, $location, ActionBarService, Upload) {
    vId = $location.search().vId;
    if(!vId) {
        return
    }

    ActionBarService.extraActionsMenu = [];

    ActionBarService.extraActionsMenu.push(
        {
            clickAction: $scope.goBack,
            title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
            aTitle: 'Back'
        },
        {
            separator: true
        },
        {
            clickAction: $scope.redirectPRHome,
            title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
            aTitle: 'Peer Review Home'
        }
    );

    var reviews
    var fetchReviews = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/reviews?rName=VFCFetchReviews&peerReviewId=' + vId;
        $http.get(url).then( function(response) {
            console.log('All Reviews', response)
            if(response.data.reviews) {
                reviews = response.data.reviews
                var oldReviewsID = []
                _.each(reviews, function(review) {
                    // handling removal of old reviews if there is a second loop review
                    if(review.oldReviewId) {
                        oldReviewsID.push(review.oldReviewId)
                    }
                });
                $scope.reviews = _.filter(reviews, function(review) {
                    if ((_.indexOf(oldReviewsID, review._id) == -1 || review.isSecondLoop) && !review.isAdminReview) {
                        return review
                    }
                    //return !review.isAdminReview
                })
                var adminReview = _.reject(reviews, function(review) {
                    return !review.isAdminReview
                })
                if(adminReview.length) {
                    var review = adminReview[0]
                    if (review.documents && review.documents.length > 0) {
                        review.displayDocumentsList = [];
                        _.each(review.documents, function (docName) {
                            console.log(docName)
                            var temp = {};
                            temp.link = window.location.origin + docName;
                            var tempArr = docName.split('/');
                            temp.name = tempArr[tempArr.length - 1];
                            review.displayDocumentsList.push(temp);
                        })
                    }
                    calculateMarks(review, $scope.reviews)
                    $scope.review = review
                }
                console.log('AdminReview', $scope.review)
            }
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        })
    }

    var calculateMarks = function(adminReview, peerreviews) {
        studentReviewPercentage = adminReview.peerReviewId.reviewSettings.studentPercentage;
        var totalMarks = 0
        _.each(peerreviews, function(review) {
            totalMarks = totalMarks + review.marksObtained
        })
        var average = totalMarks/peerreviews.length
        var studentMarks = average * studentReviewPercentage/100
        var adminMarks = adminReview.marksObtained * ((100-studentReviewPercentage)/100)
        var finalMarks = adminMarks + studentMarks
        console.log(finalMarks)
        adminReview.marksObtained = finalMarks
    }

    fetchReviews()

    $scope.openReview = function(review) {
        populateRubrics(review)
        populateDisplayDocumentList(review)
        $scope.peerReview = review

        if(review.isSecondLoop && review.oldReviewId) {
            console.log('All reviews', reviews)
            reviews.every(function(r) {
                console.log(review.oldReviewId, r._id)
                if(review.oldReviewId == r._id) {
                    console.log('Old review matched', r)
                    populateRubrics(r)
                    populateDisplayDocumentList(r)
                    $scope.firstReview = r
                    return false
                }
                return true
            })
        }
        console.log(review);
        $('#viewReviewModal').modal('show');
    }

    populateRubrics = function(review) {
        if(review.peerReviewId.reviewSettings.rubrics && review.peerReviewId.reviewSettings.rubrics.length) {
            review.rubrics = review.peerReviewId.reviewSettings.rubrics
        }
    }

    populateDisplayDocumentList = function(review) {
        if(review.documents && review.documents.length>0) {
            review.displayDocumentsList = [];
            _.each(review.documents, function(docName) {
                var temp = {};
                temp.link = window.location.origin + docName;
                var tempArr = docName.split('/');
                temp.name = tempArr[tempArr.length-1];
                review.displayDocumentsList.push(temp);
            })
        }
    }
});app.service('SolutionFilterService', function() {
    console.log('SolutionFilterService')
    var peerReview = ''

    return {
        getPeerReview: function() {
            return peerReview
        },

        setPeerReview: function(pR) {
            peerReview = pR
        }
    }
});app.controller('AddEditSolutionController', function($scope, $http, toastr, $window, Upload) {
    $scope.selSolutionDocuments = false;
    $scope.progress = 0;

    $scope.deleteUploadedFiles = function(fileName) {
        for(var i=0; i<$scope.solutionObj.displayDocumentsList.length; i++) {
            if ($scope.solutionObj.displayDocumentsList[i].link == fileName) {
                if(!$scope.solutionObj.deletedUploadedFiles) {
                    $scope.solutionObj.deletedUploadedFiles = [];
                }
                $scope.solutionObj.deletedUploadedFiles.push($scope.solutionObj.solutionDocuments[i]);
                $scope.solutionObj.solutionDocuments.splice(i,1);
                $scope.solutionObj.displayDocumentsList.splice(i,1);
                break;
            }
        }
        console.log('Check deleted Objects', $scope.solutionObj.deletedUploadedFiles, $scope.solutionObj.solutionDocuments, $scope.solutionObj.displayDocumentsList);
    }

    $scope.deleteSelectedFiles = function(fileName) {
        console.log('Review Docs Selected', $scope.selSolutionDocuments, fileName);
        for(var i=0; i<$scope.selSolutionDocuments.length; i++) {
            if($scope.selSolutionDocuments[i].name == fileName) {
                $scope.selSolutionDocuments.splice(i,1);
                break;
            }
        }
    }

    $scope.updateSolution = function(solutionObj) {
        console.log(solutionObj);
        console.log('dsadasdas',$scope.solutionObj)
        var params = {
            //isSubmitted: true,
            studentComments: solutionObj.studentComments,
            solutionDocuments: solutionObj.solutionDocuments,
            deletedUploadedFiles: solutionObj.deletedUploadedFiles
        }
        $scope.isLoading = true;
        var uploadParams = {
            method: 'PUT',
            url: '/api/peerassessment/' + $scope.$parent.course._id + '/peerreviews/' + solutionObj.peerReviewId + '/solutions/' + solutionObj._id,
            fields: params
        };
        uploadParams.file = [];
        if($scope.selSolutionDocuments) {
            uploadParams.file.push({'selSolutionDocuments':$scope.selSolutionDocuments});
        }

        $scope.upload = Upload.upload(
            uploadParams
            )
            .progress(function (evt) {
                if (!evt.config.file)
                    return;

                $scope.progress = parseInt(100.0 * evt.loaded / evt.total);
                // console.log("Progress", $scope.progress);
            })
            .success(function (data) {

                $scope.progress = 0;
                if (data.result) {
                    toastr.success('Successfully Saved');
                } else {
                    toastr.error('Updating Solution Failed');
                }
                $scope.isLoading = false;
                $('#addEditSolutionModal').modal('hide');

                window.location.reload();
            })
            .error(function (data) {
                toastr.error('Updating Solution Failed');
                $scope.errors = data.errors;
                $scope.progress = 0;
                $scope.isLoading = false;
            });
    }
});app.controller('SolutionsController', function($scope, $location, $http, toastr, ActionBarService, SolutionFilterService) {
    var solutions = null;
    $scope.filteredSolutions = null;
    $scope.peerReviewList = null;
    $scope.filterCondition = '';
    $scope.filterCondition = SolutionFilterService.getPeerReview()
    console.log('FilterCondition: ', $scope.filterCondition)
    if($scope.vName) {
        ActionBarService.extraActionsMenu = [];
        ActionBarService.extraActionsMenu.push(
            {
                clickAction: $scope.goBack,
                title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
                aTitle: 'Back'
            },
            {
                separator: true
            },
            {
                clickAction: $scope.redirectPRHome,
                title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
                aTitle: 'Peer Review Home'
            }
        );
    }

    $scope.requestData = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/solutions';
        $http.get(url).then( function(response) {
            if(response.data.solutions && response.data.solutions.length) {
                $scope.peerReviewList = _.pluck(response.data.solutions, 'peerReviewId')
                $scope.peerReviewList = _.without($scope.peerReviewList, null, undefined)
                console.log('PeerReviewList', $scope.peerReviewList)
                $scope.peerReviewList = _.uniq($scope.peerReviewList, function(p) {return p._id})
                $scope.peerReviewList.push({_id: '', title: 'No Filter'})
                solutions = response.data.solutions;
                console.log('Solutions', solutions);
                if($scope.filterCondition != '') {
                    var matched = false;
                    _.each($scope.peerReviewList, function(pr) {
                        if(pr._id == $scope.filterCondition) {
                            matched = true
                        }
                    })
                    if(!matched) {
                        SolutionFilterService.setPeerReview('')
                        $scope.filterCondition = SolutionFilterService.getPeerReview()
                    }
                }
                $scope.filter()
            }
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        });
    }

    $scope.filter = function() {
        console.log('FilteredSolutions: ', $scope.filterCondition)
        if($scope.filterCondition == '') {
            console.log('Null')
            SolutionFilterService.setPeerReview('')
            $scope.filteredSolutions = solutions
        } else {
            console.log('Not null')
            SolutionFilterService.setPeerReview($scope.filterCondition)
            $scope.filteredSolutions = _.filter(solutions, function(solution) {
                return solution.peerReviewId._id == $scope.filterCondition
            })
        }
    }

    $scope.deleteSolution = function() {
        var url = '/api/peerassessment/' + $scope.course._id + '/solutions/' + $scope.deleteSolutionId;
        $http.delete(url).then( function(response) {
            if(response && response.data.result) {
                if ($location.search().vId) {
                    window.document.location = '#/cid/' + $scope.course._id + '?tab=peerAssessment&vName=viewSolutionsList';
                    window.location.reload();
                    //$location.search('vName', 'viewSolutionsList');
                    //$location.search('vId', '');
                } else {
                    window.location.reload();
                }
            }
            // if you want to do it with ajax check the logic of deleting peer reviews in Peer Review controller
        }, function(err) {
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        });

        $('#confirmDeleteAssignmentModal').modal('hide');
    }

    if($scope.course && $scope.course._id) {
        $scope.requestData();
    } else {
        console.log('Course not initialized');
    }
});app.controller('ViewSolutionController', function($scope, $location, $http, toastr, ActionBarService) {
    $scope.vId = $location.search().vId;
    if($scope.vName && $scope.vId) {
        ActionBarService.extraActionsMenu = [];
        ActionBarService.extraActionsMenu.push(
            {
                clickAction: $scope.goBack,
                title: '<i class="ionicons ion-arrow-return-left"></i> &nbsp; BACK',
                aTitle: 'Back'
            },
            {
                separator: true
            },
            {
                clickAction: $scope.redirectPRHome,
                title: '<i class="ionicons ion-home"></i> &nbsp; PEER REVIEWS HOME',
                aTitle: 'Peer Review Home'
            }
        );
        var url = '/api/peerassessment/' + $scope.course._id + '/solutions/' + $scope.vId;
        $http.get(url).then( function(response) {
            console.log('response', response);
            if(response.data.solution) {
                var solution = response.data.solution;
                if(solution.solutionDocuments && solution.solutionDocuments.length>0) {
                    solution.displayDocumentsList = [];
                    _.each(solution.solutionDocuments, function(docName) {
                        var temp = {};
                        temp.link = window.location.origin + docName;
                        var tempArr = docName.split('/');
                        temp.name = tempArr[tempArr.length-1];
                        solution.displayDocumentsList.push(temp);
                    })
                }
                $scope.solution = solution;
                if($scope.isAdmin || $scope.isManager || $scope.isOwner) {
                    // for openAddEditSolutionModal to know that it has been called from this path
                    $scope.solution.path = 'solutionList';
                    ActionBarService.extraActionsMenu.push(
                        {
                            separator: true
                        },
                        {
                            clickAction: $scope.openAddEditSolutionModal,
                            clickParams: $scope.solution,
                            title: '&nbsp;&nbsp; <i class="ionicons ion-edit"></i> &nbsp; EDIT',
                            aTitle: 'Edit Solution'
                        },
                        {
                            clickAction: $scope.openDeleteSolutionConfirmationModal,
                            clickParams: $scope.solution._id,
                            title: '&nbsp;&nbsp; <i class="ionicons ion-ios-trash"></i> &nbsp; DELETE',
                            aTitle: 'Delete Solution'
                        },
                        {
                            separator: true
                        },
                        {
                            clickAction: $scope.giveFeedback,
                            clickParams: $scope.solution._id,
                            title: '&nbsp;&nbsp; <i class="ionicons ion-checkmark-circled"></i> &nbsp; FEEDBACK',
                            aTitle: 'Feedback'
                        }
                    );
                }
            }
        }, function(err){
            // Check for proper error message later
            toastr.error('Internal Server Error. Please try again later.');
        })
    }
});app.controller('FavoritesController', function ($rootScope, $scope, $http) {

  $scope.favorites = null;

  var loadFavorites = function () {
    $http.get('/api/favorites').then(
      function (result) {
        $scope.favorites = result.data;
      },
      function () {
        $scope.favorites = null;
      });
  };

  var favListener = $rootScope.$on('favorites.update', function () {
    loadFavorites();
  });

  loadFavorites();

  $scope.$on('$destroy', favListener);
});;app.controller('HomePageController', function ($scope, $http, $rootScope,
                                               $sce, Page, collapseService, $timeout) {
    $scope.hideSlider = false;
    $scope.isRequesting = false;
    $scope.widgets = [];
    Page.setTitleWithPrefix('Home');

    $scope.collapseStatus = {};
    $scope.nodeChildrens = {};
    $scope.firstloaded = true;

    $(document).ready(function () {
        if (typeof(localStorage) !== "undefined") {
            // Code for localStorage/sessionStorage.
            if (localStorage.hideSlider) {
                $scope.hideSlider = localStorage.hideSlider;
            }
        }

        $scope.width = jQuery(window).width();
        $scope.height = jQuery(window).height();
        $scope.center = {x: $scope.width / 2, y: ($scope.height / 2) - 100};
    });

    /**
     * get all categories, recursived on the server
     */
    $http.get('/api/categories').success(function (data) {
        if (data.categories) {
            $scope.categories = data.categories;
        }
        else
            $scope.categories = false;
    });

    $scope.setHideSlider = function () {
        $scope.hideSlider = true;
        if (typeof(localStorage) !== "undefined")
            localStorage.hideSlider = true;
    };

    $scope.$watch('hideSlider', function () {
        if ($scope.hideSlider) {
            //$scope.initJSPlumb();
        }
    });

    $scope.$on('jsTreeInit', function (ngRepeatFinishedEvent) {
        $scope.initJSPlumb();
    });

    $scope.initJSPlumb = function () {
        Tree.init(Canvas.w, Canvas.h);

        var instance = jsPlumb.getInstance({
            Endpoint: ["Blank", {radius: 2}],
            HoverPaintStyle: {strokeStyle: "#3C8DBC", lineWidth: 2},
            PaintStyle: {strokeStyle: "#3C8DBC", lineWidth: 2},
            ConnectionOverlays: [],
            Container: "category-map"
        });

        // so the ejs can access this instance
        $rootScope.initDraggable(instance);

        // initialise all '.w' elements as connection targets.
        instance.batch(function () {
            /* connect center to first level cats recursively*/
            $scope.interConnect('center', $scope.categories, instance);

            /*blanket on click to close dropdown menu*/
            $scope.initDropDownMenuHybrid();
        });

        $timeout(function () {
            $scope.firstCollapse($scope.categories);
            $scope.getCollapseDataFromLStorage();

            $scope.initiateCollapse();
            jQuery('.tree-container').css('visibility', 'visible');
        });
    };

    $scope.initDropDownMenuHybrid = function () {
        $(document).on('click', function (event) {
            var target = $(event.target);
            var k = target.parents('div');
            if (k.hasClass('ui-draggable')) {
                return false;
            }

            if ($('.open').length > 0) {
                $('.open').removeClass('open');
                return false;
            }
        });
    };

    $scope.initDropDown = function (slug) {
        $('#' + slug)
            .on('click mousedown mouseup touchstart', function (event) {
                if ($(this).find('ul').hasClass('open')) {
                    if ($(this).find('li').hasClass('goto-button')) {
                        return true;
                    }

                    $('.open').removeClass('open');
                    return false;
                }

                $('.open').not($(this).parents('ul')).removeClass('open');
                $(this).find('ul').addClass('open');

                if (event.type == 'touchstart') {
                    $http.get('/api/server-widgets/category-homepage/?slug=' + slug).success(
                        function (res) {
                            if (res.result) {
                                $scope.widgets[slug] = $sce.trustAsHtml(res.widgets);
                            }
                        }
                    );
                }

                return false;
            })
            .on('mouseenter', function () {
                $http.get('/api/server-widgets/category-homepage/?slug=' + slug).success(
                    function (res) {
                        if (res.result) {
                            $scope.widgets[slug] = $sce.trustAsHtml(res.widgets);
                        }
                    }
                );
            });
    };

    $scope.interConnect = function (parent, categories, instance) {
        for (var i in categories) {
            var child = categories[i];

            $scope.initDropDown(child.slug);

            var conn = instance.connect({
                source: parent, target: child.slug,
                anchors: [
                    ["Perimeter", {shape: jsPlumb.getSelector('#' + parent)[0].getAttribute("data-shape")}],
                    ["Perimeter", {shape: jsPlumb.getSelector('#' + child.slug)[0].getAttribute("data-shape")}]
                ],
                connector: ["Bezier", {curviness: 5}]
            });

            $(conn.connector.canvas).attr('data-source', parent);
            $(conn.connector.canvas).attr('data-target', child.slug);

            if (child.subCategories) {
                $scope.interConnect(child.slug, child.subCategories, instance);
            }
        }

    };

    $scope.goToDetail = function (categorySlug) {
        window.location.href = "/courses/#/category/" + categorySlug;
    };

    $scope.firstCollapse = function (categories) {
        if (!$scope.firstloaded)
            return;

        $scope.firstloaded = false;
        for (var i = 0; i < categories.length; i++) {
            var child = categories[i];

            $scope.getChildLength(child._id, 0, child);
        }

        // collapse on first level
        for (var j in $scope.nodeChildrens[1]) {
            var totalKids = $scope.nodeChildrens[1][j];
            if (totalKids > 0) {
                collapseService.setCollapseFirst(j);
                $scope.collapseStatus[j] = true;
            } else {
                collapseService.setExpandFirst(j);
                $scope.collapseStatus[j] = false;
            }
        }
    };

    $scope.initiateCollapse = function () {
        for (var i in collapseService.collapsed) {
            var colEl = 't' + collapseService.collapsed[i];
            $scope.collapse(colEl, true);
        }
    };

    $scope.getCollapseDataFromLStorage = function () {
        if (typeof(localStorage) == "undefined")
            return;

        for (var i in localStorage) {
            var collData = localStorage[i];
            if (i.indexOf("collapse") > -1) {
                var _id = i.split('.');
                _id = _id[1];
                collData = parseInt(collData);
                if (collData) {
                    collapseService.setCollapse(_id);
                    $scope.collapseStatus[_id] = true;
                }
                else {
                    collapseService.setExpand(_id);
                    $scope.collapseStatus[_id] = false;
                }
            }
        }
    };

    $scope.getChildLength = function (nid, level, categories) {

        if ($scope.nodeChildrens[level] == undefined) {
            $scope.nodeChildrens[level] = {};
        }

        if ($scope.nodeChildrens[level][nid] == undefined) {
            $scope.nodeChildrens[level][nid] = 0;
        }

        var add = 0;
        if (categories.subCategories && categories.subCategories.length > 0)
            add = 1;

        $scope.nodeChildrens[level][nid] += add;

        if (level > 1) {
            if ($scope.nodeChildrens[level][nid] > 0) {
                collapseService.setCollapseFirst(nid);
                $scope.collapseStatus[nid] = true;
            }
        }

        if (categories.subCategories && categories.subCategories.length > 0) {
            level++;
            for (var e in categories.subCategories) {
                var ch = categories.subCategories[e];
                $scope.getChildLength(ch._id, level, ch);
            }
        }
    };

    var found = false;
    $scope.findNode = function (obj, col, searchKey, searchValue) {
        if (found)
            return found;

        for (var i in obj) {
            var tn = obj[i];

            if (tn[searchKey] && tn[searchKey] == searchValue) {
                found = tn;
                return tn;
            }
            else if (tn[col] && tn[col].length > 0) {
                // search again
                $scope.findNode(tn[col], col, searchKey, searchValue);
            }
        }

        if (found)
            return found;
    };

    $scope.collapse = function (el, isInit) {
        var nodeId = el.substring(1);

        found = false;
        var pNode = $scope.findNode($scope.categories, 'subCategories', '_id', nodeId);
        if (pNode) {
            var hide = false;

            if (isInit === true)
                hide = collapseService.isCollapsed(nodeId);
            else
                hide = collapseService.toggle(nodeId);

            if (hide === false) {
                $scope.collapseStatus[nodeId] = false;
                $('#' + el).addClass('aborted');
                collapseService.affectVisualCat(false, pNode, pNode.slug);
            }
            else if (hide >= 0 || hide == true) {
                $scope.collapseStatus[nodeId] = true;
                collapseService.affectVisualCat(true, pNode, pNode.slug);
                $('#' + el).removeClass('aborted');
            }

        }
    };
});
;app.controller('LoginPageController', function ($scope, $http, $rootScope, $cookies, authService, toastr, $location) {
    $scope.rememberMe = false;
    $scope.loginData = {};
    $scope.errors = [];
    $scope.user = null;
    $scope.referer = false;
    $scope.isLoading = false;

    authService.loginCheck(function (user) {
        $scope.user = user;
        if ($scope.user) {
            window.location = '/accounts';
        }
    });

    if ($cookies.rememberMe) {
        $scope.rememberMe = $cookies.rememberMe;
    }

    $scope.$watch('rememberMe', function (newVal, oldVal) {
        if (newVal !== oldVal) {
            $cookies.rememberMe = $scope.rememberMe;
        }
    });

    $scope.noticeAfterSignUp = function () {
        var k = $location.search();
        if (k.referer && k.referer == 'signUp' && k.result && k.result == 'success') {
            toastr.success('Please login using your new username and password!', 'Sign Up Success');
        }
    };

    $scope.noticeAfterSignUp();

    $scope.login = function (isValid) {
        if (isValid) {
            $scope.isLoading = true;
            authService.login($scope.loginData,
                function (user) {
                    $scope.user = user;
                    if (!$scope.referer) {
                        window.location = '/accounts';
                    }

                    $scope.isLoading = false;
                },
                function error(data) {
                    if (data.errors) {
                        $scope.errors = data.errors;
                    }
                    $scope.isLoading = false;
                }
            );
        }
    }

});;app.controller('MainController', function($scope, Page) {
    $scope.Page = Page;
});
;app.controller('MainMenuController', function ($scope, $http, $rootScope, $cookies, authService, toastr) {
    $scope.rememberMe = false;
    $scope.loginData = {};
    $scope.errors = [];
    $scope.user = null;
    $scope.referer = false;
    $scope.isLoading = false;

    authService.loginCheck(function (user) {
        $scope.user = user;
    });

    if ($cookies.rememberMe) {
        $scope.rememberMe = $cookies.rememberMe;
    }

    $scope.$watch('rememberMe', function (newVal, oldVal) {
        if (newVal !== oldVal) {
            $cookies.rememberMe = $scope.rememberMe;
        }
    });

    $scope.login = function (isValid) {
        if (isValid) {
            $scope.isLoading = true;
            authService.login($scope.loginData,
                function (user) {
                    $scope.user = user;
                    toastr.success('', "You're now logged in!");
                    $scope.isLoading = false;

                    window.location.reload();
                },
                function error(data) {
                    if (data.errors) {
                        $scope.errors = data.errors;
                        $scope.isLoading = false;
                    }
                }
            );
        }
    }

});;app.controller('ActionBarController', function($scope, ActionBarService, $sce, $compile) {
    $scope.extraActionsMenu = [];

    $scope.$watch(function(){
        return ActionBarService.extraActionsMenu;
    },
        function (newValue) {
            $scope.extraActionsMenu = ActionBarService.extraActionsMenu;
        });
});;app.service('ActionBarService', function() {
    this.extraActionsMenu = [];
});;app.controller('SearchBoxController', function ($scope, $http, $location, $rootScope, $routeParams) {

    var isAdvancedSearch = function () {
        var containsSearchPath = $location.absUrl().includes('/search');
        return containsSearchPath;
    }

    $scope.showQuickSearchResults = function () {
        var str = $scope.queryText;
        var isQueryValid = (!str || /^\s*$/.test(str)) == false;
        return isQueryValid && !isAdvancedSearch();
    };

    $scope.hasResults = function () {
        var r = $scope.result;
        return r != null && (
                r.categories.length > 0 ||
                r.courses.length > 0 ||
                r.videoAnnotations.length > 0 ||
                r.pdfAnnotations.length > 0 ||
                r.contentNodes.length > 0 ||
                r.extResources.length > 0
            );
    };

    $scope.openAdvancedSearch = function () {
        window.location.href = '/search?term=' + $scope.queryText;
    };

    $scope.$watch('queryText', function (searchTerm) {

        $rootScope.$broadcast('searchQueryChanged', {
            state: searchTerm
        });

        // Do not show the search hints
        // when advanced search page is open
        if (!searchTerm || searchTerm.length == 0 || isAdvancedSearch()) {
            $scope.result = null;
            return;
        }

        if (searchTerm === $scope.queryText) {
            $http.get('/api/search?term=' + searchTerm)
                .success(function (data) {
                    $scope.result = data;
                });
        }
    });

    var getParameterByName = function (name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    };

    var init = function () {
        try {

            $scope.queryText = getParameterByName('term', $location.absUrl());
        }
        catch (e) {
            //ignore
        }
    };

    init();
});;app.controller('SignUpController', function($scope, $http, $rootScope, $cookies, authService) {

    $scope.loginData = {};
    $scope.errors = [];
    $scope.isLoading = false;

    authService.loginCheck(function(user){
        if(user){
            window.location = '/accounts';
        }
    });

    $scope.signUp = function(isValid){
        if(isValid){
            $scope.isLoading = true;
            authService.signUp($scope.loginData,
                function(user){
                    $scope.isLoading = false;
                    window.location = '/accounts/login/#?referer=signUp&result=success';
                },
                function error(data) {
                    if(data.errors){
                        $scope.errors = data.errors;
                    }
                    $scope.isLoading = false;
                }
            );
        }
    }

});;app.controller('staticController', function($scope, $http, $rootScope) {

});
app.controller('aboutController', function($scope, $http, $rootScope, Page) {
    Page.setTitleWithPrefix('About CourseMapper');
});;app.controller('UserEditController', function ($scope, $http, $rootScope, $timeout, authService, toastr) {
    $scope.user = {};
    $scope.formData = {};
    $scope.errors = null;

    $scope.$on('onAfterInitUser', function (event, user) {
        $scope.user = user;
        $scope.formData.displayName = $scope.user.displayName;
    });

    $scope.saveEditUser = function () {
        if ($scope.user.displayName)
            $scope.formData.displayName = $scope.user.displayName;

        if ($scope.formData.password) {
            if ($scope.formData.password != $scope.formData.passwordConfirm) {
                $scope.errors = ['Password and password confirmation does not match.'];
                return;
            }
        }

        var d = transformRequest($scope.formData);
        $http({
            method: 'PUT',
            url: '/api/account/' + $scope.user._id,
            data: d, // pass in data as strings
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .success(function (data) {
                if (data.result) {
                    $scope.$emit('init');
                    authService.loginCheck(function (user) {
                        $scope.user = user;
                        $timeout(function () {
                            $scope.$apply();
                            $('.user-image').attr('src', $scope.user.image);
                        });
                    });

                    $scope.formData.password = '';
                    $scope.formData.passwordConfirm = '';
                    $scope.formData.oldPassword = '';

                    toastr.success('Your profile is updated');

                    $('#editAccountModal').modal('hide');
                }
            })
            .error(function (data) {
                if (!data.result) {
                    $scope.errors = data.errors;
                }
            });
    };

    $scope.cancel = function () {
        $('#editAccountModal').modal('hide');
    }

});
;app.controller('widgetCourseAnalyticsController', function ($scope, $http, $rootScope,
                                                            $timeout, toastr,
                                                            widgetService, courseService, authService) {
    $scope.location = "course-analytics";
    $scope.widgets = [];

    $scope.getWidgets = function (force) {
        widgetService.getWidgetsOnLocation($scope.location, $scope.course._id,

            function (widgets) {
                $scope.widgets = widgets;
                $rootScope.$broadcast('onAfterGetWidgets' + $scope.location, widgets);
            },

            function (errors) {
                toastr.error(errors);
            },

            force
        );
    };

    $scope.closeWidget = function (id) {
        widgetService.uninstall(id, {courseId: $scope.course._id},
            function (wdg) {
                var grid = $('#' + $scope.location + '-widgets').data('gridstack');
                grid.removeAll();
                $scope.getWidgets(true);
                toastr.success('Widget is uninstalled');
            },

            function (errors) {
                toastr.error('Uninstallation failed');
            }
        );
    };

    $scope.setupInstallmentWatch = function () {
        var onafter = 'onAfterInstall' + $scope.location;
        $scope.$on(onafter, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });

        var onafter2 = 'onAfterUninstall' + $scope.location;
        $scope.$on(onafter2, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });
    };

    $scope.initWidgets = function () {

        if (courseService.course) {
            $scope.course = courseService.course;
            $scope.getWidgets();

        } else {
            $scope.$on('onAfterInitCourse', function (e, course) {
                $scope.course = course;
                $scope.getWidgets();
            });
        }

        var enableDragging = ($scope.isManager || authService.isAdmin() || $scope.isOwner) ? true : false;
        widgetService.initiateDraggableGrid($scope.location, enableDragging);

        $scope.setupInstallmentWatch();
    };

    $scope.initWidgetButton = function (id) {
        widgetService.initWidgetButton($scope.location, id)
    };

    $scope.checkOwnership = function (userId) {
        if (authService.user && authService.user._id == userId)
            return true;

        if ($scope.isManager || authService.isAdmin())
            return true;

        return false;
    };

    $scope.initWidgets();

    $scope.$on('afterAllWidgetsRendered', function () {
        widgetService.initiateDragStop($scope.location);
    });
});
;app.controller('widgetCoursePreviewController', function ($scope, $http, $rootScope,
                                                          $timeout, toastr,
                                                          widgetService, courseService, authService) {
    $scope.location = "course-preview";
    $scope.widgets = [];

    $scope.getWidgets = function (force) {
        widgetService.getWidgetsOnLocation($scope.location, $scope.course._id,

            function (widgets) {
                $scope.widgets = widgets;
                $rootScope.$broadcast('onAfterGetWidgets' + $scope.location, widgets);
            },

            function (errors) {
                toastr.error(errors);
            },

            force
        );
    };

    $scope.closeWidget = function (id) {
        widgetService.uninstall(id, {courseId: $scope.course._id},
            function (wdg) {
                var grid = $('#' + $scope.location + '-widgets').data('gridstack');
                grid.removeAll();
                $scope.getWidgets(true);
                toastr.success('Widget is uninstalled');
            },

            function (errors) {
                toastr.error('Uninstallation failed');
            }
        );
    };

    $scope.setupInstallmentWatch = function () {
        var onafter = 'onAfterInstall' + $scope.location;
        $scope.$on(onafter, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });

        var onafter2 = 'onAfterUninstall' + $scope.location;
        $scope.$on(onafter2, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });
    };

    $scope.initWidgets = function () {

        if (courseService.course) {
            $scope.course = courseService.course;
            $scope.getWidgets();

        } else {
            $scope.$on('onAfterInitCourse', function (e, course) {
                $scope.course = course;
                $scope.getWidgets();
            });
        }

        var enableDragging = ($scope.isManager || authService.isAdmin() || $scope.isOwner) ? true : false;
        widgetService.initiateDraggableGrid($scope.location, enableDragging);

        $scope.setupInstallmentWatch();
    };

    $scope.initWidgetButton = function (id) {
        widgetService.initWidgetButton('course-preview', id)
    };

    $scope.checkOwnership = function (userId) {
        if (authService.user && authService.user._id == userId)
            return true;

        if ($scope.isManager || authService.isAdmin())
            return true;

        return false;
    };
 
    $scope.$on('afterAllWidgetsRendered', function () {
        widgetService.initiateDragStop($scope.location);
    });

    $scope.initWidgets();
});
;app.controller('WidgetGalleryController', function ($scope, $http, $rootScope, toastr, widgetService) {
    $scope.location = "";
    $scope.installedWidgets;
    /**
     * get widgets store data from the server
     */
    $scope.initData = function (location) {
        $scope.location = location;

        $http.get('/api/widgets/' + location).success(function (data) {
            $scope.widgets = data.widgets;
        });
    };

    $scope.$watch('location', function (newVal, oldVal) {
        var onafter = 'onAfterGetWidgets' + $scope.location;
        $scope.$on(onafter, function (event, installedWidgets) {
            $scope.installedWidgets = installedWidgets;
        });

        var onCloseButtonClicked = 'onAfterCloseButtonClicked' + $scope.location;
        $scope.$on(onCloseButtonClicked, function (event, widget) {
            $scope.uninstall(widget._id);
        });
    });

    $scope.isInstalled = function (widgetId) {
        if ($scope.installedWidgets) {
            var isInstalled = _.find($scope.installedWidgets, {widgetId: {_id: widgetId}});
            return isInstalled;
        }

        return false;
    };

    $scope.install = function (location, application, name, extraParams) {

        widgetService.install(location, application, name, extraParams,

            function (installedWidget) {
                $scope.installedWidget = installedWidget;

                // hide the widget gallery
                $('#widgetGallery').modal('hide');
                $('#widgetGalleryAnalytics').modal('hide');
                toastr.success('Widget is installed');

                $rootScope.$broadcast('onAfterInstall' + location, $scope.installedWidget);
            },

            function (errors) {
                toastr.error('Installation failed');
            }
        );
    };

    $scope.uninstall = function (installId) {

        widgetService.uninstall(installId, {},
            function (uninstalled) {
                $scope.uninstalledWidget = uninstalled;

                // hide the widget gallery
                $('#widgetGallery').modal('hide');
                $('#widgetGalleryAnalytics').modal('hide');
                toastr.success('Widget is uninstalled');

                $rootScope.$broadcast('onAfterUninstall' + uninstalled.location, $scope.uninstalledWidget);
            },
            function (errors) {
                toastr.error('Uninstallation failed');
            }
        );
    };

});
;app.controller('widgetNodeAnalyticsController', function ($scope, $http, $rootScope,
                                                          $timeout, toastr,
                                                          widgetService, courseService, authService) {
    $scope.location = "node-analytics";
    $scope.widgets = [];

    $scope.getWidgets = function (force) {
        widgetService.getWidgetsOnLocation($scope.location, $scope.treeNode._id,

            function (widgets) {
                $scope.widgets = widgets;
                $rootScope.$broadcast('onAfterGetWidgets' + $scope.location, widgets);
            },

            function (errors) {
                toastr.error(errors);
            },

            force
        );
    };

    $scope.closeWidget = function (id) {
        widgetService.uninstall(id, {courseId: $scope.course._id},
            function (wdg) {
                var grid = $('#' + $scope.location + '-widgets').data('gridstack');
                grid.removeAll();
                $scope.getWidgets(true);
                toastr.success('Widget is uninstalled');
            },

            function (errors) {
                toastr.error('Uninstallation failed');
            }
        );
    };

    $scope.setupInstallmentWatch = function () {
        var onafter = 'onAfterInstall' + $scope.location;
        $scope.$on(onafter, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });

        var onafter2 = 'onAfterUninstall' + $scope.location;
        $scope.$on(onafter2, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });
    };

    $scope.initWidgets = function () {

        if (courseService.course) {
            $scope.course = courseService.course;
            $scope.getWidgets();

        } else {
            $scope.$on('onAfterInitCourse', function (e, course) {
                $scope.course = course;
                $scope.getWidgets();
            });
        }

        var enableDragging = ($scope.isManager || authService.isAdmin() || $scope.isOwner) ? true : false;
        widgetService.initiateDraggableGrid($scope.location, enableDragging);

        $scope.setupInstallmentWatch();
    };

    $scope.initWidgetButton = function (id) {
        widgetService.initWidgetButton($scope.location, id)
    };

    $scope.checkOwnership = function (userId) {
        if (authService.user && authService.user._id == userId)
            return true;

        if ($scope.isManager || authService.isAdmin())
            return true;

        return false;
    };

    $scope.initWidgets();

    $scope.$on('afterAllWidgetsRendered', function () {
        widgetService.initiateDragStop($scope.location);
    });
});
;app.controller('profileWidgetController', function ($scope, $http, $rootScope, $ocLazyLoad, $timeout, widgetService, toastr) {
    $scope.location = "user-profile";
    $scope.widgets = [];
    $scope.widgetsTemp = [];
    $scope.dragInitiated = false;

    $scope.initWidgetButton = function (id) {
        widgetService.initWidgetButton($scope.location, id)
    };

    $scope.initWidgets = function () {
        $scope.getWidgets();
        widgetService.initiateDraggableGrid($scope.location, true);
        $scope.setupInstallmentWatch();
    };

    $scope.$on('onAfterInitUser', function (event, user) {
        $scope.initWidgets(true);
    });

    $scope.setupInstallmentWatch = function () {
        var onafter = 'onAfterInstall' + $scope.location;
        $scope.$on(onafter, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });

        var onafter2 = 'onAfterUninstall' + $scope.location;
        $scope.$on(onafter2, function (event, newWidget) {
            // remove all widget in the page
            var grid = $('#' + $scope.location + '-widgets').data('gridstack');
            grid.removeAll();

            $scope.getWidgets(true);
        });
    };

    $scope.getWidgets = function (force) {
        widgetService.getWidgetsOnLocation($scope.location, $rootScope.user._id,

            function (widgets) {
                $scope.widgets = widgets;
                $rootScope.$broadcast('onAfterGetWidgets' + $scope.location, widgets);
            },

            function (errors) {
                toastr.error(errors);
            },

            force
        );
    };

    $scope.closeWidget = function (id) {

        widgetService.uninstall(id, {},
            function (uninstalled) {
                $scope.uninstalledWidget = uninstalled;

                // hide the widget gallery
                $('#widgetGallery').modal('hide');
                $('#widgetGalleryAnalytics').modal('hide');
                toastr.success('Widget is uninstalled');

                $rootScope.$broadcast('onAfterUninstall' + uninstalled.location, $scope.uninstalledWidget);
            },
            function (errors) {
                toastr.error('Uninstallation failed');
            }
        );
    };

    $scope.$on('afterAllWidgetsRendered', function () {
        if(!$scope.dragInitiated)
            widgetService.initiateDragStop($scope.location);

        $scope.dragInitiated = true;
    });

});
