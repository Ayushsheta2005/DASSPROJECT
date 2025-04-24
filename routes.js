const express = require('express');
const { commandHandler, interactivityHandler, messageHandler } = require('./handlers');
const { handleOAuthCallback, pendingEvents, googleTokens } = require('./calendar');

const router = express.Router();

// Slack API endpoints
router.post('/slack/commands', commandHandler);
router.post('/slack/interactivity', interactivityHandler);
router.post('/slack/events', (req, res) => {
  // URL verification challenge for Slack Events API
  if (req.body.type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }
  
  // Handle message events
  if (req.body.event && req.body.event.type === 'message') {
    return messageHandler(req, res);
  }
  
  return res.status(200).send();
});

// Google Calendar OAuth callback
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('Google OAuth error:', error);
      return res.status(400).send(`
        <html>
          <head>
            <title>Authorization Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
              .error { color: #f44336; }
              .container { max-width: 600px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Authorization Failed</h1>
              <p>The following error occurred: ${error}</p>
              <p>Please try again or contact support.</p>
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }
    
    if (!code || !state) {
      return res.status(400).send('Missing required parameters (code or state)');
    }
    
    // Check if there's a pending event for this user before authorization
    const hasPendingEvent = pendingEvents.has(state);
    
    // Process the OAuth callback
    const result = await handleOAuthCallback(code, state);
    
    // Generate appropriate response based on result
    if (result.success) {
      const userHasTokens = googleTokens.has(state);
      
      let responseHtml = `
        <html>
          <head>
            <title>Authorization Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
              .success { color: #4CAF50; }
              .container { max-width: 600px; margin: 0 auto; }
              button { background: #4CAF50; color: white; border: none; padding: 10px 20px; 
                       border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="success">✓ Calendar Authorization Successful</h1>
              <p>Your Google Calendar has been connected successfully.</p>
      `;
      
      if (hasPendingEvent && result.eventLink) {
        responseHtml += `
              <p>Your session has been added to your calendar!</p>
              <p><a href="${result.eventLink}" target="_blank">View the event in Google Calendar</a></p>
        `;
      }
      
      responseHtml += `
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `;
      
      return res.send(responseHtml);
    } else {
      return res.status(500).send(`
        <html>
          <head>
            <title>Authorization Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
              .error { color: #f44336; }
              .container { max-width: 600px; margin: 0 auto; }
              button { background: #f44336; color: white; border: none; padding: 10px 20px; 
                       border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Authorization Error</h1>
              <p>${result.message || 'An error occurred during authorization'}</p>
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return res.status(500).send(`
      <html>
        <head>
          <title>Server Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
            .error { color: #f44336; }
          </style>
        </head>
        <body>
          <h1 class="error">Server Error</h1>
          <p>An unexpected error occurred during authorization.</p>
          <p>Please try again later.</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }
});

// Calendar-related routes and commands
router.post('/slack/calendar', async (req, res) => {
  // You can implement calendar-specific commands here
  res.status(200).send('Calendar command received');
});

module.exports = router;
