// ==UserScript==
// @name           Some minor fixes for JIRA
// @namespace      https://gist.github.com/talmuth/e3abd629add49c0afd4f
// @description    Some minor fixes for JIRA
// @include        http://jira.odesk.com/*
// @updateURL      https://gist.github.com/talmuth/e3abd629add49c0afd4f/raw/jiraFixes.user.js
// @version        0.1.3
// @require        https://gist.github.com/BrockA/2625891/raw/waitForKeyElements.js
// ==/UserScript==

(function(){
  var makeFakeParentClickable = function(node) {
    var issue = $(node).data('issue-key'), $key = $(node).find('.ghx-group .ghx-key'); $key.text('');

    $('<a href="/browse/' + issue + '" title="' + issue + '" class="ghx-key-link js-detailview">' + issue + '</a>').appendTo($key);
    $key.find('a').click(GH.WorkSelectionController.handleIssueClick);
  };
  waitForKeyElements('#ghx-work .ghx-parent-group.js-fake-parent', makeFakeParentClickable);

  $('a[href^="https://support.odesk.com/tickets/"]:not(.marked)').each(function() {
    $(this).prop('href', 'https://int.odesk.com/obo/zendesk-request/' + $(this).prop('href').split('tickets/')[1]).prop('target', '_blank');
  });

  if ($('#status-val.value img[alt="In Progress"]').length) {
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
      $.ajax({
        type: 'PUT',
        url: '/rest/api/2/issue/' + $('#key-val').data('issue-key'),
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({"fields": {"customfield_11511": {"value": $(this).data('status')}}}),
      })
      .done(function(){location.reload();});
    });
  }
})();
