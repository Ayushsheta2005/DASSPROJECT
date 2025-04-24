const axios = require("axios");
const { 
  createLoginModal, 
  createSearchCoachModal,
  createBookingModal,
  createScheduleSessionModal,
  createAddGoalModal,
  createSessionModal,
  createCoachSelectionModal,
  createGoalCoachSelectionModal,
  createActionCoachSelectionModal,
  createGoalSelectionModal,
  createAddActionModal
} = require("./modals");
const { openSlackModal, sendSuccessMessage, userTokens } = require("./utils");
const { processNaturalLanguage } = require("./aihelper");
const { addToCalendar } = require("./calendar");

const commandHandler = async (req, res) => {
    const { command, text, user_id, trigger_id } = req.body;
    
    try {
      console.log("Slack Command Details:", {
        command,
        text,
        user_id,
        trigger_id,
        body: req.body
      });
  
      if (!command) {
        return res.status(400).json({
          response_type: "ephemeral",
          text: "Error: Missing command parameter"
        });
      }
  
      switch (command) {
        case "/coach": {
          const userToken = userTokens.get(user_id);
          if (!userToken) {
            return res.json({
              text: "Please login first using the /login command"
            });
          }
      
          try {
            // Fetch connected coaches
            const response = await axios.get(
              'https://api-beta.uexcelerate.app/api/v1/learner/connection/connected_coaches',
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
      
            if (response.data.result !== "SUCCESS") {
              throw new Error(response.data.message || 'Failed to fetch coaches');
            }
      
            const coaches = response.data.data;
            if (!coaches || coaches.length === 0) {
              return res.json({
                response_type: "ephemeral",
                text: "You don't have any connected coaches yet. Visit UExcelerate to connect with coaches."
              });
            }
      
            const blocks = [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: "📚 Your Connected Coaches"
                }
              },
              ...coaches.flatMap(coach => [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*${coach.userName}*\n${coach.designation || 'Coach'}\nType: ${coach.coachType || 'General'}`
                  },
                  accessory: {
                    type: "image",
                    image_url: coach.profilePic || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZaNCefMs2y1YqhfBDQYBaOWJe3Bqm1pNYXw&s",
                    alt_text: `${coach.userName}'s profile picture`
                  }
                },
                {
                  type: "actions",
                  elements: [
                    {
                      type: "button",
                      text: {
                        type: "plain_text",
                        text: "📅 Schedule Session",
                        emoji: true
                      },
                      style: "primary",
                      value: JSON.stringify({ 
                        action: 'schedule', 
                        authId: coach.authId,
                        coachName: coach.userName 
                      }),
                      action_id: `schedule_session_${coach.authId}`
                    },
                    {
                      type: "button",
                      text: {
                        type: "plain_text",
                        text: "👤 View Profile",
                        emoji: true
                      },
                      url: `https://beta3.uexcelerate.app/public-profile?id=${coach.authId}`,
                      action_id: `view_profile_${coach.authId}`
                    }
                  ]
                },
                {
                  type: "divider"
                }
              ])
            ];
      
            return res.json({
              response_type: "ephemeral",
              blocks
            });
      
          } catch (error) {
            console.error('Error fetching coaches:', error);
            const errorMessage = error.response?.data?.message || error.message;
            return res.json({
              response_type: "ephemeral",
              text: `Failed to fetch coaches: ${errorMessage}. Please try again later.`
            });
          }
        }
  
      // In your commandHandler function, modify the /login case:

