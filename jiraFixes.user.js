// ==UserScript==
// @name           Some minor fixes for JIRA
// @namespace      https://github.com/talmuth/jiraFixes.user.js
// @description    Some minor fixes for JIRA
// @include        http://jira.odesk.com/*
// @updateURL      http://bit.ly/bpa-ag-jira-js-tweaks-v2
// @version        0.13.0
// @require        https://gist.github.com/BrockA/2625891/raw/waitForKeyElements.js
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js
// @resource       UI_CSS http://bit.ly/bpa-ag-jira-css-for-usersript
// @grant          GM_addStyle
// @grant          GM_getResourceText
// ==/UserScript==

(function() {
    /* global waitForKeyElements */
    /* global GH */
    /* global AJS */

    GM_addStyle(GM_getResourceText("UI_CSS"));

    GH.formatHours = function(seconds) {
        var d = seconds / 3600 / 8,
            h = Math.round(8 * (d - Math.floor(d)));

        return Math.floor(d) + ' days' + (h > 0 ? ' ' + h + ' hours':'');
    };

    GH = GH || {};
    GH.SwimlaneView = GH.SwimlaneView || {};

    GH.SwimlaneView.renderEstimates = function(swimlaneId) {
        var $swimlane = $("#ghx-pool").find('.ghx-swimlane[swimlane-id="' + swimlaneId + '"]'),
            $issues = $swimlane.find('.ghx-issue'),
            $header = $swimlane.find('.ghx-heading .ghx-info'),
            $days = $header.find('.js-days-info'),
            days, total = 0, flagged = 0;

        GH.SwimlaneView.AG[swimlaneId].issues.forEach(function(issue) {
            var $issue = $issues.filter('[data-issue-key="' + issue.key + '"]');
            if ($issue.length === 0) return;

            $('<div style="position:absolute;right:38px;top:6px;" class="bpa-badges">' +
                '<span class="aui-badge" title="Remaining Time Estimate" style="background:#' + (issue.fields.timetracking.remainingEstimate ? 'ccc' : 'eb00e3') + '">' +
                (issue.fields.timetracking.remainingEstimate || "?") + '</span></div>').appendTo($issue);

            if (issue.fields.timetracking.remainingEstimateSeconds) {
                days = Math.round(issue.fields.timetracking.remainingEstimateSeconds / 7200);
                $issue.attr('class', $issue.attr('class').replace(/ghx-days-\d+/, 'ghx-days-' + (days <= 32 ? days === 0 ? 1 : days : '32')));
                $issue.find('.ghx-days').attr('title', 'Remaining estimate in hours').addClass('display-anyway');

                total += issue.fields.timetracking.remainingEstimateSeconds;

                if (issue.fields.customfield_10000) {
                    flagged += issue.fields.timetracking.remainingEstimateSeconds;
                }
            }

            if (issue.fields.customfield_10910) {
                $issue.attr('data-epic-key', issue.fields.customfield_10910);
            }
        });

        if ($days.length === 0) {
            $days = $('<span class="ghx-description js-days-info" style="margin-left:.3em;"/>').appendTo($header);
        }

        var text = '/ ' + GH.formatHours(total);
        if (flagged > 0) {
            text += ' (flagged: ' + GH.formatHours(flagged) + ')';
        }
        $days.text(text);
    };

    GH.SwimlaneView.renderEpicInfo = function(swimlaneId) {
        var $swimlane = $("#ghx-pool").find('.ghx-swimlane[swimlane-id="' + swimlaneId + '"]'),
            $issues = $swimlane.find('.ghx-issue');

        GH.SwimlaneView.AG[swimlaneId].epics.forEach(function(issue) {
            var $issue = $issues.filter('[data-epic-key="' + issue.key + '"]');

            $issue.find('.ghx-summary').addClass('aui-label').addClass(issue.fields.customfield_10913).css({
                top: '-2px !important'
            });

            $('<a href="/browse/' + issue.key + '" target="_blank" title="' + issue.key + '" ' +
                'style="text-transform:none;margin-right:3px;" ' +
                'class="aui-badge ' + issue.fields.customfield_10913 + '">' + issue.fields.customfield_10911 + '</a>').prependTo($issue.find('.bpa-badges'));
        });
    };

    render_blocks = function(issue) {
        $.ajax({
            type: 'GET',
            url: '/rest/api/2/search?jql=issue+in+linkedIssues("' + $(issue).data('issue-key') + '",+"blocks")+and+resolutiondate+is+empty',
            contentType: 'application/json'
        })
        .done(function(data) {
            if (data.total > 0) {
                var $flags = $(issue).find('.ghx-flags');
                $flags.find(' .ghx-priority, .ghx-flag').remove();
                $flags.append('<span class="ghx-priority js-blocker-issue" title="Blocks ' + data.total + ' issue(s)" />');
            }
        });
    };

    GH.SwimlaneView.renderBlockers = function(swimlaneId) {
        var $swimlane = $("#ghx-pool").find('.ghx-swimlane[swimlane-id="' + swimlaneId + '"]'),
            $issues = $swimlane.find('.ghx-issue');//.ghx-flagged');

        $issues.each(function(_, issue) {
            $.ajax({
                type: 'GET',
                url: '/rest/api/2/search?jql=issue+in+linkedIssues("' + $(issue).data('issue-key') + '",+"is+blocked+by")+and+resolutiondate+is+empty',
                contentType: 'application/json'
            })
            .done(function(data) {
                if (data.total > 0) {
                    var $flags = $(issue).find('.ghx-flags');
                    $flags.find(' .ghx-priority, .ghx-flag').remove();
                    $flags.append('<span class="ghx-priority js-blocked-issue" title="Blocked by ' + data.total + ' issue(s)" />');
                }  else {
                    render_blocks(issue);
                }
            });
        });
    };

    GH.SwimlaneView._rerenderCell = GH.SwimlaneView.rerenderCell;

    GH.SwimlaneView.rerenderCell = function(E, G) {
        GH.SwimlaneView._rerenderCell(E, G);

        GH.SwimlaneView.renderEstimates(E);
        GH.SwimlaneView.renderEpicInfo(E);
        GH.SwimlaneView.renderBlockers(E);
    };

    GH.SwimlaneView.AG = {};

    waitForKeyElements('#ghx-work .ghx-parent-group.js-fake-parent', function(node) {
        var issue = $(node).data('issue-key'),
            $key = $(node).find('.ghx-group .ghx-key');
        $key.text('');

        $('<a href="/browse/' + issue + '" title="' + issue + '" class="ghx-key-link js-detailview">' + issue + '</a>').appendTo($key);
        $key.find('a').click(GH.WorkSelectionController.handleIssueClick);
    });

    waitForKeyElements('#ghx-detail-issue', function(node) {
        var $epic = $(node).find('.ghx-fieldname-customfield_10911 .js-epic-remove'),
            issue;
        if ($epic.length) {
            $epic.empty().css({
                paddingRight: '3px'
            });
            issue = $epic.data('epickey');
            $('<a href="/browse/' + issue + '" target="_blank" title="' + issue + '" class="ghx-key-link js-detailview">' + $epic.prop('title') + '</a>').appendTo($epic);
        }
    });

    waitForKeyElements('.BPA-RapidBoard #ghx-pool .ghx-swimlane', function(node) {
        var $node = $(node),
            $issues = $node.find('.ghx-issue'),
            issues = $issues.map(function() {
                return $(this).data('issue-key');
            }),
            swimlaneId = $node.attr('swimlane-id');

        GH.SwimlaneView.AG[swimlaneId] = {};
        GH.SwimlaneView.AG[swimlaneId].issues = [];
        GH.SwimlaneView.AG[swimlaneId].epics = [];

        if ($issues.length > 0) {
            $.ajax({
                type: 'GET',
                url: '/rest/api/2/search?jql=key+in(' + issues.toArray().join(',') + ')&fields=timetracking,customfield_10000,customfield_10910&maxResults=1000',
                contentType: 'application/json'
            })
            .done(function(data) {
                var epics = data.issues
                    .filter(function(issue) {
                    return issue.fields.customfield_10910;
                })
                .map(function(issue) {
                    return issue.fields.customfield_10910;
                });


                GH.SwimlaneView.AG[swimlaneId].issues = data.issues;
                GH.SwimlaneView.renderEstimates(swimlaneId);

                if (epics.length) {
                    $.ajax({
                        type: 'GET',
                        url: '/rest/api/2/search?jql=key+in(' + epics.join(',') + ')&fields=customfield_10911,customfield_10913&maxResults=1000',
                        contentType: 'application/json'
                    })
                    .done(function(data) {
                        GH.SwimlaneView.AG[swimlaneId].epics = data.issues;
                        GH.SwimlaneView.renderEpicInfo(swimlaneId);
                    });
                }
            });
            GH.SwimlaneView.renderBlockers(swimlaneId);
        }
    });

    $('a[href^="https://support.odesk.com/tickets/"]').each(function() {
        $(this).prop('href', 'https://int.odesk.com/obo/zendesk-request/' + $(this).prop('href').split('tickets/')[1]).prop('target', '_blank');
    });

    if ($('#status-val.value').text().trim() == 'In Progress' && $('#customfield_10014-val').length) {
        var $user = $('#header-details-user-fullname');

        if ($('#assignee-val .user-hover').attr('rel') == $user.data('username')) {
            if ($.inArray($('#customfield_11511-val.value').text().trim(), ['No', 'Denied']) >= 0) {
                $('<li class="toolbar-item"><a class="toolbar-trigger review-status-trigger" data-status="Requested">Request review<a></li>').appendTo('#opsbar-opsbar-transitions');
            }
        } else if ($('#customfield_10014-val .user-hover').attr('rel') == $user.data('username')) {
            if ($('#customfield_11511-val.value').text().trim() == 'Requested') {
                $('<li class="toolbar-item"><a class="toolbar-trigger review-status-trigger" href="#" data-status="Approved">Approve<a></li>' +
                    '<li class="toolbar-item"><a class="toolbar-trigger review-status-trigger" href="#" data-status="Denied">Deny<a></li>').appendTo('#opsbar-opsbar-transitions');
            }
        }

        $('#opsbar-opsbar-transitions .review-status-trigger').click(function() {
            var $reviewer = $('#customfield_10014-val'),
                issue = $('#key-val').data('issue-key');
            if ($reviewer.length) {
                var reviewerId = $reviewer.find('.user-hover').attr('rel');
                if ($('#customfield_11135-field .tinylink > .user-hover[rel=' + reviewerId + ']').length === 0) {
                    $.ajax({
                        type: 'POST',
                        url: '/rest/api/2/issue/' + issue + '/watchers',
                        contentType: 'application/json',
                        data: JSON.stringify(reviewerId)
                    });
                }
            }

            $.ajax({
                type: 'PUT',
                url: '/rest/api/2/issue/' + issue,
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    "fields": {
                        "customfield_11511": {
                            "value": $(this).data('status')
                        }
                    }
                })
            })
            .done(function() {
                location.reload();
            });
        });
    }

    if (window.location.href.match(/(?:RapidBoard\.jspa\?rapidView=(?:228|238|264|292)|Dashboard\.jspa\?selectPageId=10810|ifr\?container=atlassian\&mid=12631)/)) {
        $('body').addClass('BPA-RapidBoard');
        $('#ghx-modes').append($('<a href="#" class="aui-button js-refresh-now">Refresh</a>').click(GH.RapidBoard.reload));
        if (AJS.keys) {
            AJS.keys.shortcuts.push({
                "moduleKey": "greenhopper-ashboard-refresh",
                "keys": [
                    ["r"]
                ],
                "context": "greenhopper",
                "op": "execute",
                "param": "GH.RapidBoard.reload();"
            });
            AJS.activeShortcuts = AJS.whenIType.fromJSON(AJS.keys.shortcuts);
        }
    }

    waitForKeyElements('.livestamp[datetime]', function(element) {
        var $element = $(element);
        $element.closest('span.date').prop('title', $element.attr('datetime'));
    });

    if ($('#project-name-val').text() == 'BPA') {
        var COMPONENTS = ['Agate Binder - BPA-UI', 'Agate Binder - Account-Security-UI',
                          'Agate Bindle - bpa-bundle', 'Agate Bundle - account-security-bundle',
                          'PHP Library - bpa-frontend-helpers'];
        var component = $.trim($('#components-field > a').attr('title'));
        console.log('Component: ' + component);
        if (COMPONENTS.indexOf(component) >= 0) {
            var $affectedVersion = $('#customfield_12512-val');
            var affectedVersion = $.trim($affectedVersion.text());
            if (affectedVersion.length) {
                $affectedVersion.text('')
                .append('<a target="_blank" href="/issues/?jql=' +
                        encodeURIComponent('project = BPA and component = "' + component + '" and "Affected Version" = ' + affectedVersion.replace(/,/g, '')) +
                        '">v' + affectedVersion.split(',').map(function(x){return x*1;}).join('.') + '</a>');
            }
            $('#versions-val').closest('#issuedetails li.item').before($('#rowForcustomfield_12512')).remove();

            var $fixedVersion = $('#customfield_12511-val');
            var fixedVersion = $.trim($fixedVersion.text());
            if (fixedVersion.length) {
                $fixedVersion.text('')
                .append('<a target="_blank" href="/issues/?jql=' +
                        encodeURIComponent('project = BPA and component = "' + component +
                                           '" and ("Fixed Version" = ' + fixedVersion.replace(/,/g, '') + ' or "Affected Version" = ' + fixedVersion.replace(/,/g, '') + ')') +
                                           '">v' + fixedVersion.split(',').map(function(x){return x*1;}).join('.') + '</a>');
            }
            $('#fixfor-val').closest('#issuedetails li.item').remove();
            $('#rowForcustomfield_12512').after($('#rowForcustomfield_12511').addClass('item-right'));
        }
    }
})();
