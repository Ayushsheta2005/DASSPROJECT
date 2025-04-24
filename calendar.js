const { google } = require('googleapis');
const axios = require('axios');

// Store user's Google OAuth tokens
const googleTokens = new Map();

// Store pending calendar events that need to be added after authorization
const pendingEvents = new Map();

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate authorization URL for Google Calendar
const getAuthUrl = (slackUserId, pendingEventData = null) => {
  const state = slackUserId; // Use slack user ID as state to identify user after OAuth
  const scopes = ['https://www.googleapis.com/auth/calendar'];
  
  // If pending event data is provided, store it for later
  if (pendingEventData) {
    pendingEvents.set(slackUserId, pendingEventData);
    console.log(`Stored pending event for user ${slackUserId}`);
  }
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state,
    prompt: 'consent',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI
  });
};

// Process OAuth callback and store tokens
const handleOAuthCallback = async (code, state) => {
  try {
    // Get tokens using authorization code
    const { tokens } = await oauth2Client.getToken({
      code: code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });
    
    // Store tokens for the user
    googleTokens.set(state, tokens);
    console.log(`Stored Google tokens for user ${state}`);
    
    // Check if we have a pending event for this user
    let result = { success: true, message: 'Calendar authorization successful' };
    
    if (pendingEvents.has(state)) {
      const eventDetails = pendingEvents.get(state);
      console.log(`Processing pending event for user ${state}`);
      
      // Try to add the pending event to calendar
      result = await addEventToCalendar(state, eventDetails);
      
      // Remove pending event regardless of success
      pendingEvents.delete(state);
    }
    
    return result;
  } catch (error) {
    console.error('Error getting OAuth tokens:', error.response?.data || error.message);
    return { 
      success: false, 
      message: 'Failed to complete authorization',
      error: error.message 
    };
  }
};

// Internal function to add event to calendar
const addEventToCalendar = async (slackUserId, eventDetails) => {
  try {
    const tokens = googleTokens.get(slackUserId);
    if (!tokens) {
      throw new Error('No authorization tokens available');
    }

    // Set credentials
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Format dates
    let startDateTime;
    if (typeof eventDetails.startDateTime === 'string') {
      // Parse MM-DD-YYYY HH:MM:SS format
      const [datePart, timePart] = eventDetails.startDateTime.split(' ');
      const [month, day, year] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      startDateTime = new Date(year, month-1, day, hour, minute);
    } else {
      startDateTime = new Date(eventDetails.startDateTime);
    }
    
    const endDateTime = new Date(startDateTime.getTime() + (eventDetails.duration * 60000));
    
    // Determine location and conference details
    let location = eventDetails.location || 'Virtual Meeting';
    let conferenceData = null;
    
    if (eventDetails.sessionMode === 0 || eventDetails.sessionMode === '0') { // Virtual
      if (eventDetails.vcToolLink) {
        location = eventDetails.vcToolLink;
      }
      
      // Setup Google Meet if specified
      if (eventDetails.vcToolType === 'google_meet') {
        conferenceData = {
          createRequest: {
            requestId: `session-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        };
      }
    }
    
    // Create event
    const event = {
      summary: eventDetails.sessionName,
      location: location,
      description: `Coaching session with ${eventDetails.coachName}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: eventDetails.timezone || 'Asia/Kolkata',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: eventDetails.timezone || 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };
    
    if (conferenceData) {
      event.conferenceData = conferenceData;
    }
    
    // Add event to calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: conferenceData ? 1 : 0,
      sendNotifications: true
    });
    
    console.log(`Event created for user ${slackUserId}: ${response.data.htmlLink}`);
    
    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      message: 'Event added to calendar'
    };
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    
    // If token expired or invalid, clear it
    if (error.code === 401 || 
        (error.response && error.response.status === 401) || 
        error.message?.includes('invalid_grant')) {
      googleTokens.delete(slackUserId);
    }
    
    return {
      success: false,
      message: 'Failed to add event to calendar: ' + error.message
    };
  }
};