case "/login": {
  // Check if this is a direct command (with trigger_id) or from the message handler
  if (!trigger_id) {
    console.log("No trigger_id available, sending login link instead");
    return res.status(200).json({
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please click the button below to log in to your UExcelerate account:"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Log in",
                emoji: true
              },
              value: "login_button_clicked",
              action_id: "open_login_modal"
            }
          ]
        }
      ]
    });
  }

  try {
    const modal = createLoginModal();
    console.log("Opening modal with trigger_id:", trigger_id);
    await openSlackModal(trigger_id, modal);
    return res.status(200).send();
  } catch (error) {
    console.error("Error in /login command:", error);
    return res.status(200).json({
      response_type: "ephemeral",
      text: "Sorry, there was an error opening the login modal. Please try again."
    });
  }
}
  
      case "/addgoal": {
        const userToken = userTokens.get(user_id);
        if (!userToken) {
          return res.json({
            response_type: "ephemeral",
            text: "Please login first using the /login command"
          });
        }
      
        // Send immediate response to avoid timeout
        res.status(200).send();
        
        // Process in background
        (async () => {
          try {
            const modal = await createGoalCoachSelectionModal(userToken);
            await openSlackModal(trigger_id, modal);
          } catch (error) {
            console.error("Error opening coach selection modal for goal:", error);
            
            // Send error message via DM since we can't respond to the slash command anymore
            try {
              await axios.post(
                'https://slack.com/api/chat.postMessage',
                {
                  channel: user_id,
                  text: "Sorry, there was an error loading your coaches for goal creation. Please try again."
                },
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                  }
                }
              );
            } catch (msgError) {
              console.error("Error sending error message:", msgError);
            }
          }
        })();
        
        return;
      }
  
      case "/addsession": {
        const userToken = userTokens.get(user_id);
        if (!userToken) {
          return res.json({
            response_type: "ephemeral",
            text: "Please login first using the /login command"
          });
        }
      
        // Send immediate response to avoid timeout
        res.status(200).send();
        
        // Process in background
        (async () => {
          try {
            const modal = await createCoachSelectionModal(userToken);
            await openSlackModal(trigger_id, modal);
          } catch (error) {
            console.error("Error opening coach selection modal for session:", error);
            
            // Send error message via DM since we can't respond to the slash command anymore
            try {
              await axios.post(
                'https://slack.com/api/chat.postMessage',
                {
                  channel: user_id,
                  text: "Sorry, there was an error loading your coaches for session scheduling. Please try again."
                },
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                  }
                }
              );
            } catch (msgError) {
              console.error("Error sending error message:", msgError);
            }
          }
        })();
        
        return;
      }
    
      // Add this to the commands switch statement in app.post("/slack/commands")
      case "/searchcoach": {
        const userToken = userTokens.get(user_id);
        if (!userToken) {
          return res.json({
            response_type: "ephemeral",
            text: "Please login first using the /login command"
          });
        }
      
        try {
          const modal = createSearchCoachModal();
          await openSlackModal(trigger_id, modal);
          return res.status(200).send();
        } catch (error) {
          console.error("Error opening search coach modal:", error);
          return res.json({
            response_type: "ephemeral",
            text: "Sorry, there was an error opening the search modal. Please try again."
          });
        }
      }

      case "/addaction": {
        const userToken = userTokens.get(user_id);
        if (!userToken) {
          return res.json({
            response_type: "ephemeral",
            text: "Please login first using the /login command"
          });
        }
      
        try {
          const modal = await createActionCoachSelectionModal(userToken);
          await openSlackModal(trigger_id, modal);
          return res.status(200).send();
        } catch (error) {
          console.error("Error opening coach selection modal:", error);
          return res.json({
            response_type: "ephemeral",
            text: "Sorry, there was an error loading your coaches. Please try again."
          });
        }
      }

      case "/listgoals": {
        const userToken = userTokens.get(user_id);
        if (!userToken) {
          return res.json({
            response_type: "ephemeral",
            text: "Please login first using the /login command"
          });
        }
    
        try {
          // Fetch connected coaches
          const coachResponse = await axios.get(
            'https://api-beta.uexcelerate.app/api/v1/learner/home/connected_users',
            {
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
    
          if (coachResponse.data.result !== "SUCCESS" || !coachResponse.data.data.length) {
            return res.json({
              response_type: "ephemeral",
              text: "You don't have any connected coaches yet."
            });
          }
    
          const coaches = coachResponse.data.data;
          
          // Create blocks for each coach and their goals
          const blocks = [];
          
          for (const coach of coaches) {
            try {
              // Fetch goals for each coach
              const goalResponse = await axios.post(
                'https://api-beta.uexcelerate.app/api/v1/learner/connection/user_goals',
                { userId: coach.userId },
                {
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
    
              if (goalResponse.data.result === "SUCCESS") {
                const goals = goalResponse.data.data;
    
                // Add coach header
                blocks.push(
                  {
                    type: "header",
                    text: {
                      type: "plain_text",
                      text: `🎯 Goals with ${coach.userName}`,
                      emoji: true
                    }
                  }
                );
    
                if (goals.length === 0) {
                  blocks.push({
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "No goals found with this coach."
                    }
                  });
                } else {
                  // Add each goal
                  goals.forEach(goal => {
                    blocks.push(
                      {
                        type: "section",
                        text: {
                          type: "mrkdwn",
                          text: `*${goal.goalName}*\n• Status: ${goal.status}\n• Due Date: ${goal.dueDate}\n• Created: ${goal.createdDate}\n• Visibility: ${goal.isShared ? 'Shared' : 'Private'}`
                        }
                      },
                      {
                        type: "divider"
                      }
                    );
                  });
                }
              }
            } catch (error) {
              console.error(`Error fetching goals for coach ${coach.userName}:`, error);
              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `⚠️ Failed to fetch goals for coach ${coach.userName}`
                }
              });
            }
          }
    
          return res.json({
            response_type: "ephemeral",
            blocks
          });
    
        } catch (error) {
          console.error('Error in /listgoals command:', error);
          return res.json({
            response_type: "ephemeral",
            text: "Failed to fetch your goals. Please try again later."
          });
        }
      }

      case "/listsessions": {
        const userToken = userTokens.get(user_id);
        if (!userToken) {
          return res.status(200).json({
            response_type: "ephemeral",
            text: "Please login first using the /login command"
          });
        }
    
        // Send immediate acknowledgment
        res.status(200).json({
          response_type: "ephemeral",
          text: "📅 Fetching your recent sessions..."
        });
    
        // Process in background
        (async () => {
          try {
            // Fetch connected coaches
            const coachResponse = await axios.get(
              'https://api-beta.uexcelerate.app/api/v1/learner/home/connected_users',
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`
                }
              }
            );
    
            if (!coachResponse.data.data?.length) {
              await axios.post(req.body.response_url, {
                response_type: "ephemeral",
                replace_original: true,
                text: "You don't have any connected coaches yet."
              });
              return;
            }
    
            // Get sessions for all coaches
            const allSessions = [];
            
            // Use Promise.all with timeout
            const sessionPromises = coachResponse.data.data.map(coach =>
              Promise.race([
                axios.post(
                  'https://api-beta.uexcelerate.app/api/v1/learner/connection/user_sessions',
                  { userId: coach.userId },
                  {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                  }
                ).then(response => {
                  if (response.data.data) {
                    response.data.data.forEach(session => {
                      session.coachName = coach.userName;
                    });
                    allSessions.push(...response.data.data);
                  }
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 2000)
                )
              ]).catch(error => console.error(`Error fetching sessions for ${coach.userName}:`, error))
            );
    
            // Wait for all requests (or their timeouts)
            await Promise.all(sessionPromises);
    
            if (allSessions.length === 0) {
              await axios.post(req.body.response_url, {
                response_type: "ephemeral",
                replace_original: true,
                text: "No sessions found."
              });
              return;
            }
    
            // Sort by date (newest first) and take only last 10
            const recentSessions = allSessions
              .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
              .slice(0, 10);
    
            const blocks = [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: "📅 Your Recent Sessions",
                  emoji: true
                }
              }
            ];
    
            recentSessions.forEach(session => {
              const statusEmoji = 
                session.status === 'Scheduled' ? '🟢' :
                session.status === 'Cancelled' ? '🔴' :
                session.status === 'Completed' ? '✅' : '⚪';
    
              blocks.push(
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*${session.sessionName}*\n` +
                          `• Coach: ${session.coachName}\n` +
                          `• Status: ${statusEmoji} ${session.status}\n` +
                          `• Date: ${session.startDate}\n` +
                          `• Type: ${session.sessionType}\n` +
                          `• Feedback: ${session.feedbackGiven ? '✅ Given' : '❌ Pending'}`
                  }
                },
                {
                  type: "divider"
                }
              );
            });
    
            await axios.post(req.body.response_url, {
              response_type: "ephemeral",
              replace_original: true,
              blocks: blocks
            });
    
          } catch (error) {
            console.error('Error in /listsessions:', error);
            await axios.post(req.body.response_url, {
              response_type: "ephemeral",
              replace_original: true,
              text: "Failed to fetch sessions. Please try again."
            });
          }
        })();
    
        return;
      }
  
      case "/listactions": {
        const userToken = userTokens.get(user_id);
        if (!userToken) {
          return res.json({
            response_type: "ephemeral",
            text: "Please login first using the /login command"
          });
        }
    
        try {
          // Fetch connected coaches first
          const coachResponse = await axios.get(
            'https://api-beta.uexcelerate.app/api/v1/learner/home/connected_users',
            {
              headers: {
                'Authorization': `Bearer ${userToken}`
              }
            }
          );
    
          if (coachResponse.data.result !== "SUCCESS") {
            throw new Error('Failed to fetch coaches');
          }
    
          const coaches = coachResponse.data.data;
          const blocks = [];
    
          // Fetch actions for all coaches in parallel
          const actionsPromises = coaches.map(coach => 
            axios.post(
              'https://api-beta.uexcelerate.app/api/v1/learner/action/user_actions',
              { userId: coach.userId },
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`
                }
              }
            ).then(response => ({
              coach,
              actions: response.data.data || []
            })).catch(error => ({
              coach,
              error: true
            }))
          );
    
          const results = await Promise.all(actionsPromises);
    
          // Process results
          results.forEach(result => {
            blocks.push({
              type: "header",
              text: {
                type: "plain_text",
                text: `📋 Actions with ${result.coach.userName}`,
                emoji: true
              }
            });
    
            if (result.error) {
              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "⚠️ Failed to fetch actions"
                }
              });
              return;
            }
    
            if (!result.actions || result.actions.length === 0) {
              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "No actions found with this coach."
                }
              });
              return;
            }
    
            result.actions.slice(0, 20).forEach(action => {
              const statusEmoji = 
                action.overDue ? '⚠️' :
                action.status === 1 ? '🟡' :
                action.status === 2 ? '✅' : '⚪';
    
              blocks.push(
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*${action.title}*\n` +
                          `• Goal: ${action.goalName}\n` +
                          `• Status: ${statusEmoji} ${action.overDue ? 'Overdue' : 
                                    action.status === 1 ? 'In Progress' : 
                                    action.status === 2 ? 'Completed' : 'Not Started'}\n` +
                          `• Due: ${action.dueDate}\n` +
                          `• Progress: ${action.progress}%\n` +
                          `• Type: ${action.actionType}`
                  }
                },
                {
                  type: "divider"
                }
              );
            });
          });
    
          return res.status(200).json({
            response_type: "ephemeral",
            blocks: blocks
          });
    
        } catch (error) {
          console.error('Error in /listactions:', error);
          return res.status(200).json({
            response_type: "ephemeral",
            text: "Failed to fetch actions. Please try again."
          });
        }
      }
  
      default:
        return res.json({
          response_type: "ephemeral",
          text: "❗ Unknown command. Available commands: `/coach`, `/addgoal`, `/addsession`, `/listsessions`, `/listactions`, `/listgoals`.",
        });
    }
    } catch (error) {
      console.error('Error processing command:', error);
      return res.json({
        response_type: "ephemeral",
        text: "An unexpected error occurred. Please try again later."
      });
    }
};

