import { NextRequest, NextResponse } from 'next/server';
import { composioService } from '@/lib/composio-service';

export async function POST(request: NextRequest) {
  try {
    const { action, userId, params } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'list_events':
        try {
          const events = await composioService.listEvents(
            userId,
            params?.timeMin,
            params?.timeMax
          );
          
          return NextResponse.json({
            success: true,
            events: events || []
          });
        } catch (error) {
          console.error('Error listing events:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch calendar events'
          }, { status: 500 });
        }

      case 'get_primary_calendar':
        try {
          const calendars = await composioService.listCalendars(userId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const primaryCalendar = calendars?.find((cal: any) => cal.primary) || 
                                  { id: 'primary', summary: 'Calendar' };
          
          return NextResponse.json({
            success: true,
            calendar: primaryCalendar
          });
        } catch (error) {
          console.error('Error getting primary calendar:', error);
          return NextResponse.json({
            success: true,
            calendar: { id: 'primary', summary: 'Calendar' }
          });
        }

      case 'create_event':
        try {
          const event = await composioService.createEvent(userId, params);
          
          return NextResponse.json({
            success: true,
            event
          });
        } catch (error) {
          console.error('Error creating event:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to create event'
          }, { status: 500 });
        }

      case 'get_user_profile':
        try {
          const profile = await composioService.getUserProfile(userId);
          
          return NextResponse.json({
            success: true,
            profile
          });
        } catch (error) {
          console.error('Error getting user profile:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to get user profile'
          }, { status: 500 });
        }

      case 'get_auth_session':
        try {
          const sessionInfo = await composioService.getAuthSessionInfo();
          
          return NextResponse.json({
            success: true,
            session: sessionInfo
          });
        } catch (error) {
          console.error('Error getting auth session:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to get auth session'
          }, { status: 500 });
        }

      case 'delete_event':
        try {
          const result = await composioService.deleteEvent(userId, params.calendarId, params.eventId);
          
          return NextResponse.json({
            success: true,
            result
          });
        } catch (error) {
          console.error('Error deleting event:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to delete event'
          }, { status: 500 });
        }

      case 'update_event':
        try {
          const event = await composioService.updateEvent(userId, params.calendarId, params.eventId, params.eventData);
          
          return NextResponse.json({
            success: true,
            event
          });
        } catch (error) {
          console.error('Error updating event:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to update event'
          }, { status: 500 });
        }

      case 'create_calendar':
        try {
          const calendar = await composioService.createCalendar(userId, params.summary, params.description);
          
          return NextResponse.json({
            success: true,
            calendar
          });
        } catch (error) {
          console.error('Error creating calendar:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to create calendar'
          }, { status: 500 });
        }

      case 'delete_calendar':
        try {
          const result = await composioService.deleteCalendar(userId, params.calendarId);
          
          return NextResponse.json({
            success: true,
            result
          });
        } catch (error) {
          console.error('Error deleting calendar:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to delete calendar'
          }, { status: 500 });
        }

      case 'clear_calendar':
        try {
          const result = await composioService.clearCalendar(userId, params.calendarId);
          
          return NextResponse.json({
            success: true,
            result
          });
        } catch (error) {
          console.error('Error clearing calendar:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to clear calendar'
          }, { status: 500 });
        }

      case 'quick_add_event':
        try {
          const event = await composioService.quickAddEvent(userId, params.calendarId, params.text);
          
          return NextResponse.json({
            success: true,
            event
          });
        } catch (error) {
          console.error('Error with quick add:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to quick add event'
          }, { status: 500 });
        }

      case 'find_free_busy':
        try {
          const freeBusy = await composioService.findFreeBusy(userId, params.calendars, params.timeMin, params.timeMax);
          
          return NextResponse.json({
            success: true,
            freeBusy
          });
        } catch (error) {
          console.error('Error finding free/busy:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to find free/busy information'
          }, { status: 500 });
        }

      case 'move_event':
        try {
          const event = await composioService.moveEvent(userId, params.calendarId, params.eventId, params.destinationCalendarId);
          
          return NextResponse.json({
            success: true,
            event
          });
        } catch (error) {
          console.error('Error moving event:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to move event'
          }, { status: 500 });
        }

      // ========== NEW CALENDAR LIST OPERATIONS ==========

      case 'insert_calendar_to_list':
        try {
          const entry = await composioService.insertCalendarToList(userId, params.calendarId, params.options);
          
          return NextResponse.json({
            success: true,
            entry
          });
        } catch (error) {
          console.error('Error inserting calendar to list:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to insert calendar to list'
          }, { status: 500 });
        }

      case 'update_calendar_in_list':
        try {
          const entry = await composioService.updateCalendarInList(userId, params.calendarId, params.updates);
          
          return NextResponse.json({
            success: true,
            entry
          });
        } catch (error) {
          console.error('Error updating calendar in list:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to update calendar in list'
          }, { status: 500 });
        }

      // ========== NEW CALENDAR OPERATIONS ==========

      case 'update_calendar':
        try {
          const calendar = await composioService.updateCalendar(userId, params.calendarId, params.updates);
          
          return NextResponse.json({
            success: true,
            calendar
          });
        } catch (error) {
          console.error('Error updating calendar:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to update calendar'
          }, { status: 500 });
        }

      case 'duplicate_calendar':
        try {
          const calendar = await composioService.duplicateCalendar(userId, params.sourceCalendarId, params.newSummary);
          
          return NextResponse.json({
            success: true,
            calendar
          });
        } catch (error) {
          console.error('Error duplicating calendar:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to duplicate calendar'
          }, { status: 500 });
        }

      case 'get_calendar':
        try {
          const calendar = await composioService.getCalendar(userId, params.calendarId);
          
          return NextResponse.json({
            success: true,
            calendar
          });
        } catch (error) {
          console.error('Error getting calendar:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to get calendar'
          }, { status: 500 });
        }

      case 'patch_calendar':
        try {
          const calendar = await composioService.patchCalendar(userId, params.calendarId, params.patches);
          
          return NextResponse.json({
            success: true,
            calendar
          });
        } catch (error) {
          console.error('Error patching calendar:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to patch calendar'
          }, { status: 500 });
        }

      // ========== NEW EVENT OPERATIONS ==========

      case 'get_event_instances':
        try {
          const instances = await composioService.getEventInstances(userId, params.calendarId, params.eventId, params.options);
          
          return NextResponse.json({
            success: true,
            instances
          });
        } catch (error) {
          console.error('Error getting event instances:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to get event instances'
          }, { status: 500 });
        }

      case 'watch_events':
        try {
          const channel = await composioService.watchEvents(userId, params.calendarId, params.options);
          
          return NextResponse.json({
            success: true,
            channel
          });
        } catch (error) {
          console.error('Error setting up events watch:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to set up events watch'
          }, { status: 500 });
        }

      case 'find_event':
        try {
          const events = await composioService.findEvent(userId, params.calendarId, params.query);
          
          return NextResponse.json({
            success: true,
            events
          });
        } catch (error) {
          console.error('Error finding event:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to find event'
          }, { status: 500 });
        }

      case 'find_free_slots':
        try {
          const slots = await composioService.findFreeSlots(userId, params.options);
          
          return NextResponse.json({
            success: true,
            slots
          });
        } catch (error) {
          console.error('Error finding free slots:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to find free slots'
          }, { status: 500 });
        }

      case 'patch_event':
        try {
          const event = await composioService.patchEvent(userId, params.calendarId, params.eventId, params.patches);
          
          return NextResponse.json({
            success: true,
            event
          });
        } catch (error) {
          console.error('Error patching event:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to patch event'
          }, { status: 500 });
        }

      case 'remove_attendee':
        try {
          const event = await composioService.removeAttendee(userId, params.calendarId, params.eventId, params.attendeeEmail);
          
          return NextResponse.json({
            success: true,
            event
          });
        } catch (error) {
          console.error('Error removing attendee:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to remove attendee'
          }, { status: 500 });
        }

      // ========== NEW SETTINGS OPERATIONS ==========

      case 'watch_settings':
        try {
          const channel = await composioService.watchSettings(userId, params.options);
          
          return NextResponse.json({
            success: true,
            channel
          });
        } catch (error) {
          console.error('Error setting up settings watch:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to set up settings watch'
          }, { status: 500 });
        }

      // ========== NEW ACL OPERATIONS ==========

      case 'list_acl_rules':
        try {
          const rules = await composioService.listAclRules(userId, params.calendarId);
          
          return NextResponse.json({
            success: true,
            rules
          });
        } catch (error) {
          console.error('Error listing ACL rules:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to list ACL rules'
          }, { status: 500 });
        }

      case 'update_acl_rule':
        try {
          const rule = await composioService.updateAclRule(userId, params.calendarId, params.ruleId, params.updates);
          
          return NextResponse.json({
            success: true,
            rule
          });
        } catch (error) {
          console.error('Error updating ACL rule:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to update ACL rule'
          }, { status: 500 });
        }

      // ========== NEW UTILITY OPERATIONS ==========

      case 'get_current_date_time':
        try {
          const dateTime = await composioService.getCurrentDateTime(params.timeZone);
          
          return NextResponse.json({
            success: true,
            dateTime
          });
        } catch (error) {
          console.error('Error getting current date/time:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to get current date/time'
          }, { status: 500 });
        }

      case 'sync_events_advanced':
        try {
          const syncResult = await composioService.syncEventsAdvanced(userId, params.calendarId, params.options);
          
          return NextResponse.json({
            success: true,
            syncResult
          });
        } catch (error) {
          console.error('Error with advanced sync:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to perform advanced sync'
          }, { status: 500 });
        }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in calendar API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}