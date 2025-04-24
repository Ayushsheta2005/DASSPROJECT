const axios = require("axios");

// Token storage
const userTokens = new Map();

/**
 * Opens a Slack modal with proper timeout handling
 * @param {string} triggerId - The trigger ID from the Slack interaction
 * @param {object} modalView - The modal view object to open
 * @param {number} timeout - Optional timeout in milliseconds (default: 3000)
 * @returns {Promise} - The result of the API call
 */
const openSlackModal = async (triggerId, modalView, timeout = 3000) => {
  try {
    // Create a controller to abort the request if it takes too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await axios.post(
      'https://slack.com/api/views.open',
      {
        trigger_id: triggerId,
        view: modalView
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.data.ok) {
      throw new Error(`Failed to open modal: ${response.data.error}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request to open Slack modal timed out');
    }
    throw error;
  }
};

/**
 * Sends a success message to a Slack user
 * @param {string} userId - Slack user ID
 * @param {string} message - Message to send
 * @param {array} blocks - Optional blocks for rich formatting
 * @returns {Promise} - The result of the message send
 */
const sendSuccessMessage = async (userId, message, blocks = null) => {
  try {
    const payload = {
      channel: userId,
      text: message
    };
    
    if (blocks) {
      payload.blocks = blocks;
    }
    
    const response = await axios.post(
      'https://slack.com/api/chat.postMessage',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 3000 // Add a reasonable timeout
      }
    );
    
    if (!response.data.ok) {
      throw new Error(`Failed to send message: ${response.data.error}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error sending success message:', error);
    throw error;
  }
};

const createCoachCard = (coach) => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${coach.name}* - ${coach.subject}\n⭐ ${coach.rating}/5.0\n🎯 Specialties: ${coach.specialties.join(", ")}\n📅 Available: ${coach.availability.join(", ")}`
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: "Book Session",
        emoji: true
      },
      value: `book_${coach.id}`,
      action_id: `book_session_${coach.id}`
    }
  };
};

const createCoachProfileBlock = (coach) => {
  const profileUrl = `https://beta3.uexcelerate.app/public-profile?id=${coach.authId}`;
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `👤 *${coach.name}*  _(Expert in ${coach.subject})_\n⭐ *${coach.rating || "N/A"}/5.0* rating\n🎯 *Specialties:* ${coach.specialties ? coach.specialties.join(", ") : "Not specified"}\n📅 *Available:* ${coach.availability ? coach.availability.join(", ") : "Not available"}\n\n<${profileUrl}|👉 View Full Profile>`
      },
      accessory: 
      {
        type: "image",
        image_url: coach.image || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZaNCefMs2y1YqhfBDQYBaOWJe3Bqm1pNYXw&s", // Default image if none provided
        alt_text: `${coach.name}'s Profile Picture`
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📅 Book a Session"
          },
          style: "primary",
          value: `book_${coach.id}`,
          action_id: `book_session_${coach.id}`
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🔍 View Profile"
          },
          url: `http://example.com/coach/${coach.id}`,
          action_id: `view_profile_${coach.id}`
        }
      ]
    },
    { type: "divider" }
  ];
};

const createGoalBlockMessage = (goal, description) => {
  return {
    type: "section",
    block_id: `goal_${goal}`,
    text: {
      type: "mrkdwn",
      text: `*Goal*: ${goal}\n*Description*: ${description}`,
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: "Delete Goal",
      },
      action_id: `delete_goal_${goal}`,
    },
  };
};

const createSessionBlockMessage = (session) => {
  return {
    type: "section",
    block_id: `session_${session.id}`,
    text: {
      type: "mrkdwn",
      text: `*Session with ${session.coach}*\nOn *${session.date}* at *${session.time}*`,
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: "Cancel Session",
      },
      action_id: `cancel_session_${session.id}`,
    },
  };
};

module.exports = {
  userTokens,
  openSlackModal,
  sendSuccessMessage,
  createCoachCard,
  createCoachProfileBlock,
  createGoalBlockMessage,
  createSessionBlockMessage
};