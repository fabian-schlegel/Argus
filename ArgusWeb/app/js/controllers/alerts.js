/*! Copyright (c) 2016, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 *      Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 *      Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *
 *      Neither the name of Salesforce.com nor the names of its contributors may be used to endorse or promote products derived from this software
 *      without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */
'use strict';

angular.module('argus.controllers.alerts', ['ngResource'])
.controller('Alerts', ['Auth', '$scope', 'growl', 'Alerts', '$sessionStorage', 'TableListService', function (Auth, $scope, growl, Alerts, $sessionStorage, TableListService) {

    $scope.colName = {
        id:'ID',
        name:'Name',
        cronEntry:'CRON Entry',
        createdDate:'Created',
        modifiedDate:'Last Modified',
        ownerName:'Owner',
        state: "State"
    };
    $scope.properties = {
        title: "Alert",
        type: "alerts"
    };
    $scope.tabNames = {
        firstTab: Auth.getUsername() + "'s Alerts",
        secondTab: 'Shared Alerts'
    };
    $scope.alerts = [];
    $scope.alertsLoaded = false;

    var alertLists = {
        sharedList: [],
        usersList: []
    };
    var remoteUsername = Auth.getUsername();


    $scope.getAlerts = function (shared ) {
        if ($scope.alertsLoaded) {
            $scope.alerts = shared? alertLists.sharedList: alertLists.usersList;
        }
        $sessionStorage.alerts.shared = shared;
    };

    function setAlertsAfterLoading (alerts, shared) {
        alertLists.sharedList = TableListService.getListUnderTab(alerts, true, remoteUsername);
        alertLists.usersList = TableListService.getListUnderTab(alerts, false, remoteUsername);
        $scope.alertsLoaded = true;
        $scope.getAlerts(shared);
    }

    function getNewAlerts () {
        Alerts.getMeta().$promise.then(function(alerts) {
            setAlertsAfterLoading(alerts, $scope.shared);
            $sessionStorage.alerts.cachedData = alerts;
        });
    }

	$scope.refreshAlerts = function () {
        delete $sessionStorage.alerts.cachedData;
        delete $scope.alerts;
        $scope.alertsLoaded = false;
        getNewAlerts();
	};

    $scope.addAlert = function () {
        var alert = {
            name: 'new-alert-' + Date.now(),
            expression: "-1h:scope:metric{tagKey=tagValue}:avg",
            cronEntry: "0 */4 * * *"
        };
        Alerts.save(alert, function (result) {
            // update both scope and session alerts
            result.expression = "";
            alertLists = TableListService.addItemToTableList(alertLists, 'alerts', result, remoteUsername);
            $scope.getAlerts($scope.shared);
            growl.success('Created "' + alert.name + '"');
        }, function (error) {
            growl.error('Failed to create "' + alert.name + '"');
        });
    };

    $scope.removeAlert = function (alert) {
        Alerts.delete({alertId: alert.id}, function (result) {
            alertLists = TableListService.deleteItemFromTableList(alertLists, 'alerts', alert, remoteUsername);
            $scope.getAlerts($scope.shared);
            growl.success('Deleted "' + alert.name + '"');
        }, function (error) {
            growl.error('Failed to delete "' + alert.name + '"');
        });
    };

    $scope.enableAlert = function (alert, enabled) {
        if (alert.enabled !== enabled) {
            Alerts.get({alertId: alert.id}, function(updated) {
                updated.enabled = enabled;
                Alerts.update({alertId: alert.id}, updated, function (result) {
                    alert.enabled = enabled;
                    $sessionStorage.cachedAlerts = $scope.alerts;
                    growl.success((enabled ? 'Enabled "' : 'Disabled "') + alert.name + '"');
                }, function (error) {
                    growl.error('Failed to ' + (enabled ? 'enable "' : 'disable "') + alert.name + '"');
                });
            });
        }
    };

    if ($sessionStorage.alerts === undefined) $sessionStorage.alerts = {};
    if ($sessionStorage.alerts.cachedData !== undefined && $sessionStorage.alerts.shared !== undefined) {
        var alerts = $sessionStorage.alerts.cachedData;
        setAlertsAfterLoading(alerts, $sessionStorage.alerts.shared);
    } else {
        getNewAlerts();
    }


}]);
