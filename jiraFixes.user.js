// ==UserScript==
// @name           Some minor fixes for JIRA
// @namespace      https://gist.github.com/talmuth/e3abd629add49c0afd4f
// @description    Some minor fixes for JIRA
// @include        http://jira.odesk.com/*
// @updateURL      https://gist.github.com/talmuth/e3abd629add49c0afd4f/raw/jiraFixes.user.js
// @version        0.0.4
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js
// @require        https://gist.github.com/BrockA/2625891/raw/waitForKeyElements.js
// ==/UserScript==
 
(function(){
  var makeFakeParentClickable = function(node) {
    var issue = $(node).data('issue-key');
    var $key = $(node).find('.ghx-group .ghx-key'); $key.text('');
  
    $('<a href="/browse/' + issue + '" title="' + issue + '" class="ghx-key-link js-detailview">' + issue + '</a>').appendTo($key);
    $key.find('a').click(GH.WorkSelectionController.handleIssueClick);
  };
  waitForKeyElements('#ghx-work .ghx-parent-group.js-fake-parent', makeFakeParentClickable);
})();