// Main function to add a session to the calendar
const addToCalendar = async (slackUserId, eventDetails) => {
  try {
    // Check if user has authorized the calendar
    if (!googleTokens.has(slackUserId)) {
      // User not authorized, generate auth URL and store pending event
      return {
        success: false,
        message: 'Calendar authorization required',
        authUrl: getAuthUrl(slackUserId, eventDetails)
      };
    }

    // Add event to calendar
    return await addEventToCalendar(slackUserId, eventDetails);
  } catch (error) {
    console.error('Error in addToCalendar:', error);
    return {
      success: false,
      message: 'Failed to process calendar request',
      error: error.message
    };
  }
};

// Get list of upcoming calendar events
const getUpcomingEvents = async (slackUserId, days = 7) => {
  try {
    const tokens = googleTokens.get(slackUserId);
    if (!tokens) {
      return {
        success: false,
        message: 'Calendar authorization required',
        authUrl: getAuthUrl(slackUserId)
      };
    }

    // Set credentials
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get events for the next X days
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + days);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const events = response.data.items;
    
    return {
      success: true,
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        location: event.location,
        link: event.htmlLink
      }))
    };
  } catch (error) {
    console.error('Error getting calendar events:', error);
    
    // If token expired, clear it
    if (error.code === 401 || 
        (error.response && error.response.status === 401) ||
        error.message?.includes('invalid_grant')) {
      googleTokens.delete(slackUserId);
      return {
        success: false,
        message: 'Calendar authorization expired',
        authUrl: getAuthUrl(slackUserId)
      };
    }
    
    return {
      success: false,
      message: 'Failed to fetch calendar events'
    };
  }
};

// Check for availability in calendar
const checkAvailability = async (slackUserId, startTime, endTime) => {
  try {
    const tokens = googleTokens.get(slackUserId);
    if (!tokens) {
      return {
        success: false,
        message: 'Calendar authorization required',
        authUrl: getAuthUrl(slackUserId)
      };
    }

    // Set credentials
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Ensure dates are in ISO format
    const timeMin = new Date(startTime).toISOString();
    const timeMax = new Date(endTime).toISOString();
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true
    });
    
    const events = response.data.items;
    
    return {
      success: true,
      available: events.length === 0,
      conflicts: events.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date
      }))
    };
  } catch (error) {
    console.error('Error checking calendar availability:', error);
    
    // If token expired, clear it
    if (error.code === 401 || 
        (error.response && error.response.status === 401) ||
        error.message?.includes('invalid_grant')) {
      googleTokens.delete(slackUserId);
      return {
        success: false,
        message: 'Calendar authorization expired',
        authUrl: getAuthUrl(slackUserId)
      };
    }
    
    return {
      success: false,
      message: 'Failed to check calendar availability'
    };
  }
};

// OAuth callback endpoint handler
const oauthCallbackHandler = async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    console.error('Google OAuth error:', error);
    return res.status(400).send(`Authentication error: ${error}`);
  }
  
  if (!code || !state) {
    return res.status(400).send('Missing required parameters (code or state)');
  }
  
  try {
    const result = await handleOAuthCallback(code, state);
    
    if (result.success) {
      return res.send(`
        <html>
          <head>
            <title>Authorization Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: #4CAF50; }
            </style>
          </head>
          <body>
            <h1 class="success">Successfully Authorized!</h1>
            <p>You've successfully connected your Google Calendar.</p>
            <p>You can close this window and return to Slack.</p>
          </body>
        </html>
      `);
    } else {
      return res.status(500).send(`
        <html>
          <head>
            <title>Authorization Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #F44336; }
            </style>
          </head>
          <body>
            <h1 class="error">Authorization Failed</h1>
            <p>There was a problem connecting to Google Calendar.</p>
            <p>Please try again or contact support.</p>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error in OAuth callback handler:', error);
    return res.status(500).send('An unexpected error occurred during authorization');
  }
};

module.exports = {
  getAuthUrl,
  addToCalendar,
  handleOAuthCallback,
  getUpcomingEvents,
  checkAvailability,
  pendingEvents,
  googleTokens,
  oauthCallbackHandler
};
