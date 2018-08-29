//'use strict';

//ExecuteOrDelayUntilScriptLoaded(initializePage, "sp.js");

//function initializePage()
//{
//    var context = SP.ClientContext.get_current();
//    var user = context.get_web().get_currentUser();

//    // This code runs when the DOM is ready and creates a context object which is needed to use the SharePoint object model
//    $(document).ready(function () {
//        getUserName();
//    });

//    // This function prepares, loads, and then executes a SharePoint query to get the current users information
//    function getUserName() {
//        context.load(user);
//        context.executeQueryAsync(onGetUserNameSuccess, onGetUserNameFail);
//    }

//    // This function is executed if the above call is successful
//    // It replaces the contents of the 'message' element with the user name
//    function onGetUserNameSuccess() {
//        $('#message').text('Hello ' + user.get_title());
//    }

//    // This function is executed if the above call fails
//    function onGetUserNameFail(sender, args) {
//        alert('Failed to get user name. Error:' + args.get_message());
//    }
//}

'use strict';
var clientContext = SP.ClientContext.get_current();
//var employeeList = clientContext.get_web().get_lists().getByTitle('New Employees In Seattle');
var employeeList = clientContext.get_web().get_lists().getByTitle('New Employees In Seattle');
var completedItems;

var notStartedItems;
var calendarList;
var scheduledItems;

var hostWebURL = decodeURIComponent(getQueryStringParameters("SPHostUrl"));


// Succesfull delete callbacks
function purgeCompletedItems() {

    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml(
        '<View><Query><Where><Eq>' +
        '<FieldRef Name=\'OrientationStage\'/><Value Type=\'Choice\'>Completed</Value>' +
        '</Eq><Where></Query></View>');
    completedItems = employeeList.getItems(camlQuery);

    clientContext.load(completedItems);

    clientContext.executeQueryAsync(deleteCompletedItems, onGetCompletedItemsFail);

    return false;
}
function deleteCompletedItems() {

    var itemArray = new Array();
    var listItemEnumerator = completedItems.getEnumator();

    while (listItemEnumerator.moveNext()) {
        var item = listItemEnumerator.get_current();
        itemArray.push(item);
    }

    var i;
    for (i = 0; i < itemArray.length; i++) {
        employeeList.getItemById(itemArray[i].get_id()).deleteObject();
    }

    clientContext.executeQueryAsync(onDeleteCompletedItemsSuccess, onDeleteCompletedItemsFail);
}
function onDeleteCompletedItemsSuccess() {
    alert('Completed orientations have been deleted.');
    location.reload(true);
}

function onScheduleItemsSucess() {
    alert('There was one r more unscheduled orientations and they have been added to the '
        + 'Employee Orientation Schedule calendar.');
}

function ensureOrientationScheduling() {
    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml(
        '<View><Query><Where><Eq>' +
        '<FieldRef Name=\'OrientationStage\'/><Value Type=\'Choice\'>Not Started</Value>' +
        '</Eq></Where></Query></View>');
    notStartedItems = employeeList.getItems(camlQuery);

    clientContext.load(notStartedItems);
    clientContext.executeQueryAsync(getScheduledOrientations, onGetNotStartedItemsFail);
    return false;
}

function getScheduledOrientations() {
    var hostWebContext = new SP.AppContextSite(clientContext, hostWebURL);
    calendarList = hostWebContext.get_web().get_lists().getByTitle('Employee Orientation Schedule');

    var camlQuery = new SP.CamlQuery();
    scheduledItems = calendarList.getItems(camlQuery);

    clientContext.load(scheduledItems);
    clientContext.executeQueryAsync(scheduleAsNeeded, onGetScheduledItemsFail);
}

function scheduleAsNeeded() {
    var unscheduledItems = false;
    var dayOfMonth = '10';

    var listItemEnumerator = noStartedItems.getEnumator();

    while (listItemEnumerator.moveNext()) {
        var alreadyScheduled = false;
        var notStartedItem = listItemEnumerator.get_current();

        var calendarEventEnumerator = scheduledItems.getEnumator();
        while (calendarEventEnumerator.moveNext()) {
            var scheduledEvent = calendarEventEnumerator.get_current();

            // The SP.ListItem.get_item('field_name ') method gets the value of the specified field.
            if (scheduledEvent.get_item('Title').indexOf(notStartedItem.get_item('Title')) > -1) {
                alreadyScheduled = true;
                break;
            }
            if (alreadyScheduled === false) {
                //SP.ListItemCreationInformation holds the information the SharePoint server needs to
                //create a list item
                var calendarItem = new SP.ListItemCreationInformation();

                //The some_list .additem method tell the server which list to add
                //the item to
                var itemToCreate = calendarList.addItem(calendarItem);

                //The some_item .set_item method sets the value of the specifie field.
                itemToCreate.set_item('Title', 'Orient' + notStartedItem.get_item('Title'));

                //The EventDate and EndDate are the start and stop time of an event
                itemToCreate.set_item('EventDate', '2015-06-' + dayOfMonth + 'T21:00:00Z');
                itemToCreat.set_item('EndDate', '2015-06' + dayOfMonth + 'T23:00:00Z');
                dayOfMonth++;

                //The update method tells the server to commit the chages to the SharePoint database
                itemToCreate.update();
                unscheduledItems = true;
            }
        }

        if (unscheduledItems) {
            calendarList.update();
            clientContext.executeQueryAsync(onScheduleItemsSucess, onScheduleItemsFail);
        }

    }
}


// Failure callbacks
function onGetCompletedItemsFail(sender, args) {
    alert('Unable to get completed items. Error:' + args.get_message() + '\n' + args.get_stackTrace());
}
function onDeleteCompletedItemsFail(sender, args) {
    alert('Unable to delete completed items. Error:' + args.get_message() + '\n' + args.get_stackTrace());
}
function onGetNotStartedItemsFail(sender, args) {
    alert('unable to get the not-started items. Error:'
        + args.get_message() + '\n' + args.get_stackTrace());
}
function onGetScheduledItemsFail(sender, args) {
    alert('Unable to get scheduled items from host web. Error:'
        + args.get_message() + '\n' + args.get_stackTrace());
}
function onScheduleItemsFail(sender, args) {
    alert('Unable to schedule items on host web calendar. Error:'
        + args.get_message() + '\n' + args.get_stackTrace());
}

// Utility functions
function getQueryStringParameters(paramToRetrieve) {
    var params = document.URL.split("?")[1].split("&amp;");
    var strParams = "";
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] == paramToRetrieve) {
            return singleParam[1];
        }
    }
}