const interactivityHandler = async (req, res) => {
    try {
      const payload = JSON.parse(req.body.payload);
      console.log("Received interaction payload:", JSON.stringify(payload, null, 2));
  
      switch (payload.type) {
        case "block_actions": {
          const action = payload.actions[0];

          if (action.action_id.startsWith('execute_command_')) {
            const command = action.value;
            const user_id = payload.user.id;
            const trigger_id = payload.trigger_id;
            const channel_id = payload.channel.id;
            
            // Call the command handler with the proper trigger_id
            await commandHandler(
              {
                body: {
                  command,
                  user_id,
                  text: '',
                  trigger_id,
                  channel_id
                }
              },
              res
            );
            return;
          } 
          // Handle specific login button
          else if (action.action_id === 'open_login_modal') {
            await commandHandler(
              {
                body: {
                  command: '/login',
                  user_id: payload.user.id,
                  text: '',
                  trigger_id: payload.trigger_id,
                  channel_id: payload.channel.id
                }
              },
              res
            );
            return;
          }
          
          let value;
          try {
            value = JSON.parse(action.value);
          } catch (e) {
            console.log("Not a JSON value, skipping parse");
            return res.status(200).send();
          }
  

          const userToken = userTokens.get(payload.user.id);
  
          if (!userToken) {
            await axios.post(
              'https://slack.com/api/chat.postMessage',
              {
                channel: payload.user.id,
                text: "Please login first using the /login command"
              },
              {
                headers: {
                  'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                }
              }
            );
            return res.status(200).send();
          }
  
          if (action.action_id.startsWith('view_profile_')) {
            try {
              const profileResponse = await axios.post(
                'https://api-beta.uexcelerate.app/api/v1/coach/profile/public_view',
                { authId: value.authId },
                {
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
  
              const profile = profileResponse.data.data;
              const profileBlocks = [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: "Coach Profile",
                    emoji: true
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*${profile.name}*\n${profile.designation || 'Coach'}\n\n*Expertise:*\n${profile.expertise || 'Not specified'}\n\n*Experience:*\n${profile.experience || 'Not specified'}\n\n*Languages:*\n${profile.languages?.join(', ') || 'Not specified'}`
                  },
                  accessory: {
                    type: "image",
                    image_url: profile.profilePicture || "https://example.com/default-profile.png",
                    alt_text: "Coach profile picture"
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*About:*\n${profile.about || 'No information available'}`
                  }
                },
                {
                  type: "actions",
                  elements: [
                    {
                      type: "button",
                      text: {
                        type: "plain_text",
                        text: "Schedule Session",
                        emoji: true
                      },
                      style: "primary",
                      value: JSON.stringify({ 
                        action: 'schedule', 
                        authId: value.authId,
                        coachName: profile.name 
                      }),
                      action_id: `schedule_session_${value.authId}`
                    }
                  ]
                }
              ];
  
              await axios.post(
                'https://slack.com/api/chat.postMessage',
                {
                  channel: payload.channel.id,
                  blocks: profileBlocks
                },
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                  }
                }
              );
            } catch (error) {
              console.error('Error fetching coach profile:', error);
              await axios.post(
                'https://slack.com/api/chat.postMessage',
                {
                  channel: payload.channel.id,
                  text: "Failed to fetch coach profile. Please try again."
                },
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                  }
                }
              );
            }
          } 
          else if (action.action_id.startsWith('schedule_session_')) {
            try {
              const sessionModal = createScheduleSessionModal(value.authId, value.coachName);
              await openSlackModal(payload.trigger_id, sessionModal);
              return res.status(200).send();
            } catch (error) {
              console.error('Error opening schedule session modal:', error);
              await axios.post(
                'https://slack.com/api/chat.postMessage',
                {
                  channel: payload.user.id,
                  text: "Failed to open scheduling modal. Please try again."
                },
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                  }
                }
              );
              return res.status(200).send();
            }
          }
          break;
        }
  
        case "view_submission": {
          const { view } = payload;
          
          if (view.callback_id === "booking_modal") 
            {
            const date = view.state.values.date_select.session_date.selected_date;
            const time = view.state.values.time_select.session_time.selected_option.text.text;
            
            // Process the booking
            // Add your booking logic here
  
            
            
            return res.status(200).json({
              response_action: "clear"
            });
          }
  
          if (view.callback_id === "login_modal") {
            console.log("Processing login submission");
            const email = view.state.values.email_input.email.value;
            const password = view.state.values.password_input.password.value;
            
            // Respond immediately to close the modal
            res.status(200).json({ response_action: "clear" });
            
            // Process login in the background
            (async () => {
              try {
                console.log("Attempting login with email:", email);
                const response = await axios({
                  method: 'post',
                  url: 'https://api-beta.uexcelerate.app/api/v1/auth/token',
                  data: {
                    userName: email,
                    password: password,
                    isAutoLogin: false
                  },
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  timeout: 5000 // Add timeout to avoid hanging requests
                });
    
                console.log("Login API response:", response.data);
    
                if (response.data.result === "SUCCESS") {
                  const accessToken = response.data.data.access_token;
                  userTokens.set(payload.user.id, accessToken);
                  console.log("Login successful for user:", payload.user.id);
                  
                  // Send success message
                  try {
                    await axios.post(
                      'https://slack.com/api/chat.postMessage',
                      {
                        channel: payload.user.id,
                        text: "✅ Login successful! You can now use the /coach command.",
                        blocks: [
                          {
                            type: "section",
                            text: {
                              type: "mrkdwn",
                              text: "✅ *Login Successful!*\nYou can now use the `/coach` command to view your coaches."
                            }
                          }
                        ]
                      },
                      {
                        headers: {
                          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                          'Content-Type': 'application/json'
                        }
                      }
                    );
                  } catch (msgError) {
                    console.error("Error sending success message:", msgError);
                  }
                } else {
                  console.log("Login failed:", response.data);
                  // Send failure message since we've already closed the modal
                  await axios.post(
                    'https://slack.com/api/chat.postMessage',
                    {
                      channel: payload.user.id,
                      text: "❌ Login failed. Invalid credentials. Please try again by using the /login command."
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                }
              } catch (error) {
                console.error('Login API error:', error.response?.data || error.message);
                // Send error message
                await axios.post(
                  'https://slack.com/api/chat.postMessage',
                  {
                    channel: payload.user.id,
                    text: "❌ Login failed. An error occurred while connecting to the server. Please try again later."
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
              }
            })();
            
            // We've already sent the response above, so we return to avoid sending another response
            return;
          }
       
          // Add this to the view_submission case in app.post("/slack/interactivity")
          if (view.callback_id === "search_coach_modal") {
            const values = view.state.values;
            const statements = [
              values.work_on?.work_input?.value,
              values.why_work?.why_input?.value,
              values.changes?.changes_input?.value
            ].filter(Boolean);
          
            const selectedOptions = values.skills?.skills_select?.selected_options || [];
            const skills = selectedOptions.map(option => {
              const index = parseInt(option.value);
              const growthAreas = [
                "Approachability", "Active Listening", "Analytical Thinking", "Agility",
                // ...rest of the growth areas in order...
              ];
              return growthAreas[index];
            });
          
            try {
              const userToken = userTokens.get(payload.user.id);
              if (!userToken) {
                return res.status(200).json({
                  response_action: "errors",
                  errors: {
                    work_on: "Please login first using the /login command"
                  }
                });
              }
          
              const response = await axios.post(
                'https://api-beta.uexcelerate.app/api/v1/learner/discovery/recommended_coaches',
                {
                  statements,
                  skills
                },
                {
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
          
              if (response.data.result === "SUCCESS") {
                await res.status(200).json({ response_action: "clear" });
          
                // For each coach, get their auth_id for the profile URL
                const coaches = response.data.data.coaches;
                const coachesWithAuthId = await Promise.all(coaches.map(async (coach) => {
                  try {
                    const coachProfileResponse = await axios.post(
                      'https://api-beta.uexcelerate.app/api/v1/learner/discovery/coach_profile',
                      { coachId: coach.userId },
                      {
                        headers: {
                          'Authorization': `Bearer ${userToken}`,
                          'Content-Type': 'application/json'
                        }
                      }
                    );
                    
                    if (coachProfileResponse.data.result === "SUCCESS") {
                      return {
                        ...coach,
                        auth_id: coachProfileResponse.data.data.auth_id
                      };
                    }
                    return coach;
                  } catch (error) {
                    console.error(`Error fetching auth_id for coach ${coach.userId}:`, error);
                    return coach;
                  }
                }));
          
                // Send results as a message
                await axios.post(
                  'https://slack.com/api/chat.postMessage',
                  {
                    channel: payload.user.id,
                    blocks: [
                      {
                        type: "header",
                        text: {
                          type: "plain_text",
                          text: "🎯 Recommended Coaches",
                          emoji: true
                        }
                      },
                      ...coachesWithAuthId.flatMap(coach => [
                        {
                          type: "section",
                          text: {
                            type: "mrkdwn",
                            text: `*${coach.name}*\n${coach.designation || ''}\n${coach.coachType || 'Coach'}\n${coach.city ? `📍 ${coach.city}${coach.country ? `, ${coach.country}` : ''}` : ''}`
                          },
                          accessory: {
                            type: "image",
                            image_url: coach.profilePicture.startsWith('http') ? 
                              coach.profilePicture : 
                              `https://beta3.uexcelerate.app/assets/images/${coach.profilePicture}`,
                            alt_text: "Coach profile picture"
                          }
                        },
                        coach.skills ? {
                          type: "context",
                          elements: [{
                            type: "mrkdwn",
                            text: `*Skills:* ${coach.skills.join(', ')}`
                          }]
                        } : null,
                        {
                          type: "actions",
                          elements: [
                            {
                              type: "button",
                              text: {
                                type: "plain_text",
                                text: "View Profile",
                                emoji: true
                              },
                              url: coach.auth_id ? 
                                `https://beta3.uexcelerate.app/public-profile?id=${coach.auth_id}` : 
                                undefined,
                              value: JSON.stringify({
                                action: 'profile',
                                coachId: coach.userId,
                                authId: coach.auth_id || undefined
                              }),
                              action_id: coach.auth_id ? 
                                undefined : 
                                `view_profile_${coach.userId}`
                            }
                          ]
                        },
                        {
                          type: "divider"
                        }
                      ]).filter(Boolean)
                    ]
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                    }
                  }
                );
          
                return;
              }
          
              throw new Error('Failed to get recommended coaches');
            } catch (error) {
              console.error('Error searching coaches:', error);
              return res.status(200).json({
                response_action: "errors",
                errors: {
                  work_on: "Failed to search for coaches. Please try again."
                }
              });
            }
          }

  
          if (view.callback_id === "add_goal_modal") {
            const values = view.state.values;
            const metadata = JSON.parse(view.private_metadata);
            const goalName = values.goal_name.goal_name_input.value;
            const dueDate = values.due_date.due_date_picker.selected_date;
            const isShared = values.is_shared.is_shared_radio.selected_option.value === "true";
            
            try {
              const userToken = userTokens.get(payload.user.id);
              if (!userToken) {
                throw new Error('User not authenticated');
              }
          
              const response = await axios.post(
                'https://api-beta.uexcelerate.app/api/v1/learner/goal/add_goal',
                {
                  userId: metadata.userId,
                  goalName: goalName,
                  dueDate: dueDate,
                  isShared: isShared
                },
                {
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
          
              if (response.data.result === "SUCCESS") {
                await res.status(200).json({ response_action: "clear" });
                
                // Send success message
                await axios.post(
                  'https://slack.com/api/chat.postMessage',
                  {
                    channel: payload.user.id,
                    blocks: [
                      {
                        type: "header",
                        text: {
                          type: "plain_text",
                          text: "✅ Goal Added Successfully!",
                          emoji: true
                        }
                      },
                      {
                        type: "section",
                        text: {
                          type: "mrkdwn",
                          text: `*Goal Details:*\n• Name: ${goalName}\n• Due Date: ${dueDate}\n• Coach: ${metadata.userName}\n• Visibility: ${isShared ? 'Shared with Coach' : 'Private'}\n• Goal ID: ${response.data.goalId}`
                        }
                      }
                    ]
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                    }
                  }
                );
                return;
              }
          
              throw new Error(response.data.message || 'Failed to add goal');
            } catch (error) {
              console.error('Error adding goal:', error);
              return res.status(200).json({
                response_action: "errors",
                errors: {
                  goal_name: error.response?.data?.message || "Failed to add goal. Please try again."
                }
              });
            }
          }
  
          if (view.callback_id === "coach_selection_modal") {
            const selectedCoach = view.state.values.coach_select.selected_coach.selected_option.value;
            
            try {
              // Send immediate acknowledgment with loading message
              res.status(200).json({
                response_action: "update",
                view: {
                  type: "modal",
                  title: {
                    type: "plain_text",
                    text: "Creating Session..."
                  },
                  blocks: [
                    {
                      type: "section",
                      text: {
                        type: "mrkdwn",
                        text: "Preparing session form, please wait..."
                      }
                    }
                  ]
                }
              });
              
              // Create and push the session modal in the background
              (async () => {
                try {
                  const sessionModal = createSessionModal(selectedCoach);
                  
                  await axios.post(
                    'https://slack.com/api/views.update',
                    {
                      view_id: view.id,
                      view: sessionModal
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                } catch (error) {
                  console.error('Error creating session modal:', error);
                  
                  // Update with error message
                  await axios.post(
                    'https://slack.com/api/views.update',
                    {
                      view_id: view.id,
                      view: {
                        type: "modal",
                        title: {
                          type: "plain_text",
                          text: "Error"
                        },
                        blocks: [
                          {
                            type: "section",
                            text: {
                              type: "mrkdwn",
                              text: "Failed to create session form. Please try again."
                            }
                          }
                        ],
                        close: {
                          type: "plain_text",
                          text: "Close"
                        }
                      }
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                }
              })();
              
              return;
            } catch (error) {
              console.error('Error handling coach selection for session:', error);
              return res.status(200).json({
                response_action: "errors",
                errors: {
                  coach_select: "Failed to proceed with session scheduling. Please try again."
                }
              });
            }
          }

          if (view.callback_id === "goal_coach_selection_modal") {
            const selectedCoach = view.state.values.coach_select.selected_coach.selected_option.value;
            
            try {
              // Send immediate acknowledgment with loading message
              res.status(200).json({
                response_action: "update",
                view: {
                  type: "modal",
                  title: {
                    type: "plain_text",
                    text: "Creating Goal..."
                  },
                  blocks: [
                    {
                      type: "section",
                      text: {
                        type: "mrkdwn",
                        text: "Preparing goal form, please wait..."
                      }
                    }
                  ]
                }
              });
              
              // Create and push the goal modal in the background
              (async () => {
                try {
                  const goalModal = createAddGoalModal(selectedCoach);
                  
                  await axios.post(
                    'https://slack.com/api/views.update',
                    {
                      view_id: view.id,
                      view: goalModal
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                } catch (error) {
                  console.error('Error creating goal modal:', error);
                  
                  // Update with error message
                  await axios.post(
                    'https://slack.com/api/views.update',
                    {
                      view_id: view.id,
                      view: {
                        type: "modal",
                        title: {
                          type: "plain_text",
                          text: "Error"
                        },
                        blocks: [
                          {
                            type: "section",
                            text: {
                              type: "mrkdwn",
                              text: "Failed to create goal form. Please try again."
                            }
                          }
                        ],
                        close: {
                          type: "plain_text",
                          text: "Close"
                        }
                      }
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                }
              })();
              
              return;
            } catch (error) {
              console.error('Error handling coach selection for goal:', error);
              return res.status(200).json({
                response_action: "errors",
                errors: {
                  coach_select: "Failed to proceed with goal creation. Please try again."
                }
              });
            }
          }

          if (view.callback_id === "goal_coach_selection_modal") {
            const selectedCoach = view.state.values.coach_select.selected_coach.selected_option.value;
            
            try {
              const goalModal = createAddGoalModal(selectedCoach);
              return res.status(200).json({
                response_action: "push",
                view: goalModal
              });
            } catch (error) {
              console.error('Error creating goal modal:', error);
              return res.status(200).json({
                response_action: "errors",
                errors: {
                  coach_select: "Failed to proceed with goal creation. Please try again."
                }
              });
            }
          }

          if (view.callback_id === "add_session_modal" || view.callback_id === "schedule_session_modal") {
            const values = view.state.values;
            const userToken = userTokens.get(payload.user.id);
            const metadata = JSON.parse(view.private_metadata);
          
            // Get form values
            const sessionName = values.session_name.session_name_input.value;
            const date = values.session_date.date_picker.selected_date;
            const time = values.session_time.time_picker.selected_time;
            const duration = parseInt(values.duration.duration_input.value);
            const sessionMode = parseInt(values.session_mode.session_mode_select.selected_option.value);
            const vcTool = values.vc_tool?.vc_tool_select?.selected_option?.value;
            const vcLink = values.vc_link?.vc_link_input?.value;
            const location = values.location?.location_input?.value;
            
            // Check if user wants to add to calendar
            const addToCalendarOption = values.add_to_calendar?.calendar_checkbox?.selected_options || [];
            const shouldAddToCalendar = addToCalendarOption.length > 0;
          
            // Validate required fields based on session mode
            const errors = {};
            
            if (sessionMode === 0) { // Virtual session
              if (!vcTool) {
                errors.vc_tool = "Video conference tool is required for virtual sessions";
              }
              if (!vcLink) {
                errors.vc_link = "Meeting link is required for virtual sessions";
              }
            } else if (sessionMode === 1) { // In-person session
              if (!location) {
                errors.location = "Location is required for in-person sessions";
              }
            }
            
            // Return errors if validation fails
            if (Object.keys(errors).length > 0) {
              return res.status(200).json({
                response_action: "errors",
                errors: errors
              });
            }
          
            // Format date properly (MM-DD-YYYY HH:mm:ss)
            const [year, month, day] = date.split('-');
            const startDateTime = `${month}-${day}-${year} ${time}:00`;
          
            // Prepare session data based on session mode
            const sessionData = {
              userId: metadata.userId,
              sessionName,
              startDateTime,
              duration,
              timezone: "Asia/Kolkata",
              sessionMode
            };
            
            // Add mode-specific fields
            if (sessionMode === 0) { // Virtual session
              sessionData.vcToolType = vcTool;
              sessionData.vcToolLink = vcLink;
            } else if (sessionMode === 1) { // In-person session
              sessionData.location = location;
            }
          
            // First respond to close the modal immediately
            res.status(200).json({ response_action: "clear" });
          
            // Process the session creation in the background
            (async () => {
              try {
                // Schedule the session
                const response = await axios.post(
                  'https://api-beta.uexcelerate.app/api/v1/learner/session/add_session',
                  sessionData,
                  {
                    headers: {
                      'Authorization': `Bearer ${userToken}`,
                      'Content-Type': 'application/json'
                    },
                    timeout: 8000 // Add a reasonable timeout
                  }
                );
          
                if (response.data.result === "SUCCESS") {
                  // Process calendar integration if requested
                  let calendarInfo = {};
                  if (shouldAddToCalendar) {
                    calendarInfo = await addToCalendar(payload.user.id, {
                      ...sessionData,
                      coachName: metadata.name
                    });
                  }
                  
                  // Create success message blocks
                  const successBlocks = [
                    {
                      type: "header",
                      text: {
                        type: "plain_text",
                        text: "✅ Session Scheduled Successfully!",
                        emoji: true
                      }
                    },
                    {
                      type: "section",
                      text: {
                        type: "mrkdwn",
                        text: `*Session Details:*\n• Name: ${sessionName}\n• Coach: ${metadata.name}\n• Date & Time: ${startDateTime}\n• Duration: ${duration} minutes\n• Mode: ${sessionMode === 0 ? 'Virtual' : 'In-Person'}\n• Session ID: ${response.data.data.sessionId}`
                      }
                    }
                  ];
                  
                  // Add calendar information to message
                  if (shouldAddToCalendar) {
                    if (calendarInfo.success) {
                      successBlocks.push({
                        type: "section",
                        text: {
                          type: "mrkdwn",
                          text: "✅ *Added to Google Calendar*"
                        },
                        accessory: {
                          type: "button",
                          text: {
                            type: "plain_text",
                            text: "View in Calendar",
                            emoji: true
                          },
                          url: calendarInfo.eventLink
                        }
                      });
                    } else {
                      successBlocks.push({
                        type: "section",
                        text: {
                          type: "mrkdwn",
                          text: "⚠️ *Google Calendar Integration*\nAuthorization needed for calendar access:"
                        },
                        accessory: {
                          type: "button",
                          text: {
                            type: "plain_text",
                            text: "Authorize",
                            emoji: true
                          },
                          url: calendarInfo.authUrl,
                          action_id: "authorize_calendar"
                        }
                      });
                    }
                  }
                  
                  // Send the success message
                  await axios.post(
                    'https://slack.com/api/chat.postMessage',
                    {
                      channel: payload.user.id,
                      blocks: successBlocks
                    },
                    {
                      headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                      }
                    }
                  );
                } else {
                  // Send an error message
                  await axios.post(
                    'https://slack.com/api/chat.postMessage',
                    {
                      channel: payload.user.id,
                      text: `⚠️ There was an issue scheduling your session: ${response.data.message || 'Unknown error'}`
                    },
                    {
                      headers: {
                        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                      }
                    }
                  );
                }
              } catch (error) {
                console.error('Error scheduling session:', error);
                // Send error message to user
                await axios.post(
                  'https://slack.com/api/chat.postMessage',
                  {
                    channel: payload.user.id,
                    text: `⚠️ Failed to schedule session: ${error.response?.data?.message || error.message}. Please try again.`
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                    }
                  }
                );
              }
            })();
            
            // We've already sent the response above, so we return to avoid sending another response
            return;
          }

          if (view.callback_id === "action_coach_selection_modal") {
            const selectedCoach = view.state.values.coach_select.selected_coach.selected_option.value;
            const userToken = userTokens.get(payload.user.id);
            
            // Respond with an immediate loading view 
            res.status(200).json({
              response_action: "update",
              view: {
                type: "modal",
                title: {
                  type: "plain_text",
                  text: "Loading Goals..."
                },
                blocks: [{
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: "Please wait while we load your goals..."
                  }
                }]
              }
            });
          
            // Process in background
            (async () => {
              try {
                const goalModal = await createGoalSelectionModal(selectedCoach, userToken);
                
                await axios.post(
                  'https://slack.com/api/views.update',
                  {
                    view_id: view.id,
                    view: goalModal
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
              } catch (error) {
                console.error('Error creating goal selection modal:', error);
                
                // Send error message to the user
                await axios.post(
                  'https://slack.com/api/chat.postMessage',
                  {
                    channel: payload.user.id,
                    text: "Failed to load goals. Please try the action again."
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                    }
                  }
                );
                
                // Close the modal
                await axios.post(
                  'https://slack.com/api/views.update',
                  {
                    view_id: view.id,
                    view: {
                      type: "modal",
                      title: {
                        type: "plain_text",
                        text: "Error"
                      },
                      blocks: [{
                        type: "section",
                        text: {
                          type: "mrkdwn",
                          text: "An error occurred. Please try again."
                        }
                      }],
                      close: {
                        type: "plain_text",
                        text: "Close"
                      }
                    }
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
              }
            })();
            
            // We've already sent the response above, so we return to avoid sending another response
            return;
          }
          
          if (view.callback_id === "goal_selection_modal") {
            const selectedGoal = view.state.values.goal_select.selected_goal.selected_option.value;
            const coachInfo = view.private_metadata;
            
            try {
              const actionModal = createAddActionModal(coachInfo, selectedGoal);
              return res.status(200).json({
                response_action: "push",
                view: actionModal
              });
            } catch (error) {
              console.error('Error creating action modal:', error);
              return res.status(200).json({
                response_action: "errors",
                errors: {
                  goal_select: "Failed to create action. Please try again."
                }
              });
            }
          }
          
          if (view.callback_id === "add_action_modal") {
            const values = view.state.values;
            const metadata = JSON.parse(view.private_metadata);
            
            try {
              const actionName = values.action_name.action_name_input.value;
              const dueDate = values.due_date.due_date_picker.selected_date;
              const isShared = values.is_shared.is_shared_radio.selected_option.value === "true";
              const userToken = userTokens.get(payload.user.id);
          
              const actionData = {
                userId: metadata.userId,
                goalId: metadata.goalId,
                actionName: actionName,
                dueDate: dueDate,
                isShared: isShared
              };
          
              const response = await axios.post(
                'https://api-beta.uexcelerate.app/api/v1/learner/action/add_action',
                actionData,
                {
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
          
              if (response.data.result === "SUCCESS") {
                // Clear the modal
                await res.status(200).json({ response_action: "clear" });
                
                // Send success message
                await axios.post(
                  'https://slack.com/api/chat.postMessage',
                  {
                    channel: payload.user.id,
                    blocks: [
                      {
                        type: "header",
                        text: {
                          type: "plain_text",
                          text: "✅ Action Added Successfully!",
                          emoji: true
                        }
                      },
                      {
                        type: "section",
                        text: {
                          type: "mrkdwn",
                          text: `*Action Details:*\n• Name: ${actionName}\n• Goal: ${metadata.goalName}\n• Coach: ${metadata.userName}\n• Due Date: ${dueDate}\n• Visibility: ${isShared ? 'Shared with Coach' : 'Private'}\n• Action ID: ${response.data.actionId}`
                        }
                      }
                    ]
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                    }
                  }
                );
                return;
              }
          
              throw new Error(response.data.message || 'Failed to add action');
            } catch (error) {
              console.error('Error adding action:', error);
              const errorMessage = error.response?.data?.message || error.message;
              return res.status(200).json({
                response_action: "errors",
                errors: {
                  action_name: `Failed to add action: ${errorMessage}`
                }
              });
            }
          }
        }
      }
      
      return res.status(200).send();
    } catch (error) {
      console.error('Error processing interactivity:', error);
      return res.status(500).send('Internal Server Error');
    }
};

const messageHandler = async (req, res) => {
  try {
    const event = req.body.event;
    
    // Skip bot messages and non-direct messages/mentions
    if (event.type !== 'message' || 
        (!event.channel_type === 'im' && !event.text.includes('<@')) || 
        event.bot_id || 
        event.subtype === 'bot_message') {
      return res.status(200).send();
    }
    
    // Remove bot mentions from text
    const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    
    // Process text through AI
    const aiResult = await processNaturalLanguage(text);
    
    if (aiResult.command) {
      // For commands that require a modal (like login), send a button instead
      if (['/login', '/addgoal', '/addsession', '/searchcoach', '/addaction'].includes(aiResult.command)) {
        try {
          // Send a button that the user can click to execute the command
          await axios.post(
            'https://slack.com/api/chat.postMessage',
            {
              channel: event.channel,
              text: `I understood that you want to ${aiResult.command.replace('/', '')}. Please click the button below:`,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `I understood that you want to ${aiResult.command.replace('/', '')}. Please click the button below:`
                  }
                },
                {
                  type: "actions",
                  elements: [
                    {
                      type: "button",
                      text: {
                        type: "plain_text",
                        text: `${aiResult.command.replace('/', '')} now`,
                        emoji: true
                      },
                      value: `${aiResult.command}`,
                      action_id: `execute_command_${aiResult.command.replace('/', '')}`
                    }
                  ]
                }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
              }
            }
          );
        } catch (error) {
          console.error('Error sending button message to Slack:', error);
          throw error;
        }
      } else {
        // For commands that don't require a modal, proceed as normal
        const mockResponse = {
          sent: false,
          statusCode: 200,
          responseData: null,
          
          status(code) {
            this.statusCode = code;
            return this;
          },
          
          async json(data) {
            this.responseData = data;
            if (!this.sent) {
              this.sent = true;
              try {
                await axios.post(
                  'https://slack.com/api/chat.postMessage',
                  {
                    channel: event.channel,
                    ...data
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
                    }
                  }
                );
              } catch (error) {
                console.error('Error sending message to Slack:', error);
                throw error;
              }
            }
          },
          
          send(data) {
            this.responseData = data;
            return Promise.resolve();
          }
        };
        
        // Simulate command invocation with proper mock response
        await commandHandler(
          {
            body: {
              command: aiResult.command,
              user_id: event.user,
              text: '',
              trigger_id: req.body.trigger_id, // This likely won't be available
              channel_id: event.channel
            }
          },
          mockResponse
        );
      }
    } else if (aiResult.message) {
      try {
        // Send AI response
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: event.channel,
            ...aiResult.message
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
            }
          }
        );
      } catch (error) {
        console.error('Error sending AI response to Slack:', error);
        throw error;
      }
    }
    
    return res.status(200).send();
  } catch (error) {
    console.error('Error handling message:', error);
    return res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  commandHandler,
  interactivityHandler,
  messageHandler
};